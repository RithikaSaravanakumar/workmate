"""
main.py — WorkMate Entry Point
Launches the WorkMate Python backend & React application at http://localhost:5003
Run with: python main.py
"""

from backend.main import create_app

app = create_app()

if __name__ == "__main__":
    print("=" * 60)
    print("  WorkMate — Employee Task & Leave Management")
    print("  Running at:  http://localhost:5003")
    print("  Manager Demo:   alex@workmate.io  /  Demo@1234")
    print("  Employee Demo:  sarah.jenkins@workmate.io  /  Emp@1234")
    print("=" * 60)
    app.run(host="127.0.0.1", port=5003, debug=True)
