/**
 * Validation helpers for menu items
 */

/**
 * Validate menu item data
 * @param {Object} item - Menu item to validate
 * @param {boolean} isEdit - Whether this is an edit (requires id)
 * @returns {{ok: boolean, errors: string[]}}
 */
function validateMenuItem(item, isEdit = false) {
    const errors = [];

    // ID required for edits
    if (isEdit && (!item.id || typeof item.id !== 'string' || item.id.trim() === '')) {
        errors.push('Item ID is required');
    }

    // Name validation
    if (!item.name || typeof item.name !== 'string' || item.name.trim() === '') {
        errors.push('Item name is required');
    }

    // Price validation
    const price = parseFloat(item.price);
    if (isNaN(price) || !isFinite(price) || price < 0) {
        errors.push('Price must be a valid number greater than or equal to 0');
    }

    // Category validation
    const category = (item.category || '').trim();
    if (category === '') {
        errors.push('Category is required');
    }

    return {
        ok: errors.length === 0,
        errors
    };
}

/**
 * Sanitize and normalize menu item data
 * @param {Object} item - Menu item to sanitize
 * @returns {Object} Sanitized item
 */
function sanitizeMenuItem(item) {
    return {
        id: item.id ? String(item.id).trim() : '',
        name: String(item.name || '').trim(),
        price: Math.round(parseFloat(item.price || 0) * 100) / 100, // Round to 2 decimals
        category: String(item.category || 'Uncategorized').trim() || 'Uncategorized',
        favorite: Boolean(item.favorite),
        hidden: Boolean(item.hidden)
    };
}

/**
 * Generate collision-safe unique ID
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} Unique ID
 */
function generateId(prefix = '') {
    return prefix +
        Date.now().toString(36) + '-' +
        Math.random().toString(36).slice(2, 7);
}

/**
 * Generate unique ID for new menu items
 * @returns {string} Unique ID
 */
function generateMenuItemId() {
    return generateId('item-');
}

/**
 * Handle errors with logging and user notification
 * @param {string} msg - Error message to show user
 * @param {Error|null} err - Error object (optional)
 */
function handleError(msg, err) {
    console.error("[APP ERROR]", msg, err);
    if (typeof showToast === 'function') {
        showToast(msg, 'error');
    } else if (typeof window.showToast === 'function') {
        window.showToast(msg);
    }
}

/**
 * Safely parse JSON string
 * @param {string} str - JSON string to parse
 * @returns {Object|null} Parsed object or null on error
 */
function safeJSONParse(str) {
    try {
        return JSON.parse(str);
    } catch (err) {
        console.error("[JSON Parse Error]", err);
        return null;
    }
}

/**
 * Validate menu item structure
 * @param {Object} item - Menu item to validate
 * @returns {boolean} True if valid
 */
function isValidMenuItem(item) {
    return item &&
           typeof item === 'object' &&
           item.id &&
           (typeof item.id === 'string' || typeof item.id === 'number') &&
           item.name &&
           typeof item.name === 'string' &&
           typeof item.price === 'number' &&
           !isNaN(item.price) &&
           isFinite(item.price);
}

/**
 * Validate order structure
 * @param {Object} order - Order to validate
 * @returns {boolean} True if valid
 */
function isValidOrder(order) {
    return order &&
           typeof order === 'object' &&
           order.id &&
           typeof order.id === 'string' &&
           order.timestamp &&
           typeof order.items === 'object' &&
           Array.isArray(order.items) &&
           typeof order.total === 'number' &&
           !isNaN(order.total) &&
           isFinite(order.total);
}

