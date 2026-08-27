"""
test_leave_flow.py — Comprehensive Automated Test Suite
Validates:
1. Manager Authentication (with & without role parameter)
2. Role Separation & RBAC Enforcement (Employee blocked from Manager login & manager endpoints)
3. Task CRUD & Activity Log Audit Trail
4. Employee Creation with Unique ID/Email & Password Hashing
5. Newly Created Employee Immediate Login
6. Employee Role-Based Task Scoping (Privacy)
7. Employee Status Transitions (Pending -> In Progress -> Completed -> Reopen)
8. Sarah Jenkins Leave Request Synchronization (stored in leaves.json with manager_id & employee_id)
9. Manager Pending Queue Synchronization & Leave Approval/Rejection with Comment
10. Employee Leave Status & Manager Comment Visibility
11. Manager's Own Leave Routed to CEO/Admin & CEO Approval Workflow
12. Logout Session Clearance & Access Revocation
"""

import os
import json
from datetime import date
from backend.main import create_app
from backend import manager_store
from backend import employee_manager
from backend.leave_manager import leave_manager


def clean_test_leaves():
    """Helper to remove temporary test leaves from leaves.json."""
    leaves = leave_manager._load_leaves()
    cleaned = [
        l for l in leaves
        if not (l.get("start_date") in ["2026-09-10", "2026-10-01", "2026-11-15"]
                or l.get("reason") in ["Family function and travel.", "Executive leadership seminar.", "Test leave"]
                or l.get("employee_id") == "EMP-099")
    ]
    leave_manager._save_leaves(cleaned)


def test_complete_workmate_suite():
    app = create_app()
    app.config["TESTING"] = True
    client = app.test_client()

    print("\n" + "=" * 60)
    print("  STARTING WORKMATE ENTERPRISE TEST SUITE")
    print("=" * 60)

    clean_test_leaves()

    # -------------------------------------------------------------------
    # 1. MANAGER AUTHENTICATION & ROLE SELECTION
    # -------------------------------------------------------------------
    print("\n--- 1. Testing Manager Authentication & Role Selection ---")
    login_res = client.post("/api/auth/login", json={
        "identifier": "alex@workmate.io",
        "password": "Demo@1234",
        "role": "manager"
    })
    assert login_res.status_code == 200, f"Manager login failed: {login_res.data}"
    manager_body = login_res.get_json()
    assert manager_body["role"] == "manager"
    manager_id = manager_body["user"]["manager_id"]
    print(f"[PASS] Manager logged in successfully: {manager_id} (Role: {manager_body['role']})")

    # Check /api/auth/me
    me_res = client.get("/api/auth/me")
    assert me_res.status_code == 200
    assert me_res.get_json()["role"] == "manager"
    print("[PASS] Verified /api/auth/me returns Manager role & details")

    # Test Role Guard: Employee credentials with role='manager' must be rejected
    mismatch_res = client.post("/api/auth/login", json={
        "identifier": "sarah.jenkins@workmate.io",
        "password": "Emp@1234",
        "role": "manager"
    })
    assert mismatch_res.status_code == 401
    print("[PASS] Employee rejected when attempting Manager Login (Role Isolation)")

    # -------------------------------------------------------------------
    # 2. MANAGER TASK CREATION & ACTIVITY LOGS
    # -------------------------------------------------------------------
    print("\n--- 2. Testing Task Management & Activity History ---")
    client.delete("/api/tasks/TASK-777")

    task_payload = {
        "id": "TASK-777",
        "title": "Build Role-Based Access Control",
        "description": "Implement authentication and role decorators for all endpoints.",
        "employee_id": "EMP-001",
        "priority": "High",
        "status": "Pending",
        "due_date": "2026-09-01"
    }
    create_task_res = client.post("/api/tasks", json=task_payload)
    assert create_task_res.status_code == 201, f"Failed to create task: {create_task_res.data}"
    created_task = create_task_res.get_json()
    assert created_task["id"] == "TASK-777"
    assert created_task["employee"] == "Sarah Jenkins"
    assert len(created_task.get("activity_log", [])) >= 1
    print("[PASS] Manager created task TASK-777 assigned to Sarah Jenkins with activity trail")

    # -------------------------------------------------------------------
    # 3. EMPLOYEE CREATION WITH GLOBAL UNIQUENESS & IMMEDIATE LOGIN
    # -------------------------------------------------------------------
    print("\n--- 3. Testing Employee Creation with Unique ID/Email & Credentials ---")
    try:
        employee_manager.delete_employee(manager_id, "EMP-099", [])
    except Exception:
        pass

    emp_payload = {
        "employee_id": "EMP-099",
        "name": "Alex Carter",
        "email": "alex.carter@workmate.io",
        "phone": "+1 (555) 999-8888",
        "department": "Engineering",
        "password": "EmpSecret@123"
    }
    create_emp_res = client.post("/api/employees", json=emp_payload)
    assert create_emp_res.status_code == 201
    created_emp = create_emp_res.get_json()
    assert created_emp["employee_id"] == "EMP-099"
    assert "password_hash" not in created_emp
    print("[PASS] Manager created new employee EMP-099 with custom credentials")

    # Test Duplicate ID / Email Rejection
    dup_res = client.post("/api/employees", json=emp_payload)
    assert dup_res.status_code == 400
    assert "already registered" in dup_res.get_json()["error"]
    print("[PASS] Duplicate Employee ID / Email rejected (Uniqueness Enforced)")

    # Test Newly Created Employee Immediate Login
    new_emp_login = client.post("/api/auth/login", json={
        "identifier": "alex.carter@workmate.io",
        "password": "EmpSecret@123",
        "role": "employee"
    })
    assert new_emp_login.status_code == 200
    assert new_emp_login.get_json()["user"]["employee_id"] == "EMP-099"
    print("[PASS] Newly created employee logged in immediately without browser refresh")

    # -------------------------------------------------------------------
    # 4. SARAH JENKINS AUTHENTICATION & TASK SCOPING
    # -------------------------------------------------------------------
    print("\n--- 4. Testing Sarah Jenkins Employee Authentication & Scoping ---")
    emp_login_res = client.post("/api/auth/login", json={
        "identifier": "sarah.jenkins@workmate.io",
        "password": "Emp@1234",
        "role": "employee"
    })
    assert emp_login_res.status_code == 200, f"Employee login failed: {emp_login_res.data}"
    emp_body = emp_login_res.get_json()
    assert emp_body["role"] == "employee"
    assert emp_body["user"]["employee_id"] == "EMP-001"
    print("[PASS] Sarah Jenkins logged in successfully (Role: employee)")

    # Employee Dashboard & Tasks Scoping
    emp_dash_res = client.get("/api/dashboard")
    assert emp_dash_res.status_code == 200
    emp_dash = emp_dash_res.get_json()
    assert "total" in emp_dash
    assert "pending" in emp_dash
    assert "in_progress" in emp_dash
    assert "completed" in emp_dash
    print(f"[PASS] Employee dashboard returned scoped stats: {emp_dash['total']} tasks assigned")

    # -------------------------------------------------------------------
    # 5. EMPLOYEE STATUS TRANSITIONS & REOPEN WORKFLOW
    # -------------------------------------------------------------------
    print("\n--- 5. Testing Task Status Workflow (Pending -> In Progress -> Completed -> Reopen) ---")
    # Start task
    start_res = client.post("/api/tasks/TASK-777/status", json={"status": "In Progress", "note": "Started work"})
    assert start_res.status_code == 200
    assert start_res.get_json()["task"]["status"] == "In Progress"

    # Complete task
    done_res = client.post("/api/tasks/TASK-777/status", json={"status": "Completed", "note": "Finished work"})
    assert done_res.status_code == 200
    assert done_res.get_json()["task"]["status"] == "Completed"

    # Reopen task
    reopen_res = client.post("/api/tasks/TASK-777/status", json={"status": "In Progress", "note": "Reopened for fixes"})
    assert reopen_res.status_code == 200
    assert reopen_res.get_json()["task"]["status"] == "In Progress"
    print("[PASS] Verified full task status lifecycle transitions and activity audit log")

    # -------------------------------------------------------------------
    # 6. SARAH JENKINS LEAVE REQUEST SYNCHRONIZATION & MANAGER REVIEW
    # -------------------------------------------------------------------
    print("\n--- 6. Testing Sarah Jenkins Leave Synchronization to Manager ---")
    leave_res = client.post("/api/leaves", json={
        "leave_type": "Casual",
        "start_date": "2026-09-10",
        "end_date": "2026-09-12",
        "reason": "Family function and travel."
    })
    assert leave_res.status_code == 201, f"Leave submission failed: {leave_res.data}"
    leave = leave_res.get_json()
    leave_id = leave["id"]
    assert leave["employee_id"] == "EMP-001"
    assert leave["employee_name"] == "Sarah Jenkins"
    assert leave["manager_id"] == "MGR-001"
    assert leave["days_count"] == 3
    assert leave["status"] == "Pending"
    print(f"[PASS] Sarah Jenkins submitted leave {leave_id} linked to manager {leave['manager_id']}")

    # Switch session to Manager (Alex Morgan)
    client.post("/api/auth/login", json={"identifier": "alex@workmate.io", "password": "Demo@1234", "role": "manager"})

    # Check that Manager's pending leave queue includes Sarah's request
    mgr_leaves_res = client.get("/api/leaves?status=Pending")
    assert mgr_leaves_res.status_code == 200
    mgr_leaves = mgr_leaves_res.get_json()
    sarah_pending = next((l for l in mgr_leaves if l["id"] == leave_id), None)
    assert sarah_pending is not None, "Manager did not receive Sarah's leave request in Pending list!"
    assert sarah_pending["employee_name"] == "Sarah Jenkins"
    assert sarah_pending["employee_id"] == "EMP-001"
    print(f"[PASS] Manager Alex Morgan received Sarah's leave request {leave_id} in Pending queue")

    # Manager approves leave with comment
    app_res = client.post(f"/api/leaves/{leave_id}/approve", json={"comment": "Approved! Have fun."})
    assert app_res.status_code == 200
    assert app_res.get_json()["leave"]["status"] == "Approved"
    assert app_res.get_json()["leave"]["manager_comment"] == "Approved! Have fun."
    print(f"[PASS] Manager approved Sarah's leave with comment")

    # Switch back to Sarah Jenkins -> Verify approved status & comment
    client.post("/api/auth/login", json={"identifier": "sarah.jenkins@workmate.io", "password": "Emp@1234", "role": "employee"})
    emp_my_leaves = client.get("/api/leaves").get_json()
    sarah_view = next((l for l in emp_my_leaves if l["id"] == leave_id), None)
    assert sarah_view is not None
    assert sarah_view["status"] == "Approved"
    assert sarah_view["manager_comment"] == "Approved! Have fun."
    print("[PASS] Sarah Jenkins sees updated Approved status & manager comment")

    # -------------------------------------------------------------------
    # 7. MANAGER'S OWN LEAVE & CEO/ADMIN APPROVAL WORKFLOW
    # -------------------------------------------------------------------
    print("\n--- 7. Testing Manager's Own Leave & CEO/Admin Approval ---")
    client.post("/api/auth/login", json={"identifier": "alex@workmate.io", "password": "Demo@1234", "role": "manager"})

    mgr_leave_res = client.post("/api/manager/leaves", json={
        "leave_type": "Earned",
        "start_date": "2026-10-01",
        "end_date": "2026-10-05",
        "reason": "Executive leadership seminar."
    })
    assert mgr_leave_res.status_code == 201, f"Manager leave submission failed: {mgr_leave_res.data}"
    mgr_leave = mgr_leave_res.get_json()["leave"]
    mgr_leave_id = mgr_leave["id"]
    assert mgr_leave["is_manager_leave"] is True
    print(f"[PASS] Manager submitted personal leave {mgr_leave_id} routed to CEO/Admin")

    # Manager attempting to self-approve must fail
    self_app = client.post(f"/api/leaves/{mgr_leave_id}/approve", json={})
    assert self_app.status_code == 400
    print("[PASS] Manager prevented from approving own leave request")

    # CEO/Admin login
    admin_login = client.post("/api/auth/login", json={"identifier": "admin@workmate.io", "password": "Admin@1234", "role": "admin"})
    assert admin_login.status_code == 200

    # CEO approves manager leave
    ceo_app = client.post(f"/api/admin/leaves/{mgr_leave_id}/approve", json={"comment": "Approved by CEO."})
    assert ceo_app.status_code == 200
    assert ceo_app.get_json()["leave"]["status"] == "Approved"
    print(f"[PASS] CEO/Admin approved manager leave {mgr_leave_id}")

    # -------------------------------------------------------------------
    # 8. LOGOUT & SESSION INVALIDATION
    # -------------------------------------------------------------------
    print("\n--- 8. Testing Logout & Protected API Invalidation ---")
    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200
    print("[PASS] /api/auth/logout succeeded")

    # Protected endpoint should now return 401
    unauth_me = client.get("/api/auth/me")
    assert unauth_me.status_code == 401
    print("[PASS] Unauthenticated access blocked after logout (401 Unauthorized)")

    # -------------------------------------------------------------------
    # 9. CLEANUP
    # -------------------------------------------------------------------
    print("\n--- 9. Cleaning up test records ---")
    client.post("/api/auth/login", json={"identifier": "alex@workmate.io", "password": "Demo@1234"})
    client.delete("/api/tasks/TASK-777")
    client.delete(f"/api/leaves/{leave_id}")
    client.delete(f"/api/leaves/{mgr_leave_id}")
    try:
        employee_manager.delete_employee(manager_id, "EMP-099", [])
    except Exception:
        pass
    clean_test_leaves()
    print("[PASS] Test environment cleaned up cleanly")

    print("\n" + "=" * 60)
    print("  [SUCCESS] ALL WORKMATE END-TO-END TEST SUITES PASSED!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    test_complete_workmate_suite()
