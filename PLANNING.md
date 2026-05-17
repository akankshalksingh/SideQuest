# Detour App — Codex Planning Document

> **Purpose**: This document is the single source of truth for building, extending, and debugging the Detour web app. It covers architecture, data models, component contracts, API behavior, edge cases, and future roadmap. Read this before touching any code.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Data Models](#4-data-models)
5. [State Architecture](#5-state-architecture)
6. [Component Reference](#6-component-reference)
7. [Utility Reference](#7-utility-reference)
8. [Google Maps API Integration](#8-google-maps-api-integration)
9. [Core User Flows](#9-core-user-flows)
10. [Edge Cases & Error Handling](#10-edge-cases--error-handling)
11. [Environment & Configuration](#11-environment--configuration)
12. [Deployment (Vercel + GitHub)](#12-deployment-vercel--github)
13. [Known Limitations & Constraints](#13-known-limitations--constraints)
14. [Future Features Roadmap](#14-future-features-roadmap)
15. [Codex Task Guide](#15-codex-task-guide)

---

## 1. Product Overview

**Detour** is a web-based route planning app. The core insight: Google Maps lets you add waypoints manually, but it has no concept of "saved favorites" that auto-populate a route.

**The core flow:**
1. User saves places they love (coffee shops, gas stations, restaurants) as **Favorites**
2. User sets a **Destination**
3. User hits **↗ Detour**
4. App finds which favorites are geographically close to the direct route
5. User picks which stops to include
6. App builds an **optimized route** through the selected stops to the destination
7. Route renders on the dark map with duration + distance stats

**What makes it different from Google Maps:**
- Persistent, categorized favorites list
- One-tap "find what's on my way" instead of manually adding stops
- Automatic route optimization (reorders stops for efficiency)

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React 18 + Vite | Fast HMR, Vercel-native, no CRA overhead |
| Language | JavaScript (JSX) | No TypeScript complexity for MVP |
| Styling | Inline CSS + CSS variables | Zero build deps, co-located, theming via `:root` |
| Maps | Google Maps JavaScript SDK | Best autocomplete + routing in one package |
| Routing API | Google Directions API | Waypoint optimization support |
| Storage | `localStorage` | No backend needed for MVP |
| Fonts | Space Mono (display) + DM Sans (body) | Google Fonts, loaded in `index.html` |
| Deployment | Vercel | Zero-config, GitHub integration, env vars |
| CI/CD | GitHub → Vercel auto-deploy | Every push to `main` triggers production deploy |

**APIs enabled on Google Cloud:**
- Maps JavaScript API (map rendering, autocomplete)
- Places API (place search autocomplete)
- Directions API (route calculation + waypoint optimization)

---

## 3. Project Structure

```
detour-app/
├── index.html                    # Entry point; loads Google Fonts, mounts #root
├── vite.config.js                # Vite + React plugin, no special config needed
├── package.json                  # React 18, ReactDOM, @vitejs/plugin-react
├── .env                          # NOT committed; holds VITE_GOOGLE_MAPS_API_KEY
├── .env.example                  # Committed; template for contributors
├── .gitignore                    # node_modules, dist, .env, .DS_Store
├── README.md                     # Setup + deployment guide
├── PLANNING.md                   # This file
└── src/
    ├── main.jsx                  # ReactDOM.createRoot → <App />
    ├── index.css                 # Global CSS: CSS variables, resets, animations
    ├── App.jsx                   # Root: loads Maps SDK, manages tab state + favorites
    ├── hooks/
    │   └── useGoogleMaps.js      # Async script loader for Google Maps SDK
    ├── utils/
    │   ├── favorites.js          # localStorage CRUD + CATEGORIES constant
    │   └── routes.js             # Directions API calls + geometry helpers
    ├── components/
    │   ├── Header.jsx            # Top nav bar with logo + tab switcher
    │   ├── DetourModal.jsx       # Bottom sheet: find nearby favs → build route
    │   ├── AddFavoriteModal.jsx  # Bottom sheet: search place + pick category → save
    │   └── FavoritesPanel.jsx    # Favorites tab: list, category icons, remove
    └── pages/
        └── MapPage.jsx           # Main map view: map init, markers, search bar
```

### File responsibility rules (important for Codex)

- **`App.jsx`** owns: Google Maps load state, `favorites` state, tab state. It passes these down as props. Do NOT put favorites state in MapPage.
- **`MapPage.jsx`** owns: map instance ref, directions renderer ref, user location, destination state, marker refs. These are map-specific and should not live in App.
- **`utils/`** files are pure functions — no React, no side effects beyond localStorage. Keep them that way.
- **`hooks/`** are React-only concerns (script loading). No business logic here.
- **Modals** are controlled components — they receive `onClose` and `onAdd`/`onRouteReady` callbacks. They do not manage their own open/close state.

---

## 4. Data Models

### Favorite Object

```js
{
  id:       string,   // Date.now().toString() — unique, sortable
  name:     string,   // Display name from Google Places
  address:  string,   // formatted_address || vicinity || ''
  lat:      number,   // Latitude (float)
  lng:      number,   // Longitude (float)
  category: string,   // One of: 'coffee' | 'food' | 'gas' | 'shopping' | 'other'
  placeId:  string|null, // Google Place ID (for future dedup/lookup)
  addedAt:  string,   // ISO 8601 timestamp
}
```

**Storage:** Array of Favorite objects at `localStorage['detour_favorites']`. Serialized as JSON.

**Ordering:** Newest first (prepended on add, not appended).

**Deduplication:** Currently NOT enforced. Two favorites can point to the same place. Future: check `placeId` on add.

### Destination Object (runtime only, not persisted)

```js
{
  name: string,   // Place name from autocomplete
  lat:  number,
  lng:  number,
}
```

### Category Map (`CATEGORIES` constant in `favorites.js`)

```js
{
  coffee:   { label: 'Coffee',   emoji: '☕', color: 'var(--cat-coffee)'   },
  food:     { label: 'Food',     emoji: '🍜', color: 'var(--cat-food)'     },
  gas:      { label: 'Gas',      emoji: '⛽', color: 'var(--cat-gas)'      },
  shopping: { label: 'Shopping', emoji: '🛍', color: 'var(--cat-shopping)' },
  other:    { label: 'Other',    emoji: '📍', color: 'var(--cat-other)'    },
}
```

When adding a new category: add to this object AND add a corresponding CSS variable in `index.css` under `:root`.

---

## 5. State Architecture

### Global state (lives in `App.jsx`, passed as props)

| State | Type | Description |
|---|---|---|
| `favorites` | `Favorite[]` | All saved places. Initialized from localStorage. |
| `activeTab` | `'map' \| 'favorites'` | Which tab is showing |

### Map-local state (lives in `MapPage.jsx`)

| State/Ref | Type | Description |
|---|---|---|
| `userLocation` | `{lat, lng} \| null` | Set once on geolocation success |
| `destination` | `{name, lat, lng} \| null` | Set by autocomplete selection |
| `showDetour` | `boolean` | Controls DetourModal visibility |
| `showAddFav` | `boolean` | Controls AddFavoriteModal visibility |
| `routeActive` | `boolean` | True after a route has been drawn |
| `locationError` | `boolean` | True if geolocation was denied |
| `mapInstance` | `ref` | Google Maps `Map` object |
| `rendererRef` | `ref` | `DirectionsRenderer` object |
| `markersRef` | `ref[]` | All favorite markers on the map |
| `destRef` | `ref` | DOM ref to destination `<input>` |

### Modal-local state

**DetourModal:**
- `step`: `'loading' | 'pick' | 'routing' | 'done' | 'empty' | 'error'`
- `nearbyFavs`: filtered favorites near the route
- `selected`: `Set<string>` of favorite IDs the user chose
- `routeInfo`: `{ duration, distance, stops }` after route builds
- `errorMsg`: string for error display

**AddFavoriteModal:**
- `selected`: Google Places result object (or null before autocomplete fires)
- `category`: currently selected category key string

---

## 6. Component Reference

### `App.jsx`

**Responsibilities:**
- Calls `useGoogleMaps()` to load the SDK
- Shows loading spinner while SDK loads
- Shows error screen if SDK fails (bad key, network, etc.)
- Initializes `favorites` from localStorage via lazy `useState`
- Renders `<Header>` + either `<MapPage>` or `<FavoritesPanel>` based on tab

**Critical behavior:** MapPage is always mounted (just hidden via `display: none`) so the map instance doesn't get destroyed when switching tabs. Do not unmount it conditionally.

**Props passed down:**
- To `MapPage`: `favorites`, `setFavorites`
- To `FavoritesPanel`: `favorites`, `setFavorites`

---

### `Header.jsx`

**Props:** `activeTab: string`, `setActiveTab: fn`

**Renders:** Logo (↗ detour) + two tab buttons (Map, Favorites).

**No state.** Pure presentational.

**Edge cases:** Tab buttons use `border: none` to avoid default browser styling. Both buttons are always visible regardless of map load state.

---

### `MapPage.jsx`

**Props:** `favorites: Favorite[]`, `setFavorites: fn`

**Responsibilities:**
1. Initialize Google Map on mount (once, guarded by `mapInstance.current`)
2. Request user geolocation; set `userLocation` or `locationError`
3. Place user's location marker (teal circle)
4. Create `DirectionsRenderer` and store in `rendererRef`
5. Attach Places Autocomplete to destination input
6. Re-render favorite markers whenever `favorites` changes
7. Show/hide DetourModal and AddFavoriteModal

**Map initialization guard:** The `useEffect` checks `!window.google?.maps || mapInstance.current` before running. This prevents double-init if the component re-renders before Maps loads (shouldn't happen since App waits, but safety net).

**Marker cleanup:** `renderFavoriteMarkers()` always calls `m.setMap(null)` on all existing markers before re-rendering. This prevents phantom markers.

**`clearRoute()`:** Sets directions to `{ routes: [] }` (clears the polyline), resets destination state, clears the input field value. Does NOT reset `userLocation`.

---

### `DetourModal.jsx`

**Props:**
- `origin: {lat, lng}` — user's current location
- `destination: {name, lat, lng}` — where they're going
- `favorites: Favorite[]` — all saved favorites to filter from
- `onClose: fn` — called when modal should close
- `onRouteReady: fn` — called after route is successfully rendered
- `directionsRenderer` — Google Maps `DirectionsRenderer` instance

**Step machine:**

```
mount → 'loading'
  → filterFavoritesNearRoute() success, results > 0 → 'pick'
  → filterFavoritesNearRoute() success, results === 0 → 'empty'
  → filterFavoritesNearRoute() throws → 'error'

'pick' → user clicks "Build Route"
  → 'routing'
  → getRouteWithWaypoints() success → 'done'
  → getRouteWithWaypoints() throws → 'error'
```

**Selection logic:** `selected` is a `Set<string>` of favorite IDs. Toggle adds/removes. "Build Route" button is disabled when set is empty.

**Route rendering:** Calls `directionsRenderer.setDirections(result)` directly — this mutates the map without React knowing, which is intentional (the map lives outside React's render cycle).

**Backdrop click:** Clicking the backdrop (`e.target === e.currentTarget`) calls `onClose`. This does NOT prevent an in-progress route build from completing since the modal is unmounted; the renderer still has the result.

---

### `AddFavoriteModal.jsx`

**Props:**
- `onClose: fn`
- `onAdd: fn(place)` — called with the Google Places result object + `category` attached

**Behavior:**
- Attaches `google.maps.places.Autocomplete` to the input on mount
- Only saves places that have `geometry` (i.e., user selected from dropdown, didn't just type)
- Category defaults to `'other'`
- "Save Favorite" button disabled until a place is selected from autocomplete

**Edge case:** If user types a place name but doesn't select from dropdown, `selected` stays `null` and save is blocked. This is intentional — we need lat/lng from the Places API.

---

### `FavoritesPanel.jsx`

**Props:** `favorites: Favorite[]`, `setFavorites: fn`

**Behavior:**
- Shows empty state if no favorites
- Lists all favorites, newest first (array order from localStorage)
- Remove button calls `removeFavorite()` and updates state
- Does not support reordering or editing (future feature)

---

## 7. Utility Reference

### `utils/favorites.js`

#### `loadFavorites() → Favorite[]`
Reads `localStorage['detour_favorites']`. Wraps in try/catch — returns `[]` if parse fails (corrupt data). Called once in `App.jsx` as the lazy initializer for `useState`.

#### `saveFavorites(favorites: Favorite[]) → void`
Writes the full array to localStorage. Called by both `addFavorite` and `removeFavorite`. No error handling — if localStorage is full or disabled, this silently fails. Future: add quota error handling.

#### `addFavorite(favorites: Favorite[], place: GooglePlaceResult) → Favorite[]`
Constructs a new Favorite object from the Google Places result, prepends it, saves, returns updated array. The `place` object must have `geometry.location.lat()` and `.lng()` as functions (Google Maps LatLng methods).

#### `removeFavorite(favorites: Favorite[], id: string) → Favorite[]`
Filters out by ID, saves, returns updated array.

---

### `utils/routes.js`

#### `isNearPath(latLng, path, maxMeters) → boolean`
Checks if a `LatLng` point is within `maxMeters` of a polyline path. Two-pass approach:
1. Uses `geometry.poly.isLocationOnEdge` for each segment (converts meters to degrees)
2. Falls back to `spherical.computeDistanceBetween` against each path point

**Why two passes:** `isLocationOnEdge` uses degree tolerance which has inaccuracy near the poles. The fallback catches point-proximity cases the edge check misses.

**Default radius:** 3000 meters (≈1.9 miles). This is exposed as a parameter but the UI currently always uses the default or 4000m.

#### `getDirectRoute(origin, destination) → Promise<LatLng[]>`
Calls `DirectionsService.route()` with no waypoints. Returns `overview_path` (array of `LatLng` objects — the compressed polyline). Used only to compute the baseline path for proximity filtering.

**Error cases:**
- `ZERO_RESULTS` — no route found (islands, inaccessible areas)
- `NOT_FOUND` — geocoding failed
- `MAX_WAYPOINTS_EXCEEDED` — shouldn't happen here (no waypoints)
- `REQUEST_DENIED` — bad API key or API not enabled
- `OVER_DAILY_LIMIT` / `OVER_QUERY_LIMIT` — billing issue
- `UNKNOWN_ERROR` — transient, retry-able

All failures reject the promise with a descriptive `Error`.

#### `getRouteWithWaypoints(origin, destination, waypoints) → Promise<DirectionsResult>`
Calls `DirectionsService.route()` with `optimizeWaypoints: true`. Returns the full `DirectionsResult` — passed directly to `DirectionsRenderer.setDirections()`.

**Waypoint limit:** Google allows max 25 intermediate waypoints. Favorites are unlikely to exceed this, but if they do, the API returns `MAX_WAYPOINTS_EXCEEDED`. Add a guard if the user's favorite count could grow large.

**Optimization:** With `optimizeWaypoints: true`, Google reorders stops for minimum travel time. The response includes `routes[0].waypoint_order` (array of original indices in optimized order) — useful if we want to show the stop sequence in UI.

#### `filterFavoritesNearRoute(origin, destination, favorites, radiusMeters) → Promise<Favorite[]>`
Calls `getDirectRoute`, then filters each favorite through `isNearPath`. Returns only the favorites that are within `radiusMeters` of the direct path.

**Default radius in DetourModal call:** 4000 meters (passed explicitly). Slightly more generous than `isNearPath`'s default to account for route deviations.

#### `formatDuration(seconds) → string`
- 0–3599s → `"N min"`
- 3600+s → `"Nh Nm"`

#### `formatDistance(meters) → string`
Converts to miles (US unit). Returns `"X.X mi"`.

---

## 8. Google Maps API Integration

### Script Loading (`useGoogleMaps.js`)

The Google Maps JS SDK is loaded dynamically via a `<script>` tag injected into `<head>`. Key behaviors:

- Checks `window.google?.maps` first — idempotent, safe to call multiple times
- Checks for existing script tag by ID to avoid duplicates
- If no API key in env, sets error immediately (no network request)
- `onload` → sets `isLoaded: true` → App renders MapPage
- `onerror` → sets descriptive error message

**Why not `@googlemaps/js-api-loader`?** To minimize dependencies. The manual approach is ~30 lines and avoids a 50KB npm package.

### Maps Initialization (in `MapPage.jsx`)

Called once inside a `useEffect` after `isLoaded` is true (App waits on this). The `mapInstance.current` guard prevents double-init.

**Map options:**
- `zoom: 13` — city-level view
- `mapTypeId: 'roadmap'`
- `disableDefaultUI: false` — keeps zoom controls
- `mapTypeControl: false`, `streetViewControl: false`, `fullscreenControl: false` — declutter for app context
- `styles: darkMapStyle` — 17-rule custom dark theme

### Places Autocomplete

Two separate Autocomplete instances:
1. Destination input in `MapPage.jsx` — fields: `geometry, name, formatted_address`
2. Add Favorite input in `AddFavoriteModal.jsx` — same fields

Both listen on `place_changed`. The place is only accepted if `place.geometry` exists (protects against hitting Enter before selecting a suggestion).

### Directions Service

`DirectionsService` is instantiated fresh inside each call (not stored as a ref). This is the Google-recommended pattern for web — no need to persist the service object.

`DirectionsRenderer` IS persisted in `rendererRef` because it's bound to the map instance and must be the same object across route updates.

### API Key Restrictions (production)

In Google Cloud Console:
- **Application restrictions** → HTTP referrers → `https://your-app.vercel.app/*` and `http://localhost:5173/*`
- **API restrictions** → Restrict to: Maps JavaScript API, Places API, Directions API

Without restrictions, the key is usable by anyone who finds it in source.

---

## 9. Core User Flows

### Flow 1: First-time user (no favorites)

```
Load app
→ Google Maps SDK loads
→ App prompts for geolocation
→ User grants → map centers on user
→ User sees "Save favorites first" hint
→ User clicks "⭐ Save"
→ AddFavoriteModal opens
→ User searches for "Blue Bottle Coffee"
→ Selects from autocomplete dropdown
→ Picks category "Coffee"
→ Clicks "Save Favorite"
→ Favorite saved to localStorage
→ Modal closes
→ Teal marker appears on map
→ Hint changes to "Set a destination to enable Detour"
```

### Flow 2: Build a detour route

```
User has favorites saved
→ User types destination in search bar
→ Selects from autocomplete → destination state set
→ "↗ Detour" button activates (accent color)
→ User clicks Detour
→ DetourModal opens, step = 'loading'
→ getDirectRoute() called → baseline path computed
→ Each favorite checked against path (4km radius)
→ Nearby favorites shown in 'pick' step
→ User taps to select 2 of 3 nearby favorites (checkmark toggles)
→ Clicks "Build Route with 2 stops"
→ step = 'routing'
→ getRouteWithWaypoints() called with selected favorites
→ DirectionsRenderer.setDirections() called → route drawn on map
→ step = 'done' → stats shown (duration, distance, stop count)
→ User closes modal → map shows full route
```

### Flow 3: No favorites near route

```
→ DetourModal opens, step = 'loading'
→ filterFavoritesNearRoute() returns []
→ step = 'empty'
→ User sees "No saved favorites near this route"
→ User closes modal
```

### Flow 4: Geolocation denied

```
→ App loads, map init attempts geolocation
→ User denies or browser blocks permission
→ locationError = true
→ Red banner shown: "Location access denied"
→ userLocation stays null
→ "↗ Detour" button stays disabled (requires userLocation)
→ User can still browse map (map falls back to default center — San Francisco, lat:37.7749, lng:-122.4194)
```

**Current gap:** Map has no fallback center if geolocation is denied — the map `div` renders but `mapInstance` is never set. Codex should add a fallback: initialize map at a default location (SF) and show the error banner. See Edge Cases §10.

### Flow 5: Clear route and start over

```
→ Active route shown on map
→ User clicks × next to destination
→ clearRoute() called
→ DirectionsRenderer cleared (routes: [])
→ destination state = null
→ Input field cleared
→ routeActive = false
→ Detour button grays out
```

---

## 10. Edge Cases & Error Handling

### Geolocation

| Scenario | Current Behavior | Required Fix |
|---|---|---|
| User denies permission | `locationError = true`, map never initializes | **BUG**: Add fallback map init at default lat/lng (SF: 37.7749, -122.4194). Show banner but still show map. |
| Browser doesn't support geolocation | `navigator.geolocation` is undefined → uncaught error | Wrap in `if (!navigator.geolocation)` check, treat as error |
| Geolocation times out | No timeout set on `getCurrentPosition` | Add `{ timeout: 10000 }` options object |
| Geolocation is slow | User sees blank map div | Add loading indicator to map div until location resolves |
| Location changes mid-session | userLocation is stale | Not handled — acceptable for MVP, add watch for v2 |

### API Key / SDK

| Scenario | Current Behavior |
|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` missing | `useGoogleMaps` sets error immediately, error screen shown |
| Key is invalid | Script loads but `window.google.maps` throws on use; `onerror` may or may not fire | Should show "Check your API key" error |
| API not enabled in Cloud Console | `REQUEST_DENIED` status from Directions API | Caught by route functions, shown in DetourModal error step |
| Daily quota exceeded | `OVER_DAILY_LIMIT` | Caught, surfaced as generic error |
| Script load times out | No timeout currently | Add 15s timeout: if `window.google.maps` still not set, set error |

### localStorage

| Scenario | Current Behavior |
|---|---|
| localStorage disabled (private mode on some browsers) | `saveFavorites` throws silently; `loadFavorites` returns `[]` | Acceptable for MVP; consider showing a warning toast |
| localStorage quota exceeded | `saveFavorites` throws | Not caught — add try/catch with user-facing "Storage full" message |
| Corrupt JSON in localStorage | `loadFavorites` catches parse error, returns `[]` | ✅ Handled |
| Favorite with missing fields loaded | `CATEGORIES[fav.category]` falls back to `CATEGORIES.other` | ✅ Handled |
| Very large number of favorites (100+) | Proximity filter scans all — O(n * path_points) | Add cap at 200 favorites, show warning near limit |

### Route Building

| Scenario | Current Behavior |
|---|---|
| Origin === destination | API returns `ZERO_RESULTS` or a trivial route | Caught, shown as error |
| Destination unreachable by car | `ZERO_RESULTS` | Caught |
| Favorite is on an island/unreachable | Route with that waypoint returns error | Caught at `getRouteWithWaypoints` level — whole route fails. **Issue**: should skip bad waypoints and retry. |
| All selected favorites are unreachable | Error shown | See above |
| 0 favorites selected before clicking build | Button disabled | ✅ Handled |
| User closes modal during 'routing' step | Modal unmounts, route result still applies to renderer | Acceptable — route appears on map, user doesn't see stats. Consider keeping modal or storing routeInfo in parent. |
| Route exceeds 25 waypoints | `MAX_WAYPOINTS_EXCEEDED` from API | Not guarded — add check: `if (waypoints.length > 25) show warning`. In practice, filtered favorites rarely exceed this. |
| Directions API network failure | Promise rejects with "Route failed: UNKNOWN_ERROR" | Caught, shown in error step. No retry logic yet. |

### Map

| Scenario | Current Behavior |
|---|---|
| Map div not rendered yet when init runs | `mapRef.current` is null | Guard: `if (!mapRef.current) return` |
| User switches to Favorites tab and back | Map stays mounted (display: none) | ✅ Handled — map is never unmounted |
| User adds favorite while route is active | New marker appears, route unchanged | ✅ Works correctly |
| User removes favorite while route is active | Marker removed, route unchanged | ✅ Works correctly — route uses coordinates not references |
| Autocomplete dropdown overlaps modal | z-index issue — Google autocomplete uses z-index 1000+ | May need to increase modal z-index or close autocomplete when modal opens |

### AddFavoriteModal

| Scenario | Current Behavior |
|---|---|
| User types place but doesn't select from dropdown | `selected` stays null, save disabled | ✅ Handled |
| Autocomplete returns no results | Input stays empty, no error shown | Acceptable — Google handles empty state in dropdown |
| Duplicate favorite (same place saved twice) | Both saved, both markers appear | Not deduplicated. Future: check `placeId` before saving |
| Place has no `formatted_address` | Falls back to `vicinity` then `''` | ✅ Handled |
| Place has no `place_id` | Stored as `null` | ✅ Handled |
| User saves 50+ favorites | UI still works, markers render all | Performance degrades — consider clustering above 30 markers |

### Network / Offline

| Scenario | Current Behavior |
|---|---|
| User goes offline after map loads | Map tiles may fail to load (cached tiles still show) | Not handled — acceptable for MVP |
| User goes offline before Maps SDK loads | `onerror` fires, error screen shown | ✅ Handled |
| User goes offline during Detour flow | Directions API call fails | Caught, error step shown in modal |

---

## 11. Environment & Configuration

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | Yes | Google Maps Platform API key |

**Naming rule:** Must be prefixed with `VITE_` for Vite to expose it to client-side code via `import.meta.env`.

**Never commit `.env`** — it's in `.gitignore`. Only `.env.example` is committed.

### Local `.env` file

```bash
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...your_key_here
```

### Vercel Environment Variables

Set in: Vercel Dashboard → Project → Settings → Environment Variables

Add `VITE_GOOGLE_MAPS_API_KEY` for Production, Preview, and Development environments.

Vercel automatically makes these available during the build step. Since Vite bakes `import.meta.env.VITE_*` values at build time, the key is embedded in the built JS bundle — this is expected and fine for public-facing Maps keys (restrict by domain instead of keeping secret).

---

## 12. Deployment (Vercel + GitHub)

### Initial GitHub Setup

```bash
cd detour-app
git init
git add .
git commit -m "feat: initial Detour app"

# Create repo on github.com first, then:
git remote add origin https://github.com/USERNAME/detour-app.git
git branch -M main
git push -u origin main
```

### Vercel Setup

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. **Add New Project** → Import `detour-app` from GitHub
3. Framework: Vite (auto-detected)
4. Build command: `npm run build` (default)
5. Output directory: `dist` (default)
6. Environment Variables: add `VITE_GOOGLE_MAPS_API_KEY`
7. Click Deploy

### Auto-Deploy Behavior

- Every push to `main` → triggers production deploy
- Every push to a branch → triggers a preview deploy (unique URL)
- Pull requests → get their own preview URL (great for testing)

### Build Command

```bash
npm run build   # runs: vite build → outputs to /dist
```

Vite bundles React, inlines CSS vars, tree-shakes unused code. Output is static HTML/JS/CSS — no server needed.

### Domain & API Key Restriction

After deploy, add your Vercel URL to Google Cloud Console:
- Credentials → your API key → Application restrictions → HTTP referrers
- Add: `https://your-project.vercel.app/*`
- Add: `http://localhost:5173/*` (for local dev)

---

## 13. Known Limitations & Constraints

### Google Maps API

- **Directions API costs money at scale.** Free tier: $200/month credit. Each Directions request = ~$0.005. At 1000 detour builds/month = $5. Well within free tier for personal use.
- **Waypoint optimization is billed at higher rate** (Routes Pro SKU). With DirectionsService + `optimizeWaypoints: true`, this applies. Monitor usage.
- **Autocomplete session billing.** Places Autocomplete charges per session. Each time a user opens the add-favorite modal and types = 1 session. Free tier covers ~28,000 sessions/month.
- **25 waypoint maximum** per Directions request. Enforced by Google. Our app never approaches this with personal favorites.
- **`overview_path` is compressed.** It's a simplified polyline, not every road point. This means proximity checks near complex road geometry may miss some edge cases. Acceptable for the use case.

### localStorage

- **~5MB limit** in most browsers. A favorite object is ~200 bytes. You'd need 25,000 favorites to hit the limit. Not a practical concern.
- **Not shared across devices.** Favorites saved on phone don't appear on laptop. Future: cloud sync.
- **Not available in incognito mode on some browsers.** Silent failure handled.

### Browser Compatibility

- Google Maps JS SDK requires a modern browser. IE is not supported (EOL anyway).
- Geolocation requires HTTPS in production (Vercel provides this) or `localhost` in development.
- CSS `dvh` (dynamic viewport height) units used. Supported in all modern browsers since 2023.

---

## 14. Future Features Roadmap

Listed in rough priority order.

### P0 — Bug Fixes (do these first)

- [ ] **Geolocation denied fallback**: Initialize map at default location (SF or detected by IP) when geolocation fails. Currently map never renders.
- [ ] **Geolocation timeout**: Add `{ timeout: 10000, maximumAge: 60000 }` to `getCurrentPosition`.
- [ ] **Unreachable waypoint retry**: If `getRouteWithWaypoints` fails with bad waypoint, retry without it rather than failing the whole route.

### P1 — Core Improvements

- [ ] **Duplicate detection**: Before saving a favorite, check if `placeId` already exists in the array. Show "Already saved" instead of saving duplicate.
- [ ] **Detour radius control**: Add a slider in DetourModal (1km – 10km) so user can adjust how far off-route they're willing to go.
- [ ] **Route comparison**: Show the direct route duration alongside the detour duration so user understands the time cost.
- [ ] **"Open in Google Maps" button**: After building route, deep-link to Google Maps with the same waypoints. Format: `https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=...`
- [ ] **Marker clustering**: When user has 20+ favorites close together, cluster them with a count badge. Use `@googlemaps/markerclusterer`.
- [ ] **Click-to-save on map**: Let user click a place on the map to open the Place info and save it as a favorite directly.

### P2 — Quality of Life

- [ ] **Edit favorite**: Change name, category, or delete from the favorites panel.
- [ ] **Reorder favorites**: Drag to reorder in the list.
- [ ] **Filter favorites by category**: Category filter chips above the list in FavoritesPanel.
- [ ] **"Detour from current location" vs "Detour from typed origin"**: Let user type a custom origin instead of always using GPS.
- [ ] **Favorite visit history**: Track last time a stop was included in a route. Show "last visited 3 days ago".
- [ ] **Distance label on each favorite in DetourModal**: Show "0.4 mi off route" next to each nearby favorite.

### P3 — Platform Expansion

- [ ] **User accounts + cloud sync**: Firebase Auth + Firestore to sync favorites across devices.
- [ ] **Share a route**: Generate a shareable link with encoded waypoints.
- [ ] **PWA / installable**: Add `manifest.json` + service worker for offline tile caching and home screen install.
- [ ] **Mobile bottom nav**: Replace header tabs with a mobile-optimized bottom navigation bar.
- [ ] **Transit + walking modes**: Add travel mode selector (driving / transit / walking / cycling).

---

## 15. Codex Task Guide

### How to read this codebase quickly

1. Start with `App.jsx` — understand the SDK load flow and state shape
2. Read `utils/favorites.js` — understand the data model
3. Read `utils/routes.js` — understand the API calls
4. Read `MapPage.jsx` — understand map init and the ref architecture
5. Read `DetourModal.jsx` — understand the step machine

### Rules for Codex when modifying this codebase

1. **Never store Google Maps objects in React state.** Map instances, markers, renderers — always use `useRef`. Storing them in state triggers re-renders and can cause the Maps SDK to behave unexpectedly.

2. **Always clean up markers.** Any function that adds markers must call `m.setMap(null)` on previous markers first. Use the `markersRef` array pattern.

3. **Don't initialize the map twice.** The `mapInstance.current` guard in `MapPage.useEffect` is intentional. Do not remove it.

4. **Keep MapPage mounted.** The `display: none` pattern in App.jsx is intentional. Do not switch to conditional unmounting (`activeTab === 'map' && <MapPage />`).

5. **Utilities are pure.** `utils/favorites.js` and `utils/routes.js` must not import React, use hooks, or have component-level side effects. Keep them testable in isolation.

6. **CSS variables for all colors.** Never hardcode color values in component files. Add to `:root` in `index.css` and reference via `var(--name)`.

7. **Modals are always bottom sheets.** The design uses `align-items: flex-end` + `slide-up` animation. New modals must follow this pattern.

8. **The `VITE_` prefix is mandatory.** Any new environment variable must start with `VITE_` or Vite will not expose it.

9. **No TypeScript migrations without explicit instruction.** The project is intentionally plain JS for simplicity.

10. **Test on mobile viewport.** The primary use case is a user in a car on their phone. All UI must work at 375px width.

### Common Codex tasks and where to make the change

| Task | File(s) to modify |
|---|---|
| Add a new favorite category | `utils/favorites.js` (CATEGORIES), `index.css` (CSS var) |
| Change the proximity radius | `DetourModal.jsx` (filterFavoritesNearRoute call), optionally expose as prop |
| Add a new map style | `MapPage.jsx` (darkMapStyle array) |
| Change detour button logic | `MapPage.jsx` (disabled condition) |
| Add a new modal | Create in `src/components/`, add show state to `MapPage.jsx` or `App.jsx`, follow bottom sheet pattern |
| Add a new tab | `Header.jsx` (tab list), `App.jsx` (render branch) |
| Fix the geolocation fallback bug | `MapPage.jsx` — move map init outside geolocation callback, use fallback center |
| Add route comparison (direct vs detour) | `DetourModal.jsx` — call `getDirectRoute` in parallel, compute duration delta |
| Add "Open in Google Maps" button | `DetourModal.jsx` (done step) — construct Maps URL from result waypoints |
| Add duplicate detection | `utils/favorites.js` (addFavorite) — check placeId before prepending |
| Add localStorage quota error handling | `utils/favorites.js` (saveFavorites) — wrap in try/catch, return error signal |
| Add marker clustering | `MapPage.jsx` — install `@googlemaps/markerclusterer`, replace direct Marker creation |
