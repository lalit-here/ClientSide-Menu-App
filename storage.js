/**
 * IndexedDB wrapper for POS system
 * Provides simple interface for managing menu items and orders
 */

const DB_NAME = 'POS_DB';
const DB_VERSION = 2;
const MENU_STORE = 'menu';
const ORDERS_STORE = 'orders';
const ARCHIVE_STORE = 'archive';

let db = null;

/**
 * Initialize IndexedDB with objectStores for menu and orders
 * @returns {Promise<IDBDatabase>} Promise that resolves with the database instance
 */
function initDB() {
    return new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                const err = new Error('Failed to open database');
                if (typeof handleError === 'function') {
                    handleError('Storage error: Failed to open database', err);
                }
                reject(err);
            };

            request.onsuccess = (event) => {
                try {
                    db = event.target.result;
                    resolve(db);
                } catch (err) {
                    if (typeof handleError === 'function') {
                        handleError('Storage error: Database initialization failed', err);
                    }
                    reject(err);
                }
            };

            request.onupgradeneeded = (event) => {
                try {
                    const database = event.target.result;

                    // Create menu objectStore if it doesn't exist
                    if (!database.objectStoreNames.contains(MENU_STORE)) {
                        database.createObjectStore(MENU_STORE, { keyPath: 'id' });
                    }

                    // Create orders objectStore if it doesn't exist
                    if (!database.objectStoreNames.contains(ORDERS_STORE)) {
                        database.createObjectStore(ORDERS_STORE, { keyPath: 'id' });
                    }
                    if (!database.objectStoreNames.contains(ARCHIVE_STORE)) {
                        database.createObjectStore(ARCHIVE_STORE, { keyPath: 'id' });
                    }
                } catch (err) {
                    if (typeof handleError === 'function') {
                        handleError('Storage error: Database upgrade failed', err);
                    }
                }
            };
        } catch (err) {
            if (typeof handleError === 'function') {
                handleError('Storage error: Database initialization failed', err);
            }
            reject(err);
        }
    });
}

/**
 * Save menu items to IndexedDB
 * @param {Array} menuArray - Array of menu items to save
 * @returns {Promise<void>}
 */
function saveMenu(menuArray) {
    return new Promise((resolve, reject) => {
        try {
            if (!db) {
                const err = new Error('Database not initialized. Call initDB() first.');
                if (typeof handleError === 'function') {
                    handleError('Storage error: Database not initialized', err);
                }
                reject(err);
                return;
            }

            const transaction = db.transaction([MENU_STORE], 'readwrite');
            const store = transaction.objectStore(MENU_STORE);

            // Clear existing menu items
            store.clear();

            // Add all menu items
            menuArray.forEach(item => {
                store.add(item);
            });

            transaction.oncomplete = () => {
                resolve();
            };

            transaction.onerror = () => {
                const err = new Error('Failed to save menu');
                if (typeof handleError === 'function') {
                    handleError('Storage error: Failed to save menu', err);
                }
                reject(err);
            };
        } catch (err) {
            if (typeof handleError === 'function') {
                handleError('Storage error: Failed to save menu', err);
            }
            reject(err);
        }
    });
}

/**
 * Retrieve all menu items from IndexedDB
 * @returns {Promise<Array>} Promise that resolves with array of menu items
 */
function getMenu() {
    return new Promise((resolve, reject) => {
        try {
            if (!db) {
                const err = new Error('Database not initialized. Call initDB() first.');
                if (typeof handleError === 'function') {
                    handleError('Storage error: Database not initialized', err);
                }
                reject(err);
                return;
            }

            const transaction = db.transaction([MENU_STORE], 'readonly');
            const store = transaction.objectStore(MENU_STORE);
            const request = store.getAll();

            request.onsuccess = () => {
                try {
                    const menu = request.result || [];
                    // Validate menu items - filter out corrupted entries
                    const validMenu = menu.filter(item => {
                        if (typeof isValidMenuItem === 'function') {
                            return isValidMenuItem(item);
                        }
                        // Fallback validation
                        return item && item.id && item.name && typeof item.price === 'number';
                    });

                    // If menu is empty or all items are invalid, return empty array
                    // (caller should restore default menu)
                    resolve(validMenu);
                } catch (err) {
                    if (typeof handleError === 'function') {
                        handleError('Storage error: Failed to process menu data', err);
                    }
                    resolve([]); // Return empty array instead of crashing
                }
            };

            request.onerror = () => {
                const err = new Error('Failed to retrieve menu');
                if (typeof handleError === 'function') {
                    handleError('Storage error: Failed to retrieve menu', err);
                }
                reject(err);
            };
        } catch (err) {
            if (typeof handleError === 'function') {
                handleError('Storage error: Failed to retrieve menu', err);
            }
            reject(err);
        }
    });
}

/**
 * Save a single order to IndexedDB
 * @param {Object} order - Order object with id as keyPath
 * @returns {Promise<void>}
 */
function saveOrder(order) {
    return new Promise((resolve, reject) => {
        try {
            if (!db) {
                const err = new Error('Database not initialized. Call initDB() first.');
                if (typeof handleError === 'function') {
                    handleError('Storage error: Database not initialized', err);
                }
                reject(err);
                return;
            }

            const transaction = db.transaction([ORDERS_STORE], 'readwrite');
            const store = transaction.objectStore(ORDERS_STORE);
            const request = store.add(order);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                const err = new Error('Failed to save order');
                if (typeof handleError === 'function') {
                    handleError('Storage error: Failed to save order', err);
                }
                reject(err);
            };
        } catch (err) {
            if (typeof handleError === 'function') {
                handleError('Storage error: Failed to save order', err);
            }
            reject(err);
        }
    });
}

/**
 * Retrieve all orders from IndexedDB
 * @returns {Promise<Array>} Promise that resolves with array of all orders
 */
function getAllOrders() {
    return new Promise((resolve, reject) => {
        try {
            if (!db) {
                const err = new Error('Database not initialized. Call initDB() first.');
                if (typeof handleError === 'function') {
                    handleError('Storage error: Database not initialized', err);
                }
                reject(err);
                return;
            }

            const transaction = db.transaction([ORDERS_STORE], 'readonly');
            const store = transaction.objectStore(ORDERS_STORE);
            const request = store.getAll();

            request.onsuccess = () => {
                try {
                    const orders = request.result || [];
                    // Validate orders - filter out corrupted entries
                    const validOrders = [];
                    let skippedCount = 0;

                    orders.forEach(order => {
                        if (typeof isValidOrder === 'function') {
                            if (isValidOrder(order)) {
                                validOrders.push(order);
                            } else {
                                skippedCount++;
                            }
                        } else {
                            // Fallback validation
                            if (order && order.id && order.timestamp && Array.isArray(order.items)) {
                                validOrders.push(order);
                            } else {
                                skippedCount++;
                            }
                        }
                    });

                    if (skippedCount > 0 && typeof handleError === 'function') {
                        handleError(`Some orders were skipped due to invalid data (${skippedCount} skipped)`, null);
                    }

                    resolve(validOrders);
                } catch (err) {
                    if (typeof handleError === 'function') {
                        handleError('Storage error: Failed to process orders data', err);
                    }
                    resolve([]); // Return empty array instead of crashing
                }
            };

            request.onerror = () => {
                const err = new Error('Failed to retrieve orders');
                if (typeof handleError === 'function') {
                    handleError('Storage error: Failed to retrieve orders', err);
                }
                reject(err);
            };
        } catch (err) {
            if (typeof handleError === 'function') {
                handleError('Storage error: Failed to retrieve orders', err);
            }
            reject(err);
        }
    });
}

/**
 * Update or insert an order (upsert operation)
 * @param {Object} order - Order object to update or insert
 * @returns {Promise<void>}
 */
function updateOrder(order) {
    return new Promise((resolve, reject) => {
        try {
            if (!db) {
                const err = new Error('Database not initialized. Call initDB() first.');
                if (typeof handleError === 'function') {
                    handleError('Storage error: Database not initialized', err);
                }
                reject(err);
                return;
            }

            const transaction = db.transaction([ORDERS_STORE], 'readwrite');
            const store = transaction.objectStore(ORDERS_STORE);
            const request = store.put(order);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                const err = new Error('Failed to update order');
                if (typeof handleError === 'function') {
                    handleError('Storage error: Failed to update order', err);
                }
                reject(err);
            };
        } catch (err) {
            if (typeof handleError === 'function') {
                handleError('Storage error: Failed to update order', err);
            }
            reject(err);
        }
    });
}

/**
 * Update only the status of an order
 * @param {string|number} id - Order ID
 * @param {string} status - New status value
 * @returns {Promise<void>}
 */
function updateOrderStatus(id, status) {
    return new Promise((resolve, reject) => {
        try {
            if (!db) {
                const err = new Error('Database not initialized. Call initDB() first.');
                if (typeof handleError === 'function') {
                    handleError('Storage error: Database not initialized', err);
                }
                reject(err);
                return;
            }

            const transaction = db.transaction([ORDERS_STORE], 'readwrite');
            const store = transaction.objectStore(ORDERS_STORE);
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                try {
                    const order = getRequest.result;
                    if (!order) {
                        const err = new Error('Order not found');
                        if (typeof handleError === 'function') {
                            handleError('Storage error: Order not found', err);
                        }
                        reject(err);
                        return;
                    }

                    order.status = status;
                    const putRequest = store.put(order);

                    putRequest.onsuccess = () => {
                        resolve();
                    };

                    putRequest.onerror = () => {
                        const err = new Error('Failed to update order status');
                        if (typeof handleError === 'function') {
                            handleError('Storage error: Failed to update order status', err);
                        }
                        reject(err);
                    };
                } catch (err) {
                    if (typeof handleError === 'function') {
                        handleError('Storage error: Failed to update order status', err);
                    }
                    reject(err);
                }
            };

            getRequest.onerror = () => {
                const err = new Error('Failed to retrieve order');
                if (typeof handleError === 'function') {
                    handleError('Storage error: Failed to retrieve order', err);
                }
                reject(err);
            };
        } catch (err) {
            if (typeof handleError === 'function') {
                handleError('Storage error: Failed to update order status', err);
            }
            reject(err);
        }
    });
}

/**
 * Export all data (menu and orders) as JSON
 * @returns {Promise<Object>} Promise that resolves with {menu, orders}
 */
function exportAll() {
    return new Promise(async (resolve, reject) => {
        try {
            const menu = await getMenu();
            const orders = await getAllOrders();
            resolve({ menu, orders });
        } catch (error) {
            if (typeof handleError === 'function') {
                handleError('Storage error: Failed to export data', error);
            }
            reject(error);
        }
    });
}

/**
 * Import data from JSON and overwrite current data
 * @param {Object} json - Object with {menu, orders} properties
 * @returns {Promise<void>}
 */
function importAll(json) {
    return new Promise(async (resolve, reject) => {
        try {
            // Validate JSON structure before writing
            if (!json || typeof json !== 'object') {
                const err = new Error('Invalid backup file: Not a valid object');
                if (typeof handleError === 'function') {
                    handleError('Invalid backup file', err);
                }
                reject(err);
                return;
            }

            if (!json.menu || !Array.isArray(json.menu)) {
                const err = new Error('Invalid backup file: Missing or invalid menu array');
                if (typeof handleError === 'function') {
                    handleError('Invalid backup file', err);
                }
                reject(err);
                return;
            }

            if (!json.orders || !Array.isArray(json.orders)) {
                const err = new Error('Invalid backup file: Missing or invalid orders array');
                if (typeof handleError === 'function') {
                    handleError('Invalid backup file', err);
                }
                reject(err);
                return;
            }

            if (!db) {
                const err = new Error('Database not initialized. Call initDB() first.');
                if (typeof handleError === 'function') {
                    handleError('Storage error: Database not initialized', err);
                }
                reject(err);
                return;
            }

            // Validate menu items before importing
            const validMenu = json.menu.filter(item => {
                if (typeof isValidMenuItem === 'function') {
                    return isValidMenuItem(item);
                }
                return item && item.id && item.name && typeof item.price === 'number';
            });

            if (validMenu.length === 0 && json.menu.length > 0) {
                const err = new Error('Invalid backup file: No valid menu items found');
                if (typeof handleError === 'function') {
                    handleError('Invalid backup file', err);
                }
                reject(err);
                return;
            }

            // Import menu
            await saveMenu(validMenu);

            // Validate and import orders
            const validOrders = json.orders.filter(order => {
                if (typeof isValidOrder === 'function') {
                    return isValidOrder(order);
                }
                return order && order.id && order.timestamp && Array.isArray(order.items);
            });

            const transaction = db.transaction([ORDERS_STORE], 'readwrite');
            const store = transaction.objectStore(ORDERS_STORE);

            // Clear existing orders
            await new Promise((res, rej) => {
                try {
                    const clearRequest = store.clear();
                    clearRequest.onsuccess = () => res();
                    clearRequest.onerror = () => {
                        const err = new Error('Failed to clear orders');
                        if (typeof handleError === 'function') {
                            handleError('Storage error: Failed to clear orders', err);
                        }
                        rej(err);
                    };
                } catch (err) {
                    if (typeof handleError === 'function') {
                        handleError('Storage error: Failed to clear orders', err);
                    }
                    rej(err);
                }
            });

            // Add all valid orders
            for (const order of validOrders) {
                await new Promise((res, rej) => {
                    try {
                        const addRequest = store.add(order);
                        addRequest.onsuccess = () => res();
                        addRequest.onerror = () => {
                            const err = new Error('Failed to import order');
                            if (typeof handleError === 'function') {
                                handleError('Storage error: Failed to import order', err);
                            }
                            rej(err);
                        };
                    } catch (err) {
                        if (typeof handleError === 'function') {
                            handleError('Storage error: Failed to import order', err);
                        }
                        rej(err);
                    }
                });
            }

            resolve();
        } catch (error) {
            if (typeof handleError === 'function') {
                handleError('Storage error: Import failed', error);
            }
            reject(error);
        }
    });
}

/**
 * Clear all data from the database (use with caution!)
 * @returns {Promise<void>}
 */
function clearAll() {
    return new Promise((resolve, reject) => {
        try {
            if (!db) {
                const err = new Error('Database not initialized. Call initDB() first.');
                if (typeof handleError === 'function') {
                    handleError('Storage error: Database not initialized', err);
                }
                reject(err);
                return;
            }

            const transaction = db.transaction([MENU_STORE, ORDERS_STORE], 'readwrite');
            const menuStore = transaction.objectStore(MENU_STORE);
            const ordersStore = transaction.objectStore(ORDERS_STORE);

            let completed = 0;
            const total = 2;

            const checkComplete = () => {
                completed++;
                if (completed === total) {
                    resolve();
                }
            };

            const menuClearRequest = menuStore.clear();
            menuClearRequest.onsuccess = checkComplete;
            menuClearRequest.onerror = () => {
                const err = new Error('Failed to clear menu');
                if (typeof handleError === 'function') {
                    handleError('Storage error: Failed to clear menu', err);
                }
                reject(err);
            };

            const ordersClearRequest = ordersStore.clear();
            ordersClearRequest.onsuccess = checkComplete;
            ordersClearRequest.onerror = () => {
                const err = new Error('Failed to clear orders');
                if (typeof handleError === 'function') {
                    handleError('Storage error: Failed to clear orders', err);
                }
                reject(err);
            };
        } catch (err) {
            if (typeof handleError === 'function') {
                handleError('Storage error: Failed to clear data', err);
            }
            reject(err);
        }
    });
}

function saveArchive(ordersArray) {
    return new Promise(async (resolve, reject) => {
        try {
            if (!db) {
                const err = new Error('Database not initialized. Call initDB() first.');
                if (typeof handleError === 'function') {
                    handleError('Storage error: Database not initialized', err);
                }
                reject(err);
                return;
            }
            const tx = db.transaction([ARCHIVE_STORE], 'readwrite');
            const store = tx.objectStore(ARCHIVE_STORE);
            for (const order of ordersArray) {
                await new Promise((res, rej) => {
                    try {
                        const req = store.put(order);
                        req.onsuccess = () => res();
                        req.onerror = () => {
                            const err = new Error('Failed to save archive item');
                            if (typeof handleError === 'function') {
                                handleError('Storage error: Failed to save archive item', err);
                            }
                            rej(err);
                        };
                    } catch (err) {
                        if (typeof handleError === 'function') {
                            handleError('Storage error: Failed to save archive item', err);
                        }
                        rej(err);
                    }
                });
            }
            resolve();
        } catch (error) {
            if (typeof handleError === 'function') {
                handleError('Storage error: Failed to save archive', error);
            }
            reject(error);
        }
    });
}

function getArchive() {
    return new Promise((resolve, reject) => {
        try {
            if (!db) {
                const err = new Error('Database not initialized. Call initDB() first.');
                if (typeof handleError === 'function') {
                    handleError('Storage error: Database not initialized', err);
                }
                reject(err);
                return;
            }
            const tx = db.transaction([ARCHIVE_STORE], 'readonly');
            const store = tx.objectStore(ARCHIVE_STORE);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => {
                const err = new Error('Failed to retrieve archive');
                if (typeof handleError === 'function') {
                    handleError('Storage error: Failed to retrieve archive', err);
                }
                reject(err);
            };
        } catch (err) {
            if (typeof handleError === 'function') {
                handleError('Storage error: Failed to retrieve archive', err);
            }
            reject(err);
        }
    });
}

function saveOrders(ordersArray) {
    return new Promise(async (resolve, reject) => {
        try {
            if (!db) {
                const err = new Error('Database not initialized. Call initDB() first.');
                if (typeof handleError === 'function') {
                    handleError('Storage error: Database not initialized', err);
                }
                reject(err);
                return;
            }
            const tx = db.transaction([ORDERS_STORE], 'readwrite');
            const store = tx.objectStore(ORDERS_STORE);
            await new Promise((res, rej) => {
                try {
                    const clearRequest = store.clear();
                    clearRequest.onsuccess = () => res();
                    clearRequest.onerror = () => {
                        const err = new Error('Failed to clear orders');
                        if (typeof handleError === 'function') {
                            handleError('Storage error: Failed to clear orders', err);
                        }
                        rej(err);
                    };
                } catch (err) {
                    if (typeof handleError === 'function') {
                        handleError('Storage error: Failed to clear orders', err);
                    }
                    rej(err);
                }
            });
            for (const order of ordersArray) {
                await new Promise((res, rej) => {
                    try {
                        const req = store.put(order);
                        req.onsuccess = () => res();
                        req.onerror = () => {
                            const err = new Error('Failed to save order');
                            if (typeof handleError === 'function') {
                                handleError('Storage error: Failed to save order', err);
                            }
                            rej(err);
                        };
                    } catch (err) {
                        if (typeof handleError === 'function') {
                            handleError('Storage error: Failed to save order', err);
                        }
                        rej(err);
                    }
                });
            }
            resolve();
        } catch (error) {
            if (typeof handleError === 'function') {
                handleError('Storage error: Failed to save orders', error);
            }
            reject(error);
        }
    });
}

