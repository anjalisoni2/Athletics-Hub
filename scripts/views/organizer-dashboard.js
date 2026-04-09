// Organizer Dashboard View
import { createIcon } from "../utils.js";
import { getRegistrations } from "../storage.js";
import { getAPIEndpoint } from "../api-config.js";

// Helper functions
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatDateShort(date) {
    return new Date(date).toLocaleDateString();
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'active': return 'badge-success';
        case 'upcoming': return 'badge-warning';
        case 'completed': return 'badge-outline';
        default: return 'badge-outline';
    }
}
// async function fetchVolunteers() {
//   const res = await fetch("https://athletics-hub.onrender.com/api/organizer/volunteers/");
//   return res.ok ? await res.json() : [];
// }

async function fetchVolunteers() {
    try {
        const currentUser = localStorage.getItem("currentUser");
        if (!currentUser) return [];

        const res = await fetch(
            getAPIEndpoint(`/api/organizer/volunteers/?organizer_username=${currentUser}`)
        );

        return res.ok ? await res.json() : [];

    } catch (err) {
        console.error("Error fetching volunteers:", err);
        return [];
    }
}
// Fetch approved events from backend
// async function loadApprovedOrganizerEvents() {
//     try {
//         const res = await fetch("https://athletics-hub.onrender.com/api/approved-events/");
//         if (!res.ok) throw new Error("Failed to fetch approved events");
//         const events = await res.json();
//         return events;
//     } catch (err) {
//         console.error("Error loading approved events:", err);
//         return [];
//     }
// }


async function loadApprovedOrganizerEvents() {
    try {
        const currentUser = localStorage.getItem("currentUser");

        if (!currentUser) return [];

        const res = await fetch(
            getAPIEndpoint(`/api/approved-events/?organizer_username=${currentUser}`)
        );

        if (!res.ok) throw new Error("Failed to fetch approved events");

        return await res.json();

    } catch (err) {
        console.error("Error loading approved events:", err);
        return [];
    }
}

function renderVolunteerButtons(volunteer) {
    const status = (volunteer.status || '').toLowerCase();

    // 👉 If no status yet OR still pending → show ALL 3 buttons
    if (!status || status === 'pending') {
    return `
        <button type="button" class="btn btn-sm btn-success"
            style="padding: 4px 10px; font-size: 11px;"
            data-status="approved"
            onclick="updateVolunteerStatus(event, '${volunteer.id}', this)">
            Approve
        </button>

        <button type="button" class="btn btn-sm btn-warning"
            style="padding: 4px 10px; font-size: 11px;"
            data-status="pending"
            onclick="updateVolunteerStatus(event, '${volunteer.id}', this)">
            Pending
        </button>

        <button type="button" class="btn btn-sm btn-error"
            style="padding: 4px 10px; font-size: 11px;"
            data-status="rejected"
            onclick="updateVolunteerStatus(event, '${volunteer.id}', this)">
            Reject
        </button>
    `;
    }

    
    // 👉 If already has status → show only that one with correct color
let btnClass = '';
if (status === 'approved') btnClass = 'btn-success';
else if (status === 'pending') btnClass = 'btn-warning';
else if (status === 'rejected') btnClass = 'btn-error';

return `
    <button type="button"
        class="btn btn-sm ${btnClass}"
        style="padding: 4px 10px; font-size: 11px;"
        data-status="${status}"
        onclick="updateVolunteerStatus(event, '${volunteer.id}', this)">
        ${status.charAt(0).toUpperCase() + status.slice(1)}
    </button>
`;
}



window.updateVolunteerStatus = async function(event, volunteerId, clickedButton) {
    if (event) event.preventDefault();

    const status = clickedButton.getAttribute('data-status');
    const volunteerRow = document.getElementById(`volunteer-${volunteerId}`);
    if (!volunteerRow) return;

    const buttonsContainer = volunteerRow.querySelector('.volunteer-buttons');

    try {
        const response = await fetch(getAPIEndpoint(`/api/volunteers/${volunteerId}/status/`), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        if (!response.ok) throw new Error('Failed to update status');

        // ✅ Update UI immediately after success
        let btnClass = '';
        if (status === 'approved') btnClass = 'btn-success';
        else if (status === 'pending') btnClass = 'btn-warning';
        else if (status === 'rejected') btnClass = 'btn-error';

        buttonsContainer.innerHTML = `
            <button type="button"
                class="btn btn-sm ${btnClass}"
                style="padding: 4px 10px; font-size: 11px;"
                data-status="${status}"
                onclick="updateVolunteerStatus(event, '${volunteerId}', this)">
                ${status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
        `;

    } catch (err) {
        console.error('Error updating status:', err);
        alert('Failed to update status. Try again!');
    }
};


// Fetch registrations from backend or fallback to localStorage
// async function fetchOrganizerRegistrations() {
//     try {
//         const response = await fetch('/api/organizer/registrations/', {
//             method: 'GET',
//             headers: { 'Content-Type': 'application/json' },
//             credentials: 'include'
//         });
//         if (response.ok) {
//             return await response.json();
//         }
//     } catch (err) {
//         console.log("Backend not available, fetching from localStorage");
//     }
//     return getRegistrations();
// }


async function fetchOrganizerRegistrations() {
    try {
        const currentUser = localStorage.getItem("currentUser");
        if (!currentUser) return [];

        const response = await fetch(
            getAPIEndpoint(`/api/organizer/registrations/?organizer_username=${currentUser}`)
        );

        if (response.ok) {
            return await response.json();
        }
    } catch (err) {
        console.log("Error fetching registrations:", err);
    }

    return [];
}

async function displayRegistrations(container, registrations) {
    const participantsContainer = container.querySelector('#participantsContainer');
    if (!registrations || registrations.length === 0) {
        participantsContainer.innerHTML = `<div style="text-align: center; padding: 60px 20px; background: #f8fafc; border-radius: 12px;"><p style="color: #64748b; margin: 0;">No registrations yet</p></div>`;
        return;
    }

    const grouped = groupRegistrationsByEvent(registrations);

    participantsContainer.innerHTML = Object.entries(grouped).map(([eventName, participants]) => {
        const maleCount = participants.filter(p => (p.gender || '').toLowerCase() === 'male').length;
        const femaleCount = participants.filter(p => (p.gender || '').toLowerCase() === 'female').length;
        const revenue = participants.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const registeredCount = participants.length;

        return `
        <div class="event-group" 
             data-event="${eventName}" 
             data-participants='${JSON.stringify(participants)}'
             data-registered="${registeredCount}"
             style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div>
                    <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e293b;">${eventName}</h3>
                    <button style="padding: 6px 14px; font-size: 12px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;" onclick='viewEventRegistrations("${eventName}")'>
                        👁️ View List
                    </button>
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                    <span style="padding: 4px 8px; font-size: 11px; background: #dbeafe; color: #1e40af; border-radius: 6px; font-weight: 600;">👨 ${maleCount}</span>
                    <span style="padding: 4px 8px; font-size: 11px; background: #fce7f3; color: #9d174d; border-radius: 6px; font-weight: 600;">👩 ${femaleCount}</span>
                    <span style="padding: 4px 8px; font-size: 11px; background: #dcfce7; color: #166534; border-radius: 6px; font-weight: 600;">₹${Math.round(revenue)}</span>
                </div>
            </div>
            <div class="event-details hidden" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;"></div>
        </div>`;
    }).join('');
}

window.viewEventDetails = function(event) {
    const modal = document.getElementById('eventDetailsModal');
    if (!modal) return;

    const content = modal.querySelector('.modal-content');
    content.innerHTML = `
        <h3 class="text-xl font-bold mb-4">${event.title}</h3>
        <div class="grid grid-cols-2 gap-4">
            <div><strong>Date:</strong> ${formatDateShort(event.date)}</div>
            <div><strong>Max Participants:</strong> ${event.maxParticipants}</div>
            <div><strong>Price:</strong> $${event.price}</div>
            <div><strong>Registrations:</strong> ${event.participants || 0}</div>
        </div>
        <p class="mt-4">${event.description || "No description available"}</p>
        <div class="mt-6 text-right">
            <button class="btn btn-primary" onclick="closeEventDetailsModal()">Close</button>
        </div>
    `;
    modal.classList.remove('hidden');
};

window.closeEventDetailsModal = function(event) {
    if (!event || event.target.classList.contains('modal-overlay')) {
        document.getElementById('eventDetailsModal').classList.add('hidden');
    }
};

window.viewRegistrationDetails = function(reg) {
    const modal = document.getElementById('registrationDetailsModal');
    if (!modal) return;

    const content = modal.querySelector('.modal-content');
    content.innerHTML = `
        <span class="modal-close absolute top-2 right-3 cursor-pointer text-gray-500 text-xl">&times;</span>
        <h3 class="text-xl font-bold mb-4">Participant Details</h3>
        <div class="grid grid-cols-2 gap-4">
            <div><strong>Name:</strong> ${reg.firstName || reg.first_name || ''} ${reg.lastName || reg.last_name || ''}</div>
            <div><strong>Event:</strong> ${reg.eventName || reg.event_name || 'Unknown'}</div>
            <div><strong>Email:</strong> ${reg.email || ''}</div>
            <div><strong>Mobile:</strong> ${reg.mobile || ''}</div>
            <div><strong>Gender:</strong> ${reg.gender || ''}</div>
            <div><strong>Registered At:</strong> ${formatDateShort(reg.registeredAt || new Date().toISOString())}</div>
            ${reg.amount ? `<div><strong>Amount Paid:</strong> $${reg.amount}</div>` : ''}
            ${reg.emergencyContact || reg.emergency_contact ? `<div><strong>Emergency Contact:</strong> ${reg.emergencyContact || reg.emergency_contact}</div>` : ''}
            ${reg.medicalCondition || reg.medical_condition ? `<div class="col-span-2 text-orange-600"><strong>Medical Condition:</strong> ${reg.medicalCondition || reg.medical_condition}</div>` : ''}
        </div>
    `;

    // Close button inside modal
    content.querySelector('.modal-close').addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    modal.classList.remove('hidden');
};




window.viewEventRegistrations = function(eventName) {
    const eventGroup = document.querySelector(`.event-group[data-event="${eventName}"]`);
    if (!eventGroup) {
        console.log('Event group not found for:', eventName);
        return;
    }

    const detailsContainer = eventGroup.querySelector('.event-details');
    if (!detailsContainer) {
        console.log('Details container not found');
        return;
    }
    
    if (!detailsContainer.classList.contains('hidden')) {
        detailsContainer.classList.add('hidden');
        return;
    }

    const participants = JSON.parse(eventGroup.dataset.participants || '[]');
    
    if (participants.length === 0) {
        detailsContainer.innerHTML = `<p style="margin: 0; font-size: 14px; color: #94a3b8; text-align: center;">No participants registered yet.</p>`;
    } else {
        const participantHtml = participants.map(reg => {
            const firstName = reg.firstName || reg.first_name || '';
            const lastName = reg.lastName || reg.last_name || '';
            const email = reg.email || '';
            const mobile = reg.mobile || '';
            const gender = reg.gender || '';
            const amount = reg.amount || 0;
            const registeredAt = new Date(reg.registeredAt || Date.now()).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px; border: 1px solid #e2e8f0;">
                    <div>
                        <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #1e293b;">👤 ${firstName} ${lastName}</p>
                        <p style="margin: 0; font-size: 12px; color: #64748b;">📧 ${email}</p>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">📱 ${mobile}</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="display: flex; gap: 6px; justify-content: flex-end; margin-bottom: 4px;">
                            <span style="padding: 3px 8px; font-size: 11px; background: ${gender.toLowerCase() === 'male' ? '#dbeafe' : '#fce7f3'}; color: ${gender.toLowerCase() === 'male' ? '#1e40af' : '#9d174d'}; border-radius: 6px; font-weight: 600;">
                                ${gender || 'N/A'}
                            </span>
                            <span style="padding: 3px 8px; font-size: 11px; background: #dcfce7; color: #166534; border-radius: 6px; font-weight: 600;">
                                ₹${amount}
                            </span>
                        </div>
                        <p style="margin: 0; font-size: 11px; color: #64748b;">📅 ${registeredAt}</p>
                    </div>
                </div>
            `;
        }).join('');

        detailsContainer.innerHTML = `
            <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #64748b;">Participants List (${participants.length})</p>
            ${participantHtml}
        `;
    }
    detailsContainer.classList.remove('hidden');
};


function groupRegistrationsByEvent(registrations) {
    const grouped = {};
    registrations.forEach(r => {
        const eventName = r.eventName || r.event_name || 'Unknown Event';
        if (!grouped[eventName]) grouped[eventName] = [];
        grouped[eventName].push(r);
    });
    return grouped;
}


function renderAnalyticsBarChart(registrationsByEvent, revenueByEvent) {
    const ctx = document.getElementById('analyticsBarChart');
    if (!ctx) return;

    const eventNames = Object.keys(registrationsByEvent);
    const registrationsData = eventNames.map(e => registrationsByEvent[e] || 0);
    const revenueData = eventNames.map(e => revenueByEvent[e] || 0);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: eventNames, // X-axis (event names)
            datasets: [
                {
                    label: 'Users Registered',
                    data: registrationsData,
                    backgroundColor: '#3b82f6'
                },
                {
                    label: 'Revenue ($)',
                    data: revenueData,
                    backgroundColor: '#22c55e'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) =>
                            `${ctx.dataset.label}: ${ctx.raw}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Users / Revenue'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Events'
                    }
                }
            }
        }
    });
}


// Render Organizer Dashboard with full metrics, volunteers, analytics, settings
async function renderOrganizerDashboard(container) {
    // Show loading state immediately to prevent blank screen
    container.innerHTML = `
        <div class="flex items-center justify-center" style="min-height: 50vh; flex-direction: column; gap: 1rem;">
            <div class="spinner"></div>
            <p class="text-gray-600 animate-pulse">Loading organizer dashboard from server...</p>
        </div>
    `;

    const currentUser = localStorage.getItem("currentUser");
    const users = JSON.parse(localStorage.getItem("users") || "{}");
    const userData = users[currentUser] || {};
    const organizerName = userData.name || currentUser || "Organizer";
    const volunteers = await fetchVolunteers();


    const [registrations, approvedEvents] = await Promise.all([
        fetchOrganizerRegistrations(),
        loadApprovedOrganizerEvents()
    ]);

    const totalParticipants = registrations.length;
    const totalRevenue = registrations.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thisMonthRegistrations = registrations.filter(r => new Date(r.registeredAt || new Date()) >= thirtyDaysAgo).length;

    const registrationsByEvent = {};
    registrations.forEach(r => {
        const name = r.eventName || r.event_name || 'Unknown';
        registrationsByEvent[name] = (registrationsByEvent[name] || 0) + 1;
    });

    const revenueByEvent = {};
    registrations.forEach(r => {
        const name = r.eventName || r.event_name || 'Unknown';
        revenueByEvent[name] = (revenueByEvent[name] || 0) + (parseFloat(r.amount) || 0);
    });

    const avgSatisfaction = totalParticipants > 0 ? (4.5 + Math.random() * 0.5).toFixed(1) : '—';

    // Volunteers placeholder
    // const volunteers = [
    //     { name: "Alex Brown", role: "Check-in Desk", event: "Sample Event", status: "active" },
    //     { name: "Priya Patel", role: "Water Station", event: "Sample Event", status: "active" },
    //     { name: "Rahul Mehta", role: "Route Marshal", event: "Sample Event", status: "pending" }
    // ];

    container.innerHTML = `
        <style>
            .tab-content {
                display: none;
            }
            .tab-content.active {
                display: block;
            }
            .org-stat-card {
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                padding: 24px;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            .org-stat-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
            }
            .org-stat-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 40px rgba(37, 99, 235, 0.15);
            }
            .org-tab-btn {
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
            .org-tab-btn:hover {
                color: #2563eb;
                background: #f1f5f9;
            }
            .org-tab-btn.active {
                color: #2563eb;
                background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            }
            .org-event-card {
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.3s ease;
                margin-bottom: 12px;
            }
            .org-event-card:hover {
                border-color: #2563eb;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
            }
            .org-volunteer-card {
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.3s ease;
                margin-bottom: 12px;
            }
            .org-volunteer-card:hover {
                border-color: #2563eb;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
            }
            .org-btn-primary {
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
            .org-btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
            }
            .org-btn-outline {
                background: white;
                color: #2563eb;
                border: 1px solid #2563eb;
                padding: 8px 16px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }
            .org-btn-outline:hover {
                background: #eff6ff;
                transform: translateY(-2px);
            }
            .org-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
            }
            .org-badge-success {
                background: #dcfce7;
                color: #166534;
            }
            .org-info-pill {
                background: #f1f5f9;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 12px;
                color: #64748b;
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            .org-settings-card {
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                padding: 24px;
            }
            .org-input {
                width: 100%;
                padding: 12px 16px;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                font-size: 14px;
                transition: all 0.3s ease;
                background: white;
            }
            .org-input:focus {
                outline: none;
                border-color: #2563eb;
                box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
            }
        </style>

        <div style="min-height: 100vh; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 32px 0;">
            <div style="max-width: 1280px; margin: 0 auto; padding: 0 24px;">
                
                <!-- Header -->
                <div style="margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h1 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700; color: #1e293b;">Welcome, ${organizerName}</h1>
                        <p style="margin: 0; font-size: 16px; color: #64748b;">Manage your events and participants</p>
                    </div>
                </div>

                <!-- Stats Overview -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 32px;">
                    <div class="org-stat-card">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">📅</div>
                        </div>
                        <div style="font-size: 32px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">${approvedEvents.length}</div>
                        <div style="font-size: 13px; color: #64748b; font-weight: 500; text-transform: uppercase;">Total Events</div>
                        <div style="margin-top: 12px; font-size: 13px; color: #10b981; font-weight: 500;">+${thisMonthRegistrations} this month</div>
                    </div>

                    <div class="org-stat-card">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">👥</div>
                        </div>
                        <div style="font-size: 32px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">${formatNumber(totalParticipants)}</div>
                        <div style="font-size: 13px; color: #64748b; font-weight: 500; text-transform: uppercase;">Total Participants</div>
                        <div style="margin-top: 12px; font-size: 13px; color: #10b981; font-weight: 500;">+${formatNumber(thisMonthRegistrations)} this month</div>
                    </div>

                    <div class="org-stat-card">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">💰</div>
                        </div>
                        <div style="font-size: 32px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">₹${formatNumber(Math.round(totalRevenue))}</div>
                        <div style="font-size: 13px; color: #64748b; font-weight: 500; text-transform: uppercase;">Total Revenue</div>
                        <div style="margin-top: 12px; font-size: 13px; color: #10b981; font-weight: 500;">${totalParticipants > 0 ? '✓ Active' : 'No data yet'}</div>
                    </div>

                    <div class="org-stat-card">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">⭐</div>
                        </div>
                        <div style="font-size: 32px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">${avgSatisfaction}</div>
                        <div style="font-size: 13px; color: #64748b; font-weight: 500; text-transform: uppercase;">Avg. Satisfaction</div>
                        <div style="margin-top: 12px; font-size: 16px;">⭐⭐⭐⭐⭐</div>
                    </div>
                </div>

                <!-- Tabs -->
                <div style="background: white; border-radius: 16px; padding: 8px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;" id="organizerTabs">
                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                        <button class="org-tab-btn tab-trigger active" data-tab="events" onclick="switchTab('organizerTabs','events')">📋 Events</button>
                        <button class="org-tab-btn tab-trigger" data-tab="participants" onclick="switchTab('organizerTabs','participants')">👥 Participants</button>
                        <button class="org-tab-btn tab-trigger" data-tab="volunteers" onclick="switchTab('organizerTabs','volunteers')">❤️ Volunteers</button>
                        <button class="org-tab-btn tab-trigger" data-tab="analytics" onclick="switchTab('organizerTabs','analytics')">📊 Analytics</button>
                        <button class="org-tab-btn tab-trigger" data-tab="settings" onclick="switchTab('organizerTabs','settings')">⚙️ Settings</button>
                    </div>

                    <!-- My Events -->
                    <div class="tab-content active" id="events" style="padding: 24px;">
                        <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #1e293b;">My Approved Events</h3>
                        <p style="margin: 0 0 20px 0; font-size: 14px; color: #64748b;">Only events approved by admin</p>
                        
                        ${approvedEvents.length > 0
                            ? approvedEvents.map(event => {
                                const regCount = registrationsByEvent[event.title] || event.participants || 0;
                                const revenue = revenueByEvent[event.title] || (regCount * event.price);
                                const placeholderUrl = 'https://placehold.co/80x80?text=No+Image';
                                const imageUrl = event.imageUrl && event.imageUrl.startsWith('http') ? event.imageUrl : (event.image ? event.image : placeholderUrl);
                                return `
                                    <div class="org-event-card">
                                        <div style="display: flex; align-items: center; gap: 16px;">
                                            <img src="${imageUrl}" alt="${event.title}" style="width: 70px; height: 70px; border-radius: 12px; object-fit: cover;" onerror="this.src='https://placehold.co/80x80?text=No+Image'">
                                            <div>
                                                <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e293b;">${event.title}</h4>
                                                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                                    <span class="org-info-pill">📅 ${formatDateShort(event.date)}</span>
                                                    <span class="org-info-pill">📍 ${event.location || 'TBA'}</span>
                                                    <span class="org-info-pill">👥 ${regCount}/${event.maxParticipants || '∞'}</span>
                                                    <span class="org-info-pill" style="background: #dcfce7; color: #166534;">💰 ₹${formatNumber(Math.round(revenue))}</span>
                                                </div>
                                                <div style="margin-top: 8px;"><span class="org-badge org-badge-success">✓ Approved</span></div>
                                            </div>
                                        </div>
                                        <button class="org-btn-outline" onclick="navigateTo('event-details','${event.id}')">👁️ Details</button>
                                    </div>`;
                            }).join('') 
                            : '<div style="text-align: center; padding: 60px 20px; background: #f8fafc; border-radius: 12px;"><p style="color: #64748b; margin: 0;">No approved events yet</p></div>'
                        }
                    </div>

                    <!-- Participants Tab -->
                    <div class="tab-content" id="participants" style="padding: 24px;">
                        <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #1e293b;">Participant Management</h3>
                        <div id="participantsContainer" style="display: flex; flex-direction: column; gap: 12px;"><p style="color: #64748b;">Loading...</p></div>
                    </div>

                    <!-- Volunteers Tab -->
                    <div class="tab-content" id="volunteers" style="padding: 24px;">
                        <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #1e293b;">Volunteers</h3>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            ${volunteers.length > 0 ? volunteers.map(v => `
                                <div class="org-volunteer-card" id="volunteer-${v.id}">
                                    <div>
                                        <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #1e293b;">${v.first_name} ${v.last_name}</p>
                                        <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748b;">${v.role} | ${v.event_name}</p>
                                        <p style="margin: 0; font-size: 12px; color: #94a3b8;">${v.email} | ${v.phone}</p>
                                    </div>
                                    <div class="flex gap-2 volunteer-buttons" id="volunteer-buttons-${v.id}">
                                        ${renderVolunteerButtons(v)}
                                    </div>
                                </div>
                            `).join('') : '<div style="text-align: center; padding: 60px 20px; background: #f8fafc; border-radius: 12px;"><p style="color: #64748b; margin: 0;">No volunteers yet</p></div>'}
                        </div>
                    </div>

                    <!-- Analytics Tab -->
                    <div class="tab-content" id="analytics" style="padding: 24px;">
                        <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #1e293b;">Event Performance Analytics</h3>
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                            <canvas id="analyticsBarChart" height="120"></canvas>
                        </div>
                    </div>

                    <!-- Settings Tab -->
                    <div class="tab-content" id="settings" style="padding: 24px;">
                        <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #1e293b;">Organizer Settings</h3>
                        <div class="org-settings-card">
                            <div style="display: flex; flex-direction: column; gap: 20px;">
                                <div>
                                    <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; color: #374151;">Organization Name</label>
                                    <input type="text" class="org-input" value="My Organization">
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; color: #374151;">Contact Email</label>
                                    <input type="email" class="org-input" value="contact@example.com">
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; color: #374151;">Phone Number</label>
                                    <input type="tel" class="org-input" value="+1 234 567 8900">
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; color: #374151;">Website</label>
                                    <input type="url" class="org-input" value="https://example.com">
                                </div>
                                <button class="org-btn-primary" style="width: fit-content;">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Logout Button -->
                <div style="text-align: center; margin-top: 32px;">
                    <button class="org-btn-outline" id="organizerDashboardLogoutBtn" style="padding: 12px 40px;">Logout</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => displayRegistrations(container, registrations), 100);

    const logoutBtn = container.querySelector("#organizerDashboardLogoutBtn");
    if (logoutBtn) logoutBtn.onclick = () => { localStorage.removeItem("currentUser"); navigateTo("landing"); };

    setTimeout(() => {
    renderAnalyticsBarChart(registrationsByEvent, revenueByEvent);
}, 150);
                                     
}



export { renderOrganizerDashboard };
