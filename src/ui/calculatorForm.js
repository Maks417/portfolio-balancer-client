import {
  CALCULATION_MODES,
  calculatePortfolio,
  fetchRates,
  getApiBaseUrl,
} from '../api/portfolioApi';
import {
  ALLOCATION_PRESETS,
  buildCalculatePayload,
  currencyOptions,
  formatAmount,
  formatFxDisclaimer,
  formatSignedAmount,
  getCurrentAllocation,
  getRatioParts,
  hasFilledPosition,
  hasMixedCurrencies,
  mapServerBreakdown,
  normalizeDiffAmount,
  ratioTextFromSlider,
  setFxRates,
  validateRatioText,
} from '../utils/portfolioFormUtils';
import {
  buildScenarioState,
  clearDraftState,
  clearScenarioFromUrl,
  getShareableUrl,
  loadDraftState,
  readScenarioFromUrl,
  saveDraftState,
} from '../utils/scenarioStorage';
import {
  buildResultCsv,
  buildResultText,
  copyTextToClipboard,
  downloadCsv,
} from '../utils/resultExport';
import { trackEvent } from '../utils/analytics';
import { SUPPORTED_LOCALES } from '../i18n/translations';
import { getLocale, setLocale, subscribeLocale, t } from '../locale';
import { hrefFor } from '../router';
import { currencyOptionsHtml, escapeHtml, restoreFocus } from './dom';
import { applyGlidePath, renderGlidePathHtml } from './glidePath';
import { openCsvImportDialog } from './csvImportDialog';
import { openScenarioLibraryDialog } from './scenarioLibrary';

const defaultAssets = () => ({
  stocksValues: [{ value: '', currency: currencyOptions[0].value }],
  bondsValues: [{ value: '', currency: currencyOptions[0].value }],
  cashValues: [{ value: '', currency: currencyOptions[0].value }],
});

const defaultContribution = () => ({
  value: '',
  currency: currencyOptions[0].value,
});

function applyScenarioState(scenario) {
  const assets = scenario.assets ?? defaultAssets();
  return {
    ratio: scenario.ratio ?? { text: '50/50', value: 50 },
    assets: {
      stocksValues: assets.stocksValues ?? defaultAssets().stocksValues,
      bondsValues: assets.bondsValues ?? defaultAssets().bondsValues,
      cashValues: assets.cashValues ?? defaultAssets().cashValues,
    },
    contributionAmount: scenario.contributionAmount ?? defaultContribution(),
    calculationMode: scenario.calculationMode ?? CALCULATION_MODES.contribution,
    driftThreshold: scenario.driftThreshold ?? '',
    minTradeAmount: scenario.minTradeAmount ?? '',
  };
}

function localizeServerNote(note, locale) {
  if (!note || locale !== 'en') {
    return note;
  }

  const tolerance = note.match(/допуска\s+([\d.,]+)%/i);
  if (tolerance) {
    return t('result.toleranceWithin', { value: tolerance[1].replace(',', '.') });
  }

  if (note.includes('портфель перевешен')) {
    const assets = [];
    if (note.includes('акций')) assets.push(t('asset.stocks').toLowerCase());
    if (note.includes('облигаций')) assets.push(t('asset.bonds').toLowerCase());
    if (note.includes('наличных')) assets.push(t('asset.cash').toLowerCase());
    return t('result.contributionOverweight', {
      assets: new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(assets),
    });
  }

  return note;
}

function fieldError(state, key) {
  return state.clientErrors[key] || state.fieldErrors[key] || '';
}

function renderAssetClass(state, name, labelId, valuesArr, fieldErrorKey, totalBase) {
  const isStocks = name === 'stocksValues';
  const isCash = name === 'cashValues';
  const label = isStocks ? t('asset.stocks') : isCash ? t('asset.cash') : t('asset.bonds');
  const description = isStocks
    ? t('asset.stocksHint')
    : isCash
      ? t('asset.cashHint')
      : t('asset.bondsHint');
  const modifier = isStocks ? 'stock' : isCash ? 'cash' : 'bond';
  const error = fieldError(state, fieldErrorKey);

  return `
    <div class="form-group asset-class asset-class--${modifier}">
      <div class="asset-class__header">
        <label for="${labelId}" class="asset-class__label">${escapeHtml(label)}</label>
        ${totalBase > 0 ? `<span class="asset-class__total">${escapeHtml(formatAmount(totalBase, 'rub'))}</span>` : ''}
      </div>
      <span class="asset-class__hint">${escapeHtml(description)}</span>
      ${valuesArr
        .map(
          (element, index) => `
        <div class="position-row" data-asset="${name}" data-index="${index}">
          ${
            index > 0
              ? `<button type="button" class="btn number-field minus" data-action="remove-position" aria-label="${escapeHtml(t('asset.removePosition', { number: index + 1 }))}"><i class="fa fa-minus" aria-hidden="true"></i></button>`
              : '<span class="position-row__spacer" aria-hidden="true"></span>'
          }
          <input
            class="form-control position-row__amount number-field${error ? ' is-invalid' : ''}"
            type="number"
            min="0"
            step="any"
            name="${name}_value_${index}"
            id="${index === 0 ? labelId : `${labelId}_${index}`}"
            value="${escapeHtml(element.value)}"
            placeholder="${escapeHtml(t('asset.position', { number: index + 1 }))}"
            data-action="position-value"
          />
          <select
            class="form-control position-row__currency number-field"
            name="${name}_currency_${index}"
            aria-label="${escapeHtml(t('asset.positionCurrency', { number: index + 1 }))}"
            data-action="position-currency"
          >
            ${currencyOptionsHtml(element.currency, currencyOptions)}
          </select>
        </div>`,
        )
        .join('')}
      <button type="button" class="btn btn-add-position btn-add-position--${modifier} w-100" data-action="add-position" data-asset="${name}">
        <i class="fa fa-plus me-2" aria-hidden="true"></i>
        ${escapeHtml(t('asset.addPosition'))}
      </button>
      ${error ? `<div class="field-error d-block">${escapeHtml(error)}</div>` : ''}
    </div>
  `;
}

function renderBreakdown(title, modifier, rows) {
  if (!rows?.length) {
    return '';
  }
  return `
    <div class="result-breakdown">
      <h4 class="result-breakdown__title result-breakdown__title--${modifier}">${escapeHtml(title)}</h4>
      ${rows
        .map(
          (row, index) => `
        <div class="result-breakdown__row">
          <span>${escapeHtml(t('asset.position', { number: index + 1 }))}</span>
          <span class="result-breakdown__amount result-breakdown__amount--${modifier}">
            ${escapeHtml(formatSignedAmount(row.amount, row.currency, row.isSell))}
          </span>
        </div>`,
        )
        .join('')}
    </div>
  `;
}

function renderResult(state) {
  const { result } = state;
  if (!result) {
    return '';
  }

  if (result.type === 'error') {
    return `
      <div class="alert alert-danger result-alert" role="alert">
        <i class="fa fa-circle-exclamation me-2" aria-hidden="true"></i>
        ${escapeHtml(result.summary)}
      </div>
    `;
  }

  const locale = getLocale();
  const isRebalanceMode = state.calculationMode === CALCULATION_MODES.rebalance;
  const localizedContributionNote = localizeServerNote(result.contributionOnlyNote, locale);
  const localizedToleranceNote = localizeServerNote(result.toleranceNote, locale);
  const localizedFxDisclaimer = formatFxDisclaimer(result.fx, locale);
  const resultTotal = Math.abs(result.stocksAmount ?? 0) + Math.abs(result.bondsAmount ?? 0);
  const resultStockSharePct =
    resultTotal > 0 ? Math.round((Math.abs(result.stocksAmount ?? 0) / resultTotal) * 100) : 0;

  return `
    <div class="result-card" role="status" aria-live="polite">
      <div class="result-card__header">
        <h3 class="result-card__title">${escapeHtml(t('result.title'))}</h3>
        <div class="result-card__actions">
          <button type="button" class="btn btn-sm btn-outline-secondary" data-action="copy-result">${escapeHtml(t('action.copy'))}</button>
          <button type="button" class="btn btn-sm btn-outline-secondary" data-action="download-result">${escapeHtml(t('action.downloadCsv'))}</button>
          <button type="button" class="btn result-card__edit" data-action="edit-result">${escapeHtml(t('action.edit'))}</button>
        </div>
      </div>
      <div class="result-metrics">
        <div class="result-metric result-metric--stock">
          <span class="result-metric__label">${escapeHtml(
            isRebalanceMode || (result.stocksAmount ?? 0) < 0 ? t('asset.stocks') : t('result.buyStocks'),
          )}</span>
          <span class="result-metric__value">${
            result.stocksAmount != null
              ? escapeHtml(formatSignedAmount(result.stocksAmount, result.currency, result.stocksAmount < 0))
              : '—'
          }</span>
        </div>
        <div class="result-metric result-metric--bond">
          <span class="result-metric__label">${escapeHtml(
            isRebalanceMode || (result.bondsAmount ?? 0) < 0 ? t('asset.bonds') : t('result.buyBonds'),
          )}</span>
          <span class="result-metric__value">${
            result.bondsAmount != null
              ? escapeHtml(formatSignedAmount(result.bondsAmount, result.currency, result.bondsAmount < 0))
              : '—'
          }</span>
        </div>
        ${
          result.cashAmount != null && result.cashAmount !== 0
            ? `
          <div class="result-metric result-metric--cash">
            <span class="result-metric__label">${escapeHtml(t('asset.cash'))}</span>
            <span class="result-metric__value">${escapeHtml(
              formatSignedAmount(result.cashAmount, result.currency, result.cashAmount < 0),
            )}</span>
          </div>`
            : ''
        }
      </div>
      ${
        resultTotal > 0
          ? `
        <div class="result-share-bar" role="img" aria-label="${escapeHtml(t('result.operationAria', { value: resultStockSharePct }))}">
          <span class="result-share-bar__segment result-share-bar__segment--stock" style="width:${resultStockSharePct}%"></span>
          <span class="result-share-bar__segment result-share-bar__segment--bond"></span>
        </div>`
          : ''
      }
      ${localizedContributionNote ? `<div class="alert alert-info result-note">${escapeHtml(localizedContributionNote)}</div>` : ''}
      ${localizedToleranceNote ? `<div class="alert alert-info result-note">${escapeHtml(localizedToleranceNote)}</div>` : ''}
      ${renderBreakdown(t('asset.stocks'), 'stock', result.stocksBreakdown)}
      ${renderBreakdown(t('asset.bonds'), 'bond', result.bondsBreakdown)}
      ${renderBreakdown(t('asset.cash'), 'cash', result.cashBreakdown)}
      <p class="result-disclaimer">${escapeHtml(localizedFxDisclaimer)}</p>
      <p class="result-disclaimer">${escapeHtml(t('result.breakdownEstimate'))}</p>
      ${state.exportMessage ? `<p class="form-actions__hint">${escapeHtml(state.exportMessage)}</p>` : ''}
    </div>
  `;
}

function buildHtml(state) {
  const locale = getLocale();
  const ratioParts = getRatioParts(state.ratio.text);
  const allocation = getCurrentAllocation(
    state.assets.stocksValues,
    state.assets.bondsValues,
    state.assets.cashValues,
  );
  const drift = allocation.driftFrom(ratioParts.stocks);
  const isRebalanceMode = state.calculationMode === CALCULATION_MODES.rebalance;
  const showCurrencyWarning = hasMixedCurrencies(
    state.assets.stocksValues,
    state.assets.bondsValues,
    state.contributionAmount.currency,
    state.assets.cashValues,
  );
  const contributionNumber = Number(state.contributionAmount.value);
  const isFormValid =
    state.ratioValidClass === 'is-valid' &&
    (isRebalanceMode || (state.contributionAmount.value !== '' && contributionNumber > 0)) &&
    !Number.isNaN(contributionNumber) &&
    (hasFilledPosition(state.assets.stocksValues) ||
      hasFilledPosition(state.assets.bondsValues) ||
      hasFilledPosition(state.assets.cashValues));
  const configError = getApiBaseUrl() ? null : t('error.apiNotConfigured');
  const submitDisabled = state.submitDisabled || !isFormValid || Boolean(configError);

  return `
    <div class="calculator-card">
      <header class="calculator-card__header">
        <div class="calculator-card__header-row">
          <span class="calculator-card__eyebrow">${escapeHtml(t('app.eyebrow'))}</span>
          <div class="form-group locale-switcher mb-0">
            <label for="locale" class="visually-hidden">${escapeHtml(t('locale.label'))}</label>
            <select id="locale" class="form-control form-control--sm" data-action="locale">
              ${SUPPORTED_LOCALES.map(
                (code) =>
                  `<option value="${code}"${code === locale ? ' selected' : ''}>${code.toUpperCase()}</option>`,
              ).join('')}
            </select>
          </div>
        </div>
        <h1 class="calculator-card__title">${escapeHtml(t('app.title'))}</h1>
        <p class="calculator-card__subtitle">${escapeHtml(t('app.subtitle'))}</p>
      </header>

      ${configError ? `<div class="alert alert-danger mb-3">${escapeHtml(configError)}</div>` : ''}
      ${state.ratesError ? `<div class="alert alert-warning mb-3">${escapeHtml(state.ratesError)}</div>` : ''}

      <form class="portfolio-balancer-form" data-form novalidate>
        <section class="form-section" aria-labelledby="section-mode">
          <h2 class="form-section__title" id="section-mode">
            <span class="form-section__number">1</span>
            <span>${escapeHtml(t('mode.title'))}<small>${escapeHtml(t('mode.subtitle'))}</small></span>
          </h2>
          <div class="form-group">
            <select class="form-control" data-action="mode">
              <option value="${CALCULATION_MODES.contribution}"${state.calculationMode === CALCULATION_MODES.contribution ? ' selected' : ''}>${escapeHtml(t('mode.contribution'))}</option>
              <option value="${CALCULATION_MODES.rebalance}"${state.calculationMode === CALCULATION_MODES.rebalance ? ' selected' : ''}>${escapeHtml(t('mode.rebalance'))}</option>
            </select>
            <p class="form-text">${escapeHtml(isRebalanceMode ? t('mode.rebalanceHint') : t('mode.contributionHint'))}</p>
          </div>
        </section>

        <section class="form-section" aria-labelledby="section-ratio">
          <h2 class="form-section__title" id="section-ratio">
            <span class="form-section__number">2</span>
            <span>${escapeHtml(t('ratio.title'))}<small>${escapeHtml(t('ratio.subtitle'))}</small></span>
          </h2>
          <div class="form-group">
            <label for="ratio">${escapeHtml(t('ratio.label'))}</label>
            <div class="ratio-tiles" aria-live="polite">
              <div class="ratio-tile ratio-tile--stock">
                <span class="ratio-tile__label">${escapeHtml(t('asset.stocks'))}</span>
                <span class="ratio-tile__value">${ratioParts.stocks}%</span>
              </div>
              <div class="ratio-tile ratio-tile--bond">
                <span class="ratio-tile__label">${escapeHtml(t('asset.bonds'))}</span>
                <span class="ratio-tile__value">${ratioParts.bonds}%</span>
              </div>
              ${
                ratioParts.cash > 0
                  ? `
                <div class="ratio-tile ratio-tile--cash">
                  <span class="ratio-tile__label">${escapeHtml(t('asset.cash'))}</span>
                  <span class="ratio-tile__value">${ratioParts.cash}%</span>
                </div>`
                  : ''
              }
            </div>
            <div class="range-slider__container">
              <input
                type="range"
                class="range-slider"
                min="0"
                max="100"
                step="1"
                value="${Number(state.ratio.value) || 0}"
                aria-labelledby="ratio"
                data-action="ratio-slider"
              />
            </div>
            <input
              required
              class="form-control ${state.ratioValidClass}${fieldError(state, 'ratio') ? ' is-invalid' : ''}"
              type="text"
              name="ratio"
              id="ratio"
              value="${escapeHtml(state.ratio.text)}"
              placeholder="70/30"
              data-action="ratio-text"
            />
            <p class="form-text ratio-helper">${escapeHtml(t('ratio.helper'))}</p>
            <div class="preset-row">
              ${ALLOCATION_PRESETS.map(
                (preset) => `
                <button type="button" class="btn btn-sm btn-outline-secondary" data-action="preset" data-ratio="${escapeHtml(preset.ratio)}" data-slider="${preset.slider}">
                  ${escapeHtml(
                    preset.ratio === '100'
                      ? t('ratio.presetStocks')
                      : preset.ratio === '0'
                        ? t('ratio.presetBonds')
                        : preset.label,
                  )}
                </button>`,
              ).join('')}
            </div>
            ${renderGlidePathHtml(state)}
            ${fieldError(state, 'ratio') ? `<div class="field-error d-block">${escapeHtml(fieldError(state, 'ratio'))}</div>` : ''}
          </div>
        </section>

        ${
          allocation.hasPositions
            ? `
          <div class="distribution" aria-live="polite">
            <div class="distribution__header">
              <span class="distribution__title">${escapeHtml(t('allocation.current'))}</span>
              <span class="distribution__drift">${escapeHtml(t('allocation.drift', { value: drift }))}</span>
            </div>
            <div class="distribution__bar" role="img" aria-label="${escapeHtml(
              t('allocation.aria', {
                stocks: allocation.currentStockPct,
                bonds: allocation.currentBondPct,
              }),
            )}">
              <span class="distribution__segment distribution__segment--stock" style="width:${allocation.currentStockPct}%"></span>
              <span class="distribution__segment distribution__segment--bond"></span>
            </div>
            <div class="distribution__legend">
              <span>${escapeHtml(t('asset.stocks'))} ${allocation.currentStockPct}%</span>
              <span>${escapeHtml(t('allocation.target', { value: `${ratioParts.stocks}/${ratioParts.bonds}` }))}</span>
              <span>${escapeHtml(t('asset.bonds'))} ${allocation.currentBondPct}%</span>
            </div>
            ${
              allocation.isDriftHigh(ratioParts.stocks) && !isRebalanceMode
                ? `<p class="distribution__note">${escapeHtml(t('allocation.highDrift'))}</p>`
                : ''
            }
          </div>`
            : ''
        }

        <section class="form-section" aria-labelledby="section-portfolio">
          <h2 class="form-section__title" id="section-portfolio">
            <span class="form-section__number">3</span>
            <span>${escapeHtml(t('portfolio.title'))}<small>${escapeHtml(t('portfolio.subtitle'))}</small></span>
          </h2>
          ${
            showCurrencyWarning
              ? `
            <div class="alert alert-warning currency-warning">
              <i class="fa fa-triangle-exclamation me-2" aria-hidden="true"></i>
              ${escapeHtml(t('portfolio.mixedCurrencies'))}
            </div>`
              : ''
          }
          <div class="portfolio-classes">
            ${renderAssetClass(state, 'stocksValues', 'stockValue', state.assets.stocksValues, 'stocks', allocation.stockTotalBase)}
            <div class="asset-divider" aria-hidden="true"></div>
            ${renderAssetClass(state, 'bondsValues', 'bondValue', state.assets.bondsValues, 'bonds', allocation.bondTotalBase)}
            <div class="asset-divider" aria-hidden="true"></div>
            ${renderAssetClass(state, 'cashValues', 'cashValue', state.assets.cashValues, 'cash', allocation.cashTotalBase)}
          </div>
          <div class="portfolio-import-row">
            <button type="button" class="btn btn-outline-secondary" data-action="open-import">${escapeHtml(t('action.import'))}</button>
          </div>
        </section>

        <section class="form-section" aria-labelledby="section-advanced">
          <h2 class="form-section__title" id="section-advanced">
            <span class="form-section__number">4</span>
            <span>${escapeHtml(t('advanced.title'))}<small>${escapeHtml(t('advanced.subtitle'))}</small></span>
          </h2>
          <div class="advanced-grid">
            <div class="form-group">
              <label for="driftThreshold">${escapeHtml(t('advanced.driftThreshold'))}</label>
              <input id="driftThreshold" class="form-control" type="number" min="0" max="50" step="0.5" value="${escapeHtml(state.driftThreshold)}" placeholder="0" data-action="drift-threshold" />
              <p class="form-text">${escapeHtml(t('advanced.driftHint'))}</p>
            </div>
            <div class="form-group">
              <label for="minTradeAmount">${escapeHtml(t('advanced.minTrade'))}</label>
              <input id="minTradeAmount" class="form-control" type="number" min="0" step="any" value="${escapeHtml(state.minTradeAmount)}" placeholder="0" data-action="min-trade" />
              <p class="form-text">${escapeHtml(t('advanced.minTradeHint'))}</p>
            </div>
          </div>
        </section>

        <section class="form-section" aria-labelledby="section-contribution">
          <h2 class="form-section__title" id="section-contribution">
            <span class="form-section__number">5</span>
            <span>
              ${escapeHtml(isRebalanceMode ? t('contribution.rebalanceTitle') : t('contribution.title'))}
              <small>${escapeHtml(isRebalanceMode ? t('contribution.rebalanceSubtitle') : t('contribution.subtitle'))}</small>
            </span>
          </h2>
          <div class="form-group">
            <label for="contributionAmount">${escapeHtml(
              isRebalanceMode ? t('contribution.rebalanceLabel') : t('contribution.label'),
            )}</label>
            <div class="contribution-row">
              <input
                ${isRebalanceMode ? '' : 'required'}
                class="form-control contribution-row__amount number-field${fieldError(state, 'contribution') ? ' is-invalid' : ''}"
                type="number"
                min="${isRebalanceMode ? '0' : '1'}"
                step="any"
                name="contributionAmount"
                id="contributionAmount"
                value="${escapeHtml(state.contributionAmount.value)}"
                placeholder="${isRebalanceMode ? '0' : '50 000'}"
                data-action="contribution-value"
              />
              <select
                class="form-control contribution-row__currency number-field"
                name="contributionAmount_currency"
                aria-label="${escapeHtml(t('contribution.currency'))}"
                data-action="contribution-currency"
              >
                ${currencyOptionsHtml(state.contributionAmount.currency, currencyOptions)}
              </select>
            </div>
            ${
              fieldError(state, 'contribution')
                ? `<div class="field-error d-block">${escapeHtml(fieldError(state, 'contribution'))}</div>`
                : ''
            }
          </div>
        </section>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-calculate" ${submitDisabled ? 'disabled' : ''}>
            ${
              state.submitDisabled
                ? `<span class="spinner" role="status" aria-hidden="true"></span>${escapeHtml(t('action.calculating'))}`
                : escapeHtml(t('action.calculate'))
            }
          </button>
          <button type="button" class="btn btn-outline-secondary" data-action="share">${escapeHtml(t('action.share'))}</button>
          <button type="button" class="btn btn-outline-secondary" data-action="open-library">${escapeHtml(t('action.library'))}</button>
          <a class="btn btn-outline-secondary" data-link href="${hrefFor('/compare')}">${escapeHtml(t('action.compare'))}</a>
          <button type="button" class="btn btn-link" data-action="reset">${escapeHtml(t('action.reset'))}</button>
          ${state.shareMessage ? `<p class="form-actions__hint">${escapeHtml(state.shareMessage)}</p>` : ''}
          <p class="form-actions__hint">${escapeHtml(isRebalanceMode ? t('form.rebalanceHint') : t('form.contributionHint'))}</p>
        </div>
      </form>

      <section class="calculator-result" data-result aria-labelledby="section-result">
        <h2 class="form-section__title visually-hidden" id="section-result">${escapeHtml(t('result.section'))}</h2>
        ${renderResult(state)}
      </section>
    </div>
  `;
}

export function mountCalculatorForm(container) {
  const initialScenario = readScenarioFromUrl() ?? loadDraftState();
  const applied = applyScenarioState(initialScenario ?? {});

  const state = {
    ...applied,
    ratioValidClass: validateRatioText(applied.ratio.text),
    submitDisabled: false,
    clientErrors: {},
    fieldErrors: {},
    result: null,
    ratesError: null,
    shareMessage: '',
    exportMessage: '',
    glideMode: 'age',
    currentAge: '35',
    retirementAge: '65',
    yearsToGoal: '10',
  };

  let ratesRequestId = 0;

  const persistDraft = () => {
    saveDraftState(
      buildScenarioState({
        ratio: state.ratio,
        assets: state.assets,
        contributionAmount: state.contributionAmount,
        calculationMode: state.calculationMode,
        driftThreshold: state.driftThreshold,
        minTradeAmount: state.minTradeAmount,
      }),
    );
  };

  const applyRatio = (text, sliderValue) => {
    state.ratio = { text, value: sliderValue };
    state.ratioValidClass = validateRatioText(text);
  };

  const loadRates = () => {
    const requestId = ++ratesRequestId;
    fetchRates(getLocale())
      .then((rates) => {
        if (requestId !== ratesRequestId) {
          return;
        }
        setFxRates(rates.ratesPerUnitInRub, rates);
        state.ratesError = rates.stale ? t('error.ratesStale') : null;
        render();
      })
      .catch((error) => {
        if (requestId !== ratesRequestId) {
          return;
        }
        state.ratesError = error.summary ?? t('error.ratesPreview');
        render();
      });
  };

  const runClientValidation = () => {
    const errors = {};
    const isRebalanceMode = state.calculationMode === CALCULATION_MODES.rebalance;

    if (state.ratioValidClass !== 'is-valid') {
      errors.ratio = t('error.invalidRatio');
    }

    if (
      !hasFilledPosition(state.assets.stocksValues) &&
      !hasFilledPosition(state.assets.bondsValues) &&
      !hasFilledPosition(state.assets.cashValues)
    ) {
      errors.stocks = t('error.noPositions');
      errors.bonds = errors.stocks;
    }

    if (!isRebalanceMode) {
      const amount = Number(state.contributionAmount.value);
      if (state.contributionAmount.value === '' || Number.isNaN(amount) || amount <= 0) {
        errors.contribution = t('error.invalidContribution');
      }
    }

    state.clientErrors = errors;
    return Object.keys(errors).length === 0;
  };

  const scrollToResult = () => {
    requestAnimationFrame(() => {
      container.querySelector('[data-result]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const currentScenarioState = () =>
    buildScenarioState({
      ratio: state.ratio,
      assets: state.assets,
      contributionAmount: state.contributionAmount,
      calculationMode: state.calculationMode,
      driftThreshold: state.driftThreshold,
      minTradeAmount: state.minTradeAmount,
    });

  const bind = () => {
    container.addEventListener('submit', async (event) => {
      if (!event.target.matches('[data-form]')) {
        return;
      }
      event.preventDefault();
      state.fieldErrors = {};
      state.result = null;
      state.shareMessage = '';
      if (!runClientValidation()) {
        render();
        return;
      }

      state.submitDisabled = true;
      render();

      try {
        const payload = buildCalculatePayload({
          ratio: state.ratio,
          assets: state.assets,
          contributionAmount: state.contributionAmount,
          calculationMode: state.calculationMode,
          driftThreshold: state.driftThreshold,
          minTradeAmount: state.minTradeAmount,
        });
        const response = await calculatePortfolio(payload, getLocale());
        const currency = response.currency ?? state.contributionAmount.currency;
        const stocksAmount = normalizeDiffAmount(response.stocksDiff);
        const bondsAmount = normalizeDiffAmount(response.bondsDiff);
        const cashAmount = normalizeDiffAmount(response.cashDiff);

        if (response.fx?.ratesPerUnitInRub) {
          setFxRates(response.fx.ratesPerUnitInRub, response.fx);
        }

        state.result = {
          type: 'success',
          currency,
          stocksAmount,
          bondsAmount,
          cashAmount,
          mode: response.mode ?? state.calculationMode,
          contributionOnlyNote: response.contributionOnlyNote,
          toleranceNote: response.toleranceNote,
          fx: response.fx,
          stocksBreakdown: mapServerBreakdown(response.stocksBreakdown),
          bondsBreakdown: mapServerBreakdown(response.bondsBreakdown),
          cashBreakdown: mapServerBreakdown(response.cashBreakdown),
        };
        trackEvent('calculate_success', { mode: state.calculationMode });
      } catch (error) {
        if (error.fieldErrors) {
          state.fieldErrors = error.fieldErrors;
          state.result = { type: 'error', summary: error.summary, code: error.code };
        } else {
          state.result = {
            type: 'error',
            summary: error.summary ?? error.message,
            code: error.code,
          };
        }
      } finally {
        state.submitDisabled = false;
        render();
        scrollToResult();
      }
    });

    container.addEventListener('click', async (event) => {
      const actionEl = event.target.closest('[data-action]');
      if (!actionEl || !container.contains(actionEl)) {
        return;
      }
      const action = actionEl.getAttribute('data-action');

      if (action === 'add-position') {
        event.preventDefault();
        const name = actionEl.getAttribute('data-asset');
        state.assets = {
          ...state.assets,
          [name]: [...state.assets[name], { value: '', currency: currencyOptions[0].value }],
        };
        persistDraft();
        render();
        return;
      }

      if (action === 'remove-position') {
        event.preventDefault();
        const row = actionEl.closest('[data-asset]');
        const name = row.getAttribute('data-asset');
        const index = Number(row.getAttribute('data-index'));
        state.assets = {
          ...state.assets,
          [name]: state.assets[name].filter((_, i) => i !== index),
        };
        persistDraft();
        render();
        return;
      }

      if (action === 'preset') {
        event.preventDefault();
        applyRatio(actionEl.getAttribute('data-ratio'), Number(actionEl.getAttribute('data-slider')));
        persistDraft();
        render();
        return;
      }

      if (action === 'glide-apply') {
        event.preventDefault();
        const result = applyGlidePath(state);
        if (result) {
          applyRatio(result.ratioText, result.sliderValue);
          persistDraft();
          render();
        }
        return;
      }

      if (action === 'open-import') {
        event.preventDefault();
        openCsvImportDialog({
          onImport: (importedAssets) => {
            state.assets = {
              stocksValues: importedAssets.stocksValues?.length
                ? importedAssets.stocksValues
                : state.assets.stocksValues,
              bondsValues: importedAssets.bondsValues?.length
                ? importedAssets.bondsValues
                : state.assets.bondsValues,
              cashValues: importedAssets.cashValues?.length
                ? importedAssets.cashValues
                : state.assets.cashValues,
            };
            persistDraft();
            render();
          },
        });
        return;
      }

      if (action === 'open-library') {
        event.preventDefault();
        openScenarioLibraryDialog({
          currentState: currentScenarioState(),
          onLoadScenario: (scenario) => {
            const next = applyScenarioState(scenario);
            Object.assign(state, next);
            state.ratioValidClass = validateRatioText(next.ratio.text);
            persistDraft();
            render();
          },
        });
        return;
      }

      if (action === 'share') {
        event.preventDefault();
        const url = getShareableUrl(currentScenarioState());
        try {
          await navigator.clipboard.writeText(url);
          state.shareMessage = t('message.shareCopied');
        } catch {
          state.shareMessage = url;
        }
        render();
        return;
      }

      if (action === 'reset') {
        event.preventDefault();
        clearDraftState();
        clearScenarioFromUrl();
        const reset = applyScenarioState({});
        Object.assign(state, reset, {
          ratioValidClass: validateRatioText(reset.ratio.text),
          result: null,
          shareMessage: '',
          exportMessage: '',
          clientErrors: {},
          fieldErrors: {},
        });
        render();
        return;
      }

      if (action === 'copy-result') {
        event.preventDefault();
        if (!state.result || state.result.type !== 'success') {
          return;
        }
        const locale = getLocale();
        try {
          await copyTextToClipboard(
            buildResultText(
              {
                ...state.result,
                contributionOnlyNote: localizeServerNote(state.result.contributionOnlyNote, locale),
                toleranceNote: localizeServerNote(state.result.toleranceNote, locale),
                fxDisclaimer: formatFxDisclaimer(state.result.fx, locale),
              },
              locale,
            ),
          );
          state.exportMessage = t('message.resultCopied');
        } catch {
          state.exportMessage = t('message.resultCopyFailed');
        }
        render();
        return;
      }

      if (action === 'download-result') {
        event.preventDefault();
        if (!state.result || state.result.type !== 'success') {
          return;
        }
        downloadCsv(buildResultCsv(state.result, getLocale()));
        state.exportMessage = t('message.csvDownloaded');
        render();
        return;
      }

      if (action === 'edit-result') {
        event.preventDefault();
        state.result = null;
        state.exportMessage = '';
        render();
      }
    });

    container.addEventListener('input', (event) => {
      const target = event.target;
      const action = target.getAttribute('data-action');
      if (!action) {
        return;
      }

      if (action === 'ratio-text') {
        const text = target.value;
        const parts = text.split('/');
        applyRatio(text, Number(parts[0]) || 0);
        persistDraft();
        render();
        return;
      }

      if (action === 'ratio-slider') {
        const sliderValue = Number(target.value);
        applyRatio(ratioTextFromSlider(sliderValue), sliderValue);
        persistDraft();
        render();
        return;
      }

      if (action === 'position-value' || action === 'position-currency') {
        const row = target.closest('[data-asset]');
        const name = row.getAttribute('data-asset');
        const index = Number(row.getAttribute('data-index'));
        state.assets = {
          ...state.assets,
          [name]: state.assets[name].map((item, i) => {
            if (i !== index) {
              return item;
            }
            if (action === 'position-value') {
              return { ...item, value: target.value };
            }
            return { ...item, currency: target.value };
          }),
        };
        persistDraft();
        render();
        return;
      }

      if (action === 'contribution-value') {
        state.contributionAmount = { ...state.contributionAmount, value: target.value };
        state.clientErrors = { ...state.clientErrors, contribution: undefined };
        persistDraft();
        render();
        return;
      }

      if (action === 'contribution-currency') {
        state.contributionAmount = { ...state.contributionAmount, currency: target.value };
        persistDraft();
        render();
        return;
      }

      if (action === 'drift-threshold') {
        state.driftThreshold = target.value;
        persistDraft();
        render();
        return;
      }

      if (action === 'min-trade') {
        state.minTradeAmount = target.value;
        persistDraft();
        render();
        return;
      }

      if (action === 'glide-mode') {
        state.glideMode = target.value;
        render();
        return;
      }

      if (action === 'glide-current-age') {
        state.currentAge = target.value;
        return;
      }

      if (action === 'glide-retirement-age') {
        state.retirementAge = target.value;
        return;
      }

      if (action === 'glide-years') {
        state.yearsToGoal = target.value;
      }
    });

    container.addEventListener('change', (event) => {
      const target = event.target;
      const action = target.getAttribute('data-action');
      if (action === 'locale') {
        setLocale(target.value);
        return;
      }
      if (action === 'mode') {
        state.calculationMode = target.value;
        persistDraft();
        render();
        return;
      }
      if (action === 'contribution-currency' || action === 'position-currency') {
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  };

  const render = () => {
    const restore = restoreFocus(container);
    container.innerHTML = buildHtml(state);
    restore();
  };

  // Initial mount
  if (readScenarioFromUrl()) {
    clearScenarioFromUrl();
  }
  render();
  bind();
  loadRates();
  persistDraft();

  const unsubscribe = subscribeLocale(() => {
    loadRates();
    render();
  });

  return () => {
    unsubscribe();
    ratesRequestId += 1;
    container.replaceChildren();
  };
}
