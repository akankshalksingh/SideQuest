# SideQuest

SideQuest is a route-planning app for scenic drives and hidden shortcuts. Build named lists like `Scenic Route` or `No Embarcadero`, add pass-through anchors such as Marina Green, then draw one route that passes through them without treating them as stops.

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Add your Google Maps Platform key to `.env`:

```bash
VITE_GOOGLE_MAPS_API_KEY=AIza...
```

Enable these Google APIs:

- Maps JavaScript API
- Places API
- Directions API

## Deploy On Vercel

1. Import the `SideQuest` GitHub repo in Vercel.
2. Use the default Vite settings:
   - Build command: `npm run build`
   - Output directory: `dist`
3. Add `VITE_GOOGLE_MAPS_API_KEY` to Production, Preview, and Development environment variables.
4. After deployment, restrict the Google API key to:
   - `https://your-vercel-project.vercel.app/*`
   - `http://localhost:5173/*`

## Production Notes

- The Google Maps key is intentionally exposed in the client bundle, as required by browser Maps apps. Protect it with HTTP referrer restrictions in Google Cloud.
- Route lists and anchors are stored locally in the browser with `localStorage`.
- Geolocation failure falls back to San Francisco so the map remains usable.
