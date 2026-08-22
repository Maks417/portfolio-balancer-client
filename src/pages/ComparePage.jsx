import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { decodeScenarioState, loadDraftState } from '../utils/scenarioStorage';
import { getCurrentAllocation, getRatioParts, setFxRates } from '../utils/portfolioFormUtils';
import { fetchRates } from '../api/portfolioApi';
import { AppLink } from '../components/AppLink';
import { useLocale } from '../locale';
import '../sass/compare.scss';

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
    positions: stocks.length + bonds.length + cash.length,
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
        {summary.allocation.currentCashPct > 0 ? (
          <div>
            <dt>{t('asset.cash')}</dt>
            <dd>{summary.allocation.currentCashPct}%</dd>
          </div>
        ) : null}
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

export function ComparePage() {
  const { t, locale } = useLocale();
  const [leftParam, setLeftParam] = useState('');
  const [rightParam, setRightParam] = useState('');
  const [ratesError, setRatesError] = useState(null);

  const deferredLeft = useDeferredValue(leftParam);
  const deferredRight = useDeferredValue(rightParam);

  useEffect(() => {
    let cancelled = false;
    fetchRates(locale)
      .then((rates) => {
        if (cancelled) {
          return;
        }
        setFxRates(rates.ratesPerUnitInRub, rates);
        setRatesError(null);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setRatesError(error.summary ?? t('error.ratesCompare'));
      });
    return () => {
      cancelled = true;
    };
  }, [locale, t]);

  const { leftSummary, rightSummary, driftDelta } = useMemo(() => {
    const currentDraft = loadDraftState();
    const leftScenario = deferredLeft.trim()
      ? decodeScenarioState(deferredLeft.trim())
      : currentDraft;
    const rightScenario = deferredRight.trim()
      ? decodeScenarioState(deferredRight.trim())
      : null;
    const left = summarizeScenario(leftScenario);
    const right = summarizeScenario(rightScenario);
    const delta =
      left && right
        ? Math.abs(left.allocation.currentStockPct - right.allocation.currentStockPct)
        : null;
    return { leftSummary: left, rightSummary: right, driftDelta: delta };
  }, [deferredLeft, deferredRight]);

  return (
    <main className="calculator-page">
      <div className="calculator-card">
        <header className="calculator-card__header">
          <span className="calculator-card__eyebrow">{t('compare.eyebrow')}</span>
          <h1 className="calculator-card__title">{t('compare.title')}</h1>
          <p className="calculator-card__subtitle">{t('compare.subtitle')}</p>
        </header>
        {ratesError ? <div className="alert alert-warning">{ratesError}</div> : null}
        <div className="compare-inputs">
          <div className="form-group">
            <label htmlFor="leftScenario">{t('compare.scenarioA')}</label>
            <textarea
              id="leftScenario"
              className="form-control"
              rows={3}
              value={leftParam}
              placeholder={t('compare.leftPlaceholder')}
              onChange={(event) => setLeftParam(event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="rightScenario">{t('compare.scenarioB')}</label>
            <textarea
              id="rightScenario"
              className="form-control"
              rows={3}
              value={rightParam}
              placeholder={t('compare.rightPlaceholder')}
              onChange={(event) => setRightParam(event.target.value)}
            />
          </div>
        </div>
        <div className="compare-grid">
          <ScenarioCard title={t('compare.scenarioA')} summary={leftSummary} t={t} />
          <ScenarioCard title={t('compare.scenarioB')} summary={rightSummary} t={t} />
        </div>
        {driftDelta != null ? (
          <div className="alert alert-info">{t('compare.delta', { value: driftDelta })}</div>
        ) : null}
        <div className="form-actions">
          <AppLink className="btn btn-outline-secondary" to="/">
            {t('compare.back')}
          </AppLink>
        </div>
      </div>
    </main>
  );
}

export default ComparePage;
