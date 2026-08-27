# WorkMate — Enterprise Workforce & Operations Platform

WorkMate is a modern, full-stack Employee Task, Attendance, Leave Management, and Organizational Intelligence application engineered for high-performance teams.

---

## 🌟 Key Features

### 🛡️ 1. CEO / Executive Administrator Portal
- **Organization-Wide Visibility**: Full workforce directory showing all employees across departments, reporting managers, task loads, attendance statuses, and active leave states.
- **Manager Supervisory Control**: Approve or reject department manager time-off requests with audit logs.
- **Enterprise Reporting**: Aggregated company-wide performance metrics, department workload distribution, and completion rates.
- **Search & Multi-Filtering**: Instant filtering by department, reporting manager, attendance status, and text search.

### 👔 2. Department Manager Workspace
- **Team Roster & Capacity**: Manage assigned team members (`manager_id` relationship) and track workload capacity.
- **Task Delegation & Tracking**: Create, assign, prioritize (High/Medium/Low), update, and audit log team tasks.
- **Leave Approvals**: Review and approve/reject team leave requests with manager feedback notes.
- **Attendance Insights**: View daily team check-ins, workday durations, and presence logs.

### 👤 3. Employee Workspace
- **Personal Dashboard**: Focused view of assigned tasks, today's attendance status, and personal leave history.
- **My Team Overview**: View assigned Reporting Manager and department teammates in a read-only view.
- **Time Clock / Attendance**: One-click check-in and check-out with automatic workday duration tracking.
- **Leave Applications**: Request time off with automatic duration calculation and conflict prevention.

---

## 🔐 Role-Based Access Hierarchy & Demo Credentials

| Role | Demo Email / ID | Password | Key Permissions & Navigation |
|---|---|---|---|
| **CEO / Admin** | `admin@workmate.io` (or `admin`) | `Admin@1234` | Dashboard, Managers, Employees, Leave Approvals, Attendance, Reports, Profile, Settings |
| **Manager** | `alex@workmate.io` (or `MGR-001`) | `Demo@1234` | Dashboard, Tasks, Employees, Leave Management, Attendance, Calendar, Reports, Profile |
| **Employee** | `sarah.jenkins@workmate.io` (or `EMP-001`) | `Emp@1234` | Dashboard, My Tasks, Leave Management, Attendance, Calendar, My Profile |

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React 19, Vite, Lucide Icons, Vanilla CSS Design System with dark mode and glassmorphism.
- **Backend**: Python 3 / Flask REST API, Session-based authentication with role-based decorators (`@login_required`, `@manager_required`, `@admin_required`).
- **Data Store**: Structured JSON persistence with relational integrity (`employee_id` $\leftrightarrow$ `manager_id` $\leftrightarrow$ `department`).
- **Deployment**: Configured for local running (port `5003`) and serverless deployment on **Vercel** (`vercel.json` + `api/index.py`).

---

## 🚀 Getting Started Locally

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Clone & Install Backend Dependencies
```bash
git clone <your-repo-url>
cd workmate
pip install -r requirements.txt
```

### 2. Install Frontend Dependencies & Build
```bash
cd frontend
npm install
npm run build
cd ..
```

### 3. Run the Application
```bash
python main.py
```
Open your browser and navigate to: **`http://localhost:5003`**

---

## ☁️ Vercel Deployment

WorkMate includes a pre-configured `vercel.json` and serverless API entrypoint at `api/index.py`.

To deploy to Vercel:
1. Push your code to GitHub.
2. Import your repository into [Vercel](https://vercel.com).
3. Vercel will automatically detect the configuration in `vercel.json` and deploy both the React frontend and Flask API.
