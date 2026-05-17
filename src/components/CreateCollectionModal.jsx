import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { addList } from '../utils/favorites.js';

export default function CreateCollectionModal({ lists, setLists, onClose }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    const result = addList(lists, name);
    setError(result.error);
    setLists(result.lists);
    if (result.list) onClose();
  }

  return (
    <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section className="sheet compact-sheet" role="dialog" aria-modal="true" aria-label="Create collection">
        <div className="sheet-header">
          <div>
            <p className="eyebrow">New collection</p>
            <h2>Name your route set</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            autoFocus
            placeholder="Scenic Route, No Embarcadero..."
            onChange={(event) => setName(event.target.value)}
          />
          {error && <p className="helper-text error-text">{error}</p>}
          <button type="submit" className="primary-action">
            <Plus size={18} aria-hidden="true" />
            Create Collection
          </button>
        </form>
      </section>
    </div>
  );
}
