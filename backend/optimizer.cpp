#include <algorithm>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <tuple>
#include <vector>

using namespace std;

struct Subject {
    string name;
    int credits;
    int time;
    int difficulty;
    int importance;
    int deadlineDays;
};

struct Job {
    string name;
    int start;
    int end;
    int profit;
    int priority;
    int stress;
    int originalIndex;

    int duration() const {
        return max(0, end - start);
    }
};

struct ScheduleEntry {
    string day;
    string title;
    string start;
    string end;
    string metaPrimary;
    string metaSecondary;
};

struct FrontierState {
    int value;
    int stressOrDifficulty;
    int time;
    vector<int> chosen;
};

string escapeJson(const string& input) {
    string output;
    for (char ch : input) {
        switch (ch) {
            case '"': output += "\\\""; break;
            case '\\': output += "\\\\"; break;
            case '\n': output += "\\n"; break;
            case '\r': output += "\\r"; break;
            case '\t': output += "\\t"; break;
            default: output += ch; break;
        }
    }
    return output;
}

string minutesToLabel(int totalMinutes) {
    int hour = totalMinutes / 60;
    int minute = totalMinutes % 60;
    string suffix = hour < 12 ? "AM" : "PM";
    int displayHour = hour % 12;
    if (displayHour == 0) {
        displayHour = 12;
    }
    ostringstream out;
    out << displayHour << ":" << setw(2) << setfill('0') << minute << " " << suffix;
    return out.str();
}

double round2(double value) {
    return round(value * 100.0) / 100.0;
}

string numberToString(double value) {
    ostringstream out;
    out << fixed << setprecision(2) << value;
    string text = out.str();
    while (!text.empty() && text.back() == '0') {
        text.pop_back();
    }
    if (!text.empty() && text.back() == '.') {
        text.pop_back();
    }
    return text.empty() ? "0" : text;
}

string subjectJson(const Subject& subject) {
    ostringstream out;
    out << "{"
        << "\"name\":\"" << escapeJson(subject.name) << "\"," 
        << "\"credits\":" << subject.credits << ","
        << "\"time\":" << subject.time << ","
        << "\"difficulty\":" << subject.difficulty << ","
        << "\"importance\":" << subject.importance << ","
        << "\"deadlineDays\":" << subject.deadlineDays
        << "}";
    return out.str();
}

string jobJson(const Job& job) {
    ostringstream out;
    out << "{"
        << "\"name\":\"" << escapeJson(job.name) << "\"," 
        << "\"start\":" << job.start << ","
        << "\"end\":" << job.end << ","
        << "\"profit\":" << job.profit << ","
        << "\"priority\":" << job.priority << ","
        << "\"stress\":" << job.stress
        << "}";
    return out.str();
}

string scheduleJson(const ScheduleEntry& entry) {
    ostringstream out;
    out << "{"
        << "\"day\":\"" << escapeJson(entry.day) << "\"," 
        << "\"title\":\"" << escapeJson(entry.title) << "\"," 
        << "\"start\":\"" << escapeJson(entry.start) << "\"," 
        << "\"end\":\"" << escapeJson(entry.end) << "\"," 
        << "\"metaPrimary\":\"" << escapeJson(entry.metaPrimary) << "\"," 
        << "\"metaSecondary\":\"" << escapeJson(entry.metaSecondary) << "\""
        << "}";
    return out.str();
}

string cardJson(const string& label, const string& value) {
    ostringstream out;
    out << "{"
        << "\"label\":\"" << escapeJson(label) << "\"," 
        << "\"value\":\"" << escapeJson(value) << "\""
        << "}";
    return out.str();
}

template <typename T>
string joinJsonArray(const vector<T>& items, string (*serializer)(const T&)) {
    ostringstream out;
    out << "[";
    for (size_t i = 0; i < items.size(); i++) {
        if (i) out << ",";
        out << serializer(items[i]);
    }
    out << "]";
    return out.str();
}

string joinStringArray(const vector<string>& items) {
    ostringstream out;
    out << "[";
    for (size_t i = 0; i < items.size(); i++) {
        if (i) out << ",";
        out << items[i];
    }
    out << "]";
    return out.str();
}

double studentScore(const Subject& subject, double lambda) {
    double urgencyBonus = max(0.0, 8.0 - static_cast<double>(subject.deadlineDays)) * 0.2;
    return subject.credits + subject.importance * 0.35 + urgencyBonus - (lambda * subject.difficulty * 0.4);
}

double jobScore(const Job& job, double lambda) {
    return job.profit + (job.priority * 0.35) - (lambda * job.stress * 0.45);
}

vector<FrontierState> reduceFrontier(const vector<FrontierState>& states) {
    vector<FrontierState> reduced;
    for (size_t i = 0; i < states.size(); i++) {
        bool dominated = false;
        for (size_t j = 0; j < states.size(); j++) {
            if (i == j) continue;
            bool betterOrEqual = states[j].value >= states[i].value &&
                                 states[j].stressOrDifficulty <= states[i].stressOrDifficulty &&
                                 states[j].time <= states[i].time;
            bool strictlyBetter = states[j].value > states[i].value ||
                                  states[j].stressOrDifficulty < states[i].stressOrDifficulty ||
                                  states[j].time < states[i].time;
            if (betterOrEqual && strictlyBetter) {
                dominated = true;
                break;
            }
        }
        if (!dominated) {
            reduced.push_back(states[i]);
        }
    }
    sort(reduced.begin(), reduced.end(), [](const FrontierState& a, const FrontierState& b) {
        if (a.value != b.value) return a.value > b.value;
        if (a.stressOrDifficulty != b.stressOrDifficulty) return a.stressOrDifficulty < b.stressOrDifficulty;
        return a.time < b.time;
    });
    if (reduced.size() > 12) {
        reduced.resize(12);
    }
    return reduced;
}

vector<int> solveStudentSelection(const vector<Subject>& subjects, int maxTime, double lambda) {
    int n = static_cast<int>(subjects.size());
    vector<double> dp(maxTime + 1, 0.0);
    vector<vector<int>> keep(n, vector<int>(maxTime + 1, 0));

    for (int i = 0; i < n; i++) {
        double value = studentScore(subjects[i], lambda);
        for (int w = maxTime; w >= subjects[i].time; w--) {
            double candidate = dp[w - subjects[i].time] + value;
            if (candidate > dp[w]) {
                dp[w] = candidate;
                keep[i][w] = 1;
            }
        }
    }

    int bestW = 0;
    for (int w = 1; w <= maxTime; w++) {
        if (dp[w] > dp[bestW]) {
            bestW = w;
        }
    }

    vector<int> selected;
    int w = bestW;
    for (int i = n - 1; i >= 0; i--) {
        if (w >= 0 && keep[i][w]) {
            selected.push_back(i);
            w -= subjects[i].time;
        }
    }
    reverse(selected.begin(), selected.end());
    return selected;
}

int previousCompatible(const vector<Job>& jobs, int currentIndex) {
    int left = 0;
    int right = currentIndex - 1;
    int answer = -1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (jobs[mid].end <= jobs[currentIndex].start) {
            answer = mid;
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return answer;
}

vector<int> solveCorporateSelection(const vector<Job>& rawJobs, double lambda) {
    vector<Job> jobs = rawJobs;
    sort(jobs.begin(), jobs.end(), [](const Job& a, const Job& b) {
        if (a.end == b.end) return a.start < b.start;
        return a.end < b.end;
    });

    int n = static_cast<int>(jobs.size());
    vector<int> compatible(n, -1);
    for (int i = 0; i < n; i++) {
        compatible[i] = previousCompatible(jobs, i);
    }

    vector<double> dp(n, 0.0);
    for (int i = 0; i < n; i++) {
        double includeValue = jobScore(jobs[i], lambda) + (compatible[i] != -1 ? dp[compatible[i]] : 0.0);
        double excludeValue = i == 0 ? 0.0 : dp[i - 1];
        dp[i] = max(includeValue, excludeValue);
    }

    vector<int> selectedOriginal;
    int i = n - 1;
    while (i >= 0) {
        double includeValue = jobScore(jobs[i], lambda) + (compatible[i] != -1 ? dp[compatible[i]] : 0.0);
        double excludeValue = i == 0 ? 0.0 : dp[i - 1];
        if (includeValue > excludeValue) {
            selectedOriginal.push_back(jobs[i].originalIndex);
            i = compatible[i];
        } else {
            i--;
        }
    }
    reverse(selectedOriginal.begin(), selectedOriginal.end());
    return selectedOriginal;
}

vector<ScheduleEntry> buildStudentSchedule(
    const vector<Subject>& selected,
    int dailyHours,
    int sessionMinutes,
    int breakMinutes,
    int startHour,
    int endHour
) {
    vector<ScheduleEntry> schedule;
    if (selected.empty()) return schedule;

    vector<string> days = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"};
    int maxSessionsPerDay = max(1, (dailyHours * 60) / max(1, sessionMinutes + breakMinutes));
    double sessionHours = static_cast<double>(sessionMinutes) / 60.0;

    struct QueueItem { Subject subject; int remaining; };
    vector<QueueItem> queue;
    vector<Subject> ordered = selected;
    sort(ordered.begin(), ordered.end(), [](const Subject& a, const Subject& b) {
        if (a.deadlineDays != b.deadlineDays) return a.deadlineDays < b.deadlineDays;
        if (a.credits + a.importance != b.credits + b.importance) return (a.credits + a.importance) > (b.credits + b.importance);
        return a.difficulty < b.difficulty;
    });
    for (const Subject& subject : ordered) {
        int remaining = max(1, static_cast<int>(ceil(subject.time / sessionHours)));
        queue.push_back({subject, remaining});
    }

    int dayIndex = 0;
    while (true) {
        bool hasRemaining = false;
        for (const auto& item : queue) {
            if (item.remaining > 0) {
                hasRemaining = true;
                break;
            }
        }
        if (!hasRemaining || dayIndex > 20) break;

        string currentDay = days[dayIndex % days.size()];
        int cursorMinutes = startHour * 60;
        int sessionsUsed = 0;
        string consecutiveSubject;
        int consecutiveCount = 0;

        for (auto& item : queue) {
            if (item.remaining <= 0 || sessionsUsed >= maxSessionsPerDay) continue;
            if (consecutiveSubject == item.subject.name && consecutiveCount >= 2) continue;

            int endMinutes = cursorMinutes + sessionMinutes;
            if (endMinutes > endHour * 60) break;

            schedule.push_back({
                currentDay,
                item.subject.name,
                minutesToLabel(cursorMinutes),
                minutesToLabel(endMinutes),
                string("Difficulty ") + to_string(item.subject.difficulty) + "/5",
                string("Credits ") + to_string(item.subject.credits)
            });

            item.remaining--;
            sessionsUsed++;
            cursorMinutes = endMinutes + breakMinutes;
            if (consecutiveSubject == item.subject.name) {
                consecutiveCount++;
            } else {
                consecutiveSubject = item.subject.name;
                consecutiveCount = 1;
            }
        }
        dayIndex++;
    }

    return schedule;
}

vector<ScheduleEntry> buildCorporateSchedule(const vector<Job>& selected) {
    vector<Job> ordered = selected;
    sort(ordered.begin(), ordered.end(), [](const Job& a, const Job& b) {
        if (a.start != b.start) return a.start < b.start;
        return a.end < b.end;
    });
    vector<ScheduleEntry> schedule;
    for (const Job& job : ordered) {
        schedule.push_back({
            "Workday",
            job.name,
            minutesToLabel(job.start * 60),
            minutesToLabel(job.end * 60),
            string("Profit ") + to_string(job.profit),
            string("Priority ") + to_string(job.priority) + " / Stress " + to_string(job.stress)
        });
    }
    return schedule;
}

vector<FrontierState> studentPareto(const vector<Subject>& subjects, int maxTime) {
    vector<FrontierState> frontier = {{0, 0, 0, {}}};
    for (int idx = 0; idx < static_cast<int>(subjects.size()); idx++) {
        vector<FrontierState> candidates = frontier;
        for (const FrontierState& state : frontier) {
            int nextTime = state.time + subjects[idx].time;
            if (nextTime > maxTime) continue;
            candidates.push_back({
                state.value + subjects[idx].credits + subjects[idx].importance,
                state.stressOrDifficulty + subjects[idx].difficulty,
                nextTime,
                [&]() {
                    vector<int> chosen = state.chosen;
                    chosen.push_back(idx);
                    return chosen;
                }()
            });
        }
        frontier = reduceFrontier(candidates);
    }
    return frontier;
}

bool overlapsChosen(const vector<Job>& jobs, const vector<int>& chosen, const Job& candidate) {
    for (int idx : chosen) {
        const Job& existing = jobs[idx];
        if (!(existing.end <= candidate.start || existing.start >= candidate.end)) {
            return true;
        }
    }
    return false;
}

vector<FrontierState> corporatePareto(const vector<Job>& jobs) {
    vector<FrontierState> frontier = {{0, 0, 0, {}}};
    for (int idx = 0; idx < static_cast<int>(jobs.size()); idx++) {
        vector<FrontierState> candidates = frontier;
        for (const FrontierState& state : frontier) {
            if (overlapsChosen(jobs, state.chosen, jobs[idx])) continue;
            candidates.push_back({
                state.value + jobs[idx].profit + jobs[idx].priority,
                state.stressOrDifficulty + jobs[idx].stress,
                state.time + jobs[idx].duration(),
                [&]() {
                    vector<int> chosen = state.chosen;
                    chosen.push_back(idx);
                    return chosen;
                }()
            });
        }
        frontier = reduceFrontier(candidates);
    }
    return frontier;
}

string studentFrontierJson(const vector<FrontierState>& frontier, const vector<Subject>& subjects) {
    vector<string> rows;
    for (const FrontierState& state : frontier) {
        vector<string> subjectRows;
        for (int idx : state.chosen) {
            subjectRows.push_back(subjectJson(subjects[idx]));
        }
        ostringstream out;
        out << "{"
            << "\"value\":" << state.value << ","
            << "\"stressOrDifficulty\":" << state.stressOrDifficulty << ","
            << "\"time\":" << state.time << ","
            << "\"subjects\":" << joinStringArray(subjectRows)
            << "}";
        rows.push_back(out.str());
    }
    return joinStringArray(rows);
}

string corporateFrontierJson(const vector<FrontierState>& frontier, const vector<Job>& jobs) {
    vector<string> rows;
    for (const FrontierState& state : frontier) {
        vector<string> jobRows;
        for (int idx : state.chosen) {
            jobRows.push_back(jobJson(jobs[idx]));
        }
        ostringstream out;
        out << "{"
            << "\"value\":" << state.value << ","
            << "\"stressOrDifficulty\":" << state.stressOrDifficulty << ","
            << "\"time\":" << state.time << ","
            << "\"jobs\":" << joinStringArray(jobRows)
            << "}";
        rows.push_back(out.str());
    }
    return joinStringArray(rows);
}

string resultLabelsJson(const string& selected, const string& rejected, const string& emptyRejected, const string& emptyBody, const string& count, const string& paretoX, const string& paretoY) {
    ostringstream out;
    out << "{"
        << "\"selected\":\"" << escapeJson(selected) << "\"," 
        << "\"rejected\":\"" << escapeJson(rejected) << "\"," 
        << "\"emptyRejected\":\"" << escapeJson(emptyRejected) << "\"," 
        << "\"emptyRejectedBody\":\"" << escapeJson(emptyBody) << "\"," 
        << "\"tableCount\":\"" << escapeJson(count) << "\"," 
        << "\"paretoX\":\"" << escapeJson(paretoX) << "\"," 
        << "\"paretoY\":\"" << escapeJson(paretoY) << "\""
        << "}";
    return out.str();
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int mode = 0;
    if (!(cin >> mode)) {
        return 1;
    }

    if (mode == 0) {
        int n = 0;
        int maxTime = 0;
        double lambda = 0.0;
        int dailyHours = 4;
        int sessionMinutes = 60;
        int breakMinutes = 15;
        int startHour = 9;
        int endHour = 20;
        cin >> n >> maxTime >> lambda >> dailyHours >> sessionMinutes >> breakMinutes >> startHour >> endHour;

        vector<Subject> subjects(n);
        for (int i = 0; i < n; i++) {
            cin >> subjects[i].name >> subjects[i].credits >> subjects[i].time >> subjects[i].difficulty >> subjects[i].importance >> subjects[i].deadlineDays;
        }

        vector<int> selectedIndices = solveStudentSelection(subjects, maxTime, lambda);
        vector<int> selectedSet = selectedIndices;
        vector<Subject> selected;
        vector<Subject> rejected;
        for (int i = 0; i < n; i++) {
            if (find(selectedSet.begin(), selectedSet.end(), i) != selectedSet.end()) selected.push_back(subjects[i]);
            else rejected.push_back(subjects[i]);
        }

        int totalCredits = 0;
        int totalTime = 0;
        int totalDifficulty = 0;
        int totalImportance = 0;
        for (const Subject& subject : selected) {
            totalCredits += subject.credits;
            totalTime += subject.time;
            totalDifficulty += subject.difficulty;
            totalImportance += subject.importance;
        }
        double objective = round2(totalCredits + (totalImportance * 0.35) - (lambda * totalDifficulty * 0.4));

        vector<string> selectedRows;
        for (const Subject& subject : selected) selectedRows.push_back(subjectJson(subject));
        vector<string> rejectedRows;
        for (const Subject& subject : rejected) rejectedRows.push_back(subjectJson(subject));

        vector<string> cards = {
            cardJson("Credits", to_string(totalCredits)),
            cardJson("Study Time", to_string(totalTime) + "h"),
            cardJson("Difficulty", to_string(totalDifficulty)),
            cardJson("Importance", to_string(totalImportance)),
            cardJson("Objective Score", numberToString(objective))
        };

        vector<ScheduleEntry> schedule = buildStudentSchedule(selected, dailyHours, sessionMinutes, breakMinutes, startHour, endHour);
        vector<string> scheduleRows;
        for (const ScheduleEntry& entry : schedule) scheduleRows.push_back(scheduleJson(entry));

        cout << "{"
             << "\"mode\":\"student\","
             << "\"engine\":\"cpp\","
             << "\"engineNote\":\"compiled\","
             << "\"selected\":" << joinStringArray(selectedRows) << ","
             << "\"rejected\":" << joinStringArray(rejectedRows) << ","
             << "\"summary\":{\"cards\":" << joinStringArray(cards) << "},"
             << "\"schedule\":" << joinStringArray(scheduleRows) << ","
             << "\"paretoFrontier\":" << studentFrontierJson(studentPareto(subjects, maxTime), subjects) << ","
             << "\"resultLabels\":" << resultLabelsJson("Selected Courses", "Deferred Courses", "All courses included", "No subject was deferred by the optimizer.", "courses", "Time", "Academic value")
             << "}";
        return 0;
    }

    int n = 0;
    double lambda = 0.0;
    cin >> n >> lambda;
    vector<Job> jobs(n);
    for (int i = 0; i < n; i++) {
        cin >> jobs[i].name >> jobs[i].start >> jobs[i].end >> jobs[i].profit >> jobs[i].priority >> jobs[i].stress;
        jobs[i].originalIndex = i;
    }

    vector<int> selectedIndices = solveCorporateSelection(jobs, lambda);
    vector<Job> selected;
    vector<Job> rejected;
    for (int i = 0; i < n; i++) {
        if (find(selectedIndices.begin(), selectedIndices.end(), i) != selectedIndices.end()) selected.push_back(jobs[i]);
        else rejected.push_back(jobs[i]);
    }

    int totalProfit = 0;
    int totalHours = 0;
    int totalPriority = 0;
    int totalStress = 0;
    for (const Job& job : selected) {
        totalProfit += job.profit;
        totalHours += job.duration();
        totalPriority += job.priority;
        totalStress += job.stress;
    }
    double objective = round2(totalProfit + (totalPriority * 0.35) - (lambda * totalStress * 0.45));

    vector<string> selectedRows;
    for (const Job& job : selected) selectedRows.push_back(jobJson(job));
    vector<string> rejectedRows;
    for (const Job& job : rejected) rejectedRows.push_back(jobJson(job));
    vector<string> cards = {
        cardJson("Profit", to_string(totalProfit)),
        cardJson("Planned Hours", to_string(totalHours) + "h"),
        cardJson("Priority", to_string(totalPriority)),
        cardJson("Stress", to_string(totalStress)),
        cardJson("Objective Score", numberToString(objective))
    };
    vector<ScheduleEntry> schedule = buildCorporateSchedule(selected);
    vector<string> scheduleRows;
    for (const ScheduleEntry& entry : schedule) scheduleRows.push_back(scheduleJson(entry));

    cout << "{"
         << "\"mode\":\"corporate\","
         << "\"engine\":\"cpp\","
         << "\"engineNote\":\"compiled\","
         << "\"selected\":" << joinStringArray(selectedRows) << ","
         << "\"rejected\":" << joinStringArray(rejectedRows) << ","
         << "\"summary\":{\"cards\":" << joinStringArray(cards) << "},"
         << "\"schedule\":" << joinStringArray(scheduleRows) << ","
         << "\"paretoFrontier\":" << corporateFrontierJson(corporatePareto(jobs), jobs) << ","
         << "\"resultLabels\":" << resultLabelsJson("Selected Jobs", "Deferred Jobs", "All jobs scheduled", "Every compatible job was selected into the work plan.", "jobs", "Time", "Business value")
         << "}";
    return 0;
}
