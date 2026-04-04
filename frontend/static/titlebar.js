/**
 * frontend/static/titlebar.js
 * Injected as the FIRST script on every page (via <script src="/static/titlebar.js">).
 *
 * Responsibilities:
 *  1. Apply persisted dark/light theme ASAP (before render) to avoid flash.
 *  2. In Electron: inject the custom frameless titlebar with window controls
 *     AND a theme-toggle button.
 *  3. In browser (non-Electron): inject a floating theme-toggle FAB so the
 *     theme can still be changed.
 */

(function () {
    // ── 1. Apply theme immediately to avoid FOUC ─────────────────────────────
    const savedTheme = localStorage.getItem('pharmacian_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // ── 2. Inject titlebar CSS ────────────────────────────────────────────────
    function injectCSS() {
        if (document.querySelector('link[href*="titlebar.css"]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/static/titlebar.css';
        document.head.appendChild(link);
    }

    // ── 3. Toggle logic (shared) ──────────────────────────────────────────────
    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('pharmacian_theme', next);
        updateToggleIcon(next);
    }

    function updateToggleIcon(theme) {
        const icons = document.querySelectorAll('.theme-toggle-icon');
        icons.forEach(ic => {
            ic.className = 'theme-toggle-icon fas ' + (theme === 'dark' ? 'fa-sun' : 'fa-moon');
            ic.parentElement.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        injectCSS();

        // Inject FontAwesome if needed (for theme icon)
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const fa = document.createElement('link');
            fa.rel = 'stylesheet';
            fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(fa);
        }

        const currentTheme = localStorage.getItem('pharmacian_theme') || 'dark';
        const iconClass = currentTheme === 'dark' ? 'fa-sun' : 'fa-moon';
        const iconTitle = currentTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';

        if (window.pharmacianApp) {
            // ── Electron titlebar ───────────────────────────────────────────
            const titlebarHTML = `
                <div id="electron-titlebar">
                    <div class="tb-branding">
                        <img src="/static/logo.png" class="tb-logo" alt="Logo">
                        <span class="tb-title">Pharmacian Clinical System</span>
                    </div>
                    <div class="tb-controls">
                        <button class="tb-btn tb-btn-theme" id="tb-theme" title="${iconTitle}">
                            <i class="theme-toggle-icon fas ${iconClass}"></i>
                        </button>
                        <button class="tb-btn tb-btn-min" id="tb-min" title="Minimize">
                            <svg viewBox="0 0 10 1"><rect width="10" height="1"/></svg>
                        </button>
                        <button class="tb-btn tb-btn-max" id="tb-max" title="Maximize">
                            <svg viewBox="0 0 10 10"><path d="M0,0v10h10V0H0z M9,9H1V1h8V9z"/></svg>
                        </button>
                        <button class="tb-btn tb-btn-close" id="tb-close" title="Close">
                            <svg viewBox="0 0 10 10"><path d="M10,1.4L8.6,0L5,3.6L1.4,0L0,1.4L3.6,5L0,8.6L1.4,10L5,6.4L8.6,10L10,8.6L6.4,5L10,1.4z"/></svg>
                        </button>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('afterbegin', titlebarHTML);
            document.body.classList.add('has-custom-titlebar');
            document.documentElement.style.setProperty('--tb-height', '32px');

            document.getElementById('tb-theme').addEventListener('click', toggleTheme);
            document.getElementById('tb-min').addEventListener('click', () => window.pharmacianApp.minimize());
            document.getElementById('tb-max').addEventListener('click', () => window.pharmacianApp.maximize());
            document.getElementById('tb-close').addEventListener('click', () => window.pharmacianApp.close());
        } else {
            // ── Browser fallback: floating FAB theme toggle ──────────────────
            const fab = document.createElement('button');
            fab.id = 'theme-fab';
            fab.title = iconTitle;
            fab.innerHTML = `<i class="theme-toggle-icon fas ${iconClass}"></i>`;
            fab.style.cssText = `
                position: fixed; bottom: 24px; right: 24px; z-index: 9999;
                width: 44px; height: 44px; border-radius: 50%; border: none;
                background: var(--clr-accent); color: #fff;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; font-size: 1rem;
                box-shadow: 0 4px 16px rgba(0,0,0,0.3);
                transition: all 0.3s ease;
            `;
            fab.addEventListener('click', toggleTheme);
            document.body.appendChild(fab);
        }
    });
})();
