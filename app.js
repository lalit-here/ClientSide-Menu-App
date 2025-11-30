/**
 * Main application glue code
 * Initializes the POS system and manages application state
 */

// Global toast function for error handling
window.showToast = function(msg) {
    const t = document.getElementById("toast-container");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("toast-show");
    setTimeout(() => t.classList.remove("toast-show"), 2000);
};

// In-memory basket
let basket = [];

// Orders screen state
let allOrders = [];
let filteredOrders = [];
let bulkSelectMode = false;
let selectedOrders = new Set();

/**
 * Add item to basket
 * @param {Object} item - Menu item to add
 */
function addToBasket(item) {
    // Check if item already exists in basket
    const existingItem = basket.find(b => b.id === item.id);
    
    if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
    } else {
        basket.push({
            ...item,
            quantity: 1,
            note: ''
        });
    }

    // Update badge and drawer
    updateBasketUI();
}

/**
 * Update quantity of basket item
 * @param {number} itemId - Item ID
 * @param {number} quantity - New quantity
 */
function updateBasketItemQuantity(itemId, quantity) {
    const item = basket.find(b => b.id === itemId);
    if (item) {
        if (quantity <= 0) {
            removeBasketItem(itemId);
        } else {
            item.quantity = quantity;
            updateBasketUI();
        }
    }
}

/**
 * Remove item from basket
 * @param {number} itemId - Item ID
 */
function removeBasketItem(itemId) {
    basket = basket.filter(b => b.id !== itemId);
    updateBasketUI();
}

/**
 * Update note for basket item
 * @param {number} itemId - Item ID
 * @param {string} note - Note text
 */
function updateBasketItemNote(itemId, note) {
    const item = basket.find(b => b.id === itemId);
    if (item) {
        item.note = note || '';
    }
}

/**
 * Update basket UI (badge and drawer)
 */
function updateBasketUI() {
    const totalItems = basket.reduce((sum, item) => sum + (item.quantity || 1), 0);
    updateBasketBadge(totalItems);
    renderBasketDrawer(basket, updateBasketItemQuantity, removeBasketItem, updateBasketItemNote);
    
    console.log('Basket updated:', basket);
    console.log('Total items:', totalItems);
}

/**
 * Get current basket
 * @returns {Array} Current basket array
 */
function getBasket() {
    return basket;
}

/**
 * Calculate basket total
 * @returns {number} Total amount
 */
function calculateBasketTotal() {
    return basket.reduce((sum, item) => {
        return sum + (item.price * (item.quantity || 1));
    }, 0);
}

/**
 * Clear basket
 */
function clearBasket() {
    basket = [];
    updateBasketUI();
    console.log('Basket cleared');
}

/**
 * Create order from basket
 */
async function createOrder() {
    if (basket.length === 0) {
        alert('Basket is empty');
        return;
    }

    try {
        const nextOrderNumber = parseInt(localStorage.nextOrderNumber || '1', 10);
        const order = {
            id: generateId('ord-'),
            timestamp: new Date().toISOString(),
            items: basket.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity || 1,
                note: item.note || ''
            })),
            total: calculateBasketTotal(),
            status: 'Yet to prepare',
            orderNumber: nextOrderNumber
        };

        // Save order to IndexedDB
        await saveOrder(order);
        localStorage.nextOrderNumber = String(nextOrderNumber + 1);
        console.log('Order created:', order);

        // Increment usage counter for all items in order
        basket.forEach(item => {
            for (let i = 0; i < (item.quantity || 1); i++) {
                incrementItemUsage(item.id);
            }
        });

        // Clear basket
        clearBasket();

        // Hide drawer
        hideBasketDrawer();

        // Show success message
        alert('Order created successfully!');

        // Refresh favorites bar if menu is available
        const menu = await getMenu();
        if (menu) {
            renderFavoritesBar(menu, addToBasket);
        }

        // Reload orders if on orders screen
        const ordersScreen = document.getElementById('orders-screen');
        if (ordersScreen && ordersScreen.classList.contains('active')) {
            await loadOrders();
        }
    } catch (error) {
        console.error('Failed to create order:', error);
        alert('Failed to create order. Please try again.');
    }
}

/**
 * Open basket drawer
 * Exposed globally for external access
 */
function openBasket() {
    updateBasketUI();
    showBasketDrawer();
}

// Expose openBasket globally
window.openBasket = openBasket;

/**
 * Initialize the application
 */
async function initApp() {
    try {
        // Initialize database
        await initDB();
        console.log('Database initialized');

        // Load or initialize menu
        let menu = await getMenu();
        
        // Validate menu - restore default if empty or corrupted
        const hasValidMenu = menu && menu.length > 0 && menu.every(item => {
            if (typeof isValidMenuItem === 'function') {
                return isValidMenuItem(item);
            }
            return item && item.id && item.name && typeof item.price === 'number';
        });

        if (!hasValidMenu) {
            // Restore default menu if database is empty or corrupted
            if (typeof handleError === 'function' && menu && menu.length > 0) {
                handleError('Menu data corrupted. Restoring default menu.', null);
            }
            await saveMenu(initialMenu);
            menu = initialMenu;
            console.log('Initial menu saved to database');
        }

        console.log('Menu loaded:', menu);

        // Initialize menu UI
        initMenuUI(menu, addToBasket);

        // Setup navigation
        setupNavigation();

        // Setup basket drawer
        setupBasketDrawer();

        // Setup orders screen features
        setupOrdersScreen();

        // Setup settings screen features
        setupSettingsScreen();

        // Load initial orders if on orders screen
        const ordersScreen = document.getElementById('orders-screen');
        if (ordersScreen && ordersScreen.classList.contains('active')) {
            await loadOrders();
        }

        // Load initial settings if on settings screen
        const settingsScreen = document.getElementById('settings-screen');
        if (settingsScreen && settingsScreen.classList.contains('active')) {
            await loadSettings();
        }

        // Attempt auto backup if enabled
        await maybeAutoBackup();

        await cleanupOldOrders();

        await maybeDailyReset();

        if (!localStorage.nextOrderNumber) {
            try {
                const current = await getAllOrders();
                let archivedCount = 0;
                if (typeof getArchive === 'function') {
                    const archived = await getArchive();
                    archivedCount = Array.isArray(archived) ? archived.length : 0;
                }
                localStorage.nextOrderNumber = String((current?.length || 0) + archivedCount + 1);
            } catch (e) {
                localStorage.nextOrderNumber = '1';
            }
        }

        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
}

/**
 * Quick-reorder: Copy order items to basket
 * @param {Object} order - Order object
 */
function quickReorder(order) {
    if (!order.items || order.items.length === 0) {
        return;
    }

    // Get menu to match items
    getMenu().then(menu => {
        order.items.forEach(orderItem => {
            const menuItem = menu.find(m => m.id === orderItem.id);
            if (menuItem) {
                const existingItem = basket.find(b => b.id === menuItem.id);
                if (existingItem) {
                    // Add to existing quantity
                    existingItem.quantity = (existingItem.quantity || 1) + (orderItem.quantity || 1);
                    // Preserve note if order item has one
                    if (orderItem.note && !existingItem.note) {
                        existingItem.note = orderItem.note;
                    }
                } else {
                    // Add new item with quantity and note
                    basket.push({
                        ...menuItem,
                        quantity: orderItem.quantity || 1,
                        note: orderItem.note || ''
                    });
                }
            }
        });

        updateBasketUI();
        showBasketDrawer();
        
        // Show feedback
        const badge = document.getElementById('basket-badge');
        if (badge) {
            badge.classList.add('bounce');
            setTimeout(() => badge.classList.remove('bounce'), 300);
        }
    }).catch(error => {
        console.error('Failed to load menu for quick-reorder:', error);
    });
}

/**
 * Filter orders by search query
 * @param {Array} orders - Orders array
 * @param {string} query - Search query
 * @returns {Array} Filtered orders
 */
function filterOrders(orders, query) {
    if (!query || query.trim() === '') {
        return orders;
    }

    const lowerQuery = query.toLowerCase().trim();

    return orders.filter(order => {
        // Search by order ID
        if (order.id.toLowerCase().includes(lowerQuery)) {
            return true;
        }

        if (order.orderNumber) {
            const padded = String(order.orderNumber).padStart(4, '0');
            if (padded.toLowerCase().includes(lowerQuery)) {
                return true;
            }
        }

        // Search by item names
        if (order.items && order.items.some(item => 
            item.name.toLowerCase().includes(lowerQuery)
        )) {
            return true;
        }

        return false;
    });
}

/**
 * Load and render orders
 */
async function loadOrders() {
    try {
        allOrders = await getAllOrders();
        applySearchFilter();
    } catch (error) {
        console.error('Failed to load orders:', error);
    }
}

/**
 * Apply search filter and render orders
 */
function applySearchFilter() {
    const searchInput = document.getElementById('orders-search');
    const query = searchInput ? searchInput.value : '';
    filteredOrders = filterOrders(allOrders, query);
    renderOrders();
}

/**
 * Render orders list with current state
 */
function renderOrders() {
    renderOrdersList(
        filteredOrders,
        handleOrderStatusChange,
        quickReorder,
        bulkSelectMode,
        handleOrderSelectChange,
        selectedOrders
    );
    updateBulkActionsUI();
}

/**
 * Handle order selection change
 * @param {string} orderId - Order ID
 * @param {boolean} selected - Whether order is selected
 */
function handleOrderSelectChange(orderId, selected) {
    if (selected) {
        selectedOrders.add(orderId);
    } else {
        selectedOrders.delete(orderId);
    }
    updateBulkActionsUI();
    renderOrders();
}

/**
 * Toggle bulk-select mode
 */
function toggleBulkSelectMode() {
    bulkSelectMode = !bulkSelectMode;
    
    if (!bulkSelectMode) {
        selectedOrders.clear();
    }
    
    const toggleBtn = document.getElementById('bulk-select-toggle');
    const bulkActions = document.getElementById('bulk-actions');
    
    if (toggleBtn) {
        toggleBtn.textContent = bulkSelectMode ? 'Cancel' : 'Select';
    }
    
    if (bulkActions) {
        bulkActions.style.display = bulkSelectMode ? 'flex' : 'none';
    }
    
    renderOrders();
}

/**
 * Update bulk actions UI
 */
function updateBulkActionsUI() {
    const selectedCount = document.getElementById('selected-count');
    if (selectedCount) {
        const count = selectedOrders.size;
        selectedCount.textContent = `${count} selected`;
    }
}

/**
 * Bulk mark selected orders as Preparing
 */
async function bulkMarkPreparing() {
    if (selectedOrders.size === 0) {
        alert('No orders selected');
        return;
    }

    try {
        const promises = Array.from(selectedOrders).map(orderId => 
            updateOrderStatus(orderId, 'Preparing')
        );
        
        await Promise.all(promises);
        console.log(`Bulk updated ${selectedOrders.size} orders to Preparing`);
        
        // Clear selection and exit bulk-select mode
        selectedOrders.clear();
        bulkSelectMode = false;
        
        const toggleBtn = document.getElementById('bulk-select-toggle');
        const bulkActions = document.getElementById('bulk-actions');
        
        if (toggleBtn) {
            toggleBtn.textContent = 'Select';
        }
        
        if (bulkActions) {
            bulkActions.style.display = 'none';
        }
        
        // Reload orders
        await loadOrders();
    } catch (error) {
        console.error('Failed to bulk update orders:', error);
        alert('Failed to update orders. Please try again.');
    }
}

/**
 * Handle order status change
 * @param {string} orderId - Order ID
 * @param {string} newStatus - New status value
 */
async function handleOrderStatusChange(orderId, newStatus) {
    try {
        await updateOrderStatus(orderId, newStatus);
        console.log(`Order ${orderId} status updated to ${newStatus}`);
        
        // Reload orders to reflect changes
        await loadOrders();
    } catch (error) {
        console.error('Failed to update order status:', error);
        alert('Failed to update order status. Please try again.');
    }
}

/**
 * Setup bottom navigation
 */
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const screens = document.querySelectorAll('.screen');

    navItems.forEach(navItem => {
        navItem.addEventListener('click', () => {
            const targetScreen = navItem.getAttribute('data-screen');

            // Update active states
            navItems.forEach(item => item.classList.remove('active'));
            screens.forEach(screen => screen.classList.remove('active'));

            navItem.classList.add('active');
            const targetElement = document.getElementById(targetScreen);
            if (targetElement) {
                targetElement.classList.add('active');
                
                // Load orders when switching to orders screen
                if (targetScreen === 'orders-screen') {
                    loadOrders();
                }
                
                // Load settings when switching to settings screen
                if (targetScreen === 'settings-screen') {
                    loadSettings();
                }
            }
        });
    });
}

/**
 * Setup basket drawer event handlers
 */
function setupBasketDrawer() {
    const closeBtn = document.getElementById('basket-close-btn');
    const createOrderBtn = document.getElementById('create-order-btn');
    const drawer = document.getElementById('basket-drawer');
    const overlay = drawer?.querySelector('.basket-drawer-overlay');

    // Close button
    if (closeBtn) {
        closeBtn.addEventListener('click', hideBasketDrawer);
    }

    // Overlay click to close
    if (overlay) {
        overlay.addEventListener('click', hideBasketDrawer);
    }

    // Create order button
    if (createOrderBtn) {
        createOrderBtn.addEventListener('click', createOrder);
    }

    // Make basket badge clickable to open drawer (delegated event)
    document.body.addEventListener('click', (e) => {
        if (e.target.id === 'basket-badge' || e.target.closest('#basket-badge')) {
            e.preventDefault();
            e.stopPropagation();
            openBasket();
        }
    });
}

/**
 * Setup orders screen features (search, bulk-select)
 */
function setupOrdersScreen() {
    // Search input
    const searchInput = document.getElementById('orders-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            applySearchFilter();
        });
    }

    // Bulk-select toggle
    const bulkSelectToggle = document.getElementById('bulk-select-toggle');
    if (bulkSelectToggle) {
        bulkSelectToggle.addEventListener('click', toggleBulkSelectMode);
    }

    // Bulk action button
    const bulkMarkPreparingBtn = document.getElementById('bulk-mark-preparing');
    if (bulkMarkPreparingBtn) {
        bulkMarkPreparingBtn.addEventListener('click', bulkMarkPreparing);
    }
}

/**
 * Open settings screen
 */
function openSettings() {
    const navItems = document.querySelectorAll('.nav-item');
    const screens = document.querySelectorAll('.screen');

    navItems.forEach(item => item.classList.remove('active'));
    screens.forEach(screen => screen.classList.remove('active'));

    const settingsNav = document.querySelector('[data-screen="settings-screen"]');
    const settingsScreen = document.getElementById('settings-screen');

    if (settingsNav) settingsNav.classList.add('active');
    if (settingsScreen) settingsScreen.classList.add('active');

    loadSettings();
}

/**
 * Load and render settings screen
 */
async function loadSettings() {
    try {
        const menu = await getMenu();
        renderMenuAdmin(
            menu,
            document.getElementById('admin-menu-list'),
            handleEditMenuItem,
            handleDeleteMenuItem,
            handleCreateMenuItem,
            handleToggleFavorite
        );
        
        // Load totals with default "today" range
        await renderTotals('today');
    } catch (error) {
        console.error('Failed to load settings:', error);
        showToast('Failed to load menu items', 'error');
    }
}

/**
 * Compute totals for a given range
 * @param {string} range - "today" | "week" | "all"
 * @returns {Promise<Object>} Totals object
 */
async function computeTotals(range) {
    const orders = await getAllOrders();
    
    const now = new Date();
    let filteredOrders = orders;

    if (range === 'today') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filteredOrders = orders.filter(order => {
            const orderDate = new Date(order.timestamp);
            return orderDate >= todayStart;
        });
    } else if (range === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredOrders = orders.filter(order => {
            const orderDate = new Date(order.timestamp);
            return orderDate >= weekAgo;
        });
    }
    // "all" - no filter needed

    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);

    // Aggregate items sold
    const itemsSold = {};
    filteredOrders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                const itemName = item.name || 'Unknown';
                const qty = item.quantity || 1;
                itemsSold[itemName] = (itemsSold[itemName] || 0) + qty;
            });
        }
    });

    // Convert to array and sort
    const topItems = Object.entries(itemsSold)
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

    return {
        totalOrders,
        totalRevenue,
        topItems
    };
}

/**
 * Render totals for a given range
 * @param {string} range - "today" | "week" | "all"
 */
async function renderTotals(range) {
    try {
        const summary = await computeTotals(range);
        updateTotalsPanel(summary);
    } catch (error) {
        console.error('Failed to compute totals:', error);
        showToast('Failed to load totals', 'error');
    }
}

/**
 * Handle JSON export
 */
async function handleExportJSON() {
    try {
        const data = await exportAll();
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        a.download = `pos-backup-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('JSON exported successfully', 'success');
    } catch (error) {
        console.error('Failed to export JSON:', error);
        showToast('Failed to export JSON', 'error');
    }
}

/**
 * Handle CSV export
 */
async function handleExportCSV() {
    try {
        const orders = await getAllOrders();
        
        // CSV header
        const csvRows = ['orderId,timestamp,status,total,items'];
        
        // CSV rows
        orders.forEach(order => {
            const itemsStr = (order.items || [])
                .map(item => `${item.name || 'Unknown'}(x${item.quantity || 1})`)
                .join(';');
            
            const row = [
                order.id || '',
                order.timestamp || '',
                order.status || '',
                order.total || 0,
                itemsStr
            ].join(',');
            
            csvRows.push(row);
        });
        
        const csvStr = csvRows.join('\n');
        const blob = new Blob([csvStr], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        a.download = `orders-${dateStr}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('CSV exported successfully', 'success');
    } catch (error) {
        console.error('Failed to export CSV:', error);
        showToast('Failed to export CSV', 'error');
    }
}

/**
 * Auto backup function - runs daily if enabled
 */
async function maybeAutoBackup() {
    if (localStorage.autobackupEnabled !== 'true') {
        return;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.lastBackup === today) {
        return;
    }

    try {
        const data = await exportAll();
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-${today}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        localStorage.lastBackup = today;
        
        if (typeof showToast === 'function') {
            showToast('Backup saved', 'success');
        } else if (typeof window.showToast === 'function') {
            window.showToast('Backup saved');
        }
    } catch (err) {
        if (typeof handleError === 'function') {
            handleError('Backup failed', err);
        } else {
            console.error('Backup failed:', err);
        }
    }
}

async function handleRestoreDefaultMenu() {
    try {
        await saveMenu(initialMenu);
        showToast('Default menu restored', 'success');
        await refreshMenuUI();
    } catch (error) {
        console.error('Failed to restore menu:', error);
        showToast('Failed to restore default menu', 'error');
    }
}

/**
 * Handle JSON import
 * @param {Event} event - File input change event
 */
async function handleImportJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const json = safeJSONParse(text);
        
        if (!json) {
            throw new Error('Invalid JSON format');
        }

        await importAll(json);
        showToast('Data imported successfully', 'success');
        
        // Refresh UI
        await loadSettings();
        await refreshMenuUI();
        await loadOrders();
        
        // Reset file input
        event.target.value = '';
    } catch (error) {
        console.error('Failed to import JSON:', error);
        if (typeof handleError === 'function') {
            handleError('Failed to import JSON. Please check the file format.', error);
        } else {
            showToast('Failed to import JSON. Please check the file format.', 'error');
        }
        event.target.value = '';
    }
}

/**
 * Setup settings screen features
 */
function setupSettingsScreen() {
    const addItemBtn = document.getElementById('add-item-btn');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', () => {
            handleCreateMenuItem();
        });
    }

    // Totals range buttons
    const rangeButtons = document.querySelectorAll('.range-btn');
    rangeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            rangeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const range = btn.getAttribute('data-range');
            renderTotals(range);
        });
    });

    // Export buttons
    const exportJsonBtn = document.getElementById('export-json-btn');
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', handleExportJSON);
    }

    const exportCsvBtn = document.getElementById('export-csv-btn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', handleExportCSV);
    }

    // Import button
    const importFileInput = document.getElementById('import-file-input');
    if (importFileInput) {
        importFileInput.addEventListener('change', handleImportJSON);
    }

    const closingTimeInput = document.getElementById('closing-time-input');
    if (closingTimeInput) {
        closingTimeInput.value = localStorage.closingTime || '23:00';
        closingTimeInput.addEventListener('change', (e) => {
            localStorage.closingTime = e.target.value || '23:00';
            showToast('Closing time saved', 'success');
        });
    }

    const closeShopNowBtn = document.getElementById('close-shop-now-btn');
    if (closeShopNowBtn) {
        closeShopNowBtn.addEventListener('click', closeShopNow);
    }

    const restoreBtn = document.getElementById('restore-menu-btn');
    if (restoreBtn) {
        restoreBtn.addEventListener('click', handleRestoreDefaultMenu);
    }

    // Auto backup toggle
    const autobackupToggle = document.getElementById('autobackup-toggle');
    if (autobackupToggle) {
        // Load saved preference
        autobackupToggle.checked = localStorage.autobackupEnabled === 'true';
        
        autobackupToggle.addEventListener('change', (e) => {
            localStorage.autobackupEnabled = e.target.checked ? 'true' : 'false';
            if (e.target.checked) {
                showToast('Auto backup enabled', 'success');
            } else {
                showToast('Auto backup disabled', 'success');
            }
        });
    }

    const autoarchiveToggle = document.getElementById('autoarchive-toggle');
    if (autoarchiveToggle) {
        autoarchiveToggle.checked = localStorage.autoArchive === 'true';
        autoarchiveToggle.addEventListener('change', (e) => {
            localStorage.autoArchive = e.target.checked ? 'true' : 'false';
            if (e.target.checked) {
                showToast('Auto-archive enabled', 'success');
            } else {
                showToast('Auto-archive disabled', 'success');
            }
        });
    }
}

/**
 * Handle create menu item
 */
function handleCreateMenuItem() {
    openMenuItemModal(null, async (newItem) => {
        try {
            await createMenuItem(newItem);
            showToast('Item created successfully', 'success');
            await refreshMenuUI();
        } catch (error) {
            console.error('Failed to create item:', error);
            showToast('Failed to create item', 'error');
        }
    });
}

/**
 * Handle edit menu item
 * @param {Object} item - Item to edit
 */
function handleEditMenuItem(item) {
    openMenuItemModal(item, async (updatedItem) => {
        try {
            await editMenuItem(item.id, updatedItem);
            showToast('Item updated successfully', 'success');
            await refreshMenuUI();
        } catch (error) {
            console.error('Failed to update item:', error);
            showToast('Failed to update item', 'error');
        }
    });
}

/**
 * Handle delete menu item
 * @param {string} itemId - Item ID to delete
 * @param {string} itemName - Item name for confirmation
 */
function handleDeleteMenuItem(itemId, itemName) {
    showConfirm(`Are you sure you want to delete "${itemName}"? This will hide it from the menu.`, async () => {
        try {
            await softDeleteMenuItem(itemId);
            showToast('Item deleted successfully', 'success');
            await refreshMenuUI();
        } catch (error) {
            console.error('Failed to delete item:', error);
            showToast('Failed to delete item', 'error');
        }
    });
}

/**
 * Handle toggle favorite
 * @param {string} itemId - Item ID
 */
async function handleToggleFavorite(itemId) {
    try {
        await toggleFavorite(itemId);
        await refreshMenuUI();
    } catch (error) {
        console.error('Failed to toggle favorite:', error);
        showToast('Failed to update favorite', 'error');
    }
}

/**
 * Create new menu item
 * @param {Object} fields - Item fields
 */
async function createMenuItem(fields) {
    const menu = await getMenu();
    const newItem = {
        ...fields,
        id: generateMenuItemId()
    };
    
    menu.push(newItem);
    await saveMenu(menu);
    return newItem;
}

/**
 * Edit existing menu item
 * @param {string} id - Item ID
 * @param {Object} updatedFields - Updated fields
 */
async function editMenuItem(id, updatedFields) {
    const menu = await getMenu();
    const index = menu.findIndex(item => item.id === id);
    
    if (index === -1) {
        throw new Error('Item not found');
    }
    
    menu[index] = {
        ...menu[index],
        ...updatedFields,
        id: id // Ensure ID doesn't change
    };
    
    await saveMenu(menu);
    return menu[index];
}

/**
 * Soft delete menu item (set hidden: true)
 * @param {string} id - Item ID
 */
async function softDeleteMenuItem(id) {
    const menu = await getMenu();
    const index = menu.findIndex(item => item.id === id);
    
    if (index === -1) {
        throw new Error('Item not found');
    }
    
    menu[index] = {
        ...menu[index],
        hidden: true
    };
    
    await saveMenu(menu);
}

/**
 * Toggle favorite status
 * @param {string} id - Item ID
 */
async function toggleFavorite(id) {
    const menu = await getMenu();
    const index = menu.findIndex(item => item.id === id);
    
    if (index === -1) {
        throw new Error('Item not found');
    }
    
    menu[index] = {
        ...menu[index],
        favorite: !menu[index].favorite
    };
    
    await saveMenu(menu);
}

/**
 * Refresh menu UI across all screens
 */
async function refreshMenuUI() {
    try {
        const menu = await getMenu();
        
        // Refresh admin list
        const adminList = document.getElementById('admin-menu-list');
        if (adminList && document.getElementById('settings-screen').classList.contains('active')) {
            renderMenuAdmin(
                menu,
                adminList,
                handleEditMenuItem,
                handleDeleteMenuItem,
                handleCreateMenuItem,
                handleToggleFavorite
            );
        }
        
        // Refresh Take Order screen
        const takeOrderScreen = document.getElementById('take-order-screen');
        if (takeOrderScreen && takeOrderScreen.classList.contains('active')) {
            initMenuUI(menu, addToBasket);
        }
        
        // Refresh favorites bar if visible
        const favoritesBar = document.getElementById('favorites-bar');
        if (favoritesBar && favoritesBar.style.display !== 'none') {
            renderFavoritesBar(menu, addToBasket);
        }
    } catch (error) {
        console.error('Failed to refresh menu UI:', error);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

async function cleanupOldOrders(){
    try {
        if(localStorage.autoArchive !== 'true') return;
        const orders = await getAllOrders();
        const cutoff = Date.now() - 30*24*60*60*1000;
        const keep = [];
        const archive = [];
        for (const o of orders){
            const ts = typeof o.timestamp === 'string' ? new Date(o.timestamp).getTime() : o.timestamp;
            if (ts < cutoff) archive.push(o); else keep.push(o);
        }
        if (archive.length){
            await saveArchive(archive);
        }
        await saveOrders(keep);
        if (archive.length) showToast('Old orders archived','success');
    } catch (error) {
        console.error('Cleanup old orders failed:', error);
    }
}

async function closeShopNow(){
    try {
        const orders = await getAllOrders();
        if (orders && orders.length) {
            await saveArchive(orders);
        }
        await saveOrders([]);
        const today = new Date().toISOString().slice(0,10);
        localStorage.lastResetDate = today;
        showToast('Shop closed. Orders reset','success');
        await loadOrders();
    } catch (error) {
        console.error('Close shop failed:', error);
        showToast('Failed to close shop','error');
    }
}

async function maybeDailyReset(){
    try {
        const closing = localStorage.closingTime || '23:00';
        const parts = closing.split(':');
        const ch = parseInt(parts[0]||'23',10);
        const cm = parseInt(parts[1]||'0',10);
        const now = new Date();
        const todayStr = now.toISOString().slice(0,10);
        const last = localStorage.lastResetDate || '';
        const afterClosing = now.getHours()>ch || (now.getHours()===ch && now.getMinutes()>=cm);
        if (last !== todayStr) {
            await closeShopNow();
        } else if (afterClosing) {
            await closeShopNow();
        }
    } catch (error) {
        console.error('Daily reset check failed:', error);
    }
}
