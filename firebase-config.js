/**
 * Alpha Classes — Google Firebase Cloud Database Integration
 * Provides real-time cross-device sync for Attendance, Fees, Students, Teachers, and Notices.
 */

(function (window) {
  'use strict';

  const firebaseConfig = {
    apiKey: "AIzaSyB9ApKcuR7d94ycNUmQi0Z4yjLQ5LmdQi0",
    authDomain: "alpha-classes-4d8be.firebaseapp.com",
    projectId: "alpha-classes-4d8be",
    storageBucket: "alpha-classes-4d8be.firebasestorage.app",
    messagingSenderId: "81861242637",
    appId: "1:81861242637:web:9b5620a943a3bcc4218a44",
    measurementId: "G-Y9ZQ8WCJ6S"
  };

  const STORAGE_KEY = 'alpha_classes_data_v1';
  let db = null;
  let isCloudActive = false;
  let isSyncing = false;

  // Initialize Firebase App
  try {
    if (typeof firebase !== 'undefined') {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.firestore();
      isCloudActive = true;
      console.log('⚡ Alpha Classes: Connected to Google Cloud Firebase (Firestore)');
    } else {
      console.warn('⚠️ Alpha Classes: Firebase SDK not found, running in local-only mode');
    }
  } catch (err) {
    console.error('⚠️ Alpha Classes: Firebase init error:', err);
  }

  const DOC_REF = isCloudActive ? db.collection('classroom_data').doc('institute_main') : null;

  // Local Storage Helper
  function getLocalData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function setLocalData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  const AlphaFirebase = {
    isCloudReady() {
      return isCloudActive && db !== null;
    },

    /**
     * Initializes Cloud Database:
     * Reads from Firestore. If Firestore is empty, uploads local data to cloud.
     * Listens for real-time cloud changes (onSnapshot).
     */
    initSync(onDataChangedCallback) {
      if (!this.isCloudReady()) {
        if (typeof onDataChangedCallback === 'function') {
          onDataChangedCallback(getLocalData(), 'local');
        }
        return;
      }

      // Realtime listener for cross-device synchronization
      DOC_REF.onSnapshot((doc) => {
        if (doc.exists) {
          const cloudData = doc.data();
          // Update local cache so offline works seamlessly
          setLocalData(cloudData);
          this.broadcastCloudStatus(true);
          if (typeof onDataChangedCallback === 'function') {
            onDataChangedCallback(cloudData, 'cloud');
          }
          // Dispatch window event for other scripts
          window.dispatchEvent(new CustomEvent('alpha-cloud-data', { detail: cloudData }));
        } else {
          // Cloud doc does not exist yet -> Seed with existing local data or defaults
          console.log('🌱 Alpha Classes: Seeding initial data to Google Cloud Firestore...');
          const local = getLocalData() || {};
          DOC_REF.set({
            students: local.students || [],
            attendance: local.attendance || {},
            fees: local.fees || {},
            teachers: local.teachers || [],
            announcements: local.announcements || [],
            lastUpdated: new Date().toISOString(),
            updatedBy: 'System Initializer'
          }, { merge: true }).then(() => {
            console.log('✅ Initial seed uploaded to Google Cloud.');
            this.broadcastCloudStatus(true);
          }).catch(err => {
            console.error('Failed to seed cloud:', err);
            this.broadcastCloudStatus(false, err.message);
          });
        }
      }, (error) => {
        console.warn('Firestore snapshot error (falling back to local cache):', error);
        this.broadcastCloudStatus(false, error.message);
        if (typeof onDataChangedCallback === 'function') {
          onDataChangedCallback(getLocalData(), 'local');
        }
      });
    },

    /**
     * Save full institute data to Google Cloud Firestore
     */
    saveToCloud(partialOrFullData, updatedBy = 'Teacher') {
      // Always update local storage first for snappy UI
      const current = getLocalData() || {};
      const merged = Object.assign({}, current, partialOrFullData, {
        lastUpdated: new Date().toISOString(),
        updatedBy: updatedBy
      });
      setLocalData(merged);

      if (!this.isCloudReady() || isSyncing) return Promise.resolve(merged);

      isSyncing = true;
      return DOC_REF.set(merged, { merge: true })
        .then(() => {
          isSyncing = false;
          this.broadcastCloudStatus(true);
          return merged;
        })
        .catch((err) => {
          isSyncing = false;
          console.error('Cloud save failed, local cache preserved:', err);
          this.broadcastCloudStatus(false, err.message);
          return merged;
        });
    },

    /**
     * Broadcast Cloud Connection Status to UI
     */
    broadcastCloudStatus(isConnected, errorMsg = '') {
      window.dispatchEvent(new CustomEvent('alpha-cloud-status', {
        detail: { connected: isConnected, error: errorMsg }
      }));

      // Update badge if element exists
      const badge = document.getElementById('cloudStatusBadge');
      if (badge) {
        if (isConnected) {
          badge.className = 'badge bg-success bg-opacity-10 text-success border border-success d-inline-flex align-items-center gap-1';
          badge.innerHTML = '<i class="bi bi-cloud-check-fill"></i> Google Cloud Live';
          badge.title = 'Real-time sync active with Google Cloud';
        } else {
          badge.className = 'badge bg-warning bg-opacity-10 text-warning border border-warning d-inline-flex align-items-center gap-1';
          badge.innerHTML = '<i class="bi bi-cloud-slash-fill"></i> Local Offline Mode';
          badge.title = errorMsg || 'Running offline, will sync when reconnected';
        }
      }
    }
  };

  window.AlphaFirebase = AlphaFirebase;

})(window);
