import { Check, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import CategoryIcon from './CategoryIcon.jsx';
import { CATEGORIES } from '../utils/favorites.js';

export default function AddFavoriteModal({ onClose, onAdd }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [category, setCategory] = useState('other');

  useEffect(() => {
    if (!inputRef.current || autocompleteRef.current) return undefined;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ['geometry', 'name', 'formatted_address', 'vicinity', 'place_id'],
    });

    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      setSelected(place.geometry ? place : null);
    });

    return () => listener.remove();
  }, []);

  function handleSave() {
    if (!selected?.geometry) return;
    onAdd(selected, category);
  }

  return (
    <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label="Save a favorite">
        <div className="sheet-header">
          <div>
            <p className="eyebrow">New favorite</p>
            <h2>Save a stop</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            placeholder="Search for a place"
            autoComplete="off"
            onChange={() => setSelected(null)}
          />
        </label>

        <div className="category-grid" aria-label="Favorite category">
          {Object.entries(CATEGORIES).map(([key, item]) => (
            <button
              key={key}
              type="button"
              className={category === key ? 'category-choice active' : 'category-choice'}
              onClick={() => setCategory(key)}
              style={{ '--choice-color': item.color }}
            >
              <CategoryIcon icon={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {selected ? (
          <div className="selected-place">
            <Check size={18} aria-hidden="true" />
            <span>{selected.name}</span>
          </div>
        ) : (
          <p className="helper-text">Choose a result from the Google suggestions to save it.</p>
        )}

        <button type="button" className="primary-action" disabled={!selected} onClick={handleSave}>
          Save Favorite
        </button>
      </section>
    </div>
  );
}
