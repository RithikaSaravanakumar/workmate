"""
backend/leave_manager.py — WorkMate Leave Management & Multi-Level Approvals
Handles leave requests, auto duration calculation, overlap conflict prevention,
manager approvals for employees, and CEO/Admin approvals for managers' own leaves.
Stores records in leaves.json.
"""

import os
import json
import re
from datetime import datetime, date


LEAVES_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "leaves.json")

VALID_LEAVE_TYPES = ["Casual", "Sick", "Earned", "Vacation", "Other"]
VALID_LEAVE_STATUSES = ["Pending", "Approved", "Rejected"]


class LeaveManager:
    def __init__(self, filename: str = LEAVES_FILE):
        self.filename = filename

    def _load_leaves(self) -> list:
        if not os.path.exists(self.filename):
            return []
        try:
            with open(self.filename, "r", encoding="utf-8") as f:
                content = f.read().strip()
                return json.loads(content) if content else []
        except json.JSONDecodeError:
            return []

    def _save_leaves(self, leaves: list) -> None:
        with open(self.filename, "w", encoding="utf-8") as f:
            json.dump(leaves, f, indent=2, ensure_ascii=False)

    @staticmethod
    def _parse_date(date_str: str) -> date:
        try:
            return datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
        except ValueError:
            raise ValueError(f"Invalid date format '{date_str}'. Expected YYYY-MM-DD.")

    @staticmethod
    def calculate_days(start_date: date, end_date: date) -> int:
        if end_date < start_date:
            raise ValueError("End date cannot precede start date.")
        return (end_date - start_date).days + 1

    def _has_overlap(self, employee_id: str, start_d: date, end_d: date, exclude_id: str = None) -> dict | None:
        leaves = self._load_leaves()
        for l in leaves:
            if exclude_id and l.get("id", "").upper() == exclude_id.upper():
                continue
            if l.get("employee_id", "").upper() == employee_id.upper():
                if l.get("status") in ["Approved", "Pending"]:
                    try:
                        ex_start = self._parse_date(l["start_date"])
                        ex_end = self._parse_date(l["end_date"])
                        if not (end_d < ex_start or start_d > ex_end):
                            return l
                    except Exception:
                        continue
        return None

    def get_leaves_for_manager(self, manager_id: str, search: str = "", leave_type: str = "", status: str = "", employee_id: str = "") -> list:
        leaves = self._load_leaves()
        filtered = [l for l in leaves if l.get("manager_id") == manager_id and not l.get("is_manager_leave")]

        if search:
            q = search.strip().lower()
            filtered = [
                l for l in filtered
                if q in l.get("id", "").lower()
                or q in l.get("employee_name", "").lower()
                or q in l.get("employee_id", "").lower()
                or q in l.get("reason", "").lower()
                or q in l.get("department", "").lower()
            ]
        if leave_type and leave_type in VALID_LEAVE_TYPES:
            filtered = [l for l in filtered if l.get("leave_type") == leave_type]
        if status and status in VALID_LEAVE_STATUSES:
            filtered = [l for l in filtered if l.get("status") == status]
        if employee_id:
            filtered = [l for l in filtered if l.get("employee_id") == employee_id]

        return sorted(filtered, key=lambda x: x.get("start_date", ""), reverse=True)

    def get_leaves_for_employee(self, employee_id: str, search: str = "", leave_type: str = "", status: str = "") -> list:
        leaves = self._load_leaves()
        filtered = [l for l in leaves if l.get("employee_id") == employee_id]

        if search:
            q = search.strip().lower()
            filtered = [
                l for l in filtered
                if q in l.get("id", "").lower()
                or q in l.get("reason", "").lower()
                or q in l.get("leave_type", "").lower()
            ]
        if leave_type and leave_type in VALID_LEAVE_TYPES:
            filtered = [l for l in filtered if l.get("leave_type") == leave_type]
        if status and status in VALID_LEAVE_STATUSES:
            filtered = [l for l in filtered if l.get("status") == status]

        return sorted(filtered, key=lambda x: x.get("start_date", ""), reverse=True)

    def get_manager_own_leaves(self, manager_id: str) -> list:
        """Returns leave requests submitted by the manager themselves (sent to CEO/Admin)."""
        leaves = self._load_leaves()
        return [l for l in leaves if l.get("manager_id") == manager_id and l.get("is_manager_leave")]

    def get_all_leaves(self) -> list:
        """Returns all leave records."""
        return self._load_leaves()

    def get_all_manager_leaves_for_admin(self) -> list:
        """Returns all managers' own leave requests for CEO/Admin review."""
        leaves = self._load_leaves()
        return [l for l in leaves if l.get("is_manager_leave")]

    def get_leave_by_id(self, leave_id: str) -> dict | None:
        leaves = self._load_leaves()
        for l in leaves:
            if l.get("id", "").upper() == leave_id.strip().upper():
                return l
        return None

    def add_leave_request(self, manager_id: str, data: dict, is_manager_leave: bool = False) -> dict:
        leaves = self._load_leaves()
        required = ["leave_type", "start_date", "end_date", "reason"]
        for field in required:
            if not str(data.get(field, "")).strip():
                raise ValueError(f"'{field.replace('_', ' ').title()}' is required.")

        emp_id = str(data.get("employee_id", "")).strip().upper()
        emp_name = str(data.get("employee_name", "")).strip()
        dept = str(data.get("department", "")).strip()
        leave_type = str(data["leave_type"]).strip()
        start_str = str(data["start_date"]).strip()
        end_str = str(data["end_date"]).strip()
        reason = str(data["reason"]).strip()

        if not is_manager_leave and not emp_id:
            raise ValueError("Employee ID is required.")

        if leave_type not in VALID_LEAVE_TYPES:
            raise ValueError(f"Leave type must be one of: {', '.join(VALID_LEAVE_TYPES)}.")

        start_d = self._parse_date(start_str)
        end_d = self._parse_date(end_str)
        days_count = self.calculate_days(start_d, end_d)

        if len(reason) < 3:
            raise ValueError("Reason must be at least 3 characters.")

        overlap = self._has_overlap(emp_id or manager_id, start_d, end_d)
        if overlap:
            raise ValueError(
                f"You already have a {overlap['status']} leave request ({overlap['id']}) "
                f"from {overlap['start_date']} to {overlap['end_date']} covering these dates."
            )

        existing_ids = [l.get("id", "") for l in leaves if l.get("id", "").startswith("LEV-")]
        nums = [int(re.sub(r"\D", "", lid)) for lid in existing_ids if re.sub(r"\D", "", lid).isdigit()]
        next_num = max(nums, default=100) + 1
        leave_id = f"LEV-{next_num}"

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        new_leave = {
            "id": leave_id,
            "manager_id": manager_id,
            "employee_id": emp_id or manager_id,
            "employee_name": emp_name or "Manager",
            "department": dept or "Management",
            "leave_type": leave_type,
            "start_date": start_str,
            "end_date": end_str,
            "days_count": days_count,
            "reason": reason,
            "status": "Pending",
            "rejection_reason": "",
            "manager_comment": "",
            "is_manager_leave": is_manager_leave,
            "created_at": now_str,
            "updated_at": now_str,
        }

        leaves.append(new_leave)
        self._save_leaves(leaves)
        return new_leave

    def approve_leave(self, manager_id: str, leave_id: str, comment: str = "") -> dict:
        leaves = self._load_leaves()
        target_idx = -1
        for idx, l in enumerate(leaves):
            if l.get("manager_id") == manager_id and l.get("id", "").upper() == leave_id.strip().upper():
                target_idx = idx
                break

        if target_idx == -1:
            raise ValueError(f"Leave request '{leave_id}' not found.")

        leave = leaves[target_idx]
        if leave.get("is_manager_leave"):
            raise ValueError("Manager's own leave requests must be approved by CEO/Admin.")

        leave["status"] = "Approved"
        leave["manager_comment"] = comment.strip() or "Approved by manager."
        leave["rejection_reason"] = ""
        leave["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        leaves[target_idx] = leave
        self._save_leaves(leaves)
        return leave

    def reject_leave(self, manager_id: str, leave_id: str, rejection_reason: str) -> dict:
        if not rejection_reason or len(rejection_reason.strip()) < 3:
            raise ValueError("Rejection reason is required (at least 3 characters).")

        leaves = self._load_leaves()
        target_idx = -1
        for idx, l in enumerate(leaves):
            if l.get("manager_id") == manager_id and l.get("id", "").upper() == leave_id.strip().upper():
                target_idx = idx
                break

        if target_idx == -1:
            raise ValueError(f"Leave request '{leave_id}' not found.")

        leave = leaves[target_idx]
        if leave.get("is_manager_leave"):
            raise ValueError("Manager's own leave requests must be reviewed by CEO/Admin.")

        leave["status"] = "Rejected"
        leave["rejection_reason"] = rejection_reason.strip()
        leave["manager_comment"] = f"Rejected: {rejection_reason.strip()}"
        leave["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        leaves[target_idx] = leave
        self._save_leaves(leaves)
        return leave

    def ceo_approve_manager_leave(self, leave_id: str, comment: str = "") -> dict:
        """Allows CEO/Admin to approve a Manager's own leave request."""
        leaves = self._load_leaves()
        target_idx = -1
        for idx, l in enumerate(leaves):
            if l.get("id", "").upper() == leave_id.strip().upper() and l.get("is_manager_leave"):
                target_idx = idx
                break

        if target_idx == -1:
            raise ValueError(f"Manager leave request '{leave_id}' not found.")

        leave = leaves[target_idx]
        leave["status"] = "Approved"
        leave["manager_comment"] = comment.strip() or "Approved by CEO/Admin."
        leave["rejection_reason"] = ""
        leave["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        leaves[target_idx] = leave
        self._save_leaves(leaves)
        return leave

    def ceo_reject_manager_leave(self, leave_id: str, reason: str) -> dict:
        """Allows CEO/Admin to reject a Manager's own leave request."""
        if not reason or len(reason.strip()) < 3:
            raise ValueError("Rejection reason is required.")

        leaves = self._load_leaves()
        target_idx = -1
        for idx, l in enumerate(leaves):
            if l.get("id", "").upper() == leave_id.strip().upper() and l.get("is_manager_leave"):
                target_idx = idx
                break

        if target_idx == -1:
            raise ValueError(f"Manager leave request '{leave_id}' not found.")

        leave = leaves[target_idx]
        leave["status"] = "Rejected"
        leave["rejection_reason"] = reason.strip()
        leave["manager_comment"] = f"Rejected by CEO/Admin: {reason.strip()}"
        leave["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        leaves[target_idx] = leave
        self._save_leaves(leaves)
        return leave

    def delete_leave(self, manager_id: str, leave_id: str, is_employee: bool = False, employee_id: str = "") -> dict:
        leaves = self._load_leaves()
        target_idx = -1
        for idx, l in enumerate(leaves):
            if l.get("id", "").upper() == leave_id.strip().upper():
                if is_employee:
                    if l.get("employee_id") == employee_id:
                        target_idx = idx
                        break
                elif l.get("manager_id") == manager_id:
                    target_idx = idx
                    break

        if target_idx == -1:
            raise ValueError(f"Leave record '{leave_id}' not found.")

        deleted = leaves.pop(target_idx)
        self._save_leaves(leaves)
        return deleted

    def get_manager_leave_stats(self, manager_id: str) -> dict:
        leaves = self.get_leaves_for_manager(manager_id)
        pending = sum(1 for l in leaves if l.get("status") == "Pending")
        approved = sum(1 for l in leaves if l.get("status") == "Approved")
        rejected = sum(1 for l in leaves if l.get("status") == "Rejected")
        total_days = sum(l.get("days_count", 0) for l in leaves if l.get("status") == "Approved")

        return {
            "total_requests": len(leaves),
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "total_leave_days_approved": total_days,
            "recent_requests": leaves[:5],
        }

    def get_employee_leave_stats(self, employee_id: str) -> dict:
        leaves = self.get_leaves_for_employee(employee_id)
        pending = sum(1 for l in leaves if l.get("status") == "Pending")
        approved = sum(1 for l in leaves if l.get("status") == "Approved")
        rejected = sum(1 for l in leaves if l.get("status") == "Rejected")
        total_days = sum(l.get("days_count", 0) for l in leaves if l.get("status") == "Approved")

        return {
            "total_requests": len(leaves),
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "total_leave_days_approved": total_days,
            "recent_requests": leaves[:5],
        }


leave_manager = LeaveManager()
