"""
backend/employee_manager.py — WorkMate Employee Store & Authentication
Handles employee CRUD, credential management, profile updates, and authentication.
Stores records in employees.json.
"""

import os
import json
import re
from datetime import datetime
from backend.time_utils import format_datetime_ist, format_date_ist, now_ist, matches_emp_id
from backend.auth import hash_password, verify_password


from backend.storage_utils import read_json_file, write_json_file

EMPLOYEES_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "employees.json")
DEFAULT_EMPLOYEE_PASSWORD = "Emp@1234"


def load_employees() -> list:
    return read_json_file(EMPLOYEES_FILE)


def save_employees(employees: list) -> None:
    write_json_file(EMPLOYEES_FILE, employees)


def is_valid_email(email: str) -> bool:
    pattern = r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email.strip()))


def is_valid_phone(phone: str) -> bool:
    pattern = r"^[\d\s\-\+\(\)]{7,20}$"
    return bool(re.match(pattern, phone.strip()))


def _safe_employee(emp: dict) -> dict:
    return {k: v for k, v in emp.items() if k != "password_hash"}


def get_all_employees() -> list:
    employees = load_employees()
    return [_safe_employee(e) for e in employees]


def get_employees_for_manager(manager_id: str) -> list:
    employees = load_employees()
    norm_id = str(manager_id).strip().upper()
    mgr_ids = [norm_id]
    if norm_id in ["MGR-001", "003", "005"]:
        mgr_ids = ["MGR-001", "003", "005"]
    return [
        _safe_employee(e) for e in employees
        if str(e.get("manager_id", "")).strip().upper() in mgr_ids or not e.get("manager_id")
    ]


def get_employee_by_id(employee_id: str, manager_id: str = None) -> dict | None:
    employees = load_employees()
    for e in employees:
        if matches_emp_id(e.get("employee_id"), employee_id):
            if manager_id is None or matches_emp_id(e.get("manager_id"), manager_id) or not e.get("manager_id"):
                return e
    return None


def get_employee_by_email(email: str) -> dict | None:
    employees = load_employees()
    for e in employees:
        if e.get("email", "").strip().lower() == email.strip().lower():
            return e
    return None


def get_team_for_employee(employee_id: str) -> dict | None:
    emp = get_employee_by_id(employee_id)
    if not emp:
        return None

    manager_id = emp.get("manager_id", "MGR-001")
    # Lazy import to avoid circular dependencies
    from backend.manager_store import get_manager_by_id
    manager = get_manager_by_id(manager_id)

    manager_info = {
        "manager_id": manager_id,
        "name": manager.get("full_name", "Alex Morgan") if manager else "Alex Morgan",
        "email": manager.get("email", "") if manager else "",
        "phone": manager.get("phone", "") if manager else "",
        "department": manager.get("department", emp.get("department", "Engineering")) if manager else emp.get("department", "Engineering"),
        "avatar": manager.get("avatar", "") if manager else "",
    }

    teammates = get_employees_for_manager(manager_id)
    team_members = [
        {
            "employee_id": t.get("employee_id"),
            "name": t.get("name"),
            "email": t.get("email"),
            "phone": t.get("phone", ""),
            "department": t.get("department", ""),
            "role": "Team Member",
            "avatar": t.get("avatar", ""),
            "created_at": t.get("created_at", ""),
        }
        for t in teammates
    ]

    return {
        "manager": manager_info,
        "team_members": team_members,
    }


def add_employee(manager_id: str, data: dict) -> dict:
    employees = load_employees()
    required = ["employee_id", "name", "email", "department"]
    for field in required:
        if not data.get(field, "").strip():
            raise ValueError(f"'{field.replace('_', ' ').title()}' is required.")

    employee_id = data["employee_id"].strip().upper()
    name = data["name"].strip()
    email = data["email"].strip().lower()
    phone = data.get("phone", "").strip()
    department = data["department"].strip()
    avatar = data.get("avatar", "").strip()
    raw_password = data.get("password", "").strip() or DEFAULT_EMPLOYEE_PASSWORD

    if not re.match(r"^[A-Z0-9\-]{2,20}$", employee_id):
        raise ValueError("Employee ID must be 2–20 alphanumeric characters (dashes allowed), e.g. EMP-001.")

    if len(name) < 2:
        raise ValueError("Employee name must be at least 2 characters.")

    if not is_valid_email(email):
        raise ValueError("Please enter a valid email address.")

    if phone and not is_valid_phone(phone):
        raise ValueError("Please enter a valid phone number.")

    if len(department) < 2:
        raise ValueError("Department must be at least 2 characters.")

    if len(raw_password) < 6:
        raise ValueError("Employee initial password must be at least 6 characters.")

    for e in employees:
        if e["employee_id"].upper() == employee_id:
            raise ValueError(f"Employee ID '{employee_id}' is already registered in the system.")
        if e["email"].lower() == email:
            raise ValueError(f"Email '{email}' is already registered in the system.")

    new_employee = {
        "employee_id": employee_id,
        "manager_id": manager_id,
        "name": name,
        "email": email,
        "phone": phone,
        "department": department,
        "avatar": avatar,
        "password_hash": hash_password(raw_password),
        "created_at": format_datetime_ist(),
    }

    employees.append(new_employee)
    save_employees(employees)
    return _safe_employee(new_employee)


def update_employee(manager_id: str, employee_id: str, updates: dict) -> dict:
    employees = load_employees()
    target_idx = -1
    for idx, e in enumerate(employees):
        if e.get("manager_id") == manager_id and e["employee_id"].upper() == employee_id.strip().upper():
            target_idx = idx
            break

    if target_idx == -1:
        raise ValueError(f"Employee '{employee_id}' not found.")

    emp = employees[target_idx]

    if "name" in updates:
        name = updates["name"].strip()
        if len(name) < 2:
            raise ValueError("Employee name must be at least 2 characters.")
        emp["name"] = name

    if "email" in updates:
        email = updates["email"].strip().lower()
        if not is_valid_email(email):
            raise ValueError("Please enter a valid email address.")
        for idx, e in enumerate(employees):
            if idx != target_idx and e.get("manager_id") == manager_id and e["email"].lower() == email:
                raise ValueError(f"Email '{email}' is already in use.")
        emp["email"] = email

    if "phone" in updates:
        phone = updates["phone"].strip()
        if phone and not is_valid_phone(phone):
            raise ValueError("Please enter a valid phone number.")
        emp["phone"] = phone

    if "department" in updates:
        dept = updates["department"].strip()
        if len(dept) < 2:
            raise ValueError("Department must be at least 2 characters.")
        emp["department"] = dept

    if "avatar" in updates:
        emp["avatar"] = updates["avatar"].strip()

    if "password" in updates and updates["password"].strip():
        new_pwd = updates["password"].strip()
        if len(new_pwd) < 6:
            raise ValueError("Password must be at least 6 characters.")
        emp["password_hash"] = hash_password(new_pwd)

    employees[target_idx] = emp
    save_employees(employees)
    return _safe_employee(emp)


def delete_employee(manager_id: str, employee_id: str, tasks: list) -> dict:
    employees = load_employees()
    target_idx = -1
    for idx, e in enumerate(employees):
        if e.get("manager_id") == manager_id and e["employee_id"].upper() == employee_id.strip().upper():
            target_idx = idx
            break

    if target_idx == -1:
        raise ValueError(f"Employee '{employee_id}' not found.")

    active_tasks = [
        t for t in tasks
        if t.get("manager_id") == manager_id
        and t.get("employee_id", "").upper() == employee_id.upper()
        and t.get("status") != "Completed"
    ]
    if active_tasks:
        task_titles = ", ".join(f"'{t['title']}'" for t in active_tasks[:3])
        raise ValueError(
            f"Cannot delete employee with active tasks assigned ({task_titles}). "
            "Please reassign or complete all tasks first."
        )

    deleted = employees.pop(target_idx)
    save_employees(employees)
    return _safe_employee(deleted)


def authenticate_employee(identifier: str, password: str) -> dict | None:
    employees = load_employees()
    clean_id = identifier.strip().upper()
    clean_email = identifier.strip().lower()

    candidates = [
        e for e in employees
        if e.get("employee_id", "").upper() == clean_id or e.get("email", "").strip().lower() == clean_email
    ]
    if not candidates:
        return None

    for emp in candidates:
        stored_hash = emp.get("password_hash")
        if not stored_hash:
            if password == DEFAULT_EMPLOYEE_PASSWORD:
                emp["password_hash"] = hash_password(DEFAULT_EMPLOYEE_PASSWORD)
                save_employees(employees)
                return emp
        elif verify_password(password, stored_hash):
            return emp

    return None


def update_employee_profile(employee_id: str, updates: dict) -> dict:
    employees = load_employees()
    target_idx = -1
    for idx, e in enumerate(employees):
        if e["employee_id"].upper() == employee_id.strip().upper():
            target_idx = idx
            break

    if target_idx == -1:
        raise ValueError(f"Employee profile '{employee_id}' not found.")

    emp = employees[target_idx]

    if "name" in updates:
        name = updates["name"].strip()
        if len(name) < 2:
            raise ValueError("Name must be at least 2 characters.")
        emp["name"] = name

    if "phone" in updates:
        phone = updates["phone"].strip()
        if phone and not is_valid_phone(phone):
            raise ValueError("Please enter a valid phone number.")
        emp["phone"] = phone

    if "avatar" in updates:
        emp["avatar"] = updates["avatar"].strip()

    employees[target_idx] = emp
    save_employees(employees)
    return _safe_employee(emp)


def update_employee_password(employee_id: str, current_password: str, new_password: str, confirm_password: str) -> None:
    employees = load_employees()
    target_idx = -1
    for idx, e in enumerate(employees):
        if e["employee_id"].upper() == employee_id.strip().upper():
            target_idx = idx
            break

    if target_idx == -1:
        raise ValueError("Employee not found.")

    emp = employees[target_idx]
    stored_hash = emp.get("password_hash", "")

    if not stored_hash:
        if current_password != DEFAULT_EMPLOYEE_PASSWORD:
            raise ValueError("Current password is incorrect.")
    elif not verify_password(current_password, stored_hash):
        raise ValueError("Current password is incorrect.")

    if len(new_password) < 6:
        raise ValueError("New password must be at least 6 characters.")

    if new_password != confirm_password:
        raise ValueError("New passwords do not match.")

    if new_password == current_password:
        raise ValueError("New password must differ from current password.")

    emp["password_hash"] = hash_password(new_password)
    employees[target_idx] = emp
    save_employees(employees)


def seed_if_empty(manager_id: str) -> None:
    employees = load_employees()
    existing = [e for e in employees if e.get("manager_id") == manager_id]
    if existing:
        return

    default_hash = hash_password(DEFAULT_EMPLOYEE_PASSWORD)
    sample_employees = [
        {"employee_id": "EMP-001", "manager_id": manager_id, "name": "Sarah Jenkins",
         "email": "sarah.jenkins@workmate.io", "phone": "+1 (555) 234-5678", "department": "Engineering",
         "avatar": "", "password_hash": default_hash, "created_at": "2025-01-15 09:30:00"},
        {"employee_id": "EMP-002", "manager_id": manager_id, "name": "David Miller",
         "email": "david.miller@workmate.io", "phone": "+1 (555) 345-6789", "department": "Backend",
         "avatar": "", "password_hash": default_hash, "created_at": "2025-01-16 10:15:00"},
        {"employee_id": "EMP-003", "manager_id": manager_id, "name": "Emily Chen",
         "email": "emily.chen@workmate.io", "phone": "+1 (555) 456-7890", "department": "Design",
         "avatar": "", "password_hash": default_hash, "created_at": "2025-01-17 11:00:00"},
        {"employee_id": "EMP-004", "manager_id": manager_id, "name": "Raj Patel",
         "email": "raj.patel@workmate.io", "phone": "+1 (555) 567-8901", "department": "DevOps",
         "avatar": "", "password_hash": default_hash, "created_at": "2025-01-18 14:20:00"},
        {"employee_id": "EMP-005", "manager_id": manager_id, "name": "Lisa Wang",
         "email": "lisa.wang@workmate.io", "phone": "+1 (555) 678-9012", "department": "QA",
         "avatar": "", "password_hash": default_hash, "created_at": "2025-01-19 16:45:00"},
    ]
    employees.extend(sample_employees)
    save_employees(employees)
