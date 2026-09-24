import re
from datetime import date

_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

# FPL's `news` field for an injured/suspended player often reads like
# "Hamstring injury - Expected back 10 Oct" — some have "Unknown return
# date" instead, which this simply won't match.
_RETURN_PATTERN = re.compile(r"expected back (\d{1,2})\s+([A-Za-z]{3,})", re.IGNORECASE)


def parse_expected_return_date(news: str | None, reference: date) -> date | None:
    """Extract an "Expected back DD Mon" date from FPL's free-text news
    field, resolved against `reference` (today) to pick the right year —
    FPL's text has no year, so a date earlier than `reference` is assumed to
    mean next year (e.g. news added in December about a January return).
    """
    if not news:
        return None
    match = _RETURN_PATTERN.search(news)
    if not match:
        return None
    day = int(match.group(1))
    month = _MONTHS.get(match.group(2)[:3].lower())
    if month is None:
        return None
    try:
        candidate = date(reference.year, month, day)
    except ValueError:
        return None
    if candidate < reference:
        try:
            candidate = date(reference.year + 1, month, day)
        except ValueError:
            return None
    return candidate


def expected_return_gameweek(return_date: date, event_deadlines: list[tuple[int, date]]) -> int | None:
    """The first gameweek whose deadline falls on/after `return_date`."""
    upcoming = sorted((deadline, event_id) for event_id, deadline in event_deadlines if deadline >= return_date)
    return upcoming[0][1] if upcoming else None
