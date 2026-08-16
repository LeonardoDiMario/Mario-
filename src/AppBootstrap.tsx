import App from './App';
import './characterAvatarFallback';

// Keep the React app as-is, but force a fresh server-state read after a successful Daily Claim.
// This fixes the UI showing the old Energy/cooldown because the parent state is loaded on startup.
if (typeof window !== 'undefined') {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await nativeFetch(input, init);

    try {
      const requestUrl = typeof input === 'string'
        ? input
        : input instanceof Request
          ? input.url
          : input.toString();

      if (requestUrl.includes('/rubychan-rewards-v2?route=claim-daily') && response.ok) {
        const data = await response.clone().json();
        if (data?.success) {
          window.setTimeout(() => window.location.reload(), 75);
        }
      }
    } catch {
      // Do not interfere with the original response if refresh detection fails.
    }

    return response;
  };
}

export default App;
