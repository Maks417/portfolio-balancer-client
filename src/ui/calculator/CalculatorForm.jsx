import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  CALCULATION_MODES,
  calculatePortfolio,
  fetchRates,
  getApiBaseUrl,
} from '../../api/portfolioApi';
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
} from '../../utils/portfolioFormUtils';
import {
  buildScenarioState,
  clearDraftState,
  clearScenarioFromUrl,
  getShareableUrl,
  loadDraftState,
  readScenarioFromUrl,
  saveDraftState,
} from '../../utils/scenarioStorage';
import {
  buildResultCsv,
  buildResultText,
  copyTextToClipboard,
  downloadCsv,
} from '../../utils/resultExport';
import { trackEvent } from '../../utils/analytics';
import { SUPPORTED_LOCALES } from '../../i18n/translations';
import { useLocale } from '../../locale';
import { AppLink } from '../../components/AppLink';
import { IconExclamation, IconMinus, IconPlus, IconWarning } from '../../components/Icons';
import { GlidePath, applyGlidePath } from '../GlidePath';

const CsvImportDialog = lazy(() =>
  import('../CsvImportDialog').then((m) => ({ default: m.CsvImportDialog })),
);
const ScenarioLibraryDialog = lazy(() =>
  import('../ScenarioLibraryDialog').then((m) => ({ default: m.ScenarioLibraryDialog })),
);

const DRAFT_DEBOUNCE_MS = 300;

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

function localizeServerNote(note, locale, t) {
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

function fieldError(clientErrors, fieldErrors, key) {
  return clientErrors[key] || fieldErrors[key] || '';
}

function targetRatioLabel(ratioParts) {
  if (ratioParts.cash > 0) {
    return `${ratioParts.stocks}/${ratioParts.bonds}/${ratioParts.cash}`;
  }
  return `${ratioParts.stocks}/${ratioParts.bonds}`;
}

function ResultBreakdown({ title, modifier, rows, t }) {
  if (!rows?.length) {
    return null;
  }
  return (
    <div className="result-breakdown">
      <h4 className={`result-breakdown__title result-breakdown__title--${modifier}`}>{title}</h4>
      {rows.map((row, index) => (
        <div className="result-breakdown__row" key={`${modifier}-${index}`}>
          <span>{t('asset.position', { number: index + 1 })}</span>
          <span className={`result-breakdown__amount result-breakdown__amount--${modifier}`}>
            {formatSignedAmount(row.amount, row.currency, row.isSell)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ResultCard({
  result,
  calculationMode,
  exportMessage,
  locale,
  t,
  onCopy,
  onDownload,
  onEdit,
}) {
  if (!result) {
    return null;
  }

  if (result.type === 'error') {
    return (
      <div className="alert alert-danger result-alert" role="alert">
        <IconExclamation className="me-2" />
        {result.summary}
      </div>
    );
  }

  const isRebalanceMode = calculationMode === CALCULATION_MODES.rebalance;
  const localizedContributionNote = localizeServerNote(result.contributionOnlyNote, locale, t);
  const localizedToleranceNote = localizeServerNote(result.toleranceNote, locale, t);
  const localizedFxDisclaimer = formatFxDisclaimer(result.fx, locale);
  const resultTotal = Math.abs(result.stocksAmount ?? 0) + Math.abs(result.bondsAmount ?? 0);
  const resultStockSharePct =
    resultTotal > 0 ? Math.round((Math.abs(result.stocksAmount ?? 0) / resultTotal) * 100) : 0;

  return (
    <div className="result-card" role="status" aria-live="polite">
      <div className="result-card__header">
        <h3 className="result-card__title">{t('result.title')}</h3>
        <div className="result-card__actions">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onCopy}>
            {t('action.copy')}
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onDownload}>
            {t('action.downloadCsv')}
          </button>
          <button type="button" className="btn result-card__edit" onClick={onEdit}>
            {t('action.edit')}
          </button>
        </div>
      </div>
      <div className="result-metrics">
        <div className="result-metric result-metric--stock">
          <span className="result-metric__label">
            {isRebalanceMode || (result.stocksAmount ?? 0) < 0
              ? t('asset.stocks')
              : t('result.buyStocks')}
          </span>
          <span className="result-metric__value">
            {result.stocksAmount != null
              ? formatSignedAmount(result.stocksAmount, result.currency, result.stocksAmount < 0)
              : '—'}
          </span>
        </div>
        <div className="result-metric result-metric--bond">
          <span className="result-metric__label">
            {isRebalanceMode || (result.bondsAmount ?? 0) < 0
              ? t('asset.bonds')
              : t('result.buyBonds')}
          </span>
          <span className="result-metric__value">
            {result.bondsAmount != null
              ? formatSignedAmount(result.bondsAmount, result.currency, result.bondsAmount < 0)
              : '—'}
          </span>
        </div>
        {result.cashAmount != null && result.cashAmount !== 0 ? (
          <div className="result-metric result-metric--cash">
            <span className="result-metric__label">{t('asset.cash')}</span>
            <span className="result-metric__value">
              {formatSignedAmount(result.cashAmount, result.currency, result.cashAmount < 0)}
            </span>
          </div>
        ) : null}
      </div>
      {resultTotal > 0 ? (
        <div
          className="result-share-bar"
          role="img"
          aria-label={t('result.operationAria', { value: resultStockSharePct })}
        >
          <span
            className="result-share-bar__segment result-share-bar__segment--stock"
            style={{ width: `${resultStockSharePct}%` }}
          />
          <span className="result-share-bar__segment result-share-bar__segment--bond" />
        </div>
      ) : null}
      {localizedContributionNote ? (
        <div className="alert alert-info result-note">{localizedContributionNote}</div>
      ) : null}
      {localizedToleranceNote ? (
        <div className="alert alert-info result-note">{localizedToleranceNote}</div>
      ) : null}
      <ResultBreakdown title={t('asset.stocks')} modifier="stock" rows={result.stocksBreakdown} t={t} />
      <ResultBreakdown title={t('asset.bonds')} modifier="bond" rows={result.bondsBreakdown} t={t} />
      <ResultBreakdown title={t('asset.cash')} modifier="cash" rows={result.cashBreakdown} t={t} />
      <p className="result-disclaimer">{localizedFxDisclaimer}</p>
      <p className="result-disclaimer">{t('result.breakdownEstimate')}</p>
      {exportMessage ? <p className="form-actions__hint">{exportMessage}</p> : null}
    </div>
  );
}

function AssetClassSection({
  name,
  labelId,
  valuesArr,
  error,
  totalBase,
  t,
  onAdd,
  onRemove,
  onValueChange,
  onCurrencyChange,
}) {
  const isStocks = name === 'stocksValues';
  const isCash = name === 'cashValues';
  const label = isStocks ? t('asset.stocks') : isCash ? t('asset.cash') : t('asset.bonds');
  const description = isStocks
    ? t('asset.stocksHint')
    : isCash
      ? t('asset.cashHint')
      : t('asset.bondsHint');
  const modifier = isStocks ? 'stock' : isCash ? 'cash' : 'bond';

  return (
    <div className={`form-group asset-class asset-class--${modifier}`}>
      <div className="asset-class__header">
        <label htmlFor={labelId} className="asset-class__label">
          {label}
        </label>
        {totalBase > 0 ? (
          <span className="asset-class__total">{formatAmount(totalBase, 'rub')}</span>
        ) : null}
      </div>
      <span className="asset-class__hint">{description}</span>
      {valuesArr.map((element, index) => (
        <div className="position-row" data-asset={name} data-index={index} key={`${name}-${index}`}>
          {index > 0 ? (
            <button
              type="button"
              className="btn number-field minus"
              aria-label={t('asset.removePosition', { number: index + 1 })}
              onClick={() => onRemove(name, index)}
            >
              <IconMinus />
            </button>
          ) : (
            <span className="position-row__spacer" aria-hidden="true" />
          )}
          <input
            className={`form-control position-row__amount number-field${error ? ' is-invalid' : ''}`}
            type="number"
            min="0"
            step="any"
            name={`${name}_value_${index}`}
            id={index === 0 ? labelId : `${labelId}_${index}`}
            value={element.value}
            placeholder={t('asset.position', { number: index + 1 })}
            onChange={(event) => onValueChange(name, index, event.target.value)}
          />
          <select
            className="form-control position-row__currency number-field"
            name={`${name}_currency_${index}`}
            aria-label={t('asset.positionCurrency', { number: index + 1 })}
            value={element.currency}
            onChange={(event) => onCurrencyChange(name, index, event.target.value)}
          >
            {currencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.text}
              </option>
            ))}
          </select>
        </div>
      ))}
      <button
        type="button"
        className={`btn btn-add-position btn-add-position--${modifier} w-100`}
        onClick={() => onAdd(name)}
      >
        <IconPlus className="me-2" />
        {t('asset.addPosition')}
      </button>
      {error ? <div className="field-error d-block">{error}</div> : null}
    </div>
  );
}

function RatioSection({
  ratio,
  ratioValidClass,
  ratioError,
  glideMode,
  currentAge,
  retirementAge,
  yearsToGoal,
  t,
  onRatioTextChange,
  onRatioSliderChange,
  onRatioSliderCommit,
  onPreset,
  onGlideModeChange,
  onCurrentAgeChange,
  onRetirementAgeChange,
  onYearsToGoalChange,
  onGlideApply,
}) {
  const ratioParts = getRatioParts(ratio.text);

  return (
    <section className="form-section" aria-labelledby="section-ratio">
      <h2 className="form-section__title" id="section-ratio">
        <span className="form-section__number">2</span>
        <span>
          {t('ratio.title')}
          <small>{t('ratio.subtitle')}</small>
        </span>
      </h2>
      <div className="form-group">
        <label htmlFor="ratio">{t('ratio.label')}</label>
        <div className="ratio-tiles" aria-live="polite">
          <div className="ratio-tile ratio-tile--stock">
            <span className="ratio-tile__label">{t('asset.stocks')}</span>
            <span className="ratio-tile__value">{ratioParts.stocks}%</span>
          </div>
          <div className="ratio-tile ratio-tile--bond">
            <span className="ratio-tile__label">{t('asset.bonds')}</span>
            <span className="ratio-tile__value">{ratioParts.bonds}%</span>
          </div>
          {ratioParts.cash > 0 ? (
            <div className="ratio-tile ratio-tile--cash">
              <span className="ratio-tile__label">{t('asset.cash')}</span>
              <span className="ratio-tile__value">{ratioParts.cash}%</span>
            </div>
          ) : null}
        </div>
        <div className="range-slider__container">
          <input
            type="range"
            className="range-slider"
            min="0"
            max="100"
            step="1"
            value={Number(ratio.value) || 0}
            aria-labelledby="ratio"
            onChange={(event) => onRatioSliderChange(Number(event.target.value))}
            onMouseUp={onRatioSliderCommit}
            onTouchEnd={onRatioSliderCommit}
            onKeyUp={onRatioSliderCommit}
          />
        </div>
        <input
          required
          className={`form-control ${ratioValidClass}${ratioError ? ' is-invalid' : ''}`}
          type="text"
          name="ratio"
          id="ratio"
          value={ratio.text}
          placeholder="70/30"
          onChange={(event) => onRatioTextChange(event.target.value)}
          onBlur={onRatioSliderCommit}
        />
        <p className="form-text ratio-helper">{t('ratio.helper')}</p>
        <div className="preset-row">
          {ALLOCATION_PRESETS.map((preset) => (
            <button
              key={preset.ratio}
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => onPreset(preset.ratio, preset.slider)}
            >
              {preset.ratio === '100'
                ? t('ratio.presetStocks')
                : preset.ratio === '0'
                  ? t('ratio.presetBonds')
                  : preset.label}
            </button>
          ))}
        </div>
        <GlidePath
          glideMode={glideMode}
          currentAge={currentAge}
          retirementAge={retirementAge}
          yearsToGoal={yearsToGoal}
          onGlideModeChange={onGlideModeChange}
          onCurrentAgeChange={onCurrentAgeChange}
          onRetirementAgeChange={onRetirementAgeChange}
          onYearsToGoalChange={onYearsToGoalChange}
          onApply={onGlideApply}
        />
        {ratioError ? <div className="field-error d-block">{ratioError}</div> : null}
      </div>
    </section>
  );
}

function DistributionBar({ allocation, ratioParts, isRebalanceMode, t }) {
  const drift = allocation.maxDrift(ratioParts);
  const showCash = allocation.currentCashPct > 0 || ratioParts.cash > 0;
  const targetLabel = targetRatioLabel(ratioParts);

  return (
    <div className="distribution" aria-live="polite">
      <div className="distribution__header">
        <span className="distribution__title">{t('allocation.current')}</span>
        <span className="distribution__drift">{t('allocation.drift', { value: drift })}</span>
      </div>
      <div
        className="distribution__bar"
        role="img"
        aria-label={t('allocation.aria', {
          stocks: allocation.currentStockPct,
          bonds: allocation.currentBondPct,
          cash: allocation.currentCashPct,
        })}
      >
        <span
          className="distribution__segment distribution__segment--stock"
          style={{ width: `${allocation.currentStockPct}%` }}
        />
        {showCash ? (
          <>
            <span
              className="distribution__segment distribution__segment--bond"
              style={{ width: `${allocation.currentBondPct}%` }}
            />
            <span
              className="distribution__segment distribution__segment--cash"
              style={{ width: `${allocation.currentCashPct}%` }}
            />
          </>
        ) : (
          <span className="distribution__segment distribution__segment--bond" />
        )}
      </div>
      <div className="distribution__legend">
        <span>
          {t('asset.stocks')} {allocation.currentStockPct}%
        </span>
        <span>{t('allocation.target', { value: targetLabel })}</span>
        <span>
          {t('asset.bonds')} {allocation.currentBondPct}%
        </span>
        {showCash ? (
          <span>
            {t('asset.cash')} {allocation.currentCashPct}%
          </span>
        ) : null}
      </div>
      {allocation.isDriftHigh(ratioParts) && !isRebalanceMode ? (
        <p className="distribution__note">{t('allocation.highDrift')}</p>
      ) : null}
    </div>
  );
}

function createInitialFormState() {
  const fromUrl = readScenarioFromUrl();
  const initialScenario = fromUrl ?? loadDraftState();
  const applied = applyScenarioState(initialScenario ?? {});
  return {
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
    _clearedUrl: Boolean(fromUrl),
  };
}

export function CalculatorForm() {
  const { locale, t, setLocale } = useLocale();
  const [state, setState] = useState(createInitialFormState);
  const [csvOpen, setCsvOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const resultRef = useRef(null);
  const draftTimerRef = useRef(null);
  const stateRef = useRef(state);
  const ratesRequestIdRef = useRef(0);

  stateRef.current = state;

  const buildDraftPayload = useCallback((snapshot) => {
    return buildScenarioState({
      ratio: snapshot.ratio,
      assets: snapshot.assets,
      contributionAmount: snapshot.contributionAmount,
      calculationMode: snapshot.calculationMode,
      driftThreshold: snapshot.driftThreshold,
      minTradeAmount: snapshot.minTradeAmount,
    });
  }, []);

  const flushDraft = useCallback(() => {
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
    }
    saveDraftState(buildDraftPayload(stateRef.current));
  }, [buildDraftPayload]);

  const scheduleDraft = useCallback(() => {
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
    }
    draftTimerRef.current = setTimeout(() => {
      draftTimerRef.current = null;
      saveDraftState(buildDraftPayload(stateRef.current));
    }, DRAFT_DEBOUNCE_MS);
  }, [buildDraftPayload]);

  useEffect(() => {
    if (state._clearedUrl) {
      clearScenarioFromUrl();
      setState((prev) => {
        const { _clearedUrl, ...rest } = prev;
        return rest;
      });
    }
  }, [state._clearedUrl]);

  useEffect(() => {
    scheduleDraft();
  }, [
    state.ratio,
    state.assets,
    state.contributionAmount,
    state.calculationMode,
    state.driftThreshold,
    state.minTradeAmount,
    scheduleDraft,
  ]);

  useEffect(() => {
    return () => {
      flushDraft();
    };
  }, [flushDraft]);

  useEffect(() => {
    const requestId = ++ratesRequestIdRef.current;
    fetchRates(locale)
      .then((rates) => {
        if (requestId !== ratesRequestIdRef.current) {
          return;
        }
        setFxRates(rates.ratesPerUnitInRub, rates);
        setState((prev) => ({
          ...prev,
          ratesError: rates.stale ? t('error.ratesStale') : null,
        }));
      })
      .catch((error) => {
        if (requestId !== ratesRequestIdRef.current) {
          return;
        }
        setState((prev) => ({
          ...prev,
          ratesError: error.summary ?? t('error.ratesPreview'),
        }));
      });
  }, [locale, t]);

  const applyRatio = useCallback((text, sliderValue) => {
    setState((prev) => ({
      ...prev,
      ratio: { text, value: sliderValue },
      ratioValidClass: validateRatioText(text),
    }));
  }, []);

  const runClientValidation = useCallback(() => {
    const snapshot = stateRef.current;
    const errors = {};
    const isRebalanceMode = snapshot.calculationMode === CALCULATION_MODES.rebalance;

    if (snapshot.ratioValidClass !== 'is-valid') {
      errors.ratio = t('error.invalidRatio');
    }

    if (
      !hasFilledPosition(snapshot.assets.stocksValues) &&
      !hasFilledPosition(snapshot.assets.bondsValues) &&
      !hasFilledPosition(snapshot.assets.cashValues)
    ) {
      errors.stocks = t('error.noPositions');
      errors.bonds = errors.stocks;
    }

    if (!isRebalanceMode) {
      const amount = Number(snapshot.contributionAmount.value);
      if (snapshot.contributionAmount.value === '' || Number.isNaN(amount) || amount <= 0) {
        errors.contribution = t('error.invalidContribution');
      }
    }

    setState((prev) => ({ ...prev, clientErrors: errors }));
    return Object.keys(errors).length === 0;
  }, [t]);

  const scrollToResult = () => {
    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setState((prev) => ({
      ...prev,
      fieldErrors: {},
      result: null,
      shareMessage: '',
    }));

    if (!runClientValidation()) {
      return;
    }

    flushDraft();
    setState((prev) => ({ ...prev, submitDisabled: true }));

    try {
      const snapshot = stateRef.current;
      const payload = buildCalculatePayload({
        ratio: snapshot.ratio,
        assets: snapshot.assets,
        contributionAmount: snapshot.contributionAmount,
        calculationMode: snapshot.calculationMode,
        driftThreshold: snapshot.driftThreshold,
        minTradeAmount: snapshot.minTradeAmount,
      });
      const response = await calculatePortfolio(payload, locale);
      const currency = response.currency ?? snapshot.contributionAmount.currency;
      const stocksAmount = normalizeDiffAmount(response.stocksDiff);
      const bondsAmount = normalizeDiffAmount(response.bondsDiff);
      const cashAmount = normalizeDiffAmount(response.cashDiff);

      if (response.fx?.ratesPerUnitInRub) {
        setFxRates(response.fx.ratesPerUnitInRub, response.fx);
      }

      setState((prev) => ({
        ...prev,
        result: {
          type: 'success',
          currency,
          stocksAmount,
          bondsAmount,
          cashAmount,
          mode: response.mode ?? snapshot.calculationMode,
          contributionOnlyNote: response.contributionOnlyNote,
          toleranceNote: response.toleranceNote,
          fx: response.fx,
          stocksBreakdown: mapServerBreakdown(response.stocksBreakdown),
          bondsBreakdown: mapServerBreakdown(response.bondsBreakdown),
          cashBreakdown: mapServerBreakdown(response.cashBreakdown),
        },
      }));
      trackEvent('calculate_success', { mode: snapshot.calculationMode });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        fieldErrors: error.fieldErrors ?? {},
        result: {
          type: 'error',
          summary: error.summary ?? error.message,
          code: error.code,
        },
      }));
    } finally {
      setState((prev) => ({ ...prev, submitDisabled: false }));
      scrollToResult();
    }
  };

  const handleRatioTextChange = (text) => {
    const parts = text.split('/');
    applyRatio(text, Number(parts[0]) || 0);
  };

  const handleRatioSliderChange = (sliderValue) => {
    const cashPct = getRatioParts(stateRef.current.ratio.text).cash;
    applyRatio(ratioTextFromSlider(sliderValue, cashPct), sliderValue);
  };

  const handleAddPosition = (name) => {
    setState((prev) => ({
      ...prev,
      assets: {
        ...prev.assets,
        [name]: [...prev.assets[name], { value: '', currency: currencyOptions[0].value }],
      },
    }));
  };

  const handleRemovePosition = (name, index) => {
    setState((prev) => ({
      ...prev,
      assets: {
        ...prev.assets,
        [name]: prev.assets[name].filter((_, i) => i !== index),
      },
    }));
  };

  const handlePositionValue = (name, index, value) => {
    setState((prev) => ({
      ...prev,
      assets: {
        ...prev.assets,
        [name]: prev.assets[name].map((item, i) => (i === index ? { ...item, value } : item)),
      },
    }));
  };

  const handlePositionCurrency = (name, index, currency) => {
    setState((prev) => ({
      ...prev,
      assets: {
        ...prev.assets,
        [name]: prev.assets[name].map((item, i) => (i === index ? { ...item, currency } : item)),
      },
    }));
  };

  const handleGlideApply = () => {
    const result = applyGlidePath(stateRef.current);
    if (result) {
      applyRatio(result.ratioText, result.sliderValue);
    }
  };

  const handleShare = async () => {
    flushDraft();
    const url = getShareableUrl(buildDraftPayload(stateRef.current));
    try {
      await navigator.clipboard.writeText(url);
      setState((prev) => ({ ...prev, shareMessage: t('message.shareCopied') }));
    } catch {
      setState((prev) => ({ ...prev, shareMessage: url }));
    }
  };

  const handleReset = () => {
    clearDraftState();
    clearScenarioFromUrl();
    const reset = applyScenarioState({});
    setState((prev) => ({
      ...prev,
      ...reset,
      ratioValidClass: validateRatioText(reset.ratio.text),
      result: null,
      shareMessage: '',
      exportMessage: '',
      clientErrors: {},
      fieldErrors: {},
    }));
  };

  const handleCopyResult = async () => {
    const { result } = stateRef.current;
    if (!result || result.type !== 'success') {
      return;
    }
    try {
      await copyTextToClipboard(
        buildResultText(
          {
            ...result,
            contributionOnlyNote: localizeServerNote(result.contributionOnlyNote, locale, t),
            toleranceNote: localizeServerNote(result.toleranceNote, locale, t),
            fxDisclaimer: formatFxDisclaimer(result.fx, locale),
          },
          locale,
        ),
      );
      setState((prev) => ({ ...prev, exportMessage: t('message.resultCopied') }));
    } catch {
      setState((prev) => ({ ...prev, exportMessage: t('message.resultCopyFailed') }));
    }
  };

  const handleDownloadResult = () => {
    const { result } = stateRef.current;
    if (!result || result.type !== 'success') {
      return;
    }
    downloadCsv(buildResultCsv(result, locale));
    setState((prev) => ({ ...prev, exportMessage: t('message.csvDownloaded') }));
  };

  const handleImportAssets = (importedAssets) => {
    setState((prev) => ({
      ...prev,
      assets: {
        stocksValues: importedAssets.stocksValues?.length
          ? importedAssets.stocksValues
          : prev.assets.stocksValues,
        bondsValues: importedAssets.bondsValues?.length
          ? importedAssets.bondsValues
          : prev.assets.bondsValues,
        cashValues: importedAssets.cashValues?.length
          ? importedAssets.cashValues
          : prev.assets.cashValues,
      },
    }));
  };

  const handleLoadScenario = (scenario) => {
    const next = applyScenarioState(scenario);
    setState((prev) => ({
      ...prev,
      ...next,
      ratioValidClass: validateRatioText(next.ratio.text),
    }));
  };

  const ratioParts = getRatioParts(state.ratio.text);
  const allocation = getCurrentAllocation(
    state.assets.stocksValues,
    state.assets.bondsValues,
    state.assets.cashValues,
  );
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

  return (
    <div className="calculator-card">
      <header className="calculator-card__header">
        <div className="calculator-card__header-row">
          <span className="calculator-card__eyebrow">{t('app.eyebrow')}</span>
          <div className="form-group locale-switcher mb-0">
            <label htmlFor="locale" className="visually-hidden">
              {t('locale.label')}
            </label>
            <select
              id="locale"
              className="form-control form-control--sm"
              value={locale}
              onChange={(event) => setLocale(event.target.value)}
            >
              {SUPPORTED_LOCALES.map((code) => (
                <option key={code} value={code}>
                  {code.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
        <h1 className="calculator-card__title">{t('app.title')}</h1>
        <p className="calculator-card__subtitle">{t('app.subtitle')}</p>
      </header>

      {configError ? <div className="alert alert-danger mb-3">{configError}</div> : null}
      {state.ratesError ? <div className="alert alert-warning mb-3">{state.ratesError}</div> : null}

      <form className="portfolio-balancer-form" noValidate onSubmit={handleSubmit}>
        <section className="form-section" aria-labelledby="section-mode">
          <h2 className="form-section__title" id="section-mode">
            <span className="form-section__number">1</span>
            <span>
              {t('mode.title')}
              <small>{t('mode.subtitle')}</small>
            </span>
          </h2>
          <div className="form-group">
            <select
              className="form-control"
              value={state.calculationMode}
              onChange={(event) =>
                setState((prev) => ({ ...prev, calculationMode: event.target.value }))
              }
            >
              <option value={CALCULATION_MODES.contribution}>{t('mode.contribution')}</option>
              <option value={CALCULATION_MODES.rebalance}>{t('mode.rebalance')}</option>
            </select>
            <p className="form-text">
              {isRebalanceMode ? t('mode.rebalanceHint') : t('mode.contributionHint')}
            </p>
          </div>
        </section>

        <RatioSection
          ratio={state.ratio}
          ratioValidClass={state.ratioValidClass}
          ratioError={fieldError(state.clientErrors, state.fieldErrors, 'ratio')}
          glideMode={state.glideMode}
          currentAge={state.currentAge}
          retirementAge={state.retirementAge}
          yearsToGoal={state.yearsToGoal}
          t={t}
          onRatioTextChange={handleRatioTextChange}
          onRatioSliderChange={handleRatioSliderChange}
          onRatioSliderCommit={() => {}}
          onPreset={(text, slider) => applyRatio(text, slider)}
          onGlideModeChange={(value) => setState((prev) => ({ ...prev, glideMode: value }))}
          onCurrentAgeChange={(value) => setState((prev) => ({ ...prev, currentAge: value }))}
          onRetirementAgeChange={(value) =>
            setState((prev) => ({ ...prev, retirementAge: value }))
          }
          onYearsToGoalChange={(value) => setState((prev) => ({ ...prev, yearsToGoal: value }))}
          onGlideApply={handleGlideApply}
        />

        {allocation.hasPositions ? (
          <DistributionBar
            allocation={allocation}
            ratioParts={ratioParts}
            isRebalanceMode={isRebalanceMode}
            t={t}
          />
        ) : null}

        <section className="form-section" aria-labelledby="section-portfolio">
          <h2 className="form-section__title" id="section-portfolio">
            <span className="form-section__number">3</span>
            <span>
              {t('portfolio.title')}
              <small>{t('portfolio.subtitle')}</small>
            </span>
          </h2>
          {showCurrencyWarning ? (
            <div className="alert alert-warning currency-warning">
              <IconWarning className="me-2" />
              {t('portfolio.mixedCurrencies')}
            </div>
          ) : null}
          <div className="portfolio-classes">
            <AssetClassSection
              name="stocksValues"
              labelId="stockValue"
              valuesArr={state.assets.stocksValues}
              error={fieldError(state.clientErrors, state.fieldErrors, 'stocks')}
              totalBase={allocation.stockTotalBase}
              t={t}
              onAdd={handleAddPosition}
              onRemove={handleRemovePosition}
              onValueChange={handlePositionValue}
              onCurrencyChange={handlePositionCurrency}
            />
            <div className="asset-divider" aria-hidden="true" />
            <AssetClassSection
              name="bondsValues"
              labelId="bondValue"
              valuesArr={state.assets.bondsValues}
              error={fieldError(state.clientErrors, state.fieldErrors, 'bonds')}
              totalBase={allocation.bondTotalBase}
              t={t}
              onAdd={handleAddPosition}
              onRemove={handleRemovePosition}
              onValueChange={handlePositionValue}
              onCurrencyChange={handlePositionCurrency}
            />
            <div className="asset-divider" aria-hidden="true" />
            <AssetClassSection
              name="cashValues"
              labelId="cashValue"
              valuesArr={state.assets.cashValues}
              error={fieldError(state.clientErrors, state.fieldErrors, 'cash')}
              totalBase={allocation.cashTotalBase}
              t={t}
              onAdd={handleAddPosition}
              onRemove={handleRemovePosition}
              onValueChange={handlePositionValue}
              onCurrencyChange={handlePositionCurrency}
            />
          </div>
          <div className="portfolio-import-row">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setCsvOpen(true)}
            >
              {t('action.import')}
            </button>
          </div>
        </section>

        <section className="form-section" aria-labelledby="section-advanced">
          <h2 className="form-section__title" id="section-advanced">
            <span className="form-section__number">4</span>
            <span>
              {t('advanced.title')}
              <small>{t('advanced.subtitle')}</small>
            </span>
          </h2>
          <div className="advanced-grid">
            <div className="form-group">
              <label htmlFor="driftThreshold">{t('advanced.driftThreshold')}</label>
              <input
                id="driftThreshold"
                className="form-control"
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={state.driftThreshold}
                placeholder="0"
                onChange={(event) =>
                  setState((prev) => ({ ...prev, driftThreshold: event.target.value }))
                }
              />
              <p className="form-text">{t('advanced.driftHint')}</p>
            </div>
            <div className="form-group">
              <label htmlFor="minTradeAmount">{t('advanced.minTrade')}</label>
              <input
                id="minTradeAmount"
                className="form-control"
                type="number"
                min="0"
                step="any"
                value={state.minTradeAmount}
                placeholder="0"
                onChange={(event) =>
                  setState((prev) => ({ ...prev, minTradeAmount: event.target.value }))
                }
              />
              <p className="form-text">{t('advanced.minTradeHint')}</p>
            </div>
          </div>
        </section>

        <section className="form-section" aria-labelledby="section-contribution">
          <h2 className="form-section__title" id="section-contribution">
            <span className="form-section__number">5</span>
            <span>
              {isRebalanceMode ? t('contribution.rebalanceTitle') : t('contribution.title')}
              <small>
                {isRebalanceMode ? t('contribution.rebalanceSubtitle') : t('contribution.subtitle')}
              </small>
            </span>
          </h2>
          <div className="form-group">
            <label htmlFor="contributionAmount">
              {isRebalanceMode ? t('contribution.rebalanceLabel') : t('contribution.label')}
            </label>
            <div className="contribution-row">
              <input
                required={!isRebalanceMode}
                className={`form-control contribution-row__amount number-field${
                  fieldError(state.clientErrors, state.fieldErrors, 'contribution')
                    ? ' is-invalid'
                    : ''
                }`}
                type="number"
                min={isRebalanceMode ? '0' : '1'}
                step="any"
                name="contributionAmount"
                id="contributionAmount"
                value={state.contributionAmount.value}
                placeholder={isRebalanceMode ? '0' : '50 000'}
                onChange={(event) =>
                  setState((prev) => ({
                    ...prev,
                    contributionAmount: { ...prev.contributionAmount, value: event.target.value },
                    clientErrors: { ...prev.clientErrors, contribution: undefined },
                  }))
                }
              />
              <select
                className="form-control contribution-row__currency number-field"
                name="contributionAmount_currency"
                aria-label={t('contribution.currency')}
                value={state.contributionAmount.currency}
                onChange={(event) =>
                  setState((prev) => ({
                    ...prev,
                    contributionAmount: {
                      ...prev.contributionAmount,
                      currency: event.target.value,
                    },
                  }))
                }
              >
                {currencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.text}
                  </option>
                ))}
              </select>
            </div>
            {fieldError(state.clientErrors, state.fieldErrors, 'contribution') ? (
              <div className="field-error d-block">
                {fieldError(state.clientErrors, state.fieldErrors, 'contribution')}
              </div>
            ) : null}
          </div>
        </section>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-calculate" disabled={submitDisabled}>
            {state.submitDisabled ? (
              <>
                <span className="spinner" role="status" aria-hidden="true" />
                {t('action.calculating')}
              </>
            ) : (
              t('action.calculate')
            )}
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={handleShare}>
            {t('action.share')}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setLibraryOpen(true)}
          >
            {t('action.library')}
          </button>
          <AppLink className="btn btn-outline-secondary" to="/compare">
            {t('action.compare')}
          </AppLink>
          <button type="button" className="btn btn-link" onClick={handleReset}>
            {t('action.reset')}
          </button>
          {state.shareMessage ? (
            <p className="form-actions__hint">{state.shareMessage}</p>
          ) : null}
          <p className="form-actions__hint">
            {isRebalanceMode ? t('form.rebalanceHint') : t('form.contributionHint')}
          </p>
        </div>
      </form>

      <section
        className="calculator-result"
        ref={resultRef}
        data-result
        aria-labelledby="section-result"
      >
        <h2 className="form-section__title visually-hidden" id="section-result">
          {t('result.section')}
        </h2>
        <ResultCard
          result={state.result}
          calculationMode={state.calculationMode}
          exportMessage={state.exportMessage}
          locale={locale}
          t={t}
          onCopy={handleCopyResult}
          onDownload={handleDownloadResult}
          onEdit={() => setState((prev) => ({ ...prev, result: null, exportMessage: '' }))}
        />
      </section>

      <Suspense fallback={null}>
        {csvOpen ? (
          <CsvImportDialog open={csvOpen} onClose={() => setCsvOpen(false)} onImport={handleImportAssets} />
        ) : null}
        {libraryOpen ? (
          <ScenarioLibraryDialog
            open={libraryOpen}
            onClose={() => setLibraryOpen(false)}
            currentState={buildDraftPayload(state)}
            onLoadScenario={handleLoadScenario}
          />
        ) : null}
      </Suspense>
    </div>
  );
}
