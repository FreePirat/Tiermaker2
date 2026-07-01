(function() {
    const TEMPLATE_KEY = 'tierTemplates';
    const DB_NAME = 'TierMaker2Storage';
    const DB_VERSION = 1;
    const STORE_NAME = 'kv';

    let dbPromise = null;

    function hasIndexedDB() {
        return typeof indexedDB !== 'undefined';
    }

    function openDb() {
        if (!hasIndexedDB()) {
            return Promise.resolve(null);
        }

        if (dbPromise) {
            return dbPromise;
        }

        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = function(event) {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };

            request.onsuccess = function(event) {
                resolve(event.target.result);
            };

            request.onerror = function(event) {
                reject(event.target.error || new Error('Failed to open IndexedDB'));
            };
        });

        return dbPromise;
    }

    function idbGet(key) {
        return openDb().then(db => {
            if (!db) {
                return null;
            }

            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const request = store.get(key);

                request.onsuccess = function() {
                    resolve(request.result ?? null);
                };

                request.onerror = function(event) {
                    reject(event.target.error || new Error('IndexedDB read failed'));
                };
            });
        });
    }

    function idbSet(key, value) {
        return openDb().then(db => {
            if (!db) {
                return false;
            }

            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.put(value, key);

                tx.oncomplete = function() {
                    resolve(true);
                };

                tx.onerror = function(event) {
                    reject(event.target.error || new Error('IndexedDB write failed'));
                };

                tx.onabort = function(event) {
                    reject(event.target.error || new Error('IndexedDB transaction aborted'));
                };
            });
        });
    }

    function loadFromLocalStorage() {
        try {
            if (typeof Storage === 'undefined') {
                return [];
            }
            const raw = localStorage.getItem(TEMPLATE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn('Failed loading templates from localStorage:', error);
            return [];
        }
    }

    async function loadTemplates() {
        try {
            const idbTemplates = await idbGet(TEMPLATE_KEY);
            if (Array.isArray(idbTemplates)) {
                return idbTemplates;
            }
        } catch (error) {
            console.warn('IndexedDB load failed, falling back to localStorage:', error);
        }

        const localTemplates = loadFromLocalStorage();

        if (localTemplates.length > 0) {
            try {
                await idbSet(TEMPLATE_KEY, localTemplates);
            } catch (error) {
                console.warn('Failed migrating templates to IndexedDB:', error);
            }
        }

        return localTemplates;
    }

    async function saveTemplates(templates) {
        const safeTemplates = Array.isArray(templates) ? templates : [];

        try {
            const saved = await idbSet(TEMPLATE_KEY, safeTemplates);
            if (saved) {
                // Keep a best-effort mirror for legacy code paths.
                try {
                    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(safeTemplates));
                } catch (mirrorError) {
                    console.warn('localStorage mirror skipped (quota likely exceeded):', mirrorError);
                }
                return { success: true, backend: 'indexedDB' };
            }
        } catch (error) {
            console.warn('IndexedDB save failed, trying localStorage fallback:', error);
        }

        try {
            if (typeof Storage !== 'undefined') {
                localStorage.setItem(TEMPLATE_KEY, JSON.stringify(safeTemplates));
                return { success: true, backend: 'localStorage' };
            }
        } catch (error) {
            console.error('localStorage fallback save failed:', error);
            return { success: false, backend: 'none', error };
        }

        return { success: false, backend: 'none', error: new Error('No browser storage backend available') };
    }

    window.TemplateStorage = {
        loadTemplates,
        saveTemplates
    };
})();
