// admin-panel.js

import { createIcon, formatNumber, formatDateShort, switchTab } from "../utils.js";
import { mockEvents } from "../data.js";
import { getRegistrations, getOrganizerApprovals, approveOrganizer, rejectOrganizer as rejectOrganizerFromStorage } from "../storage.js";
import { getAPIEndpoint } from "../api-config.js";


// 🔐 Make functions global (for onclick)
window.approveOrganization = approveOrganization;
window.rejectOrganization = rejectOrganization;

// User statistics navigation
window.viewUserStats = function () {
    if (window.navigateTo) {
        navigateTo('user-statistics');
    } else {
        console.error("Navigation function not available");
    }
};

// Event review handler
window.reviewEventApprovals = function () {
    if (window.navigateTo) {
        navigateTo('admin-panel');
        // Then switch to events tab
        setTimeout(() => {
            switchTab('adminTabs', 'events');
        }, 0);
    }
};

// Organizers report handler
window.viewOrganizersReport = function () {
    if (window.navigateTo) {
        navigateTo('organizers-report');
    } else {
        console.error("Navigation function not available");
    }
};

function updateOrganizerApprovalStatus(username, status) {
    const users = JSON.parse(localStorage.getItem("users") || "{}");
    if (!users[username]) {
        return;
    }

    users[username] = {
        ...users[username],
        approvalStatus: status
    };
    localStorage.setItem("users", JSON.stringify(users));
}

async function approveOrganization(id, username) {
    try {
        await fetch(getAPIEndpoint(`/api/organizers/${id}/approve/`), { method: "POST" });
        updateOrganizerApprovalStatus(username, "approved");
        await renderAdminPanel(document.getElementById("app"));
    } catch (err) {
        console.error("Failed to approve organization", err);
    }
}

async function rejectOrganization(id, username) {
    try {
        await fetch(getAPIEndpoint(`/api/organizers/${id}/reject/`), { method: "POST" });
        updateOrganizerApprovalStatus(username, "rejected");
        await renderAdminPanel(document.getElementById("app"));
    } catch (err) {
        console.error("Failed to reject organization", err);
    }
}

async function loadPendingEvents() {
    try {
        const res = await fetch(getAPIEndpoint("/api/pending-events/"));
        if (!res.ok) {
            console.warn("API returned error status:", res.status);
            return [];
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.warn("Failed to fetch pending events (using empty array):", err.message);
        return [];
    }
}



async function approveEvent(id) {
    try {
        const response = await fetch(getAPIEndpoint(`/api/events/${id}/approve/`), {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error(`Failed to approve event: ${response.status}`);
        }

        // Refresh admin panel to update pending events list
        await renderAdminPanel(document.getElementById("app"));

        // Redirect to user events page which will fetch updated approved events
        if (window.navigateTo) {
            navigateTo('events');
        } else {
            window.location.href = '/events.html';
        }
    } catch (err) {
        console.error("Error approving event:", err);
        alert("Failed to approve event. Please try again.");
    }
}



async function rejectEvent(id) {
    try {
        const response = await fetch(getAPIEndpoint(`/api/events/${id}/reject/`), {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error(`Failed to reject event: ${response.status}`);
        }

        // Refresh admin panel to update pending events list
        await renderAdminPanel(document.getElementById("app"));
    } catch (err) {
        console.error("Error rejecting event:", err);
        alert("Failed to reject event. Please try again.");
    }
}

window.approveEvent = approveEvent;
window.rejectEvent = rejectEvent;
window.openEventApprovals = async function () {
    await renderAdminPanel(document.getElementById("app"));
    switchTab('adminTabs', 'events');
};

// Generate monthly revenue data
function generateMonthlyRevenueData() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const recentMonths = months.slice(Math.max(0, currentMonth - 5), currentMonth + 1);

    return recentMonths.map((month, index) => ({
        month: month,
        revenue: Math.floor(Math.random() * 45000) + 15000 // Revenue between $15k-$60k
    }));
}

// Generate monthly organizer growth data
function generateMonthlyOrganizerData() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const recentMonths = months.slice(Math.max(0, currentMonth - 5), currentMonth + 1);

    return recentMonths.map((month, index) => ({
        month: month,
        organizers: Math.floor(Math.random() * 25) + 5 // New organizers between 5-30
    }));
}

// Create monthly revenue line chart using HTML/CSS
function createMonthlyRevenueChart() {
    const data = generateMonthlyRevenueData();
    const maxRevenue = Math.max(...data.map(d => d.revenue));
    const minRevenue = Math.min(...data.map(d => d.revenue));

    let html = `
        <div style="width: 100%; padding: 30px; background: white; border-radius: 8px; box-sizing: border-box;">
            <!-- Chart Container -->
            <div style="position: relative; width: 100%; height: 300px; background: linear-gradient(180deg, #f9fafb 0%, white 100%); border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; box-sizing: border-box; margin-bottom: 20px;">
                <!-- Y-axis labels -->
                <div style="position: absolute; left: 0; top: 0; width: 50px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 20px 5px; text-align: right;">
    `;

    for (let i = 0; i <= 5; i++) {
        const value = maxRevenue - (maxRevenue - minRevenue) / 5 * i;
        html += `<span style="font-size: 11px; color: #6b7280; font-weight: 500;">$${(value / 1000).toFixed(0)}k</span>`;
    }

    html += `
                </div>

                <!-- Data points and lines -->
                <div style="position: relative; width: 100%; height: 100%; margin-left: 50px; display: flex; align-items: flex-end; justify-content: space-around; padding: 0 20px; box-sizing: border-box;">
    `;

    data.forEach((item, idx) => {
        const percentage = ((item.revenue - minRevenue) / (maxRevenue - minRevenue)) * 100;
        html += `
            <div style="display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; margin: 0 5px;">
                <!-- Value label -->
                <span style="position: absolute; bottom: calc(${percentage}% + 15px); font-size: 12px; font-weight: bold; color: #1f2937; white-space: nowrap;">$${(item.revenue / 1000).toFixed(1)}k</span>

                <!-- Dot -->
                <div style="position: absolute; bottom: ${percentage}%; width: 10px; height: 10px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3); z-index: 10;"></div>
            </div>
        `;
    });

    html += `
                </div>

                <!-- X-axis -->
                <div style="position: absolute; bottom: 20px; left: 50px; right: 20px; border-bottom: 2px solid #1f2937;"></div>
            </div>

            <!-- Month labels -->
            <div style="display: flex; justify-content: flex-start; padding-left: 50px; gap: 0;">
    `;

    data.forEach((item) => {
        html += `
            <div style="flex: 1; text-align: center; font-size: 11px; font-weight: 600; color: #1f2937; margin: 0 5px;">${item.month}</div>
        `;
    });

    html += `
            </div>

            <!-- Legend -->
            <div style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-left: 4px solid #3b82f6; border-radius: 4px;">
                <strong style="color: #1f2937;">Monthly Revenue Trend</strong>
                <p style="margin: 5px 0 0 0; font-size: 13px; color: #6b7280;">Revenue pattern over the last 6 months showing growth and trends</p>
            </div>
        </div>
    `;

    return html;
}

// Create organizer growth bar chart using HTML/CSS
function createOrganizerGrowthChart() {
    const data = generateMonthlyOrganizerData();
    const maxOrganizers = Math.max(...data.map(d => d.organizers));

    let html = `
        <div style="width: 100%; padding: 30px; background: white; border-radius: 8px; box-sizing: border-box;">
            <!-- Chart Container -->
            <div style="position: relative; width: 100%; height: 300px; background: linear-gradient(180deg, #f9fafb 0%, white 100%); border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; box-sizing: border-box; margin-bottom: 20px;">
                <!-- Y-axis labels -->
                <div style="position: absolute; left: 0; top: 0; width: 50px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 20px 5px; text-align: right;">
    `;

    for (let i = 0; i <= 5; i++) {
        const value = Math.round((maxOrganizers / 5) * (5 - i));
        html += `<span style="font-size: 11px; color: #6b7280; font-weight: 500;">${value}</span>`;
    }

    html += `
                </div>

                <!-- Bars -->
                <div style="position: relative; width: 100%; height: 100%; margin-left: 50px; display: flex; align-items: flex-end; justify-content: space-around; padding: 0 20px; box-sizing: border-box;">
    `;

    data.forEach((item, idx) => {
        const percentage = (item.organizers / maxOrganizers) * 100;
        html += `
            <div style="display: flex; flex-direction: column; align-items: center; flex: 1; margin: 0 5px;">
                <!-- Bar -->
                <div style="width: 100%; max-width: 45px; height: ${percentage}%; background: linear-gradient(180deg, #10b981 0%, #059669 100%); border-radius: 6px 6px 0 0; box-shadow: 0 4px 8px rgba(16, 185, 129, 0.2); transition: all 0.3s ease; cursor: pointer;"
                     onmouseover="this.style.boxShadow='0 8px 16px rgba(16, 185, 129, 0.4)'; this.style.transform='scaleY(1.05)';"
                     onmouseout="this.style.boxShadow='0 4px 8px rgba(16, 185, 129, 0.2)'; this.style.transform='scaleY(1)';">
                </div>

                <!-- Value label -->
                <span style="margin-top: 12px; font-size: 13px; font-weight: bold; color: #1f2937;">${item.organizers}</span>

                <!-- Month label -->
                <span style="margin-top: 6px; font-size: 11px; font-weight: 600; color: #6b7280;">${item.month}</span>
            </div>
        `;
    });

    html += `
                </div>

                <!-- X-axis -->
                <div style="position: absolute; bottom: 20px; left: 50px; right: 20px; border-bottom: 2px solid #1f2937;"></div>
            </div>

            <!-- Legend -->
            <div style="margin-top: 20px; padding: 15px; background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px;">
                <strong style="color: #1f2937;">New Organizers Per Month</strong>
                <p style="margin: 5px 0 0 0; font-size: 13px; color: #6b7280;">Shows the number of new organizers joining the platform each month</p>
            </div>
        </div>
    `;

    return html;
}


// ✅ EXPORT FUNCTION
export async function renderAdminPanel(container) {
    // Show loading state immediately to prevent blank screen
    container.innerHTML = `
        <div class="flex items-center justify-center" style="min-height: 50vh; flex-direction: column; gap: 1rem;">
            <div class="spinner"></div>
            <p class="text-gray-600 animate-pulse">Loading dashboard data from server...</p>
        </div>
    `;

    const pendingEvents = await loadPendingEvents();

    // Fetch approved events with proper error handling
    let approvedEvents = [];
    try {
        const response = await fetch(getAPIEndpoint("/api/approved-events/"));
        if (response.ok) {
            approvedEvents = await response.json();
        } else {
            console.warn("API returned error status:", response.status);
        }
    } catch (err) {
        console.error("Failed to fetch approved events:", err);
    }

    // Fetch pending organizers from backend API
    let pendingOrganizers = [];
    try {
        const orgRes = await fetch(getAPIEndpoint("/api/organizers/pending/"));
        if (orgRes.ok) {
            pendingOrganizers = await orgRes.json();
        }
    } catch (err) {
        console.error("Failed to fetch pending organizers:", err);
    }

    // Calculate dynamic platform stats from real data
    const registrations = getRegistrations();
    const users = JSON.parse(localStorage.getItem("users") || "{}");
    const totalUsers = Object.keys(users).length + registrations.length; // Users + unique registrants
    const totalEvents = mockEvents.length + approvedEvents.length;

    // Calculate total revenue from registrations
    const totalRevenue = registrations.reduce((sum, reg) => {
        const amount = parseFloat(reg.amount || 0);
        return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    // Count active events (upcoming or active status)
    const activeEvents = mockEvents.filter(e => e.status === 'active' || e.status === 'upcoming').length;

    // Count pending approvals (pending organizers + pending events)
    const pendingOrgsCount = pendingOrganizers.length;
    const pendingApprovals = pendingOrgsCount + pendingEvents.length;

    // Calculate system health based on data availability
    const systemHealth = totalUsers > 0 && totalEvents > 0 ? 99.8 : 95.0;


    const platformStats = {
        totalUsers: totalUsers,
        totalEvents: totalEvents,
        totalRevenue: totalRevenue,
        activeEvents: activeEvents,
        pendingApprovals: pendingApprovals,
        systemHealth: systemHealth
    };

    container.innerHTML = `
        <style>
            .tab-content { display: none; }
            .tab-content.active { display: block; }
            .admin-stat-card {
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                padding: 24px;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            .admin-stat-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
            }
            .admin-stat-card:nth-child(1)::before { background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); }
            .admin-stat-card:nth-child(2)::before { background: linear-gradient(135deg, #10b981 0%, #34d399 100%); }
            .admin-stat-card:nth-child(3)::before { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); }
            .admin-stat-card:nth-child(4)::before { background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); }
            .admin-stat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.1); }
            .admin-tab-btn {
                background: none;
                border: none;
                padding: 12px 24px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                color: #64748b;
                position: relative;
                transition: all 0.3s ease;
                border-radius: 10px;
            }
            .admin-tab-btn:hover { color: #2563eb; background: #f1f5f9; }
            .admin-tab-btn.active { color: #2563eb; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); }
            .admin-card {
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                padding: 24px;
            }
            .admin-btn-primary {
                background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .admin-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
            .admin-btn-success {
                background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .admin-btn-success:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16,185,129,0.3); }
            .admin-btn-danger {
                background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .admin-btn-danger:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(239,68,68,0.3); }
            .admin-approval-card {
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.3s ease;
                margin-bottom: 12px;
            }
            .admin-approval-card:hover { border-color: #2563eb; box-shadow: 0 4px 12px rgba(37,99,235,0.1); }
            .admin-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
            }
            .admin-badge-warning { background: #fef3c7; color: #92400e; }
            .admin-badge-success { background: #dcfce7; color: #166534; }
            .admin-badge-danger { background: #fee2e2; color: #991b1b; }
            .activity-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: #f8fafc;
                border-radius: 10px;
                margin-bottom: 8px;
            }
            .metric-box {
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                border-radius: 12px;
                padding: 20px;
                text-align: center;
            }
        </style>

        <div style="min-height: 100vh; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 32px 0;">
            <div style="max-width: 1280px; margin: 0 auto; padding: 0 24px;">
                
                <!-- Header -->
                <div style="margin-bottom: 32px;">
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 8px;">
                        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">🛡️</div>
                        <div>
                            <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #1e293b;">Welcome, Admin!</h1>
                            <p style="margin: 4px 0 0 0; font-size: 16px; color: #64748b;">Platform-wide management and monitoring</p>
                        </div>
                    </div>
                </div>

                <!-- Stats Overview -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 32px;">
                    <div class="admin-stat-card">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">👥</div>
                        </div>
                        <div style="font-size: 32px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">${formatNumber(platformStats.totalUsers)}</div>
                        <div style="font-size: 13px; color: #64748b; font-weight: 500; text-transform: uppercase; margin-bottom: 8px;">Total Users</div>
                        <div style="font-size: 13px; color: #10b981; font-weight: 500;">+${formatNumber(Math.round(platformStats.totalUsers * 0.15))} this month</div>
                    </div>

                    <div class="admin-stat-card">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">📅</div>
                        </div>
                        <div style="font-size: 32px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">${formatNumber(platformStats.totalEvents)}</div>
                        <div style="font-size: 13px; color: #64748b; font-weight: 500; text-transform: uppercase; margin-bottom: 8px;">Platform Events</div>
                        <div style="font-size: 13px; color: #10b981; font-weight: 500;">+${platformStats.activeEvents} active now</div>
                    </div>

                    <div class="admin-stat-card">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">💰</div>
                        </div>
                        <div style="font-size: 32px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">₹${platformStats.totalRevenue > 999999 ? (platformStats.totalRevenue / 1000000).toFixed(2) + 'M' : formatNumber(Math.round(platformStats.totalRevenue))}</div>
                        <div style="font-size: 13px; color: #64748b; font-weight: 500; text-transform: uppercase; margin-bottom: 8px;">Total Revenue</div>
                        <div style="font-size: 13px; color: #10b981; font-weight: 500;">${platformStats.totalRevenue > 0 ? '✓ Revenue Active' : 'No data yet'}</div>
                    </div>

                    <div class="admin-stat-card">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">📊</div>
                        </div>
                        <div style="font-size: 32px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">${platformStats.systemHealth}%</div>
                        <div style="font-size: 13px; color: #64748b; font-weight: 500; text-transform: uppercase; margin-bottom: 8px;">System Health</div>
                        <div style="font-size: 13px; color: #f59e0b; font-weight: 500;">${platformStats.pendingApprovals} pending</div>
                    </div>
                </div>

                <!-- Tabs -->
                <div style="background: white; border-radius: 16px; padding: 8px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;" id="adminTabs">
                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                        <button class="admin-tab-btn tab-trigger active" data-tab="overview" onclick="switchTab('adminTabs', 'overview')">📊 Overview</button>
                        <button class="admin-tab-btn tab-trigger" data-tab="organizations" onclick="switchTab('adminTabs', 'organizations')">🏢 Organizations</button>
                        <button class="admin-tab-btn tab-trigger" data-tab="events" onclick="openEventApprovals()">📋 Events</button>
                        <button class="admin-tab-btn tab-trigger" data-tab="reports" onclick="switchTab('adminTabs', 'reports')">📈 Reports</button>
                        <button class="admin-tab-btn tab-trigger" onclick="window.open('email-settings.html', '_blank')">📧 Email Settings</button>
                    </div>

                    <!-- Overview Tab -->
                    <div class="tab-content active" id="overview" style="padding: 24px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                            <!-- Pending Actions -->
                            <div class="admin-card">
                                <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: #1e293b;">Pending Actions</h3>
                                <div style="display: flex; flex-direction: column; gap: 12px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; border: 1px solid #bfdbfe;">
                                        <div style="display: flex; align-items: center; gap: 12px;">
                                            <span style="font-size: 24px;">👥</span>
                                            <div>
                                                <p style="margin: 0; font-weight: 600; color: #1e293b;">User Reports</p>
                                                <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">8 support tickets open</p>
                                            </div>
                                        </div>
                                        <button class="admin-btn-primary" style="padding: 8px 16px; font-size: 13px;" onclick="viewUserStats()">View</button>
                                    </div>

                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; border: 1px solid #bbf7d0;">
                                        <div style="display: flex; align-items: center; gap: 12px;">
                                            <span style="font-size: 24px;">📋</span>
                                            <div>
                                                <p style="margin: 0; font-weight: 600; color: #1e293b;">Organizers Report</p>
                                                <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">${platformStats.pendingApprovals} accounts pending review</p>
                                            </div>
                                        </div>
                                        <button class="admin-btn-primary" style="padding: 8px 16px; font-size: 13px;" onclick="viewOrganizersReport()">View</button>
                                    </div>
                                </div>
                            </div>

                            <!-- Recent Activity -->
                            <div class="admin-card">
                                <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: #1e293b;">Recent Activity</h3>
                                <div style="display: flex; flex-direction: column; gap: 8px;">
                                    ${[
            { action: 'New event created', user: 'NYC Running Club', time: '5 min ago', icon: '📅' },
            { action: 'User registration', user: 'john.doe@email.com', time: '12 min ago', icon: '👤' },
            { action: 'Event approved', user: 'Mountain Sports Assoc.', time: '23 min ago', icon: '✓' },
            { action: 'Payment processed', user: 'Event #1247', time: '1 hour ago', icon: '💳' },
            { action: 'Support ticket resolved', user: 'Ticket #8842', time: '2 hours ago', icon: '🎫' }
        ].map(activity => `
                                        <div class="activity-item">
                                            <span style="font-size: 20px;">${activity.icon}</span>
                                            <div style="flex: 1;">
                                                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e293b;">${activity.action}</p>
                                                <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">${activity.user}</p>
                                            </div>
                                            <span style="font-size: 12px; color: #94a3b8;">${activity.time}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- Platform Analytics -->
                        <div class="admin-card">
                            <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: #1e293b;">Platform Analytics</h3>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                                <div class="metric-box">
                                    <div style="font-size: 36px; margin-bottom: 8px;">🌍</div>
                                    <div style="font-size: 28px; font-weight: 700; color: #3b82f6;">45+</div>
                                    <div style="font-size: 13px; color: #64748b; font-weight: 500;">Countries</div>
                                </div>
                                <div class="metric-box">
                                    <div style="font-size: 36px; margin-bottom: 8px;">📈</div>
                                    <div style="font-size: 28px; font-weight: 700; color: #10b981;">892K</div>
                                    <div style="font-size: 13px; color: #64748b; font-weight: 500;">Total Participants</div>
                                </div>
                                <div class="metric-box">
                                    <div style="font-size: 36px; margin-bottom: 8px;">⚡</div>
                                    <div style="font-size: 28px; font-weight: 700; color: #8b5cf6;">24/7</div>
                                    <div style="font-size: 13px; color: #64748b; font-weight: 500;">Uptime</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Organization Approvals Tab -->
                    <div class="tab-content" id="organizations" style="padding: 24px;">
                        <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #1e293b;">Organization Approvals</h3>
                        <p style="margin: 0 0 20px 0; font-size: 14px; color: #64748b;">Approve or reject organizer accounts</p>
                        
                        ${pendingOrganizers.length === 0
            ? '<div style="text-align: center; padding: 60px 20px; background: #f8fafc; border-radius: 12px;"><p style="color: #64748b; margin: 0;">No pending organizer requests</p></div>'
            : pendingOrganizers.map(org => `
                                <div class="admin-approval-card">
                                    <div>
                                        <h4 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1e293b;">${org.name}</h4>
                                        <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748b;">${org.email}</p>
                                        <p style="margin: 0; font-size: 12px; color: #94a3b8;">@${org.username}</p>
                                        <span class="admin-badge admin-badge-warning" style="margin-top: 8px;">⏳ Pending</span>
                                    </div>
                                    <div style="display: flex; gap: 8px;">
                                        <button class="admin-btn-success" onclick='approveOrganization(${org.id}, ${JSON.stringify(org.username)})'>✓ Approve</button>
                                        <button class="admin-btn-danger" onclick='rejectOrganization(${org.id}, ${JSON.stringify(org.username)})'>✗ Reject</button>
                                    </div>
                                </div>
                            `).join('')}
                    </div>

                    <!-- Event Approvals Tab -->
                    <div class="tab-content" id="events" style="padding: 24px;">
                        <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #1e293b;">Event Approval Queue</h3>
                        <p style="margin: 0 0 20px 0; font-size: 14px; color: #64748b;">Review and approve pending events</p>
                        
                        ${pendingEvents.length === 0
            ? '<div style="text-align: center; padding: 60px 20px; background: #f8fafc; border-radius: 12px;"><p style="color: #64748b; margin: 0;">No pending events</p></div>'
            : pendingEvents.map(event => `
                                <div class="admin-approval-card" style="flex-wrap: wrap; gap: 16px;">
                                    <div style="display: flex; align-items: center; gap: 16px; flex: 1;">
                                        <img src="${event.imageUrl || 'https://placehold.co/80x80?text=No+Image'}" alt="${event.title}" style="width: 70px; height: 70px; border-radius: 10px; object-fit: cover;">
                                        <div>
                                            <h4 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1e293b;">${event.title}</h4>
                                            <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;">${event.organizer}</p>
                                            <div style="display: flex; gap: 12px; font-size: 12px; color: #64748b;">
                                                <span>📅 ${formatDateShort(event.date)}</span>
                                                <span>👥 Max ${event.maxParticipants}</span>
                                                <span>💰 ₹${event.price}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style="display: flex; gap: 8px;">
                                        <button class="admin-btn-success" onclick="approveEvent(${event.id})">✓ Approve</button>
                                        <button class="admin-btn-danger" onclick="rejectEvent(${event.id})">✗ Reject</button>
                                    </div>
                                </div>
                            `).join('')}
                    </div>

                    <!-- Reports Tab -->
                    <div class="tab-content" id="reports" style="padding: 24px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                            <div class="admin-card">
                                <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #1e293b;">Monthly Revenue</h3>
                                <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b;">Revenue generated over the last 6 months</p>
                                <div style="background: white; border-radius: 12px; overflow: hidden;">
                                    ${createMonthlyRevenueChart()}
                                </div>
                            </div>

                            <div class="admin-card">
                                <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #1e293b;">Organizer Growth</h3>
                                <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b;">New organizers joining per month</p>
                                <div style="background: white; border-radius: 12px; overflow: hidden;">
                                    ${createOrganizerGrowthChart()}
                                </div>
                            </div>
                        </div>

                        <div class="admin-card">
                            <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: #1e293b;">Top Performing Events</h3>
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                ${mockEvents
            .map(event => ({ ...event, revenue: event.participants * event.price }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)
            .map((event, idx) => `
                                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                                            <div style="display: flex; align-items: center; gap: 16px;">
                                                <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px;">#${idx + 1}</div>
                                                <div>
                                                    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e293b;">${event.title}</p>
                                                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">${event.participants} participants</p>
                                                </div>
                                            </div>
                                            <div style="text-align: right;">
                                                <p style="margin: 0; font-size: 16px; font-weight: 700; color: #10b981;">₹${formatNumber(Math.round(event.revenue))}</p>
                                                <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">Revenue</p>
                                            </div>
                                        </div>
                                    `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
