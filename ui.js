/**
 * UI rendering functions for POS system
 * Handles menu display, category filtering, and item cards
 */

/**
 * Get item usage count from localStorage
 * @param {number} itemId - Menu item ID
 * @returns {number} Usage count
 */
function getItemUsageCount(itemId) {
    const key = `item_usage_${itemId}`;
    return parseInt(localStorage.getItem(key) || '0', 10);
}

/**
 * Increment item usage count in localStorage
 * @param {number} itemId - Menu item ID
 */
function incrementItemUsage(itemId) {
    const key = `item_usage_${itemId}`;
    const current = getItemUsageCount(itemId);
    localStorage.setItem(key, (current + 1).toString());
}

/**
 * Get most used items (top N by usage count)
 * @param {Array} menu - Menu items array
 * @param {number} limit - Number of items to return
 * @returns {Array} Sorted array of most used items
 */
function getMostUsedItems(menu, limit = 6) {
    return menu
        .map(item => ({
            ...item,
            usageCount: getItemUsageCount(item.id)
        }))
        .sort((a, b) => b.usageCount - a.usageCount)
        .filter(item => item.usageCount > 0)
        .slice(0, limit);
}

/**
 * Get all unique categories from menu
 * @param {Array} menu - Menu items array
 * @returns {Array} Array of unique category names
 */
function getCategories(menu) {
    const categories = [...new Set(menu.map(item => item.category))];
    return categories.sort();
}

/**
 * Render category chips
 * @param {Array} categories - Array of category names
 * @param {string} selectedCategory - Currently selected category
 * @param {Function} onCategorySelect - Callback when category is selected
 */
function renderCategoryChips(categories, selectedCategory, onCategorySelect) {
    const container = document.getElementById('category-chips');
    if (!container) return;

    container.innerHTML = '';

    // All category chip
    const allChip = document.createElement('button');
    allChip.className = `category-chip ${selectedCategory === 'all' ? 'active' : ''}`;
    allChip.textContent = 'All';
    allChip.addEventListener('click', () => onCategorySelect('all'));
    container.appendChild(allChip);

    // Category chips
    categories.forEach(category => {
        const chip = document.createElement('button');
        chip.className = `category-chip ${selectedCategory === category ? 'active' : ''}`;
        chip.textContent = category;
        chip.addEventListener('click', () => onCategorySelect(category));
        container.appendChild(chip);
    });
}

/**
 * Render menu item card
 * @param {Object} item - Menu item object
 * @param {Function} onItemClick - Callback when item is clicked
 * @returns {HTMLElement} Menu item card element
 */
function renderMenuItemCard(item, onItemClick) {
    const card = document.createElement('div');
    card.className = 'menu-item-card';
    card.setAttribute('data-item-id', item.id);

    const usageCount = getItemUsageCount(item.id);
    const isFavorite = item.favorite || usageCount > 5;

    card.innerHTML = `
        ${isFavorite ? '<span class="favorite-badge"><svg class="icon" aria-hidden="true"><use href="#icon-star"></use></svg></span>' : ''}
        <div class="menu-item-name">${item.name}</div>
        <div class="menu-item-price">₹${item.price}</div>
    `;

    card.addEventListener('click', () => {
        onItemClick(item);
        incrementItemUsage(item.id);
    });

    return card;
}

/**
 * Render menu grid
 * @param {Array} menu - Filtered menu items array
 * @param {Function} onItemClick - Callback when item is clicked
 */
function renderMenuGrid(menu, onItemClick) {
    const container = document.getElementById('menu-grid');
    if (!container) return;

    container.innerHTML = '';

    // Filter out hidden items
    const visibleMenu = menu.filter(item => !item.hidden);

    if (visibleMenu.length === 0) {
        container.innerHTML = '<div class="empty-state">No items found</div>';
        return;
    }

    visibleMenu.forEach(item => {
        const card = renderMenuItemCard(item, onItemClick);
        container.appendChild(card);
    });
}

/**
 * Render favorites/most-used bar
 * @param {Array} menu - Full menu items array
 * @param {Function} onItemClick - Callback when item is clicked
 */
function renderFavoritesBar(menu, onItemClick) {
    const container = document.getElementById('favorites-bar');
    if (!container) return;

    const mostUsed = getMostUsedItems(menu, 6);

    if (mostUsed.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    container.innerHTML = '';

    mostUsed.forEach(item => {
        const favItem = document.createElement('button');
        favItem.className = 'favorite-item';
        favItem.innerHTML = `
            <span class="favorite-item-name">${item.name}</span>
            <span class="favorite-item-price">₹${item.price}</span>
        `;
        favItem.addEventListener('click', () => {
            onItemClick(item);
            incrementItemUsage(item.id);
        });
        container.appendChild(favItem);
    });
}

/**
 * Update basket badge count
 * @param {number} count - Number of items in basket
 */
function updateBasketBadge(count) {
    let badge = document.getElementById('basket-badge');
    
    if (count === 0) {
        if (badge) {
            badge.style.display = 'none';
        }
        return;
    }

    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'basket-badge';
        badge.className = 'basket-badge';
        document.body.appendChild(badge);
    }

    badge.textContent = count;
    badge.style.display = 'flex';
    
    // Animate badge update
    badge.classList.add('bounce');
    setTimeout(() => {
        badge.classList.remove('bounce');
    }, 300);
}

/**
 * Render basket drawer
 * @param {Array} basket - Basket items array
 * @param {Function} onQuantityChange - Callback when quantity changes (itemId, newQuantity)
 * @param {Function} onRemoveItem - Callback when item is removed (itemId)
 * @param {Function} onNoteChange - Callback when note changes (itemId, note)
 */
function renderBasketDrawer(basket, onQuantityChange, onRemoveItem, onNoteChange) {
    const container = document.getElementById('basket-items-container');
    const totalElement = document.getElementById('basket-total');
    
    if (!container || !totalElement) return;

    container.innerHTML = '';

    if (basket.length === 0) {
        container.innerHTML = '<div class="basket-empty">Your basket is empty</div>';
        totalElement.textContent = '₹0';
        return;
    }

    let total = 0;

    basket.forEach(item => {
        const quantity = item.quantity || 1;
        const itemTotal = item.price * quantity;
        total += itemTotal;

        const basketItem = document.createElement('div');
        basketItem.className = 'basket-item';
        basketItem.setAttribute('data-item-id', item.id);

        basketItem.innerHTML = `
            <div class="basket-item-info">
                <div class="basket-item-name">${item.name}</div>
                <div class="basket-item-price">₹${item.price} × ${quantity} = ₹${itemTotal}</div>
                <textarea 
                    class="basket-item-note" 
                    placeholder="Add note (optional)"
                    data-item-id="${item.id}"
                >${item.note || ''}</textarea>
            </div>
            <div class="basket-item-controls">
                <button class="quantity-btn minus" data-item-id="${item.id}">−</button>
                <span class="quantity-display">${quantity}</span>
                <button class="quantity-btn plus" data-item-id="${item.id}">+</button>
                <button class="remove-btn" data-item-id="${item.id}">×</button>
            </div>
        `;

        // Quantity controls
        const minusBtn = basketItem.querySelector('.minus');
        const plusBtn = basketItem.querySelector('.plus');
        const removeBtn = basketItem.querySelector('.remove-btn');
        const noteInput = basketItem.querySelector('.basket-item-note');

        minusBtn.addEventListener('click', () => {
            const newQuantity = Math.max(1, quantity - 1);
            onQuantityChange(item.id, newQuantity);
        });

        plusBtn.addEventListener('click', () => {
            onQuantityChange(item.id, quantity + 1);
        });

        removeBtn.addEventListener('click', () => {
            onRemoveItem(item.id);
        });

        noteInput.addEventListener('input', (e) => {
            onNoteChange(item.id, e.target.value);
        });

        container.appendChild(basketItem);
    });

    totalElement.textContent = `₹${total}`;
}

/**
 * Show basket drawer
 */
function showBasketDrawer() {
    const drawer = document.getElementById('basket-drawer');
    if (drawer) {
        drawer.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Hide basket drawer
 */
function hideBasketDrawer() {
    const drawer = document.getElementById('basket-drawer');
    if (drawer) {
        drawer.classList.remove('open');
        document.body.style.overflow = '';
    }
}

/**
 * Format relative time (e.g., "2 minutes ago", "1 hour ago")
 * @param {string} timestamp - ISO timestamp string
 * @returns {string} Relative time string
 */
function formatRelativeTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return formatAbsoluteTime(timestamp);
}

/**
 * Format absolute time (e.g., "Jan 15, 2024 3:45 PM")
 * @param {string} timestamp - ISO timestamp string
 * @returns {string} Formatted time string
 */
function formatAbsoluteTime(timestamp) {
    const time = new Date(timestamp);
    return time.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Get status badge color
 * @param {string} status - Order status
 * @returns {string} CSS color class
 */
function getStatusColor(status) {
    const statusColors = {
        'Yet to prepare': 'status-pending',
        'Preparing': 'status-preparing',
        'Prepared': 'status-ready',
        'Satisfied': 'status-completed',
        'Ready': 'status-ready',
        'Completed': 'status-completed'
    };
    return statusColors[status] || 'status-pending';
}

/**
 * Get items summary text
 * @param {Array} items - Order items array
 * @returns {string} Summary text
 */
function getItemsSummary(items) {
    if (!items || items.length === 0) return 'No items';
    
    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    if (items.length === 1) {
        return `${items[0].name}${items[0].quantity > 1 ? ` (×${items[0].quantity})` : ''}`;
    }
    return `${items.length} items (${totalItems} total)`;
}

/**
 * Render order card
 * @param {Object} order - Order object
 * @param {Function} onStatusChange - Callback when status changes (orderId, newStatus)
 * @param {Function} onQuickReorder - Callback when order is long-pressed (order)
 * @param {boolean} bulkSelectMode - Whether bulk-select mode is active
 * @param {Function} onSelectChange - Callback when checkbox is toggled (orderId, selected)
 * @param {boolean} isSelected - Whether this order is selected
 * @returns {HTMLElement} Order card element
 */
function renderOrderCard(order, onStatusChange, onQuickReorder, bulkSelectMode = false, onSelectChange = null, isSelected = false) {
    const card = document.createElement('div');
    card.className = `order-card ${bulkSelectMode ? 'bulk-select-mode' : ''} ${isSelected ? 'selected' : ''}`;
    card.setAttribute('data-order-id', order.id);

    const statusColor = getStatusColor(order.status);
    const itemsSummary = getItemsSummary(order.items);
    const relativeTime = formatRelativeTime(order.timestamp);
    const absoluteTime = formatAbsoluteTime(order.timestamp);

    // Available statuses
    const statuses = ['Yet to prepare', 'Preparing', 'Prepared', 'Satisfied'];

    card.innerHTML = `
        ${bulkSelectMode ? `
            <div class="order-checkbox-container">
                <input type="checkbox" class="order-checkbox" data-order-id="${order.id}" ${isSelected ? 'checked' : ''}>
            </div>
        ` : ''}
        <div class="order-card-content">
            <div class="order-card-header">
                <div class="order-id">Order ${order.orderNumber ? String(order.orderNumber).padStart(4,'0') : order.id.slice(-6)}</div>
                <span class="status-badge ${statusColor}">${order.status}</span>
            </div>
            <div class="order-time">
                <span class="relative-time">${relativeTime}</span>
                <span class="absolute-time" title="${absoluteTime}">${absoluteTime}</span>
            </div>
            <div class="order-items-summary">${itemsSummary}</div>
            <div class="order-total">Total: ₹${order.total}</div>
            ${!bulkSelectMode ? `
                <div class="order-status-control">
                    <div class="status-segments">
                        ${statuses.map(status => `
                            <button 
                                class="status-segment ${status === order.status ? 'active' : ''} ${getStatusColor(status)}"
                                data-status="${status}"
                            >
                                ${status}
                            </button>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    // Add status change handlers (only if not in bulk-select mode)
    if (!bulkSelectMode) {
        const statusButtons = card.querySelectorAll('.status-segment');
        const flow = ['Yet to prepare','Preparing','Prepared','Satisfied'];
        const canMoveForward = (curr, next) => flow.indexOf(next) === flow.indexOf(curr) + 1;
        const canMoveBackward = (curr, next) => flow.indexOf(next) === flow.indexOf(curr) - 1;
        statusButtons.forEach(btn => {
            let longPressTimer = null;
            let longPressActivated = false;
            const LONG_PRESS_DURATION = 500;

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (longPressActivated) {
                    longPressActivated = false;
                    return;
                }
                const newStatus = btn.getAttribute('data-status');
                if (newStatus === order.status) return;
                if (canMoveForward(order.status, newStatus)) {
                    onStatusChange(order.id, newStatus);
                } else {
                    showToast('Invalid status transition', 'error');
                }
            });

            const handleStart = (e) => {
                longPressTimer = setTimeout(() => {
                    const newStatus = btn.getAttribute('data-status');
                    if (newStatus !== order.status && canMoveBackward(order.status, newStatus)) {
                        longPressActivated = true;
                        showConfirm('Move backward?', () => {
                            onStatusChange(order.id, newStatus);
                        });
                    } else {
                        showToast('Invalid status transition', 'error');
                    }
                    e.preventDefault();
                    e.stopPropagation();
                }, LONG_PRESS_DURATION);
            };

            const handleEnd = () => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            };

            btn.addEventListener('touchstart', handleStart, { passive: false });
            btn.addEventListener('touchend', handleEnd);
            btn.addEventListener('touchcancel', handleEnd);
            btn.addEventListener('mousedown', handleStart);
            btn.addEventListener('mouseup', handleEnd);
            btn.addEventListener('mouseleave', handleEnd);
        });
    }

    // Add checkbox handler
    if (bulkSelectMode && onSelectChange) {
        const checkbox = card.querySelector('.order-checkbox');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                onSelectChange(order.id, checkbox.checked);
            });
        }

        // Make entire card clickable to toggle selection
        card.addEventListener('click', (e) => {
            // Don't toggle if clicking on checkbox directly
            if (e.target !== checkbox && !checkbox.contains(e.target)) {
                checkbox.checked = !checkbox.checked;
                onSelectChange(order.id, checkbox.checked);
            }
        });
    }

    // Add long-press handler for quick-reorder
    if (onQuickReorder && !bulkSelectMode) {
        let longPressTimer = null;
        const LONG_PRESS_DURATION = 500; // 500ms

        const handleStart = (e) => {
            if (e.target.closest('.status-segment')) return;
            longPressTimer = setTimeout(() => {
                onQuickReorder(order);
                // Prevent default actions
                e.preventDefault();
                e.stopPropagation();
            }, LONG_PRESS_DURATION);
        };

        const handleEnd = () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        };

        card.addEventListener('touchstart', handleStart, { passive: false });
        card.addEventListener('touchend', handleEnd);
        card.addEventListener('touchcancel', handleEnd);
        card.addEventListener('mousedown', handleStart);
        card.addEventListener('mouseup', handleEnd);
        card.addEventListener('mouseleave', handleEnd);
    }

    return card;
}

/**
 * Render orders list
 * @param {Array} orders - Orders array
 * @param {Function} onStatusChange - Callback when status changes (orderId, newStatus)
 * @param {Function} onQuickReorder - Callback when order is long-pressed (order)
 * @param {boolean} bulkSelectMode - Whether bulk-select mode is active
 * @param {Function} onSelectChange - Callback when checkbox is toggled (orderId, selected)
 * @param {Set} selectedOrders - Set of selected order IDs
 */
function renderOrdersList(orders, onStatusChange, onQuickReorder = null, bulkSelectMode = false, onSelectChange = null, selectedOrders = new Set()) {
    const container = document.getElementById('orders-list');
    if (!container) return;

    container.innerHTML = '';

    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="orders-empty">No orders yet</div>';
        return;
    }

    // Sort orders by timestamp (newest first)
    const sortedOrders = [...orders].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });

    sortedOrders.forEach(order => {
        const isSelected = selectedOrders.has(order.id);
        const card = renderOrderCard(order, onStatusChange, onQuickReorder, bulkSelectMode, onSelectChange, isSelected);
        container.appendChild(card);
    });
}

/**
 * Initialize menu UI
 * @param {Array} menu - Menu items array
 * @param {Function} onItemClick - Callback when item is clicked
 */
function initMenuUI(menu, onItemClick) {
    const categories = getCategories(menu);
    let selectedCategory = 'all';

    // Category selection handler
    const handleCategorySelect = (category) => {
        selectedCategory = category;
        renderCategoryChips(categories, selectedCategory, handleCategorySelect);
        
        const filtered = category === 'all' 
            ? menu 
            : menu.filter(item => item.category === category);
        renderMenuGrid(filtered, onItemClick);
    };

    // Render category chips
    renderCategoryChips(categories, selectedCategory, handleCategorySelect);

    // Render favorites bar
    renderFavoritesBar(menu, onItemClick);

    // Render initial menu grid
    renderMenuGrid(menu, onItemClick);
}

/**
 * Render menu admin list
 * @param {Array} menuArray - Full menu array (including hidden items)
 * @param {HTMLElement} containerEl - Container element to render into
 * @param {Function} onEdit - Callback when edit is clicked (item)
 * @param {Function} onDelete - Callback when delete is clicked (itemId)
 * @param {Function} onCreate - Callback when create button is clicked
 * @param {Function} onToggleFavorite - Callback when favorite is toggled (itemId)
 */
function renderMenuAdmin(menuArray, containerEl, onEdit, onDelete, onCreate, onToggleFavorite) {
    if (!containerEl) return;

    containerEl.innerHTML = '';

    if (!menuArray || menuArray.length === 0) {
        containerEl.innerHTML = '<div class="admin-empty">No menu items. Click "Add Item" to create one.</div>';
        return;
    }

    // Sort by category, then name
    const sorted = [...menuArray].sort((a, b) => {
        if (a.category !== b.category) {
            return (a.category || '').localeCompare(b.category || '');
        }
        return (a.name || '').localeCompare(b.name || '');
    });

    sorted.forEach(item => {
        const row = document.createElement('div');
        row.className = `admin-menu-row ${item.hidden ? 'hidden-item' : ''}`;
        row.setAttribute('data-item-id', item.id);

        row.innerHTML = `
            <div class="admin-row-content">
                <div class="admin-row-main">
                    <div class="admin-row-name">${item.name || 'Unnamed'}</div>
                    <div class="admin-row-details">
                        <span class="admin-row-category">${item.category || 'Uncategorized'}</span>
                        <span class="admin-row-price">₹${(item.price || 0).toFixed(2)}</span>
                    </div>
                </div>
                <div class="admin-row-actions">
                    <button class="admin-action-btn favorite-btn ${item.favorite ? 'active' : ''}" 
                            data-item-id="${item.id}" 
                            aria-label="${item.favorite ? 'Remove from favorites' : 'Add to favorites'}">
                        <svg class="icon" aria-hidden="true"><use href="#icon-star"></use></svg>
                    </button>
                    <button class="admin-action-btn edit-btn" 
                            data-item-id="${item.id}" 
                            aria-label="Edit ${item.name}">
                        <svg class="icon" aria-hidden="true"><use href="#icon-edit"></use></svg>
                    </button>
                    <button class="admin-action-btn delete-btn" 
                            data-item-id="${item.id}" 
                            aria-label="Delete ${item.name}">
                        <svg class="icon" aria-hidden="true"><use href="#icon-delete"></use></svg>
                    </button>
                </div>
            </div>
        `;

        // Event handlers
        const favoriteBtn = row.querySelector('.favorite-btn');
        const editBtn = row.querySelector('.edit-btn');
        const deleteBtn = row.querySelector('.delete-btn');

        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onToggleFavorite(item.id);
        });

        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onEdit(item);
        });

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onDelete(item.id, item.name);
        });

        containerEl.appendChild(row);
    });
}

/**
 * Open menu item modal for create/edit
 * @param {Object|null} item - Item to edit (null for create)
 * @param {Function} onSave - Callback when save is clicked (updatedItem)
 */
function openMenuItemModal(item, onSave) {
    const isEdit = item !== null;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'modal-title');
    modal.setAttribute('aria-modal', 'true');

    // Get existing categories for dropdown
    getMenu().then(menu => {
        const categories = [...new Set(menu.map(m => m.category).filter(c => c))].sort();
        const currentCategory = item ? item.category : (categories[0] || 'Uncategorized');

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="modal-title">${isEdit ? 'Edit Item' : 'Add Item'}</h2>
                    <button class="modal-close" aria-label="Close modal">
                        <svg class="icon" aria-hidden="true"><use href="#icon-back"></use></svg>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="menu-item-form">
                        <div class="form-group">
                            <label for="item-name">Name *</label>
                            <input type="text" id="item-name" name="name" required 
                                   value="${item ? (item.name || '') : ''}" 
                                   aria-required="true">
                        </div>
                        <div class="form-group">
                            <label for="item-price">Price (₹) *</label>
                            <input type="number" id="item-price" name="price" step="0.01" min="0" required 
                                   value="${item ? (item.price || 0) : ''}" 
                                   aria-required="true">
                        </div>
                        <div class="form-group">
                            <label for="item-category">Category *</label>
                            <input type="text" id="item-category" name="category" 
                                   list="category-list" required 
                                   value="${currentCategory}" 
                                   aria-required="true">
                            <datalist id="category-list">
                                ${categories.map(cat => `<option value="${cat}">`).join('')}
                            </datalist>
                        </div>
                        <div class="form-group checkbox-group">
                            <label>
                                <input type="checkbox" id="item-favorite" name="favorite" 
                                       ${item && item.favorite ? 'checked' : ''}>
                                <span>Mark as favorite</span>
                            </label>
                        </div>
                        <div id="form-errors" class="form-errors" role="alert"></div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary modal-cancel">Cancel</button>
                    <button type="button" class="btn-primary modal-save">${isEdit ? 'Save' : 'Create'}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Focus trap
        const focusableElements = modal.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const trapFocus = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        modal.addEventListener('keydown', trapFocus);

        // Close handlers
        const closeModal = () => {
            modal.removeEventListener('keydown', trapFocus);
            document.body.removeChild(modal);
            document.body.style.overflow = '';
        };

        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const overlay = modal;

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Save handler
        const saveBtn = modal.querySelector('.modal-save');
        const form = modal.querySelector('#menu-item-form');
        const errorsDiv = modal.querySelector('#form-errors');

        saveBtn.addEventListener('click', () => {
            const formData = new FormData(form);
            const formItem = {
                id: item ? item.id : null,
                name: formData.get('name'),
                price: formData.get('price'),
                category: formData.get('category'),
                favorite: formData.get('favorite') === 'on',
                hidden: item ? (item.hidden || false) : false
            };

            const sanitized = sanitizeMenuItem(formItem);
            const validation = validateMenuItem(sanitized, isEdit);

            if (!validation.ok) {
                errorsDiv.innerHTML = validation.errors.map(err => `<div>${err}</div>`).join('');
                errorsDiv.style.display = 'block';
                return;
            }

            errorsDiv.style.display = 'none';
            closeModal();
            document.removeEventListener('keydown', escHandler);
            onSave(sanitized);
        });

        // Focus first input
        setTimeout(() => {
            const nameInput = modal.querySelector('#item-name');
            if (nameInput) nameInput.focus();
        }, 100);
    });
}

/**
 * Show confirmation modal
 * @param {string} message - Confirmation message
 * @param {Function} onConfirm - Callback when confirmed
 */
function showConfirm(message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'confirm-title');
    modal.setAttribute('aria-modal', 'true');

    modal.innerHTML = `
        <div class="modal-content modal-content-small">
            <div class="modal-header">
                <h2 id="confirm-title">Confirm</h2>
            </div>
            <div class="modal-body">
                <p>${message}</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary modal-cancel">Cancel</button>
                <button type="button" class="btn-danger modal-confirm">Confirm</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const closeModal = () => {
        document.body.removeChild(modal);
        document.body.style.overflow = '';
    };

    const cancelBtn = modal.querySelector('.modal-cancel');
    const confirmBtn = modal.querySelector('.modal-confirm');
    const overlay = modal;

    cancelBtn.addEventListener('click', closeModal);
    confirmBtn.addEventListener('click', () => {
        closeModal();
        onConfirm();
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // ESC key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    // Focus confirm button
    setTimeout(() => confirmBtn.focus(), 100);
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type: 'success' or 'error'
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

/**
 * Update totals panel with summary data
 * @param {Object} summary - Totals summary object from computeTotals
 */
function updateTotalsPanel(summary) {
    const panel = document.getElementById('totals-panel');
    if (!panel) return;

    const topItemsList = summary.topItems.length > 0
        ? summary.topItems.map(item => `${item.name}: ${item.qty}`).join(', ')
        : 'No items sold';

    panel.innerHTML = `
        <div class="totals-row">
            <span class="label">Total Orders:</span>
            <span class="value">${summary.totalOrders}</span>
        </div>
        <div class="totals-row">
            <span class="label">Total Revenue:</span>
            <span class="value">₹${summary.totalRevenue.toFixed(2)}</span>
        </div>
        <div class="totals-row">
            <span class="label">Top 5 Items:</span>
            <span class="value">${topItemsList}</span>
        </div>
    `;
}

