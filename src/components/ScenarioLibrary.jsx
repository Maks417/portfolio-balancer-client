import React, { useState } from 'react';
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import {
  buildScenarioState,
  deleteNamedScenario,
  listNamedScenarios,
  loadNamedScenario,
  saveNamedScenario,
} from '../utils/scenarioStorage';

const ScenarioLibrary = ({ isOpen, toggle, currentState, onLoadScenario }) => {
  const [entries, setEntries] = useState(() => listNamedScenarios());
  const [name, setName] = useState('');

  const refresh = () => setEntries(listNamedScenarios());

  const handleSave = () => {
    saveNamedScenario(name, currentState);
    setName('');
    refresh();
  };

  const handleLoad = (id) => {
    const state = loadNamedScenario(id);
    if (state) {
      onLoadScenario(state);
      toggle();
    }
  };

  const handleDelete = (id) => {
    deleteNamedScenario(id);
    refresh();
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>Библиотека сценариев</ModalHeader>
      <ModalBody>
        <FormGroup>
          <Label for="scenarioName">Сохранить текущий сценарий</Label>
          <div className="library-save-row">
            <Input
              id="scenarioName"
              value={name}
              placeholder="Название сценария"
              onChange={(e) => setName(e.target.value)}
            />
            <Button color="primary" onClick={handleSave} disabled={!name.trim()}>
              Сохранить
            </Button>
          </div>
        </FormGroup>

        {entries.length === 0 ? (
          <p className="library-empty">Сохранённых сценариев пока нет.</p>
        ) : (
          <ul className="library-list">
            {entries.map((entry) => (
              <li key={entry.id} className="library-list__item">
                <div>
                  <strong>{entry.name}</strong>
                  <span className="library-list__meta">
                    {new Date(entry.savedAt).toLocaleString('ru-RU')}
                  </span>
                </div>
                <div className="library-list__actions">
                  <Button size="sm" color="primary" outline onClick={() => handleLoad(entry.id)}>
                    Загрузить
                  </Button>
                  <Button size="sm" color="danger" outline onClick={() => handleDelete(entry.id)}>
                    Удалить
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle}>
          Закрыть
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ScenarioLibrary;
