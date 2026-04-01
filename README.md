# Optimal Scheduler

# Optimal Course Scheduler & Job Planner 🚀

A smart decision-support web application built using **Dynamic Programming** and **Multi-Objective Optimization** to help users make better scheduling decisions under constraints.

This project now supports **two powerful functionalities** in one platform:

## 🎓 1. Student Course Scheduler
Designed for students who want to choose and schedule academic courses efficiently by balancing:

- 📚 Academic value
- ⏳ Available study time
- 🧠 Cognitive load / difficulty
- 📅 Deadlines and study planning

The system uses **0/1 Knapsack-based Dynamic Programming** to select the best combination of subjects and generates a study schedule with break-aware planning.

## 💼 2. Corporate Job Scheduler
Designed for working professionals who need to schedule jobs, meetings, or tasks efficiently during the workday by balancing:

- 💰 Profit / business value
- ⭐ Priority
- 😓 Stress / workload
- 🕒 Non-overlapping time intervals

This module uses **Weighted Interval Scheduling with Dynamic Programming** to select the optimal set of compatible jobs.

---

## ✨ Key Features

- 🔀 Dual-mode planner:
  - Student mode
  - Corporate mode
- ⚙️ C++-based optimization engine for core logic
- 🌐 Interactive frontend for real-time scheduling
- 📈 Pareto frontier visualization for trade-off analysis
- 📅 Automatic schedule generation
- 🎚 Adjustable penalty weight (`λ`) for stress/difficulty balancing
- 🧪 Backend-tested for both modes

---

## 🧠 Algorithms Used

### Student Scheduler
- 0/1 Knapsack Dynamic Programming
- Multi-objective scoring
- Pareto frontier analysis
- Study session packing

### Corporate Scheduler
- Weighted Interval Scheduling
- Dynamic Programming for job selection
- Trade-off analysis based on value vs stress

---

## 🏗 Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Python (thin API wrapper)
- **Core Logic:** C++
- **Version Control:** Git & GitHub

> Most of the execution and optimization logic is implemented in **C++** for performance and strong algorithmic design.

---

## ▶️ How to Run

# On powershell run:
"py run.py"
# Then open:

http://127.0.0.1:8000
