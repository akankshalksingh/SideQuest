export const FAVORITES_KEY = 'sidequest_favorites';
export const MAX_FAVORITES = 200;

export const CATEGORIES = {
  coffee: { label: 'Coffee', icon: 'Coffee', color: 'var(--cat-coffee)' },
  food: { label: 'Food', icon: 'Utensils', color: 'var(--cat-food)' },
  gas: { label: 'Gas', icon: 'Fuel', color: 'var(--cat-gas)' },
  shopping: { label: 'Shopping', icon: 'ShoppingBag', color: 'var(--cat-shopping)' },
  other: { label: 'Other', icon: 'MapPin', color: 'var(--cat-other)' },
};

function normalizeFavorite(favorite) {
  if (!favorite || typeof favorite !== 'object') return null;
  if (!Number.isFinite(favorite.lat) || !Number.isFinite(favorite.lng)) return null;

  return {
    id: String(favorite.id || crypto.randomUUID()),
    name: String(favorite.name || 'Saved place'),
    address: String(favorite.address || ''),
    lat: favorite.lat,
    lng: favorite.lng,
    category: CATEGORIES[favorite.category] ? favorite.category : 'other',
    placeId: favorite.placeId || null,
    addedAt: favorite.addedAt || new Date().toISOString(),
  };
}

export function loadFavorites() {
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeFavorite).filter(Boolean).slice(0, MAX_FAVORITES);
  } catch {
    return [];
  }
}

export function saveFavorites(favorites) {
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    return { ok: true, error: '' };
  } catch {
    return {
      ok: false,
      error: 'Favorites could not be saved. Browser storage may be full or disabled.',
    };
  }
}

export function addFavorite(favorites, place, category) {
  const placeId = place.place_id || null;
  if (placeId && favorites.some((favorite) => favorite.placeId === placeId)) {
    return {
      favorites,
      error: 'That place is already in your favorites.',
      added: false,
    };
  }

  if (favorites.length >= MAX_FAVORITES) {
    return {
      favorites,
      error: `You can save up to ${MAX_FAVORITES} favorites for this version of SideQuest.`,
      added: false,
    };
  }

  const location = place.geometry?.location;
  const favorite = {
    id: Date.now().toString(),
    name: place.name || 'Saved place',
    address: place.formatted_address || place.vicinity || '',
    lat: location.lat(),
    lng: location.lng(),
    category: CATEGORIES[category] ? category : 'other',
    placeId,
    addedAt: new Date().toISOString(),
  };

  const nextFavorites = [favorite, ...favorites];
  const result = saveFavorites(nextFavorites);

  return {
    favorites: result.ok ? nextFavorites : favorites,
    error: result.error,
    added: result.ok,
  };
}

export function removeFavorite(favorites, id) {
  const nextFavorites = favorites.filter((favorite) => favorite.id !== id);
  const result = saveFavorites(nextFavorites);

  return {
    favorites: result.ok ? nextFavorites : favorites,
    error: result.error,
  };
}
