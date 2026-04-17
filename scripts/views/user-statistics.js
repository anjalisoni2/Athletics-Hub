// user-statistics.js

import { createIcon, formatNumber } from "../utils.js";
import { getAPIEndpoint } from "../api-config.js";

export async function renderUserStatistics(container) {
    // Check if user has superadmin access
    const currentUser = localStorage.getItem("currentUser");
    const users = JSON.parse(localStorage.getItem("users") || "{}");
    const userData = users[currentUser];
    
    if (!userData || userData.role !== "superadmin") {
        container.innerHTML = `
            <div class="bg-gray-50" style="min-height: 100vh; padding: 2rem; display: flex; align-items: center; justify-content: center;">
                <div class="card" style="max-width: 500px;">
                    <div class="card-content" style="text-align: center;">
                        <div style="margin-bottom: 1rem;">
                            ${createIcon('lockCircle').outerHTML}
                        </div>
                        <h2 class="text-2xl font-bold mb-2">Access Denied</h2>
                        <p class="text-gray-600">Only superadmin users can access user statistics.</p>
                        
                    </div>
                </div>
            </div>
        `;
        return;
    }

    // Fetch user statistics from API
    let userStats = {
        totalUsers: 0,
        activeUsers: 0,
        athletes: 0,
        organizers: 0,
        registeredToday: 0,
        registeredThisWeek: 0,
        registeredThisMonth: 0,
        userGrowthData: [],
        roleDistribution: {},
        eventParticipation: []
    };

    try {
        const response = await fetch(getAPIEndpoint("/api/user-statistics/"));
        if (response.ok) {
            userStats = await response.json();
        } else {
            console.warn("Failed to fetch user statistics, using default data");
            userStats = generateMockUserStats();
        }
    } catch (err) {
        console.warn("Error fetching user statistics:", err);
        userStats = generateMockUserStats();
    }

    // Fetch event participation data
    let eventParticipationData = [];
    try {
        const eventResponse = await fetch(getAPIEndpoint("/api/event-participation/"));
        if (eventResponse.ok) {
            eventParticipationData = await eventResponse.json();
        } else {
            console.warn("Failed to fetch event participation, using mock data");
            eventParticipationData = generateMockEventParticipation();
        }
    } catch (err) {
        console.warn("Error fetching event participation:", err);
        eventParticipationData = generateMockEventParticipation();
    }

    // Calculate percentages
    const athletePercent = userStats.totalUsers > 0 ? (userStats.athletes / userStats.totalUsers) * 100 : 0;
    const organizerPercent = userStats.totalUsers > 0 ? (userStats.organizers / userStats.totalUsers) * 100 : 0;
    const activePercent = userStats.totalUsers > 0 ? (userStats.activeUsers / userStats.totalUsers) * 100 : 0;

    container.innerHTML = `
        <div class="bg-gray-50" style="min-height: 100vh; padding: 2rem 0;">
            <div class="container">

            <!-- Back Button at the top -->
<div style="margin-bottom: 2rem;">
    <button class="btn btn-outline" onclick="navigateTo('admin-panel')" style="
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        border: 1px solid var(--gray-300);
        border-radius: 8px;
        background: white;
        color: var(--gray-700);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.95rem;
    "
    onmouseover="this.style.borderColor='var(--gray-400)'; this.style.backgroundColor='var(--gray-50)'; this.style.transform='translateX(-4px)';"
    onmouseout="this.style.borderColor='var(--gray-300)'; this.style.backgroundColor='white'; this.style.transform='translateX(0)';">
        ${createIcon('arrowLeft').outerHTML} Back to Admin Panel
    </button>
</div>

                <!-- Header -->
                <div class="mb-8">
                    <div class="flex items-center gap-3 mb-2">
                        <div style="width: 40px; height: 40px; color: var(--primary-blue);">
                            ${createIcon('barChart3').outerHTML}
                        </div>
                        <h1 class="text-4xl font-bold">User Statistics & Analytics</h1>
                    </div>
                    <p class="text-xl text-gray-600">Platform user insights and growth metrics</p>
                </div>

                <!-- Quick Stats -->
                <div class="grid grid-md-2 grid-lg-4 gap-6 mb-8">
                    <div class="dashboard-stat" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(59, 130, 246, 0.02)); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.05);">
                        <div class="stat-header">
                            <div class="stat-title" style="font-size: 0.875rem; color: var(--gray-600); text-transform: uppercase; letter-spacing: 0.5px;">Total Users</div>
                            <div class="stat-icon" style="color: #3B82F6;">${createIcon('users').outerHTML}</div>
                        </div>
                        <div class="stat-number" style="font-size: 2rem; font-weight: 700; color: var(--gray-900); margin: 0.5rem 0;">${formatNumber(userStats.totalUsers)}</div>
                        <div class="stat-change positive" style="color: #10B981; font-size: 0.875rem;">+${formatNumber(userStats.registeredThisMonth)} this month</div>
                    </div>

                    <div class="dashboard-stat" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 0.02)); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.05);">
                        <div class="stat-header">
                            <div class="stat-title" style="font-size: 0.875rem; color: var(--gray-600); text-transform: uppercase; letter-spacing: 0.5px;">Active Users</div>
                            <div class="stat-icon" style="color: #10B981;">${createIcon('activity').outerHTML}</div>
                        </div>
                        <div class="stat-number" style="font-size: 2rem; font-weight: 700; color: var(--gray-900); margin: 0.5rem 0;">${formatNumber(userStats.activeUsers)}</div>
                        <div class="stat-change positive" style="color: #10B981; font-size: 0.875rem;">${activePercent.toFixed(1)}% active</div>
                    </div>

                    <div class="dashboard-stat" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(139, 92, 246, 0.02)); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(139, 92, 246, 0.05);">
                        <div class="stat-header">
                            <div class="stat-title" style="font-size: 0.875rem; color: var(--gray-600); text-transform: uppercase; letter-spacing: 0.5px;">Athletes</div>
                            <div class="stat-icon" style="color: #8B5CF6;">${createIcon('award').outerHTML}</div>
                        </div>
                        <div class="stat-number" style="font-size: 2rem; font-weight: 700; color: var(--gray-900); margin: 0.5rem 0;">${formatNumber(userStats.athletes)}</div>
                        <div class="stat-change positive" style="color: #8B5CF6; font-size: 0.875rem;">${athletePercent.toFixed(1)}% of users</div>
                    </div>

                    <div class="dashboard-stat" style="background: linear-gradient(135deg, rgba(249, 115, 22, 0.05), rgba(249, 115, 22, 0.02)); border: 1px solid rgba(249, 115, 22, 0.2); border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(249, 115, 22, 0.05);">
                        <div class="stat-header">
                            <div class="stat-title" style="font-size: 0.875rem; color: var(--gray-600); text-transform: uppercase; letter-spacing: 0.5px;">Organizers</div>
                            <div class="stat-icon" style="color: #F97316;">${createIcon('briefcase').outerHTML}</div>
                        </div>
                        <div class="stat-number" style="font-size: 2rem; font-weight: 700; color: var(--gray-900); margin: 0.5rem 0;">${formatNumber(userStats.organizers)}</div>
                        <div class="stat-change positive" style="color: #F97316; font-size: 0.875rem;">${organizerPercent.toFixed(1)}% of users</div>
                    </div>
                </div>

                <!-- Charts Section -->
                <div class="grid grid-lg-2 gap-6 mb-6">
                    <!-- Event Participation Chart -->
                    <div class="card" style="grid-column: 1 / -1; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border: 1px solid var(--gray-200);">
                        <div class="card-header" style="border-bottom: 1px solid var(--gray-200); padding-bottom: 1.25rem;">
                            <div>
                                <div class="card-title" style="font-size: 1.25rem; font-weight: 600; color: var(--gray-900); margin-bottom: 0.5rem;">Athlete Participation by Event</div>
                                <div class="card-description" style="color: var(--gray-500); font-size: 0.9rem;">Total number of athletes registered in each event</div>
                            </div>
                        </div>
                        <div class="card-content" style="padding: 1.5rem 0;">
                            <div class="chart-container">
                                ${renderEventParticipationChart(eventParticipationData)}
                            </div>
                        </div>
                    </div>

                </div>

                <!-- Registration Timeline -->
                <div class="card mb-6" style="box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border: 1px solid var(--gray-200);">
                    <div class="card-header" style="border-bottom: 1px solid var(--gray-200); padding-bottom: 1.25rem;">
                        <div class="card-title" style="font-size: 1.125rem; font-weight: 600; color: var(--gray-900); margin-bottom: 0.25rem;">Recent Registrations</div>
                        <div class="card-description" style="color: var(--gray-500); font-size: 0.875rem;">New signups timeline</div>
                    </div>
                    <div class="card-content">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
                            <div class="metric-card blue" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(59, 130, 246, 0.02)); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 12px; padding: 1.5rem; text-align: center; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.05);">
                                <div class="metric-icon blue" style="color: #3B82F6; margin-bottom: 0.75rem; font-size: 1.75rem;">${createIcon('calendar').outerHTML}</div>
                                <div class="metric-value blue" style="color: #1D4ED8; font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">${formatNumber(userStats.registeredToday)}</div>
                                <div class="metric-label" style="color: var(--gray-600); font-size: 0.875rem; font-weight: 500;">Registered Today</div>
                            </div>
                            <div class="metric-card green" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 0.02)); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; padding: 1.5rem; text-align: center; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.05);">
                                <div class="metric-icon green" style="color: #10B981; margin-bottom: 0.75rem; font-size: 1.75rem;">${createIcon('trendingUp').outerHTML}</div>
                                <div class="metric-value green" style="color: #047857; font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">${formatNumber(userStats.registeredThisWeek)}</div>
                                <div class="metric-label" style="color: var(--gray-600); font-size: 0.875rem; font-weight: 500;">This Week</div>
                            </div>
                            <div class="metric-card purple" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(139, 92, 246, 0.02)); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 12px; padding: 1.5rem; text-align: center; box-shadow: 0 2px 4px rgba(139, 92, 246, 0.05);">
                                <div class="metric-icon purple" style="color: #8B5CF6; margin-bottom: 0.75rem; font-size: 1.75rem;">${createIcon('barChart2').outerHTML}</div>
                                <div class="metric-value purple" style="color: #6D28D9; font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">${formatNumber(userStats.registeredThisMonth)}</div>
                                <div class="metric-label" style="color: var(--gray-600); font-size: 0.875rem; font-weight: 500;">This Month</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Helper function to generate mock event participation data
function generateMockEventParticipation() {
    return [
        { eventId: 1, eventName: 'Marathon 2025', participantCount: 245 },
        { eventId: 2, eventName: '10K Run', participantCount: 189 },
        { eventId: 3, eventName: 'Half Marathon', participantCount: 156 },
        { eventId: 4, eventName: 'Sprint Championship', participantCount: 98 },
        { eventId: 5, eventName: 'Track & Field', participantCount: 127 },
        { eventId: 6, eventName: 'Cross Country', participantCount: 203 },
        { eventId: 7, eventName: 'Relay Race', participantCount: 176 }
    ];
}

// Helper function to generate mock user growth data
function generateMockGrowthData() {
    const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
    const data = [45, 52, 48, 61, 58, 72, 85];
    return { days, data };
}

// Helper function to render event participation chart
function renderEventParticipationChart(data) {
    if (!data || data.length === 0) {
        return '<p style="color: var(--gray-500); text-align: center; padding: 2rem;">No event participation data available</p>';
    }

    const participationCounts = data.map(item => item.participantCount || item.athletes || 0);
    const maxValue = Math.max(...participationCounts);
    const minValue = Math.min(...participationCounts);
    const range = maxValue - minValue || 1;

    const chartHeight = 320;

    let chartHTML = `
        <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.02), rgba(147, 51, 234, 0.02)); border-radius: 12px; padding: 2rem 1rem 3rem 1rem; overflow-x: auto;">
            <div style="position: relative; min-height: ${chartHeight}px; display: flex; align-items: flex-end; gap: 2rem; justify-content: center; padding-top: 2rem; min-width: max-content;">
    `;

    data.forEach((event, index) => {
        const participantCount = event.participantCount || event.athletes || 0;
        const normalizedHeight = ((participantCount - minValue) / range) * chartHeight;

        // Truncate event name if too long
        let eventName = event.eventName ? event.eventName : `Event ${index + 1}`;
        const displayName = eventName.length > 14 ? eventName.substring(0, 14) : eventName;

        // Color gradient for variety
        const colors = [
            'linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)',
            'linear-gradient(180deg, #8B5CF6 0%, #6D28D9 100%)',
            'linear-gradient(180deg, #EC4899 0%, #BE185D 100%)',
            'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)',
            'linear-gradient(180deg, #10B981 0%, #047857 100%)',
            'linear-gradient(180deg, #06B6D4 0%, #0891B2 100%)',
            'linear-gradient(180deg, #6366F1 0%, #4F46E5 100%)'
        ];

        const barColor = colors[index % colors.length];

        chartHTML += `
            <div style="display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 50px;">
                <div style="
                    width: 40px;
                    height: ${Math.max(normalizedHeight, 10)}px;
                    background: ${barColor};
                    border-radius: 6px 6px 0 0;
                    position: relative;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
                " class="chart-bar" title="${eventName}: ${participantCount} athletes"
                   onmouseover="
                        this.style.boxShadow='0 8px 16px rgba(0, 0, 0, 0.18)';
                        this.style.transform='translateY(-6px)';
                        this.nextElementSibling.style.opacity='1';
                        this.nextElementSibling.style.transform='translate(-50%, -12px)';
                   "
                   onmouseout="
                        this.style.boxShadow='0 4px 8px rgba(0, 0, 0, 0.12)';
                        this.style.transform='translateY(0)';
                        this.nextElementSibling.style.opacity='0';
                        this.nextElementSibling.style.transform='translate(-50%, 0)';
                   ">
                </div>
                <div style="
                    position: absolute;
                    top: ${Math.max(normalizedHeight, 10)}px;
                    left: 50%;
                    transform: translate(-50%, 0);
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    pointer-events: none;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 0.5rem 0.75rem;
                    border-radius: 6px;
                    font-size: 0.825rem;
                    font-weight: 600;
                    white-space: nowrap;
                " class="tooltip">
                    ${participantCount}
                </div>
                <p style="
                    font-size: 0.75rem;
                    margin-top: 0.875rem;
                    color: var(--gray-700);
                    text-align: center;
                    word-break: break-word;
                    max-width: 50px;
                    line-height: 1.2;
                    font-weight: 500;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                ">${displayName}</p>
            </div>
        `;
    });

    chartHTML += `
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem; margin-top: 1.5rem; padding: 0 1rem; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: var(--gray-600);">
                <div style="width: 12px; height: 12px; background: linear-gradient(135deg, #3B82F6, #8B5CF6); border-radius: 2px;"></div>
                <span>Hover over bars to see exact numbers</span>
            </div>
        </div>
    `;

    return chartHTML;
}

// Helper function to render a simple line chart (kept for reference)
function renderSimpleLineChart(data) {
    if (!data || !data.data || data.data.length === 0) {
        return '<p style="color: var(--gray-500); text-align: center;">No data available</p>';
    }

    const maxValue = Math.max(...data.data);
    const minValue = Math.min(...data.data);
    const range = maxValue - minValue || 1;

    const chartHeight = 200;
    const barWidth = 100 / data.data.length;

    let chartHTML = `
        <div style="position: relative; height: ${chartHeight}px; margin-bottom: 1rem; display: flex; align-items: flex-end; gap: 0.5rem; justify-content: space-around; padding: 1rem 0;">
    `;

    data.data.forEach((value, index) => {
        const normalizedHeight = ((value - minValue) / range) * chartHeight;
        const percentage = ((value - minValue) / range) * 100;

        chartHTML += `
            <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                <div style="
                    width: 100%;
                    height: ${normalizedHeight}px;
                    background: linear-gradient(135deg, var(--primary-blue), var(--primary-purple));
                    border-radius: 4px 4px 0 0;
                    position: relative;
                    transition: background 0.3s;
                " class="chart-bar" title="${value}">
                </div>
                <p style="font-size: 0.75rem; margin-top: 0.5rem; color: var(--gray-600); text-align: center;">${data.days ? data.days[index] : 'Day ' + (index + 1)}</p>
            </div>
        `;
    });

    chartHTML += `</div>`;

    return chartHTML;
}

// Helper function to generate mock user statistics
function generateMockUserStats() {
    return {
        totalUsers: 156,
        activeUsers: 98,
        athletes: 120,
        organizers: 36,
        registeredToday: 8,
        registeredThisWeek: 42,
        registeredThisMonth: 127,
        userGrowthData: generateMockGrowthData(),
        roleDistribution: {
            athlete: 120,
            organizer: 36
        }
    };
}
