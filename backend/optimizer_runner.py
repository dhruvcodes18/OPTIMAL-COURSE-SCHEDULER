from __future__ import annotations

import math
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT / "backend"
OPTIMIZER_CPP = BACKEND_DIR / "optimizer.cpp"
OPTIMIZER_EXE = BACKEND_DIR / "optimizer.exe"


@dataclass
class Subject:
    name: str
    credits: int
    time: int
    difficulty: int
    importance: int
    deadlineDays: int


def normalize_subject(raw: dict) -> Subject:
    return Subject(
        name=str(raw.get("name", "Untitled")).strip() or "Untitled",
        credits=max(1, int(raw.get("credits", 1))),
        time=max(1, int(raw.get("time", 1))),
        difficulty=max(1, int(raw.get("difficulty", 1))),
        importance=max(1, int(raw.get("importance", 1))),
        deadlineDays=max(1, int(raw.get("deadlineDays", 7))),
    )


def score_subject(subject: Subject, lambda_value: float) -> float:
    urgency_bonus = max(0.0, 8.0 - subject.deadlineDays) * 0.2
    return (
        subject.credits
        + subject.importance * 0.35
        + urgency_bonus
        - (lambda_value * subject.difficulty * 0.4)
    )


def ensure_optimizer() -> tuple[bool, str]:
    if OPTIMIZER_EXE.exists():
        return True, "compiled"

    try:
        completed = subprocess.run(
            ["g++", "-std=c++17", "-O2", str(OPTIMIZER_CPP), "-o", str(OPTIMIZER_EXE)],
            capture_output=True,
            check=True,
            text=True,
        )
        return True, completed.stderr.strip() or "compiled"
    except Exception as exc:
        return False, str(exc)


def solve_with_cpp(subjects: list[Subject], max_time: int, lambda_value: float) -> list[int]:
    lines = [f"{len(subjects)} {max_time} {lambda_value}"]
    for index, subject in enumerate(subjects):
        safe_name = subject.name.replace(" ", "_") or f"subject_{index}"
        lines.append(
            f"{safe_name} {subject.credits} {subject.time} "
            f"{subject.difficulty} {subject.importance} {subject.deadlineDays}"
        )

    completed = subprocess.run(
        [str(OPTIMIZER_EXE)],
        input="\n".join(lines) + "\n",
        capture_output=True,
        check=True,
        text=True,
    )
    output_lines = [line.strip() for line in completed.stdout.splitlines() if line.strip()]
    if len(output_lines) < 2 or not output_lines[1]:
        return []
    return [int(token) for token in output_lines[1].split()]


def solve_with_python(subjects: list[Subject], max_time: int, lambda_value: float) -> list[int]:
    n = len(subjects)
    dp = [0.0] * (max_time + 1)
    take = [[False] * (max_time + 1) for _ in range(n)]

    for i, subject in enumerate(subjects):
        value = score_subject(subject, lambda_value)
        for w in range(max_time, subject.time - 1, -1):
            candidate = dp[w - subject.time] + value
            if candidate > dp[w]:
                dp[w] = candidate
                take[i][w] = True

    best_w = max(range(max_time + 1), key=lambda w: dp[w])
    selected = []
    w = best_w
    for i in range(n - 1, -1, -1):
        if w >= 0 and take[i][w]:
            selected.append(i)
            w -= subjects[i].time
    selected.reverse()
    return selected


def pareto_frontier(subjects: list[Subject], max_time: int) -> list[dict]:
    frontier: list[tuple[int, int, int, list[int]]] = [(0, 0, 0, [])]

    for idx, subject in enumerate(subjects):
        candidate_states = list(frontier)
        for credits, difficulty, time_used, chosen in frontier:
            next_time = time_used + subject.time
            if next_time > max_time:
                continue
            candidate_states.append(
                (
                    credits + subject.credits + subject.importance,
                    difficulty + subject.difficulty,
                    next_time,
                    chosen + [idx],
                )
            )

        reduced = []
        for candidate in candidate_states:
            dominated = False
            for other in candidate_states:
                if other is candidate:
                    continue
                better_or_equal = (
                    other[0] >= candidate[0]
                    and other[1] <= candidate[1]
                    and other[2] <= candidate[2]
                )
                strictly_better = (
                    other[0] > candidate[0]
                    or other[1] < candidate[1]
                    or other[2] < candidate[2]
                )
                if better_or_equal and strictly_better:
                    dominated = True
                    break
            if not dominated:
                reduced.append(candidate)
        frontier = reduced

    unique = {}
    for credits, difficulty, time_used, chosen in frontier:
        unique[(credits, difficulty, time_used)] = chosen

    ordered = sorted(unique.items(), key=lambda item: (-item[0][0], item[0][1], item[0][2]))
    result = []
    for (credits, difficulty, time_used), chosen in ordered[:12]:
        result.append(
            {
                "credits": credits,
                "difficulty": difficulty,
                "time": time_used,
                "subjects": [asdict(subjects[idx]) for idx in chosen],
            }
        )
    return result


def minutes_to_label(total_minutes: int) -> str:
    hour = total_minutes // 60
    minute = total_minutes % 60
    suffix = "AM" if hour < 12 else "PM"
    display_hour = hour % 12
    if display_hour == 0:
        display_hour = 12
    return f"{display_hour}:{minute:02d} {suffix}"


def generate_schedule(
    selected: list[Subject],
    daily_hours: int,
    session_minutes: int,
    break_minutes: int,
    start_hour: int,
    end_hour: int,
) -> list[dict]:
    if not selected:
        return []

    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    max_sessions_per_day = max(1, int((daily_hours * 60) // max(1, session_minutes + break_minutes)))
    session_hours = session_minutes / 60

    queue = []
    for subject in sorted(
        selected,
        key=lambda item: (item.deadlineDays, -(item.credits + item.importance), item.difficulty),
    ):
        remaining = max(1, math.ceil(subject.time / session_hours))
        queue.append({"subject": subject, "remaining": remaining})

    schedule = []
    day_index = 0
    while any(item["remaining"] > 0 for item in queue):
        current_day = days[day_index % len(days)]
        cursor_minutes = start_hour * 60
        sessions_used = 0
        consecutive_subject = None
        consecutive_count = 0

        for item in queue:
            if item["remaining"] <= 0 or sessions_used >= max_sessions_per_day:
                continue

            subject = item["subject"]
            if consecutive_subject == subject.name and consecutive_count >= 2:
                continue

            end_minutes = cursor_minutes + session_minutes
            if end_minutes > end_hour * 60:
                break

            schedule.append(
                {
                    "day": current_day,
                    "subject": subject.name,
                    "start": minutes_to_label(cursor_minutes),
                    "end": minutes_to_label(end_minutes),
                    "difficulty": subject.difficulty,
                    "credits": subject.credits,
                }
            )

            item["remaining"] -= 1
            sessions_used += 1
            cursor_minutes = end_minutes + break_minutes
            if consecutive_subject == subject.name:
                consecutive_count += 1
            else:
                consecutive_subject = subject.name
                consecutive_count = 1

        day_index += 1
        if day_index > 20:
            break

    return schedule


def optimize(payload: dict) -> dict:
    subjects = [normalize_subject(item) for item in payload.get("subjects", [])]
    max_time = max(1, int(payload.get("maxTime", 10)))
    lambda_value = float(payload.get("lambda", 0.5))
    daily_hours = max(1, int(payload.get("dailyHours", 4)))
    session_minutes = max(30, int(payload.get("sessionMinutes", 60)))
    break_minutes = max(0, int(payload.get("breakMinutes", 15)))
    start_hour = max(0, min(23, int(payload.get("startHour", 9))))
    end_hour = max(start_hour + 1, min(24, int(payload.get("endHour", 20))))

    optimizer_ready, optimizer_note = ensure_optimizer()
    if optimizer_ready:
        try:
            selected_indices = solve_with_cpp(subjects, max_time, lambda_value)
            engine = "cpp"
        except Exception:
            selected_indices = solve_with_python(subjects, max_time, lambda_value)
            engine = "python-fallback"
    else:
        selected_indices = solve_with_python(subjects, max_time, lambda_value)
        engine = "python-fallback"

    selected_index_set = set(selected_indices)
    selected = [subjects[idx] for idx in selected_indices]
    rejected = [subject for idx, subject in enumerate(subjects) if idx not in selected_index_set]

    total_credits = sum(subject.credits for subject in selected)
    total_time = sum(subject.time for subject in selected)
    total_difficulty = sum(subject.difficulty for subject in selected)
    total_importance = sum(subject.importance for subject in selected)

    schedule = generate_schedule(
        selected,
        daily_hours=daily_hours,
        session_minutes=session_minutes,
        break_minutes=break_minutes,
        start_hour=start_hour,
        end_hour=end_hour,
    )

    return {
        "engine": engine,
        "engineNote": optimizer_note,
        "selected": [asdict(subject) for subject in selected],
        "rejected": [asdict(subject) for subject in rejected],
        "summary": {
            "totalCredits": total_credits,
            "totalTime": total_time,
            "totalDifficulty": total_difficulty,
            "totalImportance": total_importance,
            "objectiveScore": round(
                total_credits + (total_importance * 0.35) - (lambda_value * total_difficulty * 0.4),
                2,
            ),
        },
        "schedule": schedule,
        "paretoFrontier": pareto_frontier(subjects, max_time),
        "inputs": {
            "maxTime": max_time,
            "lambda": lambda_value,
            "dailyHours": daily_hours,
            "sessionMinutes": session_minutes,
            "breakMinutes": break_minutes,
            "startHour": start_hour,
            "endHour": end_hour,
        },
    }
