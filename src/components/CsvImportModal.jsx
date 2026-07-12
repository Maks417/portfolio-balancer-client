import React, { useState } from 'react';
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import { parsePositionsCsv } from '../utils/csvImport';

const CsvImportModal = ({ isOpen, toggle, onImport }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const handleImport = () => {
    const result = parsePositionsCsv(text);
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
      <ModalHeader toggle={toggle}>Импорт позиций из CSV</ModalHeader>
      <ModalBody>
        <p>
          Вставьте CSV с колонками <code>класс, сумма, валюта</code> или экспорт брокера
          (Tinkoff и др.). Классы: акции, облигации, наличные.
        </p>
        <FormGroup>
          <Label for="csvText">Данные CSV</Label>
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
          Отмена
        </Button>
        <Button color="primary" onClick={handleImport} disabled={!text.trim()}>
          Импортировать
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default CsvImportModal;
