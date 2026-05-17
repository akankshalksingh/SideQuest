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
        <h1>Favorite stops</h1>
      </div>

      {favorites.length === 0 ? (
        <div className="empty-state">
          <h2>No favorites yet</h2>
          <p>Save coffee, food, gas, shops, or any place you want SideQuest to find later.</p>
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
