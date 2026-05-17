import { Folder, Trash2 } from 'lucide-react';
import CategoryIcon from './CategoryIcon.jsx';
import { CATEGORIES, removeFavorite } from '../utils/favorites.js';

export default function FavoritesPanel({ favorites, setFavorites, lists }) {
  function handleRemove(id) {
    const result = removeFavorite(favorites, id);
    setFavorites(result.favorites);
  }

  return (
    <div className="favorites-view">
      <div className="section-heading">
        <p className="eyebrow">
          {lists.length} list{lists.length === 1 ? '' : 's'} · {favorites.length} anchors
        </p>
        <h1>Your route lists</h1>
      </div>

      {favorites.length === 0 ? (
        <div className="empty-state">
          <h2>No lists built yet</h2>
          <p>Create lists like Scenic Route or No Embarcadero, then add pass-through points.</p>
        </div>
      ) : (
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
                  <p className="helper-text">This list is ready for route anchors.</p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
