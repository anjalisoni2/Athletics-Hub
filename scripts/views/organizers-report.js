// organizers-report.js

import { createIcon, formatNumber } from "../utils.js";
import { getAPIEndpoint } from "../api-config.js";

// Helper function to get standardized organizer name
function getOrganizerNameForMatching(organizer) {
    return (organizer || '').toString().toLowerCase().trim();
}

// Global function to toggle organizer events dropdown
window.toggleOrganizerEvents = async function (element, organizerIndex) {
    const dropdown = document.querySelector(`.events-dropdown-${organizerIndex}`);
    const icon = document.querySelector(`.dropdown-icon-${organizerIndex}`);

    if (!dropdown) return;

    const isOpen = dropdown.style.display !== 'none' && dropdown.style.maxHeight !== '0px';

    if (!isOpen) {
        // Open dropdown
        dropdown.style.display = 'block';
        // Trigger reflow to ensure transition works
        dropdown.offsetHeight;
        dropdown.style.maxHeight = '500px';
        if (icon) icon.style.transform = 'rotate(180deg)';

        // Always load fresh events when dropdown opens (dynamic refresh)
        const eventsList = document.querySelector(`.events-list-${organizerIndex}`);
        if (eventsList) {
            // Get organizer name from the clicked element's sibling
            const orgNameElement = element.querySelector('p[style*="font-weight: 600"]');
            const organizerName = orgNameElement ? orgNameElement.textContent.trim() : '';

            await loadOrganizerEvents(organizerIndex, eventsList, organizerName);
        }
    } else {
        // Close dropdown
        dropdown.style.maxHeight = '0px';
        if (icon) icon.style.transform = 'rotate(0deg)';

        setTimeout(() => {
            dropdown.style.display = 'none';
        }, 300);
    }
};

// Load organizer events
async function loadOrganizerEvents(organizerIndex, eventsList, organizerName) {
    try {
        // Get events from localStorage (newly created events)
        const localEvents = JSON.parse(localStorage.getItem("events") || "[]");

        // Fetch from API
        let apiEvents = [];
        try {
            const response = await fetch(getAPIEndpoint('/api/approved-events/'));
            if (response.ok) {
                apiEvents = await response.json();
            }
        } catch (err) {
            console.log("API not available, using localStorage only");
        }

        // Ensure both are arrays
        const events = Array.isArray(apiEvents) ? apiEvents : [];

        // Combine localStorage events with API events (avoid duplicates)
        const eventIds = new Set(events.map(e => e.id));
        const uniqueLocalEvents = localEvents.filter(e => !eventIds.has(e.id));
        const allEvents = [...events, ...uniqueLocalEvents];

        // Find events for this organizer using multiple field checks
        console.log(`Loading events for organizer: "${organizerName}", Total events available: ${allEvents.length}`);
        console.log('All available events:', allEvents.map(e => ({
            title: e.title || e.name,
            organizer: e.organizer,
            createdBy: e.createdBy,
            createdByUsername: e.createdByUsername
        })));

        const organizerEvents = allEvents.filter(e => {
            // Primary check: match by createdByUsername (most reliable)
            const eventCreatedByUsername = (e.createdByUsername || '').toString().toLowerCase().trim();
            const currentUsernameLower = organizerName.toLowerCase().trim();

            if (eventCreatedByUsername && eventCreatedByUsername === currentUsernameLower) {
                console.log(`✓ Event "${e.title || e.name}" matched by createdByUsername: "${eventCreatedByUsername}" === "${currentUsernameLower}"`);
                return true;
            }

            // Fallback: check multiple fields for organizer matching
            const eventOrganizer = (e.organizer || e.createdBy || e.creator || e.organizerName || '').toString().toLowerCase().trim();
            const currentOrganizerLower = organizerName.toLowerCase().trim();
            const matches = eventOrganizer === currentOrganizerLower;
            if (matches) {
                console.log(`✓ Event "${e.title || e.name}" matched by organizer field: "${eventOrganizer}" === "${currentOrganizerLower}"`);
            }
            return matches;
        });

        console.log(`Found ${organizerEvents.length} events for organizer "${organizerName}"`);
        console.log('Organizer events:', organizerEvents);

        // Update the event count in the organizer card header
        const eventCountElement = document.querySelector(`[data-event-count="${organizerIndex}"]`);
        if (eventCountElement) {
            eventCountElement.textContent = formatNumber(organizerEvents.length);
            console.log(`✓ Updated event count for organizer at index ${organizerIndex}: ${organizerEvents.length} events`);
        } else {
            console.warn(`✗ Could not find event count element for index ${organizerIndex}`);
        }

        if (organizerEvents.length === 0) {
            eventsList.innerHTML = '<p style="color: var(--gray-500); font-size: 0.875rem;">No events created yet</p>';
        } else {
            eventsList.innerHTML = organizerEvents.map((event, idx) => `
                <div style="
                    padding: 1rem;
                    background: white;
                    border-radius: 6px;
                    border: 1px solid var(--gray-200);
                    margin-bottom: 0.75rem;
                    transition: all 0.3s ease;
                    cursor: pointer;
                "
                onmouseover="this.style.background='var(--gray-50)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)';"
                onmouseout="this.style.background='white'; this.style.boxShadow='none';">
                    <div style="display: flex; align-items: start; gap: 1rem;">
                        <div style="width: 8px; height: 8px; background: var(--primary-blue); border-radius: 50%; margin-top: 0.5rem; flex-shrink: 0;"></div>
                        <div style="flex: 1;">
                            <p style="font-weight: 600; color: var(--gray-900); font-size: 0.95rem; margin: 0 0 0.5rem 0;">
                                ${event.title || event.name || 'Untitled Event'}
                            </p>
                            <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; font-size: 0.85rem; color: var(--gray-600);">
                                <span style="display: flex; align-items: center; gap: 0.4rem;">
                                    📅 ${event.date || event.start_date ? (event.date || event.start_date).substring(0, 10) : 'N/A'}
                                </span>
                                ${event.location ? `<span style="display: flex; align-items: center; gap: 0.4rem;">📍 ${event.location}</span>` : ''}
                                <span style="display: flex; align-items: center; gap: 0.4rem; color: var(--primary-blue); font-weight: 500;">
                                    👥 ${formatNumber(event.registrations || event.participants || 0)} registrations
                                </span>
                                ${event.status ? `<span style="display: inline-block; padding: 0.25rem 0.75rem; background: ${event.status === 'approved' || event.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(249, 115, 22, 0.1)'}; color: ${event.status === 'approved' || event.status === 'APPROVED' ? '#047857' : '#b45309'}; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${event.status}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Error loading events:', err);
        eventsList.innerHTML = '<p style="color: var(--gray-500); font-size: 0.875rem;">No events created yet</p>';
    }
}


export async function renderOrganizersReport(container) {
    // Check if user has admin access
    const currentUser = localStorage.getItem("currentUser");
    const users = JSON.parse(localStorage.getItem("users") || "{}");
    const userData = users[currentUser];

    if (!userData || (userData.role !== "superadmin" && userData.role !== "admin")) {
        container.innerHTML = `
            <div class="bg-gray-50" style="min-height: 100vh; padding: 2rem; display: flex; align-items: center; justify-content: center;">
                <div class="card" style="max-width: 500px;">
                    <div class="card-content" style="text-align: center;">
                        <div style="margin-bottom: 1rem;">
                            ${createIcon('lockCircle').outerHTML}
                        </div>
                        <h2 class="text-2xl font-bold mb-2">Access Denied</h2>
                        <p class="text-gray-600">Only admin users can access organizers report.</p>
                        
                    </div>
                </div>
            </div>
        `;
        return;
    }

    // Get registered organizers from localStorage (only those with organizer role)
    const registeredOrganizers = Object.entries(users)
        .filter(([username, userData]) => {
            if (userData.role !== "organizer") {
                return false;
            }

            return userData.approvalStatus !== "pending" && userData.approvalStatus !== "rejected";
        })
        .map(([username, userData]) => ({
            username: username,
            organizerName: userData.organizationName || userData.name || username,
            organizerEmail: userData.email || 'N/A',
            status: 'active'
        }));

    // Fetch events to get event counts for each organizer
    let allEvents = [];

    // First, get events from localStorage (newly created events)
    const localEvents = JSON.parse(localStorage.getItem("events") || "[]");

    // Then fetch from API
    try {
        const response = await fetch(getAPIEndpoint('/api/approved-events/'));
        if (response.ok) {
            const apiEvents = await response.json();
            allEvents = Array.isArray(apiEvents) ? apiEvents : [];
        } else {
            throw new Error('API failed');
        }
    } catch (err) {
        console.warn('Could not fetch from API:', err);
        allEvents = [];
    }

    // Combine localStorage events with API events (avoid duplicates by ID)
    const eventIds = new Set(allEvents.map(e => e.id));
    const uniqueLocalEvents = localEvents.filter(e => !eventIds.has(e.id));
    allEvents = [...allEvents, ...uniqueLocalEvents];

    // Ensure allEvents is an array
    if (!Array.isArray(allEvents)) {
        allEvents = [];
    }

    // Calculate event count for each organizer
    const organizersWithCounts = registeredOrganizers.map(org => {
        const currentOrganizerLower = org.organizerName.toLowerCase().trim();
        const currentUsernameLower = org.username.toLowerCase().trim();

        const eventCount = allEvents.filter(event => {
            // Primary check: match by createdByUsername (most reliable)
            const eventCreatedByUsername = (event.createdByUsername || '').toString().toLowerCase().trim();
            if (eventCreatedByUsername && eventCreatedByUsername === currentUsernameLower) {
                console.log(`✓ Event "${event.title || event.name}" matched to organizer "${org.username}" by username`);
                return true;
            }

            // Fallback: check multiple fields for organizer matching
            const eventOrganizer = (event.organizer || event.createdBy || event.creator || event.organizerName || '').toString().toLowerCase().trim();

            // Match by organizer name OR by username
            const matchesByName = eventOrganizer === currentOrganizerLower;
            const matchesByUsername = eventOrganizer === currentUsernameLower;

            if (matchesByName || matchesByUsername) {
                console.log(`✓ Event "${event.title || event.name}" matched to organizer "${org.username}" by organizer field`);
            }
            return matchesByName || matchesByUsername;
        }).length;

        console.log(`Organizer: ${org.organizerName} (${org.username}), Event Count: ${eventCount}`);

        return {
            ...org,
            eventCount: eventCount
        };
    });

    // Create organizers data object
    const organizersData = {
        totalOrganizers: organizersWithCounts.length,
        totalEvents: allEvents.length,
        organizers: organizersWithCounts
    };

    console.log('Organizers Data Summary:');
    console.log(`- Total Organizers: ${organizersData.totalOrganizers}`);
    console.log(`- Total Events: ${organizersData.totalEvents}`);
    console.log(`- All Events Details:`, allEvents);
    console.log('- Organizers with Counts:', organizersWithCounts);

    // Sort organizers by event count
    const sortedOrganizers = (organizersData.organizers || []).sort((a, b) => (b.eventCount || 0) - (a.eventCount || 0));

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
                            ${createIcon('briefcase').outerHTML}
                        </div>
                        <h1 class="text-4xl font-bold">Organizers Report</h1>
                    </div>
                    <p class="text-xl text-gray-600">Platform organizers and their event statistics</p>
                </div>

                <!-- Quick Stats -->
                <div class="grid grid-md-2 grid-lg-3 gap-6 mb-8">
                    <div class="dashboard-stat" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(59, 130, 246, 0.02)); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.05);">
                        <div class="stat-header">
                            <div class="stat-title" style="font-size: 0.875rem; color: var(--gray-600); text-transform: uppercase; letter-spacing: 0.5px;">Total Organizers</div>
                            <div class="stat-icon" style="color: #3B82F6;">${createIcon('briefcase').outerHTML}</div>
                        </div>
                        <div class="stat-number" style="font-size: 2rem; font-weight: 700; color: var(--gray-900); margin: 0.5rem 0;">${formatNumber(organizersData.totalOrganizers || 0)}</div>
                        <div class="stat-change positive" style="color: #3B82F6; font-size: 0.875rem;">Active organizers</div>
                    </div>

                    <div class="dashboard-stat" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(139, 92, 246, 0.02)); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(139, 92, 246, 0.05);">
                        <div class="stat-header">
                            <div class="stat-title" style="font-size: 0.875rem; color: var(--gray-600); text-transform: uppercase; letter-spacing: 0.5px;">Total Events</div>
                            <div class="stat-icon" style="color: #8B5CF6;">${createIcon('calendar').outerHTML}</div>
                        </div>
                        <div class="stat-number" style="font-size: 2rem; font-weight: 700; color: var(--gray-900); margin: 0.5rem 0;">${formatNumber(organizersData.totalEvents || 0)}</div>
                        <div class="stat-change positive" style="color: #8B5CF6; font-size: 0.875rem;">Created by organizers</div>
                    </div>

                    <div class="dashboard-stat" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 0.02)); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.05);">
                        <div class="stat-header">
                            <div class="stat-title" style="font-size: 0.875rem; color: var(--gray-600); text-transform: uppercase; letter-spacing: 0.5px;">Avg Events</div>
                            <div class="stat-icon" style="color: #10B981;">${createIcon('trendingUp').outerHTML}</div>
                        </div>
                        <div class="stat-number" style="font-size: 2rem; font-weight: 700; color: var(--gray-900); margin: 0.5rem 0;">${organizersData.totalOrganizers > 0 ? (organizersData.totalEvents / organizersData.totalOrganizers).toFixed(1) : 0}</div>
                        <div class="stat-change positive" style="color: #10B981; font-size: 0.875rem;">Per organizer</div>
                    </div>
                </div>

                <!-- Organizers List -->
                <div class="card" style="box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border: 1px solid var(--gray-200);">
                    <div class="card-header" style="border-bottom: 1px solid var(--gray-200); padding-bottom: 1.25rem;">
                        <div class="card-title" style="font-size: 1.25rem; font-weight: 600; color: var(--gray-900); margin-bottom: 0.5rem;">Organizers Details</div>
                        <div class="card-description" style="color: var(--gray-500); font-size: 0.9rem;">List of all organizers and their event counts</div>
                    </div>
                    <div class="card-content">
                        ${sortedOrganizers.length === 0
            ? '<p style="color: var(--gray-500); text-align: center; padding: 2rem;">No organizers found</p>'
            : `
                                <div style="display: flex; flex-direction: column; gap: 1rem;">
                                    ${sortedOrganizers.map((org, index) => `
                                        <div style="border: 1px solid var(--gray-200); border-radius: 8px; overflow: hidden;">
                                            <div style="padding: 1rem; background: var(--gray-50); display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: background 0.2s;"
                                                 onmouseover="this.style.background='var(--gray-100)'"
                                                 onmouseout="this.style.background='var(--gray-50)'"
                                                 onclick="toggleOrganizerEvents(this, ${index})">
                                                <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
                                                    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, var(--primary-blue), var(--primary-purple)); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.875rem;">
                                                        ${org.organizerName ? org.organizerName.charAt(0).toUpperCase() : 'O'}
                                                    </div>
                                                    <div style="flex: 1;">
                                                        <p style="font-weight: 600; color: var(--gray-900);">${org.organizerName || 'Unknown'}</p>
                                                        <p style="font-size: 0.8rem; color: var(--gray-500);">${org.organizerEmail || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div style="display: flex; align-items: center; gap: 2rem; margin-right: 1rem;">
                                                    <div style="text-align: center;">
                                                        <span data-event-count="${index}" style="
                                                            display: inline-flex;
                                                            align-items: center;
                                                            justify-content: center;
                                                            width: 50px;
                                                            height: 50px;
                                                            background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05));
                                                            border-radius: 8px;
                                                            font-weight: 700;
                                                            color: #8B5CF6;
                                                            font-size: 1.2rem;
                                                        ">${formatNumber(org.eventCount || 0)}</span>
                                                        <p style="font-size: 0.75rem; color: var(--gray-600); margin-top: 0.25rem; font-weight: 500;">Events</p>
                                                    </div>
                                                    <span style="
                                                        display: inline-block;
                                                        padding: 0.375rem 0.875rem;
                                                        border-radius: 9999px;
                                                        font-size: 0.8rem;
                                                        font-weight: 600;
                                                        ${org.status === 'active' ? 'background: rgba(16, 185, 129, 0.1); color: #047857; border: 1px solid rgba(16, 185, 129, 0.3);' : 'background: rgba(249, 115, 22, 0.1); color: #b45309; border: 1px solid rgba(249, 115, 22, 0.3);'}
                                                    ">${org.status || 'Active'}</span>
                                                    <div class="dropdown-icon-${index}" style="
                                                        width: 24px;
                                                        height: 24px;
                                                        display: flex;
                                                        align-items: center;
                                                        justify-content: center;
                                                        color: var(--gray-600);
                                                        transition: transform 0.3s;
                                                        font-size: 1.2rem;
                                                    ">▼</div>
                                                </div>
                                            </div>
                                            <div class="events-dropdown-${index}" style="display: none; padding: 0; max-height: 0; overflow: hidden; transition: all 0.3s ease;">
                                                <div style="padding: 1rem; border-top: 1px solid var(--gray-200); background: white;">
                                                    <p style="font-size: 0.875rem; font-weight: 600; color: var(--gray-700); margin-bottom: 0.75rem;">Events Created:</p>
                                                    <div class="events-list-${index}" style="display: flex; flex-direction: column; gap: 0.5rem;">
                                                        <p style="color: var(--gray-500); font-size: 0.875rem;">Loading events...</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            `
        }
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Helper function to render organizers chart
function renderOrganizerChart(organizers) {
    if (!organizers || organizers.length === 0) {
        return '<p style="color: var(--gray-500); text-align: center; padding: 2rem;">No data available</p>';
    }

    const topOrganizers = organizers.slice(0, 7);
    const eventCounts = topOrganizers.map(org => org.eventCount || 0);
    const maxValue = Math.max(...eventCounts);
    const minValue = Math.min(...eventCounts);
    const range = maxValue - minValue || 1;

    const chartHeight = 300;

    let chartHTML = `
        <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.02), rgba(147, 51, 234, 0.02)); border-radius: 12px; padding: 2rem 1rem 3rem 1rem; overflow-x: auto;">
            <div style="position: relative; min-height: ${chartHeight}px; display: flex; align-items: flex-end; gap: 2rem; justify-content: center; padding-top: 2rem; min-width: max-content;">
    `;

    topOrganizers.forEach((org, index) => {
        const eventCount = org.eventCount || 0;
        const normalizedHeight = ((eventCount - minValue) / range) * chartHeight;

        const organizerName = org.organizerName || `Organizer ${index + 1}`;
        const displayName = organizerName.length > 14 ? organizerName.substring(0, 14) : organizerName;

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
                " class="chart-bar" title="${organizerName}: ${eventCount} events" 
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
                    ${eventCount}
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
                <span>Hover over bars to see exact counts</span>
            </div>
        </div>
    `;

    return chartHTML;
}
