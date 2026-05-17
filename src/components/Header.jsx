import { Folder, Map } from 'lucide-react';

export default function Header({ activeTab, setActiveTab }) {
  return (
    <header className="topbar">
      <button className="brand" type="button" onClick={() => setActiveTab('map')}>
        <span className="brand-mark">↗</span>
        <span>SideQuest</span>
      </button>

      <nav className="tabs" aria-label="Primary">
        <button
          type="button"
          className={activeTab === 'map' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('map')}
        >
          <Map size={18} aria-hidden="true" />
          <span>Map</span>
        </button>
        <button
          type="button"
          className={activeTab === 'lists' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('lists')}
        >
          <Folder size={18} aria-hidden="true" />
          <span>Lists</span>
        </button>
      </nav>
    </header>
  );
}
