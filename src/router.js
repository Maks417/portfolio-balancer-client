const BASENAME = '/portfolio-balancer-client';

function normalizePath(pathname) {
  let path = pathname || '/';
  if (path.startsWith(BASENAME)) {
    path = path.slice(BASENAME.length) || '/';
  }
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return path;
}

export function getPath() {
  return normalizePath(window.location.pathname);
}

export function hrefFor(path) {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${BASENAME}${clean === '/' ? '/' : clean}`;
}

export function navigate(path, { replace = false } = {}) {
  const url = hrefFor(path);
  if (replace) {
    window.history.replaceState({}, '', url);
  } else {
    window.history.pushState({}, '', url);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function createRouter({ outlet, routes }) {
  let cleanup = null;

  const render = () => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }

    const path = getPath();
    const match = routes.find((route) => route.path === path) ?? routes.find((route) => route.path === '*');
    outlet.replaceChildren();
    if (match?.mount) {
      cleanup = match.mount(outlet) || null;
    }
  };

  const onClick = (event) => {
    const link = event.target.closest('a[data-link]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http')) {
      return;
    }
    event.preventDefault();
    navigate(normalizePath(href.replace(window.location.origin, '')));
  };

  window.addEventListener('popstate', render);
  document.addEventListener('click', onClick);
  render();

  return () => {
    window.removeEventListener('popstate', render);
    document.removeEventListener('click', onClick);
    if (cleanup) {
      cleanup();
    }
  };
}
