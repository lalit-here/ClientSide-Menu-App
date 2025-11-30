# POS System - Mobile-First Client-Side Point of Sale

A mobile-first, offline-capable Point of Sale (POS) system built with vanilla JavaScript, IndexedDB, and PWA capabilities.

## Features

- 📱 Mobile-first responsive design
- 🍽️ Menu management with categories and favorites
- 🛒 Shopping basket with quantity controls and notes
- 📦 Order creation and management
- 🔍 Search orders by ID or item name
- ⚡ Quick-reorder from previous orders
- ✅ Bulk order status updates
- 💾 Offline support via PWA and IndexedDB
- 🎨 Modern, touch-optimized UI

## How to Test

### Option 1: Local File (Quick Test)

1. Download/clone the project files
2. Open `index.html` directly in a web browser
3. Note: Service Worker may not work with `file://` protocol in some browsers

### Option 2: Local Server (Recommended)

#### Using Python:
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

#### Using Node.js (http-server):
```bash
npx http-server -p 8000
```

#### Using PHP:
```bash
php -S localhost:8000
```

Then open: `http://localhost:8000`

### Testing on Android Device

1. **Find your computer's IP address:**
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`
   - Example: `192.168.1.100`

2. **Start local server** (use one of the methods above)

3. **On Android device:**
   - Connect to the same Wi-Fi network as your computer
   - Open browser and navigate to: `http://YOUR_IP:8000`
   - Example: `http://192.168.1.100:8000`

4. **For HTTPS (required for PWA on some devices):**
   - Use a tool like [ngrok](https://ngrok.com/) or [localtunnel](https://localtunnel.github.io/www/)
   - Or use a local HTTPS server

## PWA Installation

### Android (Chrome/Edge)

1. Open the app in Chrome or Edge browser
2. Wait for the "Add to Home Screen" prompt, OR
3. Tap the menu (⋮) → "Add to Home Screen" or "Install app"
4. Confirm installation
5. The app icon will appear on your home screen
6. Launch the app - it will open in standalone mode (no browser UI)

### iOS (Safari)

1. Open the app in Safari
2. Tap the Share button (square with arrow)
3. Select "Add to Home Screen"
4. Customize the name if desired
5. Tap "Add"
6. The app icon will appear on your home screen

### Desktop (Chrome/Edge)

1. Look for the install icon in the address bar
2. Click "Install" when prompted
3. The app will open in a standalone window

## Manual Test Checklist

### Step 1: Project Skeleton & Storage ✅
- [ ] App loads without errors
- [ ] IndexedDB initializes successfully (check console)
- [ ] Menu items are stored in IndexedDB
- [ ] Can retrieve menu from storage
- [ ] Storage functions work (saveMenu, getMenu, saveOrder, getAllOrders, etc.)

### Step 2: Mobile Layout ✅
- [ ] App displays correctly on mobile viewport
- [ ] Bottom navigation works (Take Order / Orders)
- [ ] Screens switch correctly
- [ ] Safe area insets work on notched devices
- [ ] Large tap targets (minimum 44px)
- [ ] Responsive on tablet sizes

### Step 3: Menu UI & Add to Basket ✅
- [ ] Menu items display in grid (2 columns mobile, 3 columns tablet)
- [ ] Category chips filter menu correctly
- [ ] Favorites bar appears after items are used
- [ ] Tapping menu item adds to basket
- [ ] Basket badge updates with item count
- [ ] Badge shows correct number
- [ ] Badge is clickable to open basket

### Step 4: Basket Drawer & Order Creation ✅
- [ ] Basket drawer opens when badge is clicked
- [ ] Basket shows all items with quantities
- [ ] Quantity controls (+/-) work correctly
- [ ] Per-item notes can be added/edited
- [ ] Total amount calculates correctly
- [ ] "Create Order" button creates order
- [ ] Order is saved to IndexedDB
- [ ] Basket clears after order creation
- [ ] Drawer closes after order creation
- [ ] Usage counters increment for favorites

### Step 5: Orders List & Status Update ✅
- [ ] Orders screen displays all orders
- [ ] Orders sorted by newest first
- [ ] Order cards show: ID, time (relative & absolute), items summary, total, status
- [ ] Status badges have correct colors
- [ ] Status segments allow status change
- [ ] Status changes persist to IndexedDB
- [ ] Status changes remain after page reload
- [ ] Orders refresh when navigating to orders screen

### Step 7: PWA Basics ✅
- [ ] Service Worker registers successfully (check console)
- [ ] Static assets are cached on first load
- [ ] App works offline (after first load)
- [ ] UI loads from cache when offline
- [ ] IndexedDB operations work offline
- [ ] Manifest.json is valid
- [ ] App can be installed as PWA
- [ ] App opens in standalone mode when installed

### Step 8: Usability Refinements ✅
- [ ] **Quick-reorder:**
  - [ ] Long-press (500ms) on order card copies items to basket
  - [ ] Quantities are preserved
  - [ ] Notes are preserved
  - [ ] Basket drawer opens automatically
  - [ ] Visual feedback (badge animation)
  
- [ ] **Search:**
  - [ ] Search bar appears in orders header
  - [ ] Real-time filtering as you type
  - [ ] Searches by order ID (last 6 digits)
  - [ ] Searches by item names
  - [ ] Case-insensitive search
  - [ ] Empty state shows when no results
  
- [ ] **Bulk-select:**
  - [ ] "Select" button toggles bulk-select mode
  - [ ] Checkboxes appear on order cards
  - [ ] Clicking card toggles selection
  - [ ] Selected count updates
  - [ ] "Mark as Preparing" button appears
  - [ ] Bulk action updates all selected orders
  - [ ] Status changes persist
  - [ ] Bulk-select mode exits after action
  - [ ] Selected orders are highlighted

## Known Limitations

1. **PWA Icons Missing**: The manifest references `icon-192.png` and `icon-512.png` which are not included. The browser will use default icons. To add custom PWA icons:
   - Create 192x192 and 512x512 PNG images
   - Place them in the root directory
   - Or update manifest.json to point to existing icons
   - Note: UI icons are provided via inline SVG sprite (see `assets/icons.svg`)

2. **Service Worker Scope**: Service Worker may not work with `file://` protocol. Use a local server for full PWA functionality.

3. **HTTPS Requirement**: Some PWA features (especially on iOS) require HTTPS. Use ngrok or similar for testing on real devices.

4. **No Backend**: This is a client-side only application. All data is stored locally in IndexedDB. There's no server sync or backup.

5. **Browser Compatibility**: 
   - IndexedDB: Supported in all modern browsers
   - Service Workers: Not supported in IE11
   - PWA Install: Varies by browser and OS

6. **Data Persistence**: Data is stored in browser's IndexedDB. Clearing browser data will delete all orders and menu customizations.

7. **No Authentication**: No user accounts or authentication system.

8. **No Print/Export**: Orders cannot be printed or exported (though exportAll() function exists in storage.js for programmatic access).

9. **Menu Management**: Initial menu is hardcoded. No UI for adding/editing menu items (though storage functions support it).

10. **Order Status Flow**: Status can be changed to any status, not enforcing a workflow (e.g., can skip from "Yet to prepare" to "Completed").

## File Structure

```
App1/
├── index.html          # Main HTML file
├── manifest.json       # PWA manifest
├── sw.js              # Service Worker
├── README.md          # This file
├── assets/
│   └── icons.svg      # SVG icon sprite (inline in HTML)
├── css/
│   └── style.css      # All styles
└── js/
    ├── menu.js        # Initial menu data
    ├── storage.js      # IndexedDB wrapper
    ├── helpers.js      # Validation and utility helpers
    ├── ui.js          # UI rendering functions
    └── app.js         # Main application logic
```

## Browser Support

- ✅ Chrome/Edge (Android & Desktop)
- ✅ Firefox (Android & Desktop)
- ✅ Safari (iOS & macOS)
- ✅ Samsung Internet
- ⚠️ IE11 (Service Workers not supported)

## Menu Management (Admin)

The Settings screen provides full menu management capabilities. To access it, tap the "Settings" tab in the bottom navigation. From here, you can:

- **Add Items**: Tap "Add Item" to create new menu items with name, price, category, and favorite status
- **Edit Items**: Tap the edit icon (pencil) on any item to modify its details
- **Delete Items**: Tap the delete icon (trash) to soft-delete items (they're hidden from the menu but remain in the database)
- **Toggle Favorites**: Tap the star icon to mark/unmark items as favorites

All changes are saved immediately to IndexedDB and reflected in the Take Order screen without requiring a page reload. The menu management interface is fully touch-optimized and accessible, with large tap targets and keyboard navigation support.

## Development Notes

- All data is stored in IndexedDB (`POS_DB`)
- Service Worker caches static assets for offline use
- Menu usage tracked in localStorage for favorites
- Orders stored with full item details and timestamps
- Icons provided via inline SVG sprite (no external dependencies)
- Icons use `<use href="#icon-name">` pattern for file:// compatibility
- Menu items support soft-delete via `hidden` property

## Icon Usage

Icons are provided via an inline SVG sprite. To use an icon in HTML:

```html
<svg class="icon" aria-hidden="true">
  <use href="#icon-basket"></use>
</svg>
<span>Basket</span>
```

Available icons: `icon-menu`, `icon-basket`, `icon-orders`, `icon-star`, `icon-edit`, `icon-delete`, `icon-export`, `icon-import`, `icon-settings`, `icon-back`

## License

This is a demonstration project. Use as needed.

