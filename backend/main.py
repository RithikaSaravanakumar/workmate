"""
backend/main.py — WorkMate Flask Server
Serves REST API endpoints and hosts the built React Single Page Application.
Runs on port 5003 by default.
"""

import os
import secrets
from flask import Flask, send_from_directory, render_template_string
from backend.routes import bp
from backend.manager_store import seed_if_empty as seed_manager
from backend.employee_manager import seed_if_empty as seed_employees
from backend.attendance_manager import attendance_manager
from backend.task_manager import task_manager


def create_app() -> Flask:
    # Determine static/dist paths for React
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    dist_dir = os.path.join(backend_dir, "dist")
    static_dir = os.path.join(backend_dir, "static")

    app = Flask(__name__, static_folder=dist_dir if os.path.exists(dist_dir) else static_dir)
    app.secret_key = secrets.token_hex(32)

    # Register API blueprint
    app.register_blueprint(bp)

    # Seed demo manager, employees, attendance, and manager tasks if needed
    seed_manager()
    seed_employees("MGR-001")
    attendance_manager.seed_if_empty("MGR-001")
    task_manager.seed_manager_tasks_if_empty("MGR-001")

    # Serve React frontend
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        if path.startswith("api/"):
            return {"error": "API route not found"}, 404

        # Check if requested file exists in dist_dir (e.g. assets/...)
        if os.path.exists(os.path.join(dist_dir, path)) and path != "":
            return send_from_directory(dist_dir, path)

        # Serve index.html for React SPA client-side routing
        index_file = os.path.join(dist_dir, "index.html")
        if os.path.exists(index_file):
            return send_from_directory(dist_dir, "index.html")

        # Fallback if React hasn't been built yet
        return render_template_string("""
            <!DOCTYPE html>
            <html>
            <head><title>WorkMate</title></head>
            <body style="font-family:sans-serif; background:#0B0F19; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh;">
                <div style="text-align:center;">
                    <h1>WorkMate System Initializing...</h1>
                    <p>Building React frontend. Please refresh in a moment.</p>
                </div>
            </body>
            </html>
        """)

    return app


if __name__ == "__main__":
    app = create_app()
    print("=" * 60)
    print("  WorkMate — Employee Task & Leave Management (React + Flask)")
    print("  Running at:  http://localhost:5003")
    print("  Manager Login:   alex@workmate.io  /  Demo@1234")
    print("  Employee Login:  sarah.jenkins@workmate.io  /  Emp@1234")
    print("=" * 60)
    app.run(host="127.0.0.1", port=5003, debug=True)
