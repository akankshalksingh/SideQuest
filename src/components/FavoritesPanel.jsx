import { Folder, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import CategoryIcon from './CategoryIcon.jsx';
import CreateCollectionModal from './CreateCollectionModal.jsx';
import { CATEGORIES, removeFavorite } from '../utils/favorites.js';

export default function FavoritesPanel({ favorites, setFavorites, lists, setLists }) {
  const [search, setSearch] = useState('');
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredLists = normalizedSearch
    ? lists.filter((list) => list.name.toLowerCase().includes(normalizedSearch))
    : lists;

  function handleRemove(id) {
    const result = removeFavorite(favorites, id);
    setFavorites(result.favorites);
  }

  return (
    <div className="favorites-view">
      <div className="section-heading">
        <p className="eyebrow">
          {lists.length} collection{lists.length === 1 ? '' : 's'} · {favorites.length} anchors
        </p>
        <h1>Your route collections</h1>
      </div>

      <div className="collection-toolbar">
        <label className="search-field collection-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={search}
            placeholder="Search collections"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button type="button" className="primary-action" onClick={() => setShowCreateCollection(true)}>
          <Plus size={18} aria-hidden="true" />
          Create Collection
        </button>
      </div>

      <div className="list-stack">
        {filteredLists.map((list) => {
          const listPlaces = favorites.filter((favorite) => favorite.listId === list.id);

          return (
            <section className="route-list-card" key={list.id}>
              <div className="route-list-header">
                <span className="category-dot" style={{ '--dot-color': list.color }}>
                  <Folder size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2>{list.name}</h2>
                  <p>
                    {listPlaces.length} route anchor{listPlaces.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              {listPlaces.length > 0 ? (
                <ul className="favorite-list compact-list">
                  {listPlaces.map((favorite) => {
                    const category = CATEGORIES[favorite.category] || CATEGORIES.other;

                    return (
                      <li className="favorite-row" key={favorite.id}>
                        <span className="category-dot" style={{ '--dot-color': category.color }}>
                          <CategoryIcon icon={category.icon} />
                        </span>
                        <span className="favorite-copy">
                          <strong>{favorite.name}</strong>
                          <span>{favorite.address || category.label}</span>
                        </span>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Remove ${favorite.name}`}
                          onClick={() => handleRemove(favorite.id)}
                        >
                          <Trash2 size={18} aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="helper-text">Add anchors like Marina Green or Great Highway to shape this route.</p>
              )}
            </section>
          );
        })}
      </div>

      {filteredLists.length === 0 && (
        <div className="empty-state compact">
          <h2>No collections found</h2>
          <p>Try a different search or create a new collection.</p>
        </div>
      )}

      {showCreateCollection && (
        <CreateCollectionModal
          lists={lists}
          setLists={setLists}
          onClose={() => setShowCreateCollection(false)}
        />
      )}
    </div>
  );
}
