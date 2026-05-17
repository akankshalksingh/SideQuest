export const FAVORITES_KEY = 'sidequest_favorites';
export const LISTS_KEY = 'sidequest_lists';
export const MAX_FAVORITES = 200;
export const DEFAULT_LIST_ID = 'default-list';

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
    listId: favorite.listId || DEFAULT_LIST_ID,
    placeId: favorite.placeId || null,
    addedAt: favorite.addedAt || new Date().toISOString(),
  };
}

function normalizeList(list) {
  if (!list || typeof list !== 'object') return null;

  return {
    id: String(list.id || crypto.randomUUID()),
    name: String(list.name || 'My Route List'),
    color: String(list.color || 'var(--accent)'),
    createdAt: list.createdAt || new Date().toISOString(),
  };
}

export function loadLists() {
  try {
    const raw = window.localStorage.getItem(LISTS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const lists = Array.isArray(parsed) ? parsed.map(normalizeList).filter(Boolean) : [];
    return lists.length ? lists : getDefaultLists();
  } catch {
    return getDefaultLists();
  }
}

function getDefaultLists() {
  return [
    {
      id: DEFAULT_LIST_ID,
      name: 'My Route List',
      color: 'var(--accent)',
      createdAt: new Date().toISOString(),
    },
  ];
}

export function saveLists(lists) {
  try {
    window.localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
    return { ok: true, error: '' };
  } catch {
    return {
      ok: false,
      error: 'Lists could not be saved. Browser storage may be full or disabled.',
    };
  }
}

export function addList(lists, name) {
  const cleanName = name.trim();
  if (!cleanName) {
    return { lists, list: null, error: 'Name the list before creating it.' };
  }

  const duplicate = lists.find((list) => list.name.toLowerCase() === cleanName.toLowerCase());
  if (duplicate) {
    return { lists, list: duplicate, error: '' };
  }

  const list = {
    id: Date.now().toString(),
    name: cleanName,
    color: 'var(--accent)',
    createdAt: new Date().toISOString(),
  };
  const nextLists = [list, ...lists];
  const result = saveLists(nextLists);

  return {
    lists: result.ok ? nextLists : lists,
    list: result.ok ? list : null,
    error: result.error,
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

export function addFavorite(favorites, place, category, listId = DEFAULT_LIST_ID) {
  const placeId = place.place_id || null;
  if (placeId && favorites.some((favorite) => favorite.placeId === placeId && favorite.listId === listId)) {
    return {
      favorites,
      error: 'That place is already in this list.',
      added: false,
    };
  }

  if (favorites.length >= MAX_FAVORITES) {
    return {
      favorites,
      error: `You can save up to ${MAX_FAVORITES} route anchors for this version of SideQuest.`,
      added: false,
    };
  }

  const location = place.geometry?.location;
  const lat = typeof location?.lat === 'function' ? location.lat() : location?.lat;
  const lng = typeof location?.lng === 'function' ? location.lng() : location?.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      favorites,
      error: 'That route anchor could not be saved because it has no location.',
      added: false,
    };
  }

  const favorite = {
    id: Date.now().toString(),
    name: place.name || 'Saved place',
    address: place.formatted_address || place.vicinity || '',
    lat,
    lng,
    category: CATEGORIES[category] ? category : 'other',
    listId,
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
