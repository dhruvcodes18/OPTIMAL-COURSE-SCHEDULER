const state = {
  courses: [],
  result: null,
};

const demoCourses = [
  { name: "Algorithms", credits: 4, time: 6, difficulty: 4, importance: 5, deadlineDays: 4 },
  { name: "Databases", credits: 3, time: 5, difficulty: 3, importance: 4, deadlineDays: 6 },
  { name: "Operating Systems", credits: 4, time: 7, difficulty: 5, importance: 5, deadlineDays: 8 },
  { name: "Computer Networks", credits: 3, time: 4, difficulty: 3, importance: 3, deadlineDays: 10 },
  { name: "Machine Learning", credits: 5, time: 8, difficulty: 5, importance: 5, deadlineDays: 5 },
  { name: "Software Engineering", credits: 3, time: 3, difficulty: 2, importance: 4, deadlineDays: 12 },
];

const el = {
  courseForm: document.querySelector("#courseForm"),
  courseTableBody: document.querySelector("#courseTableBody"),
  courseCount: document.querySelector("#courseCount"),
  lambda: document.querySelector("#lambda"),
  lambdaValue: document.querySelector("#lambdaValue"),
  optimizeBtn: document.querySelector("#optimizeBtn"),
  seedBtn: document.querySelector("#seedBtn"),
  summaryCards: document.querySelector("#summaryCards"),
  selectedList: document.querySelector("#selectedList"),
  rejectedList: document.querySelector("#rejectedList"),
  paretoChart: document.querySelector("#paretoChart"),
  scheduleView: document.querySelector("#scheduleView"),
  resultMeta: document.querySelector("#resultMeta"),
  engineBadge: document.querySelector("#engineBadge"),
  healthStatus: document.querySelector("#healthStatus"),
};

function init() {
  bindEvents();
  renderCourses();
  checkHealth();
}

function bindEvents() {
  el.courseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(el.courseForm);
    state.courses.push({
      name: String(formData.get("name")).trim(),
      credits: Number(formData.get("credits")),
      time: Number(formData.get("time")),
      difficulty: Number(formData.get("difficulty")),
      importance: Number(formData.get("importance")),
      deadlineDays: Number(formData.get("deadlineDays")),
    });
    el.courseForm.reset();
    document.querySelector("#credits").value = "3";
    document.querySelector("#time").value = "4";
    document.querySelector("#difficulty").value = "3";
    document.querySelector("#importance").value = "3";
    document.querySelector("#deadlineDays").value = "7";
    renderCourses();
  });

  el.lambda.addEventListener("input", () => {
    el.lambdaValue.textContent = Number(el.lambda.value).toFixed(1);
  });

  el.optimizeBtn.addEventListener("click", optimizeCourses);
  el.seedBtn.addEventListener("click", () => {
    state.courses = JSON.parse(JSON.stringify(demoCourses));
    renderCourses();
  });
}

function renderCourses() {
  el.courseCount.textContent = `${state.courses.length} course${state.courses.length === 1 ? "" : "s"}`;
  if (!state.courses.length) {
    el.courseTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="micro-note">No courses added yet. Use the form above or load demo data.</td>
      </tr>
    `;
    return;
  }

  el.courseTableBody.innerHTML = state.courses
    .map(
      (course, index) => `
        <tr>
          <td>${escapeHtml(course.name)}</td>
          <td>${course.credits}</td>
          <td>${course.time}h</td>
          <td>${course.difficulty}/5</td>
          <td>${course.importance}/5</td>
          <td>${course.deadlineDays}d</td>
          <td><button class="table-action" data-remove="${index}" type="button">Remove</button></td>
        </tr>
      `
    )
    .join("");

  document.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      state.courses.splice(Number(button.dataset.remove), 1);
      renderCourses();
    });
  });
}

async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    el.engineBadge.textContent = `Engine: ${data.optimizerReady ? "ready" : "fallback"}`;
    el.healthStatus.textContent = data.optimizerReady ? "C++ optimizer available" : "Using Python fallback";
  } catch (error) {
    el.engineBadge.textContent = "Engine: unavailable";
    el.healthStatus.textContent = "Backend not reachable";
  }
}

async function optimizeCourses() {
  if (!state.courses.length) {
    alert("Add at least one course before optimizing.");
    return;
  }

  el.optimizeBtn.disabled = true;
  el.optimizeBtn.textContent = "Optimizing...";

  const payload = {
    subjects: state.courses,
    lambda: Number(el.lambda.value),
    maxTime: Number(document.querySelector("#maxTime").value),
    dailyHours: Number(document.querySelector("#dailyHours").value),
    sessionMinutes: Number(document.querySelector("#sessionMinutes").value),
    breakMinutes: Number(document.querySelector("#breakMinutes").value),
    startHour: Number(document.querySelector("#startHour").value),
    endHour: Number(document.querySelector("#endHour").value),
  };

  try {
    const response = await fetch("/api/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Optimization failed");
    }
    state.result = data;
    renderResults();
  } catch (error) {
    alert(error.message);
  } finally {
    el.optimizeBtn.disabled = false;
    el.optimizeBtn.textContent = "Optimize Schedule";
  }
}

function renderResults() {
  const { summary, selected, rejected, paretoFrontier, schedule, engine } = state.result;
  el.resultMeta.textContent = `Computed with ${engine} engine`;

  const cards = [
    ["Credits", summary.totalCredits],
    ["Study Time", `${summary.totalTime}h`],
    ["Difficulty", summary.totalDifficulty],
    ["Importance", summary.totalImportance],
    ["Objective Score", summary.objectiveScore],
  ];

  el.summaryCards.innerHTML = cards
    .map(
      ([label, value]) => `
        <div class="summary-card">
          <span>${label}</span>
          <strong>${value}</strong>
        </div>
      `
    )
    .join("");

  el.selectedList.classList.remove("empty-state");
  el.selectedList.innerHTML = renderChipSet(selected);

  el.rejectedList.classList.remove("empty-state");
  el.rejectedList.innerHTML = rejected.length
    ? renderChipSet(rejected)
    : `<div class="chip"><strong>All courses included</strong><span>No subject was deferred by the optimizer.</span></div>`;

  renderPareto(paretoFrontier);
  renderSchedule(schedule);
}

function renderChipSet(items) {
  return items
    .map(
      (item) => `
        <div class="chip">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${item.credits} credits • ${item.time}h • difficulty ${item.difficulty}/5 • importance ${item.importance}/5</span>
        </div>
      `
    )
    .join("");
}

function renderPareto(frontier) {
  if (!frontier.length) {
    el.paretoChart.className = "pareto-chart empty-state";
    el.paretoChart.textContent = "No frontier data available";
    return;
  }

  const width = 640;
  const height = 320;
  const padding = 42;
  const maxCredits = Math.max(...frontier.map((item) => item.credits), 1);
  const maxDifficulty = Math.max(...frontier.map((item) => item.difficulty), 1);
  const maxTime = Math.max(...frontier.map((item) => item.time), 1);

  const points = frontier
    .map((item, index) => {
      const x = padding + (item.time / maxTime) * (width - padding * 2);
      const y = height - padding - (item.credits / maxCredits) * (height - padding * 2);
      const radius = 6 + (item.difficulty / maxDifficulty) * 9;
      return `
        <circle class="pareto-point" cx="${x}" cy="${y}" r="${radius}">
          <title>Portfolio ${index + 1}: ${item.credits} credits, ${item.difficulty} difficulty, ${item.time}h</title>
        </circle>
        <text class="pareto-label" x="${x + 10}" y="${y - 8}">P${index + 1}</text>
      `;
    })
    .join("");

  el.paretoChart.className = "pareto-chart";
  el.paretoChart.innerHTML = `
    <svg class="pareto-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Pareto frontier chart">
      <line class="axis" x1="${padding}" y1="${height - padding}" x2="${width - padding / 2}" y2="${height - padding}"></line>
      <line class="axis" x1="${padding}" y1="${padding / 2}" x2="${padding}" y2="${height - padding}"></line>
      <text class="pareto-label" x="${width / 2 - 24}" y="${height - 8}">Time</text>
      <text class="pareto-label" x="8" y="${height / 2}">Credits</text>
      ${points}
    </svg>
  `;
}

function renderSchedule(schedule) {
  if (!schedule.length) {
    el.scheduleView.className = "schedule-grid empty-state";
    el.scheduleView.textContent = "No schedule could be generated from the current result";
    return;
  }

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const grouped = {};
  for (const item of schedule) {
    if (!grouped[item.day]) {
      grouped[item.day] = [];
    }
    grouped[item.day].push(item);
  }

  el.scheduleView.className = "schedule-grid";
  el.scheduleView.innerHTML = days
    .map((day) => {
      const entries = grouped[day] || [];
      return `
        <div class="day-column">
          <h3>${day}</h3>
          ${
            entries.length
              ? entries
                  .map(
                    (item) => `
                      <div class="session-card">
                        <strong>${escapeHtml(item.subject)}</strong>
                        <span>${item.start} - ${item.end}</span>
                        <span>Difficulty ${item.difficulty}/5 • ${item.credits} credits</span>
                      </div>
                    `
                  )
                  .join("")
              : `<p class="micro-note">Recovery or buffer day.</p>`
          }
        </div>
      `;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init();
