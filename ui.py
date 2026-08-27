from flask import Flask, render_template, request, jsonify
from task_manager import TaskManager, TaskManagerException

app = Flask(__name__)
task_manager = TaskManager()

@app.route('/')
def index():
    """Serves the main application page."""
    return render_template('index.html')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """Gets and filters tasks."""
    employee = request.args.get('employee', '').strip()
    status = request.args.get('status', '').strip()
    priority = request.args.get('priority', '').strip()
    
    try:
        tasks = task_manager.get_all_tasks(
            employee_search=employee if employee else None,
            status_filter=status if status else None,
            priority_filter=priority if priority else None
        )
        return jsonify(tasks), 200
    except TaskManagerException as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "An internal error occurred while loading tasks."}), 500

@app.route('/api/tasks', methods=['POST'])
def add_task():
    """Endpoint to create a new task."""
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json."}), 400
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided."}), 400
        
    try:
        new_task = task_manager.add_task(data)
        return jsonify(new_task), 201
    except TaskManagerException as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"An error occurred while creating the task: {str(e)}"}), 500

@app.route('/api/tasks/<task_id>', methods=['PUT'])
def update_task(task_id):
    """Endpoint to update an existing task."""
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json."}), 400
        
    data = request.get_json()
    if not data:
        return jsonify({"error": "No updates provided."}), 400

    try:
        updated_task = task_manager.update_task(task_id, data)
        return jsonify(updated_task), 200
    except TaskManagerException as e:
        status_code = 404 if "not found" in str(e).lower() else 400
        return jsonify({"error": str(e)}), status_code
    except Exception as e:
        return jsonify({"error": f"An error occurred while updating the task: {str(e)}"}), 500

@app.route('/api/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    """Endpoint to delete a task."""
    try:
        deleted_task = task_manager.delete_task(task_id)
        return jsonify({
            "message": f"Task '{task_id}' was successfully deleted.",
            "task": deleted_task
        }), 200
    except TaskManagerException as e:
        status_code = 404 if "not found" in str(e).lower() else 400
        return jsonify({"error": str(e)}), status_code
    except Exception as e:
        return jsonify({"error": f"An error occurred while deleting the task: {str(e)}"}), 500
