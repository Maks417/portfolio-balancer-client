import {
  deleteNamedScenario,
  listNamedScenarios,
  loadNamedScenario,
  saveNamedScenario,
} from '../utils/scenarioStorage';
import { getLocale, t } from '../locale';
import { escapeHtml } from './dom';

function renderEntries(listEl) {
  const entries = listNamedScenarios();
  if (entries.length === 0) {
    listEl.innerHTML = `<p class="library-empty">${escapeHtml(t('library.empty'))}</p>`;
    return;
  }

  const locale = getLocale() === 'en' ? 'en-US' : 'ru-RU';
  listEl.innerHTML = `
    <ul class="library-list">
      ${entries
        .map(
          (entry) => `
        <li class="library-list__item" data-id="${escapeHtml(entry.id)}">
          <div>
            <strong>${escapeHtml(entry.name)}</strong>
            <span class="library-list__meta">${escapeHtml(new Date(entry.savedAt).toLocaleString(locale))}</span>
          </div>
          <div class="library-list__actions">
            <button type="button" class="btn btn-sm btn-outline-secondary" data-action="library-load">${escapeHtml(t('library.load'))}</button>
            <button type="button" class="btn btn-sm btn-outline-danger" data-action="library-delete">${escapeHtml(t('library.delete'))}</button>
          </div>
        </li>`,
        )
        .join('')}
    </ul>
  `;
}

export function openScenarioLibraryDialog({ currentState, onLoadScenario }) {
  const existing = document.getElementById('scenario-library-dialog');
  if (existing) {
    existing.remove();
  }

  const dialog = document.createElement('dialog');
  dialog.id = 'scenario-library-dialog';
  dialog.className = 'app-dialog';
  dialog.innerHTML = `
    <form method="dialog" class="app-dialog__form">
      <header class="app-dialog__header">
        <h2>${escapeHtml(t('library.title'))}</h2>
        <button type="submit" value="cancel" class="btn btn-link" aria-label="${escapeHtml(t('library.close'))}">×</button>
      </header>
      <div class="app-dialog__body">
        <div class="form-group">
          <label for="scenarioName">${escapeHtml(t('library.saveCurrent'))}</label>
          <div class="library-save-row">
            <input id="scenarioName" class="form-control" placeholder="${escapeHtml(t('library.namePlaceholder'))}" />
            <button type="button" class="btn btn-primary" data-action="library-save" disabled>${escapeHtml(t('library.save'))}</button>
          </div>
        </div>
        <div data-library-list></div>
      </div>
      <footer class="app-dialog__footer">
        <button type="submit" value="cancel" class="btn btn-outline-secondary">${escapeHtml(t('library.close'))}</button>
      </footer>
    </form>
  `;

  document.body.appendChild(dialog);

  const nameInput = dialog.querySelector('#scenarioName');
  const saveBtn = dialog.querySelector('[data-action="library-save"]');
  const listEl = dialog.querySelector('[data-library-list]');

  const refresh = () => renderEntries(listEl);
  refresh();

  nameInput.addEventListener('input', () => {
    saveBtn.disabled = !nameInput.value.trim();
  });

  saveBtn.addEventListener('click', () => {
    if (!nameInput.value.trim()) {
      return;
    }
    saveNamedScenario(nameInput.value, currentState, getLocale());
    nameInput.value = '';
    saveBtn.disabled = true;
    refresh();
  });

  listEl.addEventListener('click', (event) => {
    const item = event.target.closest('[data-id]');
    if (!item) {
      return;
    }
    const id = item.getAttribute('data-id');
    if (event.target.closest('[data-action="library-load"]')) {
      const state = loadNamedScenario(id);
      if (state) {
        onLoadScenario(state);
        dialog.close();
      }
      return;
    }
    if (event.target.closest('[data-action="library-delete"]')) {
      deleteNamedScenario(id);
      refresh();
    }
  });

  dialog.addEventListener('close', () => dialog.remove());
  dialog.showModal();
  nameInput.focus();
}
