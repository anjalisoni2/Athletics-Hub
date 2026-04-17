// Results Leaderboard View
// Displays live race leaderboard with podium, stats, and export options

import { createIcon } from "../utils.js";
import { mockEvents } from "../data.js";

export function renderResultsLeaderboard(container, eventId) {
    // Get results tracker from global context (set by live-tracking view)
    const resultsTracker = window.resultsTracker || null;
    
    if (!resultsTracker) {
        container.innerHTML = `
            <div class="container py-8">
                <button class="btn btn-ghost mb-6" onclick="navigateTo('events')">
                    ${createIcon('arrowLeft').outerHTML}
                    Back to Events
                </button>
                <div class="card">
                    <div class="card-content">
                        <div class="text-center py-12">
                            <h2 class="text-2xl font-bold mb-4">Live Results Unavailable</h2>
                            <p class="text-gray-600 mb-6">Results are only available while live tracking is in progress.</p>
                            <p class="text-gray-500">Go to Live Tracking to view real-time results as athletes finish.</p>
                            <button class="btn btn-primary mt-6" onclick="navigateTo('live-tracking')">
                                ${createIcon('navigation').outerHTML}
                                View Live Tracking
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    const leaderboard = resultsTracker.getLeaderboard();
    const podium = resultsTracker.getPodium();
    const stats = resultsTracker.getLeaderboardWithStats().stats;
    const event = mockEvents[0] || { title: 'Race Event', location: 'Event Location' };

    const getPodiumMedal = (rank) => {
        const medals = {
            1: '🥇',
            2: '🥈',
            3: '🥉'
        };
        return medals[rank] || '';
    };

    const getPodiumColor = (rank) => {
        const colors = {
            1: '#FFD700',
            2: '#C0C0C0',
            3: '#CD7F32'
        };
        return colors[rank] || '#2563eb';
    };

    container.innerHTML = `
        <div class="bg-gray-50" style="min-height: 100vh; padding: 2rem 0;">
            <div class="container">
                <!-- Header -->
                <div class="mb-8">
                    <button class="btn btn-ghost mb-6" onclick="navigateTo('events')">
                        ${createIcon('arrowLeft').outerHTML}
                        Back to Events
                    </button>
                    <div class="flex items-center gap-3 mb-2">
                        <div style="width: 40px; height: 40px; color: var(--primary-blue);">
                            ${createIcon('medal').outerHTML}
                        </div>
                        <div>
                            <h1 class="text-4xl font-bold">Race Results</h1>
                            <p class="text-gray-600">${event.title}</p>
                        </div>
                    </div>
                    <p class="text-xl text-gray-600">Final standings and leaderboard</p>
                </div>

                <!-- Stats Section -->
                <div class="grid grid-md-3 gap-6 mb-8">
                    <div class="card">
                        <div class="card-content">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-gray-600 text-sm">Total Finishers</p>
                                    <p class="text-3xl font-bold">${leaderboard.length}</p>
                                </div>
                                <div style="width: 50px; height: 50px; background: var(--primary-blue); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                                    ${createIcon('users').outerHTML}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-content">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-gray-600 text-sm">Winning Time</p>
                                    <p class="text-3xl font-bold">${stats.fastestTime}</p>
                                </div>
                                <div style="width: 50px; height: 50px; background: var(--primary-purple); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                                    ${createIcon('zap').outerHTML}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-content">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-gray-600 text-sm">Average Time</p>
                                    <p class="text-3xl font-bold">${stats.averageTime}</p>
                                </div>
                                <div style="width: 50px; height: 50px; background: var(--primary-green); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                                    ${createIcon('activity').outerHTML}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Podium Section -->
                ${podium.length > 0 ? `
                    <div class="card mb-8">
                        <div class="card-header">
                            <div class="card-title flex items-center gap-2">
                                ${createIcon('award').outerHTML}
                                Podium
                            </div>
                            <div class="card-description">Top 3 finishers</div>
                        </div>
                        <div class="card-content">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; padding: 2rem 0;">
                                ${podium.map((runner, idx) => `
                                    <div style="text-align: center;">
                                        <div style="
                                            width: 120px;
                                            height: 120px;
                                            border-radius: 50%;
                                            background: ${getPodiumColor(runner.rank)};
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            margin: 0 auto 1rem;
                                            font-size: 48px;
                                            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                                        ">
                                            ${getPodiumMedal(runner.rank)}
                                        </div>
                                        <h3 class="text-xl font-bold">${runner.name}</h3>
                                        <p class="text-gray-600 mb-2">Bib ${runner.bibNumber}</p>
                                        <p class="text-2xl font-bold" style="color: var(--primary-blue);">${runner.finishTime}</p>
                                        <p class="text-sm text-gray-600">${runner.pace}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                ` : ''}

                <!-- Full Leaderboard -->
                <div class="card mb-8">
                    <div class="card-header">
                        <div class="card-title flex items-center gap-2">
                            ${createIcon('list').outerHTML}
                            Full Leaderboard
                        </div>
                        <div class="card-description">${leaderboard.length} finishers</div>
                    </div>
                    <div class="card-content">
                        ${leaderboard.length === 0 ? `
                            <div class="text-center py-8">
                                <p class="text-gray-500">No finishers yet</p>
                            </div>
                        ` : `
                            <div style="overflow-x: auto;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="border-bottom: 2px solid #e5e7eb;">
                                            <th style="padding: 1rem; text-align: left; font-weight: 600;">Rank</th>
                                            <th style="padding: 1rem; text-align: left; font-weight: 600;">Name</th>
                                            <th style="padding: 1rem; text-align: left; font-weight: 600;">Bib Number</th>
                                            <th style="padding: 1rem; text-align: right; font-weight: 600;">Finish Time</th>
                                            <th style="padding: 1rem; text-align: right; font-weight: 600;">Pace</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${leaderboard.map((runner, idx) => {
                                            const rankClass = runner.rank === 1 ? 'rank-1' : 
                                                            runner.rank === 2 ? 'rank-2' : 
                                                            runner.rank === 3 ? 'rank-3' : 'rank-other';
                                            return `
                                                <tr style="border-bottom: 1px solid #f3f4f6; ${idx % 2 === 0 ? 'background: #fafafa;' : ''}">
                                                    <td style="padding: 1rem;">
                                                        <div class="position-badge ${rankClass}" style="width: 2rem; height: 2rem;">
                                                            ${runner.rank}
                                                        </div>
                                                    </td>
                                                    <td style="padding: 1rem; font-weight: 500;">${runner.name}</td>
                                                    <td style="padding: 1rem;"><span class="badge badge-outline">Bib ${runner.bibNumber}</span></td>
                                                    <td style="padding: 1rem; text-align: right; font-weight: 600; color: var(--primary-blue);">${runner.finishTime}</td>
                                                    <td style="padding: 1rem; text-align: right; color: #666;">${runner.pace}</td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Export Section -->
                <div class="card">
                    <div class="card-header">
                        <div class="card-title flex items-center gap-2">
                            ${createIcon('download').outerHTML}
                            Export Results
                        </div>
                        <div class="card-description">Download race results in various formats</div>
                    </div>
                    <div class="card-content">
                        <div class="flex gap-3 flex-wrap">
                            <button class="btn btn-primary" onclick="
                                const csv = window.resultsTracker.exportAsCSV();
                                const blob = new Blob([csv], { type: 'text/csv' });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'race-results.csv';
                                a.click();
                                window.URL.revokeObjectURL(url);
                            ">
                                ${createIcon('download').outerHTML}
                                Export as CSV
                            </button>
                            <button class="btn btn-outline" onclick="
                                const data = window.resultsTracker.exportAsJSON();
                                const json = JSON.stringify(data, null, 2);
                                const blob = new Blob([json], { type: 'application/json' });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'race-results.json';
                                a.click();
                                window.URL.revokeObjectURL(url);
                            ">
                                ${createIcon('download').outerHTML}
                                Export as JSON
                            </button>
                            <button class="btn btn-outline" onclick="window.print()">
                                ${createIcon('printer').outerHTML}
                                Print Results
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    `;
}
