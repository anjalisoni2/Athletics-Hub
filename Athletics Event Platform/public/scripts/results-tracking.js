// Results Tracking Module
// Handles capturing finish times, calculating pace, and generating live leaderboards

export class ResultsTracker {
    constructor(eventId, maxDistance = 100) {
        this.eventId = eventId;
        this.maxDistance = maxDistance;
        this.finishedRunners = []; // Array of runners with finish times
        this.startTime = new Date();
    }

    /**
     * Record a runner's finish
     * @param {Object} runner - Runner object with bibNumber, name, distance, pace, lat, lng
     * @param {number} elapsedSeconds - Elapsed time in seconds since event start
     */
    recordFinish(runner, elapsedSeconds) {
        // Check if runner already finished
        if (this.finishedRunners.some(r => String(r.bibNumber) === String(runner.bibNumber))) {
            console.warn(`⚠️ Runner ${runner.bibNumber} already recorded as finished`);
            return false;
        }

        // Convert elapsed time to hh:mm:ss format
        const hours = Math.floor(elapsedSeconds / 3600);
        const minutes = Math.floor((elapsedSeconds % 3600) / 60);
        const seconds = Math.floor(elapsedSeconds % 60);
        const finishTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // Calculate pace (min/km)
        const paceInMinutes = elapsedSeconds / 60 / this.maxDistance;
        const paceMinutes = Math.floor(paceInMinutes);
        const paceSeconds = Math.round((paceInMinutes % 1) * 60);
        const pace = `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}/km`;

        const finishedRunner = {
            bibNumber: String(runner.bibNumber),
            name: runner.name,
            finishTime: finishTime,
            pace: pace,
            elapsedSeconds: elapsedSeconds,
            finishedAt: new Date(),
            lat: runner.lat,
            lng: runner.lng,
            distance: runner.distance
        };

        this.finishedRunners.push(finishedRunner);

        // Sort by finish time (earliest first)
        this.finishedRunners.sort((a, b) => a.elapsedSeconds - b.elapsedSeconds);

        // Update ranks
        this.finishedRunners.forEach((runner, idx) => {
            runner.rank = idx + 1;
        });

        console.log(`🏁 Runner ${runner.bibNumber} finished! Time: ${finishTime}, Rank: ${finishedRunner.rank}`);

        return true;
    }

    /**
     * Get leaderboard of finished runners
     * @returns {Array} Array of finished runners with ranks
     */
    getLeaderboard() {
        return [...this.finishedRunners];
    }

    /**
     * Get leaderboard with additional stats
     * @returns {Object} Leaderboard with stats
     */
    getLeaderboardWithStats() {
        return {
            eventId: this.eventId,
            totalFinishers: this.finishedRunners.length,
            leaderboard: this.getLeaderboard(),
            lastUpdated: new Date(),
            stats: {
                averageTime: this.getAverageFinishTime(),
                fastestTime: this.finishedRunners[0]?.finishTime || 'N/A',
                slowestTime: this.finishedRunners[this.finishedRunners.length - 1]?.finishTime || 'N/A'
            }
        };
    }

    /**
     * Calculate average finish time
     * @returns {string} Average time in hh:mm:ss format
     */
    getAverageFinishTime() {
        if (this.finishedRunners.length === 0) return 'N/A';

        const totalSeconds = this.finishedRunners.reduce((sum, r) => sum + r.elapsedSeconds, 0);
        const avgSeconds = totalSeconds / this.finishedRunners.length;

        const hours = Math.floor(avgSeconds / 3600);
        const minutes = Math.floor((avgSeconds % 3600) / 60);
        const seconds = Math.floor(avgSeconds % 60);

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Get runner's rank by bibNumber
     * @param {string|number} bibNumber
     * @returns {number} Rank or -1 if not finished
     */
    getRunnerRank(bibNumber) {
        const runner = this.finishedRunners.find(r => String(r.bibNumber) === String(bibNumber));
        return runner ? runner.rank : -1;
    }

    /**
     * Check if runner has finished
     * @param {string|number} bibNumber
     * @returns {boolean}
     */
    hasFinished(bibNumber) {
        return this.finishedRunners.some(r => String(r.bibNumber) === String(bibNumber));
    }

    /**
     * Export results as JSON
     * @returns {Object}
     */
    exportAsJSON() {
        return {
            eventId: this.eventId,
            exportedAt: new Date().toISOString(),
            results: this.getLeaderboard()
        };
    }

    /**
     * Export results as CSV
     * @returns {string}
     */
    exportAsCSV() {
        const headers = ['Rank', 'Bib Number', 'Name', 'Finish Time', 'Pace (min/km)'];
        const rows = this.finishedRunners.map(r =>
            `${r.rank},${r.bibNumber},"${r.name}",${r.finishTime},${r.pace}`
        );

        return [headers.join(','), ...rows].join('\n');
    }

    /**
     * Reset results (for testing or new race)
     */
    reset() {
        this.finishedRunners = [];
        this.startTime = new Date();
    }

    /**
     * Get top N runners
     * @param {number} n - Number of runners to return
     * @returns {Array}
     */
    getTopRunners(n = 10) {
        return this.finishedRunners.slice(0, n);
    }

    /**
     * Get podium (top 3)
     * @returns {Array}
     */
    getPodium() {
        return this.getTopRunners(3);
    }
}

// Create global results tracker instance
export function createResultsTracker(eventId = 'current', maxDistance = 100) {
    return new ResultsTracker(eventId, maxDistance);
}
