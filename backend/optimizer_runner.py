from __future__ import annotations

import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT / "backend"
OPTIMIZER_CPP = BACKEND_DIR / "optimizer.cpp"
OPTIMIZER_EXE = BACKEND_DIR / "optimizer.exe"


def ensure_optimizer() -> tuple[bool, str]:
    should_compile = not OPTIMIZER_EXE.exists() or OPTIMIZER_CPP.stat().st_mtime > OPTIMIZER_EXE.stat().st_mtime
    if not should_compile:
        return True, "compiled"

    completed = subprocess.run(
        ["g++", "-std=c++17", "-O2", str(OPTIMIZER_CPP), "-o", str(OPTIMIZER_EXE)],
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        return False, completed.stderr.strip() or "Compilation failed"
    return True, completed.stderr.strip() or "compiled"


def safe_name(name: str, fallback: str) -> str:
    cleaned = "_".join((name or fallback).strip().split())
    return cleaned or fallback


def build_student_payload(payload: dict) -> str:
    subjects = payload.get("subjects", [])
    max_time = max(1, int(payload.get("maxTime", 10)))
    lambda_value = float(payload.get("lambda", 0.5))
    daily_hours = max(1, int(payload.get("dailyHours", 4)))
    session_minutes = max(30, int(payload.get("sessionMinutes", 60)))
    break_minutes = max(0, int(payload.get("breakMinutes", 15)))
    start_hour = max(0, min(23, int(payload.get("startHour", 9))))
    end_hour = max(start_hour + 1, min(24, int(payload.get("endHour", 20))))

    lines = [f"0\n{len(subjects)} {max_time} {lambda_value} {daily_hours} {session_minutes} {break_minutes} {start_hour} {end_hour}"]
    for index, subject in enumerate(subjects):
        lines.append(
            " ".join(
                [
                    safe_name(str(subject.get("name", "Untitled")), f"subject_{index}"),
                    str(max(1, int(subject.get("credits", 1)))),
                    str(max(1, int(subject.get("time", 1)))),
                    str(max(1, int(subject.get("difficulty", 1)))),
                    str(max(1, int(subject.get("importance", 1)))),
                    str(max(1, int(subject.get("deadlineDays", 7)))),
                ]
            )
        )
    return "\n".join(lines) + "\n"


def build_corporate_payload(payload: dict) -> str:
    jobs = payload.get("jobs", [])
    lambda_value = float(payload.get("lambda", 0.5))
    lines = [f"1\n{len(jobs)} {lambda_value}"]
    for index, job in enumerate(jobs):
        start = max(0, min(23, int(job.get("start", 9))))
        end = max(start + 1, min(24, int(job.get("end", start + 1))))
        lines.append(
            " ".join(
                [
                    safe_name(str(job.get("name", "Untitled_Task")), f"job_{index}"),
                    str(start),
                    str(end),
                    str(max(1, int(job.get("profit", 1)))),
                    str(max(1, int(job.get("priority", 1)))),
                    str(max(1, int(job.get("stress", 1)))),
                ]
            )
        )
    return "\n".join(lines) + "\n"


def optimize(payload: dict) -> dict:
    ready, note = ensure_optimizer()
    if not ready:
        raise RuntimeError(note)

    mode = payload.get("mode", "student")
    raw_input = build_corporate_payload(payload) if mode == "corporate" else build_student_payload(payload)
    completed = subprocess.run(
        [str(OPTIMIZER_EXE)],
        input=raw_input,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.strip() or "Optimizer execution failed")
    result = json.loads(completed.stdout)
    result["engineNote"] = note or result.get("engineNote", "compiled")
    return result
