"""
leave_manager.py — WorkMate Leave Management & Approval System
Handles creating, querying, approving, rejecting, and tracking employee leave requests.
Supports both Manager (review/decision) and Employee (submission/history) workflows.
Leave data is stored in leaves.json.
"""

import os
import json
from datetime import datetime, date


LEAVES_FILE = "leaves.json"
VALID_LEAVE_TYPES = ["Casual", "Sick", "Earned", "Other"]
VALID_LEAVE_STATUSES = ["Pending", "Approved", "Rejected"]


class LeaveManagerException(Exception):
    """Custom exception for leave manager validation and runtime errors."""
    pass


class LeaveManager:
    def __init__(self, filepath: str = LEAVES_FILE):
        self.filepath = filepath
        if not os.path.exists(self.filepath):
            self._save_leaves([])

    # -----------------------------------------------------------------------
    # File I/O
    # -----------------------------------------------------------------------

    def _load_leaves(self) -> list:
        """Loads all leaves from the JSON file."""
        if not os.path.exists(self.filepath):
            return []
        try:
            with open(self.filepath, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return []
                return json.loads(content)
        except json.JSONDecodeError as e:
            raise LeaveManagerException(f"Leaves data file is corrupted: {e}")
        except IOError as e:
            raise LeaveManagerException(f"Failed to read leaves file: {e}")

    def _save_leaves(self, leaves: list) -> None:
        """Saves the full leave list to the JSON file."""
        try:
            with open(self.filepath, "w", encoding="utf-8") as f:
                json.dump(leaves, f, indent=2, ensure_ascii=False)
        except IOError as e:
            raise LeaveManagerException(f"Failed to write leaves file: {e}")

    # -----------------------------------------------------------------------
    # Validation & Helpers
    # -----------------------------------------------------------------------

    @staticmethod
    def calculate_days(start_date_str: str, end_date_str: str) -> int:
        """
        Calculates the number of days inclusive between start_date and end_date (YYYY-MM-DD).
        Minimum 1 day if start_date == end_date.
        """
        try:
            d_start = datetime.strptime(start_date_str.strip(), "%Y-%m-%d").date()
        except ValueError:
            raise LeaveManagerException("Invalid Start Date format. Use YYYY-MM-DD.")

        try:
            d_end = datetime.strptime(end_date_str.strip(), "%Y-%m-%d").date()
        except ValueError:
            raise LeaveManagerException("Invalid End Date format. Use YYYY-MM-DD.")

        if d_end < d_start:
            raise LeaveManagerException("End Date cannot be before Start Date.")

        return (d_end - d_start).days + 1

    def _validate_leave_data(self, data: dict, is_new: bool = True) -> dict:
        """Validates and sanitises leave request fields. Returns cleaned dict."""
        cleaned = dict(data)

        if is_new:
            required = ["employee_id", "leave_type", "start_date", "end_date", "reason"]
            for field in required:
                if field not in cleaned or not str(cleaned[field]).strip():
                    field_name = field.replace("_", " ").title()
                    raise LeaveManagerException(f"'{field_name}' is required.")

        # Employee ID
        if "employee_id" in cleaned:
            emp_id = str(cleaned["employee_id"]).strip().upper()
            if not emp_id:
                raise LeaveManagerException("Employee is required.")
            cleaned["employee_id"] = emp_id

        # Employee Name
        if "employee_name" in cleaned:
            cleaned["employee_name"] = str(cleaned["employee_name"]).strip()
        elif "employee" in cleaned:
            cleaned["employee_name"] = str(cleaned["employee"]).strip()

        # Department
        if "department" in cleaned:
            cleaned["department"] = str(cleaned["department"]).strip()

        # Leave Type
        if "leave_type" in cleaned:
            l_type = str(cleaned["leave_type"]).strip().title()
            if l_type not in VALID_LEAVE_TYPES:
                raise LeaveManagerException(f"Leave type must be one of: {', '.join(VALID_LEAVE_TYPES)}.")
            cleaned["leave_type"] = l_type

        # Dates & Days calculation
        if "start_date" in cleaned and "end_date" in cleaned:
            s_date = str(cleaned["start_date"]).strip()
            e_date = str(cleaned["end_date"]).strip()
            days = self.calculate_days(s_date, e_date)
            cleaned["start_date"] = s_date
            cleaned["end_date"] = e_date
            cleaned["days_count"] = days

        # Reason
        if "reason" in cleaned:
            reason = str(cleaned["reason"]).strip()
            if not reason and is_new:
                raise LeaveManagerException("Reason for leave is required.")
            cleaned["reason"] = reason

        # Status
        if "status" in cleaned:
            status = str(cleaned["status"]).strip().title()
            if status not in VALID_LEAVE_STATUSES:
                raise LeaveManagerException(f"Status must be one of: {', '.join(VALID_LEAVE_STATUSES)}.")
            cleaned["status"] = status
        elif is_new:
            cleaned["status"] = "Pending"

        return cleaned

    def _generate_leave_id(self, leaves: list, manager_id: str) -> str:
        """Generates sequential LEV-XXX ID."""
        nums = []
        for l in leaves:
            lid = l.get("id", "")
            if lid.startswith("LEV-"):
                try:
                    nums.append(int(lid[4:]))
                except ValueError:
                    pass
        next_num = max(nums, default=100) + 1
        return f"LEV-{next_num:03d}"

    def _check_overlap(self, leaves: list, employee_id: str, start_date: str, end_date: str, exclude_id: str = None) -> None:
        """Checks if employee has an active (Pending or Approved) leave overlapping requested dates."""
        emp_id = employee_id.strip().upper()
        for l in leaves:
            if l.get("employee_id", "").upper() != emp_id:
                continue
            if exclude_id and l.get("id", "").upper() == exclude_id.strip().upper():
                continue
            if l.get("status") in ("Pending", "Approved"):
                l_start = l.get("start_date", "")
                l_end = l.get("end_date", "")
                # Check date overlap
                if not (end_date < l_start or start_date > l_end):
                    raise LeaveManagerException(
                        f"You already have a {l.get('status')} leave request ({l.get('id')}) from {l_start} to {l_end} covering these dates."
                    )

    # -----------------------------------------------------------------------
    # CRUD & Workflow Actions
    # -----------------------------------------------------------------------

    def add_leave_request(self, manager_id: str, data: dict) -> dict:
        """Adds a new leave request. Returns the created leave record."""
        leaves = self._load_leaves()
        cleaned = self._validate_leave_data(data, is_new=True)

        # Check date overlap for this employee
        self._check_overlap(leaves, cleaned["employee_id"], cleaned["start_date"], cleaned["end_date"])

        # ID assignment
        if "id" in cleaned and str(cleaned["id"]).strip():
            leave_id = str(cleaned["id"]).strip().upper()
            for l in leaves:
                if l.get("manager_id") == manager_id and l.get("id", "").upper() == leave_id:
                    raise LeaveManagerException(f"Leave ID '{leave_id}' already exists.")
            cleaned["id"] = leave_id
        else:
            cleaned["id"] = self._generate_leave_id(leaves, manager_id)

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cleaned["manager_id"] = manager_id
        cleaned["created_at"] = now_str
        cleaned["updated_at"] = now_str
        cleaned["rejection_reason"] = ""
        cleaned["manager_comment"] = ""

        leaves.append(cleaned)
        self._save_leaves(leaves)
        return cleaned

    def get_leave(self, manager_id: str, leave_id: str) -> dict | None:
        """Returns a single leave record by ID or None."""
        leaves = self._load_leaves()
        for l in leaves:
            if l.get("manager_id") == manager_id and l.get("id", "").upper() == leave_id.strip().upper():
                return l
        return None

    def get_leaves(
        self,
        manager_id: str,
        search_query: str = None,
        leave_type: str = None,
        status: str = None,
        employee_id: str = None,
        start_date: str = None,
        end_date: str = None,
    ) -> list:
        """
        Returns all leaves for a manager with filters.
        """
        leaves = self._load_leaves()
        results = []

        for l in leaves:
            if l.get("manager_id") != manager_id:
                continue

            if search_query:
                sq = search_query.strip().lower()
                emp_name = str(l.get("employee_name", "")).lower()
                emp_id = str(l.get("employee_id", "")).lower()
                lid = str(l.get("id", "")).lower()
                reason = str(l.get("reason", "")).lower()
                ltype = str(l.get("leave_type", "")).lower()
                if not (sq in emp_name or sq in emp_id or sq in lid or sq in reason or sq in ltype):
                    continue

            if leave_type and leave_type.strip():
                if l.get("leave_type", "").lower() != leave_type.strip().lower():
                    continue

            if status and status.strip():
                if l.get("status", "").lower() != status.strip().lower():
                    continue

            if employee_id and employee_id.strip():
                if l.get("employee_id", "").upper() != employee_id.strip().upper():
                    continue

            if start_date and start_date.strip():
                if l.get("end_date", "") < start_date.strip():
                    continue
            if end_date and end_date.strip():
                if l.get("start_date", "") > end_date.strip():
                    continue

            results.append(l)

        results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return results

    def get_leaves_for_employee(
        self,
        employee_id: str,
        search_query: str = None,
        leave_type: str = None,
        status: str = None,
        start_date: str = None,
        end_date: str = None,
    ) -> list:
        """
        Returns leaves requested by a specific employee.
        """
        leaves = self._load_leaves()
        emp_id = employee_id.strip().upper()
        results = []

        for l in leaves:
            if l.get("employee_id", "").upper() != emp_id:
                continue

            if search_query:
                sq = search_query.strip().lower()
                lid = str(l.get("id", "")).lower()
                reason = str(l.get("reason", "")).lower()
                ltype = str(l.get("leave_type", "")).lower()
                if not (sq in lid or sq in reason or sq in ltype):
                    continue

            if leave_type and leave_type.strip():
                if l.get("leave_type", "").lower() != leave_type.strip().lower():
                    continue

            if status and status.strip():
                if l.get("status", "").lower() != status.strip().lower():
                    continue

            if start_date and start_date.strip():
                if l.get("end_date", "") < start_date.strip():
                    continue
            if end_date and end_date.strip():
                if l.get("start_date", "") > end_date.strip():
                    continue

            results.append(l)

        results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return results

    def approve_leave(self, manager_id: str, leave_id: str, comment: str = "") -> dict:
        """Approves a leave request. Manager only."""
        leaves = self._load_leaves()
        target_idx = -1
        for idx, l in enumerate(leaves):
            if l.get("manager_id") == manager_id and l.get("id", "").upper() == leave_id.strip().upper():
                target_idx = idx
                break

        if target_idx == -1:
            raise LeaveManagerException(f"Leave request '{leave_id}' not found.")

        leaves[target_idx]["status"] = "Approved"
        leaves[target_idx]["rejection_reason"] = ""
        if comment:
            leaves[target_idx]["manager_comment"] = comment.strip()
        leaves[target_idx]["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        self._save_leaves(leaves)
        return leaves[target_idx]

    def reject_leave(self, manager_id: str, leave_id: str, rejection_reason: str, comment: str = "") -> dict:
        """Rejects a leave request with a mandatory reason. Manager only."""
        if not rejection_reason or not rejection_reason.strip():
            raise LeaveManagerException("Rejection reason/comment is required when rejecting a leave request.")

        leaves = self._load_leaves()
        target_idx = -1
        for idx, l in enumerate(leaves):
            if l.get("manager_id") == manager_id and l.get("id", "").upper() == leave_id.strip().upper():
                target_idx = idx
                break

        if target_idx == -1:
            raise LeaveManagerException(f"Leave request '{leave_id}' not found.")

        leaves[target_idx]["status"] = "Rejected"
        leaves[target_idx]["rejection_reason"] = rejection_reason.strip()
        if comment:
            leaves[target_idx]["manager_comment"] = comment.strip()
        leaves[target_idx]["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        self._save_leaves(leaves)
        return leaves[target_idx]

    def delete_leave(self, manager_id: str, leave_id: str) -> dict:
        """Deletes a leave record by ID. Returns deleted record."""
        leaves = self._load_leaves()
        target_idx = -1
        for idx, l in enumerate(leaves):
            if l.get("manager_id") == manager_id and l.get("id", "").upper() == leave_id.strip().upper():
                target_idx = idx
                break

        if target_idx == -1:
            raise LeaveManagerException(f"Leave request '{leave_id}' not found.")

        deleted = leaves.pop(target_idx)
        self._save_leaves(leaves)
        return deleted

    # -----------------------------------------------------------------------
    # Metrics & Stats
    # -----------------------------------------------------------------------

    def get_leave_stats(self, manager_id: str) -> dict:
        """Summary metrics for Manager Dashboard and Leave page."""
        leaves = self._load_leaves()
        manager_leaves = [l for l in leaves if l.get("manager_id") == manager_id]

        total = len(manager_leaves)
        pending = sum(1 for l in manager_leaves if l.get("status") == "Pending")
        approved = sum(1 for l in manager_leaves if l.get("status") == "Approved")
        rejected = sum(1 for l in manager_leaves if l.get("status") == "Rejected")

        total_days_approved = sum(
            l.get("days_count", 0) for l in manager_leaves if l.get("status") == "Approved"
        )

        today_str = date.today().strftime("%Y-%m-%d")
        upcoming_approved = [
            l for l in manager_leaves
            if l.get("status") == "Approved" and l.get("end_date", "") >= today_str
        ]
        upcoming_approved.sort(key=lambda x: x.get("start_date", ""))

        type_breakdown = {t: 0 for t in VALID_LEAVE_TYPES}
        for l in manager_leaves:
            lt = l.get("leave_type", "Other")
            if lt in type_breakdown:
                type_breakdown[lt] += 1
            else:
                type_breakdown["Other"] = type_breakdown.get("Other", 0) + 1

        recent = sorted(manager_leaves, key=lambda x: x.get("created_at", ""), reverse=True)[:6]

        return {
            "total": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "total_leave_days_approved": total_days_approved,
            "upcoming_approved_leaves": upcoming_approved,
            "type_breakdown": type_breakdown,
            "recent_requests": recent,
        }

    def get_employee_leave_stats(self, employee_id: str) -> dict:
        """Personal leave metrics for Employee Dashboard."""
        leaves = self.get_leaves_for_employee(employee_id)
        total = len(leaves)
        pending = sum(1 for l in leaves if l.get("status") == "Pending")
        approved = sum(1 for l in leaves if l.get("status") == "Approved")
        rejected = sum(1 for l in leaves if l.get("status") == "Rejected")
        total_days_approved = sum(
            l.get("days_count", 0) for l in leaves if l.get("status") == "Approved"
        )
        today_str = date.today().strftime("%Y-%m-%d")
        upcoming_approved = [
            l for l in leaves
            if l.get("status") == "Approved" and l.get("end_date", "") >= today_str
        ]
        upcoming_approved.sort(key=lambda x: x.get("start_date", ""))

        return {
            "total": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "total_leave_days_approved": total_days_approved,
            "upcoming_approved_leaves": upcoming_approved,
            "recent_requests": leaves[:5],
        }

    # -----------------------------------------------------------------------
    # Seed Data
    # -----------------------------------------------------------------------

    def seed_if_empty(self, manager_id: str) -> None:
        """Seeds initial sample leave requests for the demo manager if none exist."""
        leaves = self._load_leaves()
        existing = [l for l in leaves if l.get("manager_id") == manager_id]
        if existing:
            return

        today = date.today()
        cur_year = today.year
        cur_month = today.month

        def make_date(day: int) -> str:
            return f"{cur_year:04d}-{cur_month:02d}-{day:02d}"

        sample_leaves = [
            {
                "id": "LEV-101",
                "manager_id": manager_id,
                "employee_id": "EMP-001",
                "employee_name": "Sarah Jenkins",
                "department": "Engineering",
                "leave_type": "Casual",
                "start_date": make_date(10),
                "end_date": make_date(12),
                "days_count": 3,
                "reason": "Attending sibling's graduation ceremony and family event.",
                "status": "Approved",
                "rejection_reason": "",
                "manager_comment": "Approved. Please sync with David before leaving.",
                "created_at": f"{make_date(2)} 09:15:00",
                "updated_at": f"{make_date(2)} 11:30:00",
            },
            {
                "id": "LEV-102",
                "manager_id": manager_id,
                "employee_id": "EMP-003",
                "employee_name": "Emily Chen",
                "department": "Design",
                "leave_type": "Sick",
                "start_date": make_date(15),
                "end_date": make_date(16),
                "days_count": 2,
                "reason": "Doctor appointment and post-procedure recovery.",
                "status": "Approved",
                "rejection_reason": "",
                "manager_comment": "Take care Emily!",
                "created_at": f"{make_date(5)} 08:30:00",
                "updated_at": f"{make_date(5)} 09:00:00",
            },
            {
                "id": "LEV-103",
                "manager_id": manager_id,
                "employee_id": "EMP-002",
                "employee_name": "David Miller",
                "department": "Backend",
                "leave_type": "Earned",
                "start_date": make_date(20),
                "end_date": make_date(24),
                "days_count": 5,
                "reason": "Annual family vacation and road trip.",
                "status": "Pending",
                "rejection_reason": "",
                "manager_comment": "",
                "created_at": f"{make_date(6)} 14:20:00",
                "updated_at": f"{make_date(6)} 14:20:00",
            },
            {
                "id": "LEV-104",
                "manager_id": manager_id,
                "employee_id": "EMP-004",
                "employee_name": "Raj Patel",
                "department": "DevOps",
                "leave_type": "Sick",
                "start_date": make_date(18),
                "end_date": make_date(18),
                "days_count": 1,
                "reason": "Dental surgery and rest.",
                "status": "Pending",
                "rejection_reason": "",
                "manager_comment": "",
                "created_at": f"{make_date(7)} 10:45:00",
                "updated_at": f"{make_date(7)} 10:45:00",
            },
            {
                "id": "LEV-105",
                "manager_id": manager_id,
                "employee_id": "EMP-005",
                "employee_name": "Lisa Wang",
                "department": "QA",
                "leave_type": "Other",
                "start_date": make_date(3),
                "end_date": make_date(5),
                "days_count": 3,
                "reason": "Apartment relocation and lease signing.",
                "status": "Rejected",
                "rejection_reason": "Sprint release deadline clashes on these dates. Please reschedule after release.",
                "manager_comment": "Discussed in 1:1 meeting.",
                "created_at": f"{make_date(1)} 11:00:00",
                "updated_at": f"{make_date(1)} 16:30:00",
            },
        ]

        leaves.extend(sample_leaves)
        self._save_leaves(leaves)
        print(f"[WorkMate] {len(sample_leaves)} sample leave requests seeded for manager {manager_id}.")
