"""
backend/storage_utils.py — Safe Storage & Serialization for Local and Serverless Environments
Provides robust read_json_file and write_json_file that automatically synchronizes
with /tmp on read-only environments (like Vercel Lambda) while preventing stale reads.
"""

import os
import json
import tempfile


def get_effective_path(filepath: str) -> str:
    """Returns the most recent file path between original file and temp copy."""
    basename = os.path.basename(filepath)
    tmp_path = os.path.join(tempfile.gettempdir(), basename)

    if os.path.exists(tmp_path) and os.path.exists(filepath):
        try:
            if os.path.getmtime(tmp_path) > os.path.getmtime(filepath):
                return tmp_path
            return filepath
        except Exception:
            return filepath
    elif os.path.exists(tmp_path):
        return tmp_path
    return filepath


def read_json_file(filepath: str) -> list:
    """Reads JSON from the most up-to-date storage location."""
    target_path = get_effective_path(filepath)
    if not os.path.exists(target_path):
        # If target_path is tmp and doesn't exist, check original
        if os.path.exists(filepath):
            target_path = filepath
        else:
            return []

    try:
        with open(target_path, "r", encoding="utf-8") as f:
            content = f.read().strip()
            return json.loads(content) if content else []
    except Exception:
        # Fallback to original if reading target failed
        if target_path != filepath and os.path.exists(filepath):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    return json.loads(content) if content else []
            except Exception:
                return []
        return []


def write_json_file(filepath: str, data) -> None:
    """Writes data to primary filepath and synchronizes to /tmp."""
    written = False
    basename = os.path.basename(filepath)
    tmp_path = os.path.join(tempfile.gettempdir(), basename)

    # 1. Attempt writing to workspace filepath
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        written = True
    except (OSError, PermissionError):
        pass

    # 2. Synchronize to temp directory
    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        written = True
    except Exception as e:
        if not written:
            print(f"Warning: Failed to write to {tmp_path}: {e}")
