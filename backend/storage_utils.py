"""
backend/storage_utils.py — Safe Storage & Serialization for Serverless / Cloud
Provides read_json_file and write_json_file with automatic fallback to /tmp
when deployed on read-only serverless environments like Vercel.
"""

import os
import json
import tempfile


def read_json_file(filepath: str) -> list:
    """
    Reads a JSON file. If an updated copy exists in /tmp, reads from /tmp first;
    otherwise reads from the bundled filepath.
    """
    basename = os.path.basename(filepath)
    tmp_path = os.path.join(tempfile.gettempdir(), basename)

    target_path = tmp_path if os.path.exists(tmp_path) else filepath
    if not os.path.exists(target_path):
        return []

    try:
        with open(target_path, "r", encoding="utf-8") as f:
            content = f.read().strip()
            return json.loads(content) if content else []
    except Exception:
        return []


def write_json_file(filepath: str, data) -> None:
    """
    Writes data to filepath. If write fails due to a read-only filesystem
    (e.g., on Vercel AWS Lambda /var/task), seamlessly writes to /tmp instead.
    """
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            return
    except (OSError, PermissionError):
        pass

    # Fallback to temp directory (for Vercel / serverless read-only environments)
    basename = os.path.basename(filepath)
    tmp_path = os.path.join(tempfile.gettempdir(), basename)
    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Warning: Failed to write to {tmp_path}: {e}")
