"""
task_manager.py — WorkMate Task Management & Activity History
Handles adding, updating, status changes, task reopening, activity logs, and queries.
Supports both Manager and Employee workflows with strict scoping.
Task data is stored in tasks.json.
"""

import os
import json
from datetime import datetime


TASKS_FILE = "tasks.json"

VALID_PRIORITIES = ["Low", "Medium", "High"]
VALID_STATUSES = ["Pending", "In Progress", "Completed"]


class TaskManagerException(Exception):
    """Custom exception for task manager validation and runtime errors."""
    pass


class TaskManager:
    def __init__(self, filepath: str = TASKS_FILE):
        self.filepath = filepath
        if not os.path.exists(self.filepath):
            self._save_tasks([])

    # -----------------------------------------------------------------------
    # File I/O
    # -----------------------------------------------------------------------

    def _load_tasks(self) -> list:
        """Loads all tasks from the JSON file."""
        if not os.path.exists(self.filepath):
            return []
        try:
            with open(self.filepath, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return []
                tasks = json.loads(content)
                # Auto-upgrade any task records without activity_log
                changed = False
                for t in tasks:
                    if "activity_log" not in t:
                        t["activity_log"] = [{
                            "action": "Created",
                            "actor": "Manager",
                            "previous_status": None,
                            "new_status": t.get("status", "Pending"),
                            "timestamp": t.get("created_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
                            "note": "Initial task creation",
                        }]
                        changed = True
                if changed:
                    self._save_tasks(tasks)
                return tasks
        except json.JSONDecodeError as e:
            raise TaskManagerException(f"Tasks data file is corrupted: {e}")
        except IOError as e:
            raise TaskManagerException(f"Failed to read tasks file: {e}")

    def _save_tasks(self, tasks: list) -> None:
        """Saves the full task list to the JSON file."""
        try:
            with open(self.filepath, "w", encoding="utf-8") as f:
                json.dump(tasks, f, indent=2, ensure_ascii=False)
        except IOError as e:
            raise TaskManagerException(f"Failed to write tasks file: {e}")

    # -----------------------------------------------------------------------
    # Validation
    # -----------------------------------------------------------------------

    def _validate_task_data(self, data: dict, is_new: bool = True) -> dict:
        """Validates and sanitises task fields. Returns cleaned dict."""
        cleaned = dict(data)

        if is_new:
            required = ["id", "title", "employee_id", "priority", "status"]
            for field in required:
                if field not in cleaned or not str(cleaned[field]).strip():
                    raise TaskManagerException(f"'{field.replace('_', ' ').title()}' is required.")

        # Task ID
        if "id" in cleaned:
            task_id = str(cleaned["id"]).strip().upper()
            if not task_id:
                raise TaskManagerException("Task ID cannot be empty.")
            cleaned["id"] = task_id

        # Title
        if "title" in cleaned:
            title = str(cleaned["title"]).strip()
            if not title:
                raise TaskManagerException("Task title cannot be empty.")
            if len(title) > 120:
                raise TaskManagerException("Task title must be 120 characters or fewer.")
            cleaned["title"] = title

        # Description (optional)
        if "description" in cleaned:
            cleaned["description"] = str(cleaned["description"]).strip()
        elif is_new:
            cleaned["description"] = ""

        # Employee ID
        if "employee_id" in cleaned:
            emp_id = str(cleaned["employee_id"]).strip().upper()
            if not emp_id:
                raise TaskManagerException("Employee is required.")
            cleaned["employee_id"] = emp_id

        # Employee display name
        if "employee" in cleaned:
            cleaned["employee"] = str(cleaned["employee"]).strip()
        elif "employee_name" in cleaned:
            cleaned["employee"] = str(cleaned["employee_name"]).strip()

        # Priority
        if "priority" in cleaned:
            priority = str(cleaned["priority"]).strip().title()
            if priority not in VALID_PRIORITIES:
                raise TaskManagerException(f"Priority must be one of: {', '.join(VALID_PRIORITIES)}.")
            cleaned["priority"] = priority

        # Status
        if "status" in cleaned:
            status = str(cleaned["status"]).strip()
            # Normalize title case or 'In Progress'
            if status.lower() == "in progress":
                status = "In Progress"
            else:
                status = status.title()
            if status not in VALID_STATUSES:
                raise TaskManagerException(f"Status must be one of: {', '.join(VALID_STATUSES)}.")
            cleaned["status"] = status

        return cleaned

    # -----------------------------------------------------------------------
    # Manager CRUD Operations
    # -----------------------------------------------------------------------

    def add_task(self, manager_id: str, task_data: dict, actor_name: str = "Manager") -> dict:
        """Adds a new task scoped to manager_id. Returns the created task."""
        tasks = self._load_tasks()
        cleaned = self._validate_task_data(task_data, is_new=True)

        # Duplicate ID check within this manager's tasks
        for t in tasks:
            if t.get("manager_id") == manager_id and t["id"].lower() == cleaned["id"].lower():
                raise TaskManagerException(f"Task ID '{cleaned['id']}' already exists.")

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cleaned["manager_id"] = manager_id
        cleaned["created_at"] = now_str
        cleaned["updated_at"] = now_str

        # Activity log entry
        cleaned["activity_log"] = [{
            "action": "Created",
            "actor": f"{actor_name} (Manager)",
            "previous_status": None,
            "new_status": cleaned["status"],
            "timestamp": now_str,
            "note": f"Task created and assigned to {cleaned.get('employee', cleaned['employee_id'])}",
        }]

        tasks.append(cleaned)
        self._save_tasks(tasks)
        return cleaned

    def update_task(self, manager_id: str, task_id: str, updates: dict, actor_name: str = "Manager") -> dict:
        """Updates an existing task by Manager. Returns updated task."""
        tasks = self._load_tasks()
        task_id_str = str(task_id).strip()
        target_idx = -1

        for idx, t in enumerate(tasks):
            if t.get("manager_id") == manager_id and t["id"].lower() == task_id_str.lower():
                target_idx = idx
                break

        if target_idx == -1:
            raise TaskManagerException(f"Task '{task_id}' not found.")

        current_task = tasks[target_idx]
        prev_status = current_task.get("status")
        cleaned_updates = self._validate_task_data(updates, is_new=False)
        new_status = cleaned_updates.get("status", prev_status)

        # Apply updates (cannot change id, manager_id, created_at)
        for field, value in cleaned_updates.items():
            if field not in ("id", "manager_id", "created_at", "activity_log"):
                current_task[field] = value

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        current_task["updated_at"] = now_str

        # Add to activity log if status or assignment changed
        if "activity_log" not in current_task:
            current_task["activity_log"] = []

        log_note = "Task details updated by manager"
        action = "Edited"
        if prev_status != new_status:
            action = "Status Updated"
            log_note = f"Status changed from {prev_status} to {new_status}"

        current_task["activity_log"].append({
            "action": action,
            "actor": f"{actor_name} (Manager)",
            "previous_status": prev_status,
            "new_status": new_status,
            "timestamp": now_str,
            "note": log_note,
        })

        tasks[target_idx] = current_task
        self._save_tasks(tasks)
        return current_task

    def delete_task(self, manager_id: str, task_id: str) -> dict:
        """Deletes a task by ID. Returns the deleted task."""
        tasks = self._load_tasks()
        task_id_str = str(task_id).strip()
        target_idx = -1

        for idx, t in enumerate(tasks):
            if t.get("manager_id") == manager_id and t["id"].lower() == task_id_str.lower():
                target_idx = idx
                break

        if target_idx == -1:
            raise TaskManagerException(f"Task '{task_id}' not found.")

        deleted = tasks.pop(target_idx)
        self._save_tasks(tasks)
        return deleted

    def get_task(self, manager_id: str, task_id: str) -> dict | None:
        """Returns a single task by ID or None."""
        tasks = self._load_tasks()
        for t in tasks:
            if t.get("manager_id") == manager_id and t["id"].lower() == task_id.strip().lower():
                return t
        return None

    def get_all_tasks(
        self,
        manager_id: str,
        search_query: str = None,
        status_filter: str = None,
        priority_filter: str = None,
        employee_id_filter: str = None,
    ) -> list:
        """
        Returns tasks for a manager, optionally filtered.
        """
        tasks = self._load_tasks()
        result = []

        for t in tasks:
            if t.get("manager_id") != manager_id:
                continue
            if search_query:
                sq = search_query.lower()
                if not (sq in t.get("title", "").lower() or 
                        sq in t.get("employee", "").lower() or 
                        sq in t.get("employee_id", "").lower() or
                        sq in t.get("id", "").lower() or
                        sq in t.get("description", "").lower()):
                    continue
            if status_filter and status_filter.lower() != t.get("status", "").lower():
                continue
            if priority_filter and priority_filter.lower() != t.get("priority", "").lower():
                continue
            if employee_id_filter and employee_id_filter.upper() != t.get("employee_id", "").upper():
                continue
            result.append(t)

        return result

    # -----------------------------------------------------------------------
    # Employee Workflow Operations
    # -----------------------------------------------------------------------

    def get_tasks_for_employee(
        self,
        employee_id: str,
        search_query: str = None,
        status_filter: str = None,
        priority_filter: str = None,
    ) -> list:
        """
        Returns ONLY tasks assigned to this specific employee.
        """
        tasks = self._load_tasks()
        emp_id = employee_id.strip().upper()
        result = []

        for t in tasks:
            if t.get("employee_id", "").upper() != emp_id:
                continue
            if search_query:
                sq = search_query.lower()
                if not (sq in t.get("title", "").lower() or 
                        sq in t.get("id", "").lower() or
                        sq in t.get("description", "").lower()):
                    continue
            if status_filter and status_filter.lower() != t.get("status", "").lower():
                continue
            if priority_filter and priority_filter.lower() != t.get("priority", "").lower():
                continue
            result.append(t)

        # Sort: In Progress first, then Pending, then Completed
        status_rank = {"In Progress": 0, "Pending": 1, "Completed": 2}
        result.sort(key=lambda x: (status_rank.get(x.get("status", ""), 3), x.get("created_at", "")))
        return result

    def update_task_status_by_employee(
        self,
        employee_id: str,
        task_id: str,
        new_status: str,
        note: str = "",
        actor_name: str = "Employee"
    ) -> dict:
        """
        Allows an employee to transition task status:
        - Pending -> In Progress
        - In Progress -> Completed
        - Completed -> In Progress (Reopen) / Pending
        Records the transition in activity_log with timestamp and employee name.
        """
        tasks = self._load_tasks()
        target_idx = -1
        emp_id = employee_id.strip().upper()

        for idx, t in enumerate(tasks):
            if t["id"].upper() == task_id.strip().upper() and t.get("employee_id", "").upper() == emp_id:
                target_idx = idx
                break

        if target_idx == -1:
            raise TaskManagerException(f"Task '{task_id}' not found or not assigned to your account.")

        current_task = tasks[target_idx]
        prev_status = current_task.get("status")

        # Normalize status
        if new_status.lower() == "in progress":
            target_status = "In Progress"
        else:
            target_status = new_status.strip().title()

        if target_status not in VALID_STATUSES:
            raise TaskManagerException(f"Invalid status '{new_status}'. Allowed: {', '.join(VALID_STATUSES)}.")

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        action = "Status Updated"
        if prev_status == "Completed" and target_status in ("In Progress", "Pending"):
            action = "Reopened"

        log_note = note.strip() or f"Status changed from '{prev_status}' to '{target_status}'"

        if "activity_log" not in current_task:
            current_task["activity_log"] = []

        current_task["status"] = target_status
        current_task["updated_at"] = now_str
        current_task["activity_log"].append({
            "action": action,
            "actor": f"{actor_name} (Employee)",
            "previous_status": prev_status,
            "new_status": target_status,
            "timestamp": now_str,
            "note": log_note,
        })

        tasks[target_idx] = current_task
        self._save_tasks(tasks)
        return current_task

    # -----------------------------------------------------------------------
    # Statistics & Dashboards
    # -----------------------------------------------------------------------

    def get_dashboard_stats(self, manager_id: str) -> dict:
        """Returns summary statistics for the manager's dashboard."""
        tasks = self._load_tasks()
        manager_tasks = [t for t in tasks if t.get("manager_id") == manager_id]

        total = len(manager_tasks)
        pending = sum(1 for t in manager_tasks if t.get("status") == "Pending")
        in_progress = sum(1 for t in manager_tasks if t.get("status") == "In Progress")
        completed = sum(1 for t in manager_tasks if t.get("status") == "Completed")
        high_priority = sum(1 for t in manager_tasks if t.get("priority") == "High")

        recent = sorted(
            manager_tasks,
            key=lambda t: t.get("updated_at") or t.get("created_at", ""),
            reverse=True
        )[:6]

        workload = {}
        for t in manager_tasks:
            emp = t.get("employee", "Unknown")
            emp_id = t.get("employee_id", "")
            if emp_id not in workload:
                workload[emp_id] = {"name": emp, "employee_id": emp_id, "total": 0, "pending": 0, "in_progress": 0, "completed": 0}
            workload[emp_id]["total"] += 1
            status = t.get("status", "")
            if status == "Pending":
                workload[emp_id]["pending"] += 1
            elif status == "In Progress":
                workload[emp_id]["in_progress"] += 1
            elif status == "Completed":
                workload[emp_id]["completed"] += 1

        return {
            "total": total,
            "pending": pending,
            "in_progress": in_progress,
            "completed": completed,
            "high_priority": high_priority,
            "recent_tasks": recent,
            "employee_workload": list(workload.values()),
        }

    def get_employee_dashboard_stats(self, employee_id: str, manager_id: str = None) -> dict:
        """Returns personal workspace statistics for the Employee Dashboard."""
        tasks = self.get_tasks_for_employee(employee_id)
        total = len(tasks)
        pending = sum(1 for t in tasks if t.get("status") == "Pending")
        in_progress = sum(1 for t in tasks if t.get("status") == "In Progress")
        completed = sum(1 for t in tasks if t.get("status") == "Completed")
        high_priority = sum(1 for t in tasks if t.get("priority") == "High" and t.get("status") != "Completed")

        # Active tasks (In Progress or Pending)
        active_tasks = [t for t in tasks if t.get("status") != "Completed"]
        recent = sorted(
            tasks,
            key=lambda t: t.get("updated_at") or t.get("created_at", ""),
            reverse=True
        )[:5]

        return {
            "total": total,
            "pending": pending,
            "in_progress": in_progress,
            "completed": completed,
            "high_priority": high_priority,
            "active_tasks": active_tasks,
            "recent_tasks": recent,
        }

    # -----------------------------------------------------------------------
    # Seed Data
    # -----------------------------------------------------------------------

    def seed_if_empty(self, manager_id: str) -> None:
        """Seeds initial sample tasks for demo manager if none exist."""
        tasks = self._load_tasks()
        existing = [t for t in tasks if t.get("manager_id") == manager_id]
        if existing:
            return

        sample_tasks = [
            {
                "id": "TASK-101", "manager_id": manager_id,
                "title": "Design Database Schema",
                "description": "Create the initial schema for user profiles, employee sessions, and settings tables.",
                "employee_id": "EMP-001", "employee": "Sarah Jenkins",
                "priority": "High", "status": "Completed",
                "created_at": "2025-06-01 09:00:00", "updated_at": "2025-06-02 17:00:00",
                "activity_log": [
                    {"action": "Created", "actor": "Alex Morgan (Manager)", "previous_status": None, "new_status": "Pending", "timestamp": "2025-06-01 09:00:00", "note": "Assigned to Sarah Jenkins"},
                    {"action": "Status Updated", "actor": "Sarah Jenkins (Employee)", "previous_status": "Pending", "new_status": "In Progress", "timestamp": "2025-06-01 10:30:00", "note": "Started ER diagram"},
                    {"action": "Status Updated", "actor": "Sarah Jenkins (Employee)", "previous_status": "In Progress", "new_status": "Completed", "timestamp": "2025-06-02 17:00:00", "note": "Schema finalized and approved"},
                ]
            },
            {
                "id": "TASK-102", "manager_id": manager_id,
                "title": "Setup OAuth2 Authentication",
                "description": "Integrate Google and GitHub OAuth sign-in flow for the dashboard.",
                "employee_id": "EMP-002", "employee": "David Miller",
                "priority": "High", "status": "In Progress",
                "created_at": "2025-06-03 10:00:00", "updated_at": "2025-06-04 11:30:00",
                "activity_log": [
                    {"action": "Created", "actor": "Alex Morgan (Manager)", "previous_status": None, "new_status": "Pending", "timestamp": "2025-06-03 10:00:00", "note": "High priority task assigned"},
                    {"action": "Status Updated", "actor": "David Miller (Employee)", "previous_status": "Pending", "new_status": "In Progress", "timestamp": "2025-06-04 11:30:00", "note": "Configuring OAuth client keys"},
                ]
            },
            {
                "id": "TASK-103", "manager_id": manager_id,
                "title": "Write API Documentation",
                "description": "Document REST API endpoints using Swagger/OpenAPI specifications.",
                "employee_id": "EMP-001", "employee": "Sarah Jenkins",
                "priority": "Medium", "status": "In Progress",
                "created_at": "2025-06-05 11:00:00", "updated_at": "2025-06-06 10:00:00",
                "activity_log": [
                    {"action": "Created", "actor": "Alex Morgan (Manager)", "previous_status": None, "new_status": "Pending", "timestamp": "2025-06-05 11:00:00", "note": "Initial assignment"},
                    {"action": "Status Updated", "actor": "Sarah Jenkins (Employee)", "previous_status": "Pending", "new_status": "In Progress", "timestamp": "2025-06-06 10:00:00", "note": "Drafting Swagger specs"},
                ]
            },
            {
                "id": "TASK-104", "manager_id": manager_id,
                "title": "Optimize Asset Compression",
                "description": "Implement lazy loading and WebP conversion for UI asset uploads.",
                "employee_id": "EMP-003", "employee": "Emily Chen",
                "priority": "Low", "status": "Pending",
                "created_at": "2025-06-06 09:30:00", "updated_at": "2025-06-06 09:30:00",
                "activity_log": [
                    {"action": "Created", "actor": "Alex Morgan (Manager)", "previous_status": None, "new_status": "Pending", "timestamp": "2025-06-06 09:30:00", "note": "Assigned to Emily Chen"}
                ]
            },
            {
                "id": "TASK-105", "manager_id": manager_id,
                "title": "Setup CI/CD Pipeline",
                "description": "Configure GitHub Actions for automated testing and staging deployments.",
                "employee_id": "EMP-004", "employee": "Raj Patel",
                "priority": "High", "status": "In Progress",
                "created_at": "2025-06-07 14:00:00", "updated_at": "2025-06-07 15:00:00",
                "activity_log": [
                    {"action": "Created", "actor": "Alex Morgan (Manager)", "previous_status": None, "new_status": "Pending", "timestamp": "2025-06-07 14:00:00", "note": "CI/CD setup assigned"},
                    {"action": "Status Updated", "actor": "Raj Patel (Employee)", "previous_status": "Pending", "new_status": "In Progress", "timestamp": "2025-06-07 15:00:00", "note": "Drafting workflow YAML files"}
                ]
            },
            {
                "id": "TASK-106", "manager_id": manager_id,
                "title": "Frontend Unit Tests",
                "description": "Write unit tests for UI components and state management.",
                "employee_id": "EMP-005", "employee": "Lisa Wang",
                "priority": "Medium", "status": "Pending",
                "created_at": "2025-06-08 10:00:00", "updated_at": "2025-06-08 10:00:00",
                "activity_log": [
                    {"action": "Created", "actor": "Alex Morgan (Manager)", "previous_status": None, "new_status": "Pending", "timestamp": "2025-06-08 10:00:00", "note": "Assigned to Lisa Wang"}
                ]
            },
        ]

        tasks.extend(sample_tasks)
        self._save_tasks(tasks)
        print(f"[WorkMate] {len(sample_tasks)} sample tasks seeded for manager {manager_id}.")
