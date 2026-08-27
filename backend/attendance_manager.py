"""
backend/attendance_manager.py — WorkMate Attendance & 8-Hour Workday Management
Handles check-in, check-out, duration calculations, 8-hour target progress,
overtime calculation, and scoped attendance reporting for Employee, Manager, and CEO/Admin.
Stores records in attendance.json.
"""

import os
import json
from datetime import datetime, date, timedelta


ATTENDANCE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "attendance.json")
TARGET_WORKDAY_MINUTES = 480  # 8 hours


class AttendanceManager:
    def __init__(self, filename: str = ATTENDANCE_FILE):
        self.filename = filename

    def _load_attendance(self) -> list:
        if not os.path.exists(self.filename):
            return []
        try:
            with open(self.filename, "r", encoding="utf-8") as f:
                content = f.read().strip()
                return json.loads(content) if content else []
        except json.JSONDecodeError:
            return []

    def _save_attendance(self, records: list) -> None:
        with open(self.filename, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2, ensure_ascii=False)

    @staticmethod
    def _format_time(dt: datetime) -> str:
        return dt.strftime("%I:%M %p").lstrip("0")

    @staticmethod
    def _format_duration(minutes: int) -> str:
        hours = minutes // 60
        mins = minutes % 60
        return f"{hours}h {mins:02d}m"

    def check_in(self, employee_id: str, manager_id: str, employee_name: str, department: str = "General", check_in_dt: datetime = None) -> dict:
        records = self._load_attendance()
        now = check_in_dt or datetime.now()
        today_str = now.strftime("%Y-%m-%d")
        clean_emp_id = employee_id.strip().upper()

        # Check if already checked in today
        existing = next(
            (r for r in records if r.get("employee_id", "").upper() == clean_emp_id and r.get("date") == today_str),
            None
        )
        if existing:
            if existing.get("check_out"):
                raise ValueError("You have already completed your workday check-out for today.")
            raise ValueError(f"You have already checked in today at {existing.get('check_in')}.")

        record_id = f"ATT-{today_str.replace('-', '')}-{clean_emp_id}"
        new_record = {
            "id": record_id,
            "date": today_str,
            "date_display": now.strftime("%b %d, %Y"),
            "employee_id": clean_emp_id,
            "employee_name": employee_name.strip(),
            "manager_id": manager_id,
            "department": department,
            "check_in": self._format_time(now),
            "check_in_iso": now.isoformat(),
            "check_out": None,
            "check_out_iso": None,
            "total_duration_minutes": 0,
            "total_duration_formatted": "0h 00m",
            "target_hours": 8,
            "overtime_minutes": 0,
            "overtime_formatted": "00h 00m",
            "status": "Present",
            "created_at": now.strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": now.strftime("%Y-%m-%d %H:%M:%S"),
        }

        records.append(new_record)
        self._save_attendance(records)
        return new_record

    def check_out(self, employee_id: str, check_out_dt: datetime = None) -> dict:
        records = self._load_attendance()
        now = check_out_dt or datetime.now()
        today_str = now.strftime("%Y-%m-%d")
        clean_emp_id = employee_id.strip().upper()

        # Find today's active attendance or latest open check-in (newest first)
        target_idx = -1
        for idx in range(len(records) - 1, -1, -1):
            r = records[idx]
            if r.get("employee_id", "").upper() == clean_emp_id:
                if not r.get("check_out"):
                    target_idx = idx
                    break
                elif r.get("date") == today_str:
                    target_idx = idx
                    break

        if target_idx == -1:
            raise ValueError("No active check-in found for today. Please check in first.")

        record = records[target_idx]
        if record.get("check_out"):
            raise ValueError(f"You have already checked out for today at {record.get('check_out')}.")

        check_in_iso = record.get("check_in_iso")
        if not check_in_iso:
            raise ValueError("Corrupted attendance record: missing check-in timestamp.")

        try:
            in_dt = datetime.fromisoformat(check_in_iso)
        except Exception:
            in_dt = now

        duration_sec = max(0, int((now - in_dt).total_seconds()))
        duration_min = duration_sec // 60

        overtime_min = max(0, duration_min - TARGET_WORKDAY_MINUTES)
        overtime_formatted = self._format_duration(overtime_min)

        if overtime_min > 0:
            status = "Overtime"
        elif duration_min >= TARGET_WORKDAY_MINUTES - 15:  # within grace period of 8 hours
            status = "Completed"
        else:
            status = "Short"

        record["check_out"] = self._format_time(now)
        record["check_out_iso"] = now.isoformat()
        record["total_duration_minutes"] = duration_min
        record["total_duration_formatted"] = self._format_duration(duration_min)
        record["overtime_minutes"] = overtime_min
        record["overtime_formatted"] = overtime_formatted
        record["status"] = status
        record["updated_at"] = now.strftime("%Y-%m-%d %H:%M:%S")

        records[target_idx] = record
        self._save_attendance(records)
        return record

    def get_today_attendance_for_employee(self, employee_id: str) -> dict | None:
        records = self._load_attendance()
        today_str = datetime.now().strftime("%Y-%m-%d")
        clean_emp_id = employee_id.strip().upper()

        for r in reversed(records):
            if r.get("employee_id", "").upper() == clean_emp_id and (r.get("date") == today_str or (not r.get("check_out") and r.get("status") == "Present")):
                return r
        return None

    def get_attendance_history_for_employee(self, employee_id: str, limit: int = 50) -> list:
        records = self._load_attendance()
        clean_emp_id = employee_id.strip().upper()
        emp_records = [r for r in records if r.get("employee_id", "").upper() == clean_emp_id]
        emp_records.sort(key=lambda x: (x.get("date", ""), x.get("created_at", "")), reverse=True)
        return emp_records[:limit]

    def get_attendance_for_manager(self, manager_id: str, date_filter: str = "", search: str = "") -> list:
        records = self._load_attendance()
        filtered = [r for r in records if r.get("manager_id") == manager_id]

        if date_filter:
            filtered = [r for r in filtered if r.get("date") == date_filter]

        if search:
            q = search.strip().lower()
            filtered = [
                r for r in filtered
                if q in r.get("employee_name", "").lower()
                or q in r.get("employee_id", "").lower()
                or q in r.get("department", "").lower()
                or q in r.get("status", "").lower()
            ]

        filtered.sort(key=lambda x: (x.get("date", ""), x.get("created_at", "")), reverse=True)
        return filtered

    def get_all_attendance_for_admin(self, date_filter: str = "", search: str = "") -> list:
        records = self._load_attendance()
        filtered = list(records)

        if date_filter:
            filtered = [r for r in filtered if r.get("date") == date_filter]

        if search:
            q = search.strip().lower()
            filtered = [
                r for r in filtered
                if q in r.get("employee_name", "").lower()
                or q in r.get("employee_id", "").lower()
                or q in r.get("department", "").lower()
                or q in r.get("status", "").lower()
            ]

        filtered.sort(key=lambda x: (x.get("date", ""), x.get("created_at", "")), reverse=True)
        return filtered

    def get_manager_attendance_stats(self, manager_id: str, employees: list) -> dict:
        records = self._load_attendance()
        today_str = datetime.now().strftime("%Y-%m-%d")
        total_team = len(employees)

        team_emp_ids = {e["employee_id"].upper() for e in employees}
        today_team_records = [
            r for r in records
            if r.get("date") == today_str and r.get("employee_id", "").upper() in team_emp_ids
        ]

        checked_in = sum(1 for r in today_team_records if r.get("status") == "Present" and not r.get("check_out"))
        checked_out = sum(1 for r in today_team_records if r.get("check_out"))
        present_count = len(today_team_records)
        not_checked_in = max(0, total_team - present_count)

        total_minutes = sum(r.get("total_duration_minutes", 0) for r in today_team_records)
        # For active checked in users, include elapsed minutes so far today
        for r in today_team_records:
            if not r.get("check_out") and r.get("check_in_iso"):
                try:
                    in_dt = datetime.fromisoformat(r["check_in_iso"])
                    elapsed = max(0, int((datetime.now() - in_dt).total_seconds() / 60))
                    total_minutes += elapsed
                except Exception:
                    pass

        avg_hours_float = round((total_minutes / present_count / 60), 1) if present_count > 0 else 0.0
        avg_hours_formatted = self._format_duration(int(avg_hours_float * 60)) if present_count > 0 else "0h 00m"

        completed_8h = sum(
            1 for r in today_team_records
            if r.get("total_duration_minutes", 0) >= TARGET_WORKDAY_MINUTES
        )

        return {
            "total_team_members": total_team,
            "present_count": present_count,
            "checked_in_count": checked_in,
            "checked_out_count": checked_out,
            "not_checked_in_count": not_checked_in,
            "avg_team_hours_float": avg_hours_float,
            "avg_team_hours_formatted": avg_hours_formatted,
            "completed_8h_count": completed_8h,
            "today_records": today_team_records,
        }

    def get_admin_attendance_stats(self, all_employees: list) -> dict:
        records = self._load_attendance()
        today_str = datetime.now().strftime("%Y-%m-%d")
        total_workforce = len(all_employees)

        today_records = [r for r in records if r.get("date") == today_str]
        checked_in = sum(1 for r in today_records if r.get("status") == "Present" and not r.get("check_out"))
        checked_out = sum(1 for r in today_records if r.get("check_out"))
        present_count = len(today_records)
        not_checked_in = max(0, total_workforce - present_count)

        total_minutes = sum(r.get("total_duration_minutes", 0) for r in today_records)
        avg_hours_float = round((total_minutes / present_count / 60), 1) if present_count > 0 else 0.0
        completed_8h = sum(1 for r in today_records if r.get("total_duration_minutes", 0) >= TARGET_WORKDAY_MINUTES)
        overtime_count = sum(1 for r in today_records if r.get("overtime_minutes", 0) > 0)

        return {
            "total_workforce": total_workforce,
            "present_count": present_count,
            "checked_in_count": checked_in,
            "checked_out_count": checked_out,
            "not_checked_in_count": not_checked_in,
            "avg_hours_float": avg_hours_float,
            "completed_8h_count": completed_8h,
            "overtime_count": overtime_count,
            "attendance_rate": round((present_count / total_workforce * 100), 1) if total_workforce > 0 else 0.0,
        }

    def seed_if_empty(self, manager_id: str = "MGR-001") -> None:
        records = self._load_attendance()
        if records:
            return

        today = date.today()
        sample_records = [
            # EMP-001 Sarah Jenkins
            {
                "id": f"ATT-{(today - timedelta(days=1)).strftime('%Y%m%d')}-EMP001",
                "date": (today - timedelta(days=1)).strftime("%Y-%m-%d"),
                "date_display": (today - timedelta(days=1)).strftime("%b %d, %Y"),
                "employee_id": "EMP-001",
                "employee_name": "Sarah Jenkins",
                "manager_id": manager_id,
                "department": "Engineering",
                "check_in": "9:15 AM",
                "check_in_iso": f"{(today - timedelta(days=1)).strftime('%Y-%m-%d')}T09:15:00",
                "check_out": "5:15 PM",
                "check_out_iso": f"{(today - timedelta(days=1)).strftime('%Y-%m-%d')}T17:15:00",
                "total_duration_minutes": 480,
                "total_duration_formatted": "8h 00m",
                "target_hours": 8,
                "overtime_minutes": 0,
                "overtime_formatted": "00h 00m",
                "status": "Completed",
                "created_at": f"{(today - timedelta(days=1)).strftime('%Y-%m-%d')} 09:15:00",
                "updated_at": f"{(today - timedelta(days=1)).strftime('%Y-%m-%d')} 17:15:00",
            },
            {
                "id": f"ATT-{(today - timedelta(days=2)).strftime('%Y%m%d')}-EMP001",
                "date": (today - timedelta(days=2)).strftime("%Y-%m-%d"),
                "date_display": (today - timedelta(days=2)).strftime("%b %d, %Y"),
                "employee_id": "EMP-001",
                "employee_name": "Sarah Jenkins",
                "manager_id": manager_id,
                "department": "Engineering",
                "check_in": "9:05 AM",
                "check_in_iso": f"{(today - timedelta(days=2)).strftime('%Y-%m-%d')}T09:05:00",
                "check_out": "4:45 PM",
                "check_out_iso": f"{(today - timedelta(days=2)).strftime('%Y-%m-%d')}T16:45:00",
                "total_duration_minutes": 460,
                "total_duration_formatted": "7h 40m",
                "target_hours": 8,
                "overtime_minutes": 0,
                "overtime_formatted": "00h 00m",
                "status": "Short",
                "created_at": f"{(today - timedelta(days=2)).strftime('%Y-%m-%d')} 09:05:00",
                "updated_at": f"{(today - timedelta(days=2)).strftime('%Y-%m-%d')} 16:45:00",
            },
            {
                "id": f"ATT-{(today - timedelta(days=3)).strftime('%Y%m%d')}-EMP001",
                "date": (today - timedelta(days=3)).strftime("%Y-%m-%d"),
                "date_display": (today - timedelta(days=3)).strftime("%b %d, %Y"),
                "employee_id": "EMP-001",
                "employee_name": "Sarah Jenkins",
                "manager_id": manager_id,
                "department": "Engineering",
                "check_in": "9:20 AM",
                "check_in_iso": f"{(today - timedelta(days=3)).strftime('%Y-%m-%d')}T09:20:00",
                "check_out": "6:10 PM",
                "check_out_iso": f"{(today - timedelta(days=3)).strftime('%Y-%m-%d')}T18:10:00",
                "total_duration_minutes": 530,
                "total_duration_formatted": "8h 50m",
                "target_hours": 8,
                "overtime_minutes": 50,
                "overtime_formatted": "00h 50m",
                "status": "Overtime",
                "created_at": f"{(today - timedelta(days=3)).strftime('%Y-%m-%d')} 09:20:00",
                "updated_at": f"{(today - timedelta(days=3)).strftime('%Y-%m-%d')} 18:10:00",
            },
            # EMP-002 David Miller
            {
                "id": f"ATT-{(today - timedelta(days=1)).strftime('%Y%m%d')}-EMP002",
                "date": (today - timedelta(days=1)).strftime("%Y-%m-%d"),
                "date_display": (today - timedelta(days=1)).strftime("%b %d, %Y"),
                "employee_id": "EMP-002",
                "employee_name": "David Miller",
                "manager_id": manager_id,
                "department": "Backend",
                "check_in": "8:55 AM",
                "check_in_iso": f"{(today - timedelta(days=1)).strftime('%Y-%m-%d')}T08:55:00",
                "check_out": "5:30 PM",
                "check_out_iso": f"{(today - timedelta(days=1)).strftime('%Y-%m-%d')}T17:30:00",
                "total_duration_minutes": 515,
                "total_duration_formatted": "8h 35m",
                "target_hours": 8,
                "overtime_minutes": 35,
                "overtime_formatted": "00h 35m",
                "status": "Overtime",
                "created_at": f"{(today - timedelta(days=1)).strftime('%Y-%m-%d')} 08:55:00",
                "updated_at": f"{(today - timedelta(days=1)).strftime('%Y-%m-%d')} 17:30:00",
            },
        ]
        self._save_attendance(sample_records)


attendance_manager = AttendanceManager()
