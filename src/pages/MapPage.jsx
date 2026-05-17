import { AlertTriangle, Navigation, Plus, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AddFavoriteModal from '../components/AddFavoriteModal.jsx';
import SideQuestModal from '../components/SideQuestModal.jsx';
import { CATEGORIES, addFavorite } from '../utils/favorites.js';

const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#202c32' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#d7e4df' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a2429' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#36535c' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#223039' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#26363b' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1f3a33' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#34454d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1d292e' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#b6c7c1' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#5b4f36' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#2a2d2d' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#263b45' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#102b3a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#7fa7b2' }] },
];

export default function MapPage({ favorites, setFavorites }) {
  const mapRef = useRef(null);
  const destRef = useRef(null);
  const mapInstance = useRef(null);
  const rendererRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const autocompleteRef = useRef(null);

  const [userLocation, setUserLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [showSideQuest, setShowSideQuest] = useState(false);
  const [showAddFav, setShowAddFav] = useState(false);
  const [routeActive, setRouteActive] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [mapReady, setMapReady] = useState(false);

  const setUserMarker = useCallback((position) => {
    if (!mapInstance.current) return;
    if (userMarkerRef.current) userMarkerRef.current.setMap(null);

    userMarkerRef.current = new window.google.maps.Marker({
      position,
      map: mapInstance.current,
      title: 'Your location',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#53e6c1',
        fillOpacity: 1,
        strokeColor: '#f5fffb',
        strokeWeight: 2,
      },
    });
  }, []);

  const initMap = useCallback(
    (center, userLocated = false) => {
      if (!mapRef.current || mapInstance.current) return;

      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 13,
        mapTypeId: 'roadmap',
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: darkMapStyle,
      });

      const renderer = new window.google.maps.DirectionsRenderer({
        map,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#53e6c1',
          strokeOpacity: 0.95,
          strokeWeight: 6,
        },
      });

      mapInstance.current = map;
      rendererRef.current = renderer;
      setMapReady(true);

      if (userLocated) {
        setUserMarker(center);
      }
    },
    [setUserMarker],
  );

  useEffect(() => {
    if (mapInstance.current) return undefined;

    function initializeFallbackMap(message) {
      setLocationError(message);
      initMap(DEFAULT_CENTER, false);
    }

    if (!navigator.geolocation) {
      initializeFallbackMap('Location is unavailable in this browser. The map is centered on San Francisco.');
      return undefined;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const center = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(center);
        initMap(center, true);
      },
      () => {
        initializeFallbackMap('Location access was denied or timed out. The map is still available.');
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true },
    );

    return undefined;
  }, [initMap]);

  useEffect(() => {
    if (!destRef.current || autocompleteRef.current) return undefined;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(destRef.current, {
      fields: ['geometry', 'name', 'formatted_address'],
    });

    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      if (!place.geometry) return;

      const nextDestination = {
        name: place.name || place.formatted_address || 'Destination',
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };

      setDestination(nextDestination);
      setRouteActive(false);
      mapInstance.current?.panTo(nextDestination);
    });

    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = favorites.map((favorite) => {
      const category = CATEGORIES[favorite.category] || CATEGORIES.other;

      return new window.google.maps.Marker({
        position: { lat: favorite.lat, lng: favorite.lng },
        map: mapInstance.current,
        title: favorite.name,
        label: {
          text: category.label.charAt(0),
          color: '#10201c',
          fontWeight: '700',
        },
      });
    });
  }, [favorites, mapReady]);

  function clearRoute() {
    rendererRef.current?.setDirections({ routes: [] });
    setDestination(null);
    setRouteActive(false);
    if (destRef.current) destRef.current.value = '';
  }

  function handleAddFavorite(place, category) {
    const result = addFavorite(favorites, place, category);
    setSaveError(result.error);
    setFavorites(result.favorites);
    if (result.added) setShowAddFav(false);
  }

  return (
    <div className="map-page">
      <div className="map-canvas" ref={mapRef} />
      {!mapReady && <span className="map-loading">Waiting for your location</span>}

      <div className="map-controls">
        {locationError && (
          <div className="banner warning">
            <AlertTriangle size={17} aria-hidden="true" />
            <span>{locationError}</span>
          </div>
        )}

        {saveError && (
          <div className="banner error">
            <AlertTriangle size={17} aria-hidden="true" />
            <span>{saveError}</span>
            <button type="button" className="text-button" onClick={() => setSaveError('')}>
              Dismiss
            </button>
          </div>
        )}

        <div className="destination-bar">
          <label className="search-field destination-input">
            <Search size={18} aria-hidden="true" />
            <input
              ref={destRef}
              type="search"
              placeholder="Destination for later"
              autoComplete="off"
              onChange={() => {
                setDestination(null);
                setRouteActive(false);
              }}
            />
          </label>
          {destination && (
            <button type="button" className="icon-button clear-button" aria-label="Clear route" onClick={clearRoute}>
              <X size={19} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="action-row">
          <button type="button" className="primary-action" onClick={() => setShowAddFav(true)}>
            <Plus size={18} aria-hidden="true" />
            Save Favorite
          </button>
          <button
            type="button"
            className="secondary-action sidequest-button"
            disabled={!userLocation || !destination || favorites.length === 0}
            onClick={() => setShowSideQuest(true)}
          >
            <Navigation size={18} aria-hidden="true" />
            Find On Route
          </button>
        </div>

        <p className="map-hint">
          {routeActive
            ? 'Optimized route is on the map.'
            : favorites.length === 0
              ? 'Save favorite places like Marina Green or Presidio.'
              : destination
                ? userLocation
                  ? 'SideQuest will only use your saved favorites.'
                  : 'Location access is needed to build a route from here.'
                : 'Set a destination whenever you want route suggestions.'}
        </p>
      </div>

      {showAddFav && <AddFavoriteModal onClose={() => setShowAddFav(false)} onAdd={handleAddFavorite} />}

      {showSideQuest && userLocation && destination && rendererRef.current && (
        <SideQuestModal
          origin={userLocation}
          destination={destination}
          favorites={favorites}
          directionsRenderer={rendererRef.current}
          onClose={() => setShowSideQuest(false)}
          onRouteReady={() => setRouteActive(true)}
        />
      )}
    </div>
  );
}
