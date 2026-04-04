/**
 * frontend/static/nav.js
 *
 * Shared navigation helper for all inner-app pages.
 * Include AFTER titlebar.js.
 *
 * Features:
 *  - Auth guard: redirects to / if not logged in
 *  - Populates user badge (name, role, initials)
 *  - Wires logout buttons
 *  - Marks active nav link
 *  - 15-minute idle session timeout
 *  - First-login force-password-change banner
 */

(function () {
    'use strict';

    const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
    let idleTimer = null;

    // ── Idle Session Timeout ────────────────────────────────────────────────
    function resetIdleTimer() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(async () => {
            if (window.pharmacianAuth) {
                try { await window.pharmacianAuth.logout(); } catch (_) {}
            }
            // Show a brief toast then redirect
            const toast = document.createElement('div');
            toast.id = 'idle-toast';
            toast.innerHTML = '<i class="fas fa-lock"></i> Session expired — redirecting to login…';
            toast.style.cssText = `
                position:fixed; bottom:30px; left:50%; transform:translateX(-50%);
                background:var(--clr-danger,#ef4444); color:#fff;
                padding:14px 28px; border-radius:10px; font-weight:600;
                font-size:0.9rem; z-index:9999; box-shadow:0 6px 20px rgba(0,0,0,0.4);
                display:flex; align-items:center; gap:10px;
                animation:toastIn 0.3s ease-out;
            `;
            document.body.appendChild(toast);
            setTimeout(() => { window.location.href = '/'; }, 2000);
        }, IDLE_TIMEOUT_MS);
    }

    function startIdleWatcher() {
        ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'].forEach(ev => {
            document.addEventListener(ev, resetIdleTimer, { passive: true });
        });
        resetIdleTimer(); // start the clock
    }

    // ── First-Login Banner ──────────────────────────────────────────────────
    function showPasswordChangeBanner(user) {
        if (document.getElementById('pw-change-banner')) return;
        const banner = document.createElement('div');
        banner.id = 'pw-change-banner';

        const isDefaultAdmin = user && user.username === 'admin';
        const message = isDefaultAdmin 
            ? 'You are using the default admin password.' 
            : 'A password change is required for your account.';

        banner.innerHTML = `
            <i class="fas fa-shield-halved"></i>
            <strong>Security Notice:</strong> ${message}
            Please change it immediately.
            <a href="/settings" style="
                margin-left:12px; background:#fff; color:#b45309;
                padding:5px 14px; border-radius:6px; font-weight:700;
                font-size:0.82rem; text-decoration:none;
            ">Change Now →</a>
            <button onclick="this.parentElement.remove()" style="
                background:none; border:none; color:rgba(255,255,255,0.7);
                cursor:pointer; font-size:1.1rem; margin-left:8px; line-height:1;
            ">✕</button>
        `;
        banner.style.cssText = `
            position:fixed; top:var(--tb-height,32px); left:0; right:0;
            background:linear-gradient(90deg,#92400e,#b45309);
            color:#fff; padding:12px 24px;
            display:flex; align-items:center; gap:10px;
            font-size:0.88rem; z-index:200;
            border-bottom:1px solid rgba(255,255,255,0.2);
            animation:slideDown 0.4s ease-out;
        `;
        document.body.insertAdjacentElement('afterbegin', banner);

        // Push content down
        const contentArea = document.querySelector('.content-area, main, .main-content');
        if (contentArea) {
            contentArea.style.paddingTop = `calc(${contentArea.style.paddingTop || '0px'} + 50px)`;
        }
    }

    // ── Mobile Navigation ──────────────────────────────────────────────────
    function setupMobileNav() {
        const topBar = document.querySelector('.top-bar');
        const sidebar = document.querySelector('.sidebar');
        if (!topBar || !sidebar) return;

        // 1. Create toggle if missing
        let toggle = document.querySelector('.mobile-toggle');
        if (!toggle) {
            toggle = document.createElement('div');
            toggle.className = 'mobile-toggle';
            toggle.innerHTML = '<i class="fas fa-bars"></i>';
            topBar.prepend(toggle);
        }

        // 2. Toggle sidebar
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('mobile-open');
        });

        // 3. Close when clicking outside
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('mobile-open') && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
                sidebar.classList.remove('mobile-open');
            }
        });

        // 4. Close when clicking a link
        sidebar.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('mobile-open');
            });
        });
    }

    // ── Main init ───────────────────────────────────────────────────────────
    async function initNav() {
        // 1. Mark active nav link
        const path = window.location.pathname;
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href') || '';
            if (href && path.startsWith(href) && href !== '/') {
                link.classList.add('active');
            } else if (href === '/' && path === '/') {
                link.classList.add('active');
            }
        });

        // 2. Auth guard — redirect to login if no active session
        let user = null;
        if (window.pharmacianAuth) {
            try {
                const res = await window.pharmacianAuth.getUser();
                if (res && res.ok && res.data) {
                    user = res.data;
                } else {
                    // Not authenticated — redirect to login page
                    window.location.href = '/';
                    return;
                }
            } catch (e) {
                console.warn('[nav.js] Could not fetch user:', e);
            }
        }

        // 3. Populate user widgets
        const populateEl = (id, val) => {
            const el = document.getElementById(id);
            if (el && val) el.textContent = val;
        };

        if (user) {
            const initials = user.username
                ? user.username.slice(0, 2).toUpperCase()
                : 'DR';

            populateEl('nav-user-name', user.username || 'Clinician');
            populateEl('nav-user-role', user.role
                ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                : 'Clinician');
            populateEl('nav-user-initials', initials);

            // Store user globally for page-level code (e.g. settings.html)
            window.__pharmacianUser = user;

            // 4. Check if first login (needs password change)
            if (window.pharmacianAuth.needsPasswordChange) {
                try {
                    const res = await window.pharmacianAuth.needsPasswordChange();
                    if (res && res.ok && res.data) {
                        showPasswordChangeBanner(user);
                    }
                } catch (_) {}
            }
        } else {
            // Fallback for browser dev mode (no Electron bridge)
            populateEl('nav-user-name', 'Clinician');
            populateEl('nav-user-role', 'Demo');
            populateEl('nav-user-initials', 'DC');
        }

        // 5. Wire logout buttons
        document.querySelectorAll('.btn-logout').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (window.pharmacianAuth) {
                    try { await window.pharmacianAuth.logout(); } catch (e) {}
                }
                window.location.href = '/';
            });
        });

        // 6. Start idle watcher (only in Electron context)
        if (window.pharmacianAuth) {
            startIdleWatcher();
        }

        // 7. Setup Mobile Nav
        setupMobileNav();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNav);
    } else {
        initNav();
    }

    // Style injection for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown { from { opacity:0; transform:translateY(-100%); } to { opacity:1; transform:translateY(0); } }
        @keyframes toastIn  { from { opacity:0; transform:translate(-50%,10px); } to { opacity:1; transform:translate(-50%,0); } }
    `;
    document.head.appendChild(style);
})();
