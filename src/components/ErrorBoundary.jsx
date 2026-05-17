import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('SideQuest render failed', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="app-shell centered">
          <section className="status-panel">
            <AlertTriangle aria-hidden="true" />
            <h1>SideQuest hit a snag</h1>
            <p>{this.state.error.message || 'Refresh the page and try again.'}</p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
