import { decodeScenarioFromParam, loadDraftState } from '../utils/scenarioStorage';
import { getCurrentAllocation, getRatioParts, setFxRates } from '../utils/portfolioFormUtils';
import { fetchRates } from '../api/portfolioApi';
import { hrefFor } from '../router';
import { subscribeLocale, t } from '../locale';
import { escapeHtml, restoreFocus } from '../ui/dom';

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

function scenarioCardHtml(title, summary) {
  if (!summary) {
    return `
      <div class="compare-card compare-card--empty">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(t('compare.notFound'))}</p>
      </div>
    `;
  }

  return `
    <div class="compare-card">
      <h3>${escapeHtml(title)}</h3>
      <dl class="compare-card__metrics">
        <div>
          <dt>${escapeHtml(t('compare.targetRatio'))}</dt>
          <dd>${escapeHtml(summary.ratio)}</dd>
        </div>
        <div>
          <dt>${escapeHtml(t('compare.mode'))}</dt>
          <dd>${escapeHtml(t(`mode.${summary.mode}`))}</dd>
        </div>
        <div>
          <dt>${escapeHtml(t('compare.currentStocks'))}</dt>
          <dd>${summary.allocation.currentStockPct}%</dd>
        </div>
        <div>
          <dt>${escapeHtml(t('compare.currentBonds'))}</dt>
          <dd>${summary.allocation.currentBondPct}%</dd>
        </div>
        ${
          summary.allocation.currentCashPct > 0
            ? `
          <div>
            <dt>${escapeHtml(t('asset.cash'))}</dt>
            <dd>${summary.allocation.currentCashPct}%</dd>
          </div>`
            : ''
        }
        <div>
          <dt>${escapeHtml(t('compare.positions'))}</dt>
          <dd>${summary.positions}</dd>
        </div>
        <div>
          <dt>${escapeHtml(t('compare.contribution'))}</dt>
          <dd>${escapeHtml(summary.contribution)} ${escapeHtml(summary.contributionCurrency)}</dd>
        </div>
      </dl>
    </div>
  `;
}

export function mountCompare(outlet) {
  const state = {
    leftParam: '',
    rightParam: '',
    ratesError: null,
  };

  const page = document.createElement('main');
  page.className = 'calculator-page';
  outlet.appendChild(page);

  const render = () => {
    const restore = restoreFocus(page);
    const currentDraft = loadDraftState();
    const leftScenario = state.leftParam
      ? decodeScenarioFromParam(state.leftParam)
      : currentDraft;
    const rightScenario = decodeScenarioFromParam(state.rightParam);
    const leftSummary = summarizeScenario(leftScenario);
    const rightSummary = summarizeScenario(rightScenario);
    const driftDelta =
      leftSummary && rightSummary
        ? Math.abs(leftSummary.allocation.currentStockPct - rightSummary.allocation.currentStockPct)
        : null;

    page.innerHTML = `
      <div class="calculator-card">
        <header class="calculator-card__header">
          <span class="calculator-card__eyebrow">${escapeHtml(t('compare.eyebrow'))}</span>
          <h1 class="calculator-card__title">${escapeHtml(t('compare.title'))}</h1>
          <p class="calculator-card__subtitle">${escapeHtml(t('compare.subtitle'))}</p>
        </header>
        ${state.ratesError ? `<div class="alert alert-warning">${escapeHtml(state.ratesError)}</div>` : ''}
        <div class="compare-inputs">
          <div class="form-group">
            <label for="leftScenario">${escapeHtml(t('compare.scenarioA'))}</label>
            <textarea id="leftScenario" class="form-control" rows="3" data-field="left" placeholder="${escapeHtml(t('compare.leftPlaceholder'))}">${escapeHtml(state.leftParam)}</textarea>
          </div>
          <div class="form-group">
            <label for="rightScenario">${escapeHtml(t('compare.scenarioB'))}</label>
            <textarea id="rightScenario" class="form-control" rows="3" data-field="right" placeholder="${escapeHtml(t('compare.rightPlaceholder'))}">${escapeHtml(state.rightParam)}</textarea>
          </div>
        </div>
        <div class="compare-grid">
          ${scenarioCardHtml(t('compare.scenarioA'), leftSummary)}
          ${scenarioCardHtml(t('compare.scenarioB'), rightSummary)}
        </div>
        ${
          driftDelta != null
            ? `<div class="alert alert-info">${escapeHtml(t('compare.delta', { value: driftDelta }))}</div>`
            : ''
        }
        <div class="form-actions">
          <a class="btn btn-outline-secondary" data-link href="${hrefFor('/')}">${escapeHtml(t('compare.back'))}</a>
        </div>
      </div>
    `;
    restore();
  };

  page.addEventListener('input', (event) => {
    const field = event.target.getAttribute('data-field');
    if (field === 'left') {
      state.leftParam = event.target.value.trim();
      render();
      return;
    }
    if (field === 'right') {
      state.rightParam = event.target.value.trim();
      render();
    }
  });

  fetchRates()
    .then((rates) => {
      setFxRates(rates.ratesPerUnitInRub, rates);
      state.ratesError = null;
      render();
    })
    .catch((error) => {
      state.ratesError = error.summary ?? t('error.ratesCompare');
      render();
    });

  render();
  const unsubscribe = subscribeLocale(() => render());

  return () => {
    unsubscribe();
    page.remove();
  };
}
