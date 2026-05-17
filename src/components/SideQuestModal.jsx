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
  lists,
  onClose,
  onRouteReady,
  directionsRenderer,
}) {
  const [step, setStep] = useState('loading');
  const [nearbyFavs, setNearbyFavs] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [listId, setListId] = useState(lists[0]?.id || '');
  const [routeInfo, setRouteInfo] = useState(null);
  const [directInfo, setDirectInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const activeList = lists.find((list) => list.id === listId) || lists[0];
  const listPlaces = useMemo(
    () => favorites.filter((favorite) => favorite.listId === activeList?.id),
    [favorites, activeList],
  );

  const selectedStops = useMemo(
    () => nearbyFavs.filter((favorite) => selected.has(favorite.id)),
    [nearbyFavs, selected],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadNearbyFavorites() {
      try {
        const result = await filterFavoritesNearRoute(origin, destination, listPlaces, 4000);
        if (cancelled) return;

        setDirectInfo({
          duration: formatDuration(result.directRoute.durationSeconds),
          distance: formatDistance(result.directRoute.distanceMeters),
        });
        setNearbyFavs(result.favorites);
        setSelected(new Set(result.favorites.map((favorite) => favorite.id)));
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
  }, [origin, destination, listPlaces]);

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
            <h2>Choose a route list</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="list-picker modal-list-picker" aria-label="Route list">
          {lists.map((list) => (
            <button
              key={list.id}
              type="button"
              className={activeList?.id === list.id ? 'list-chip active' : 'list-chip'}
              onClick={() => {
                if (activeList?.id === list.id) return;
                setListId(list.id);
                setStep('loading');
              }}
            >
              {list.name}
            </button>
          ))}
        </div>

        {step === 'loading' && <LoadingState label={`Checking ${activeList?.name || 'your list'} against the route`} />}
        {step === 'routing' && <LoadingState label="Drawing your curated route" />}

        {step === 'empty' && (
          <div className="empty-state compact">
            <h3>No places from this list are nearby</h3>
            <p>SideQuest checked this route against {activeList?.name || 'the selected list'}.</p>
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
              Draw Route From {activeList?.name || 'List'}
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
                <small>Places</small>
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
