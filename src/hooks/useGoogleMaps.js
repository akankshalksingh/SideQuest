import { useEffect, useState } from 'react';

const SCRIPT_ID = 'sidequest-google-maps';
const CALLBACK_NAME = '__sidequestGoogleMapsReady';
const SCRIPT_TIMEOUT_MS = 15000;

export function useGoogleMaps() {
  const [state, setState] = useState({
    isLoaded: Boolean(window.google?.maps),
    error: '',
  });

  useEffect(() => {
    if (window.google?.maps) {
      setState({ isLoaded: true, error: '' });
      return undefined;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setState({
        isLoaded: false,
        error: 'Missing VITE_GOOGLE_MAPS_API_KEY. Add it to your environment variables.',
      });
      return undefined;
    }

    let timeoutId;
    const existingScript = document.getElementById(SCRIPT_ID);

    window[CALLBACK_NAME] = () => {
      window.clearTimeout(timeoutId);
      if (window.google?.maps) {
        setState({ isLoaded: true, error: '' });
      } else {
        setState({
          isLoaded: false,
          error: 'Google Maps loaded, but the Maps SDK was unavailable. Check API restrictions.',
        });
      }
    };

    const failSlowLoad = () => {
      setState({
        isLoaded: false,
        error: 'Google Maps took too long to load. Check your network and API key settings.',
      });
    };

    timeoutId = window.setTimeout(failSlowLoad, SCRIPT_TIMEOUT_MS);

    if (!existingScript) {
      const script = document.createElement('script');
      const params = new URLSearchParams({
        key: apiKey,
        libraries: 'places,geometry',
        callback: CALLBACK_NAME,
        v: 'weekly',
      });

      script.id = SCRIPT_ID;
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.onerror = () => {
        window.clearTimeout(timeoutId);
        setState({
          isLoaded: false,
          error: 'Unable to load Google Maps. Verify the API key, enabled APIs, and referrer rules.',
        });
      };
      document.head.appendChild(script);
    }

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return state;
}
