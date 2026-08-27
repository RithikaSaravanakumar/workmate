"""
backend/task_manager.py — WorkMate Task Store & Audit Trail
Handles task CRUD, employee status transitions (Pending -> In Progress -> Completed),
task reopening, and chronological audit log tracking.
Stores records in tasks.json.
"""

import os
import json
import re
from datetime import datetime


TASKS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tasks.json")

VALID_PRIORITIES = ["Low", "Medium", "High"]
VALID_STATUSES = ["Pending", "In Progress", "Completed"]


class TaskManager:
    def __init__(self, filename: str = TASKS_FILE):
        self.filename = filename

    def _load_tasks(self) -> list:
        if not os.path.exists(self.filename):
            return []
        try:
            with open(self.filename, "r", encoding="utf-8") as f:
                content = f.read().strip()
                return json.loads(content) if content else []
        except json.JSONDecodeError:
            return []

    def _save_tasks(self, tasks: list) -> None:
        with open(self.filename, "w", encoding="utf-8") as f:
            json.dump(tasks, f, indent=2, ensure_ascii=False)

    def get_tasks_for_manager(self, manager_id: str, search: str = "", status: str = "", priority: str = "", employee_id: str = "") -> list:
        tasks = self._load_tasks()
        filtered = [t for t in tasks if t.get("manager_id") == manager_id]

        if search:
            q = search.strip().lower()
            filtered = [
                t for t in filtered
                if q in t.get("id", "").lower()
                or q in t.get("title", "").lower()
                or q in t.get("employee", "").lower()
                or q in t.get("description", "").lower()
            ]
        if status and status in VALID_STATUSES:
            filtered = [t for t in filtered if t.get("status") == status]
        if priority and priority in VALID_PRIORITIES:
            filtered = [t for t in filtered if t.get("priority") == priority]
        if employee_id:
            filtered = [t for t in filtered if t.get("employee_id") == employee_id]

        return filtered

    def get_tasks_for_employee(self, employee_id: str, search: str = "", status: str = "", priority: str = "") -> list:
        tasks = self._load_tasks()
        filtered = [t for t in tasks if t.get("employee_id") == employee_id]

        if search:
            q = search.strip().lower()
            filtered = [
                t for t in filtered
                if q in t.get("id", "").lower()
                or q in t.get("title", "").lower()
                or q in t.get("description", "").lower()
            ]
        if status and status in VALID_STATUSES:
            filtered = [t for t in filtered if t.get("status") == status]
        if priority and priority in VALID_PRIORITIES:
            filtered = [t for t in filtered if t.get("priority") == priority]

        return filtered

    def get_task_by_id(self, manager_id: str, task_id: str) -> dict | None:
        tasks = self._load_tasks()
        for t in tasks:
            if t.get("manager_id") == manager_id and t.get("id", "").upper() == task_id.strip().upper():
                return t
        return None

    def get_task_for_employee(self, employee_id: str, task_id: str) -> dict | None:
        tasks = self._load_tasks()
        for t in tasks:
            if t.get("employee_id") == employee_id and t.get("id", "").upper() == task_id.strip().upper():
                return t
        return None

    def add_task(self, manager_id: str, data: dict, employees: list) -> dict:
        tasks = self._load_tasks()
        required = ["id", "title", "employee_id", "priority", "status"]
        for field in required:
            if not str(data.get(field, "")).strip():
                raise ValueError(f"'{field.replace('_', ' ').title()}' is required.")

        task_id = str(data["id"]).strip().upper()
        title = str(data["title"]).strip()
        description = str(data.get("description", "")).strip()
        emp_id = str(data["employee_id"]).strip()
        priority = str(data["priority"]).strip()
        status = str(data["status"]).strip()

        if not re.match(r"^[A-Z0-9\-]{2,20}$", task_id):
            raise ValueError("Task ID must be 2–20 alphanumeric characters (dashes allowed), e.g. TASK-101.")

        if len(title) < 2:
            raise ValueError("Task title must be at least 2 characters.")

        if priority not in VALID_PRIORITIES:
            raise ValueError(f"Priority must be one of: {', '.join(VALID_PRIORITIES)}.")

        if status not in VALID_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(VALID_STATUSES)}.")

        emp = next((e for e in employees if e["employee_id"] == emp_id), None)
        if not emp:
            raise ValueError(f"Employee '{emp_id}' is not in your team roster.")

        for t in tasks:
            if t.get("manager_id") == manager_id and t.get("id", "").upper() == task_id:
                raise ValueError(f"Task ID '{task_id}' already exists.")

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        due_date = str(data.get("due_date", "")).strip()

        initial_log = [{
            "timestamp": now_str,
            "action": "Created",
            "actor": "Manager",
            "previous_status": "",
            "new_status": status,
            "note": f"Task created and assigned to {emp['name']}."
        }]

        new_task = {
            "id": task_id,
            "manager_id": manager_id,
            "title": title,
            "description": description,
            "employee_id": emp_id,
            "employee": emp["name"],
            "priority": priority,
            "status": status,
            "due_date": due_date,
            "activity_log": initial_log,
            "created_at": now_str,
            "updated_at": now_str,
        }

        tasks.append(new_task)
        self._save_tasks(tasks)
        return new_task

    def update_task(self, manager_id: str, task_id: str, updates: dict, employees: list) -> dict:
        tasks = self._load_tasks()
        target_idx = -1
        for idx, t in enumerate(tasks):
            if t.get("manager_id") == manager_id and t.get("id", "").upper() == task_id.strip().upper():
                target_idx = idx
                break

        if target_idx == -1:
            raise ValueError(f"Task '{task_id}' not found.")

        task = tasks[target_idx]
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        old_status = task.get("status", "Pending")

        if "title" in updates:
            title = str(updates["title"]).strip()
            if len(title) < 2:
                raise ValueError("Task title must be at least 2 characters.")
            task["title"] = title

        if "description" in updates:
            task["description"] = str(updates["description"]).strip()

        if "due_date" in updates:
            task["due_date"] = str(updates["due_date"]).strip()

        if "employee_id" in updates:
            emp_id = str(updates["employee_id"]).strip()
            emp = next((e for e in employees if e["employee_id"] == emp_id), None)
            if not emp:
                raise ValueError(f"Employee '{emp_id}' not found in your team roster.")
            task["employee_id"] = emp_id
            task["employee"] = emp["name"]

        if "priority" in updates:
            priority = str(updates["priority"]).strip()
            if priority not in VALID_PRIORITIES:
                raise ValueError(f"Priority must be one of: {', '.join(VALID_PRIORITIES)}.")
            task["priority"] = priority

        if "status" in updates:
            status = str(updates["status"]).strip()
            if status not in VALID_STATUSES:
                raise ValueError(f"Status must be one of: {', '.join(VALID_STATUSES)}.")
            if status != old_status:
                log_entry = {
                    "timestamp": now_str,
                    "action": "Status Updated",
                    "actor": "Manager",
                    "previous_status": old_status,
                    "new_status": status,
                    "note": updates.get("note", "Updated by Manager.")
                }
                task.setdefault("activity_log", []).append(log_entry)
            task["status"] = status

        task["updated_at"] = now_str
        tasks[target_idx] = task
        self._save_tasks(tasks)
        return task

    def update_task_status_by_employee(self, employee_id: str, employee_name: str, task_id: str, new_status: str, note: str = "") -> dict:
        tasks = self._load_tasks()
        target_idx = -1
        for idx, t in enumerate(tasks):
            if t.get("employee_id") == employee_id and t.get("id", "").upper() == task_id.strip().upper():
                target_idx = idx
                break

        if target_idx == -1:
            raise ValueError(f"Task '{task_id}' not found or not assigned to you.")

        if new_status not in VALID_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(VALID_STATUSES)}.")

        task = tasks[target_idx]
        old_status = task.get("status", "Pending")
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        action_name = "Status Updated"
        if old_status == "Completed" and new_status in ["In Progress", "Pending"]:
            action_name = "Reopened"

        log_entry = {
            "timestamp": now_str,
            "action": action_name,
            "actor": employee_name or employee_id,
            "previous_status": old_status,
            "new_status": new_status,
            "note": note.strip() or ("Reopened task for further work" if action_name == "Reopened" else f"Moved to {new_status}")
        }

        task.setdefault("activity_log", []).append(log_entry)
        task["status"] = new_status
        task["updated_at"] = now_str

        tasks[target_idx] = task
        self._save_tasks(tasks)
        return task

    def delete_task(self, manager_id: str, task_id: str) -> dict:
        tasks = self._load_tasks()
        target_idx = -1
        for idx, t in enumerate(tasks):
            if t.get("manager_id") == manager_id and t.get("id", "").upper() == task_id.strip().upper():
                target_idx = idx
                break

        if target_idx == -1:
            raise ValueError(f"Task '{task_id}' not found.")

        deleted = tasks.pop(target_idx)
        self._save_tasks(tasks)
        return deleted

    def get_dashboard_stats(self, manager_id: str, employees: list) -> dict:
        tasks = self.get_tasks_for_manager(manager_id)
        total = len(tasks)
        pending = sum(1 for t in tasks if t.get("status") == "Pending")
        in_progress = sum(1 for t in tasks if t.get("status") == "In Progress")
        completed = sum(1 for t in tasks if t.get("status") == "Completed")
        high_priority = sum(1 for t in tasks if t.get("priority") == "High")

        emp_workload = []
        for emp in employees:
            emp_tasks = [t for t in tasks if t.get("employee_id") == emp["employee_id"]]
            emp_workload.append({
                "employee_id": emp["employee_id"],
                "name": emp["name"],
                "department": emp["department"],
                "total": len(emp_tasks),
                "in_progress": sum(1 for t in emp_tasks if t.get("status") == "In Progress"),
                "completed": sum(1 for t in emp_tasks if t.get("status") == "Completed"),
                "pending": sum(1 for t in emp_tasks if t.get("status") == "Pending"),
            })

        emp_workload.sort(key=lambda x: x["total"], reverse=True)
        recent = sorted(tasks, key=lambda x: x.get("created_at", ""), reverse=True)[:8]

        # Aggregate team activity feed across all tasks
        team_activity = []
        for t in tasks:
            for log in t.get("activity_log", []):
                team_activity.append({
                    "task_id": t.get("id"),
                    "task_title": t.get("title"),
                    "employee": t.get("employee"),
                    "action": log.get("action", "Updated"),
                    "actor": log.get("actor", "Team Member"),
                    "previous_status": log.get("previous_status", ""),
                    "new_status": log.get("new_status", ""),
                    "note": log.get("note", ""),
                    "timestamp": log.get("timestamp", t.get("created_at", "")),
                })

        team_activity.sort(key=lambda x: x["timestamp"], reverse=True)
        team_activity = team_activity[:10]

        # Upcoming deadlines: active tasks with due_date or soonest created
        active_tasks = [t for t in tasks if t.get("status") != "Completed"]
        upcoming_deadlines = sorted(
            active_tasks,
            key=lambda x: (x.get("due_date") == "", x.get("due_date", ""), x.get("created_at", ""))
        )[:6]

        return {
            "total": total,
            "pending": pending,
            "in_progress": in_progress,
            "completed": completed,
            "high_priority": high_priority,
            "employee_workload": emp_workload,
            "recent_tasks": recent,
            "upcoming_deadlines": upcoming_deadlines,
            "team_activity": team_activity,
            "all_tasks": tasks,
        }

    def get_employee_dashboard_stats(self, employee_id: str) -> dict:
        tasks = self.get_tasks_for_employee(employee_id)
        total = len(tasks)
        pending = sum(1 for t in tasks if t.get("status") == "Pending")
        in_progress = sum(1 for t in tasks if t.get("status") == "In Progress")
        completed = sum(1 for t in tasks if t.get("status") == "Completed")
        high_priority = sum(1 for t in tasks if t.get("priority") == "High")
        active = [t for t in tasks if t.get("status") != "Completed"]
        recent = sorted(tasks, key=lambda x: x.get("updated_at", x.get("created_at", "")), reverse=True)[:8]

        team_activity = []
        for t in tasks:
            for log in t.get("activity_log", []):
                team_activity.append({
                    "task_id": t.get("id"),
                    "task_title": t.get("title"),
                    "employee": t.get("employee"),
                    "action": log.get("action", "Updated"),
                    "actor": log.get("actor", "Team Member"),
                    "previous_status": log.get("previous_status", ""),
                    "new_status": log.get("new_status", ""),
                    "note": log.get("note", ""),
                    "timestamp": log.get("timestamp", t.get("created_at", "")),
                })
        team_activity.sort(key=lambda x: x["timestamp"], reverse=True)
        team_activity = team_activity[:10]

        upcoming_deadlines = sorted(
            active,
            key=lambda x: (x.get("due_date") == "", x.get("due_date", ""), x.get("created_at", ""))
        )[:6]

        return {
            "total": total,
            "pending": pending,
            "in_progress": in_progress,
            "completed": completed,
            "high_priority": high_priority,
            "active_tasks": active,
            "recent_tasks": recent,
            "upcoming_deadlines": upcoming_deadlines,
            "team_activity": team_activity,
            "all_tasks": tasks,
        }


task_manager = TaskManager()
