"""
backend/auth.py — WorkMate Authentication & RBAC Core
Handles session management, secure password hashing (PBKDF2-HMAC-SHA256),
and role-based access control decorators for Manager, Employee, and CEO/Admin.
"""

import os
import hashlib
import binascii
from functools import wraps
from flask import session, jsonify, request


# ---------------------------------------------------------------------------
# Password Hashing (PBKDF2-HMAC-SHA256)
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2-HMAC-SHA256 with a random 16-byte salt."""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return binascii.hexlify(salt).decode("ascii") + ":" + binascii.hexlify(dk).decode("ascii")


def verify_password(password: str, stored_hash: str) -> bool:
    """Verifies a plain-text password against a stored salt:hash string."""
    try:
        parts = stored_hash.split(":")
        if len(parts) != 2:
            return False
        salt = binascii.unhexlify(parts[0].encode("ascii"))
        expected_dk = binascii.unhexlify(parts[1].encode("ascii"))
        actual_dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
        return hashlib.sha256(actual_dk).digest() == hashlib.sha256(expected_dk).digest()
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Session Helpers
# ---------------------------------------------------------------------------

def set_session(user: dict, role: str = "manager") -> None:
    """Stores user identity and role in the secure Flask session."""
    session.clear()
    session["role"] = role

    if role == "manager":
        session["manager_id"] = user["manager_id"]
        session["full_name"] = user["full_name"]
        session["email"] = user["email"]
        session["department"] = user.get("department", "Management")
    elif role == "employee":
        session["employee_id"] = user["employee_id"]
        session["employee_name"] = user.get("name") or user.get("full_name", "Employee")
        session["employee_email"] = user["email"]
        session["employee_department"] = user.get("department", "General")
        session["manager_id"] = user.get("manager_id", "")
    elif role == "admin":
        session["admin_id"] = user.get("admin_id", "CEO-001")
        session["full_name"] = user.get("full_name", "CEO / Administrator")
        session["email"] = user.get("email", "admin@workmate.io")


def clear_session() -> None:
    """Clears all session variables upon logout."""
    session.clear()


def is_authenticated() -> bool:
    """Returns True if any valid user session is active."""
    return bool(session.get("manager_id") or session.get("employee_id") or session.get("admin_id"))


def get_current_role() -> str:
    """Returns 'manager', 'employee', 'admin', or 'guest'."""
    return session.get("role", "guest")


def is_manager() -> bool:
    return session.get("role") == "manager" and bool(session.get("manager_id"))


def is_employee() -> bool:
    return session.get("role") == "employee" and bool(session.get("employee_id"))


def is_admin() -> bool:
    return session.get("role") == "admin"


def get_current_manager_id() -> str | None:
    """Returns the active manager_id for managers, or the supervising manager_id for employees."""
    return session.get("manager_id")


def get_current_employee_id() -> str | None:
    return session.get("employee_id")


# ---------------------------------------------------------------------------
# Route Protection Decorators
# ---------------------------------------------------------------------------

def login_required(f):
    """Requires an authenticated session of any role."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not is_authenticated():
            if request.path.startswith("/api/"):
                return jsonify({"error": "Authentication required. Please sign in."}), 401
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


def manager_required(f):
    """Requires an active Manager session."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not is_manager():
            return jsonify({"error": "Access denied: Manager permissions required."}), 403
        return f(*args, **kwargs)
    return decorated


def employee_required(f):
    """Requires an active Employee session."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not is_employee():
            return jsonify({"error": "Access denied: Employee permissions required."}), 403
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    """Requires an active CEO/Admin session."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not is_admin():
            return jsonify({"error": "Access denied: CEO/Admin permissions required."}), 403
        return f(*args, **kwargs)
    return decorated
