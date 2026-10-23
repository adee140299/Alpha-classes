/**
 * Alpha Classes — PWA App Installer & iOS/Android Home Screen Manager
 */

(function () {
  'use strict';

  // 1. Register Service Worker & Auto-Check Updates
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('✅ ServiceWorker registered with scope:', reg.scope);
          // Check for service worker updates immediately
          reg.update();
        })
        .catch((err) => {
          console.warn('⚠️ ServiceWorker registration failed:', err);
        });

      // Reload page once when new service worker activates
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    });
  }

  let deferredPrompt = null;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  // Don't show install buttons if already running as an installed standalone app
  if (isStandalone) {
    console.log('📱 Running in installed Standalone App mode');
    return;
  }

  // 2. Capture Android/Desktop Chrome Install Prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('📱 PWA beforeinstallprompt captured');
    showInstallButtons();
  });

  window.addEventListener('appinstalled', () => {
    console.log('🎉 Alpha Classes App successfully installed!');
    deferredPrompt = null;
    hideInstallButtons();
  });

  function showInstallButtons() {
    document.querySelectorAll('.btn-install-app').forEach(btn => {
      btn.style.display = 'inline-flex';
    });
  }

  function hideInstallButtons() {
    document.querySelectorAll('.btn-install-app').forEach(btn => {
      btn.style.display = 'none';
    });
  }

  // 3. Global Trigger Function
  window.promptAppInstall = function () {
    if (deferredPrompt) {
      // Android / Chrome direct install prompt
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted app install prompt');
        }
        deferredPrompt = null;
      });
    } else if (isIOS) {
      // iOS Safari Add to Home Screen Instructions Modal
      showIOSInstallModal();
    } else {
      // Generic Guide / Already ready
      showGenericInstallModal();
    }
  };

  function showIOSInstallModal() {
    let modal = document.getElementById('iosInstallModal');
    if (!modal) {
      const modalHtml = `
        <div class="modal fade" id="iosInstallModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content rounded-4 border-0 shadow-lg text-dark">
              <div class="modal-header border-0 pb-0">
                <div class="d-flex align-items-center gap-2">
                  <div class="brand-alpha-symbol" style="width:36px;height:36px;font-size:18px;">α</div>
                  <h5 class="modal-title fw-bold">Install Alpha Classes on iPhone / iPad</h5>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body p-4 text-center">
                <img src="./images/app-icon-192.png" alt="App Icon" class="rounded-4 mb-3 shadow" style="width: 80px; height: 80px;">
                <p class="text-secondary small mb-4">Install our official app on your iOS device in 2 easy taps for instant full-screen access without opening a browser!</p>

                <div class="p-3 bg-light rounded-3 text-start small mb-3 border">
                  <div class="d-flex align-items-center gap-3 mb-2">
                    <span class="badge bg-danger rounded-circle p-2">1</span>
                    <span>Tap the <strong>Share</strong> button <i class="bi bi-box-arrow-up text-primary fs-5"></i> at the bottom of Safari.</span>
                  </div>
                  <div class="d-flex align-items-center gap-3">
                    <span class="badge bg-danger rounded-circle p-2">2</span>
                    <span>Scroll down and tap <strong>"Add to Home Screen"</strong> <i class="bi bi-plus-square text-dark fs-5"></i>.</span>
                  </div>
                </div>

                <button type="button" class="btn btn-danger w-100 rounded-pill fw-bold" data-bs-dismiss="modal">Got it!</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      modal = document.getElementById('iosInstallModal');
    }
    new bootstrap.Modal(modal).show();
  }

  function showGenericInstallModal() {
    let modal = document.getElementById('genericInstallModal');
    if (!modal) {
      const modalHtml = `
        <div class="modal fade" id="genericInstallModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content rounded-4 border-0 shadow-lg text-dark">
              <div class="modal-header border-0 pb-0">
                <div class="d-flex align-items-center gap-2">
                  <div class="brand-alpha-symbol" style="width:36px;height:36px;font-size:18px;">α</div>
                  <h5 class="modal-title fw-bold">Install Alpha Classes App</h5>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body p-4 text-center">
                <img src="./images/app-icon-192.png" alt="App Icon" class="rounded-4 mb-3 shadow" style="width: 80px; height: 80px;">
                <h6 class="fw-bold mb-2">Android & iOS Installation</h6>
                <p class="text-secondary small mb-4">You can install this app directly on any phone without opening the App Store or Play Store!</p>

                <div class="p-3 bg-light rounded-3 text-start small mb-3 border">
                  <p class="mb-2"><strong>🤖 On Android:</strong> Open in Chrome / Browser, tap the 3 dots menu (⋮) at top right, and tap <strong>"Install App"</strong> or <strong>"Add to Home Screen"</strong>.</p>
                  <p class="mb-0"><strong>🍎 On iPhone:</strong> Open in Safari, tap the Share icon (<i class="bi bi-box-arrow-up text-primary"></i>), and select <strong>"Add to Home Screen"</strong>.</p>
                </div>

                <button type="button" class="btn btn-danger w-100 rounded-pill fw-bold" data-bs-dismiss="modal">Close</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      modal = document.getElementById('genericInstallModal');
    }
    new bootstrap.Modal(modal).show();
  }

  // Hook up any element with class .btn-install-app
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.btn-install-app').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.promptAppInstall();
      });
    });
  });

})();

