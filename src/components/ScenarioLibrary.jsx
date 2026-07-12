import React, { useState } from 'react';
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import {
  buildScenarioState,
  deleteNamedScenario,
  listNamedScenarios,
  loadNamedScenario,
  saveNamedScenario,
} from '../utils/scenarioStorage';
import { useLocale } from '../i18n/LocaleContext';

const ScenarioLibrary = ({ isOpen, toggle, currentState, onLoadScenario }) => {
  const { locale, t } = useLocale();
  const [entries, setEntries] = useState(() => listNamedScenarios());
  const [name, setName] = useState('');

  const refresh = () => setEntries(listNamedScenarios());

  const handleSave = () => {
    saveNamedScenario(name, currentState, locale);
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
      <ModalHeader toggle={toggle}>{t('library.title')}</ModalHeader>
      <ModalBody>
        <FormGroup>
          <Label for="scenarioName">{t('library.saveCurrent')}</Label>
          <div className="library-save-row">
            <Input
              id="scenarioName"
              value={name}
              placeholder={t('library.namePlaceholder')}
              onChange={(e) => setName(e.target.value)}
            />
            <Button color="primary" onClick={handleSave} disabled={!name.trim()}>
              {t('library.save')}
            </Button>
          </div>
        </FormGroup>

        {entries.length === 0 ? (
          <p className="library-empty">{t('library.empty')}</p>
        ) : (
          <ul className="library-list">
            {entries.map((entry) => (
              <li key={entry.id} className="library-list__item">
                <div>
                  <strong>{entry.name}</strong>
                  <span className="library-list__meta">
                    {new Date(entry.savedAt).toLocaleString(locale === 'en' ? 'en-US' : 'ru-RU')}
                  </span>
                </div>
                <div className="library-list__actions">
                  <Button size="sm" color="primary" outline onClick={() => handleLoad(entry.id)}>
                    {t('library.load')}
                  </Button>
                  <Button size="sm" color="danger" outline onClick={() => handleDelete(entry.id)}>
                    {t('library.delete')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle}>
          {t('library.close')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ScenarioLibrary;
