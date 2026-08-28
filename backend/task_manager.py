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
from backend.time_utils import format_datetime_ist, format_date_ist, now_ist


TASKS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tasks.json")

VALID_PRIORITIES = ["Low", "Medium", "High"]
VALID_STATUSES = ["Pending", "In Progress", "Completed"]


from backend.storage_utils import read_json_file, write_json_file


class TaskManager:
    def __init__(self, filename: str = TASKS_FILE):
        self.filename = filename

    def _load_tasks(self) -> list:
        return read_json_file(self.filename)

    def _save_tasks(self, tasks: list) -> None:
        write_json_file(self.filename, tasks)

    def get_tasks_for_manager(self, manager_id: str, search: str = "", status: str = "", priority: str = "", employee_id: str = "", scope: str = "") -> list:
        tasks = self._load_tasks()
        norm_mgr_id = manager_id.strip().upper()
        mgr_ids = [norm_mgr_id]
        if norm_mgr_id in ["MGR-001", "003"]:
            mgr_ids = ["MGR-001", "003"]

        if scope == "my_tasks":
            filtered = [t for t in tasks if t.get("employee_id") in mgr_ids]
        elif scope == "team_tasks":
            filtered = [t for t in tasks if t.get("manager_id") in mgr_ids and t.get("employee_id") not in mgr_ids]
        else:
            filtered = [t for t in tasks if t.get("manager_id") in mgr_ids or t.get("employee_id") in mgr_ids]

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
        norm_emp_id = str(employee_id).strip().upper()
        norm_emp_num = norm_emp_id.replace("EMP-", "").lstrip("0")

        filtered = []
        for t in tasks:
            t_emp_id = str(t.get("employee_id", "")).strip().upper()
            t_emp_num = t_emp_id.replace("EMP-", "").lstrip("0")
            if t_emp_id == norm_emp_id or (norm_emp_num and t_emp_num == norm_emp_num):
                filtered.append(t)

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

    def get_all_tasks_for_admin(self, search: str = "", status: str = "", priority: str = "") -> list:
        tasks = self._load_tasks()
        filtered = tasks

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

        return filtered

    def get_task_by_id(self, task_id: str, actor_role: str = "", actor_id: str = "") -> dict | None:
        tasks = self._load_tasks()
        norm_task_id = task_id.strip().upper()
        for t in tasks:
            if t.get("id", "").upper() == norm_task_id:
                return t
        return None

    def add_task(self, manager_id: str, data: dict, employees: list, manager_name: str = "Manager") -> dict:
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
            if t.get("id", "").upper() == task_id:
                raise ValueError(f"Task ID '{task_id}' already exists.")

        now_str = format_datetime_ist()
        due_date = str(data.get("due_date", "")).strip()

        initial_log = [{
            "timestamp": now_str,
            "action": "Created",
            "actor": manager_name,
            "previous_status": "",
            "new_status": status,
            "note": f"Task created by {manager_name} and assigned to {emp['name']}."
        }]

        new_task = {
            "id": task_id,
            "manager_id": manager_id,
            "assigned_by": manager_name,
            "assigned_by_id": manager_id,
            "assigned_by_role": "manager",
            "title": title,
            "description": description,
            "employee_id": emp_id,
            "employee": emp["name"],
            "assignee_role": "employee",
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

    def add_task_by_admin(self, admin_id: str, data: dict, managers: list) -> dict:
        tasks = self._load_tasks()
        required = ["id", "title", "manager_id", "priority", "status"]
        for field in required:
            if not str(data.get(field, "")).strip():
                raise ValueError(f"'{field.replace('_', ' ').title()}' is required.")

        task_id = str(data["id"]).strip().upper()
        title = str(data["title"]).strip()
        description = str(data.get("description", "")).strip()
        mgr_id = str(data["manager_id"]).strip()
        priority = str(data["priority"]).strip()
        status = str(data["status"]).strip()

        if not re.match(r"^[A-Z0-9\-]{2,20}$", task_id):
            raise ValueError("Task ID must be 2–20 alphanumeric characters (dashes allowed), e.g. TASK-MGR-01.")

        if len(title) < 2:
            raise ValueError("Task title must be at least 2 characters.")

        if priority not in VALID_PRIORITIES:
            raise ValueError(f"Priority must be one of: {', '.join(VALID_PRIORITIES)}.")

        if status not in VALID_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(VALID_STATUSES)}.")

        mgr = next((m for m in managers if m["manager_id"] == mgr_id), None)
        if not mgr:
            raise ValueError(f"Manager '{mgr_id}' not found.")

        for t in tasks:
            if t.get("id", "").upper() == task_id:
                raise ValueError(f"Task ID '{task_id}' already exists.")

        now_str = format_datetime_ist()
        due_date = str(data.get("due_date", "")).strip()

        initial_log = [{
            "timestamp": now_str,
            "action": "Created",
            "actor": "CEO / Administrator",
            "previous_status": "",
            "new_status": status,
            "note": f"Task created by Executive Office and assigned to Manager {mgr['full_name']}."
        }]

        new_task = {
            "id": task_id,
            "manager_id": mgr_id,
            "assigned_by": "CEO / Administrator",
            "assigned_by_id": admin_id,
            "assigned_by_role": "admin",
            "title": title,
            "description": description,
            "employee_id": mgr_id,
            "employee": mgr["full_name"],
            "assignee_role": "manager",
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
        norm_mgr_id = "MGR-001" if manager_id == "003" else manager_id

        for idx, t in enumerate(tasks):
            t_mgr = "MGR-001" if t.get("manager_id") == "003" else t.get("manager_id")
            if t_mgr == norm_mgr_id and t.get("id", "").upper() == task_id.strip().upper():
                target_idx = idx
                break

        if target_idx == -1:
            raise ValueError(f"Task '{task_id}' not found.")

        task = tasks[target_idx]
        now_str = format_datetime_ist()

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

        # Note: Status is NOT updated here for employee tasks. The assigned employee owns their status.
        task["updated_at"] = now_str
        tasks[target_idx] = task
        self._save_tasks(tasks)
        return task

    def update_task_status_authorized(self, task_id: str, actor_id: str, actor_name: str, actor_role: str, new_status: str, note: str = "") -> dict:
        tasks = self._load_tasks()
        target_idx = -1
        norm_task_id = task_id.strip().upper()

        for idx, t in enumerate(tasks):
            if t.get("id", "").upper() == norm_task_id:
                target_idx = idx
                break

        if target_idx == -1:
            raise ValueError(f"Task '{task_id}' not found.")

        task = tasks[target_idx]
        assignee_id = task.get("employee_id", "")
        assignee_role = task.get("assignee_role") or ("manager" if assignee_id.startswith("MGR-") else "employee")

        # Strict Task Ownership Enforcement
        if assignee_role == "employee":
            if actor_role != "employee" or actor_id != assignee_id:
                raise PermissionError(
                    f"Task Ownership Restriction: Only the assigned employee ({task.get('employee', assignee_id)}) can update this task's status."
                )
        elif assignee_role == "manager":
            if actor_role != "manager" or actor_id != assignee_id:
                raise PermissionError(
                    f"Task Ownership Restriction: Only the assigned manager ({task.get('employee', assignee_id)}) can update this task's status."
                )
        else:
            if actor_id != assignee_id:
                raise PermissionError("Task Ownership Restriction: You are not authorized to update this task's status.")

        if new_status not in VALID_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(VALID_STATUSES)}.")

        old_status = task.get("status", "Pending")
        now_str = format_datetime_ist()

        action_name = "Status Updated"
        if old_status == "Completed" and new_status in ["In Progress", "Pending"]:
            action_name = "Reopened"

        log_entry = {
            "timestamp": now_str,
            "action": action_name,
            "actor": actor_name or actor_id,
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

    def seed_manager_tasks_if_empty(self, manager_id: str = "MGR-001") -> None:
        tasks = self._load_tasks()
        has_employee_tasks = any(t.get("manager_id") == manager_id and t.get("employee_id") != manager_id for t in tasks)
        has_manager_tasks = any(t.get("employee_id") == manager_id for t in tasks)
        now_str = format_datetime_ist()

        if not has_employee_tasks:
            demo_emp_tasks = [
                {
                    "id": "TASK-101",
                    "manager_id": manager_id,
                    "assigned_by": "Alex Morgan",
                    "assigned_by_id": manager_id,
                    "assigned_by_role": "manager",
                    "title": "Design Database Schema & Microservices Architecture",
                    "description": "Create PostgreSQL schemas, index strategies, and ER diagrams for the user intelligence microservice.",
                    "employee_id": "EMP-001",
                    "employee": "Sarah Jenkins",
                    "assignee_role": "employee",
                    "priority": "High",
                    "status": "In Progress",
                    "due_date": "2026-09-10",
                    "activity_log": [
                        {
                            "timestamp": now_str,
                            "action": "Created",
                            "actor": "Alex Morgan",
                            "previous_status": "",
                            "new_status": "In Progress",
                            "note": "Assigned to Lead Engineer Sarah Jenkins."
                        }
                    ],
                    "created_at": now_str,
                    "updated_at": now_str,
                },
                {
                    "id": "TASK-102",
                    "manager_id": manager_id,
                    "assigned_by": "Alex Morgan",
                    "assigned_by_id": manager_id,
                    "assigned_by_role": "manager",
                    "title": "Setup OAuth2 & Multi-Factor Authentication",
                    "description": "Implement Google Workspace and GitHub OAuth providers with session rotation and security logging.",
                    "employee_id": "EMP-002",
                    "employee": "David Miller",
                    "assignee_role": "employee",
                    "priority": "High",
                    "status": "Completed",
                    "due_date": "2026-09-05",
                    "activity_log": [
                        {
                            "timestamp": now_str,
                            "action": "Created",
                            "actor": "Alex Morgan",
                            "previous_status": "",
                            "new_status": "Completed",
                            "note": "Initial task assignment."
                        }
                    ],
                    "created_at": now_str,
                    "updated_at": now_str,
                },
                {
                    "id": "TASK-103",
                    "manager_id": manager_id,
                    "assigned_by": "Alex Morgan",
                    "assigned_by_id": manager_id,
                    "assigned_by_role": "manager",
                    "title": "Write OpenAPI Specification & Developer Portal",
                    "description": "Document all internal and external REST API endpoints with schema validation and example payloads.",
                    "employee_id": "EMP-001",
                    "employee": "Sarah Jenkins",
                    "assignee_role": "employee",
                    "priority": "Medium",
                    "status": "Pending",
                    "due_date": "2026-09-20",
                    "activity_log": [
                        {
                            "timestamp": now_str,
                            "action": "Created",
                            "actor": "Alex Morgan",
                            "previous_status": "",
                            "new_status": "Pending",
                            "note": "Assigned to Sarah Jenkins."
                        }
                    ],
                    "created_at": now_str,
                    "updated_at": now_str,
                },
                {
                    "id": "TASK-104",
                    "manager_id": manager_id,
                    "assigned_by": "Alex Morgan",
                    "assigned_by_id": manager_id,
                    "assigned_by_role": "manager",
                    "title": "Optimize WebP Asset Bundling & Caching",
                    "description": "Set up automated WebP asset compression pipelines and configure CDN cache headers.",
                    "employee_id": "EMP-003",
                    "employee": "Emily Chen",
                    "assignee_role": "employee",
                    "priority": "Low",
                    "status": "Pending",
                    "due_date": "2026-09-25",
                    "activity_log": [
                        {
                            "timestamp": now_str,
                            "action": "Created",
                            "actor": "Alex Morgan",
                            "previous_status": "",
                            "new_status": "Pending",
                            "note": "Assigned to Emily Chen."
                        }
                    ],
                    "created_at": now_str,
                    "updated_at": now_str,
                },
                {
                    "id": "TASK-105",
                    "manager_id": manager_id,
                    "assigned_by": "Alex Morgan",
                    "assigned_by_id": manager_id,
                    "assigned_by_role": "manager",
                    "title": "Automated End-to-End Regression Test Suite",
                    "description": "Write Playwright E2E tests covering authentication, team roster manipulation, and leave request flows.",
                    "employee_id": "EMP-004",
                    "employee": "Michael Brown",
                    "assignee_role": "employee",
                    "priority": "High",
                    "status": "In Progress",
                    "due_date": "2026-09-12",
                    "activity_log": [
                        {
                            "timestamp": now_str,
                            "action": "Created",
                            "actor": "Alex Morgan",
                            "previous_status": "",
                            "new_status": "In Progress",
                            "note": "Assigned to Michael Brown."
                        }
                    ],
                    "created_at": now_str,
                    "updated_at": now_str,
                }
            ]
            tasks.extend(demo_emp_tasks)

        if not has_manager_tasks:
            demo_mgr_tasks = [
                {
                    "id": "TASK-MGR-01",
                    "manager_id": manager_id,
                    "assigned_by": "CEO / Administrator",
                    "assigned_by_id": "CEO-001",
                    "assigned_by_role": "admin",
                    "title": "Quarterly Department OKRs Review",
                    "description": "Align Q3 department performance targets, hiring roadmap, and team velocity metrics with executive leadership.",
                    "employee_id": manager_id,
                    "employee": "Alex Morgan",
                    "assignee_role": "manager",
                    "priority": "High",
                    "status": "In Progress",
                    "due_date": "2026-09-15",
                    "activity_log": [
                        {
                            "timestamp": now_str,
                            "action": "Created",
                            "actor": "CEO / Administrator",
                            "previous_status": "",
                            "new_status": "In Progress",
                            "note": "Executive priority task assigned to Department Head."
                        }
                    ],
                    "created_at": now_str,
                    "updated_at": now_str,
                },
                {
                    "id": "TASK-MGR-02",
                    "manager_id": manager_id,
                    "assigned_by": "CEO / Administrator",
                    "assigned_by_id": "CEO-001",
                    "assigned_by_role": "admin",
                    "title": "Annual Engineering Infrastructure Budget",
                    "description": "Finalize cloud compute quotas, SaaS tool renewals, and hardware refresh allocation for the upcoming fiscal year.",
                    "employee_id": manager_id,
                    "employee": "Alex Morgan",
                    "assignee_role": "manager",
                    "priority": "Medium",
                    "status": "Pending",
                    "due_date": "2026-09-30",
                    "activity_log": [
                        {
                            "timestamp": now_str,
                            "action": "Created",
                            "actor": "CEO / Administrator",
                            "previous_status": "",
                            "new_status": "Pending",
                            "note": "Assigned by CEO."
                        }
                    ],
                    "created_at": now_str,
                    "updated_at": now_str,
                }
            ]
            tasks.extend(demo_mgr_tasks)

        if not has_employee_tasks or not has_manager_tasks:
            self._save_tasks(tasks)

    def get_dashboard_stats(self, manager_id: str, employees: list) -> dict:
        norm_mgr_id = "MGR-001" if manager_id.strip().upper() in ["003", "MGR-001"] else manager_id.strip().upper()
        tasks = self.get_tasks_for_manager(manager_id, scope="all")

        total = len(tasks)
        completed = sum(1 for t in tasks if t.get("status") == "Completed")
        in_progress = sum(1 for t in tasks if t.get("status") == "In Progress")
        pending = sum(1 for t in tasks if t.get("status") == "Pending")
        high_p = sum(1 for t in tasks if t.get("priority") == "High")
        med_p = sum(1 for t in tasks if t.get("priority") == "Medium")
        low_p = sum(1 for t in tasks if t.get("priority") == "Low")
        rate = round((completed / total * 100), 1) if total > 0 else 0

        my_tasks = [t for t in tasks if t.get("employee_id") == norm_mgr_id]
        team_tasks = [t for t in tasks if t.get("employee_id") != norm_mgr_id]

        recent_activity = []
        for t in tasks:
            for act in t.get("activity_log", []):
                recent_activity.append({
                    "task_id": t.get("id"),
                    "task_title": t.get("title"),
                    "employee": t.get("employee"),
                    **act
                })
        recent_activity.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

        urgent_tasks = [t for t in tasks if t.get("priority") == "High" and t.get("status") != "Completed"]

        return {
            "total": total,
            "total_tasks": total,
            "completed": completed,
            "completed_tasks": completed,
            "in_progress": in_progress,
            "in_progress_tasks": in_progress,
            "pending": pending,
            "pending_tasks": pending,
            "high_priority": high_p,
            "medium_priority": med_p,
            "low_priority": low_p,
            "completion_rate": rate,
            "total_employees": len(employees),
            "tasks": tasks,
            "all_tasks": tasks,
            "recent_tasks": tasks[:6],
            "my_tasks": my_tasks,
            "team_tasks": team_tasks,
            "urgent_tasks": urgent_tasks,
            "recent_activity": recent_activity[:10],
        }

    def get_employee_dashboard_stats(self, employee_id: str) -> dict:
        tasks = self.get_tasks_for_employee(employee_id)
        total = len(tasks)
        completed = sum(1 for t in tasks if t.get("status") == "Completed")
        in_progress = sum(1 for t in tasks if t.get("status") == "In Progress")
        pending = sum(1 for t in tasks if t.get("status") == "Pending")
        high_p = sum(1 for t in tasks if t.get("priority") == "High")
        med_p = sum(1 for t in tasks if t.get("priority") == "Medium")
        low_p = sum(1 for t in tasks if t.get("priority") == "Low")
        rate = round((completed / total * 100), 1) if total > 0 else 0

        recent_activity = []
        for t in tasks:
            for act in t.get("activity_log", []):
                recent_activity.append({
                    "task_id": t.get("id"),
                    "task_title": t.get("title"),
                    **act
                })
        recent_activity.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

        urgent_tasks = [t for t in tasks if t.get("priority") == "High" and t.get("status") != "Completed"]

        return {
            "total": total,
            "total_tasks": total,
            "completed": completed,
            "completed_tasks": completed,
            "in_progress": in_progress,
            "in_progress_tasks": in_progress,
            "pending": pending,
            "pending_tasks": pending,
            "high_priority": high_p,
            "medium_priority": med_p,
            "low_priority": low_p,
            "completion_rate": rate,
            "my_tasks": tasks,
            "tasks": tasks,
            "all_tasks": tasks,
            "recent_tasks": tasks[:6],
            "urgent_tasks": urgent_tasks,
            "recent_activity": recent_activity[:10],
        }


task_manager = TaskManager()

