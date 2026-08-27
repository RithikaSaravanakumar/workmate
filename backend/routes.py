"""
backend/routes.py — WorkMate Unified REST API Blueprint
Implements endpoints for:
- Authentication & Sessions (Manager, Employee, CEO/Admin)
- Tasks Management & Activity Timelines
- Employee Directory & Credentials
- Leave Management (Employee leaves, Manager's own leaves, CEO/Admin review)
- Productivity Reports, Calendar, and Scoped Dashboards
"""

from flask import Blueprint, jsonify, request, session
from datetime import datetime
from backend.auth import (
    set_session, clear_session, is_authenticated,
    login_required, manager_required, employee_required, admin_required,
    get_current_role, get_current_manager_id, get_current_employee_id, is_manager
)
from backend.manager_store import (
    create_manager, authenticate_manager, get_manager_by_id, load_managers,
    update_manager_profile, change_manager_password, seed_if_empty as seed_manager
)
from backend.employee_manager import (
    get_employees_for_manager, get_all_employees, get_employee_by_id, add_employee, update_employee, delete_employee,
    authenticate_employee, update_employee_profile, update_employee_password, get_team_for_employee,
    seed_if_empty as seed_employees
)
from backend.task_manager import task_manager
from backend.leave_manager import leave_manager
from backend.attendance_manager import attendance_manager


bp = Blueprint("api", __name__)


# ---------------------------------------------------------------------------
# Authentication Endpoints
# ---------------------------------------------------------------------------

@bp.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    identifier = (data.get("identifier") or data.get("email") or data.get("username") or "").strip()
    password = data.get("password", "")
    requested_role = data.get("role", "").strip().lower()

    if not identifier or not password:
        return jsonify({"error": "Identifier and password are required."}), 400

    # 1. Admin Login
    if requested_role in ["admin", "ceo"] or (not requested_role and identifier.lower() in ["admin", "ceo", "admin@workmate.io"]):
        if identifier.lower() in ["admin", "ceo", "admin@workmate.io"] and password in ["Admin@1234", "Ceo@1234"]:
            admin_user = {"admin_id": "CEO-001", "full_name": "CEO / Administrator", "email": "admin@workmate.io", "role": "admin"}
            token = set_session(admin_user, role="admin")
            return jsonify({"message": "CEO/Admin login successful.", "role": "admin", "user": admin_user, "token": token}), 200
        if requested_role in ["admin", "ceo"]:
            return jsonify({"error": "Invalid CEO / Admin credentials."}), 401

    # 2. Manager Login
    if requested_role == "manager":
        manager = authenticate_manager(identifier, password)
        if manager:
            token = set_session(manager, role="manager")
            seed_employees(manager["manager_id"])
            safe_m = {k: v for k, v in manager.items() if k != "password_hash"}
            safe_m["role"] = "manager"
            return jsonify({"message": "Manager login successful.", "role": "manager", "user": safe_m, "token": token}), 200
        return jsonify({"error": "Invalid Manager credentials. Please check your manager ID/email and password."}), 401

    # 3. Employee Login
    if requested_role == "employee":
        employee = authenticate_employee(identifier, password)
        if employee:
            token = set_session(employee, role="employee")
            safe_e = {k: v for k, v in employee.items() if k != "password_hash"}
            safe_e["role"] = "employee"
            safe_e["full_name"] = safe_e.get("name", "")
            return jsonify({"message": "Employee login successful.", "role": "employee", "user": safe_e, "token": token}), 200
        return jsonify({"error": "Invalid Employee credentials. Please check your employee ID/email and password."}), 401

    # 4. Fallback if no specific role was requested
    manager = authenticate_manager(identifier, password)
    if manager:
        token = set_session(manager, role="manager")
        seed_employees(manager["manager_id"])
        safe_m = {k: v for k, v in manager.items() if k != "password_hash"}
        safe_m["role"] = "manager"
        return jsonify({"message": "Login successful.", "role": "manager", "user": safe_m, "token": token}), 200

    employee = authenticate_employee(identifier, password)
    if employee:
        token = set_session(employee, role="employee")
        safe_e = {k: v for k, v in employee.items() if k != "password_hash"}
        safe_e["role"] = "employee"
        safe_e["full_name"] = safe_e.get("name", "")
        return jsonify({"message": "Login successful.", "role": "employee", "user": safe_e, "token": token}), 200

    return jsonify({"error": "Invalid identifier or password. Please check your credentials."}), 401


@bp.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    try:
        new_manager = create_manager(data)
        seed_employees(new_manager["manager_id"])
        return jsonify({"message": "Manager account created successfully.", "manager": new_manager}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/auth/me", methods=["GET"])
@login_required
def me():
    role = get_current_role()

    if role == "manager":
        manager = get_manager_by_id(get_current_manager_id())
        if not manager:
            return jsonify({"error": "Manager not found."}), 404
        safe_m = {k: v for k, v in manager.items() if k != "password_hash"}
        safe_m["role"] = "manager"
        return jsonify(safe_m), 200

    elif role == "employee":
        emp_id = get_current_employee_id()
        emp = get_employee_by_id(emp_id) if emp_id else None
        if not emp:
            # Fallback to session / token data
            emp_name = session.get("employee_name") or "Employee"
            emp_email = session.get("employee_email", "")
            emp_dept = session.get("employee_department", "General")
            mgr_id = session.get("manager_id", "")
            return jsonify({
                "employee_id": emp_id or "EMP-DEMO",
                "name": emp_name,
                "full_name": emp_name,
                "email": emp_email,
                "department": emp_dept,
                "manager_id": mgr_id,
                "role": "employee"
            }), 200
        safe_e = {k: v for k, v in emp.items() if k != "password_hash"}
        safe_e["role"] = "employee"
        safe_e["full_name"] = safe_e.get("name", "")
        return jsonify(safe_e), 200

    elif role == "admin":
        return jsonify({
            "admin_id": session.get("admin_id", "CEO-001"),
            "full_name": session.get("full_name", "CEO / Administrator"),
            "email": session.get("email", "admin@workmate.io"),
            "role": "admin"
        }), 200

    return jsonify({"error": "Unknown role."}), 400


@bp.route("/api/auth/logout", methods=["POST"])
def logout():
    clear_session()
    return jsonify({"message": "Signed out successfully."}), 200


@bp.route("/api/auth/profile", methods=["PUT"])
@login_required
def update_profile():
    data = request.get_json(silent=True) or {}
    role = get_current_role()

    try:
        if role == "manager":
            updated = update_manager_profile(get_current_manager_id(), data)
            session["full_name"] = updated["full_name"]
            session["email"] = updated["email"]
            return jsonify({"message": "Profile updated.", "user": updated}), 200
        elif role == "employee":
            updated = update_employee_profile(get_current_employee_id(), data)
            session["employee_name"] = updated["name"]
            session["employee_email"] = updated["email"]
            return jsonify({"message": "Profile updated.", "user": updated}), 200
        else:
            return jsonify({"error": "Cannot update admin profile."}), 400
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/auth/password", methods=["PUT"])
@login_required
def change_password():
    data = request.get_json(silent=True) or {}
    current_pwd = data.get("current_password", "")
    new_pwd = data.get("new_password", "")
    confirm_pwd = data.get("confirm_password", "")
    role = get_current_role()

    try:
        if role == "manager":
            change_manager_password(get_current_manager_id(), current_pwd, new_pwd, confirm_pwd)
        elif role == "employee":
            update_employee_password(get_current_employee_id(), current_pwd, new_pwd, confirm_pwd)
        else:
            return jsonify({"error": "Cannot change admin password."}), 400
        return jsonify({"message": "Password changed successfully."}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ---------------------------------------------------------------------------
# Tasks Endpoints
# ---------------------------------------------------------------------------

@bp.route("/api/tasks", methods=["GET"])
@login_required
def get_tasks():
    search = request.args.get("q", "")
    status = request.args.get("status", "")
    priority = request.args.get("priority", "")
    emp_filter = request.args.get("employee_id", "")
    scope = request.args.get("scope", "")  # "my_tasks" | "team_tasks" | "all"
    role = get_current_role()

    if role == "manager":
        mgr_id = get_current_manager_id()
        tasks = task_manager.get_tasks_for_manager(mgr_id, search, status, priority, emp_filter, scope)
        norm_mgr_id = "MGR-001" if mgr_id == "003" else mgr_id
        for t in tasks:
            t["is_my_task"] = (t.get("employee_id") == norm_mgr_id)
            t["can_update_status"] = (t.get("employee_id") == norm_mgr_id)
        return jsonify(tasks), 200

    elif role == "employee":
        emp_id = get_current_employee_id()
        tasks = task_manager.get_tasks_for_employee(emp_id, search, status, priority)
        for t in tasks:
            t["is_my_task"] = True
            t["can_update_status"] = True
        return jsonify(tasks), 200

    elif role == "admin":
        tasks = task_manager.get_all_tasks_for_admin(search, status, priority)
        for t in tasks:
            t["is_my_task"] = False
            t["can_update_status"] = False
        return jsonify(tasks), 200

    return jsonify([]), 200


@bp.route("/api/tasks", methods=["POST"])
@login_required
def create_task():
    role = get_current_role()
    data = request.get_json(silent=True) or {}

    try:
        if role == "manager":
            manager_id = get_current_manager_id()
            manager_name = session.get("full_name", "Manager")
            employees = get_employees_for_manager(manager_id)
            new_task = task_manager.add_task(manager_id, data, employees, manager_name)
            return jsonify(new_task), 201

        elif role == "admin":
            admin_id = session.get("admin_id", "CEO-001")
            managers = load_managers()
            new_task = task_manager.add_task_by_admin(admin_id, data, managers)
            return jsonify(new_task), 201

        else:
            return jsonify({"error": "Employees are not authorized to create tasks."}), 403

    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/tasks/<task_id>", methods=["GET"])
@login_required
def get_task(task_id):
    task = task_manager.get_task_by_id(task_id)
    if not task:
        return jsonify({"error": f"Task '{task_id}' not found."}), 404
    return jsonify(task), 200


@bp.route("/api/tasks/<task_id>", methods=["PUT"])
@manager_required
def update_task(task_id):
    manager_id = get_current_manager_id()
    employees = get_employees_for_manager(manager_id)
    data = request.get_json(silent=True) or {}
    try:
        updated = task_manager.update_task(manager_id, task_id, data, employees)
        return jsonify(updated), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/tasks/<task_id>/status", methods=["POST"])
@login_required
def update_task_status(task_id):
    data = request.get_json(silent=True) or {}
    new_status = data.get("status", "")
    note = data.get("note", "")
    role = get_current_role()

    if role == "employee":
        actor_id = get_current_employee_id()
        actor_name = session.get("employee_name") or session.get("name") or actor_id
    elif role == "manager":
        actor_id = get_current_manager_id()
        if actor_id == "003":
            actor_id = "MGR-001"
        actor_name = session.get("full_name") or session.get("name") or "Manager"
    elif role == "admin":
        actor_id = session.get("admin_id", "CEO-001")
        actor_name = session.get("full_name", "CEO / Administrator")
    else:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        updated = task_manager.update_task_status_authorized(
            task_id=task_id,
            actor_id=actor_id,
            actor_name=actor_name,
            actor_role=role,
            new_status=new_status,
            note=note
        )
        return jsonify({"message": f"Task status updated to {new_status}.", "task": updated}), 200

    except PermissionError as pe:
        return jsonify({"error": str(pe)}), 403
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400


@bp.route("/api/tasks/<task_id>/activity", methods=["GET"])
@login_required
def get_task_activity(task_id):
    task = task_manager.get_task_by_id(task_id)
    if not task:
        return jsonify({"error": f"Task '{task_id}' not found."}), 404

    return jsonify({
        "task_id": task["id"],
        "title": task["title"],
        "employee": task.get("employee", ""),
        "activity_log": task.get("activity_log", [])
    }), 200


@bp.route("/api/tasks/<task_id>", methods=["DELETE"])
@manager_required
def delete_task(task_id):
    try:
        deleted = task_manager.delete_task(get_current_manager_id(), task_id)
        return jsonify({"message": f"Task '{task_id}' deleted successfully.", "task": deleted}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ---------------------------------------------------------------------------
# Employee Directory & Team Endpoints
# ---------------------------------------------------------------------------

@bp.route("/api/employee/team", methods=["GET"])
@bp.route("/api/team/my-team", methods=["GET"])
@login_required
def get_employee_team():
    role = get_current_role()
    if role == "employee":
        emp_id = get_current_employee_id()
        team_data = get_team_for_employee(emp_id)
        if not team_data:
            return jsonify({"error": "Team information not found."}), 404
        return jsonify(team_data), 200
    elif role == "manager":
        manager_id = get_current_manager_id()
        manager = get_manager_by_id(manager_id)
        teammates = get_employees_for_manager(manager_id)
        return jsonify({
            "manager": {
                "manager_id": manager_id,
                "name": manager.get("full_name", "Manager") if manager else "Manager",
                "email": manager.get("email", "") if manager else "",
                "phone": manager.get("phone", "") if manager else "",
                "department": manager.get("department", "Management") if manager else "Management",
                "avatar": manager.get("avatar", "") if manager else "",
            },
            "team_members": teammates,
        }), 200
    else:
        return jsonify({"error": "Unauthorized"}), 403


@bp.route("/api/employees", methods=["GET"])
@login_required
def get_employees():
    role = get_current_role()
    if role == "employee":
        return jsonify({"error": "Employees are not authorized to view the employee management directory."}), 403

    if role == "admin":
        return get_admin_employees()

    # Manager view
    manager_id = get_current_manager_id()
    employees = get_employees_for_manager(manager_id)
    tasks = task_manager.get_tasks_for_manager(manager_id)
    today_records = attendance_manager.get_attendance_for_manager(manager_id)
    today_map = {r.get("employee_id"): r for r in today_records}
    approved_leaves = leave_manager.get_leaves_for_manager(manager_id, status="Approved")
    today_str = datetime.now().strftime("%Y-%m-%d")

    for emp in employees:
        emp_tasks = [t for t in tasks if t.get("employee_id") == emp["employee_id"]]
        emp["task_count"] = len(emp_tasks)
        emp["completed_tasks"] = sum(1 for t in emp_tasks if t.get("status") == "Completed")
        emp["active_task_count"] = sum(1 for t in emp_tasks if t.get("status") != "Completed")
        emp["role"] = emp.get("role", "Employee")

        # Attendance status
        att = today_map.get(emp["employee_id"])
        if att:
            if att.get("check_out"):
                emp["attendance_status"] = "Checked Out"
            elif att.get("check_in"):
                emp["attendance_status"] = "Checked In"
            else:
                emp["attendance_status"] = "Not Checked In"
        else:
            emp["attendance_status"] = "Not Checked In"

        # Leave status
        emp_leaves = [l for l in approved_leaves if l.get("employee_id") == emp["employee_id"] and l.get("start_date") <= today_str <= l.get("end_date")]
        if emp_leaves:
            emp["leave_status"] = f"On Leave ({emp_leaves[0].get('leave_type', 'Time Off')})"
            emp["attendance_status"] = "On Leave"
        else:
            emp["leave_status"] = "Active"

    return jsonify(employees), 200


@bp.route("/api/employees", methods=["POST"])
@manager_required
def create_employee():
    manager_id = get_current_manager_id()
    data = request.get_json(silent=True) or {}
    try:
        new_emp = add_employee(manager_id, data)
        return jsonify(new_emp), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/employees/<employee_id>", methods=["PUT"])
@manager_required
def update_employee_route(employee_id):
    manager_id = get_current_manager_id()
    data = request.get_json(silent=True) or {}
    try:
        updated = update_employee(manager_id, employee_id, data)
        return jsonify(updated), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/employees/<employee_id>", methods=["DELETE"])
@manager_required
def delete_employee_route(employee_id):
    manager_id = get_current_manager_id()
    tasks = task_manager.get_tasks_for_manager(manager_id)
    try:
        deleted = delete_employee(manager_id, employee_id, tasks)
        return jsonify({"message": f"Employee '{employee_id}' removed.", "employee": deleted}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ---------------------------------------------------------------------------
# Leave Management Endpoints
# ---------------------------------------------------------------------------

@bp.route("/api/leaves", methods=["GET"])
@login_required
def get_leaves():
    search = request.args.get("q", "")
    leave_type = request.args.get("type", "")
    status = request.args.get("status", "")
    emp_filter = request.args.get("employee_id", "")
    role = get_current_role()

    if role == "manager":
        leaves = leave_manager.get_leaves_for_manager(get_current_manager_id(), search, leave_type, status, emp_filter)
        return jsonify(leaves), 200
    elif role == "employee":
        leaves = leave_manager.get_leaves_for_employee(get_current_employee_id(), search, leave_type, status)
        return jsonify(leaves), 200
    else:
        return jsonify([]), 200


@bp.route("/api/leaves/stats", methods=["GET"])
@login_required
def get_leave_stats():
    role = get_current_role()
    if role == "manager":
        stats = leave_manager.get_manager_leave_stats(get_current_manager_id())
        return jsonify(stats), 200
    elif role == "employee":
        stats = leave_manager.get_employee_leave_stats(get_current_employee_id())
        return jsonify(stats), 200
    return jsonify({}), 200


@bp.route("/api/leaves", methods=["POST"])
@login_required
def create_leave():
    data = request.get_json(silent=True) or {}
    role = get_current_role()

    if role == "employee":
        emp_id = get_current_employee_id()
        emp = get_employee_by_id(emp_id) if emp_id else None
        
        emp_name = ""
        emp_dept = ""
        manager_id = ""
        if emp:
            emp_name = emp.get("name") or emp.get("full_name", "")
            emp_dept = emp.get("department", "")
            manager_id = emp.get("manager_id", "")
        
        if not emp_name:
            emp_name = session.get("employee_name") or session.get("name") or "Employee"
        if not emp_dept:
            emp_dept = session.get("employee_department") or "Engineering"
        if not manager_id:
            manager_id = session.get("manager_id") or "MGR-001"

        data["employee_id"] = emp_id
        data["employee_name"] = emp_name
        data["department"] = emp_dept
    elif role == "manager":
        manager_id = get_current_manager_id()
    else:
        return jsonify({"error": "Admin cannot submit regular employee leave requests."}), 403

    try:
        new_leave = leave_manager.add_leave_request(manager_id, data, is_manager_leave=False)
        return jsonify(new_leave), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/leaves/<leave_id>", methods=["GET"])
@login_required
def get_leave_details(leave_id):
    leave = leave_manager.get_leave_by_id(leave_id)
    if not leave:
        return jsonify({"error": f"Leave record '{leave_id}' not found."}), 404
    return jsonify(leave), 200


@bp.route("/api/leaves/<leave_id>/approve", methods=["POST"])
@manager_required
def approve_leave(leave_id):
    data = request.get_json(silent=True) or {}
    comment = data.get("comment", "")
    try:
        leave = leave_manager.approve_leave(get_current_manager_id(), leave_id, comment)
        return jsonify({"message": "Leave request approved.", "leave": leave}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/leaves/<leave_id>/reject", methods=["POST"])
@manager_required
def reject_leave(leave_id):
    data = request.get_json(silent=True) or {}
    reason = data.get("rejection_reason", "").strip()
    try:
        leave = leave_manager.reject_leave(get_current_manager_id(), leave_id, reason)
        return jsonify({"message": "Leave request rejected.", "leave": leave}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/leaves/<leave_id>", methods=["DELETE"])
@login_required
def delete_leave(leave_id):
    role = get_current_role()
    try:
        if role == "employee":
            deleted = leave_manager.delete_leave("", leave_id, is_employee=True, employee_id=get_current_employee_id())
        else:
            deleted = leave_manager.delete_leave(get_current_manager_id(), leave_id)
        return jsonify({"message": f"Leave request '{leave_id}' deleted.", "leave": deleted}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ---------------------------------------------------------------------------
# Manager's Own Leave & CEO/Admin Approver Workflow
# ---------------------------------------------------------------------------

@bp.route("/api/manager/leaves", methods=["GET"])
@manager_required
def get_manager_own_leaves():
    leaves = leave_manager.get_manager_own_leaves(get_current_manager_id())
    return jsonify(leaves), 200


@bp.route("/api/manager/leaves", methods=["POST"])
@manager_required
def submit_manager_own_leave():
    manager_id = get_current_manager_id()
    manager = get_manager_by_id(manager_id)
    data = request.get_json(silent=True) or {}
    data["employee_id"] = manager_id
    data["employee_name"] = manager.get("full_name", "Manager")
    data["department"] = manager.get("department", "Management")

    try:
        new_leave = leave_manager.add_leave_request(manager_id, data, is_manager_leave=True)
        return jsonify({"message": "Manager leave request submitted to CEO/Admin.", "leave": new_leave}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/admin/leaves", methods=["GET"])
@admin_required
def get_all_manager_leaves_admin():
    leaves = leave_manager.get_all_manager_leaves_for_admin()
    return jsonify(leaves), 200


@bp.route("/api/admin/leaves/<leave_id>/approve", methods=["POST"])
@admin_required
def ceo_approve_leave(leave_id):
    data = request.get_json(silent=True) or {}
    comment = data.get("comment", "Approved by CEO/Admin.")
    try:
        leave = leave_manager.ceo_approve_manager_leave(leave_id, comment)
        return jsonify({"message": "Manager leave approved by CEO.", "leave": leave}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/admin/leaves/<leave_id>/reject", methods=["POST"])
@admin_required
def ceo_reject_leave(leave_id):
    data = request.get_json(silent=True) or {}
    reason = data.get("rejection_reason", "").strip()
    try:
        leave = leave_manager.ceo_reject_manager_leave(leave_id, reason)
        return jsonify({"message": "Manager leave rejected by CEO.", "leave": leave}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ---------------------------------------------------------------------------
# Attendance Endpoints
# ---------------------------------------------------------------------------

@bp.route("/api/attendance/check-in", methods=["POST"])
@login_required
def attendance_check_in():
    role = get_current_role()
    if role == "employee":
        emp_id = get_current_employee_id()
        mgr_id = session.get("manager_id", "MGR-001")
        name = session.get("employee_name") or session.get("name") or emp_id
        dept = session.get("employee_department", "General")
    elif role == "manager":
        emp_id = get_current_manager_id()
        if emp_id == "003":
            emp_id = "MGR-001"
        mgr_id = "CEO-001"
        name = session.get("full_name", "Manager")
        dept = session.get("department", "Management")
    elif role == "admin":
        emp_id = session.get("admin_id", "CEO-001")
        mgr_id = "BOARD"
        name = session.get("full_name", "CEO / Administrator")
        dept = "Executive"
    else:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        record = attendance_manager.check_in(
            employee_id=emp_id,
            manager_id=mgr_id,
            employee_name=name,
            department=dept
        )
        resp = dict(record)
        resp["attendance"] = record
        resp["message"] = f"Checked in successfully at {record.get('check_in')}!"
        return jsonify(resp), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/attendance/check-out", methods=["POST"])
@login_required
def attendance_check_out():
    role = get_current_role()
    if role == "employee":
        emp_id = get_current_employee_id()
    elif role == "manager":
        emp_id = get_current_manager_id()
        if emp_id == "003":
            emp_id = "MGR-001"
    elif role == "admin":
        emp_id = session.get("admin_id", "CEO-001")
    else:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        record = attendance_manager.check_out(employee_id=emp_id)
        resp = dict(record)
        resp["attendance"] = record
        resp["message"] = f"Checked out successfully! Workday duration: {record.get('total_duration_formatted')}."
        return jsonify(resp), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/attendance/today", methods=["GET"])
@login_required
def get_today_attendance():
    role = get_current_role()
    if role == "employee":
        emp_id = get_current_employee_id()
    elif role == "manager":
        emp_id = get_current_manager_id()
        if emp_id == "003":
            emp_id = "MGR-001"
    elif role == "admin":
        emp_id = session.get("admin_id", "CEO-001")
    else:
        return jsonify({"attendance": None}), 200

    record = attendance_manager.get_today_attendance_for_employee(emp_id)
    if not record:
        return jsonify({"attendance": None}), 200

    resp = dict(record)
    resp["attendance"] = record
    return jsonify(resp), 200


@bp.route("/api/attendance/history", methods=["GET"])
@login_required
def get_attendance_history():
    role = get_current_role()
    if role == "employee":
        emp_id = get_current_employee_id()
    elif role == "manager":
        emp_id = get_current_manager_id()
        if emp_id == "003":
            emp_id = "MGR-001"
    elif role == "admin":
        emp_id = session.get("admin_id", "CEO-001")
    else:
        return jsonify([]), 200

    history = attendance_manager.get_attendance_history_for_employee(emp_id)
    return jsonify(history), 200


@bp.route("/api/attendance/team", methods=["GET"])
@manager_required
def get_team_attendance():
    manager_id = get_current_manager_id()
    date_filter = request.args.get("date", "")
    search = request.args.get("q", "")

    employees = get_employees_for_manager(manager_id)
    records = attendance_manager.get_attendance_for_manager(manager_id, date_filter, search)
    stats = attendance_manager.get_manager_attendance_stats(manager_id, employees)

    return jsonify({
        "records": records,
        "stats": stats
    }), 200


@bp.route("/api/attendance/organization", methods=["GET"])
@login_required
def get_organization_attendance():
    role = get_current_role()
    if role != "admin":
        return jsonify({"error": "Admin privileges required."}), 403

    date_filter = request.args.get("date", "")
    search = request.args.get("q", "")

    all_employees = get_all_employees()
    records = attendance_manager.get_all_attendance_for_admin(date_filter, search)
    stats = attendance_manager.get_admin_attendance_stats(all_employees)

    return jsonify({
        "records": records,
        "stats": stats
    }), 200


# ---------------------------------------------------------------------------
# CEO / Admin Specific Endpoints
# ---------------------------------------------------------------------------

@bp.route("/api/admin/dashboard", methods=["GET"])
@admin_required
def get_admin_dashboard():
    managers = load_managers()
    all_employees = get_all_employees()
    mgr_leaves = leave_manager.get_all_manager_leaves_for_admin()
    attendance_stats = attendance_manager.get_admin_attendance_stats(all_employees)

    # Count all tasks across all managers
    all_tasks = []
    for m in managers:
        all_tasks.extend(task_manager.get_tasks_for_manager(m["manager_id"]))

    total_tasks = len(all_tasks)
    completed_tasks = sum(1 for t in all_tasks if t.get("status") == "Completed")

    # Manager summary with team counts
    manager_cards = []
    for m in managers:
        m_id = m["manager_id"]
        team = [e for e in all_employees if e.get("manager_id") == m_id]
        m_tasks = [t for t in all_tasks if t.get("manager_id") == m_id]
        manager_cards.append({
            "manager_id": m_id,
            "full_name": m.get("full_name", ""),
            "email": m.get("email", ""),
            "phone": m.get("phone", ""),
            "department": m.get("department", "Management"),
            "team_size": len(team),
            "total_tasks": len(m_tasks),
            "active_tasks": sum(1 for t in m_tasks if t.get("status") != "Completed"),
        })

    return jsonify({
        "total_managers": len(managers),
        "total_employees": len(all_employees),
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_manager_leaves": sum(1 for l in mgr_leaves if l.get("status") == "Pending"),
        "approved_manager_leaves": sum(1 for l in mgr_leaves if l.get("status") == "Approved"),
        "rejected_manager_leaves": sum(1 for l in mgr_leaves if l.get("status") == "Rejected"),
        "manager_leaves": mgr_leaves,
        "managers": manager_cards,
        "attendance_stats": attendance_stats,
    }), 200


@bp.route("/api/admin/managers", methods=["GET"])
@admin_required
def get_admin_managers():
    managers = load_managers()
    all_employees = get_all_employees()

    results = []
    for m in managers:
        m_id = m["manager_id"]
        team = [e for e in all_employees if e.get("manager_id") == m_id]
        m_tasks = task_manager.get_tasks_for_manager(m_id)
        results.append({
            "manager_id": m_id,
            "full_name": m.get("full_name", ""),
            "email": m.get("email", ""),
            "phone": m.get("phone", ""),
            "department": m.get("department", "Management"),
            "team_size": len(team),
            "total_tasks": len(m_tasks),
            "created_at": m.get("created_at", ""),
        })

    return jsonify(results), 200


@bp.route("/api/admin/employees", methods=["GET"])
@admin_required
def get_admin_employees():
    all_employees = get_all_employees()
    managers = {m["manager_id"]: m for m in load_managers()}

    all_tasks = []
    for m_id in managers.keys():
        all_tasks.extend(task_manager.get_tasks_for_manager(m_id))

    today_records = attendance_manager.get_all_attendance_for_admin()
    today_map = {r.get("employee_id"): r for r in today_records}
    today_str = datetime.now().strftime("%Y-%m-%d")

    all_leaves = leave_manager.get_all_leaves()
    approved_leaves = [l for l in all_leaves if l.get("status") == "Approved" and not l.get("is_manager_leave")]

    for e in all_employees:
        m_id = e.get("manager_id", "")
        mgr = managers.get(m_id)
        e["manager_name"] = mgr.get("full_name", m_id or "General") if mgr else (m_id or "General")
        e["role"] = e.get("role", "Employee")

        emp_tasks = [t for t in all_tasks if t.get("employee_id") == e.get("employee_id")]
        e["task_count"] = len(emp_tasks)
        e["completed_tasks"] = sum(1 for t in emp_tasks if t.get("status") == "Completed")
        e["active_task_count"] = sum(1 for t in emp_tasks if t.get("status") != "Completed")

        att = today_map.get(e["employee_id"])
        if att:
            if att.get("check_out"):
                e["attendance_status"] = "Checked Out"
            elif att.get("check_in"):
                e["attendance_status"] = "Checked In"
            else:
                e["attendance_status"] = "Not Checked In"
        else:
            e["attendance_status"] = "Not Checked In"

        emp_leaves = [l for l in approved_leaves if l.get("employee_id") == e["employee_id"] and l.get("start_date") <= today_str <= l.get("end_date")]
        if emp_leaves:
            e["leave_status"] = f"On Leave ({emp_leaves[0].get('leave_type', 'Time Off')})"
            e["attendance_status"] = "On Leave"
        else:
            e["leave_status"] = "Active"

    return jsonify(all_employees), 200


# ---------------------------------------------------------------------------
# Dashboard & Reports Endpoints
# ---------------------------------------------------------------------------

@bp.route("/api/dashboard", methods=["GET"])
@login_required
def get_dashboard():
    role = get_current_role()

    if role == "manager":
        manager_id = get_current_manager_id()
        employees = get_employees_for_manager(manager_id)
        stats = task_manager.get_dashboard_stats(manager_id, employees)
        leave_stats = leave_manager.get_manager_leave_stats(manager_id)
        all_leaves = leave_manager.get_leaves_for_manager(manager_id)

        pending_list = [l for l in all_leaves if l.get("status") == "Pending"]
        approved_list = [l for l in all_leaves if l.get("status") == "Approved"]

        stats["leave_stats"] = leave_stats
        stats["pending_leaves"] = len(pending_list)
        stats["approved_leaves"] = len(approved_list)
        stats["recent_leave_requests"] = all_leaves[:8]
        stats["team_leave_requests"] = all_leaves[:8]
        stats["pending_leave_requests"] = pending_list
        stats["upcoming_approved_leaves"] = approved_list[:5]

        # Attendance summary for manager dashboard
        att_stats = attendance_manager.get_manager_attendance_stats(manager_id, employees)
        stats["attendance_stats"] = att_stats

        return jsonify(stats), 200

    elif role == "employee":
        emp_id = get_current_employee_id()
        stats = task_manager.get_employee_dashboard_stats(emp_id)
        emp_leaves = leave_manager.get_leaves_for_employee(emp_id)
        leave_stats = leave_manager.get_employee_leave_stats(emp_id)

        stats["leave_stats"] = leave_stats
        stats["pending_leaves"] = sum(1 for l in emp_leaves if l.get("status") == "Pending")
        stats["approved_leaves"] = sum(1 for l in emp_leaves if l.get("status") == "Approved")
        stats["recent_leave_requests"] = emp_leaves[:8]
        stats["my_leave_requests"] = emp_leaves[:8]

        # Attendance info for employee dashboard
        today_att = attendance_manager.get_today_attendance_for_employee(emp_id)
        att_history = attendance_manager.get_attendance_history_for_employee(emp_id, limit=5)
        stats["today_attendance"] = today_att
        stats["attendance_history"] = att_history

        return jsonify(stats), 200

    elif role == "admin":
        return get_admin_dashboard()

    return jsonify({}), 200


@bp.route("/api/reports", methods=["GET"])
@login_required
def get_reports():
    role = get_current_role()
    if role == "employee":
        return jsonify({"error": "Employees are not authorized to view reports."}), 403

    if role == "admin":
        managers = load_managers()
        employees = get_all_employees()
        tasks = []
        leaves = []
        for m in managers:
            m_id = m["manager_id"]
            tasks.extend(task_manager.get_tasks_for_manager(m_id))
            leaves.extend(leave_manager.get_leaves_for_manager(m_id))

        total_tasks = len(tasks)
        completed_tasks = sum(1 for t in tasks if t.get("status") == "Completed")
        completion_rate = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0

        employee_stats = []
        for emp in employees:
            emp_tasks = [t for t in tasks if t.get("employee_id") == emp["employee_id"]]
            emp_total = len(emp_tasks)
            emp_done = sum(1 for t in emp_tasks if t.get("status") == "Completed")
            emp_prog = sum(1 for t in emp_tasks if t.get("status") == "In Progress")
            emp_pend = sum(1 for t in emp_tasks if t.get("status") == "Pending")
            emp_leaves = [l for l in leaves if l.get("employee_id") == emp["employee_id"] and l.get("status") == "Approved"]
            days_off = sum(l.get("days_count", 0) for l in emp_leaves)

            employee_stats.append({
                "employee_id": emp["employee_id"],
                "name": emp["name"],
                "department": emp["department"],
                "total_tasks": emp_total,
                "completed": emp_done,
                "in_progress": emp_prog,
                "pending": emp_pend,
                "completion_rate": round((emp_done / emp_total * 100), 1) if emp_total > 0 else 0,
                "days_off": days_off,
            })

        dept_map = {}
        for e in employee_stats:
            dept = e["department"] or "General"
            if dept not in dept_map:
                dept_map[dept] = {"department": dept, "employees": 0, "tasks": 0, "completed": 0, "days_off": 0}
            dept_map[dept]["employees"] += 1
            dept_map[dept]["tasks"] += e["total_tasks"]
            dept_map[dept]["completed"] += e["completed"]
            dept_map[dept]["days_off"] += e["days_off"]

        all_leaves_admin = leave_manager.get_all_manager_leaves_for_admin()
        return jsonify({
            "completion_rate": completion_rate,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "total_employees": len(employees),
            "leave_stats": {
                "total": len(all_leaves_admin),
                "pending": sum(1 for l in all_leaves_admin if l.get("status") == "Pending"),
                "approved": sum(1 for l in all_leaves_admin if l.get("status") == "Approved"),
                "rejected": sum(1 for l in all_leaves_admin if l.get("status") == "Rejected"),
            },
            "employee_stats": employee_stats,
            "department_breakdown": list(dept_map.values()),
        }), 200

    # Manager view
    manager_id = get_current_manager_id()
    employees = get_employees_for_manager(manager_id)
    tasks = task_manager.get_tasks_for_manager(manager_id)
    leaves = leave_manager.get_leaves_for_manager(manager_id)

    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.get("status") == "Completed")
    completion_rate = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0

    employee_stats = []
    for emp in employees:
        emp_tasks = [t for t in tasks if t.get("employee_id") == emp["employee_id"]]
        emp_total = len(emp_tasks)
        emp_done = sum(1 for t in emp_tasks if t.get("status") == "Completed")
        emp_prog = sum(1 for t in emp_tasks if t.get("status") == "In Progress")
        emp_pend = sum(1 for t in emp_tasks if t.get("status") == "Pending")
        emp_leaves = [l for l in leaves if l.get("employee_id") == emp["employee_id"] and l.get("status") == "Approved"]
        days_off = sum(l.get("days_count", 0) for l in emp_leaves)

        employee_stats.append({
            "employee_id": emp["employee_id"],
            "name": emp["name"],
            "department": emp["department"],
            "total_tasks": emp_total,
            "completed": emp_done,
            "in_progress": emp_prog,
            "pending": emp_pend,
            "completion_rate": round((emp_done / emp_total * 100), 1) if emp_total > 0 else 0,
            "days_off": days_off,
        })

    dept_map = {}
    for e in employee_stats:
        dept = e["department"] or "General"
        if dept not in dept_map:
            dept_map[dept] = {"department": dept, "employees": 0, "tasks": 0, "completed": 0, "days_off": 0}
        dept_map[dept]["employees"] += 1
        dept_map[dept]["tasks"] += e["total_tasks"]
        dept_map[dept]["completed"] += e["completed"]
        dept_map[dept]["days_off"] += e["days_off"]

    return jsonify({
        "completion_rate": completion_rate,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "total_employees": len(employees),
        "leave_stats": leave_manager.get_manager_leave_stats(manager_id),
        "employee_stats": employee_stats,
        "department_breakdown": list(dept_map.values())
    }), 200


@bp.route("/api/calendar", methods=["GET"])
@login_required
def get_calendar():
    role = get_current_role()
    if role == "manager":
        mgr_id = get_current_manager_id()
        # 1. Employee approved leave dates for employees in the Manager's team
        team_leaves = leave_manager.get_leaves_for_manager(mgr_id, status="Approved")
        # 2. Manager's own approved leave
        my_leaves = leave_manager.get_manager_own_leaves(mgr_id)
        approved_my_leaves = [l for l in my_leaves if l.get("status") == "Approved"]
        leaves = team_leaves + approved_my_leaves

        # 3. Task due dates for team employees + 4. Tasks assigned to Manager by CEO/Admin
        tasks = task_manager.get_tasks_for_manager(mgr_id, scope="all")
    elif role == "employee":
        emp_id = get_current_employee_id()
        leaves = leave_manager.get_leaves_for_employee(emp_id, status="Approved")
        tasks = task_manager.get_tasks_for_employee(emp_id)
    else:
        all_leaves = leave_manager.get_all_leaves()
        leaves = [l for l in all_leaves if l.get("status") == "Approved"]
        tasks = task_manager.get_all_tasks_for_admin()

    return jsonify({
        "leaves": leaves,
        "tasks": tasks
    }), 200


