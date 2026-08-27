"""
manager_store.py — WorkMate Manager Account Management
Handles loading, saving, creating, and updating manager accounts.
Manager data is stored in managers.json.
"""

import os
import json
import re
from datetime import datetime
from auth import hash_password, verify_password


MANAGERS_FILE = "managers.json"


# ---------------------------------------------------------------------------
# File I/O
# ---------------------------------------------------------------------------

def load_managers() -> list:
    """Loads all manager accounts from managers.json."""
    if not os.path.exists(MANAGERS_FILE):
        return []
    try:
        with open(MANAGERS_FILE, "r", encoding="utf-8") as f:
            content = f.read().strip()
            return json.loads(content) if content else []
    except json.JSONDecodeError:
        return []


def save_managers(managers: list) -> None:
    """Saves the full list of managers to managers.json."""
    with open(MANAGERS_FILE, "w", encoding="utf-8") as f:
        json.dump(managers, f, indent=2, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Validation Helpers
# ---------------------------------------------------------------------------

def is_valid_email(email: str) -> bool:
    """Simple regex-based email format validation."""
    pattern = r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email.strip()))


def is_valid_phone(phone: str) -> bool:
    """Accepts phone numbers with digits, spaces, dashes, parentheses, +."""
    pattern = r"^[\d\s\-\+\(\)]{7,20}$"
    return bool(re.match(pattern, phone.strip()))


# ---------------------------------------------------------------------------
# CRUD Operations
# ---------------------------------------------------------------------------

def create_manager(data: dict) -> dict:
    """
    Creates a new manager account after validating all fields.
    Raises ValueError on validation errors.
    Returns the created manager dict (without password hash).
    """
    managers = load_managers()

    # Required field presence check
    required = ["full_name", "manager_id", "email", "phone", "password", "confirm_password", "department"]
    for field in required:
        if not data.get(field, "").strip():
            raise ValueError(f"'{field.replace('_', ' ').title()}' is required.")

    full_name = data["full_name"].strip()
    manager_id = data["manager_id"].strip().upper()
    email = data["email"].strip().lower()
    phone = data["phone"].strip()
    password = data["password"]
    confirm = data["confirm_password"]
    department = data["department"].strip()
    avatar = data.get("avatar", "").strip()

    # Name length
    if len(full_name) < 2:
        raise ValueError("Full name must be at least 2 characters.")

    # Manager ID format (alphanumeric + dashes)
    if not re.match(r"^[A-Z0-9\-]{3,20}$", manager_id):
        raise ValueError("Manager ID must be 3–20 alphanumeric characters (dashes allowed), e.g. MGR-001.")

    # Email format
    if not is_valid_email(email):
        raise ValueError("Please enter a valid work email address.")

    # Phone format
    if not is_valid_phone(phone):
        raise ValueError("Please enter a valid phone number (7–20 digits).")

    # Department
    if len(department) < 2:
        raise ValueError("Department name must be at least 2 characters.")

    # Password length
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters.")

    # Password confirmation
    if password != confirm:
        raise ValueError("Passwords do not match.")

    # Unique Manager ID check (case-insensitive)
    for m in managers:
        if m["manager_id"].upper() == manager_id:
            raise ValueError(f"Manager ID '{manager_id}' is already taken.")
        if m["email"].lower() == email:
            raise ValueError(f"Email '{email}' is already registered.")

    # Build manager record
    new_manager = {
        "manager_id": manager_id,
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "department": department,
        "avatar": avatar,
        "password_hash": hash_password(password),
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }

    managers.append(new_manager)
    save_managers(managers)

    # Return without password hash for safety
    return _safe_manager(new_manager)


def get_manager_by_id(manager_id: str) -> dict | None:
    """Returns the full manager record (including hash) or None."""
    managers = load_managers()
    for m in managers:
        if m["manager_id"].upper() == manager_id.strip().upper():
            return m
    return None


def get_manager_by_email(email: str) -> dict | None:
    """Returns the full manager record by email, or None."""
    managers = load_managers()
    for m in managers:
        if m["email"].lower() == email.strip().lower():
            return m
    return None


def authenticate_manager(identifier: str, password: str) -> dict | None:
    """
    Authenticates by Manager ID or email + password.
    Returns safe manager dict on success, None on failure.
    """
    # Try by ID first, then by email
    manager = get_manager_by_id(identifier)
    if not manager:
        manager = get_manager_by_email(identifier)
    if not manager:
        return None
    if not verify_password(password, manager.get("password_hash", "")):
        return None
    return manager


def update_manager_profile(manager_id: str, updates: dict) -> dict:
    """
    Updates allowed profile fields for a manager.
    Returns updated safe manager dict.
    Raises ValueError on validation errors.
    """
    managers = load_managers()
    target_idx = -1
    for idx, m in enumerate(managers):
        if m["manager_id"].upper() == manager_id.strip().upper():
            target_idx = idx
            break

    if target_idx == -1:
        raise ValueError(f"Manager '{manager_id}' not found.")

    manager = managers[target_idx]

    # Allowed fields for profile update
    if "full_name" in updates:
        name = updates["full_name"].strip()
        if len(name) < 2:
            raise ValueError("Full name must be at least 2 characters.")
        manager["full_name"] = name

    if "phone" in updates:
        phone = updates["phone"].strip()
        if phone and not is_valid_phone(phone):
            raise ValueError("Please enter a valid phone number.")
        manager["phone"] = phone

    if "department" in updates:
        dept = updates["department"].strip()
        if len(dept) < 2:
            raise ValueError("Department must be at least 2 characters.")
        manager["department"] = dept

    if "avatar" in updates:
        manager["avatar"] = updates["avatar"].strip()

    # Email update with uniqueness check
    if "email" in updates:
        new_email = updates["email"].strip().lower()
        if not is_valid_email(new_email):
            raise ValueError("Please enter a valid email address.")
        for idx, m in enumerate(managers):
            if idx != target_idx and m["email"].lower() == new_email:
                raise ValueError(f"Email '{new_email}' is already in use.")
        manager["email"] = new_email

    managers[target_idx] = manager
    save_managers(managers)
    return _safe_manager(manager)


def change_manager_password(manager_id: str, current_password: str, new_password: str, confirm_password: str) -> None:
    """
    Changes a manager's password after verifying the current password.
    Raises ValueError on any validation error.
    """
    managers = load_managers()
    target_idx = -1
    for idx, m in enumerate(managers):
        if m["manager_id"].upper() == manager_id.strip().upper():
            target_idx = idx
            break

    if target_idx == -1:
        raise ValueError("Manager not found.")

    manager = managers[target_idx]

    if not verify_password(current_password, manager.get("password_hash", "")):
        raise ValueError("Current password is incorrect.")

    if len(new_password) < 8:
        raise ValueError("New password must be at least 8 characters.")

    if new_password != confirm_password:
        raise ValueError("New passwords do not match.")

    if new_password == current_password:
        raise ValueError("New password must differ from the current password.")

    managers[target_idx]["password_hash"] = hash_password(new_password)
    save_managers(managers)


def _safe_manager(m: dict) -> dict:
    """Returns manager dict without the password_hash field."""
    return {k: v for k, v in m.items() if k != "password_hash"}


# ---------------------------------------------------------------------------
# Seed Data — created once on first run
# ---------------------------------------------------------------------------

def seed_if_empty() -> None:
    """Seeds one demo manager account if managers.json is empty."""
    managers = load_managers()
    if managers:
        return  # Already has data — skip seeding

    demo_manager = {
        "manager_id": "MGR-001",
        "full_name": "Alex Morgan",
        "email": "alex@workmate.io",
        "phone": "+1 (555) 100-2000",
        "department": "Engineering",
        "avatar": "",
        "password_hash": hash_password("Demo@1234"),
        "created_at": "2025-01-15 09:00:00",
    }
    save_managers([demo_manager])
    print("[WorkMate] Demo manager seeded: alex@workmate.io / Demo@1234")
