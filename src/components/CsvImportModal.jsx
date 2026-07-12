import React, { useState } from 'react';
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import { parsePositionsCsv } from '../utils/csvImport';
import { useLocale } from '../i18n/LocaleContext';

const CsvImportModal = ({ isOpen, toggle, onImport }) => {
  const { locale, t } = useLocale();
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const handleImport = () => {
    const result = parsePositionsCsv(text, locale);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    onImport(result.assets);
    setText('');
    setError('');
    toggle();
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>{t('csv.title')}</ModalHeader>
      <ModalBody>
        <p>{t('csv.description')}</p>
        <FormGroup>
          <Label for="csvText">{t('csv.data')}</Label>
          <Input
            id="csvText"
            type="textarea"
            rows="8"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError('');
            }}
            placeholder={'class,value,currency\nstocks,100000,rub\nbonds,50000,rub'}
          />
        </FormGroup>
        {error && <p className="text-danger">{error}</p>}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle}>
          {t('csv.cancel')}
        </Button>
        <Button color="primary" onClick={handleImport} disabled={!text.trim()}>
          {t('csv.import')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default CsvImportModal;
