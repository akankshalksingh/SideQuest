import { Check, ExternalLink, Loader2, Route, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import CategoryIcon from './CategoryIcon.jsx';
import { CATEGORIES } from '../utils/favorites.js';
import {
  buildGoogleMapsUrl,
  filterFavoritesNearRoute,
  formatDistance,
  formatDuration,
  getRouteWithWaypoints,
  summarizeRoute,
} from '../utils/routes.js';

export default function SideQuestModal({
  origin,
  destination,
  favorites,
  onClose,
  onRouteReady,
  directionsRenderer,
}) {
  const [step, setStep] = useState('loading');
  const [nearbyFavs, setNearbyFavs] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [routeInfo, setRouteInfo] = useState(null);
  const [directInfo, setDirectInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedStops = useMemo(
    () => nearbyFavs.filter((favorite) => selected.has(favorite.id)),
    [nearbyFavs, selected],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadNearbyFavorites() {
      try {
        const result = await filterFavoritesNearRoute(origin, destination, favorites, 4000);
        if (cancelled) return;

        setDirectInfo({
          duration: formatDuration(result.directRoute.durationSeconds),
          distance: formatDistance(result.directRoute.distanceMeters),
        });
        setNearbyFavs(result.favorites);
        setStep(result.favorites.length ? 'pick' : 'empty');
      } catch (error) {
        if (!cancelled) {
          setErrorMsg(error.message);
          setStep('error');
        }
      }
    }

    loadNearbyFavorites();

    return () => {
      cancelled = true;
    };
  }, [origin, destination, favorites]);

  function toggleFavorite(id) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function buildRoute() {
    if (!selectedStops.length) return;

    setStep('routing');
    setErrorMsg('');

    try {
      const result = await getRouteWithWaypoints(origin, destination, selectedStops);
      directionsRenderer.setDirections(result);
      const summary = summarizeRoute(result);
      setRouteInfo({ ...summary, stops: selectedStops.length });
      setStep('done');
      onRouteReady();
    } catch (error) {
      setErrorMsg(error.message);
      setStep('error');
    }
  }

  return (
    <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label="Build a SideQuest route">
        <div className="sheet-header">
          <div>
            <p className="eyebrow">To {destination.name}</p>
            <h2>Find a SideQuest</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {step === 'loading' && <LoadingState label="Finding favorites near your route" />}
        {step === 'routing' && <LoadingState label="Building the optimized route" />}

        {step === 'empty' && (
          <div className="empty-state compact">
            <h3>No saved favorites nearby</h3>
            <p>SideQuest checked your direct route and did not find saved stops within about 2.5 miles.</p>
          </div>
        )}

        {step === 'error' && (
          <div className="error-box">
            <strong>Could not build this route.</strong>
            <span>{errorMsg}</span>
          </div>
        )}

        {step === 'pick' && (
          <>
            {directInfo && (
              <div className="route-baseline">
                <span>Direct route</span>
                <strong>
                  {directInfo.duration} · {directInfo.distance}
                </strong>
              </div>
            )}

            <ul className="sidequest-list">
              {nearbyFavs.map((favorite) => {
                const category = CATEGORIES[favorite.category] || CATEGORIES.other;
                const active = selected.has(favorite.id);

                return (
                  <li key={favorite.id}>
                    <button
                      type="button"
                      className={active ? 'sidequest-option active' : 'sidequest-option'}
                      onClick={() => toggleFavorite(favorite.id)}
                    >
                      <span className="category-dot" style={{ '--dot-color': category.color }}>
                        <CategoryIcon icon={category.icon} />
                      </span>
                      <span className="favorite-copy">
                        <strong>{favorite.name}</strong>
                        <span>{favorite.address || category.label}</span>
                      </span>
                      <span className="check-indicator">
                        {active ? <Check size={18} aria-hidden="true" /> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              className="primary-action"
              disabled={!selectedStops.length}
              onClick={buildRoute}
            >
              Use {selectedStops.length} Saved Place{selectedStops.length === 1 ? '' : 's'}
            </button>
          </>
        )}

        {step === 'done' && routeInfo && (
          <div className="done-state">
            <span className="done-icon">
              <Route size={24} aria-hidden="true" />
            </span>
            <h3>Route ready</h3>
            <div className="stats-grid">
              <span>
                <strong>{routeInfo.duration}</strong>
                <small>Drive time</small>
              </span>
              <span>
                <strong>{routeInfo.distance}</strong>
                <small>Distance</small>
              </span>
              <span>
                <strong>{routeInfo.stops}</strong>
                <small>Stops</small>
              </span>
            </div>
            <a
              className="secondary-action"
              href={buildGoogleMapsUrl(origin, destination, selectedStops)}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={18} aria-hidden="true" />
              Open in Google Maps
            </a>
          </div>
        )}
      </section>
    </div>
  );
}

function LoadingState({ label }) {
  return (
    <div className="loading-state">
      <Loader2 className="spin" size={28} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
