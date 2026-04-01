from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


from backend.optimizer_runner import optimize


def main() -> None:
    student_result = optimize(
        {
            "mode": "student",
            "subjects": [
                {
                    "name": "Algorithms",
                    "credits": 4,
                    "time": 6,
                    "difficulty": 4,
                    "importance": 5,
                    "deadlineDays": 4,
                },
                {
                    "name": "Databases",
                    "credits": 3,
                    "time": 5,
                    "difficulty": 3,
                    "importance": 4,
                    "deadlineDays": 6,
                },
                {
                    "name": "AI",
                    "credits": 5,
                    "time": 7,
                    "difficulty": 5,
                    "importance": 5,
                    "deadlineDays": 3,
                },
            ],
            "maxTime": 12,
            "lambda": 0.6,
            "dailyHours": 4,
            "sessionMinutes": 60,
            "breakMinutes": 15,
            "startHour": 9,
            "endHour": 19,
        }
    )
    assert student_result["mode"] == "student"
    assert student_result["selected"]
    assert student_result["schedule"]

    corporate_result = optimize(
        {
            "mode": "corporate",
            "jobs": [
                {"name": "ClientCall", "start": 9, "end": 11, "profit": 8, "priority": 5, "stress": 3},
                {"name": "QuarterlyReport", "start": 10, "end": 13, "profit": 9, "priority": 4, "stress": 4},
                {"name": "BudgetReview", "start": 13, "end": 15, "profit": 7, "priority": 4, "stress": 2},
                {"name": "TeamWorkshop", "start": 15, "end": 17, "profit": 6, "priority": 5, "stress": 2},
            ],
            "lambda": 0.5,
        }
    )
    assert corporate_result["mode"] == "corporate"
    assert corporate_result["selected"]
    assert corporate_result["schedule"]
    print("Backend smoke test passed for student and corporate modes")


if __name__ == "__main__":
    main()
