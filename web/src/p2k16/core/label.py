import logging
from datetime import datetime
from typing import Optional, Mapping, List
import json

import paho.mqtt.client as mqtt
from p2k16.core import P2k16UserException, membership_management
from p2k16.core import account_management, event_management, badge_management
from p2k16.core.models import db, Account, Circle, Event, Company, ToolDescription, ToolCheckout

logger = logging.getLogger(__name__)


class DummyClient(object):
    pass


class LabelClient(object):
    def __init__(self, cfg: Mapping[str, str]):

        host = cfg["MQTT_HOST"]
        port = cfg["MQTT_PORT"]
        username = cfg["MQTT_USERNAME"]
        password = cfg["MQTT_PASSWORD"]
        self.prefix = cfg["MQTT_PREFIX_LABEL"]
        self._status = True
        self._label_alive_topic = self._mqtt_topic("label-alive/alive")

        logger.info(f"Connecting to {host}:{port}")
        logger.info(f"config: username={username}, prefix={self.prefix}")

        keep_alive = 60
        c = mqtt.Client()
        if username:
            c.username_pw_set(username=username, password=password)

        c.on_connect = self.on_connect
        c.on_message = self.on_message

        c.connect_async(host, port, keep_alive)
        c.enable_logger()
        c.loop_start()

        self._client = c

    def on_connect(self, client, userdata, flags, rc):
        logger.info("Connected with result code " + str(rc))
        self._client.subscribe(self._label_alive_topic)

    def on_message(self, client, userdata, msg):
        try:
            payload = msg.payload.decode('utf-8')
            logger.info(f"Received message payload: {payload}")
            self._status = payload.lower() == "true"
        except Exception as e:
            logger.info(f"Unexpected error in message from MQTT: {e}")

    def _mqtt_topic(self, action):
        return '/'.join([self.prefix,  action])

    def print_box_label(self, account: Account):
        logger.info(f"Printing box label for account={account}")

        topic = self._mqtt_topic(action='print_box')
        payload = json.dumps({
            "username": account.username,
            "id": account.id,
            "name": account.name,
            "phone": account.phone,
            "email": account.email
        })

        logger.info(f"sending mqtt: {payload}")
        result = self._client.publish(topic, payload)
        logger.info(f"publish result: {result}")

    def get_status(self):
        return self._status


def create_client(cfg: Mapping[str, str]) -> LabelClient:
    if "MQTT_HOST" not in cfg:
        logger.info("No MQTT host configured for label, not starting label mqtt client")
        return DummyClient()
    return LabelClient(cfg)
