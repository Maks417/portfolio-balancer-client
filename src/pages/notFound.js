import { hrefFor } from '../router';
import { t } from '../locale';
import { escapeHtml } from '../ui/dom';

export function mountNotFound(outlet) {
  const page = document.createElement('div');
  page.className = 'not-found-page';
  page.innerHTML = `
    <h1>${escapeHtml(t('notFound.title'))}</h1>
    <p><a data-link href="${hrefFor('/')}">${escapeHtml(t('notFound.back'))}</a></p>
  `;
  outlet.appendChild(page);
  return () => page.remove();
}
