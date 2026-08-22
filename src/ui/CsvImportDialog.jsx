import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../locale';
import '../sass/_dialogs.scss';

export function CsvImportDialog({ open, onClose, onImport }) {
  const { t, locale } = useLocale();
  const dialogRef = useRef(null);
  const textareaRef = useRef(null);
  const [csvText, setCsvText] = useState('');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return undefined;
    }

    if (open) {
      setCsvText('');
      setError('');
      if (!dialog.open) {
        dialog.showModal();
      }
      requestAnimationFrame(() => textareaRef.current?.focus());
    } else if (dialog.open) {
      dialog.close();
    }

    return undefined;
  }, [open]);

  const handleClose = () => {
    setCsvText('');
    setError('');
    onClose();
  };

  const handleImport = async () => {
    if (!csvText.trim()) {
      return;
    }
    setImporting(true);
    setError('');
    try {
      const { parsePositionsCsv } = await import('../utils/csvImport');
      const result = await parsePositionsCsv(csvText, locale);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onImport(result.assets);
      handleClose();
    } finally {
      setImporting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      id="csv-import-dialog"
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
          <h2>{t('csv.title')}</h2>
          <button type="submit" value="cancel" className="btn btn-link" aria-label={t('csv.cancel')}>
            ×
          </button>
        </header>
        <div className="app-dialog__body">
          <p>{t('csv.description')}</p>
          <div className="form-group">
            <label htmlFor="csvText">{t('csv.data')}</label>
            <textarea
              ref={textareaRef}
              id="csvText"
              className="form-control"
              rows={8}
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              placeholder={'class,value,currency\nstocks,100000,rub\nbonds,50000,rub'}
            />
          </div>
          {error ? <p className="field-error">{error}</p> : null}
        </div>
        <footer className="app-dialog__footer">
          <button type="submit" value="cancel" className="btn btn-outline-secondary">
            {t('csv.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={importing}
            onClick={handleImport}
          >
            {t('csv.import')}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
