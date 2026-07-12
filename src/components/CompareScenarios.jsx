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

function ScenarioCard({ title, summary }) {
  if (!summary) {
    return (
      <div className="compare-card compare-card--empty">
        <h3>{title}</h3>
        <p>Сценарий не найден.</p>
      </div>
    );
  }

  return (
    <div className="compare-card">
      <h3>{title}</h3>
      <dl className="compare-card__metrics">
        <div>
          <dt>Целевая пропорция</dt>
          <dd>{summary.ratio}</dd>
        </div>
        <div>
          <dt>Режим</dt>
          <dd>{summary.mode}</dd>
        </div>
        <div>
          <dt>Текущие акции</dt>
          <dd>{summary.allocation.currentStockPct}%</dd>
        </div>
        <div>
          <dt>Текущие облигации</dt>
          <dd>{summary.allocation.currentBondPct}%</dd>
        </div>
        {summary.allocation.currentCashPct > 0 && (
          <div>
            <dt>Наличные</dt>
            <dd>{summary.allocation.currentCashPct}%</dd>
          </div>
        )}
        <div>
          <dt>Позиций</dt>
          <dd>{summary.positions}</dd>
        </div>
        <div>
          <dt>Взнос</dt>
          <dd>
            {summary.contribution} {summary.contributionCurrency}
          </dd>
        </div>
      </dl>
    </div>
  );
}

const CompareScenarios = () => {
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
        setRatesError(error.summary ?? 'Не удалось загрузить курсы для сравнения.');
      });
  }, []);

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
        <span className="calculator-card__eyebrow">Сравнение</span>
        <h1 className="calculator-card__title">Сравнение сценариев</h1>
        <p className="calculator-card__subtitle">
          Вставьте параметры `scenario` из двух ссылок, чтобы сравнить целевые и текущие доли.
        </p>
      </header>

      {ratesError && <Alert color="warning">{ratesError}</Alert>}

      <div className="compare-inputs">
        <FormGroup>
          <Label for="leftScenario">Сценарий A</Label>
          <Input
            id="leftScenario"
            type="textarea"
            rows="3"
            placeholder="Оставьте пустым, чтобы использовать текущий черновик"
            value={leftParam}
            onChange={(e) => setLeftParam(e.target.value.trim())}
          />
        </FormGroup>
        <FormGroup>
          <Label for="rightScenario">Сценарий B</Label>
          <Input
            id="rightScenario"
            type="textarea"
            rows="3"
            placeholder="Вставьте значение параметра scenario"
            value={rightParam}
            onChange={(e) => setRightParam(e.target.value.trim())}
          />
        </FormGroup>
      </div>

      <div className="compare-grid">
        <ScenarioCard title="Сценарий A" summary={leftSummary} />
        <ScenarioCard title="Сценарий B" summary={rightSummary} />
      </div>

      {driftDelta != null && (
        <Alert color="info">
          Разница в текущей доле акций между сценариями: {driftDelta} п.п.
        </Alert>
      )}

      <div className="form-actions">
        <Button tag={Link} to="/" color="secondary" outline>
          Вернуться к калькулятору
        </Button>
      </div>
    </div>
  );
};

export default CompareScenarios;
