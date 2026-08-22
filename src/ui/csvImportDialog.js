import { parsePositionsCsv } from '../utils/csvImport';
import { getLocale, t } from '../locale';
import { escapeHtml } from './dom';

export function openCsvImportDialog({ onImport }) {
  const existing = document.getElementById('csv-import-dialog');
  if (existing) {
    existing.remove();
  }

  const dialog = document.createElement('dialog');
  dialog.id = 'csv-import-dialog';
  dialog.className = 'app-dialog';
  dialog.innerHTML = `
    <form method="dialog" class="app-dialog__form">
      <header class="app-dialog__header">
        <h2>${escapeHtml(t('csv.title'))}</h2>
        <button type="submit" value="cancel" class="btn btn-link" aria-label="${escapeHtml(t('csv.cancel'))}">×</button>
      </header>
      <div class="app-dialog__body">
        <p>${escapeHtml(t('csv.description'))}</p>
        <div class="form-group">
          <label for="csvText">${escapeHtml(t('csv.data'))}</label>
          <textarea id="csvText" class="form-control" rows="8" placeholder="class,value,currency&#10;stocks,100000,rub&#10;bonds,50000,rub"></textarea>
        </div>
        <p class="field-error" data-csv-error hidden></p>
      </div>
      <footer class="app-dialog__footer">
        <button type="submit" value="cancel" class="btn btn-outline-secondary">${escapeHtml(t('csv.cancel'))}</button>
        <button type="button" class="btn btn-primary" data-action="csv-import">${escapeHtml(t('csv.import'))}</button>
      </footer>
    </form>
  `;

  document.body.appendChild(dialog);

  const textarea = dialog.querySelector('#csvText');
  const errorEl = dialog.querySelector('[data-csv-error]');
  const importBtn = dialog.querySelector('[data-action="csv-import"]');

  const close = () => {
    dialog.close();
    dialog.remove();
  };

  importBtn.addEventListener('click', () => {
    const text = textarea.value;
    if (!text.trim()) {
      return;
    }
    const result = parsePositionsCsv(text, getLocale());
    if (!result.ok) {
      errorEl.hidden = false;
      errorEl.textContent = result.error;
      return;
    }
    onImport(result.assets);
    close();
  });

  dialog.addEventListener('close', () => dialog.remove());
  dialog.showModal();
  textarea.focus();
}
