"""
backend/auth.py — WorkMate Authentication & RBAC Core
Handles session management, HMAC auth tokens, secure password hashing (PBKDF2-HMAC-SHA256),
and role-based access control decorators for Manager, Employee, and CEO/Admin.
"""

import os
import hashlib
import binascii
import hmac
import json
import base64
import time
from functools import wraps
from flask import session, jsonify, request


SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "workmate-secure-production-secret-key-2026-fixed-salt-9876543210")


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
# Token Utilities (Stateless Serverless Auth Backup)
# ---------------------------------------------------------------------------

def generate_auth_token(user: dict, role: str) -> str:
    """Generates an HMAC-SHA256 signed bearer token valid for 7 days."""
    payload = {
        "role": role,
        "manager_id": user.get("manager_id", ""),
        "employee_id": user.get("employee_id", ""),
        "admin_id": user.get("admin_id", ""),
        "email": user.get("email", ""),
        "name": user.get("full_name") or user.get("name", ""),
        "department": user.get("department", ""),
        "exp": int(time.time()) + (86400 * 7),
    }
    payload_json = json.dumps(payload, ensure_ascii=False)
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode("utf-8")).decode("ascii").rstrip("=")
    sig = hmac.new(SECRET_KEY.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{sig}"


def decode_auth_token(token: str) -> dict | None:
    """Validates signature and expiration of an HMAC-SHA256 token."""
    if not token or "." not in token:
        return None
    try:
        payload_b64, signature = token.split(".", 1)
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        padding = 4 - (len(payload_b64) % 4)
        if padding != 4:
            payload_b64 += "=" * padding
        payload_bytes = base64.urlsafe_b64decode(payload_b64.encode("ascii"))
        payload = json.loads(payload_bytes.decode("utf-8"))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


def get_token_from_request() -> dict | None:
    """Extracts and verifies auth token from Authorization or X-Auth-Token header."""
    auth_header = request.headers.get("Authorization", "")
    token = ""
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    elif request.headers.get("X-Auth-Token"):
        token = request.headers.get("X-Auth-Token").strip()
    elif request.args.get("auth_token"):
        token = request.args.get("auth_token").strip()

    if token:
        return decode_auth_token(token)
    return None


# ---------------------------------------------------------------------------
# Session & Context Helpers
# ---------------------------------------------------------------------------

def set_session(user: dict, role: str = "manager") -> str:
    """Stores user identity in session and returns a signed token."""
    session.clear()
    session.permanent = True
    session["role"] = role

    if role == "manager":
        session["manager_id"] = user["manager_id"]
        session["full_name"] = user.get("full_name") or user.get("name", "Manager")
        session["email"] = user.get("email", "")
        session["department"] = user.get("department", "Management")
    elif role == "employee":
        session["employee_id"] = user["employee_id"]
        session["employee_name"] = user.get("name") or user.get("full_name", "Employee")
        session["employee_email"] = user.get("email", "")
        session["employee_department"] = user.get("department", "General")
        session["manager_id"] = user.get("manager_id", "")
    elif role == "admin":
        session["admin_id"] = user.get("admin_id", "CEO-001")
        session["full_name"] = user.get("full_name", "CEO / Administrator")
        session["email"] = user.get("email", "admin@workmate.io")

    return generate_auth_token(user, role)


def clear_session() -> None:
    """Clears all session variables upon logout."""
    session.clear()


def is_authenticated() -> bool:
    """Returns True if valid session or valid token exists."""
    if session.get("manager_id") or session.get("employee_id") or session.get("admin_id"):
        return True
    token_data = get_token_from_request()
    return bool(token_data and (token_data.get("manager_id") or token_data.get("employee_id") or token_data.get("admin_id")))


def get_current_role() -> str:
    """Returns 'manager', 'employee', 'admin', or 'guest'."""
    role = session.get("role")
    if role and role != "guest":
        return role
    token_data = get_token_from_request()
    if token_data:
        return token_data.get("role", "guest")
    return "guest"


def is_manager() -> bool:
    return get_current_role() == "manager" and bool(get_current_manager_id())


def is_employee() -> bool:
    return get_current_role() == "employee" and bool(get_current_employee_id())


def is_admin() -> bool:
    return get_current_role() == "admin"


def get_current_manager_id() -> str | None:
    """Returns the active manager_id for managers, or the supervising manager_id for employees."""
    mgr_id = session.get("manager_id")
    if mgr_id:
        return mgr_id
    token_data = get_token_from_request()
    if token_data:
        return token_data.get("manager_id")
    return None


def get_current_employee_id() -> str | None:
    emp_id = session.get("employee_id")
    if emp_id:
        return emp_id
    token_data = get_token_from_request()
    if token_data:
        return token_data.get("employee_id")
    return None


# ---------------------------------------------------------------------------
# Route Protection Decorators
# ---------------------------------------------------------------------------

def login_required(f):
    """Requires an authenticated session of any role."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not is_authenticated():
            return jsonify({"error": "Authentication required. Please sign in."}), 401
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
