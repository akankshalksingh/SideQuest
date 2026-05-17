import { Check, Plus, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import CategoryIcon from './CategoryIcon.jsx';
import { CATEGORIES, addList } from '../utils/favorites.js';

export default function AddFavoriteModal({ lists, setLists, onClose, onAdd }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [category, setCategory] = useState('other');
  const [listId, setListId] = useState(lists[0]?.id || '');
  const [newListName, setNewListName] = useState('');
  const [listError, setListError] = useState('');

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
    onAdd(selected, category, listId);
  }

  function handleCreateList() {
    const result = addList(lists, newListName);
    setListError(result.error);
    setLists(result.lists);
    if (result.list) {
      setListId(result.list.id);
      setNewListName('');
    }
  }

  return (
    <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label="Add a route anchor to a collection">
        <div className="sheet-header">
          <div>
            <p className="eyebrow">Collection anchor</p>
            <h2>Add pass-through point</h2>
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
            placeholder="Marina Green, Presidio, Great Highway..."
            autoComplete="off"
            onChange={() => setSelected(null)}
          />
        </label>

        <div className="list-picker" aria-label="Route collection">
          {lists.map((list) => (
            <button
              key={list.id}
              type="button"
              className={listId === list.id ? 'list-chip active' : 'list-chip'}
              onClick={() => setListId(list.id)}
            >
              {list.name}
            </button>
          ))}
        </div>

        <div className="new-list-row">
          <input
            type="text"
            value={newListName}
            placeholder="New collection name, e.g. No Embarcadero"
            onChange={(event) => setNewListName(event.target.value)}
          />
          <button type="button" className="icon-button" aria-label="Create list" onClick={handleCreateList}>
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>
        {listError && <p className="helper-text error-text">{listError}</p>}

        <div className="category-grid" aria-label="Place type">
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
          <p className="helper-text">Choose a place you want the drive to pass through, without making it a stop.</p>
        )}

        <button type="button" className="primary-action" disabled={!selected || !listId} onClick={handleSave}>
          Add to Collection
        </button>
      </section>
    </div>
  );
}
