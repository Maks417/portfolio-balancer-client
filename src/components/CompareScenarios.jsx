import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, FormGroup, Input, Label } from 'reactstrap';
import {
  decodeScenarioFromParam,
  loadDraftState,
} from '../utils/scenarioStorage';
import {
  getCurrentAllocation,
  getRatioParts,
  setFxRates,
} from '../utils/portfolioFormUtils';
import { fetchRates } from '../api/portfolioApi';
import { useLocale } from '../i18n/LocaleContext';

function summarizeScenario(scenario) {
  if (!scenario) {
    return null;
  }

  const ratioParts = getRatioParts(scenario.ratio?.text ?? '50/50');
  const stocks = scenario.assets?.stocksValues ?? [];
  const bonds = scenario.assets?.bondsValues ?? [];
  const cash = scenario.assets?.cashValues ?? [];
  const allocation = getCurrentAllocation(stocks, bonds, cash);

  return {
    ratio: scenario.ratio?.text ?? '—',
    mode: scenario.calculationMode ?? 'contribution',
    allocation,
    ratioParts,
    positions:
      stocks.length + bonds.length + cash.length,
    contribution: scenario.contributionAmount?.value || '0',
    contributionCurrency: scenario.contributionAmount?.currency ?? 'rub',
  };
}

function ScenarioCard({ title, summary, t }) {
  if (!summary) {
    return (
      <div className="compare-card compare-card--empty">
        <h3>{title}</h3>
        <p>{t('compare.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="compare-card">
      <h3>{title}</h3>
      <dl className="compare-card__metrics">
        <div>
          <dt>{t('compare.targetRatio')}</dt>
          <dd>{summary.ratio}</dd>
        </div>
        <div>
          <dt>{t('compare.mode')}</dt>
          <dd>{t(`mode.${summary.mode}`)}</dd>
        </div>
        <div>
          <dt>{t('compare.currentStocks')}</dt>
          <dd>{summary.allocation.currentStockPct}%</dd>
        </div>
        <div>
          <dt>{t('compare.currentBonds')}</dt>
          <dd>{summary.allocation.currentBondPct}%</dd>
        </div>
        {summary.allocation.currentCashPct > 0 && (
          <div>
            <dt>{t('asset.cash')}</dt>
            <dd>{summary.allocation.currentCashPct}%</dd>
          </div>
        )}
        <div>
          <dt>{t('compare.positions')}</dt>
          <dd>{summary.positions}</dd>
        </div>
        <div>
          <dt>{t('compare.contribution')}</dt>
          <dd>
            {summary.contribution} {summary.contributionCurrency}
          </dd>
        </div>
      </dl>
    </div>
  );
}

const CompareScenarios = () => {
  const { t } = useLocale();
  const currentDraft = loadDraftState();
  const [leftParam, setLeftParam] = useState('');
  const [rightParam, setRightParam] = useState('');
  const [ratesError, setRatesError] = useState(null);

  React.useEffect(() => {
    fetchRates()
      .then((rates) => {
        setFxRates(rates.ratesPerUnitInRub, rates);
        setRatesError(null);
      })
      .catch((error) => {
        setRatesError(error.summary ?? t('error.ratesCompare'));
      });
  }, [t]);

  const leftScenario = useMemo(() => {
    if (leftParam) {
      return decodeScenarioFromParam(leftParam);
    }
    return currentDraft;
  }, [leftParam, currentDraft]);

  const rightScenario = useMemo(() => decodeScenarioFromParam(rightParam), [rightParam]);

  const leftSummary = summarizeScenario(leftScenario);
  const rightSummary = summarizeScenario(rightScenario);

  const driftDelta =
    leftSummary && rightSummary
      ? Math.abs(leftSummary.allocation.currentStockPct - rightSummary.allocation.currentStockPct)
      : null;

  return (
    <div className="calculator-card">
      <header className="calculator-card__header">
        <span className="calculator-card__eyebrow">{t('compare.eyebrow')}</span>
        <h1 className="calculator-card__title">{t('compare.title')}</h1>
        <p className="calculator-card__subtitle">{t('compare.subtitle')}</p>
      </header>

      {ratesError && <Alert color="warning">{ratesError}</Alert>}

      <div className="compare-inputs">
        <FormGroup>
          <Label for="leftScenario">{t('compare.scenarioA')}</Label>
          <Input
            id="leftScenario"
            type="textarea"
            rows="3"
            placeholder={t('compare.leftPlaceholder')}
            value={leftParam}
            onChange={(e) => setLeftParam(e.target.value.trim())}
          />
        </FormGroup>
        <FormGroup>
          <Label for="rightScenario">{t('compare.scenarioB')}</Label>
          <Input
            id="rightScenario"
            type="textarea"
            rows="3"
            placeholder={t('compare.rightPlaceholder')}
            value={rightParam}
            onChange={(e) => setRightParam(e.target.value.trim())}
          />
        </FormGroup>
      </div>

      <div className="compare-grid">
        <ScenarioCard title={t('compare.scenarioA')} summary={leftSummary} t={t} />
        <ScenarioCard title={t('compare.scenarioB')} summary={rightSummary} t={t} />
      </div>

      {driftDelta != null && (
        <Alert color="info">
          {t('compare.delta', { value: driftDelta })}
        </Alert>
      )}

      <div className="form-actions">
        <Button tag={Link} to="/" color="secondary" outline>
          {t('compare.back')}
        </Button>
      </div>
    </div>
  );
};

export default CompareScenarios;
