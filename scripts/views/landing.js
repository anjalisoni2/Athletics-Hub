// Landing Page View
import { createIcon } from "../utils.js";

// Function to handle role button clicks
window.handleRoleClick = function(role) {
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser) {
        navigateTo('events');
    } else {
        window.location.href = `login.html?role=${role}`;
    }
};

window.showCheckStatusModal = function() {
    window.location.href = 'login.html';
};

window.toggleLoginDropdown = function() {
    const dropdown = document.getElementById('loginDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
};

document.addEventListener('click', function(e) {
    const btn = document.getElementById('loginDropdownBtn');
    const dropdown = document.getElementById('loginDropdown');
    if (btn && dropdown && !btn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});

export function renderLandingPage(container) {

    container.innerHTML = `
        <style>
            .hero-section {
                background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%);
                min-height: 35vh;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                overflow: hidden;
                padding: 40px 24px;
            }
            .hero-section::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                animation: pulse 15s ease-in-out infinite;
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            .hero-btn-primary {
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                color: #2563eb;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: 700;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }
            .hero-btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(255,255,255,0.3);
            }
            .hero-btn-outline {
                background: transparent;
                color: white;
                border: 2px solid white;
                padding: 8px 18px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }
            .hero-btn-outline:hover {
                background: rgba(255,255,255,0.1);
                transform: translateY(-2px);
            }
            .stats-card {
                background: white;
                border-radius: 16px;
                padding: 32px;
                text-align: center;
                box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                border: 1px solid #e2e8f0;
                transition: all 0.3s ease;
            }
            .stats-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 12px 40px rgba(0,0,0,0.12);
            }
            .feature-card {
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                padding: 32px;
                transition: all 0.3s ease;
                height: 100%;
            }
            .feature-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 12px 40px rgba(0,0,0,0.1);
                border-color: #2563eb;
            }
            .feature-icon-box {
                width: 60px;
                height: 60px;
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
                margin-bottom: 20px;
            }
            .role-card {
                background: white;
                border: 2px solid #e2e8f0;
                border-radius: 20px;
                padding: 32px;
                transition: all 0.3s ease;
                cursor: pointer;
                height: 100%;
            }
            .role-card:hover {
                transform: translateY(-8px);
                box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            }
            .role-card.athlete:hover { border-color: #3b82f6; }
            .role-card.organizer:hover { border-color: #10b981; }
            .role-card.admin:hover { border-color: #8b5cf6; }
            .role-icon-box {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 36px;
                margin: 0 auto 20px;
            }
            .enter-btn {
                width: 100%;
                padding: 14px 20px;
                border-radius: 10px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s ease;
                border: none;
            }
            .enter-btn.athlete { background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); color: white; }
            .enter-btn.organizer { background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; }
            .enter-btn.admin { background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); color: white; }
            .enter-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.2); }
            .feature-list-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 0;
                font-size: 14px;
                color: #64748b;
            }
        </style>

        <!-- Hero Section -->
        <div class="hero-section">
            <div style="max-width: 900px; margin: 0 auto; text-align: center; position: relative; z-index: 1;">
                <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                        <path d="M4 22h16"/>
                        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                    </svg>
                </div>
                <h1 style="margin: 0 0 12px 0; font-size: 28px; font-weight: 800; color: white; line-height: 1.2;">
                    Athletics Event Platform
                </h1>
                <p style="margin: 0 0 20px 0; font-size: 15px; color: rgba(255,255,255,0.9); line-height: 1.5;">
                    Discover, Register & Track Endurance Events
                </p>
                <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
                    <button class="hero-btn-primary" onclick="navigateTo('events')">
                        📅 Explore Events
                    </button>
                    ${localStorage.getItem("currentUser") ? '' : `
                    <button class="hero-btn-outline" onclick="window.location.href='login.html'">
                        🔐 Login
                    </button>
                    `}
                </div>
            </div>
        </div>

        <!-- Stats Section -->
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 30px 24px;">
            <div style="max-width: 1000px; margin: 0 auto;">
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
                    <div class="stats-card" style="padding: 20px;">
                        <div style="font-size: 28px; margin-bottom: 6px;">🏃</div>
                        <div style="font-size: 22px; font-weight: 800; color: #3b82f6; margin-bottom: 2px;">50K+</div>
                        <div style="font-size: 12px; color: #64748b; font-weight: 500;">Athletes</div>
                    </div>
                    <div class="stats-card" style="padding: 20px;">
                        <div style="font-size: 28px; margin-bottom: 6px;">🏆</div>
                        <div style="font-size: 22px; font-weight: 800; color: #8b5cf6; margin-bottom: 2px;">1,200+</div>
                        <div style="font-size: 12px; color: #64748b; font-weight: 500;">Events</div>
                    </div>
                    <div class="stats-card" style="padding: 20px;">
                        <div style="font-size: 28px; margin-bottom: 6px;">⭐</div>
                        <div style="font-size: 22px; font-weight: 800; color: #10b981; margin-bottom: 2px;">95%</div>
                        <div style="font-size: 12px; color: #64748b; font-weight: 500;">Satisfaction</div>
                    </div>
                    <div class="stats-card" style="padding: 20px;">
                        <div style="font-size: 28px; margin-bottom: 6px;">🌍</div>
                        <div style="font-size: 22px; font-weight: 800; color: #f59e0b; margin-bottom: 2px;">45+</div>
                        <div style="font-size: 12px; color: #64748b; font-weight: 500;">Countries</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Features Section -->
        <div style="background: white; padding: 50px 24px;">
            <div style="max-width: 1200px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 60px;">
                    <h2 style="margin: 0 0 16px 0; font-size: 42px; font-weight: 800; color: #1e293b;">Platform Features</h2>
                    <p style="margin: 0; font-size: 18px; color: #64748b;">Everything you need for a world-class event experience</p>
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
                    <div class="feature-card">
                        <div class="feature-icon-box" style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);">📅</div>
                        <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #1e293b;">Event Discovery</h3>
                        <p style="margin: 0; font-size: 15px; color: #64748b; line-height: 1.6;">Browse and register for marathons, triathlons, cycling events and more</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon-box" style="background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);">📡</div>
                        <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #1e293b;">Live Tracking</h3>
                        <p style="margin: 0; font-size: 15px; color: #64748b; line-height: 1.6;">Real-time GPS tracking and race updates for participants and spectators</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon-box" style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);">📊</div>
                        <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #1e293b;">Performance Analytics</h3>
                        <p style="margin: 0; font-size: 15px; color: #64748b; line-height: 1.6;">Detailed insights, personal records, and progress tracking</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon-box" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);">🏅</div>
                        <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #1e293b;">Results & Rankings</h3>
                        <p style="margin: 0; font-size: 15px; color: #64748b; line-height: 1.6;">Instant results, leaderboards, and digital certificates</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon-box" style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);">🔒</div>
                        <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #1e293b;">Secure Payments</h3>
                        <p style="margin: 0; font-size: 15px; color: #64748b; line-height: 1.6;">Safe and secure registration with multiple payment options</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon-box" style="background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);">🌐</div>
                        <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #1e293b;">Global Events</h3>
                        <p style="margin: 0; font-size: 15px; color: #64748b; line-height: 1.6;">Multi-language and multi-currency support for worldwide events</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- User Roles Section -->
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 80px 24px;">
            <div style="max-width: 1200px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 60px;">
                    <h2 style="margin: 0 0 16px 0; font-size: 42px; font-weight: 800; color: #1e293b;">Built for Everyone</h2>
                    <p style="margin: 0; font-size: 18px; color: #64748b;">Tailored experiences for every role in the athletics ecosystem</p>
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px;">
                    <!-- Athletes -->
                    <div class="role-card athlete" onclick="handleRoleClick('participant')">
                        <div class="role-icon-box" style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);">🏃</div>
                        <h3 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1e293b; text-align: center;">Athletes</h3>
                        <div style="margin-bottom: 24px;">
                            <div class="feature-list-item">🎯 Event registration & discovery</div>
                            <div class="feature-list-item">⏱️ Training plans & preparation</div>
                            <div class="feature-list-item">🏆 Performance tracking & achievements</div>
                            <div class="feature-list-item">📍 Digital bibs & race tracking</div>
                        </div>
                        <button class="enter-btn athlete" onclick="event.stopPropagation(); handleRoleClick('participant')">
                            Enter as Athlete →
                        </button>
                    </div>

                    <!-- Organizers -->
                    <div class="role-card organizer" onclick="window.location.href='login.html?role=organizer'">
                        <div class="role-icon-box" style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);">🏢</div>
                        <h3 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1e293b; text-align: center;">Organizers</h3>
                        <div style="margin-bottom: 24px;">
                            <div class="feature-list-item">📅 Event creation & management</div>
                            <div class="feature-list-item">👥 Participant management</div>
                            <div class="feature-list-item">📈 Real-time analytics & reports</div>
                            <div class="feature-list-item">⚡ Race-day operations</div>
                        </div>
                        <button class="enter-btn organizer" onclick="event.stopPropagation(); window.location.href='login.html?role=organizer'">
                            Enter as Organizer →
                        </button>
                       
                    </div>

                    <!-- Super Admin -->
                    <div class="role-card admin" onclick="event.stopPropagation();">
                        <div class="role-icon-box" style="background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);">🛡️</div>
                        <h3 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1e293b; text-align: center;">Super Admin</h3>
                        <div style="margin-bottom: 24px;">
                            <div class="feature-list-item">🛡️ Platform-wide management</div>
                            <div class="feature-list-item">👥 User & role control</div>
                            <div class="feature-list-item">📊 System monitoring</div>
                            <div class="feature-list-item">🌐 Content management</div>
                        </div>
                        <button class="enter-btn admin" onclick="event.stopPropagation(); handleRoleClick('superadmin')">
                            Enter as Super Admin →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}
