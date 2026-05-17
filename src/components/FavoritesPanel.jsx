import { Folder, Trash2 } from 'lucide-react';
import { useState } from 'react';
import CategoryIcon from './CategoryIcon.jsx';
import { CATEGORIES, addList, removeFavorite } from '../utils/favorites.js';

export default function FavoritesPanel({ favorites, setFavorites, lists, setLists }) {
  const [collectionName, setCollectionName] = useState('');
  const [collectionError, setCollectionError] = useState('');

  function handleRemove(id) {
    const result = removeFavorite(favorites, id);
    setFavorites(result.favorites);
  }

  function handleCreateCollection(event) {
    event.preventDefault();
    const result = addList(lists, collectionName);
    setCollectionError(result.error);
    setLists(result.lists);
    if (result.list) setCollectionName('');
  }

  return (
    <div className="favorites-view">
      <div className="section-heading">
        <p className="eyebrow">
          {lists.length} collection{lists.length === 1 ? '' : 's'} · {favorites.length} anchors
        </p>
        <h1>Your route collections</h1>
      </div>

      <form className="collection-create" onSubmit={handleCreateCollection}>
        <input
          type="text"
          value={collectionName}
          placeholder="Name a collection, e.g. Scenic Route"
          onChange={(event) => setCollectionName(event.target.value)}
        />
        <button type="submit" className="primary-action">
          Create Collection
        </button>
      </form>
      {collectionError && <p className="helper-text error-text">{collectionError}</p>}

      <div className="list-stack">
        {lists.map((list) => {
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
    </div>
  );
}
