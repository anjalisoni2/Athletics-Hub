// Events Discovery Page

import {
  createIcon,
  formatDate,
  getStatusBadgeClass,
  resolveEventImageUrl
} from "../utils.js";

import { mockEvents } from "../data.js";
import { getAPIEndpoint, getAPIBaseURL } from "../api-config.js";

/* ================= HELPER FUNCTIONS ================= */

// Category to color and icon mapping
const eventCategories = ['Marathon', 'Half Marathon', 'Cyclothon', 'Triathlon', 'Trail Run'];

const categoryConfig = {
  'Marathon': { color: '#dc2626', bgColor: '#fee2e2', border: '#991b1b', icon: '🏃' },
  'Half Marathon': { color: '#ea580c', bgColor: '#ffedd5', border: '#92400e', icon: '🏃‍♀️' },
  'Cyclothon': { color: '#0891b2', bgColor: '#cffafe', border: '#164e63', icon: '🚴' },
  'Triathlon': { color: '#059669', bgColor: '#d1fae5', border: '#065f46', icon: '🏊' },
  'Trail Run': { color: '#7c3aed', bgColor: '#ede9fe', border: '#5b21b6', icon: '🏔️' }
};

function normalizeEventCategory(category) {
  const categoryAliases = {
    'Running': 'Half Marathon',
    'Trail Running': 'Trail Run',
    'Cycling': 'Cyclothon'
  };

  return categoryAliases[category] || category || 'Marathon';
}

function getCategoryConfig(category) {
  return categoryConfig[normalizeEventCategory(category)] || { color: '#667eea', bgColor: '#eef2ff', icon: '🎯' };
}

// Add these helper functions at the top
function getCurrentUserRole() {
  const currentUser = localStorage.getItem("currentUser");
  if (!currentUser) return 'guest';

  const users = JSON.parse(localStorage.getItem("users") || "{}");
  const userData = users[currentUser] || {};

  // Check for role in userData
  return userData.role || userData.userType || 'guest';
}

function isAthlete() {
  const role = getCurrentUserRole();
  return ['athlete', 'participant', 'user'].includes(role);
}

function isOrganizerOrAdmin() {
  const role = getCurrentUserRole();
  return ['organizer', 'super_admin', 'admin', 'superadmin'].includes(role);
}

if (window.location.hash === "#events") {
  renderEventsPage();
}

// Get dynamic status based on event date
function getDynamicStatus(eventDate) {
  if (!eventDate) return 'upcoming';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventDateObj = new Date(eventDate);
  eventDateObj.setHours(0, 0, 0, 0);

  // If event date has passed, mark as completed
  if (eventDateObj < today) {
    return 'completed';
  }

  return 'upcoming';
}

// Simple location to coordinates mapping
const locationCoordinates = {
  'new york': { lat: 40.7128, lng: -74.0060 },
  'nyc': { lat: 40.7128, lng: -74.0060 },
  'colorado': { lat: 39.7392, lng: -104.9903 },
  'denver': { lat: 39.7392, lng: -104.9903 },
  'san diego': { lat: 32.7157, lng: -117.1611 },
  'diego': { lat: 32.7157, lng: -117.1611 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'uk': { lat: 51.5074, lng: -0.1278 },
  'austin': { lat: 30.2672, lng: -97.7431 },
  'texas': { lat: 30.2672, lng: -97.7431 },
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'uae': { lat: 25.2048, lng: 55.2708 },
  'ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'india': { lat: 20.5937, lng: 78.9629 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'delhi': { lat: 28.7041, lng: 77.1025 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'chicago': { lat: 41.8781, lng: -87.6298 },
  'toronto': { lat: 43.6629, lng: -79.3957 },
  'vancouver': { lat: 49.2827, lng: -123.1207 }
};

// Generate default route coordinates - simple synchronous version
function generateRouteCoordinates(location) {
  let baseCoord = null;

  // Try exact match first
  const locLower = location.toLowerCase().trim();

  // Check direct matches
  for (const [key, coord] of Object.entries(locationCoordinates)) {
    if (locLower.includes(key)) {
      baseCoord = coord;
      console.log(`✓ Location matched: "${location}" → ${key}`, coord);
      break;
    }
  }

  // Fallback to default
  if (!baseCoord) {
    console.warn(`⚠️ Location "${location}" not in map, using NYC default`);
    baseCoord = { lat: 40.7128, lng: -74.0060 };
  }

  // Generate a 5-point route around the base coordinate
  const offset = 0.01;
  return [
    { lat: baseCoord.lat, lng: baseCoord.lng },
    { lat: baseCoord.lat + offset, lng: baseCoord.lng - offset },
    { lat: baseCoord.lat + offset, lng: baseCoord.lng + offset },
    { lat: baseCoord.lat - offset, lng: baseCoord.lng + offset },
    { lat: baseCoord.lat, lng: baseCoord.lng }
  ];
}

/* ================= API HELPERS ================= */

// NORMALIZED backend events - fetch ALL approved events for public discovery
async function getApprovedEvents() {
  try {
    // Always fetch ALL approved events for the public Discover Events page
    const apiUrl = getAPIEndpoint('/api/approved-events/');

    console.log("📡 Fetching approved events from:", apiUrl);

    const res = await fetch(apiUrl);

    if (!res.ok) {
      console.error(`❌ API returned status ${res.status}`);
      throw new Error(`Failed to fetch approved events (${res.status})`);
    }

    const data = await res.json();
    console.log("✅ API Response received:", data);

    if (!Array.isArray(data)) {
      console.warn("⚠️ API response is not an array:", typeof data);
      return [];
    }

    console.log(`📊 Total approved events from backend: ${data.length}`);

    // ✅ Map backend fields to frontend format
 const mappedEvents = data.map((ev) => {
  const location = ev.location || 'Unknown Location';

  return {
    id: String(ev.id),

    // ✅ Safe title (handles both cases)
    title: ev.title || ev.name || 'Untitled Event',

    description: ev.description || '',

    // ✅ Safe date
    date: ev.date || ev.start_date || '',

    location: location,

    // ✅ IMAGE FIX - Use shared resolution logic
    imageUrl: resolveEventImageUrl(ev),

    category: normalizeEventCategory(ev.category),
    status: 'upcoming',

    // ✅ Safe price
    price: ev.price || ev.fee || 0,

    currency: 'USD',

    participants: ev.participants || 0,

    // ✅ Safe max participants
    maxParticipants: ev.maxParticipants || ev.max_participants || 100,

    distance: ev.distance || '-',

    organizer: ev.organizer || ev.created_by || '-',

    registrationDeadline: ev.registrationDeadline || ev.end_date || '-',

    distances: ev.distances || [],

    routeCoordinates:
      ev.routeCoordinates || generateRouteCoordinates(location)
  };
});
    console.log("✨ Mapped events ready for display:", mappedEvents);
    return mappedEvents;

  } catch (err) {
    console.error("❌ Approved events fetch error:", err);
    return [];
  }
}

/* ================= EVENTS PAGE ================= */

export async function renderEventsPage(container) {

  let searchQuery = '';
  let selectedCategory = 'all';
  let selectedStatus = 'all';
  let viewType = 'timeline'; // cards, list, grid, timeline

  let events = [...mockEvents]; // show mock events

  console.log("🚀 renderEventsPage: Starting to fetch approved events...");
  const approvedEvents = await getApprovedEvents();
  const localEvents = JSON.parse(localStorage.getItem("events") || "[]");

  console.log(`📈 Total events after fetch: ${approvedEvents.length}, local: ${localEvents.length}`);

  // Merge backend events safely
  [...approvedEvents, ...localEvents].forEach(ev => {
    const exists = events.some(e => String(e.id) === String(ev.id));
    if (!exists) {
      events.push(ev);
    }
  });

  console.log(`✅ Total events to display: ${events.length}`);

  const uniqueCategories = eventCategories;

  // Get user role for conditional rendering
  const userRole = getCurrentUserRole();
  const canVolunteer = isAthlete(); // Only athletes can volunteer
  const isOrganizerAdmin = isOrganizerOrAdmin();

  console.log(`User role: "${userRole}", Can volunteer: ${canVolunteer}`);
  console.log(`localStorage currentUser: ${localStorage.getItem("currentUser")}`);
  console.log(`localStorage users:`, JSON.parse(localStorage.getItem("users") || "{}"));

  // Initial layout container (rendered only once)
  container.innerHTML = `
    <div class="bg-gray-50" style="min-height: 100vh; padding: 2rem 0;">
      <div class="container">
        <div class="mb-8">
          <h1 class="text-4xl font-bold mb-2">Discover Events</h1>
          <p class="text-xl text-gray-600">Find your next athletic challenge</p>

          <!-- SEARCH & FILTER BAR -->
          <div style="
              margin-top:20px;
              padding:20px;
              background:linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              border-radius:12px;
              box-shadow:0 4px 12px rgba(0,0,0,0.08);
              display:flex;
              gap:12px;
              flex-wrap:wrap;
              align-items:center;
          ">
            <!-- SEARCH INPUT WITH ICON AND CLEAR BUTTON -->
            <div style="flex:1; min-width:250px; position:relative; display:flex; align-items:center; background:white; border-radius:8px; border:2px solid #e5e7eb; overflow:hidden; transition:all 0.3s ease;">
              <span style="padding:0 12px; color:#667eea; font-size:1.2rem;">🔍</span>
              <input
                id="searchInput"
                type="text"
                placeholder="Search events or locations..."
                style="flex:1; padding:10px 8px; border:none; outline:none; font-size:0.95rem;"
              />
              <button id="clearSearchBtn" style="
                display:none;
                background:none;
                border:none;
                padding:0 12px;
                cursor:pointer;
                font-size:1.2rem;
                color:#999;
                transition:color 0.2s;
              ">
                ✕
              </button>
            </div>

            <!-- SEARCH RESULTS COUNTER -->
            <div id="searchCounter" style="
              padding:8px 16px;
              background:white;
              border-radius:8px;
              font-weight:bold;
              color:#667eea;
              display:none;
              white-space:nowrap;
              border:1px solid #e5e7eb;
            "></div>

            <!-- CATEGORY FILTER -->
            <select id="categoryFilter" style="
              padding:10px 12px;
              border-radius:8px;
              border:1px solid #e5e7eb;
              background:white;
              cursor:pointer;
              font-weight:500;
              transition:all 0.2s;
            ">
              <option value="all">📂 All Categories</option>
              ${uniqueCategories.map(cat => `<option value="${cat}">📁 ${cat}</option>`).join('')}
            </select>

            <!-- STATUS FILTER -->
            <select id="statusFilter" style="
              padding:10px 12px;
              border-radius:8px;
              border:1px solid #e5e7eb;
              background:white;
              cursor:pointer;
              font-weight:500;
              transition:all 0.2s;
            ">
              <option value="all">📊 All Status</option>
              <option value="upcoming">🔜 Upcoming</option>
              <option value="ongoing">⏱️ Ongoing</option>
              <option value="completed">✓ Completed</option>
            </select>

            <!-- RESET ALL FILTERS BUTTON -->
            <button id="resetFiltersBtn" style="
              padding:10px 16px;
              background:#667eea;
              color:white;
              border:none;
              border-radius:8px;
              cursor:pointer;
              font-weight:bold;
              transition:all 0.2s;
              display:none;
            ">
              🔄 Reset All
            </button>
          </div>
        </div>

        <div id="eventsGrid" class="events-grid grid grid-md-2 grid-lg-3 gap-6" data-view-type="cards">
          <!-- Event Cards Rendered Dynamically Here -->
        </div>

      </div>
    </div>
  `;

  // Grab Elements
  const searchInput = container.querySelector('#searchInput');
  const clearBtn = container.querySelector('#clearSearchBtn');
  const searchCounter = container.querySelector('#searchCounter');
  const categoryFilter = container.querySelector('#categoryFilter');
  const statusFilter = container.querySelector('#statusFilter');
  const resetBtn = container.querySelector('#resetFiltersBtn');
  const eventsGrid = container.querySelector('#eventsGrid');

  function renderCards() {
    // Update dynamic status for all events based on current date
    events.forEach(event => {
      const oldStatus = event.status;
      event.status = getDynamicStatus(event.date);
      if (event.title && oldStatus !== event.status) {
        console.log(`Event "${event.title}" status: ${oldStatus} → ${event.status} (date: ${event.date})`);
      }
    });

    const filteredEvents = events.filter(event => {
      const matchesSearch =
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || event.category === selectedCategory;

      const matchesStatus =
        selectedStatus === 'all' || event.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Update UI components visibility
    const isFiltered = searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all';

    if (isFiltered) {
      searchCounter.style.display = 'block';
      searchCounter.textContent = `${filteredEvents.length} result${filteredEvents.length !== 1 ? 's' : ''}`;
      resetBtn.style.display = 'block';
    } else {
      searchCounter.style.display = 'none';
      resetBtn.style.display = 'none';
    }

    if (searchQuery) {
      clearBtn.style.display = 'block';
    } else {
      clearBtn.style.display = 'none';
    }

    // Update grid class based on view type
    eventsGrid.setAttribute('data-view-type', viewType);
    if (viewType === 'cards') {
      eventsGrid.className = 'events-grid grid grid-md-2 grid-lg-3 gap-6';
    } else if (viewType === 'list') {
      eventsGrid.className = 'events-list';
    } else if (viewType === 'grid') {
      eventsGrid.className = 'events-grid grid grid-md-3 grid-lg-4 gap-4';
    } else if (viewType === 'timeline') {
      eventsGrid.className = 'events-timeline';
    }

    // Render based on view type
    if (viewType === 'cards') {
      renderCardsView(filteredEvents);
    } else if (viewType === 'list') {
      renderListView(filteredEvents);
    } else if (viewType === 'grid') {
      renderGridView(filteredEvents);
    } else if (viewType === 'timeline') {
      renderTimelineView(filteredEvents);
    }
  }

  function renderCardsView(filteredEvents) {
    // Only update inner HTML of the grid to prevent focus loss and listener removal on inputs
    eventsGrid.innerHTML = filteredEvents.map(event => {
      const catConfig = getCategoryConfig(event.category);
      const statusBadgeClass = getStatusBadgeClass(event.status);
      return `
      <div class="event-card modern-card" style="
        border: 2px solid ${catConfig.color};
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      " onmouseover="this.style.boxShadow='0 8px 16px ' + '${catConfig.color}40'; this.style.transform='translateY(-4px)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'; this.style.transform='translateY(0)'">
        <!-- Colored Top Bar -->
        <div class="event-card-top-bar" style="
          background: ${catConfig.color};
          height: 8px;
        "></div>

        <div style="padding: 1.5rem; display: flex; flex-direction: column; height: 100%; background: white;">
          <!-- Category Badge and Icon -->
          <div style="
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1rem;
          ">
            <div style="
              font-size: 2rem;
              line-height: 1;
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
            ">${catConfig.icon}</div>
            <span class="badge-category" style="
              background: ${catConfig.bgColor};
              color: ${catConfig.color};
              padding: 0.35rem 0.75rem;
              border-radius: 20px;
              font-size: 0.75rem;
              font-weight: 600;
              letter-spacing: 0.5px;
              border: 1px solid ${catConfig.color};
            ">
              ${event.category}
            </span>
          </div>

          <!-- Title and Status -->
          <div style="margin-bottom: 0.75rem;">
            <h3 style="
              margin: 0;
              font-size: 1.25rem;
              font-weight: 800;
              color: #111827;
              line-height: 1.4;
              margin-bottom: 0.5rem;
            ">
              ${event.title}
            </h3>
            <div style="display: flex; gap: 0.5rem;">
              <span class="badge ${statusBadgeClass}">
                ${event.status}
              </span>
            </div>
          </div>

          <!-- Description -->
          ${event.description ? `
            <p style="
              margin: 0.75rem 0 1rem 0;
              font-size: 0.9rem;
              color: #4b5563;
              line-height: 1.6;
              flex: 0;
            ">
              ${event.description.slice(0, 90)}${event.description.length > 90 ? '...' : ''}
            </p>
          ` : ''}

          <!-- Info Grid -->
          <div style="
            flex: 1;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
            margin-bottom: 1.25rem;
          ">
            <!-- Date Box -->
            <div class="info-box" style="
              background: linear-gradient(135deg, #fef3c7 0%, #fef08a 100%);
              padding: 0.75rem;
              border-radius: 0.5rem;
              border-left: 3px solid #f59e0b;
            ">
              <p style="margin: 0; font-size: 0.7rem; color: #92400e; font-weight: 600; text-transform: uppercase;">📅 Date</p>
              <p style="margin: 0.35rem 0 0 0; font-size: 0.9rem; font-weight: 700; color: #b45309;">
                ${formatDate(event.date)}
              </p>
            </div>

            <!-- Fee Box -->
            <div class="info-box" style="
              background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
              padding: 0.75rem;
              border-radius: 0.5rem;
              border-left: 3px solid #2563eb;
            ">
              <p style="margin: 0; font-size: 0.7rem; color: #1e40af; font-weight: 600; text-transform: uppercase;">💰 Fee</p>
              <p style="margin: 0.35rem 0 0 0; font-size: 0.9rem; font-weight: 700; color: #1e40af;">
                ${event.price > 0 ? `₹${event.price}` : 'Free'}
              </p>
            </div>
          </div>

          <!-- Location -->
          <div class="info-box" style="
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            padding: 0.75rem;
            border-radius: 0.5rem;
            border-left: 3px solid #2563eb;
            margin-bottom: 1rem;
          ">
            <p style="margin: 0; font-size: 0.7rem; color: #1e40af; font-weight: 600; text-transform: uppercase;">📍 Location</p>
            <p style="margin: 0.35rem 0 0 0; font-size: 0.9rem; font-weight: 600; color: #1e40af;">
              ${event.location}
            </p>
          </div>

          <!-- Participants -->
          <div style="
            background: #f3f4f6;
            padding: 0.75rem;
            border-radius: 0.5rem;
            margin-bottom: 1.25rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          ">
            <span style="font-size: 0.95rem;">👥</span>
            <span style="font-size: 0.85rem; color: #374151;">
              <strong>${event.participants || 0}</strong> / ${event.maxParticipants || 100} Participants
            </span>
          </div>

          <!-- Footer buttons -->
          <div style="
            display: flex;
            gap: 0.4rem;
            flex-wrap: wrap;
          ">
            ${event.status === 'completed'
        ? `<button class="btn btn-modern" style="flex: 1; background: ${catConfig.color}; color: white; padding: 0.4rem 0.6rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s; font-size: 0.85rem;"
                onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'"
                onclick="navigateTo('view-results','${event.id}')">
                🏆 Results
              </button>`
        : `
              <button class="btn btn-modern" style="flex: 1; background: ${catConfig.color}; color: white; padding: 0.4rem 0.6rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s; font-size: 0.85rem;"
                onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'"
                onclick="navigateTo('event-details','${event.id}')">
                🔍 Details
              </button>

              ${canVolunteer ? `
                <button class="btn btn-modern" style="background: ${catConfig.bgColor}; color: ${catConfig.color}; padding: 0.4rem 0.6rem; border: 1px solid ${catConfig.color}; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s; font-size: 0.85rem;"
                  onmouseover="this.style.background='${catConfig.color}'; this.style.color='white'" onmouseout="this.style.background='${catConfig.bgColor}'; this.style.color='${catConfig.color}'"
                  onclick="openVolunteer('${event.id}')">
                  Volunteer
                </button>
              ` : ''}
            `
      }
          </div>
        </div>
      </div>
    `;
    }).join('');
  }

  function renderListView(filteredEvents) {
    eventsGrid.innerHTML = `
      <div style="width: 100%;">
        ${filteredEvents.map(event => {
          const catConfig = getCategoryConfig(event.category);
          const statusBadgeClass = getStatusBadgeClass(event.status);
          return `
          <div style="
            background: white;
            border-left: 5px solid ${catConfig.color};
            border: 2px solid ${catConfig.color};
            border-radius: 0.75rem;
            padding: 1.25rem;
            margin-bottom: 1rem;
            display: flex;
            gap: 1.5rem;
            align-items: flex-start;
            transition: all 0.3s ease;
            cursor: pointer;
          " onmouseover="this.style.boxShadow='0 10px 20px ' + '${catConfig.color}40'; this.style.transform='translateY(-2px)';" onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)'; this.style.transform='translateY(0)';">
            <!-- Icon Section -->
            <div style="
              flex-shrink: 0;
              font-size: 2.5rem;
              padding: 1rem;
              background: ${catConfig.bgColor};
              border-radius: 0.75rem;
              border: 2px solid ${catConfig.color};
            ">
              ${catConfig.icon}
            </div>

            <!-- Content Section -->
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; gap: 1rem; align-items: flex-start; margin-bottom: 0.75rem;">
                <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: #111827; flex: 1;">
                  ${event.title}
                </h3>
                <span class="badge ${statusBadgeClass}" style="flex-shrink: 0;">
                  ${event.status}
                </span>
              </div>
              <p style="margin: 0 0 0.75rem 0; font-size: 0.9rem; color: #6b7280;">
                ${event.category}
              </p>
              ${event.description ? `
                <p style="margin: 0 0 1rem 0; font-size: 0.9rem; color: #4b5563;">
                  ${event.description.slice(0, 120)}...
                </p>
              ` : ''}
              <div style="display: flex; gap: 2rem; flex-wrap: wrap; font-size: 0.9rem; color: #6b7280;">
                <span>📅 ${formatDate(event.date)}</span>
                <span>📍 ${event.location}</span>
                <span>💰 ${event.price > 0 ? `₹${event.price}` : 'Free'}</span>
                <span>👥 ${event.participants || 0}/${event.maxParticipants || 100}</span>
              </div>
            </div>

            <!-- Button Section -->
            <div style="flex-shrink: 0; display: flex; gap: 0.3rem;">
              ${event.status === 'completed'
        ? `<button class="btn btn-modern" style="background: ${catConfig.color}; color: white; padding: 0.3rem 0.5rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s; font-size: 0.85rem;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'" onclick="navigateTo('view-results','${event.id}')">🏆</button>`
        : `
                <button class="btn btn-modern" style="background: ${catConfig.color}; color: white; padding: 0.3rem 0.5rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s; font-size: 0.85rem;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'" onclick="navigateTo('event-details','${event.id}')">🔍</button>
                ${canVolunteer ? `<button class="btn btn-modern" style="background: ${catConfig.bgColor}; color: ${catConfig.color}; padding: 0.3rem 0.5rem; border: 1px solid ${catConfig.color}; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s; font-size: 0.85rem;" onmouseover="this.style.background='${catConfig.color}'; this.style.color='white'" onmouseout="this.style.background='${catConfig.bgColor}'; this.style.color='${catConfig.color}'" onclick="openVolunteer('${event.id}')"></button>` : ''}
              `
        }
            </div>
          </div>
        `;
        }).join('')}
      </div>
    `;
  }

  function renderGridView(filteredEvents) {
    eventsGrid.innerHTML = filteredEvents.map(event => {
      const catConfig = getCategoryConfig(event.category);
      const statusBadgeClass = getStatusBadgeClass(event.status);
      return `
      <div style="
        background: white;
        border: 2px solid ${catConfig.color};
        border-radius: 0.75rem;
        padding: 1rem;
        transition: all 0.3s ease;
        text-align: center;
        overflow: hidden;
      " onmouseover="this.style.boxShadow='0 10px 20px ' + '${catConfig.color}40'; this.style.transform='translateY(-4px)';" onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)'; this.style.transform='translateY(0)';">
        <div style="background: ${catConfig.bgColor}; padding: 0.75rem; border-radius: 0.5rem; margin: -1rem -1rem 0.75rem -1rem; font-size: 2rem; padding-top: 1.25rem; padding-bottom: 1.25rem;">
          ${catConfig.icon}
        </div>
        <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem; font-weight: 700; color: #111827; line-height: 1.4;">
          ${event.title.slice(0, 30)}${event.title.length > 30 ? '...' : ''}
        </h4>
        <p style="margin: 0 0 0.75rem 0; font-size: 0.8rem; color: #6b7280;">
          ${event.category}
        </p>
        <span class="badge ${statusBadgeClass}" style="margin-bottom: 0.75rem; display: inline-block;">
          ${event.status}
        </span>
        <div style="margin: 0.75rem 0; font-size: 0.85rem; color: #6b7280;">
          <div>📅 ${formatDate(event.date)}</div>
          <div>📍 ${event.location.slice(0, 20)}...</div>
          <div>💰 ${event.price > 0 ? `₹${event.price}` : 'Free'}</div>
        </div>
        <div style="display: flex; gap: 0.3rem;">
          ${event.status === 'completed'
            ? `<button class="btn btn-modern" style="flex: 1; background: ${catConfig.color}; color: white; padding: 0.3rem 0.5rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s; font-size: 0.85rem;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'" onclick="navigateTo('view-results','${event.id}')">🏆</button>`
            : `
                <button class="btn btn-modern" style="flex: 1; background: ${catConfig.color}; color: white; padding: 0.3rem 0.5rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s; font-size: 0.85rem;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'" onclick="navigateTo('event-details','${event.id}')">🔍</button>
                ${canVolunteer ? `<button class="btn btn-modern" style="flex: 1; background: ${catConfig.bgColor}; color: ${catConfig.color}; padding: 0.3rem 0.5rem; border: 1px solid ${catConfig.color}; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s; font-size: 0.85rem;" onmouseover="this.style.background='${catConfig.color}'; this.style.color='white'" onmouseout="this.style.background='${catConfig.bgColor}'; this.style.color='${catConfig.color}'" onclick="openVolunteer('${event.id}')"></button>` : ''}
              `
          }
        </div>
      </div>
    `;
    }).join('');
  }

  function renderTimelineView(filteredEvents) {
    // Sort events by date
    const sortedEvents = [...filteredEvents].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Group events by date
    const groupedByDate = {};
    sortedEvents.forEach(event => {
      const dateKey = formatDate(event.date);
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(event);
    });

    eventsGrid.innerHTML = `
      <style>
        @keyframes runningAnimation {
          0% { transform: translateX(-50px); }
          50% { transform: translateX(0); }
          100% { transform: translateX(-50px); }
        }

        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.4);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(102, 126, 234, 0);
          }
        }

        .timeline-event {
          animation: slideInFromLeft 0.6s ease-out forwards;
        }

        .timeline-event:nth-child(even) {
          animation: slideInFromRight 0.6s ease-out forwards;
        }

        .timeline-runner {
          display: inline-block;
          animation: runningAnimation 1.2s ease-in-out infinite;
        }

        .timeline-dot {
          animation: pulseGlow 2s infinite;
        }
      </style>

      <div style="width: 100%; position: relative; padding: 2rem 0;">

        ${Object.entries(groupedByDate).map(([dateKey, dateEvents], dateIdx) => `
          <div style="margin-bottom: 3rem;" class="timeline-date-section">
            <!-- Date Marker with Icon -->
            <div style="
              display: flex;
              align-items: center;
              gap: 1rem;
              margin-bottom: 2rem;
              position: relative;
            ">
              <div style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 0.75rem 1.25rem;
                border-radius: 20px;
                font-weight: 700;
                white-space: nowrap;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
              ">
                📅 ${dateKey}
              </div>
              <div style="flex: 1; height: 3px; background: linear-gradient(to right, #667eea, #764ba2, transparent); border-radius: 2px;"></div>
            </div>

            <!-- Events Container with Timeline Line -->
            <div style="position: relative; padding-left: 2rem;">
              <!-- Vertical Line -->
              <div style="
                position: absolute;
                left: -8px;
                top: 0;
                bottom: -30px;
                width: 4px;
                background: linear-gradient(to bottom, #667eea, #764ba2);
                border-radius: 2px;
              "></div>

              ${dateEvents.map((event, idx) => {
                const catConfig = getCategoryConfig(event.category);
                const statusBadgeClass = getStatusBadgeClass(event.status);
                return `
                <div class="timeline-event" style="
                  background: white;
                  border: 2px solid ${catConfig.color};
                  border-radius: 12px;
                  padding: 1.5rem;
                  margin-bottom: ${idx < dateEvents.length - 1 ? '1.5rem' : '0'};
                  transition: all 0.3s ease;
                  position: relative;
                  padding-left: 3.5rem;
                  opacity: 0;
                  animation-delay: ${idx * 0.15}s;
                  cursor: pointer;
                  backdrop-filter: blur(10px);
                  background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, ${catConfig.bgColor}40 100%);
                " onmouseover="this.style.boxShadow='0 12px 28px ' + '${catConfig.color}50'; this.style.transform='translateY(-4px) scale(1.02)';" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'; this.style.transform='translateY(0) scale(1)';">

                  <!-- Timeline dot with animation -->
                  <div class="timeline-dot" style="
                    position: absolute;
                    left: -18px;
                    top: 1.75rem;
                    width: 28px;
                    height: 28px;
                    background: ${catConfig.color};
                    border: 4px solid white;
                    border-radius: 50%;
                    box-shadow: 0 0 0 2px ${catConfig.color};
                    z-index: 10;
                  "></div>

                  <!-- Content -->
                  <div style="display: flex; gap: 1rem; align-items: flex-start; margin-bottom: 1rem;">
                    <div style="
                      font-size: 2rem;
                      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
                      animation: bounce 2s ease-in-out infinite;
                      animation-delay: ${idx * 0.2}s;
                    " class="event-icon">
                      ${catConfig.icon}
                    </div>
                    <div style="flex: 1;">
                      <h4 style="
                        margin: 0 0 0.25rem 0;
                        font-size: 1.15rem;
                        font-weight: 800;
                        color: #111827;
                        background: linear-gradient(135deg, ${catConfig.color} 0%, #111827 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                      ">
                        ${event.title}
                      </h4>
                      <p style="
                        margin: 0.25rem 0 0 0;
                        font-size: 0.8rem;
                        font-weight: 700;
                        color: ${catConfig.color};
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                      ">
                        ${event.category}
                      </p>
                    </div>
                    <span class="badge ${statusBadgeClass}" style="
                      background: ${event.status === 'completed' ? '#dbeafe' : event.status === 'ongoing' ? '#fef3c7' : '#dcfce7'};
                      color: ${event.status === 'completed' ? '#1e40af' : event.status === 'ongoing' ? '#92400e' : '#166534'};
                      padding: 0.4rem 0.8rem;
                      border-radius: 20px;
                      font-size: 0.75rem;
                      font-weight: 700;
                      flex-shrink: 0;
                    ">
                      ${event.status}
                    </span>
                  </div>

                  <!-- Event Info -->
                  <div style="
                    background: ${catConfig.bgColor};
                    padding: 1rem;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                    border-left: 3px solid ${catConfig.color};
                  ">
                    <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; font-size: 0.9rem; color: #374151;">
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span>📍</span>
                        <strong>${event.location}</strong>
                      </div>
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span>💰</span>
                        <strong>${event.price > 0 ? `₹${event.price}` : 'Free'}</strong>
                      </div>
                    </div>
                  </div>

                  <!-- Button -->
                  <div style="display: flex; gap: 0.4rem;">
                    ${event.status === 'completed'
                      ? `<button class="btn btn-modern" style="
                          flex: 1;
                          background: linear-gradient(135deg, ${catConfig.color} 0%, ${catConfig.color}dd 100%);
                          color: white;
                          padding: 0.4rem 0.6rem;
                          border: none;
                          border-radius: 6px;
                          cursor: pointer;
                          font-weight: 600;
                          transition: all 0.3s ease;
                          font-size: 0.85rem;
                        " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'" onclick="navigateTo('view-results','${event.id}')">
                          🏆 Results
                        </button>`
                      : `
                          <button class="btn btn-modern" style="
                            flex: 1;
                            background: linear-gradient(135deg, ${catConfig.color} 0%, ${catConfig.color}dd 100%);
                            color: white;
                            padding: 0.4rem 0.6rem;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: 600;
                            transition: all 0.3s ease;
                            font-size: 0.85rem;
                          " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'" onclick="navigateTo('event-details','${event.id}')">
                            🔍 Details
                          </button>
                          ${canVolunteer ? `<button class="btn btn-modern" style="
                            flex: 1;
                            background: ${catConfig.bgColor};
                            color: ${catConfig.color};
                            padding: 0.4rem 0.6rem;
                            border: 1px solid ${catConfig.color};
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: 600;
                            transition: all 0.3s ease;
                            font-size: 0.85rem;
                          " onmouseover="this.style.background='${catConfig.color}'; this.style.color='white'" onmouseout="this.style.background='${catConfig.bgColor}'; this.style.color='${catConfig.color}'" onclick="openVolunteer('${event.id}')">
                            Volunteer
                          </button>` : ''}
                        `
                    }
                  </div>
                </div>
              `;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      <style>
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      </style>
    `;
  }

  // Initial render
  renderCards();

  // Event Listeners attached ONCE
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderCards();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      searchInput.focus();
      renderCards();
    });
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      selectedCategory = e.target.value;
      renderCards();
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      selectedStatus = e.target.value;
      renderCards();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      categoryFilter.value = 'all';
      selectedCategory = 'all';
      statusFilter.value = 'all';
      selectedStatus = 'all';
      renderCards();
    });
  }
}

/* ================= EVENT DETAILS (FIXED) ================= */

async function renderEventDetails(container, eventId) {
  const approvedEvents = await getApprovedEvents();
  const allEvents = [...mockEvents, ...approvedEvents];

  console.log("Clicked Event ID:", eventId);
  console.log("All Event IDs:", allEvents.map(e => e.id));

  const event = allEvents.find(ev => String(ev.id) === String(eventId));

  if (!event) {
    container.innerHTML = `<h2>Event not found</h2>`;
    return;
  }

  const eventStatus = getDynamicStatus(event.date);
  const canVolunteer = isAthlete();

  container.innerHTML = `
    <div class="container py-8">
      <h1 class="text-2xl font-bold mb-2">${event.title}</h1>

      <img src="${resolveEventImageUrl(event)}" 
           onerror="this.onerror=null;this.src='https://placehold.co/1200x400?text=Image+Not+Found'"
           class="w-full max-w-lg rounded mb-4">

      <p><b>Description:</b> ${event.description}</p>
      <p><b>Date:</b> ${event.date}</p>
      <p><b>Location:</b> ${event.location}</p>
      <p><b>Category:</b> ${event.category}</p>
      <p><b>Distance:</b> ${event.distance}</p>
      <p><b>Participants:</b> ${event.participants} / ${event.maxParticipants}</p>
      <p><b>Price:</b> ${event.price} ${event.currency}</p>
      <p><b>Organizer:</b> ${event.organizer}</p>
      <p><b>Registration Deadline:</b> ${event.registrationDeadline}</p>

      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <button class="btn btn-primary"
          onclick="navigateTo('register','${event.id}')">
          Register Now
        </button>
        ${eventStatus !== 'completed' && canVolunteer ? `
          <button class="btn" style="background: #fecaca; color: #dc2626; border: 2px solid #dc2626; padding: 0.5rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: 600;"
            onclick="openVolunteer('${event.id}')">
            ❤️ Volunteer
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

/* ================= EVENT RESULTS ================= */

// Generate mock leaderboard data based on event
function generateMockLeaderboard(eventId, participantCount) {
  const firstNames = ['Alex', 'Jordan', 'Casey', 'Morgan', 'Taylor', 'Riley', 'Jamie', 'Sam', 'Chris', 'Drew'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Anderson', 'Taylor'];

  const leaderboard = [];
  for (let i = 0; i < Math.min(participantCount, 10); i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[(i + Math.floor(i / firstNames.length)) % lastNames.length];
    const baseTime = 120 + (i * 2); // Base time in minutes
    const variance = Math.floor(Math.random() * 10) - 5;

    leaderboard.push({
      rank: i + 1,
      name: `${firstName} ${lastName}`,
      time: `${baseTime + variance}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      pace: `${Math.floor((baseTime + variance) / 10)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')} min/km`,
      badge: i < 3 ? ['🥇 Gold', '🥈 Silver', '🥉 Bronze'][i] : ''
    });
  }
  return leaderboard;
}

async function renderEventResults(container, eventId) {
  const approvedEvents = await getApprovedEvents();
  const allEvents = [...mockEvents, ...approvedEvents];

  const event = allEvents.find(ev => String(ev.id) === String(eventId));

  if (!event) {
    container.innerHTML = `<h2>Event not found</h2>`;
    return;
  }

  const leaderboard = generateMockLeaderboard(eventId, event.participants);
  const completionRate = Math.floor((event.participants / event.maxParticipants) * 100);

  container.innerHTML = `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3rem 0; margin-bottom: 3rem;">
      <div class="container">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center;">
          <!-- LEFT SIDE: TITLE AND DESCRIPTION -->
          <div style="text-align: left;">
            <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 0.5rem 1rem; border-radius: 20px; margin-bottom: 1rem;">
              <span style="font-size: 0.9rem; letter-spacing: 2px;">EVENT COMPLETED ✓</span>
            </div>
            <h1 style="font-size: 3.5rem; font-weight: bold; margin-bottom: 0.5rem; line-height: 1.2;">${event.title}</h1>
            <p style="font-size: 1.2rem; opacity: 0.9;">Results & Final Standings</p>
          </div>

          <!-- RIGHT SIDE: EVENT IMAGE -->
          <div style="text-align: center;">
            <img src="${resolveEventImageUrl(event)}" 
                 alt="${event.title}" 
                 onerror="this.onerror=null;this.src='https://placehold.co/1200x400?text=Image+Not+Found'"
                 style="width: 100%; height: 300px; object-fit: cover; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
          </div>
        </div>
      </div>
    </div>

    <div class="container" style="margin-bottom: 4rem;">
      <!-- EVENT STATS GRID -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 3rem;">
        <div style="background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-top: 4px solid #667eea;">
          <p style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">Event Date</p>
          <h3 style="font-size: 1.5rem; font-weight: bold; margin: 0;">${event.date}</h3>
        </div>

        <div style="background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-top: 4px solid #667eea;">
          <p style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">Total Finishers</p>
          <h3 style="font-size: 1.5rem; font-weight: bold; margin: 0;">${event.participants}</h3>
        </div>

        <div style="background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-top: 4px solid #667eea;">
          <p style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">Completion Rate</p>
          <h3 style="font-size: 1.5rem; font-weight: bold; margin: 0;">${completionRate}%</h3>
        </div>

        <div style="background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-top: 4px solid #667eea;">
          <p style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">Distance</p>
          <h3 style="font-size: 1.5rem; font-weight: bold; margin: 0;">${event.distance}</h3>
        </div>
      </div>

      <!-- PODIUM SECTION -->
      <div style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 16px; padding: 3rem 2rem; margin-bottom: 3rem;">
        <h2 style="text-align: center; font-size: 2rem; font-weight: bold; margin-bottom: 2rem; color: #333;">🏆 Top 3 Finishers</h2>

        <div style="display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap; align-items: flex-end;">
          <!-- Silver (2nd) -->
          <div style="text-align: center;">
            <div style="background: linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 100%); width: 120px; height: 140px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; box-shadow: 0 8px 16px rgba(192,192,192,0.3); position: relative;">
              <span style="font-size: 3rem;">🥈</span>
            </div>
            <h3 style="font-size: 1.3rem; font-weight: bold; margin: 0.5rem 0; color: #333;">${leaderboard[1].name}</h3>
            <p style="color: #666; margin: 0.3rem 0; font-size: 0.9rem;">Time: ${leaderboard[1].time}</p>
            <p style="color: #999; margin: 0; font-size: 0.85rem;">Pace: ${leaderboard[1].pace}</p>
          </div>

          <!-- Gold (1st) -->
          <div style="text-align: center; transform: scale(1.15);">
            <div style="background: linear-gradient(135deg, #FFD700 0%, #FFF8DC 100%); width: 120px; height: 160px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; box-shadow: 0 12px 24px rgba(255,215,0,0.4); position: relative;">
              <span style="font-size: 3rem;">🥇</span>
            </div>
            <h3 style="font-size: 1.4rem; font-weight: bold; margin: 0.5rem 0; color: #333;">${leaderboard[0].name}</h3>
            <p style="color: #666; margin: 0.3rem 0; font-size: 0.9rem; font-weight: bold;">Time: ${leaderboard[0].time}</p>
            <p style="color: #999; margin: 0; font-size: 0.85rem;">Pace: ${leaderboard[0].pace}</p>
          </div>

          <!-- Bronze (3rd) -->
          <div style="text-align: center;">
            <div style="background: linear-gradient(135deg, #CD7F32 0%, #DEB887 100%); width: 120px; height: 120px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; box-shadow: 0 8px 16px rgba(205,127,50,0.3); position: relative;">
              <span style="font-size: 3rem;">🥉</span>
            </div>
            <h3 style="font-size: 1.3rem; font-weight: bold; margin: 0.5rem 0; color: #333;">${leaderboard[2].name}</h3>
            <p style="color: #666; margin: 0.3rem 0; font-size: 0.9rem;">Time: ${leaderboard[2].time}</p>
            <p style="color: #999; margin: 0; font-size: 0.85rem;">Pace: ${leaderboard[2].pace}</p>
          </div>
        </div>
      </div>

      <!-- FULL LEADERBOARD -->
      <div style="background: white; border-radius: 16px; padding: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin-bottom: 3rem;">
        <h2 style="font-size: 1.8rem; font-weight: bold; margin-bottom: 1.5rem; color: #333;">📊 Final Leaderboard</h2>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                <th style="padding: 1rem; text-align: left; font-weight: bold; color: #333;">Rank</th>
                <th style="padding: 1rem; text-align: left; font-weight: bold; color: #333;">Participant Name</th>
                <th style="padding: 1rem; text-align: left; font-weight: bold; color: #333;">Finish Time</th>
                <th style="padding: 1rem; text-align: left; font-weight: bold; color: #333;">Pace</th>
                <th style="padding: 1rem; text-align: center; font-weight: bold; color: #333;">Award</th>
              </tr>
            </thead>
            <tbody>
              ${leaderboard.map((entry, index) => `
                <tr style="border-bottom: 1px solid #e5e7eb; ${index < 3 ? 'background: ' + ['rgba(255,215,0,0.05)', 'rgba(192,192,192,0.05)', 'rgba(205,127,50,0.05)'][index] : ''}">
                  <td style="padding: 1rem; font-weight: bold; color: #667eea; font-size: 1.1rem;">#${entry.rank}</td>
                  <td style="padding: 1rem; color: #333; font-weight: 500;">${entry.name}</td>
                  <td style="padding: 1rem; color: #666;">${entry.time}</td>
                  <td style="padding: 1rem; color: #666;">${entry.pace}</td>
                  <td style="padding: 1rem; text-align: center; font-size: 1.2rem;">${entry.badge}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- EVENT INFO & DOWNLOAD -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
        <div style="background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <h3 style="font-size: 1.3rem; font-weight: bold; margin-bottom: 1rem; color: #333;">📍 Event Details</h3>
          <p style="margin: 0.5rem 0; color: #666;"><b>Location:</b> ${event.location}</p>
          <p style="margin: 0.5rem 0; color: #666;"><b>Category:</b> ${event.category}</p>
          <p style="margin: 0.5rem 0; color: #666;"><b>Organizer:</b> ${event.organizer}</p>
          <p style="margin: 0.5rem 0; color: #666;"><b>Category:</b> ${event.category}</p>
        </div>

        <div style="background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <h3 style="font-size: 1.3rem; font-weight: bold; margin-bottom: 1rem; color: #333;">📥 Export Results</h3>
          <button style="width: 100%; padding: 0.75rem; background: #667eea; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom: 0.5rem; font-size: 0.95rem;" onclick="alert('Results exported as PDF')">
            📄 Download as PDF
          </button>
          <button style="width: 100%; padding: 0.75rem; background: #10b981; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.95rem;" onclick="alert('Results exported as CSV')">
            📊 Download as CSV
          </button>
        </div>
      </div>

      <!-- ACTION BUTTONS -->
      <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="navigateTo('events')" style="padding: 0.75rem 2rem; font-size: 1rem;">
          ← Back to Events
        </button>
        <button class="btn btn-ghost btn-sm" onclick="window.print()" style="padding: 0.75rem 2rem; font-size: 1rem;">
          🖨️ Print Results
        </button>
      </div>
    </div>
  `;
}

/* ================= NAVIGATION ================= */

function openVolunteer(eventId) {
  // event id ke sath volunteer page open hoga
  window.location.href = `volunteer.html?eventId=${eventId}`;
}

// global scope me expose karo
window.openVolunteer = openVolunteer;

async function navigateTo(page, eventId) {
  const container = document.getElementById('app');

  if (page === 'events') {
    await renderEventsPage(container);
  }
  else if (page === 'event-details') {
    await renderEventDetails(container, eventId);
  }
  else if (page === 'view-results') {
    await renderEventResults(container, eventId);
  }
  else if (page === 'register') {
    renderRegistrationForm(container, eventId);
  }
}

window.navigateTo = navigateTo;
window.renderEventDetails = renderEventDetails;

export { renderEventResults };
