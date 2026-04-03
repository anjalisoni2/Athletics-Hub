// event-details.js
// FULL UI + modern tab design + supports BOTH mockEvents + backend approved events

import { mockEvents } from "../data.js";
import { getAPIEndpoint, getAPIBaseURL } from "../api-config.js";

/* ================= HELPER FUNCTIONS ================= */

function getCurrentUserRole() {
  const currentUser = localStorage.getItem("currentUser");
  if (!currentUser) return 'guest';

  const users = JSON.parse(localStorage.getItem("users") || "{}");
  const userData = users[currentUser] || {};
  return userData.role || userData.userType || 'guest';
}

function isOrganizerOrAdmin() {
  const role = getCurrentUserRole();
  return ['organizer', 'super_admin', 'admin', 'superadmin'].includes(role);
}

// Geocode location name to coordinates using Nominatim (OpenStreetMap)
async function geocodeLocation(locationName) {
  if (!locationName || locationName.trim() === '') throw new Error('Location name is empty');

  try {
    const encodedLocation = encodeURIComponent(locationName);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedLocation}&format=json&limit=1`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'AthleticsHub-App' }
    });

    if (!response.ok) throw new Error('Geocoding API error');
    const data = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        name: locationName,
        displayName: result.display_name
      };
    } else throw new Error(`No results found for "${locationName}"`);
  } catch (err) {
    console.error(`Geocoding error for "${locationName}":`, err);
    throw new Error(`Could not find coordinates for "${locationName}"`);
  }
}

/* ================= API ================= */

function normalizeEventCategory(category) {
  const categoryAliases = {
    'Running': 'Half Marathon',
    'Trail Running': 'Trail Run',
    'Cycling': 'Cyclothon'
  };

  return categoryAliases[category] || category || 'Marathon';
}

function resolveEventImageUrl(event) {
  const imageUrl = event?.imageUrl || event?.image || '';

  if (!imageUrl || imageUrl.trim() === '') {
    return 'https://placehold.co/1200x400?text=Event+Image';
  }

  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }

  if (imageUrl.startsWith('/')) {
    return `${getAPIBaseURL()}${imageUrl}`;
  }

  return `${getAPIBaseURL()}/${imageUrl}`;
}

async function getApprovedEvents() {
  try {
    const res = await fetch(getAPIEndpoint('/api/approved-events/'));
    if (!res.ok) throw new Error('Failed to fetch approved events');
    const data = await res.json();

    return data.map(ev => ({
      id: String(ev.id),
      title: ev.title || 'Untitled Event',
      description: ev.description || 'No description available.',
      date: ev.date,
      location: ev.location || 'Location TBA',
      imageUrl: resolveEventImageUrl(ev),
      category: normalizeEventCategory(ev.category),
      status: 'upcoming',
      price: ev.price ?? 0,
      currency: 'USD',
      participants: ev.participants ?? 0,
      maxParticipants: ev.maxParticipants ?? 200,
      distance: ev.distance || '—',
      organizer: ev.organizer || 'Event Organizer',
      registrationDeadline: ev.registrationDeadline || 'N/A'
    }));

  } catch (err) {
    console.error("event-details fetch error:", err);
    return [];
  }
}

/* ================= STATE ================= */

let isRegistered = false;
let activeTab = "overview";

// Load past event images from localStorage (persistent)
let pastEventImages = JSON.parse(localStorage.getItem("pastEventImages") || "[]");

/* ================= MAIN RENDER ================= */

export async function renderEventDetails(container, eventId) {
  const app = document.getElementById("app");
  const approvedEvents = await getApprovedEvents();
  const allEvents = [...mockEvents, ...approvedEvents];
  const event = allEvents.find(e => String(e.id) === String(eventId));

  if (!event) {
    app.innerHTML = `<h2>Event not found</h2>`;
    return;
  }

  // Get current user's role
  const currentUser = localStorage.getItem("currentUser");
  const users = JSON.parse(localStorage.getItem("users")) || {};
  let userRole = "guest";
  if (currentUser && users[currentUser]) {
    userRole = users[currentUser].role;
  }
  const isAthlete = userRole === "participant" || userRole === "athlete";

  const participationPercentage = Math.round((event.participants / event.maxParticipants) * 100);

  app.innerHTML = `
    <style>
      /* Modern Tab Styles */
      .tabs {
        display: flex;
        gap: 8px;
        border-bottom: 2px solid #e5e7eb;
        margin-top: 24px;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .tabs::-webkit-scrollbar { display: none; }
      .tabBtn {
        background: none;
        border: none;
        padding: 12px 20px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        color: #6b7280;
        position: relative;
        transition: all 0.3s ease;
        border-radius: 8px 8px 0 0;
      }
      .tabBtn:hover { color: #2563eb; background: #f8fafc; }
      .tabBtn.active {
        color: #2563eb;
        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      }
      .tabBtn.active::after {
        content: '';
        position: absolute;
        left: 0;
        bottom: -2px;
        width: 100%;
        height: 3px;
        background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
        border-radius: 3px 3px 0 0;
      }
      .info-card {
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px;
        transition: all 0.3s ease;
      }
      .info-card:hover {
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
        transform: translateY(-2px);
      }
      .reg-card {
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        border: 1px solid #e2e8f0;
      }
      .action-btn {
        background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
        color: white;
        border: none;
        padding: 14px 24px;
        border-radius: 10px;
        font-weight: 600;
        font-size: 15px;
        cursor: pointer;
        transition: all 0.3s ease;
        width: 100%;
      }
      .action-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(37, 99, 235, 0.3);
      }
      .progress-bar {
        background: #e2e8f0;
        height: 10px;
        border-radius: 10px;
        overflow: hidden;
      }
      .progress-fill {
        background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
        height: 100%;
        border-radius: 10px;
        transition: width 0.5s ease;
      }
      .icon-btn {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
        background: white;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .icon-btn:hover {
        background: #eff6ff;
        border-color: #2563eb;
        transform: scale(1.05);
      }
    </style>

    <div style="max-width:1200px;margin:0 auto;padding:24px">

      <!-- Back -->
      <button id="backBtn" style="
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        font-size: 14px;
        font-weight: 600;
        color: #2563eb;
        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        border: none;
        border-radius: 10px;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
        transition: all 0.3s ease;
      "
      onmouseover="this.style.transform='translateX(-4px)'; this.style.boxShadow='0 4px 12px rgba(37, 99, 235, 0.2)'"
      onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='0 2px 8px rgba(37, 99, 235, 0.1)'"
      >← Back to Events</button>


      <!-- Banner -->
      <div style="position:relative;margin-top:20px;margin-bottom:24px">
        <img src="${resolveEventImageUrl(event)}" alt="${event.title}" style="width:100%;height:320px;object-fit:cover;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.12)" />
        <div style="position:absolute;bottom:20px;left:20px;background:rgba(0,0,0,0.6);padding:8px 16px;border-radius:20px;color:white;font-size:13px;font-weight:500;backdrop-filter:blur(10px)">
          📅 ${new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <!-- MAIN GRID -->
      <div style="display:grid;grid-template-columns:${isAthlete ? '2fr 1fr' : '1fr'};gap:24px">

        <!-- LEFT CONTENT -->
        <div style="background:linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 4px 20px rgba(0,0,0,0.05)">

          <!-- Header -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
            <div style="flex:1">
              <h2 style="margin:0 0 8px 0;font-size:28px;font-weight:700;color:#1e293b">${event.title}</h2>
              <p style="margin:0 0 12px 0;color:#64748b;font-size:14px">🏆 Organized by ${event.organizer}</p>
              <span style="background:${event.status === 'completed' ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' : 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'};color:${event.status === 'completed' ? '#166534' : '#1e40af'};padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;display:inline-block">
                ${event.status === 'completed' ? '✓ ' : '🔜 '}${event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </span>
            </div>
            <div style="display:flex;gap:10px">
              <button class="icon-btn">♡</button>
              <button class="icon-btn">↗</button>
            </div>
          </div>

          <!-- Tabs -->
          <div class="tabs">
            <button class="tabBtn" data-tab="overview">📋 Overview</button>
            <button class="tabBtn" data-tab="details">📝 Details</button>
            <button class="tabBtn" data-tab="route">🗺️ Route</button>
            <button class="tabBtn" data-tab="faqs">❓ FAQs</button>
            <button class="tabBtn" data-tab="past">📸 Past</button>
          </div>

          <!-- Tab Content -->
          <div class="tabContent" style="margin-top:20px;padding:16px 0;">
            ${renderTabContent(event)}
          </div>

          <!-- Info Grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:24px">
            <div class="info-card">
              <p style="margin:0 0 4px 0;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600">📅 Event Date</p>
              <p style="margin:0;font-size:15px;font-weight:600;color:#1e293b">${new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
            <div class="info-card">
              <p style="margin:0 0 4px 0;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600">📍 Location</p>
              <p style="margin:0;font-size:15px;font-weight:600;color:#1e293b">${event.location}</p>
            </div>
            <div class="info-card">
              <p style="margin:0 0 4px 0;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600">🏃 Distance</p>
              <p style="margin:0;font-size:15px;font-weight:600;color:#1e293b">${event.distance}</p>
            </div>
            <div class="info-card">
              <p style="margin:0 0 4px 0;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600">⏰ Deadline</p>
              <p style="margin:0;font-size:15px;font-weight:600;color:#1e293b">${event.registrationDeadline}</p>
            </div>
          </div>
        </div>

        <!-- RIGHT REGISTRATION PANEL (Only for Athletes) -->
        ${isAthlete ? `
        <div class="reg-card">
          <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#1e293b;">Register Now</h2>
          <p style="color:#64748b;margin-bottom:20px;font-size:14px;">Secure your spot today</p>

          <div style="background:linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);padding:20px;border-radius:12px;margin-bottom:20px;text-align:center;border:1px solid #bfdbfe">
            <h3 style="margin:0 0 4px 0;font-size:32px;font-weight:700;color:#1e40af">${event.price > 0 ? '₹' + event.price : 'FREE'}</h3>
            <span style="font-size:13px;color:#3b82f6;font-weight:500">Registration Fee</span>
          </div>

          <p id="spotsAvailable" style="margin-bottom:8px;color:#64748b;font-size:14px;">
            <span style="font-weight:700;color:#1e293b">${Math.max(0, event.maxParticipants - event.participants)}</span> spots remaining
          </p>
          <div class="progress-bar" style="margin-bottom:8px;">
            <div id="spotsProgressBar" class="progress-fill" style="width:${participationPercentage}%"></div>
          </div>
          <p id="spotsPercentage" style="font-size:13px;color:#64748b;margin-bottom:20px;">${participationPercentage}% filled (${event.participants}/${event.maxParticipants} registered)</p>

          <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:20px;">
            <label style="display:flex;align-items:center;gap:10px;font-size:14px;color:#374151;cursor:pointer;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
              <input type="checkbox" id="rulesCheckbox" style="width:18px;height:18px;accent-color:#2563eb" />
              <span>I agree to the Event Rules & Guidelines</span>
            </label>
            <a href="docs/Event_Rules_Guidelines.pdf" target="_blank" style="display:block;text-align:center;padding:12px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;color:#2563eb;background:#eff6ff;border:1px solid #bfdbfe;transition:all 0.3s"
               onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'">
              📄 View Guidelines
            </a>
          </div>

          <button id="registerBtn" disabled class="action-btn" style="opacity:0.6;cursor:not-allowed">
            Register Now
          </button>
        </div>
        ` : ''}
      </div>
    </div>
  `;

  /* ================= EVENTS ================= */
  document.getElementById("backBtn").onclick = () => navigateTo("events");

  const tabButtons = document.querySelectorAll(".tabBtn");
  tabButtons.forEach(btn => {
    if (btn.dataset.tab === activeTab) btn.classList.add("active");

    btn.onclick = () => {
      activeTab = btn.dataset.tab;
      tabButtons.forEach(t => t.classList.remove("active"));
      btn.classList.add("active");

      document.querySelector(".tabContent").innerHTML = renderTabContent(event);

      // Attach dynamic past event logic
      if (activeTab === "past") {
        renderPastEventImages();
        attachPastEventImageListeners();
      }

      if (activeTab === "route") {
        setTimeout(() => {
          const mapElement = document.getElementById("route-map");
          if (mapElement) {
            if (!window.google || !window.google.maps) {
              setTimeout(() => initializeRouteMap(event), 500);
            } else {
              initializeRouteMap(event);
            }
          }
        }, 300);
      }

      // Attach schedule item handlers when details tab is active
      if (activeTab === "details") {
        attachScheduleHandlers(event);
      }
    };
  });

  // Attach schedule handlers on initial load if details tab is active
  if (activeTab === "details") {
    attachScheduleHandlers(event);
  }

  // Only attach registration event listeners if user is an athlete
  if (isAthlete) {
    const rulesCheckbox = document.getElementById("rulesCheckbox");
    const registerBtn = document.getElementById("registerBtn");

    if (rulesCheckbox && registerBtn) {
      rulesCheckbox.addEventListener("change", () => {
        registerBtn.disabled = !rulesCheckbox.checked;
        registerBtn.style.background = rulesCheckbox.checked ? "#2563eb" : "#9ca3af";
        registerBtn.style.cursor = rulesCheckbox.checked ? "pointer" : "not-allowed";
      });
    }

    document.getElementById("registerBtn")?.addEventListener("click", () => {
      const currentUser = localStorage.getItem("currentUser");
      if (!currentUser) {
        alert("Please log in first to register for events");
        window.location.href = 'login.html';
        return;
      }
      window.location.href = `register.html?id=${eventId}`;
    });
  }

  // Initial render for past tab if default is active
  if (activeTab === "past") {
    renderPastEventImages();
    attachPastEventImageListeners();
  }
}

/* ================= TAB CONTENT ================= */
function renderTabContent(event) {
  if (activeTab === "overview") {
    return `
      <div style="background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);padding:20px;border-radius:12px;border:1px solid #e2e8f0">
        <h4 style="margin:0 0 12px 0;font-size:18px;font-weight:700;color:#1e293b">📋 Event Overview</h4>
        <p style="margin:0;line-height:1.7;color:#475569;font-size:15px">${event.description || 'No description available.'}</p>
      </div>
    `;
  }
  const currentUser = localStorage.getItem("currentUser");
  const isEventOrganizer = currentUser && event.organizer && event.organizer.toLowerCase().includes(currentUser.toLowerCase());
  const isUpcoming = event.status === 'upcoming' || event.status === 'pending' || !event.status || event.status === 'approved';
  const canEdit = isOrganizerOrAdmin() && isUpcoming;

  const defaultSchedule = [
    { icon: '🕕', title: 'Registration Opens', time: '6:00 AM', type: 'registration' },
    { icon: '🏃', title: 'Event Start', time: '8:00 AM', type: 'start' },
    { icon: '🏅', title: 'Awards Ceremony', time: '3:00 PM', type: 'awards' },
    { icon: '👤', title: 'Organizer', time: event.organizer, type: 'organizer' }
  ];
  
  const eventSchedule = event.schedule || defaultSchedule;

  if (activeTab === "details") {
    return `
      <div style="background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);padding:20px;border-radius:12px;border:1px solid #e2e8f0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h4 style="margin:0;font-size:18px;font-weight:700;color:#1e293b">📝 Event Schedule</h4>
          ${canEdit ? `
            <button id="addScheduleItemBtn" style="padding:8px 16px;font-size:13px;font-weight:600;border:none;background:linear-gradient(135deg, #059669 0%, #10b981 100%);color:white;border-radius:8px;cursor:pointer;transition:all 0.3s"
                    onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(5,150,105,0.3)'"
                    onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
              ➕ Add New
            </button>
          ` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:12px" id="scheduleItemsContainer">
          ${eventSchedule.map((item, index) => `
            <div class="schedule-item" data-index="${index}" style="display:flex;align-items:center;gap:12px;padding:12px;background:white;border-radius:8px;border:1px solid #e2e8f0;position:relative">
              <span style="width:40px;height:40px;background:${getScheduleBgColor(item.type)};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px">${item.icon}</span>
              <div style="flex:1"><b style="color:#1e293b">${item.title}</b><br><span style="color:#64748b">${item.time}</span></div>
              ${canEdit ? `
                <button class="edit-schedule-btn" data-index="${index}" style="padding:6px 10px;font-size:12px;background:#f3f4f6;border:none;border-radius:6px;cursor:pointer;margin-right:4px"
                        onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">✏️</button>
                <button class="delete-schedule-btn" data-index="${index}" style="padding:6px 10px;font-size:12px;background:#fee2e2;border:none;border-radius:6px;cursor:pointer;color:#dc2626"
                        onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">🗑️</button>
              ` : ''}
            </div>
          `).join('')}
        </div>
        ${canEdit ? `
          <button id="saveScheduleBtn" style="margin-top:16px;padding:10px 20px;font-size:14px;font-weight:600;border:none;background:linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);color:white;border-radius:8px;cursor:pointer;transition:all 0.3s;display:none"
                  onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(37,99,235,0.3)'"
                  onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
            💾 Save Changes
          </button>
        ` : ''}
      </div>
      ${canEdit ? `
      <div id="scheduleModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center">
        <div style="background:white;padding:24px;border-radius:12px;max-width:400px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,0.3)">
          <h4 id="modalTitle" style="margin:0 0 16px 0;font-size:18px;font-weight:700;color:#1e293b">Add Schedule Item</h4>
          <label style="display:block;margin-bottom:8px;font-weight:600;color:#374151">Title</label>
          <input type="text" id="scheduleTitle" style="width:100%;padding:10px;margin-bottom:12px;border:1px solid #d1d5db;border-radius:6px;box-sizing:border-box" placeholder="e.g., Registration Opens">
          <label style="display:block;margin-bottom:8px;font-weight:600;color:#374151">Time / Value</label>
          <input type="text" id="scheduleTime" style="width:100%;padding:10px;margin-bottom:12px;border:1px solid #d1d5db;border-radius:6px;box-sizing:border-box" placeholder="e.g., 6:00 AM">
          <label style="display:block;margin-bottom:8px;font-weight:600;color:#374151">Icon</label>
          <select id="scheduleIcon" style="width:100%;padding:10px;margin-bottom:16px;border:1px solid #d1d5db;border-radius:6px;box-sizing:border-box">
            <option value="🕕">🕕 Clock</option>
            <option value="🏃">🏃 Runner</option>
            <option value="🏅">🏅 Medal</option>
            <option value="👤">👤 Person</option>
            <option value="📍">📍 Location</option>
            <option value="🚗">🚗 Transport</option>
            <option value="🍽️">🍽️ Food</option>
            <option value="🎉">🎉 Celebration</option>
            <option value="📋">📋 Other</option>
          </select>
          <div style="display:flex;gap:10px;justify-content:flex-end">
            <button id="cancelScheduleBtn" style="padding:10px 20px;font-size:14px;background:#e5e7eb;border:none;border-radius:8px;cursor:pointer;color:#374151;font-weight:600">Cancel</button>
            <button id="saveScheduleItemBtn" style="padding:10px 20px;font-size:14px;background:#2563eb;border:none;border-radius:8px;cursor:pointer;color:white;font-weight:600">Save</button>
          </div>
        </div>
      </div>
      ` : ''}
    `;
  }
  if (activeTab === "route") {
    return `
      <div id="route-map" style="width:100%;height:400px;border-radius:12px;margin:16px 0;background:linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:15px;font-weight:500;">🗺️ Loading map...</div>
      <p style="margin-top:12px;color:#64748b;text-align:center;font-size:14px">🗺️ Event route displayed on the map above</p>
    `;
  }
  if (activeTab === "faqs") {
    return `
      <div style="background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);padding:20px;border-radius:12px;border:1px solid #e2e8f0">
        <h4 style="margin:0 0 16px 0;font-size:18px;font-weight:700;color:#1e293b">❓ Frequently Asked Questions</h4>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="padding:14px;background:white;border-radius:10px;border:1px solid #e2e8f0">
            <p style="margin:0 0 4px 0;font-weight:600;color:#1e293b">Can I transfer my registration?</p>
            <p style="margin:0;color:#64748b;font-size:14px">Yes, registration transfers are allowed up to 48 hours before the event.</p>
          </div>
          <div style="padding:14px;background:white;border-radius:10px;border:1px solid #e2e8f0">
            <p style="margin:0 0 4px 0;font-weight:600;color:#1e293b">What if it rains?</p>
            <p style="margin:0;color:#64748b;font-size:14px">The event will continue rain or shine. Please come prepared for all weather conditions.</p>
          </div>
          <div style="padding:14px;background:white;border-radius:10px;border:1px solid #e2e8f0">
            <p style="margin:0 0 4px 0;font-weight:600;color:#1e293b">Is there an age limit?</p>
            <p style="margin:0;color:#64748b;font-size:14px">Participants must be 18 years or older on the day of the event.</p>
          </div>
          <div style="padding:14px;background:white;border-radius:10px;border:1px solid #e2e8f0">
            <p style="margin:0 0 4px 0;font-weight:600;color:#1e293b">What is the refund policy?</p>
            <p style="margin:0;color:#64748b;font-size:14px">Full refunds available up to 7 days before the event. No refunds after that.</p>
          </div>
        </div>
      </div>
    `;
  }
  if (activeTab === "past") {
    return `
      <div style="background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);padding:20px;border-radius:12px;border:1px solid #e2e8f0">
        <h4 style="color:#1e293b; margin:0 0 16px 0;font-size:18px;font-weight:700;">📸 Past Events Gallery</h4>
        <div id="pastEventsGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
          <!-- Images rendered dynamically -->
        </div>

        <input
          type="file"
          id="imagePicker"
          accept="image/*"
          multiple
          style="display:none"
        />

        <button id="addPastEventBtn" style="margin-top:16px;padding:12px 20px;font-size:14px;font-weight:600;border:none;background:linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);color:white;border-radius:10px;cursor:pointer;transition:all 0.3s"
                onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(37,99,235,0.3)'"
                onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
          ➕ Add Past Event Image
        </button>
        <p style="color:#64748b;margin-top:12px;font-size:13px;">More past events will be added soon!</p>
      </div>
    `;
  }
  return '';
}

/* ================= PAST EVENTS IMAGE HANDLING ================= */
function attachPastEventImageListeners() {
  const picker = document.getElementById("imagePicker");
  const addBtn = document.getElementById("addPastEventBtn");
  if (!picker || !addBtn) return;

  addBtn.onclick = () => picker.click();

  picker.onchange = (e) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = function (ev) {
        const src = ev.target.result;
        pastEventImages.push(src);
        localStorage.setItem("pastEventImages", JSON.stringify(pastEventImages));
        renderPastEventImages();
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };
}

function renderPastEventImages() {
  const grid = document.getElementById("pastEventsGrid");
  if (!grid) return;

  grid.innerHTML = pastEventImages.map(src => `
    <img src="${src}" style="width:100%;height:150px;object-fit:cover;border-radius:8px;">
  `).join('');
}

/* ================= SCHEDULE EDITING ================= */

let currentSchedule = [];
let editingIndex = -1;

function getScheduleBgColor(type) {
  const colors = {
    registration: '#dbeafe',
    start: '#dcfce7',
    awards: '#fef3c7',
    organizer: '#f3e8ff',
    location: '#cffafe',
    transport: '#ffedd5',
    food: '#fce7f3',
    celebration: '#ede9fe',
    other: '#f3f4f6'
  };
  return colors[type] || colors.other;
}

function attachScheduleHandlers(event) {
  const defaultSchedule = [
    { icon: '🕕', title: 'Registration Opens', time: '6:00 AM', type: 'registration' },
    { icon: '🏃', title: 'Event Start', time: '8:00 AM', type: 'start' },
    { icon: '🏅', title: 'Awards Ceremony', time: '3:00 PM', type: 'awards' },
    { icon: '👤', title: 'Organizer', time: event.organizer, type: 'organizer' }
  ];
  currentSchedule = event.schedule || defaultSchedule;

  const addBtn = document.getElementById("addScheduleItemBtn");
  const saveBtn = document.getElementById("saveScheduleBtn");
  const modal = document.getElementById("scheduleModal");
  const cancelBtn = document.getElementById("cancelScheduleBtn");
  const saveItemBtn = document.getElementById("saveScheduleItemBtn");
  const titleInput = document.getElementById("scheduleTitle");
  const timeInput = document.getElementById("scheduleTime");
  const iconSelect = document.getElementById("scheduleIcon");

  if (addBtn) {
    addBtn.onclick = () => {
      editingIndex = -1;
      document.getElementById("modalTitle").textContent = "Add Schedule Item";
      titleInput.value = "";
      timeInput.value = "";
      iconSelect.value = "🕕";
      modal.style.display = "flex";
    };
  }

  if (saveBtn) {
    saveBtn.style.display = "none";
  }

  document.querySelectorAll(".edit-schedule-btn").forEach(btn => {
    btn.onclick = (e) => {
      const index = parseInt(e.target.dataset.index);
      const item = currentSchedule[index];
      editingIndex = index;
      document.getElementById("modalTitle").textContent = "Edit Schedule Item";
      titleInput.value = item.title;
      timeInput.value = item.time;
      iconSelect.value = item.icon;
      modal.style.display = "flex";
    };
  });

  document.querySelectorAll(".delete-schedule-btn").forEach(btn => {
    btn.onclick = (e) => {
      const index = parseInt(e.target.dataset.index);
      if (confirm("Are you sure you want to delete this item?")) {
        currentSchedule.splice(index, 1);
        renderScheduleList();
        showSaveButton();
      }
    };
  });

  if (cancelBtn) {
    cancelBtn.onclick = () => {
      modal.style.display = "none";
    };
  }

  if (saveItemBtn) {
    saveItemBtn.onclick = () => {
      const title = titleInput.value.trim();
      const time = timeInput.value.trim();
      const icon = iconSelect.value;

      if (!title || !time) {
        alert("Please fill in both title and time.");
        return;
      }

      const newItem = {
        icon: icon,
        title: title,
        time: time,
        type: 'other'
      };

      if (editingIndex === -1) {
        currentSchedule.push(newItem);
      } else {
        currentSchedule[editingIndex] = newItem;
      }

      modal.style.display = "none";
      renderScheduleList();
      showSaveButton();
    };
  }

  function renderScheduleList() {
    const container = document.getElementById("scheduleItemsContainer");
    if (!container) return;

    container.innerHTML = currentSchedule.map((item, index) => `
      <div class="schedule-item" data-index="${index}" style="display:flex;align-items:center;gap:12px;padding:12px;background:white;border-radius:8px;border:1px solid #e2e8f0;position:relative">
        <span style="width:40px;height:40px;background:${getScheduleBgColor(item.type)};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px">${item.icon}</span>
        <div style="flex:1"><b style="color:#1e293b">${item.title}</b><br><span style="color:#64748b">${item.time}</span></div>
        <button class="edit-schedule-btn" data-index="${index}" style="padding:6px 10px;font-size:12px;background:#f3f4f6;border:none;border-radius:6px;cursor:pointer;margin-right:4px"
                onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">✏️</button>
        <button class="delete-schedule-btn" data-index="${index}" style="padding:6px 10px;font-size:12px;background:#fee2e2;border:none;border-radius:6px;cursor:pointer;color:#dc2626"
                onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">🗑️</button>
      </div>
    `).join('');

    attachScheduleHandlers(event);
  }

  function showSaveButton() {
    const saveBtn = document.getElementById("saveScheduleBtn");
    if (saveBtn) {
      saveBtn.style.display = "inline-block";
      saveBtn.onclick = () => saveEventSchedule(event.id);
    }
  }

  window.saveEventSchedule = async function(eventId) {
    try {
      const events = JSON.parse(localStorage.getItem("events") || "[]");
      const index = events.findIndex(e => String(e.id) === String(eventId));
      
      if (index !== -1) {
        events[index].schedule = currentSchedule;
        localStorage.setItem("events", JSON.stringify(events));
        
        const saveBtn = document.getElementById("saveScheduleBtn");
        if (saveBtn) saveBtn.style.display = "none";
        
        alert("✅ Schedule saved successfully!");
      }
    } catch (err) {
      console.error("Error saving schedule:", err);
      alert("Failed to save schedule.");
    }
  };
}


/* ================= EVENT ROUTE PARSING & OSRM ROUTING ================= */

// Parse location string format: "StartPoint to EndPoint" or just "Location"
function parseEventLocations(locationString) {
  if (!locationString) return { start: null, end: null };

  const parts = locationString.split(' to ');

  if (parts.length === 2) {
    return {
      start: parts[0].trim(),
      end: parts[1].trim()
    };
  }

  // If no " to " found, use same location for both
  return {
    start: locationString.trim(),
    end: locationString.trim()
  };
}

// Get user's live location via GPS
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported - using default location");
      // Default fallback location (Ahmedabad, India as example)
      resolve({ lat: 23.0225, lng: 72.5714 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        console.log("User location obtained:", userLat, userLng);
        resolve({ lat: userLat, lng: userLng });
      },
      (error) => {
        console.warn("Geolocation error:", error.message, "- using default location");
        // Default fallback if user denies or location fails
        resolve({ lat: 23.0225, lng: 72.5714 });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

// Fetch route from OSRM API (free, no API key needed)
async function getOSRMRoute(userLng, userLat, eventLng, eventLat) {
  try {
    // Simple URL format: /route/v1/driving/lon1,lat1;lon2,lat2
    const url = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${eventLng},${eventLat}?overview=full&geometries=geojson`;

    console.log("Fetching OSRM route:", url);

    const response = await fetch(url);
    if (!response.ok) throw new Error("OSRM API error: " + response.status);

    const data = await response.json();
    console.log("OSRM Response:", data);

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distance = (route.distance / 1000).toFixed(2);
      const duration = Math.round(route.duration / 60);

      console.log("Route found - Distance:", distance, "km, Duration:", duration, "minutes");

      return {
        distance: distance,
        duration: duration,
        geometry: route.geometry.coordinates // [lng, lat] pairs
      };
    }
    throw new Error("No routes in OSRM response");
  } catch (err) {
    console.error("OSRM error:", err);
    return null;
  }
}

// Initialize map - Show route from START LOCATION to END LOCATION (event locations)
async function initializeRouteMap(event) {
  const mapElement = document.getElementById("route-map");

  if (!mapElement) {
    console.error("Route map element not found in DOM");
    return;
  }

  if (!window.google || !window.google.maps) {
    console.error("Google Maps API not loaded");
    return;
  }

  // Show loading state
  mapElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;">🔍 Loading event route...</div>';

  try {
    // STEP 1: Parse start and end locations from event.location string
    // Format: "Start location to End location"
    const parsedLocations = parseEventLocations(event.location);
    console.log("Parsed locations:", parsedLocations);

    // STEP 2: Geocode START location
    mapElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;">🔍 Finding start location...</div>';

    let startLocation = null;
    try {
      startLocation = await geocodeLocation(parsedLocations.start);
      console.log("Start location:", startLocation);
    } catch (err) {
      console.error("Start location geocoding failed:", err);
      throw new Error(`Start location "${parsedLocations.start}" not found. Please check the spelling.`);
    }

    const startLat = startLocation.lat;
    const startLng = startLocation.lng;

    // STEP 3: Geocode END location
    mapElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;">🔍 Finding end location...</div>';

    let endLocation = null;
    try {
      endLocation = await geocodeLocation(parsedLocations.end);
      console.log("End location:", endLocation);
    } catch (err) {
      console.error("End location geocoding failed:", err);
      throw new Error(`End location "${parsedLocations.end}" not found. Please check the spelling.`);
    }

    const endLat = endLocation.lat;
    const endLng = endLocation.lng;

    // STEP 4: Calculate center point between start and end
    const center = {
      lat: (startLat + endLat) / 2,
      lng: (startLng + endLng) / 2
    };

    // Clear loading state and create map
    mapElement.innerHTML = '';
    const map = new google.maps.Map(mapElement, {
      zoom: 12,
      center: center,
      mapTypeId: 'roadmap',
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    // STEP 5: Fetch route from OSRM - Start Location to End Location
    console.log("Fetching OSRM route from start to end...");
    const routeData = await getOSRMRoute(startLng, startLat, endLng, endLat);

    if (routeData && routeData.geometry) {
      console.log("Route geometry received, drawing polyline...");

      // Convert GeoJSON coordinates to LatLng format
      const pathCoordinates = routeData.geometry.map(coord => ({
        lat: coord[1],
        lng: coord[0]
      }));

      // Draw route polyline (blue line)
      new google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: '#2563eb',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map: map
      });

      console.log("Polyline drawn, adding markers...");

      // Add START location marker (green)
      new google.maps.Marker({
        position: { lat: startLat, lng: startLng },
        map: map,
        title: `Start: ${startLocation.name}`,
        icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        animation: google.maps.Animation.DROP
      });

      // Add END location marker (red)
      new google.maps.Marker({
        position: { lat: endLat, lng: endLng },
        map: map,
        title: `End: ${endLocation.name}`,
        icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        animation: google.maps.Animation.DROP
      });

      // Add route info box
      addEventRouteInfo(map, routeData.distance, routeData.duration, startLocation.name, endLocation.name);

      console.log(`✓ Route calculated: ${routeData.distance} km, ${routeData.duration} minutes`);
    } else {
      console.warn("Could not fetch OSRM route, showing markers only");

      // Fallback: just show markers without route line
      new google.maps.Marker({
        position: { lat: startLat, lng: startLng },
        map: map,
        title: `Start: ${startLocation.name}`,
        icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
      });

      new google.maps.Marker({
        position: { lat: endLat, lng: endLng },
        map: map,
        title: `End: ${endLocation.name}`,
        icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
      });

      addEventRouteInfo(map, '—', '—', startLocation.name, endLocation.name);
    }

  } catch (err) {
    console.error("Error initializing map:", err);
    mapElement.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;text-align:center;padding:20px;">
      <div>
        <div style="margin-bottom:8px;">⚠️ Could not load the event route</div>
        <div style="font-size:12px;">${err.message}</div>
      </div>
    </div>`;
  }
}

// Display route information for event with start and end locations
function addEventRouteInfo(map, distance, duration, startLocation, endLocation) {
  const infoBox = document.createElement('div');
  infoBox.style.cssText = `
    background: white;
    padding: 16px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 14px;
    margin: 10px;
    max-width: 340px;
    border-left: 4px solid #2563eb;
  `;

  infoBox.innerHTML = `
    <div style="font-weight: 700; margin-bottom: 12px; color: #1f2937; font-size: 15px;">🗺️ Event Route</div>

    <div style="margin: 10px 0; padding: 10px; background: #f0f9ff; border-radius: 6px;">
      <div style="color: #4b5563; font-size: 13px; margin-bottom: 4px;">
        <span style="color: #22c55e;">●</span> <strong>Start:</strong> ${startLocation}
      </div>
      <div style="color: #4b5563; font-size: 13px;">
        <span style="color: #ef4444;">●</span> <strong>End:</strong> ${endLocation}
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
      <div style="background: #f3f4f6; padding: 10px; border-radius: 6px; text-align: center;">
        <div style="font-size: 12px; color: #6b7280;">Distance</div>
        <div style="font-weight: 700; color: #2563eb; font-size: 16px;">${distance} km</div>
      </div>
      <div style="background: #f3f4f6; padding: 10px; border-radius: 6px; text-align: center;">
        <div style="font-size: 12px; color: #6b7280;">Duration</div>
        <div style="font-weight: 700; color: #2563eb; font-size: 16px;">${duration} min</div>
      </div>
    </div>
  `;

  map.controls[google.maps.ControlPosition.TOP_LEFT].push(infoBox);
}