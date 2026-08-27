"""
auth.py — WorkMate Authentication & Role-Based Access Control (RBAC)
Handles password hashing, verification, session management, and role protection.
Supports both Manager and Employee roles without external third-party libraries.
"""

import hashlib
import os
import secrets
from functools import wraps
from flask import session, jsonify, redirect, url_for, request


# ---------------------------------------------------------------------------
# Password Hashing & Verification
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    """
    Hashes a plain-text password using SHA-256 with a random salt.
    Returns a string in the format:  <salt_hex>:<hash_hex>
    """
    salt = secrets.token_hex(16)  # 16-byte random salt -> 32-char hex string
    raw = f"{salt}:{password}"
    hashed = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return f"{salt}:{hashed}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """
    Verifies a plain-text password against a stored <salt>:<hash> string.
    Uses constant-time comparison to prevent timing attacks.
    """
    try:
        if not stored_hash or ":" not in stored_hash:
            return False
        salt, expected_hash = stored_hash.split(":", 1)
        raw = f"{salt}:{plain_password}"
        computed = hashlib.sha256(raw.encode("utf-8")).hexdigest()
        return secrets.compare_digest(computed, expected_hash)
    except (ValueError, AttributeError):
        return False


# ---------------------------------------------------------------------------
# Session Helpers
# ---------------------------------------------------------------------------

def set_session(user: dict, role: str = "manager") -> None:
    """
    Stores authenticated user session information.
    - role: "manager" or "employee"
    """
    session.clear()
    session["role"] = role
    session["user_id"] = user.get("manager_id") if role == "manager" else user.get("employee_id")
    session["user_name"] = user.get("full_name") or user.get("name", "")
    session["user_email"] = user.get("email", "")
    session["department"] = user.get("department", "")

    if role == "manager":
        session["manager_id"] = user["manager_id"]
        session["manager_name"] = user["full_name"]
        session["manager_email"] = user["email"]
    elif role == "employee":
        session["employee_id"] = user["employee_id"]
        session["employee_name"] = user["name"]
        session["employee_email"] = user["email"]
        session["manager_id"] = user.get("manager_id", "")

    session.permanent = True


def clear_session() -> None:
    """Clears all session data on logout."""
    session.clear()


def is_authenticated() -> bool:
    """Returns True if any user is currently authenticated."""
    return "role" in session and "user_id" in session


def is_manager() -> bool:
    """Returns True if the authenticated user is a Manager."""
    return is_authenticated() and session.get("role") == "manager"


def is_employee() -> bool:
    """Returns True if the authenticated user is an Employee."""
    return is_authenticated() and session.get("role") == "employee"


def get_current_role() -> str | None:
    """Returns 'manager', 'employee', or None."""
    return session.get("role")


def get_current_user_id() -> str | None:
    """Returns current user's primary ID (Manager ID or Employee ID)."""
    return session.get("user_id")


def get_current_manager_id() -> str | None:
    """Returns the associated manager_id (for Manager: self ID; for Employee: supervisor ID)."""
    return session.get("manager_id")


def get_current_employee_id() -> str | None:
    """Returns the employee_id if logged in as an Employee, else None."""
    return session.get("employee_id")


def get_current_user_name() -> str | None:
    """Returns display name of the authenticated user."""
    return session.get("user_name")


# Legacy compatibility helpers
def get_current_manager_name() -> str | None:
    return session.get("manager_name") or session.get("user_name")


# ---------------------------------------------------------------------------
# Route Protection Decorators
# ---------------------------------------------------------------------------

def login_required(f):
    """
    Ensures user is logged in (either Manager or Employee).
    - Returns 401 JSON for API requests.
    - Redirects to '/' for HTML page requests.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not is_authenticated():
            if request.path.startswith("/api/"):
                return jsonify({"error": "Authentication required. Please sign in."}), 401
            return redirect(url_for("workmate.auth_page"))
        return f(*args, **kwargs)
    return decorated_function


def manager_required(f):
    """
    Ensures the user is an authenticated Manager.
    - Returns 403 JSON if an Employee tries to access manager-only endpoints.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not is_authenticated():
            if request.path.startswith("/api/"):
                return jsonify({"error": "Authentication required. Please sign in."}), 401
            return redirect(url_for("workmate.auth_page"))
        if not is_manager():
            return jsonify({"error": "Access denied: Manager permissions required."}), 403
        return f(*args, **kwargs)
    return decorated_function


def employee_required(f):
    """
    Ensures the user is an authenticated Employee.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not is_authenticated():
            if request.path.startswith("/api/"):
                return jsonify({"error": "Authentication required. Please sign in."}), 401
            return redirect(url_for("workmate.auth_page"))
        if not is_employee():
            return jsonify({"error": "Access denied: Employee permissions required."}), 403
        return f(*args, **kwargs)
    return decorated_function
