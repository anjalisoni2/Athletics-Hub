// Athlete Dashboard View
import { mockEvents } from "../data.js";
import { createIcon } from "../utils.js";
import { getRegistrations } from "../storage.js";
import { getAPIEndpoint } from "../api-config.js";

// Fetch approved events from backend
async function getApprovedEventsForDashboard() {
    try {
        const response = await fetch(getAPIEndpoint('/api/approved-events/'));
        if (response.ok) {
            const backendEvents = await response.json();
            return backendEvents.map(ev => ({
                id: String(ev.id),
                title: ev.title || 'Untitled Event',
                description: ev.description || 'No description available.',
                date: ev.date,
                location: ev.location || 'Location TBA',
                imageUrl: ev.imageUrl || "https://placehold.co/1200x400?text=Event+Image",
                category: ev.category || 'Running',
                status: 'upcoming',
                price: ev.price ?? 0,
                currency: 'USD',
                participants: ev.participants ?? 0,
                maxParticipants: ev.maxParticipants ?? 200,
                distance: ev.distance || '—',
                organizer: ev.organizer || 'Event Organizer',
                registrationDeadline: ev.registrationDeadline || 'N/A',
            }));
        }
    } catch (err) {
        console.log("Backend events not available, using mock events only");
    }
    return [];
}



// Helper functions
function formatDate(date) {
    return new Date(date).toDateString();
}

function formatDateShort(date) {
    return new Date(date).toLocaleDateString();
}

// Get dynamic status based on event date (same as events.js)
function getDynamicStatus(eventDate) {
    if (!eventDate) return 'upcoming';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const eventDateObj = new Date(eventDate);
    eventDateObj.setHours(0, 0, 0, 0);
    
    if (eventDateObj < today) {
        return 'completed';
    }
    
    return 'upcoming';
}
function switchTab(tabsId, activeTab) {
    const tabs = document.getElementById(tabsId);
    if (!tabs) return;

    tabs.querySelectorAll(".tab-trigger").forEach(btn => {
        btn.classList.remove("active");
    });

    tabs.querySelectorAll(".tab-content").forEach(tab => {
        tab.classList.remove("active");
    });

    const activeBtn = tabs.querySelector(`[data-tab="${activeTab}"]`);
    if (activeBtn) activeBtn.classList.add("active");

    const activeContent = tabs.querySelector(`#${activeTab}`);
    if (activeContent) activeContent.classList.add("active");
}

/* 🔑 VERY IMPORTANT */
window.switchTab = switchTab;


async function renderAthleteDashboard(container) {
    // Show loading state immediately to prevent blank screen
    container.innerHTML = `
        <div class="flex items-center justify-center" style="min-height: 50vh; flex-direction: column; gap: 1rem;">
            <div class="spinner"></div>
            <p class="text-gray-600 animate-pulse">Loading athlete profile from server...</p>
        </div>
    `;

    // Get current user from localStorage
    const currentUserName = localStorage.getItem("currentUser");
    const users = JSON.parse(localStorage.getItem("users")) || {};
    const currentUser = users[currentUserName] || {};

    // Get user's registrations
    const registrations = getRegistrations();
    const userRegistrations = registrations.filter(reg => reg.username === currentUserName);

    // Get the full name of the user
    const fullName = `${currentUser.firstName || 'User'} ${currentUser.lastName || ''}`.trim();

    // Fetch all events (mock + backend)
    const backendEvents = await getApprovedEventsForDashboard();
    const allEvents = [...mockEvents, ...backendEvents];

    // Remove duplicates (if same event exists in both mock and backend)
    const uniqueEvents = allEvents.filter((event, index, self) =>
        index === self.findIndex(e => String(e.id) === String(event.id))
    );

    // Get events the user is registered for
    // First, try matching by ID
    const userEventIds = userRegistrations.map(reg => String(reg.eventId)).filter(id => id && id !== 'undefined' && id !== 'null');
    let userEvents = uniqueEvents.filter(event => userEventIds.includes(String(event.id)));

    // Debug logging
    console.log('Dashboard Debug:', {
        currentUser: currentUserName,
        totalRegistrations: registrations.length,
        userRegistrations: userRegistrations.length,
        userEventIds: userEventIds,
        userRegistrationDetails: userRegistrations.map(r => ({ eventId: r.eventId, eventName: r.eventName })),
        matchedByIdCount: userEvents.length,
        mockEventsCount: mockEvents.length,
        backendEventsCount: backendEvents.length,
        totalUniqueEvents: uniqueEvents.length
    });

    // If no matches by ID, try matching by event name (case-insensitive)
    if (userEvents.length === 0 && userRegistrations.length > 0) {
        const eventNames = userRegistrations.map(reg => reg.eventName).filter(n => n);
        console.log('Trying to match by event names:', eventNames);
        userEvents = uniqueEvents.filter(event => {
            const titleLower = (event.title || '').toLowerCase().trim();
            return eventNames.some(name => {
                const nameLower = (name || '').toLowerCase().trim();
                return titleLower === nameLower || titleLower.includes(nameLower) || nameLower.includes(titleLower);
            });
        });
        console.log('Matched by event name:', userEvents.length);
    }

    // If still no matches, show ALL events user registered for (from registrations only)
    if (userEvents.length === 0 && userRegistrations.length > 0) {
        userEvents = userRegistrations.map(reg => ({
            id: reg.eventId || reg.id || 'unknown',
            title: reg.eventName || 'Unknown Event',
            date: new Date().toISOString(),
            location: 'N/A',
            category: 'Running',
            status: 'upcoming',
            imageUrl: 'https://placehold.co/400x300?text=Event',
            distance: '—',
            participants: 0,
            maxParticipants: 200,
            organizer: 'Event Organizer',
            registrationDeadline: 'N/A',
            isFromRegistration: true
        }));
    }

    // Separate upcoming and completed events using dynamic status
    const upcomingEvents = userEvents.filter(e => getDynamicStatus(e.date) !== 'completed').slice(0, 3);
    const completedEvents = userEvents.filter(e => getDynamicStatus(e.date) === 'completed');

    // Create dynamic achievements based on registrations
    const achievements = [];
    if (completedEvents.length >= 1) achievements.push({ id: '1', title: 'First Finish', icon: '🏅', date: completedEvents[0].date });
    if (completedEvents.length >= 5) achievements.push({ id: '2', title: '5 Events Completed', icon: '⭐', date: new Date().toISOString() });
    if (completedEvents.length >= 10) achievements.push({ id: '3', title: 'Milestone Runner', icon: '⚡', date: new Date().toISOString() });
    if (userRegistrations.length >= 3) achievements.push({ id: '4', title: 'Trail Enthusiast', icon: '⛰️', date: new Date().toISOString() });
    
    container.innerHTML = `
        <style>
            .tab-content {
                display: none;
            }
            .tab-content.active {
                display: block;
            }
            .athlete-stats-card {
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                padding: 24px;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            .athlete-stats-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
            }
            .athlete-stats-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 40px rgba(37, 99, 235, 0.15);
            }
            .stat-card-icon {
                width: 48px;
                height: 48px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                margin-bottom: 16px;
            }
            .stat-card-number {
                font-size: 32px;
                font-weight: 700;
                color: #1e293b;
                margin-bottom: 4px;
            }
            .stat-card-label {
                font-size: 13px;
                color: #64748b;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .modern-tab {
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
            .modern-tab:hover {
                color: #2563eb;
                background: #f1f5f9;
            }
            .modern-tab.active {
                color: #2563eb;
                background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            }
            .modern-card {
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                overflow: hidden;
                transition: all 0.3s ease;
            }
            .modern-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 30px rgba(0,0,0,0.08);
            }
            .modern-progress {
                height: 8px;
                background: #e2e8f0;
                border-radius: 10px;
                overflow: hidden;
            }
            .modern-progress-fill {
                height: 100%;
                border-radius: 10px;
                background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
                transition: width 0.5s ease;
            }
            .achievement-badge {
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                border: 2px solid #f59e0b;
                border-radius: 16px;
                padding: 16px;
                text-align: center;
                transition: all 0.3s ease;
            }
            .achievement-badge:hover {
                transform: scale(1.05);
                box-shadow: 0 8px 20px rgba(245, 158, 11, 0.3);
            }
            .action-btn-primary {
                background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 10px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s ease;
                width: 100%;
            }
            .action-btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(37, 99, 235, 0.3);
            }
            .action-btn-outline {
                background: white;
                color: #2563eb;
                border: 2px solid #2563eb;
                padding: 10px 20px;
                border-radius: 10px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .action-btn-outline:hover {
                background: #eff6ff;
                transform: translateY(-2px);
            }
            .pr-card-modern {
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.3s ease;
            }
            .pr-card-modern:hover {
                border-color: #2563eb;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
            }
            .next-event-card {
                background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                border: 1px solid #bfdbfe;
                border-radius: 16px;
                padding: 24px;
            }
            .event-history-item {
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.3s ease;
            }
            .event-history-item:hover {
                border-color: #2563eb;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
            }
        </style>

        <div style="min-height: 100vh; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 32px 0;">
            <div style="max-width: 1280px; margin: 0 auto; padding: 0 24px;">
                
                <!-- Header -->
                <div style="margin-bottom: 32px;">
                    <h1 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700; color: #1e293b;">Welcome back, ${fullName}!</h1>
                    <p style="margin: 0; font-size: 16px; color: #64748b;">Track your progress and manage your events</p>
                </div>

                <!-- Stats Overview -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 32px;">
                    <div class="athlete-stats-card" style="--accent: #2563eb;">
                        <div class="stat-card-icon" style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);">🏆</div>
                        <div class="stat-card-number">${completedEvents.length}</div>
                        <div class="stat-card-label">Events Completed</div>
                        <div style="margin-top: 12px; font-size: 13px; color: #64748b;">${userRegistrations.length} total registered</div>
                    </div>

                    <div class="athlete-stats-card" style="--accent: #10b981;">
                        <div class="stat-card-icon" style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);">🏃</div>
                        <div class="stat-card-number">${upcomingEvents.length}</div>
                        <div class="stat-card-label">Upcoming Events</div>
                        <div style="margin-top: 12px; font-size: 13px; color: #64748b;">${upcomingEvents.length > 0 ? 'Next in 23 days' : 'No upcoming events'}</div>
                    </div>

                    <div class="athlete-stats-card" style="--accent: #f59e0b;">
                        <div class="stat-card-icon" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);">📏</div>
                        <div class="stat-card-number">${(userRegistrations.length * 10).toFixed(1)} km</div>
                        <div class="stat-card-label">Total Distance</div>
                        <div style="margin-top: 12px; font-size: 13px; color: #64748b;">Across ${userRegistrations.length} events</div>
                    </div>

                    <div class="athlete-stats-card" style="--accent: #8b5cf6;">
                        <div class="stat-card-icon" style="background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);">⚡</div>
                        <div class="stat-card-number" style="font-size: 24px;">Active</div>
                        <div class="stat-card-label">Current Status</div>
                        <div style="margin-top: 12px; font-size: 13px; color: #64748b;">Registered athlete</div>
                    </div>
                </div>

                <!-- Tabs -->
                <div style="background: white; border-radius: 16px; padding: 8px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;" id="athleteTabs">
                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                        <button class="modern-tab tab-trigger active" data-tab="overview" onclick="switchTab('athleteTabs', 'overview')">📊 Overview</button>
                        <button class="modern-tab tab-trigger" data-tab="upcoming" onclick="switchTab('athleteTabs', 'upcoming')">📅 Upcoming</button>
                        <button class="modern-tab tab-trigger" data-tab="registrations" onclick="switchTab('athleteTabs', 'registrations')">📋 My Registrations</button>
                        <button class="modern-tab tab-trigger" data-tab="history" onclick="switchTab('athleteTabs', 'history')">🏅 History</button>
                        <button class="modern-tab tab-trigger" data-tab="achievements" onclick="switchTab('athleteTabs', 'achievements')">🎖️ Achievements</button>
                        <button class="modern-tab tab-trigger" data-tab="analytics" onclick="switchTab('athleteTabs', 'analytics')">📈 Performance</button>
                    </div>

                    <!-- Overview Tab -->
                    <div class="tab-content active" id="overview" style="padding: 24px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                            <!-- Next Event -->
                            ${upcomingEvents[0] ? `
                            <div class="next-event-card">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                                    <div>
                                        <h3 style="margin: 0 0 4px 0; font-size: 20px; font-weight: 700; color: #1e40af;">Next Event</h3>
                                        <p style="margin: 0; font-size: 14px; color: #3b82f6;">${upcomingEvents[0].category} • ${upcomingEvents[0].distance}</p>
                                    </div>
                                    <span style="background: #2563eb; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">23 Days</span>
                                </div>
                                <h4 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #1e293b;">${upcomingEvents[0].title}</h4>
                                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
                                    <div style="display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 14px;">
                                        <span>📅</span> ${formatDate(upcomingEvents[0].date)}
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 14px;">
                                        <span>📍</span> ${upcomingEvents[0].location}
                                    </div>
                                </div>
                                <button class="action-btn-primary" onclick="navigateTo('event-details', '${upcomingEvents[0].id}')">
                                    View Event Details →
                                </button>
                            </div>
                            ` : `
                            <div class="next-event-card" style="text-align: center;">
                                <div style="font-size: 48px; margin-bottom: 12px;">🏃</div>
                                <h3 style="margin: 0 0 8px 0; color: #64748b;">No Upcoming Events</h3>
                                <p style="margin: 0; color: #94a3b8; font-size: 14px;">Register for an event to get started!</p>
                            </div>
                            `}

                            <!-- Training Progress -->
                            <div class="modern-card" style="padding: 24px;">
                                <h3 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 700; color: #1e293b;">Training Progress</h3>
                                <p style="margin: 0 0 20px 0; font-size: 13px; color: #64748b;">This month's goals</p>
                                
                                <div style="display: flex; flex-direction: column; gap: 20px;">
                                    <div>
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                            <span style="font-size: 14px; font-weight: 500; color: #374151;">Weekly Distance</span>
                                            <span style="font-size: 14px; color: #64748b;">45/50 km</span>
                                        </div>
                                        <div class="modern-progress"><div class="modern-progress-fill" style="width: 90%;"></div></div>
                                    </div>
                                    <div>
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                            <span style="font-size: 14px; font-weight: 500; color: #374151;">Training Sessions</span>
                                            <span style="font-size: 14px; color: #64748b;">12/15 completed</span>
                                        </div>
                                        <div class="modern-progress"><div class="modern-progress-fill" style="width: 80%;"></div></div>
                                    </div>
                                    <div>
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                            <span style="font-size: 14px; font-weight: 500; color: #374151;">Recovery Days</span>
                                            <span style="font-size: 14px; color: #64748b;">5/6 taken</span>
                                        </div>
                                        <div class="modern-progress"><div class="modern-progress-fill" style="width: 83%; background: linear-gradient(135deg, #10b981 0%, #34d399 100%);"></div></div>
                                    </div>
                                </div>
                                <button class="action-btn-outline" style="width: 100%; margin-top: 20px;">View Training Plan</button>
                            </div>
                        </div>

                        <!-- Recent Achievements -->
                        <div class="modern-card" style="padding: 24px;">
                            <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: #1e293b;">🎖️ Recent Achievements</h3>
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
                                ${achievements.length > 0 ? achievements.map(achievement => `
                                    <div class="achievement-badge">
                                        <div style="font-size: 40px; margin-bottom: 8px;">${achievement.icon}</div>
                                        <div style="font-size: 14px; font-weight: 600; color: #92400e;">${achievement.title}</div>
                                        <div style="font-size: 12px; color: #b45309;">${formatDateShort(achievement.date)}</div>
                                    </div>
                                `).join('') : '<p style="color: #64748b; text-align: center; grid-column: 1/-1;">No achievements yet. Keep participating to earn badges!</p>'}
                            </div>
                        </div>
                    </div>

                    <!-- Upcoming Events Tab -->
                    <div class="tab-content" id="upcoming" style="padding: 24px;">
                        ${upcomingEvents.length > 0 ? `
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                            ${upcomingEvents.map(event => `
                                <div class="modern-card">
                                    <img src="${event.imageUrl}" alt="${event.title}" style="width: 100%; height: 160px; object-fit: cover;">
                                    <div style="padding: 20px;">
                                        <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #1e293b;">${event.title}</h4>
                                        <p style="margin: 0 0 12px 0; font-size: 13px; color: #64748b;">${event.category} • ${event.distance}</p>
                                        <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px;">
                                            <div style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #64748b;">
                                                <span>📅</span> ${formatDateShort(event.date)}
                                            </div>
                                            <div style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #64748b;">
                                                <span>📍</span> ${event.location}
                                            </div>
                                        </div>
                                        <span style="display: inline-block; background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 12px;">✓ Registered</span>
                                        <button class="action-btn-outline" style="width: 100%;" onclick="navigateTo('event-details', '${event.id}')">View Details</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        ` : `
                        <div class="modern-card" style="padding: 48px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 12px;">📅</div>
                            <h3 style="margin: 0 0 8px 0; color: #64748b;">No Upcoming Events</h3>
                            <p style="margin: 0 0 20px 0; color: #94a3b8; font-size: 14px;">You don't have any upcoming registered events</p>
                            <button class="action-btn-primary" style="width: auto; display: inline-flex;" onclick="navigateTo('events')">
                                Browse Events
                            </button>
                        </div>
                        `}
                    </div>

                    <!-- My Registrations Tab -->
                    <div class="tab-content" id="registrations" style="padding: 24px;">
                        <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #1e293b;">📋 My Event Registrations</h3>
                        ${userRegistrations.length > 0 ? `
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            ${userRegistrations.map(reg => {
                                const event = uniqueEvents.find(e => String(e.id) === String(reg.eventId)) || userEvents.find(e => (e.title || '').toLowerCase() === (reg.eventName || '').toLowerCase());
                                const isCompleted = event ? getDynamicStatus(event.date) === 'completed' : false;
                                return `
                                <div class="event-history-item" style="cursor: pointer;" onclick="navigateTo('event-details', '${reg.eventId || event?.id || ''}')">
                                    <div style="display: flex; align-items: center; gap: 16px; flex: 1;">
                                        <div style="width: 60px; height: 60px; border-radius: 12px; background: linear-gradient(135deg, ${isCompleted ? '#fef3c7' : '#dbeafe'}, ${isCompleted ? '#fde68a' : '#bfdbfe'}); display: flex; align-items: center; justify-content: center; font-size: 24px;">
                                            ${isCompleted ? '🏅' : '📅'}
                                        </div>
                                        <div>
                                            <h4 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #1e293b;">${reg.eventName || 'Registered Event'}</h4>
                                            <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748b;">${event?.category || 'Event'} • ${event?.distance || '—'}</p>
                                            <p style="margin: 0; font-size: 12px; color: #94a3b8;">Registered: ${formatDateShort(reg.registeredAt)}</p>
                                        </div>
                                    </div>
                                    <div style="text-align: right;">
                                        <span style="background: ${isCompleted ? '#fef3c7' : '#dcfce7'}; color: ${isCompleted ? '#92400e' : '#166534'}; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;">${isCompleted ? '🏅 Completed' : '📅 Upcoming'}</span>
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                        ` : `
                        <div class="modern-card" style="padding: 48px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 12px;">📋</div>
                            <h3 style="margin: 0 0 8px 0; color: #64748b;">No Registrations Yet</h3>
                            <p style="margin: 0 0 20px 0; color: #94a3b8; font-size: 14px;">You haven't registered for any events yet</p>
                            <button class="action-btn-primary" style="width: auto; display: inline-flex;" onclick="navigateTo('events')">
                                Browse Events
                            </button>
                        </div>
                        `}
                    </div>

                    <!-- Event History Tab -->
                    <div class="tab-content" id="history" style="padding: 24px;">
                        <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #1e293b;">🏅 Completed Events</h3>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                            ${completedEvents.length > 0 ? completedEvents.map(event => `
                                <div class="modern-card" style="overflow: hidden;">
                                    <div style="display: flex;">
                                        <img src="${event.imageUrl}" alt="${event.title}" style="width: 120px; height: 120px; object-fit: cover;">
                                        <div style="padding: 16px; flex: 1;">
                                            <h4 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #1e293b;">${event.title}</h4>
                                            <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">${event.category} • ${event.distance}</p>
                                            <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; margin-bottom: 8px;">
                                                <span>📅</span> ${formatDateShort(event.date)}
                                            </div>
                                            <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b;">
                                                <span>📍</span> ${event.location}
                                            </div>
                                        </div>
                                    </div>
                                    <div style="padding: 12px 16px; border-top: 1px solid #e2e8f0; background: #f8fafc;">
                                        <button class="action-btn-primary" style="padding: 10px 16px; font-size: 13px;" onclick="navigateTo('event-details', '${event.id}')">
                                            🏆 View Results
                                        </button>
                                    </div>
                                </div>
                            `).join('') : `
                                <div class="modern-card" style="grid-column: 1/-1; padding: 48px; text-align: center;">
                                    <div style="font-size: 48px; margin-bottom: 12px;">🏅</div>
                                    <h3 style="margin: 0 0 8px 0; color: #64748b;">No Completed Events</h3>
                                    <p style="margin: 0; color: #94a3b8; font-size: 14px;">Events you participate in will appear here after completion</p>
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- Achievements Tab -->
                    <div class="tab-content" id="achievements" style="padding: 24px;">
                        <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #1e293b;">🎖️ Achievements</h3>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
                            ${achievements.map(achievement => `
                                <div class="modern-card" style="padding: 24px; text-align: center;">
                                    <div style="font-size: 64px; margin-bottom: 12px;">${achievement.icon}</div>
                                    <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e293b;">${achievement.title}</h4>
                                    <p style="margin: 0; font-size: 13px; color: #64748b;">Earned on ${formatDate(achievement.date)}</p>
                                </div>
                            `).join('')}
                            
                            <div class="modern-card" style="padding: 24px; text-align: center; border: 2px dashed #cbd5e1; opacity: 0.7;">
                                <div style="font-size: 64px; margin-bottom: 12px; opacity: 0.3;">🔒</div>
                                <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #94a3b8;">Century Club</h4>
                                <p style="margin: 0 0 12px 0; font-size: 13px; color: #94a3b8;">Complete 100km total</p>
                                <div class="modern-progress"><div class="modern-progress-fill" style="width: 48.75%;"></div></div>
                            </div>
                        </div>
                    </div>

                    <!-- Analytics Tab -->
                    <div class="tab-content" id="analytics" style="padding: 24px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                            <div class="modern-card" style="padding: 24px;">
                                <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: #1e293b;">📊 Performance Trends</h3>
                                <div style="height: 240px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px;">
                                    <p style="color: #94a3b8;">Performance chart visualization</p>
                                </div>
                            </div>

                            <div class="modern-card" style="padding: 24px;">
                                <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: #1e293b;">🏃 Personal Records</h3>
                                <div style="display: flex; flex-direction: column; gap: 12px;">
                                    <div class="pr-card-modern">
                                        <div>
                                            <p style="margin: 0; font-weight: 600; color: #1e293b;">5K</p>
                                            <p style="margin: 0; font-size: 13px; color: #64748b;">Best Time</p>
                                        </div>
                                        <div style="text-align: right;">
                                            <p style="margin: 0; font-size: 20px; font-weight: 700; color: #f59e0b;">19:45</p>
                                            <p style="margin: 0; font-size: 12px; color: #94a3b8;">Mar 2025</p>
                                        </div>
                                    </div>
                                    <div class="pr-card-modern">
                                        <div>
                                            <p style="margin: 0; font-weight: 600; color: #1e293b;">10K</p>
                                            <p style="margin: 0; font-size: 13px; color: #64748b;">Best Time</p>
                                        </div>
                                        <div style="text-align: right;">
                                            <p style="margin: 0; font-size: 20px; font-weight: 700; color: #2563eb;">41:22</p>
                                            <p style="margin: 0; font-size: 12px; color: #94a3b8;">Feb 2026</p>
                                        </div>
                                    </div>
                                    <div class="pr-card-modern">
                                        <div>
                                            <p style="margin: 0; font-weight: 600; color: #1e293b;">Half Marathon</p>
                                            <p style="margin: 0; font-size: 13px; color: #64748b;">Best Time</p>
                                        </div>
                                        <div style="text-align: right;">
                                            <p style="margin: 0; font-size: 20px; font-weight: 700; color: #8b5cf6;">1:32:18</p>
                                            <p style="margin: 0; font-size: 12px; color: #94a3b8;">Jan 2026</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- LOGOUT BUTTON -->
                <div style="text-align: center; margin-top: 32px;">
                    <button class="action-btn-outline" id="dashboardLogoutBtn" style="padding: 12px 40px;">Logout</button>
                </div>
            </div>
        </div>
    `;

    /* ================= EVENTS ================= */

    const logoutBtn = container.querySelector("#dashboardLogoutBtn");
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem("currentUser");
            navigateTo("landing");
        };
    }
}

/* ================= EXPORT ================= */

export { renderAthleteDashboard };
