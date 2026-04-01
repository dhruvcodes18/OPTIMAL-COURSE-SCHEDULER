from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


from backend.optimizer_runner import optimize


def main() -> None:
    result = optimize(
        {
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
    assert "selected" in result
    assert "schedule" in result
    assert "paretoFrontier" in result
    print("Backend smoke test passed")


if __name__ == "__main__":
    main()
