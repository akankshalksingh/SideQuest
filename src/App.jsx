import { AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import Header from './components/Header.jsx';
import FavoritesPanel from './components/FavoritesPanel.jsx';
import MapPage from './pages/MapPage.jsx';
import { useGoogleMaps } from './hooks/useGoogleMaps.js';
import { loadFavorites } from './utils/favorites.js';

export default function App() {
  const { isLoaded, error } = useGoogleMaps();
  const [activeTab, setActiveTab] = useState('map');
  const [favorites, setFavorites] = useState(loadFavorites);

  if (error) {
    return (
      <main className="app-shell centered">
        <section className="status-panel">
          <AlertTriangle aria-hidden="true" />
          <h1>SideQuest needs Google Maps</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  if (!isLoaded) {
    return (
      <main className="app-shell centered">
        <section className="status-panel">
          <Loader2 className="spin" aria-hidden="true" />
          <h1>Loading SideQuest</h1>
          <p>Getting the map ready.</p>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="app-main">
        <section className={activeTab === 'map' ? 'tab-panel active' : 'tab-panel'}>
          <MapPage favorites={favorites} setFavorites={setFavorites} />
        </section>
        <section className={activeTab === 'favorites' ? 'tab-panel active' : 'tab-panel'}>
          <FavoritesPanel favorites={favorites} setFavorites={setFavorites} />
        </section>
      </main>
    </div>
  );
}
