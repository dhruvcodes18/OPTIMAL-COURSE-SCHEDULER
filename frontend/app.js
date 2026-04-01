const state = {
  mode: "student",
  studentItems: [],
  corporateItems: [],
  result: null,
};

const studentDemo = [
  { name: "Algorithms", credits: 4, time: 6, difficulty: 4, importance: 5, deadlineDays: 4 },
  { name: "Databases", credits: 3, time: 5, difficulty: 3, importance: 4, deadlineDays: 6 },
  { name: "Operating Systems", credits: 4, time: 7, difficulty: 5, importance: 5, deadlineDays: 8 },
  { name: "Machine Learning", credits: 5, time: 8, difficulty: 5, importance: 5, deadlineDays: 5 },
  { name: "Software Engineering", credits: 3, time: 3, difficulty: 2, importance: 4, deadlineDays: 12 },
];

const corporateDemo = [
  { name: "Client Strategy", start: 9, end: 11, profit: 8, priority: 5, stress: 3 },
  { name: "Board Review", start: 10, end: 13, profit: 9, priority: 4, stress: 5 },
  { name: "Budget Sync", start: 13, end: 15, profit: 7, priority: 4, stress: 2 },
  { name: "Team Workshop", start: 15, end: 17, profit: 6, priority: 5, stress: 2 },
  { name: "Vendor Negotiation", start: 17, end: 19, profit: 8, priority: 4, stress: 4 },
];

const el = {
  studentModeBtn: document.querySelector("#studentModeBtn"),
  corporateModeBtn: document.querySelector("#corporateModeBtn"),
  plannerTitle: document.querySelector("#plannerTitle"),
  plannerSubtitle: document.querySelector("#plannerSubtitle"),
  formHeading: document.querySelector("#formHeading"),
  studentForm: document.querySelector("#studentForm"),
  corporateForm: document.querySelector("#corporateForm"),
  seedBtn: document.querySelector("#seedBtn"),
  lambda: document.querySelector("#lambda"),
  lambdaValue: document.querySelector("#lambdaValue"),
  optimizeBtn: document.querySelector("#optimizeBtn"),
  dataTableHead: document.querySelector("#dataTableHead"),
  courseTableBody: document.querySelector("#courseTableBody"),
  courseCount: document.querySelector("#courseCount"),
  tableHeading: document.querySelector("#tableHeading"),
  summaryCards: document.querySelector("#summaryCards"),
  selectedHeading: document.querySelector("#selectedHeading"),
  rejectedHeading: document.querySelector("#rejectedHeading"),
  selectedList: document.querySelector("#selectedList"),
  rejectedList: document.querySelector("#rejectedList"),
  paretoChart: document.querySelector("#paretoChart"),
  paretoCaption: document.querySelector("#paretoCaption"),
  scheduleHeading: document.querySelector("#scheduleHeading"),
  scheduleCaption: document.querySelector("#scheduleCaption"),
  scheduleView: document.querySelector("#scheduleView"),
  resultMeta: document.querySelector("#resultMeta"),
  engineBadge: document.querySelector("#engineBadge"),
  healthStatus: document.querySelector("#healthStatus"),
  maxTimeWrap: document.querySelector("#maxTimeWrap"),
  dailyHoursWrap: document.querySelector("#dailyHoursWrap"),
  sessionMinutesWrap: document.querySelector("#sessionMinutesWrap"),
  breakMinutesWrap: document.querySelector("#breakMinutesWrap"),
  startHourWrap: document.querySelector("#startHourWrap"),
  endHourWrap: document.querySelector("#endHourWrap"),
};

const modeConfig = {
  student: {
    title: "Student Planner",
    subtitle: "Optimize courses by balancing credits, time, deadlines, and cognitive load.",
    formHeading: "Add Course",
    tableHeading: "Courses",
    countLabel: "courses",
    selectedHeading: "Selected Courses",
    rejectedHeading: "Deferred Courses",
    scheduleHeading: "Study Schedule",
    scheduleCaption: "Break-aware weekly study plan",
    showStudentControls: true,
  },
  corporate: {
    title: "Corporate Planner",
    subtitle: "Use weighted interval scheduling to choose the best non-overlapping jobs across a workday.",
    formHeading: "Add Job",
    tableHeading: "Jobs",
    countLabel: "jobs",
    selectedHeading: "Selected Jobs",
    rejectedHeading: "Deferred Jobs",
    scheduleHeading: "Workday Schedule",
    scheduleCaption: "Non-overlapping jobs chosen by dynamic programming",
    showStudentControls: false,
  },
};

function init() {
  bindEvents();
  renderMode();
  renderTable();
  checkHealth();
}

function bindEvents() {
  el.studentModeBtn.addEventListener("click", () => switchMode("student"));
  el.corporateModeBtn.addEventListener("click", () => switchMode("corporate"));

  el.studentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(el.studentForm);
    state.studentItems.push({
      name: String(formData.get("name")).trim(),
      credits: Number(formData.get("credits")),
      time: Number(formData.get("time")),
      difficulty: Number(formData.get("difficulty")),
      importance: Number(formData.get("importance")),
      deadlineDays: Number(formData.get("deadlineDays")),
    });
    el.studentForm.reset();
    document.querySelector("#credits").value = "3";
    document.querySelector("#time").value = "4";
    document.querySelector("#difficulty").value = "3";
    document.querySelector("#importance").value = "3";
    document.querySelector("#deadlineDays").value = "7";
    renderTable();
  });

  el.corporateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(el.corporateForm);
    state.corporateItems.push({
      name: String(formData.get("name")).trim(),
      start: Number(formData.get("start")),
      end: Number(formData.get("end")),
      profit: Number(formData.get("profit")),
      priority: Number(formData.get("priority")),
      stress: Number(formData.get("stress")),
    });
    el.corporateForm.reset();
    document.querySelector("#jobStart").value = "9";
    document.querySelector("#jobEnd").value = "11";
    document.querySelector("#profit").value = "8";
    document.querySelector("#priority").value = "4";
    document.querySelector("#stress").value = "3";
    renderTable();
  });

  el.seedBtn.addEventListener("click", () => {
    if (state.mode === "student") {
      state.studentItems = JSON.parse(JSON.stringify(studentDemo));
    } else {
      state.corporateItems = JSON.parse(JSON.stringify(corporateDemo));
    }
    renderTable();
  });

  el.lambda.addEventListener("input", () => {
    el.lambdaValue.textContent = Number(el.lambda.value).toFixed(1);
  });

  el.optimizeBtn.addEventListener("click", optimizePlan);
}

function currentItems() {
  return state.mode === "student" ? state.studentItems : state.corporateItems;
}

function switchMode(mode) {
  if (state.mode === mode) {
    return;
  }
  state.mode = mode;
  state.result = null;
  renderMode();
  renderTable();
  clearResults();
}

function renderMode() {
  const config = modeConfig[state.mode];
  el.studentModeBtn.classList.toggle("active", state.mode === "student");
  el.corporateModeBtn.classList.toggle("active", state.mode === "corporate");
  el.plannerTitle.textContent = config.title;
  el.plannerSubtitle.textContent = config.subtitle;
  el.formHeading.textContent = config.formHeading;
  el.tableHeading.textContent = config.tableHeading;
  el.selectedHeading.textContent = config.selectedHeading;
  el.rejectedHeading.textContent = config.rejectedHeading;
  el.scheduleHeading.textContent = config.scheduleHeading;
  el.scheduleCaption.textContent = config.scheduleCaption;
  el.studentForm.classList.toggle("visible-form", state.mode === "student");
  el.studentForm.classList.toggle("hidden-form", state.mode !== "student");
  el.corporateForm.classList.toggle("visible-form", state.mode === "corporate");
  el.corporateForm.classList.toggle("hidden-form", state.mode !== "corporate");

  [el.maxTimeWrap, el.dailyHoursWrap, el.sessionMinutesWrap, el.breakMinutesWrap, el.startHourWrap, el.endHourWrap].forEach((node) => {
    node.classList.toggle("hidden-control", !config.showStudentControls);
  });

  renderTableHead();
}

function renderTableHead() {
  if (state.mode === "student") {
    el.dataTableHead.innerHTML = `
      <tr>
        <th>Name</th>
        <th>Credits</th>
        <th>Time</th>
        <th>Difficulty</th>
        <th>Importance</th>
        <th>Deadline</th>
        <th></th>
      </tr>
    `;
    return;
  }

  el.dataTableHead.innerHTML = `
    <tr>
      <th>Name</th>
      <th>Start</th>
      <th>End</th>
      <th>Profit</th>
      <th>Priority</th>
      <th>Stress</th>
      <th></th>
    </tr>
  `;
}

function renderTable() {
  const items = currentItems();
  const countLabel = modeConfig[state.mode].countLabel;
  el.courseCount.textContent = `${items.length} ${countLabel}`;

  if (!items.length) {
    el.courseTableBody.innerHTML = `<tr><td colspan="7" class="micro-note">No ${countLabel} added yet. Use the form above or load demo data.</td></tr>`;
    return;
  }

  el.courseTableBody.innerHTML = items
    .map((item, index) => state.mode === "student" ? studentRow(item, index) : corporateRow(item, index))
    .join("");

  document.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      currentItems().splice(Number(button.dataset.remove), 1);
      renderTable();
    });
  });
}

function studentRow(item, index) {
  return `
    <tr>
      <td>${escapeHtml(item.name)}</td>
      <td>${item.credits}</td>
      <td>${item.time}h</td>
      <td>${item.difficulty}/5</td>
      <td>${item.importance}/5</td>
      <td>${item.deadlineDays}d</td>
      <td><button class="table-action" data-remove="${index}" type="button">Remove</button></td>
    </tr>
  `;
}

function corporateRow(item, index) {
  return `
    <tr>
      <td>${escapeHtml(item.name)}</td>
      <td>${formatHour(item.start)}</td>
      <td>${formatHour(item.end)}</td>
      <td>${item.profit}</td>
      <td>${item.priority}/5</td>
      <td>${item.stress}/5</td>
      <td><button class="table-action" data-remove="${index}" type="button">Remove</button></td>
    </tr>
  `;
}

function clearResults() {
  el.resultMeta.textContent = "Awaiting optimization";
  el.summaryCards.innerHTML = "";
  el.selectedList.className = "chip-list empty-state";
  el.selectedList.textContent = "No result yet";
  el.rejectedList.className = "chip-list empty-state";
  el.rejectedList.textContent = "No result yet";
  el.paretoChart.className = "pareto-chart empty-state";
  el.paretoChart.textContent = "Run optimization to see trade-offs";
  el.scheduleView.className = "schedule-grid empty-state";
  el.scheduleView.textContent = "Run optimization to generate a schedule";
}

async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    el.engineBadge.textContent = `Engine: ${data.optimizerReady ? "ready" : "build failed"}`;
    el.healthStatus.textContent = data.optimizerReady ? "C++ optimizer available" : data.optimizerNote;
  } catch (error) {
    el.engineBadge.textContent = "Engine: unavailable";
    el.healthStatus.textContent = "Backend not reachable";
  }
}

async function optimizePlan() {
  if (!currentItems().length) {
    alert(`Add at least one ${modeConfig[state.mode].countLabel.slice(0, -1)} before optimizing.`);
    return;
  }

  el.optimizeBtn.disabled = true;
  el.optimizeBtn.textContent = "Optimizing...";

  const payload = state.mode === "student"
    ? {
        mode: "student",
        subjects: state.studentItems,
        lambda: Number(el.lambda.value),
        maxTime: Number(document.querySelector("#maxTime").value),
        dailyHours: Number(document.querySelector("#dailyHours").value),
        sessionMinutes: Number(document.querySelector("#sessionMinutes").value),
        breakMinutes: Number(document.querySelector("#breakMinutes").value),
        startHour: Number(document.querySelector("#startHour").value),
        endHour: Number(document.querySelector("#endHour").value),
      }
    : {
        mode: "corporate",
        jobs: state.corporateItems,
        lambda: Number(el.lambda.value),
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
    el.optimizeBtn.textContent = "Optimize Plan";
  }
}

function renderResults() {
  const { summary, selected, rejected, paretoFrontier, schedule, engine, resultLabels } = state.result;
  el.resultMeta.textContent = `Computed with ${engine} engine`;
  el.selectedHeading.textContent = resultLabels.selected;
  el.rejectedHeading.textContent = resultLabels.rejected;
  el.paretoCaption.textContent = `${resultLabels.paretoY} vs ${resultLabels.paretoX}`;

  el.summaryCards.innerHTML = summary.cards
    .map((card) => `
      <div class="summary-card">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(String(card.value))}</strong>
      </div>
    `)
    .join("");

  el.selectedList.className = "chip-list";
  el.selectedList.innerHTML = selected.map((item) => renderChip(item)).join("");

  el.rejectedList.className = "chip-list";
  el.rejectedList.innerHTML = rejected.length
    ? rejected.map((item) => renderChip(item)).join("")
    : `<div class="chip"><strong>${escapeHtml(resultLabels.emptyRejected)}</strong><span>${escapeHtml(resultLabels.emptyRejectedBody)}</span></div>`;

  renderPareto(paretoFrontier, resultLabels);
  renderSchedule(schedule);
}

function renderChip(item) {
  if (state.result.mode === "student") {
    return `
      <div class="chip">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${item.credits} credits | ${item.time}h | difficulty ${item.difficulty}/5 | importance ${item.importance}/5</span>
      </div>
    `;
  }
  return `
    <div class="chip">
      <strong>${escapeHtml(item.name)}</strong>
      <span>${formatHour(item.start)}-${formatHour(item.end)} | profit ${item.profit} | priority ${item.priority}/5 | stress ${item.stress}/5</span>
    </div>
  `;
}

function renderPareto(frontier, labels) {
  if (!frontier.length) {
    el.paretoChart.className = "pareto-chart empty-state";
    el.paretoChart.textContent = "No frontier data available";
    return;
  }

  const width = 640;
  const height = 320;
  const padding = 42;
  const maxValue = Math.max(...frontier.map((item) => item.value), 1);
  const maxStress = Math.max(...frontier.map((item) => item.stressOrDifficulty), 1);
  const maxTime = Math.max(...frontier.map((item) => item.time), 1);

  const points = frontier.map((item, index) => {
    const x = padding + (item.time / maxTime) * (width - padding * 2);
    const y = height - padding - (item.value / maxValue) * (height - padding * 2);
    const radius = 6 + (item.stressOrDifficulty / maxStress) * 9;
    return `
      <circle class="pareto-point" cx="${x}" cy="${y}" r="${radius}">
        <title>Option ${index + 1}: value ${item.value}, stress ${item.stressOrDifficulty}, time ${item.time}</title>
      </circle>
      <text class="pareto-label" x="${x + 10}" y="${y - 8}">P${index + 1}</text>
    `;
  }).join("");

  el.paretoChart.className = "pareto-chart";
  el.paretoChart.innerHTML = `
    <svg class="pareto-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Pareto frontier chart">
      <line class="axis" x1="${padding}" y1="${height - padding}" x2="${width - padding / 2}" y2="${height - padding}"></line>
      <line class="axis" x1="${padding}" y1="${padding / 2}" x2="${padding}" y2="${height - padding}"></line>
      <text class="pareto-label" x="${width / 2 - 24}" y="${height - 8}">${escapeHtml(labels.paretoX)}</text>
      <text class="pareto-label" x="8" y="${height / 2}">${escapeHtml(labels.paretoY)}</text>
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

  const dayOrder = state.result.mode === "corporate" ? ["Workday"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const grouped = {};
  for (const item of schedule) {
    if (!grouped[item.day]) {
      grouped[item.day] = [];
    }
    grouped[item.day].push(item);
  }

  el.scheduleView.className = state.result.mode === "corporate" ? "schedule-grid corporate-grid" : "schedule-grid";
  el.scheduleView.innerHTML = dayOrder
    .map((day) => {
      const entries = grouped[day] || [];
      return `
        <div class="day-column">
          <h3>${escapeHtml(day)}</h3>
          ${entries.length ? entries.map((item) => `
            <div class="session-card">
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.start)} - ${escapeHtml(item.end)}</span>
              <span>${escapeHtml(item.metaPrimary)}</span>
              <span>${escapeHtml(item.metaSecondary)}</span>
            </div>
          `).join("") : `<p class="micro-note">Recovery or buffer block.</p>`}
        </div>
      `;
    })
    .join("");
}

function formatHour(hour) {
  const suffix = hour < 12 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00 ${suffix}`;
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
