// app.js
// Main Application Logic
// LOGIC NOT CHANGED – ONLY MODULE COMPATIBILITY FIXED

/* ================= IMPORTS ================= */

// Views
import { renderLandingPage } from "./views/landing.js";
import { renderEventsPage, renderEventResults } from "./views/events.js";
import { renderEventDetails } from "./views/event-details.js";
import { renderAthleteDashboard } from "./views/athlete-dashboard.js";
import { renderOrganizerDashboard } from "./views/organizer-dashboard.js";
import { renderAdminPanel } from "./views/admin-panel.js";
import { renderLiveTracking } from "./views/live-tracking.js";
import { renderUserStatistics } from "./views/user-statistics.js";
import { renderOrganizersReport } from "./views/organizers-report.js";
import { renderFitnessDashboard } from "./views/fitness-dashboard.js";
import { renderResultsLeaderboard } from "./views/results-leaderboard.js";

// Shared
import "./data.js";
import { createElement, createIcon, switchTab } from "./utils.js";
import { getAPIEndpoint } from "./api-config.js";

/* ================= GLOBAL STATE ================= */

let currentView = "landing";
let userRole = "guest";
let selectedEventId = null;

/* ================= GLOBAL FUNCTIONS ================= */

// Make utility functions globally available for inline onclick handlers
window.switchTab = switchTab;

window.goToDashboard = function() {
    if (userRole === "athlete") navigateTo("athlete-dashboard");
    else if (userRole === "organizer") navigateTo("organizer-dashboard");
    else if (userRole === "admin" || userRole === "superadmin") navigateTo("admin-panel");
    else navigateTo("landing");
};

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", function () {
    // Check if user is logged in
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser) {
        const users = JSON.parse(localStorage.getItem("users")) || {};
        if (users[currentUser]) {
            // Set user role based on stored data
            let role = users[currentUser].role;
            if (role === "participant") {
                userRole = "athlete";
            } else {
                userRole = role;
            }
            
            // Auto-navigate to dashboard based on role
            if (userRole === "athlete") navigateTo("athlete-dashboard");
            else if (userRole === "organizer") navigateTo("organizer-dashboard");
            else if (userRole === "admin" || userRole === "superadmin") navigateTo("admin-panel");
            else navigateTo("landing");
        } else {
            navigateTo("landing");
        }
    } else {
        navigateTo("landing");
    }
});

/* ================= NAVIGATION ================= */

window.navigateTo = async function (view, eventId = null) {
    currentView = view;
    if (eventId) selectedEventId = eventId;

    const app = document.getElementById("app");
    const navigation = document.getElementById("navigation");

    // Always show navigation and update it
    navigation.classList.remove("hidden");
    updateNavigation();

    // Clear current content
    app.innerHTML = "";

    // Load view
    switch (view) {
        case "landing":
            renderLandingPage(app);
            break;
        case "events":
            renderEventsPage(app);
            break;
        case "event-details":
            await renderEventDetails(app, selectedEventId);
            break;
        case "view-results":
            await renderEventResults(app, selectedEventId);
            break;
        case "athlete-dashboard":
            await renderAthleteDashboard(app);
            break;
        case "organizer-dashboard":
            await renderOrganizerDashboard(app);
            break;
        case "admin-panel":
            renderAdminPanel(app);
            break;
        case "user-statistics":
            await renderUserStatistics(app);
            break;
        case "organizers-report":
            await renderOrganizersReport(app);
            break;
        case "live-tracking":
            // For athletes, show fitness dashboard; otherwise show live tracking
            if (userRole === "athlete") {
                await renderFitnessDashboard(app);
            } else {
                renderLiveTracking(app);
            }
            break;
        case "fitness-dashboard":
            await renderFitnessDashboard(app);
            break;
        case "results-leaderboard":
            renderResultsLeaderboard(app, selectedEventId);
            break;
        default:
            renderLandingPage(app);
    }

    window.scrollTo(0, 0);
};

/* ================= AUTH ================= */

window.login = function (role) {
    // Map "participant" to "athlete" for consistency
    if (role === "participant") {
        userRole = "athlete";
    } else {
        userRole = role;
    }

    if (userRole === "athlete") navigateTo("athlete-dashboard");
    else if (userRole === "organizer") navigateTo("organizer-dashboard");
    else if (userRole === "admin" || userRole === "superadmin") navigateTo("admin-panel");
};

function logout() {
    userRole = "guest";
    localStorage.removeItem("currentUser");
    navigateTo("landing");
}

/* ================= NAV BAR ================= */


function updateNavigation() {
    const navLinks = document.getElementById("navbarLinks");
    navLinks.innerHTML = "";

    
    // Show Create Event button only for organizers (not for super admin)
    if (userRole === "organizer") {
        const createEventBtn = createElement("button", "btn btn-primary btn-sm");
        createEventBtn.appendChild(createIcon("plus"));
        createEventBtn.appendChild(document.createTextNode(" Create Event"));
        createEventBtn.onclick = () => {
            window.location.href = "event.html";
        };
        navLinks.appendChild(createEventBtn);

        // Add notification bell in navbar for organizers
        const notifBtn = createElement("button", "btn btn-ghost btn-sm");
        notifBtn.id = "navNotificationBell";
        notifBtn.style.cssText = "position: relative; padding: 8px 12px;";
        notifBtn.innerHTML = `🔔<span id="navNotificationBadge" style="position: absolute; top: -2px; right: -2px; background: #ef4444; color: white; font-size: 9px; font-weight: 700; border-radius: 50%; width: 16px; height: 16px; display: none; align-items: center; justify-content: center;">0</span>`;
        notifBtn.onclick = (e) => {
            e.stopPropagation();
            window.showNotificationDropdown();
        };
        navLinks.appendChild(notifBtn);
    }

    // Add notification bell for athletes
    if (userRole === "athlete") {
        const notifBtn = createElement("button", "btn btn-ghost btn-sm");
        notifBtn.id = "navNotificationBell";
        notifBtn.style.cssText = "position: relative; padding: 8px 12px;";
        notifBtn.innerHTML = `🔔<span id="navNotificationBadge" style="position: absolute; top: -2px; right: -2px; background: #ef4444; color: white; font-size: 9px; font-weight: 700; border-radius: 50%; width: 16px; height: 16px; display: none; align-items: center; justify-content: center;">0</span>`;
        notifBtn.onclick = (e) => {
            e.stopPropagation();
            window.showNotificationDropdown();
        };
        navLinks.appendChild(notifBtn);
    }

    const homeBtn = createElement("button", "btn btn-ghost btn-sm");
    homeBtn.appendChild(createIcon("home"));
    homeBtn.appendChild(document.createTextNode(" Home"));
    homeBtn.onclick = () => navigateTo("landing");
    navLinks.appendChild(homeBtn);

    const eventsBtn = createElement("button", "btn btn-ghost btn-sm");
    eventsBtn.appendChild(createIcon("calendar"));
    eventsBtn.appendChild(document.createTextNode(" Events"));
    eventsBtn.onclick = () => navigateTo("events");
    navLinks.appendChild(eventsBtn);

    // Show Live button for athletes and organizers
    if (userRole === "athlete" || userRole === "organizer") {
        const liveBtn = createElement("button", "btn btn-ghost btn-sm");
        liveBtn.appendChild(createIcon("radio"));
        liveBtn.appendChild(document.createTextNode(" Live"));
        liveBtn.onclick = () => navigateTo("live-tracking");
        navLinks.appendChild(liveBtn);
    }

    if (userRole !== "guest") {
        // Add profile avatar
        const currentUser = localStorage.getItem("currentUser");
        if (currentUser) {
            const users = JSON.parse(localStorage.getItem("users")) || {};
            const userData = users[currentUser];

            if (userData) {
                const profileAvatar = document.createElement("div");
                const userInitial = currentUser.charAt(0).toUpperCase();

                // Determine avatar color based on role
                let avatarClass = "profile-avatar profile-avatar-blue";
                if (userData.role === "organizer") {
                    avatarClass = "profile-avatar profile-avatar-purple";
                } else if (userData.role === "superadmin") {
                    avatarClass = "profile-avatar profile-avatar-green";
                }

                profileAvatar.className = avatarClass;
                profileAvatar.textContent = userInitial;
                profileAvatar.title = `${userData.firstName} ${userData.lastName}`;
                profileAvatar.style.cursor = "pointer";
                profileAvatar.onclick = () => {
                    if (userData.role === "organizer") {
                        navigateTo('organizer-dashboard');
                    } else if (userData.role === "superadmin" || userData.role === "admin") {
                        navigateTo('admin-panel');
                    } else if (userData.role === "participant" || userData.role === "athlete") {
                        navigateTo('athlete-dashboard');
                    } else {
                        navigateTo('landing');
                    }
                };
                navLinks.appendChild(profileAvatar);
            }
        }

        // Only show logout on athlete dashboard, not on landing page
        if (currentView !== "landing") {
            const logoutBtn = createElement("button", "btn btn-outline btn-sm");
            logoutBtn.appendChild(createIcon("logout"));
            logoutBtn.appendChild(document.createTextNode(" Logout"));
            logoutBtn.onclick = logout;
            navLinks.appendChild(logoutBtn);
        }
    }

    // Update notification badge for organizers and athletes
    if (userRole === "organizer" || userRole === "athlete") {
        updateNotificationBadge();
    }
}

async function updateNotificationBadge() {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) return;

    try {
        const res = await fetch(getAPIEndpoint(`/api/notifications/?username=${currentUser}`));
        if (!res.ok) return;
        const notifications = await res.json();
        
        const unreadCount = notifications.filter(n => !n.isRead).length;
        const badge = document.getElementById("navNotificationBadge");
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (err) {
        console.log("Could not fetch notifications:", err);
    }
}

window.showNotificationDropdown = async function() {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) return;

    let dropdown = document.getElementById("navNotificationDropdown");
    if (!dropdown) {
        dropdown = document.createElement("div");
        dropdown.id = "navNotificationDropdown";
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 8px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            width: 320px;
            max-height: 400px;
            overflow-y: auto;
            z-index: 1000;
        `;
        
        const bell = document.getElementById("navNotificationBell");
        if (bell) {
            bell.parentElement.style.position = "relative";
            bell.parentElement.appendChild(dropdown);
        }
    }

    if (dropdown.style.display === "block") {
        dropdown.style.display = "none";
        return;
    }

    try {
        const res = await fetch(getAPIEndpoint(`/api/notifications/?username=${currentUser}`));
        if (!res.ok) return;
        const notifications = await res.json();

        if (notifications.length === 0) {
            dropdown.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b;">No notifications</div>';
        } else {
            dropdown.innerHTML = `
                <div style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #1e293b; font-size: 14px;">
                    Notifications
                </div>
                <div style="max-height: 320px; overflow-y: auto;">
                    ${notifications.map(n => {
                        const bg = n.isRead ? '#ffffff' : '#f0f9ff';
                        const borderColor = n.type === 'approval' ? '#22c55e' : n.type === 'rejection' ? '#ef4444' : '#64748b';
                        return `
                            <div style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; background: ${bg}; cursor: pointer; border-left: 3px solid ${borderColor};"
                                 onclick="handleNavNotificationClick('${n.id}', ${n.isRead})">
                                <div style="font-weight: 600; font-size: 13px; color: #1e293b; margin-bottom: 4px;">${n.title}</div>
                                <div style="font-size: 12px; color: #64748b; line-height: 1.4;">${n.message}</div>
                                <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${new Date(n.createdAt).toLocaleDateString()}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        dropdown.style.display = "block";
    } catch (err) {
        console.log("Could not fetch notifications:", err);
    }
}

window.handleNavNotificationClick = async function(notifId, isRead) {
    if (!isRead) {
        try {
            await fetch(getAPIEndpoint(`/api/notifications/mark-read/`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notification_id: notifId })
            });
            await updateNotificationBadge();
            showNotificationDropdown();
        } catch (err) {
            console.log("Error marking notification read:", err);
        }
    }
}

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById("navNotificationDropdown");
    const bell = document.getElementById("navNotificationBell");
    if (dropdown && bell && !bell.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = "none";
    }
});
