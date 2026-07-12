export function trackEvent(name, payload = {}) {
  const analyticsUrl = import.meta.env.VITE_ANALYTICS_URL;
  if (!analyticsUrl || typeof window === 'undefined') {
    return;
  }

  try {
    if (window.umami?.track) {
      window.umami.track(name, payload);
      return;
    }

    if (window.plausible) {
      window.plausible(name, { props: payload });
    }
  } catch {
    // Ignore analytics failures.
  }
}

export function initAnalytics() {
  const analyticsUrl = import.meta.env.VITE_ANALYTICS_URL;
  if (!analyticsUrl || typeof document === 'undefined') {
    return;
  }

  if (document.querySelector(`script[data-analytics="portfolio-balancer"]`)) {
    return;
  }

  const script = document.createElement('script');
  script.src = analyticsUrl;
  script.defer = true;
  script.dataset.analytics = 'portfolio-balancer';
  document.head.appendChild(script);
}
