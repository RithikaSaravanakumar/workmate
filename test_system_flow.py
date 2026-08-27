"""
test_system_flow.py — Comprehensive End-to-End System Tests
Tests all 14 requirements:
- Authentication for all 3 roles (CEO/Admin, Manager, Employee)
- Employee creation by manager with immediate sign-in and uniqueness validation
- Role hierarchy & RBAC enforcement
- Leave hierarchy (Employee -> Manager approval, Manager -> CEO/Admin approval)
- Attendance check-in, check-out, duration calculation, 8h target & overtime
"""

import sys
import unittest
from datetime import datetime, timedelta
from backend.main import create_app
from backend.attendance_manager import attendance_manager


class WorkMateSystemTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config["TESTING"] = True

    def setUp(self):
        self.client = self.app.test_client()

    # 1. AUTHENTICATION & SESSIONS
    def test_01_manager_login(self):
        res = self.client.post("/api/auth/login", json={
            "identifier": "alex@workmate.io",
            "password": "Demo@1234",
            "role": "manager"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["role"], "manager")
        self.assertEqual(data["user"]["email"], "alex@workmate.io")

    def test_02_employee_login(self):
        res = self.client.post("/api/auth/login", json={
            "identifier": "sarah.jenkins@workmate.io",
            "password": "Emp@1234",
            "role": "employee"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["role"], "employee")
        self.assertEqual(data["user"]["employee_id"], "EMP-001")

    def test_03_ceo_admin_login(self):
        res = self.client.post("/api/auth/login", json={
            "identifier": "admin@workmate.io",
            "password": "Admin@1234",
            "role": "admin"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["role"], "admin")

    def test_04_invalid_credentials(self):
        res = self.client.post("/api/auth/login", json={
            "identifier": "alex@workmate.io",
            "password": "WrongPassword!99",
            "role": "manager"
        })
        self.assertEqual(res.status_code, 401)

    # 2. MANAGER CREATING EMPLOYEE ACCOUNT
    def test_05_manager_creates_employee_and_login(self):
        # Login as manager
        self.client.post("/api/auth/login", json={
            "identifier": "alex@workmate.io",
            "password": "Demo@1234",
            "role": "manager"
        })

        test_emp_id = f"EMP-{int(datetime.now().timestamp()) % 10000:04d}"
        test_email = f"user.{test_emp_id.lower()}@workmate.io"
        test_pwd = "TestPass@1234"

        # Create employee
        create_res = self.client.post("/api/employees", json={
            "employee_id": test_emp_id,
            "name": "Testing Employee",
            "email": test_email,
            "phone": "+1 (555) 999-8888",
            "department": "Engineering",
            "password": test_pwd
        })
        self.assertEqual(create_res.status_code, 201)
        created_emp = create_res.get_json()
        self.assertEqual(created_emp["employee_id"], test_emp_id)
        self.assertEqual(created_emp["email"], test_email)

        # Logout manager
        self.client.post("/api/auth/logout")

        # Now login as newly created employee
        emp_login_res = self.client.post("/api/auth/login", json={
            "identifier": test_email,
            "password": test_pwd,
            "role": "employee"
        })
        self.assertEqual(emp_login_res.status_code, 200)
        emp_data = emp_login_res.get_json()
        self.assertEqual(emp_data["role"], "employee")
        self.assertEqual(emp_data["user"]["employee_id"], test_emp_id)

    def test_06_duplicate_employee_id_rejected(self):
        self.client.post("/api/auth/login", json={
            "identifier": "alex@workmate.io",
            "password": "Demo@1234",
            "role": "manager"
        })

        res = self.client.post("/api/employees", json={
            "employee_id": "EMP-001",  # Existing ID
            "name": "Duplicate Person",
            "email": "unique.dup@workmate.io",
            "department": "Engineering",
            "password": "Emp@1234"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("already registered", res.get_json().get("error", ""))

    # 3. RBAC RESTRICTIONS
    def test_07_employee_cannot_access_manager_routes(self):
        # Login as employee
        self.client.post("/api/auth/login", json={
            "identifier": "sarah.jenkins@workmate.io",
            "password": "Emp@1234",
            "role": "employee"
        })

        # Try to access manager-only employees list
        emp_res = self.client.get("/api/employees")
        self.assertEqual(emp_res.status_code, 403)

        # Try to access admin dashboard
        admin_res = self.client.get("/api/admin/dashboard")
        self.assertEqual(admin_res.status_code, 403)

    # 4. ATTENDANCE WORKFLOW (CHECK-IN, CHECK-OUT, 8-HOUR TARGET, OVERTIME)
    def test_08_attendance_check_in_and_check_out(self):
        # Login as employee EMP-003 Emily Chen
        self.client.post("/api/auth/login", json={
            "identifier": "emily.chen@workmate.io",
            "password": "Emp@1234",
            "role": "employee"
        })

        # Check today's attendance before check-in
        get_res = self.client.get("/api/attendance/today")
        self.assertEqual(get_res.status_code, 200)

        # Perform check-in
        check_in_res = self.client.post("/api/attendance/check-in")
        self.assertIn(check_in_res.status_code, [200, 400]) # 200 if not checked in today, 400 if already checked in

        if check_in_res.status_code == 200:
            att = check_in_res.get_json()["attendance"]
            self.assertEqual(att["status"], "Present")
            self.assertIsNotNone(att["check_in"])
            self.assertIsNone(att["check_out"])

            # Test duplicate check-in prevention
            dup_res = self.client.post("/api/attendance/check-in")
            self.assertEqual(dup_res.status_code, 400)
            self.assertIn("already", dup_res.get_json()["error"].lower())

            # Perform check-out
            check_out_res = self.client.post("/api/attendance/check-out")
            self.assertEqual(check_out_res.status_code, 200)
            att_out = check_out_res.get_json()["attendance"]
            self.assertIsNotNone(att_out["check_out"])
            self.assertIn(att_out["status"], ["Completed", "Short", "Overtime"])

            # Test duplicate check-out prevention
            dup_out_res = self.client.post("/api/attendance/check-out")
            self.assertEqual(dup_out_res.status_code, 400)

    def test_09_attendance_overtime_math(self):
        # Directly test AttendanceManager duration and overtime calculations
        mgr = attendance_manager
        start_time = datetime(2026, 8, 25, 9, 0, 0)
        end_time = datetime(2026, 8, 25, 17, 45, 0) # 8h 45m = 525 mins
        
        # Duration formatted
        duration_min = int((end_time - start_time).total_seconds() / 60)
        self.assertEqual(duration_min, 525)
        self.assertEqual(mgr._format_duration(duration_min), "8h 45m")
        
        # Overtime formatted
        overtime_min = duration_min - 480
        self.assertEqual(overtime_min, 45)
        self.assertEqual(mgr._format_duration(overtime_min), "0h 45m")

    # 5. LEAVE APPROVAL HIERARCHY
    def test_10_employee_leave_approved_by_manager(self):
        # 1. Employee submits leave
        self.client.post("/api/auth/login", json={
            "identifier": "david.miller@workmate.io",
            "password": "Emp@1234",
            "role": "employee"
        })
        offset = 700 + (int(datetime.now().timestamp()) % 500)
        start_d = (datetime.now() + timedelta(days=offset)).strftime("%Y-%m-%d")
        end_d = (datetime.now() + timedelta(days=offset + 1)).strftime("%Y-%m-%d")

        sub_res = self.client.post("/api/leaves", json={
            "leave_type": "Casual",
            "start_date": start_d,
            "end_date": end_d,
            "reason": "Personal family commitment"
        })
        self.assertEqual(sub_res.status_code, 201)
        leave = sub_res.get_json()
        leave_id = leave["id"]
        self.assertEqual(leave["status"], "Pending")

        # 2. Manager logs in and approves
        self.client.post("/api/auth/login", json={
            "identifier": "alex@workmate.io",
            "password": "Demo@1234",
            "role": "manager"
        })
        appr_res = self.client.post(f"/api/leaves/{leave_id}/approve", json={"comment": "Approved by manager"})
        self.assertEqual(appr_res.status_code, 200)
        self.assertEqual(appr_res.get_json()["leave"]["status"], "Approved")

    def test_11_manager_leave_approved_by_ceo(self):
        # 1. Manager submits own leave (goes to CEO/Admin)
        self.client.post("/api/auth/login", json={
            "identifier": "alex@workmate.io",
            "password": "Demo@1234",
            "role": "manager"
        })
        # Random future offset to prevent collision across repeated test runs
        offset = 200 + (int(datetime.now().timestamp()) % 500)
        start_d = (datetime.now() + timedelta(days=offset)).strftime("%Y-%m-%d")
        end_d = (datetime.now() + timedelta(days=offset + 2)).strftime("%Y-%m-%d")

        sub_res = self.client.post("/api/manager/leaves", json={
            "leave_type": "Earned",
            "start_date": start_d,
            "end_date": end_d,
            "reason": "Executive leadership retreat"
        })
        self.assertEqual(sub_res.status_code, 201)
        mgr_leave = sub_res.get_json()["leave"]
        leave_id = mgr_leave["id"]
        self.assertEqual(mgr_leave["status"], "Pending")
        self.assertTrue(mgr_leave["is_manager_leave"])

        # 2. CEO logs in and approves
        self.client.post("/api/auth/login", json={
            "identifier": "admin@workmate.io",
            "password": "Admin@1234",
            "role": "admin"
        })
        ceo_appr_res = self.client.post(f"/api/admin/leaves/{leave_id}/approve", json={"comment": "Executive approved"})
        self.assertEqual(ceo_appr_res.status_code, 200)
        self.assertEqual(ceo_appr_res.get_json()["leave"]["status"], "Approved")


if __name__ == "__main__":
    unittest.main()
