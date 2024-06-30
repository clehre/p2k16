import logging
from datetime import datetime
from typing import Optional, Mapping, List

import paho.mqtt.client as mqtt
from p2k16.core import P2k16UserException, membership_management
from p2k16.core import account_management, event_management, badge_management
from p2k16.core.models import db, Account, Circle, Event, Company, ToolDescription, ToolCheckout

logger = logging.getLogger(__name__)


class DummyClient(object):
    pass


@event_management.converter_for("tool", "checkout")
class ToolCheckoutEvent(object):
    def __init__(self, tool_name: str, created_at: Optional[datetime] = None, created_by: Optional[Account] = None):
        self.tool_name = tool_name
        self.created_at = created_at
        self.created_by = created_by

    def to_event(self):
        return {"text1": self.tool_name}

    @staticmethod
    def from_event(event: Event) -> "ToolCheckoutEvent":
        return ToolCheckoutEvent(event.text1, event.created_at, event.created_by)

    def to_dict(self):
        return {**event_management.base_dict(self), **{
            "created_at": self.created_at,
            "created_by": self.created_by,
            "created_by_username": self.created_by.username,
            "tool_name": self.tool_name
        }}


@event_management.converter_for("tool", "checkin")
class ToolCheckinEvent(object):
    def __init__(self, tool_name: str, created_at: Optional[datetime] = None, created_by: Optional[Account] = None):
        self.tool_name = tool_name
        self.created_at = created_at
        self.created_by = created_by

    def to_event(self):
        return {"text1": self.tool_name}

    @staticmethod
    def from_event(event: Event) -> "ToolCheckinEvent":
        return ToolCheckinEvent(event.text1, event.created_at, event.created_by)

    def to_dict(self):
        return {**event_management.base_dict(self), **{
            "created_at": self.created_at,
            "created_by": self.created_by,
            "created_by_username": self.created_by.username,
            "tool_name": self.tool_name
        }}


class ToolClient(object):
    def __init__(self, cfg: Mapping[str, str]):
        self.prefix = cfg["MQTT_PREFIX_TOOL"]
        self._client = self._initialize_mqtt_client(cfg)

    def _initialize_mqtt_client(self, cfg: Mapping[str, str]) -> mqtt.Client:
        host = cfg["MQTT_HOST"]
        port = cfg["MQTT_PORT"]
        username = cfg["MQTT_USERNAME"]
        password = cfg["MQTT_PASSWORD"]

        logger.info(f"Connecting to {host}:{port}")
        logger.info(f"Config: username={username}, prefix={self.prefix}")

        c = mqtt.Client()
        if username:
            c.username_pw_set(username=username, password=password)
        c.connect_async(host, port, keepalive=60)
        c.enable_logger()
        c.loop_start()
        return c

    def _mqtt_topic(self, tool: str, action: str) -> str:
        return '/'.join([self.prefix, tool, action])

    def checkout_tool(self, account: Account, tool: ToolDescription):
        self._validate_account_for_checkout(account, tool)
        logger.info(f'Checking out tool. username={account.username}, tool={tool.name}')

        checkout = ToolCheckout.find_by_tool(tool)

        if checkout and checkout.account != account:
            logger.info(f'Tool checked out by someone else. Assuming control: username={account.username}, tool={tool.name}, old_username={checkout.account.username}')
            self.checkin_tool(checkout.account, checkout.tool_description)

        event_management.save_event(ToolCheckoutEvent(tool.name, datetime.now(), account))
        self._create_tool_checkout(tool, account)

        self._publish_mqtt_message(tool.name, 'unlock', 'true')

    def checkin_tool(self, account: Account, tool: ToolDescription):
        logger.info(f'Checking in tool. username={account.username}, tool={tool.name}')
        event_management.save_event(ToolCheckinEvent(tool.name, datetime.now(), account))

        checkout = ToolCheckout.find_by_tool(tool)
        db.session.delete(checkout)
        db.session.flush()

        self._publish_mqtt_message(tool.name, 'lock', 'true')

    def _validate_account_for_checkout(self, account: Account, tool: ToolDescription):
        if not account_management.is_account_in_circle(account, tool.circle):
            raise P2k16UserException(f'{account.display_name()} is not in the {tool.circle.name} circle')

        if not membership_management.active_member(account) and not Company.find_active_companies_with_account(account.id):
            raise P2k16UserException(f'{account.display_name()} does not have an active membership and is not employed in an active company')

    def _create_tool_checkout(self, tool: ToolDescription, account: Account):
        checkout = ToolCheckout(tool, account, datetime.now())
        db.session.add(checkout)
        db.session.flush()

    def _publish_mqtt_message(self, tool_name: str, action: str, payload: str):
        topic = self._mqtt_topic(tool_name, action)
        logger.info(f"Sending message: {topic}: {payload}")
        self._client.publish(topic, payload)


def create_client(cfg: Mapping[str, str]) -> ToolClient:
    if "MQTT_HOST" not in cfg:
        logger.info("No MQTT host configured for door, not starting door mqtt client")
        return DummyClient()
    return ToolClient(cfg)
