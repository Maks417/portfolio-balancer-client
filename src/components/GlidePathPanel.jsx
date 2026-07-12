import React, { useState } from 'react';
import { Button, FormGroup, Input, Label } from 'reactstrap';
import { computeGlidePathRatio, computeYearsToGoalRatio } from '../utils/glidePath';
import { useLocale } from '../i18n/LocaleContext';

const GlidePathPanel = ({ onApplyRatio }) => {
  const { t } = useLocale();
  const [mode, setMode] = useState('age');
  const [currentAge, setCurrentAge] = useState('35');
  const [retirementAge, setRetirementAge] = useState('65');
  const [yearsToGoal, setYearsToGoal] = useState('10');

  const handleApply = () => {
    const result =
      mode === 'age'
        ? computeGlidePathRatio({
            currentAge,
            retirementAge,
          })
        : computeYearsToGoalRatio({ yearsToGoal });

    if (result) {
      onApplyRatio(result);
    }
  };

  return (
    <div className="glide-path">
      <h3 className="glide-path__title">{t('glide.title')}</h3>
      <FormGroup>
        <Input type="select" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="age">{t('glide.byAge')}</option>
          <option value="goal">{t('glide.byGoal')}</option>
        </Input>
      </FormGroup>
      {mode === 'age' ? (
        <div className="glide-path__inputs">
          <FormGroup>
            <Label for="currentAge">{t('glide.currentAge')}</Label>
            <Input
              id="currentAge"
              type="number"
              min="18"
              max="90"
              value={currentAge}
              onChange={(e) => setCurrentAge(e.target.value)}
            />
          </FormGroup>
          <FormGroup>
            <Label for="retirementAge">{t('glide.retirementAge')}</Label>
            <Input
              id="retirementAge"
              type="number"
              min="40"
              max="100"
              value={retirementAge}
              onChange={(e) => setRetirementAge(e.target.value)}
            />
          </FormGroup>
        </div>
      ) : (
        <FormGroup>
          <Label for="yearsToGoal">{t('glide.yearsToGoal')}</Label>
          <Input
            id="yearsToGoal"
            type="number"
            min="1"
            max="50"
            value={yearsToGoal}
            onChange={(e) => setYearsToGoal(e.target.value)}
          />
        </FormGroup>
      )}
      <Button type="button" color="secondary" outline onClick={handleApply}>
        {t('glide.apply')}
      </Button>
    </div>
  );
};

export default GlidePathPanel;
