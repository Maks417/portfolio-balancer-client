import { useEffect, useRef, useState } from 'react';
import {
  deleteNamedScenario,
  listNamedScenarios,
  loadNamedScenario,
  saveNamedScenario,
} from '../utils/scenarioStorage';
import { useLocale } from '../locale';
import '../sass/_dialogs.scss';

export function ScenarioLibraryDialog({ open, onClose, currentState, onLoadScenario }) {
  const { t, locale } = useLocale();
  const dialogRef = useRef(null);
  const nameInputRef = useRef(null);
  const [name, setName] = useState('');
  const [entries, setEntries] = useState(() => listNamedScenarios());

  const refresh = () => setEntries(listNamedScenarios());

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return undefined;
    }

    if (open) {
      setName('');
      refresh();
      if (!dialog.open) {
        dialog.showModal();
      }
      requestAnimationFrame(() => nameInputRef.current?.focus());
    } else if (dialog.open) {
      dialog.close();
    }

    return undefined;
  }, [open]);

  const handleClose = () => {
    setName('');
    onClose();
  };

  const handleSave = () => {
    if (!name.trim()) {
      return;
    }
    saveNamedScenario(name, currentState, locale);
    setName('');
    refresh();
  };

  const handleLoad = (id) => {
    const state = loadNamedScenario(id);
    if (state) {
      onLoadScenario(state);
      handleClose();
    }
  };

  const handleDelete = (id) => {
    deleteNamedScenario(id);
    refresh();
  };

  const dateLocale = locale === 'en' ? 'en-US' : 'ru-RU';

  return (
    <dialog
      ref={dialogRef}
      id="scenario-library-dialog"
      className="app-dialog"
      onClose={handleClose}
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
    >
      <form
        method="dialog"
        className="app-dialog__form"
        onSubmit={(event) => {
          event.preventDefault();
          handleClose();
        }}
      >
        <header className="app-dialog__header">
          <h2>{t('library.title')}</h2>
          <button type="submit" value="cancel" className="btn btn-link" aria-label={t('library.close')}>
            ×
          </button>
        </header>
        <div className="app-dialog__body">
          <div className="form-group">
            <label htmlFor="scenarioName">{t('library.saveCurrent')}</label>
            <div className="library-save-row">
              <input
                ref={nameInputRef}
                id="scenarioName"
                className="form-control"
                placeholder={t('library.namePlaceholder')}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary"
                disabled={!name.trim()}
                onClick={handleSave}
              >
                {t('library.save')}
              </button>
            </div>
          </div>
          <div data-library-list>
            {entries.length === 0 ? (
              <p className="library-empty">{t('library.empty')}</p>
            ) : (
              <ul className="library-list">
                {entries.map((entry) => (
                  <li className="library-list__item" data-id={entry.id} key={entry.id}>
                    <div>
                      <strong>{entry.name}</strong>
                      <span className="library-list__meta">
                        {new Date(entry.savedAt).toLocaleString(dateLocale)}
                      </span>
                    </div>
                    <div className="library-list__actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleLoad(entry.id)}
                      >
                        {t('library.load')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(entry.id)}
                      >
                        {t('library.delete')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <footer className="app-dialog__footer">
          <button type="submit" value="cancel" className="btn btn-outline-secondary">
            {t('library.close')}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
