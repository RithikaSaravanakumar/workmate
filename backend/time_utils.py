"""
backend/time_utils.py — Time and Date Utilities for Indian Standard Time (IST, UTC+5:30)
Ensures all check-ins, check-outs, task timestamps, leave timestamps, and date boundaries
run consistently in Indian Standard Time regardless of server timezone (e.g. Vercel UTC).
"""

from datetime import datetime, timezone, timedelta

# Indian Standard Time: UTC + 5 hours 30 minutes
IST = timezone(timedelta(hours=5, minutes=30))


def now_ist() -> datetime:
    """Returns the current datetime in Indian Standard Time (IST)."""
    return datetime.now(IST)


def format_time_ist(dt: datetime = None) -> str:
    """Formats datetime as 12-hour time (e.g. '9:30 AM') in IST."""
    if dt is None:
        dt = now_ist()
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    else:
        dt = dt.astimezone(IST)
    return dt.strftime("%I:%M %p").lstrip("0")


def format_datetime_ist(dt: datetime = None) -> str:
    """Formats datetime as 'YYYY-MM-DD HH:MM:SS' in IST."""
    if dt is None:
        dt = now_ist()
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    else:
        dt = dt.astimezone(IST)
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def format_date_ist(dt: datetime = None) -> str:
    """Formats date as 'YYYY-MM-DD' in IST."""
    if dt is None:
        dt = now_ist()
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    else:
        dt = dt.astimezone(IST)
    return dt.strftime("%Y-%m-%d")


def format_date_display_ist(dt: datetime = None) -> str:
    """Formats date display as 'Aug 28, 2026' in IST."""
    if dt is None:
        dt = now_ist()
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    else:
        dt = dt.astimezone(IST)
    return dt.strftime("%b %d, %Y")


def parse_to_ist(dt_or_str) -> datetime:
    """Parses an ISO string or datetime to an IST-aware datetime object."""
    if isinstance(dt_or_str, datetime):
        if dt_or_str.tzinfo is None:
            return dt_or_str.replace(tzinfo=IST)
        return dt_or_str.astimezone(IST)
    if isinstance(dt_or_str, str):
        clean_str = dt_or_str.replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(clean_str)
            if dt.tzinfo is None:
                return dt.replace(tzinfo=IST)
            return dt.astimezone(IST)
        except Exception:
            return now_ist()
    return now_ist()
