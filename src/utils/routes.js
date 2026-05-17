const METERS_PER_MILE = 1609.344;
const MAX_WAYPOINTS = 25;

export const TRAVEL_MODES = {
  driving: { label: 'Drive', googleMode: 'DRIVING', mapsMode: 'driving' },
  walking: { label: 'Walk', googleMode: 'WALKING', mapsMode: 'walking' },
  bicycling: { label: 'Bike', googleMode: 'BICYCLING', mapsMode: 'bicycling' },
};

function routeStatusMessage(status) {
  const messages = {
    ZERO_RESULTS: 'No driving route was found for that destination.',
    NOT_FOUND: 'One of the route locations could not be found.',
    MAX_WAYPOINTS_EXCEEDED: 'Google Maps supports up to 25 route anchors in one route.',
    REQUEST_DENIED: 'Google denied the route request. Check enabled APIs and key restrictions.',
    OVER_DAILY_LIMIT: 'The Google Maps quota or billing limit was reached.',
    OVER_QUERY_LIMIT: 'Too many route requests were made. Try again shortly.',
    UNKNOWN_ERROR: 'Google Maps had a temporary routing issue. Try again.',
  };

  return messages[status] || `Route failed with status: ${status}`;
}

function directionsRoute(request) {
  return new Promise((resolve, reject) => {
    const service = new window.google.maps.DirectionsService();
    service.route(request, (result, status) => {
      if (status === window.google.maps.DirectionsStatus.OK && result) {
        resolve(result);
        return;
      }
      reject(new Error(routeStatusMessage(status)));
    });
  });
}

export function isNearPath(latLng, path, maxMeters = 3000) {
  if (!path?.length) return false;

  const point = new window.google.maps.LatLng(latLng.lat, latLng.lng);
  const tolerance = maxMeters / 111320;
  const polyline = new window.google.maps.Polyline({ path });

  if (window.google.maps.geometry.poly.isLocationOnEdge(point, polyline, tolerance)) {
    return true;
  }

  return path.some((pathPoint) => {
    const distance = window.google.maps.geometry.spherical.computeDistanceBetween(point, pathPoint);
    return distance <= maxMeters;
  });
}

function resolveTravelMode(mode = 'driving') {
  const travelMode = TRAVEL_MODES[mode] || TRAVEL_MODES.driving;
  return window.google.maps.TravelMode[travelMode.googleMode];
}

export async function getDirectRoute(origin, destination, mode = 'driving') {
  const result = await directionsRoute({
    origin,
    destination,
    travelMode: resolveTravelMode(mode),
  });

  const route = result.routes?.[0];
  if (!route?.overview_path?.length) {
    throw new Error('Google Maps returned a route without a usable path.');
  }

  return {
    result,
    path: route.overview_path,
    durationSeconds: route.legs.reduce((total, leg) => total + (leg.duration?.value || 0), 0),
    distanceMeters: route.legs.reduce((total, leg) => total + (leg.distance?.value || 0), 0),
  };
}

export async function getRouteWithWaypoints(origin, destination, waypoints, mode = 'driving') {
  if (waypoints.length > MAX_WAYPOINTS) {
    throw new Error(`Choose ${MAX_WAYPOINTS} route anchors or fewer for one route.`);
  }

  return directionsRoute({
    origin,
    destination,
    waypoints: waypoints.map((favorite) => ({
      location: { lat: favorite.lat, lng: favorite.lng },
      stopover: false,
    })),
    optimizeWaypoints: false,
    travelMode: resolveTravelMode(mode),
  });
}

export async function filterFavoritesNearRoute(origin, destination, favorites, radiusMeters = 4000, mode = 'driving') {
  const directRoute = await getDirectRoute(origin, destination, mode);
  const nearbyFavorites = favorites.filter((favorite) =>
    isNearPath({ lat: favorite.lat, lng: favorite.lng }, directRoute.path, radiusMeters),
  );

  return {
    favorites: nearbyFavorites,
    directRoute,
  };
}

export function summarizeRoute(result) {
  const legs = result.routes?.[0]?.legs || [];
  const seconds = legs.reduce((total, leg) => total + (leg.duration?.value || 0), 0);
  const meters = legs.reduce((total, leg) => total + (leg.distance?.value || 0), 0);

  return {
    duration: formatDuration(seconds),
    distance: formatDistance(meters),
    durationSeconds: seconds,
    distanceMeters: meters,
  };
}

export function formatDuration(seconds) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function formatDistance(meters) {
  return `${(meters / METERS_PER_MILE).toFixed(1)} mi`;
}

export function buildGoogleMapsUrl(origin, destination, routeAnchors, mode = 'driving') {
  const travelMode = TRAVEL_MODES[mode] || TRAVEL_MODES.driving;
  const params = new URLSearchParams({
    api: '1',
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: travelMode.mapsMode,
  });

  if (routeAnchors.length) {
    params.set('waypoints', routeAnchors.map((anchor) => `${anchor.lat},${anchor.lng}`).join('|'));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
