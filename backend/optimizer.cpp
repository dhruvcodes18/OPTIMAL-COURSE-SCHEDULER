#include <algorithm>
#include <cmath>
#include <iostream>
#include <string>
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

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n = 0;
    int maxTime = 0;
    double lambda = 0.0;
    if (!(cin >> n >> maxTime >> lambda)) {
        return 1;
    }

    vector<Subject> subjects(n);
    for (int i = 0; i < n; i++) {
        cin >> subjects[i].name
            >> subjects[i].credits
            >> subjects[i].time
            >> subjects[i].difficulty
            >> subjects[i].importance
            >> subjects[i].deadlineDays;
    }

    vector<int> dp(maxTime + 1, 0);
    vector<vector<int>> keep(n, vector<int>(maxTime + 1, 0));

    for (int i = 0; i < n; i++) {
        int weightedValue = static_cast<int>(
            round((subjects[i].credits * 100.0) +
                  (subjects[i].importance * 35.0) -
                  (lambda * subjects[i].difficulty * 40.0) -
                  (subjects[i].deadlineDays * 3.0)));

        for (int w = maxTime; w >= subjects[i].time; w--) {
            int candidate = dp[w - subjects[i].time] + weightedValue;
            if (candidate > dp[w]) {
                dp[w] = candidate;
                keep[i][w] = 1;
            }
        }
    }

    int bestTime = 0;
    for (int w = 1; w <= maxTime; w++) {
        if (dp[w] > dp[bestTime]) {
            bestTime = w;
        }
    }

    vector<int> selectedIndices;
    int w = bestTime;
    for (int i = n - 1; i >= 0; i--) {
        if (w >= 0 && keep[i][w]) {
            selectedIndices.push_back(i);
            w -= subjects[i].time;
        }
    }

    reverse(selectedIndices.begin(), selectedIndices.end());

    cout << selectedIndices.size() << "\n";
    for (size_t i = 0; i < selectedIndices.size(); i++) {
        cout << selectedIndices[i];
        if (i + 1 < selectedIndices.size()) {
            cout << " ";
        }
    }
    cout << "\n";

    return 0;
}
