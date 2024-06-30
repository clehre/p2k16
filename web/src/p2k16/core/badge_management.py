import logging
from datetime import datetime
from typing import List, Optional

from p2k16.core import P2k16UserException, account_management, event_management
from p2k16.core.models import db, Account, AccountBadge, BadgeDescription, Event

logger = logging.getLogger(__name__)


@event_management.converter_for("badge", "awarded")
class BadgeAwardedEvent(object):
    def __init__(self, account_badge: AccountBadge, badge_description: Optional[BadgeDescription],
                 created_at: Optional[datetime] = None, created_by: Optional[Account] = None):
        self.account_badge = account_badge
        self.badge_description = badge_description
        self.created_at = created_at
        self.created_by = created_by

    def to_event(self):
        return {
            "int1": self.account_badge.id,
            "int2": self.badge_description.id if self.badge_description else None
        }

    @staticmethod
    def from_event(event: Event) -> "BadgeAwardedEvent":
        account_badge = AccountBadge.query.filter(AccountBadge.id == event.int1).one()
        badge_description = BadgeDescription.query.filter(BadgeDescription.id == event.int2).one_or_none()
        return BadgeAwardedEvent(account_badge, badge_description, event.created_at, event.created_by)

    def to_dict(self):
        from p2k16.web import badge_blueprint
        return {
            **event_management.base_dict(self),
            "created_at": self.created_at,
            "created_by": self.created_by,
            "created_by_username": self.created_by.username,
            "account_badge": badge_blueprint.badge_to_json(self.account_badge),
            "badge_description": badge_blueprint.badge_description_to_json(self.badge_description) if self.badge_description else None,
        }


def _load_description(title: str) -> BadgeDescription:
    return BadgeDescription.query.filter(BadgeDescription.title == title).one_or_none()


def badges_for_account(account_id: int) -> List[AccountBadge]:
    return AccountBadge.query.join(Account, Account.id == AccountBadge.account_id).filter(Account.id == account_id).all()


def badge_is_user_made(title: str) -> bool:
    super_badges = ["first_door_opening", "laser-certified"]
    return title.lower() not in super_badges


def remove_badge(account: Account, title: str) -> bool:
    if not badge_is_user_made(title):
        logger.error(f"Cannot remove non-user-made badge: {title}")
        return False

    badge_desc = _load_description(title)
    if not badge_desc:
        logger.error(f"Badge description not found for title: {title}")
        return False

    account_badge = AccountBadge.query.filter_by(account=account, description=badge_desc).first()
    if not account_badge:
        logger.error(f"Badge not found for account: {account.username} with title: {title}")
        return False
    events = Event.query.filter(Event.int1 == account_badge.id).all()
    for event in events:
        db.session.delete(event)
    db.session.delete(account_badge)
    db.session.commit()
    logger.info(f"Badge with title '{title}' successfully deleted for account: {account.username}")
    return True


def create_badge(receiver: Account, awarder: Account, title: str) -> AccountBadge:
    desc = _load_description(title)
    logger.info(f"Creating badge: title={title}, receiver={receiver.username}, awarder={awarder.username}")
    if desc:
        logger.info(f"desc.certification_circle={desc.certification_circle}")

    if desc:
        if desc.certification_circle and not account_management.is_account_in_circle(awarder, desc.certification_circle):
            raise P2k16UserException(f"The awarder {awarder.username} is not a valid certifier")
    else:
        desc = BadgeDescription(title=title)
        db.session.add(desc)
        db.session.flush([desc])

    ab = AccountBadge(account=receiver, awarded_by=awarder, description=desc)
    db.session.add(ab)
    db.session.flush()
    event_management.save_event(BadgeAwardedEvent(ab, desc))

    return ab
