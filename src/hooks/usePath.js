import { useSyncExternalStore } from 'react';
import { getPath } from '../router';

function subscribe(onStoreChange) {
  window.addEventListener('popstate', onStoreChange);
  return () => window.removeEventListener('popstate', onStoreChange);
}

export function usePath() {
  return useSyncExternalStore(subscribe, getPath, () => '/');
}
