import { Check, Loader2, Route, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import CategoryIcon from './CategoryIcon.jsx';
import { CATEGORIES } from '../utils/favorites.js';
import {
  formatDistance,
  formatDuration,
  getDirectRoute,
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
  const [routeAnchors, setRouteAnchors] = useState([]);
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

  const selectedAnchors = useMemo(
    () => routeAnchors.filter((favorite) => selected.has(favorite.id)),
    [routeAnchors, selected],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadRouteList() {
      try {
        const directRoute = await getDirectRoute(origin, destination);
        if (cancelled) return;

        setDirectInfo({
          duration: formatDuration(directRoute.durationSeconds),
          distance: formatDistance(directRoute.distanceMeters),
        });
        setRouteAnchors(listPlaces);
        setSelected(new Set(listPlaces.map((favorite) => favorite.id)));
        setStep(listPlaces.length ? 'pick' : 'empty');
      } catch (error) {
        if (!cancelled) {
          setErrorMsg(error.message);
          setStep('error');
        }
      }
    }

    loadRouteList();

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
    if (!selectedAnchors.length) return;

    setStep('routing');
    setErrorMsg('');

    try {
      const result = await getRouteWithWaypoints(origin, destination, selectedAnchors);
      directionsRenderer.setDirections(result);
      const summary = summarizeRoute(result);
      setRouteInfo({ ...summary, anchors: selectedAnchors.length });
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
            <h2>Choose a collection</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="list-picker modal-list-picker" aria-label="Route collection">
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

        {step === 'loading' && <LoadingState label={`Loading ${activeList?.name || 'your collection'}`} />}
        {step === 'routing' && <LoadingState label="Drawing one curated route" />}

        {step === 'empty' && (
          <div className="empty-state compact">
            <h3>This collection is empty</h3>
            <p>Add places like Marina Green as route anchors, not stops.</p>
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
              {routeAnchors.map((favorite) => {
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
              disabled={!selectedAnchors.length}
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
                <strong>{routeInfo.anchors}</strong>
                <small>Via points</small>
              </span>
            </div>
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
