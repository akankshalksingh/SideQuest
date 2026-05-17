import { Trash2 } from 'lucide-react';
import CategoryIcon from './CategoryIcon.jsx';
import { CATEGORIES, removeFavorite } from '../utils/favorites.js';

export default function FavoritesPanel({ favorites, setFavorites }) {
  function handleRemove(id) {
    const result = removeFavorite(favorites, id);
    setFavorites(result.favorites);
  }

  return (
    <div className="favorites-view">
      <div className="section-heading">
        <p className="eyebrow">{favorites.length} saved</p>
        <h1>Your places</h1>
      </div>

      {favorites.length === 0 ? (
        <div className="empty-state">
          <h2>No favorites yet</h2>
          <p>Save parks, neighborhoods, cafes, stores, or anything you want SideQuest to remember.</p>
        </div>
      ) : (
        <ul className="favorite-list">
          {favorites.map((favorite) => {
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
      )}
    </div>
  );
}
