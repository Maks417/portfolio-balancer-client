import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Form,
  FormGroup,
  Button,
  Label,
  Input,
  FormFeedback,
  FormText,
} from 'reactstrap';
import RangeSlider from 'react-bootstrap-range-slider';
import {
  CALCULATION_MODES,
  calculatePortfolio,
  fetchRates,
  getApiBaseUrl,
} from '../api/portfolioApi';
import {
  ALLOCATION_PRESETS,
  BREAKDOWN_ESTIMATE_NOTE,
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
import { useLocale } from '../i18n/LocaleContext';
import { SUPPORTED_LOCALES } from '../i18n/translations';
import CsvImportModal from './CsvImportModal';
import ScenarioLibrary from './ScenarioLibrary';
import GlidePathPanel from './GlidePathPanel';

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

const BalanceForm = () => {
  const { locale, setLocale, t } = useLocale();
  const resultRef = useRef(null);
  const initialScenario = readScenarioFromUrl() ?? loadDraftState();
  const applied = applyScenarioState(initialScenario ?? {});

  const [ratioValidClass, setRatioValidClass] = useState(
    validateRatioText(applied.ratio.text),
  );
  const [ratio, setRatio] = useState(applied.ratio);
  const [assets, setAssets] = useState(applied.assets);
  const [contributionAmount, setContributionAmount] = useState(applied.contributionAmount);
  const [calculationMode, setCalculationMode] = useState(applied.calculationMode);
  const [driftThreshold, setDriftThreshold] = useState(applied.driftThreshold);
  const [minTradeAmount, setMinTradeAmount] = useState(applied.minTradeAmount);
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [clientErrors, setClientErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [result, setResult] = useState(null);
  const [ratesError, setRatesError] = useState(null);
  const [shareMessage, setShareMessage] = useState('');
  const [exportMessage, setExportMessage] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [configError, setConfigError] = useState(getApiBaseUrl() ? null : 'API не настроен');

  const ratioParts = getRatioParts(ratio.text);
  const showCurrencyWarning = hasMixedCurrencies(
    assets.stocksValues,
    assets.bondsValues,
    contributionAmount.currency,
    assets.cashValues,
  );

  const allocation = getCurrentAllocation(
    assets.stocksValues,
    assets.bondsValues,
    assets.cashValues,
  );
  const drift = allocation.driftFrom(ratioParts.stocks);
  const isRebalanceMode = calculationMode === CALCULATION_MODES.rebalance;

  const isSuccess = result?.type === 'success';
  const resultTotal = isSuccess
    ? Math.abs(result.stocksAmount ?? 0) + Math.abs(result.bondsAmount ?? 0)
    : 0;
  const resultStockSharePct =
    resultTotal > 0
      ? Math.round((Math.abs(result.stocksAmount ?? 0) / resultTotal) * 100)
      : 0;

  const contributionNumber = Number(contributionAmount.value);
  const isFormValid =
    ratioValidClass === 'is-valid' &&
    (isRebalanceMode || (contributionAmount.value !== '' && contributionNumber > 0)) &&
    !Number.isNaN(contributionNumber) &&
    (hasFilledPosition(assets.stocksValues) ||
      hasFilledPosition(assets.bondsValues) ||
      hasFilledPosition(assets.cashValues));

  useEffect(() => {
    let cancelled = false;

    fetchRates()
      .then((rates) => {
        if (cancelled) {
          return;
        }
        setFxRates(rates.ratesPerUnitInRub, rates);
        setRatesError(rates.stale ? 'Используются устаревшие курсы валют.' : null);
      })
      .catch((error) => {
        if (!cancelled) {
          setRatesError(error.summary ?? 'Не удалось загрузить курсы валют для предпросмотра.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (readScenarioFromUrl()) {
      clearScenarioFromUrl();
    }
  }, []);

  useEffect(() => {
    const scenario = buildScenarioState({
      ratio,
      assets,
      contributionAmount,
      calculationMode,
      driftThreshold,
      minTradeAmount,
    });
    saveDraftState(scenario);
  }, [ratio, assets, contributionAmount, calculationMode, driftThreshold, minTradeAmount]);

  const applyRatio = (text, sliderValue) => {
    setRatio({ text, value: sliderValue });
    setRatioValidClass(validateRatioText(text));
  };

  const validateRatio = (e) => {
    const text = e.target.value;
    const parts = text.split('/');
    applyRatio(text, Number(parts[0]) || 0);
  };

  const handleSliderRatio = (e) => {
    const sliderValue = Number(e.target.value);
    applyRatio(ratioTextFromSlider(sliderValue), sliderValue);
  };

  const addValueField = (e, name, valuesArr) => {
    e.preventDefault();
    setAssets((prevState) => ({
      ...prevState,
      [name]: [...valuesArr, { value: '', currency: currencyOptions[0].value }],
    }));
  };

  const removeValueField = (index, name, valuesArr) => {
    setAssets((prevState) => ({
      ...prevState,
      [name]: valuesArr.filter((_, i) => i !== index),
    }));
  };

  const handleValues = (index, e, name, valuesArr) => {
    const values = valuesArr.map((row, i) => {
      if (i !== index) {
        return row;
      }
      if (e.target.type === 'number') {
        return { ...row, value: e.target.value };
      }
      return { ...row, currency: e.target.value };
    });
    setAssets((prevState) => ({ ...prevState, [name]: values }));
  };

  const changeContribution = (e) => {
    if (e.target.type === 'number') {
      setContributionAmount((prev) => ({ ...prev, value: e.target.value }));
    } else {
      setContributionAmount((prev) => ({ ...prev, currency: e.target.value }));
    }
    setClientErrors((prev) => ({ ...prev, contribution: undefined }));
  };

  const runClientValidation = () => {
    const errors = {};

    if (ratioValidClass !== 'is-valid') {
      errors.ratio =
        'Значение пропорции должно быть 100, 0 или дробное (например, 50/50).';
    }

    if (
      !hasFilledPosition(assets.stocksValues) &&
      !hasFilledPosition(assets.bondsValues) &&
      !hasFilledPosition(assets.cashValues)
    ) {
      errors.stocks = 'Укажите хотя бы одну позицию в акциях, облигациях или наличных.';
      errors.bonds = errors.stocks;
    }

    if (!isRebalanceMode) {
      const amount = Number(contributionAmount.value);
      if (contributionAmount.value === '' || Number.isNaN(amount) || amount <= 0) {
        errors.contribution = 'Введите сумму взноса больше 0.';
      }
    }

    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const scrollToResult = () => {
    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const submitData = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setResult(null);
    setShareMessage('');

    if (!runClientValidation()) {
      return;
    }

    setSubmitDisabled(true);

    try {
      const payload = buildCalculatePayload({
        ratio,
        assets,
        contributionAmount,
        calculationMode,
        driftThreshold,
        minTradeAmount,
      });
      const response = await calculatePortfolio(payload);
      const currency = response.currency ?? contributionAmount.currency;
      const stocksAmount = normalizeDiffAmount(response.stocksDiff);
      const bondsAmount = normalizeDiffAmount(response.bondsDiff);
      const cashAmount = normalizeDiffAmount(response.cashDiff);

      if (response.fx?.ratesPerUnitInRub) {
        setFxRates(response.fx.ratesPerUnitInRub, response.fx);
      }

      setResult({
        type: 'success',
        currency,
        stocksAmount,
        bondsAmount,
        cashAmount,
        mode: response.mode ?? calculationMode,
        contributionOnlyNote: response.contributionOnlyNote,
        toleranceNote: response.toleranceNote,
        fxDisclaimer: formatFxDisclaimer(response.fx),
        stocksBreakdown: mapServerBreakdown(response.stocksBreakdown),
        bondsBreakdown: mapServerBreakdown(response.bondsBreakdown),
        cashBreakdown: mapServerBreakdown(response.cashBreakdown),
      });
      trackEvent('calculate_success', { mode: calculationMode });
      scrollToResult();
    } catch (error) {
      if (error.fieldErrors) {
        setFieldErrors(error.fieldErrors);
        setResult({ type: 'error', summary: error.summary, code: error.code });
      } else {
        setResult({
          type: 'error',
          summary: error.summary ?? error.message,
          code: error.code,
        });
      }
      scrollToResult();
    } finally {
      setSubmitDisabled(false);
    }
  };

  const handleShareScenario = async () => {
    const url = getShareableUrl(
      buildScenarioState({
        ratio,
        assets,
        contributionAmount,
        calculationMode,
        driftThreshold,
        minTradeAmount,
      }),
    );

    try {
      await navigator.clipboard.writeText(url);
      setShareMessage('Ссылка на сценарий скопирована в буфер обмена.');
    } catch {
      setShareMessage(url);
    }
  };

  const handleResetDraft = () => {
    clearDraftState();
    clearScenarioFromUrl();
    const reset = applyScenarioState({});
    setRatio(reset.ratio);
    setRatioValidClass(validateRatioText(reset.ratio.text));
    setAssets(reset.assets);
    setContributionAmount(reset.contributionAmount);
    setCalculationMode(reset.calculationMode);
    setDriftThreshold(reset.driftThreshold);
    setMinTradeAmount(reset.minTradeAmount);
    setResult(null);
    setShareMessage('');
    setExportMessage('');
  };

  const handleApplyPreset = (preset) => {
    applyRatio(preset.ratio, preset.slider);
  };

  const handleImportAssets = (importedAssets) => {
    setAssets((prev) => ({
      stocksValues: importedAssets.stocksValues?.length
        ? importedAssets.stocksValues
        : prev.stocksValues,
      bondsValues: importedAssets.bondsValues?.length
        ? importedAssets.bondsValues
        : prev.bondsValues,
      cashValues: importedAssets.cashValues?.length
        ? importedAssets.cashValues
        : prev.cashValues,
    }));
  };

  const handleLoadScenario = (scenario) => {
    const next = applyScenarioState(scenario);
    setRatio(next.ratio);
    setRatioValidClass(validateRatioText(next.ratio.text));
    setAssets(next.assets);
    setContributionAmount(next.contributionAmount);
    setCalculationMode(next.calculationMode);
    setDriftThreshold(next.driftThreshold);
    setMinTradeAmount(next.minTradeAmount);
  };

  const handleCopyResult = async () => {
    if (!result || result.type !== 'success') {
      return;
    }
    try {
      await copyTextToClipboard(buildResultText(result));
      setExportMessage('Результат скопирован в буфер обмена.');
    } catch {
      setExportMessage('Не удалось скопировать результат.');
    }
  };

  const handleDownloadResult = () => {
    if (!result || result.type !== 'success') {
      return;
    }
    downloadCsv(buildResultCsv(result));
    setExportMessage('CSV загружен.');
  };

  const handleApplyGlidePath = ({ ratioText, sliderValue }) => {
    applyRatio(ratioText, sliderValue);
  };

  const currentScenarioState = buildScenarioState({
    ratio,
    assets,
    contributionAmount,
    calculationMode,
    driftThreshold,
    minTradeAmount,
  });

  const fieldError = (key) => clientErrors[key] || fieldErrors[key];

  const renderCurrencySelect = ({ className, name, value, ariaLabel, onChange }) => (
    <Input
      className={className}
      type="select"
      name={name}
      value={value}
      aria-label={ariaLabel}
      onChange={onChange}
    >
      {currencyOptions.map((item) => (
        <option key={item.value} value={item.value}>
          {item.text}
        </option>
      ))}
    </Input>
  );

  const renderAssetClass = (name, labelId, valuesArr, fieldErrorKey, totalBase) => {
    const isStocks = name === 'stocksValues';
    const isCash = name === 'cashValues';
    const label = isStocks ? 'Акции' : isCash ? 'Наличные' : 'Облигации';
    const description = isStocks
      ? 'Стоимость каждой позиции в акциях'
      : isCash
        ? 'Свободные средства и депозиты'
        : 'Стоимость каждой позиции в облигациях';
    const modifier = isStocks ? 'stock' : isCash ? 'cash' : 'bond';

    return (
      <FormGroup className={`form-group asset-class asset-class--${modifier}`}>
        <div className="asset-class__header">
          <Label for={labelId} className="asset-class__label">
            {label}
          </Label>
          {totalBase > 0 && (
            <span className="asset-class__total">{formatAmount(totalBase, 'rub')}</span>
          )}
        </div>
        <span className="asset-class__hint">{description}</span>
        {valuesArr.map((element, index) => (
          <div className="position-row" key={`${name}-${index}`}>
            {index > 0 ? (
              <Button
                type="button"
                className="number-field minus"
                aria-label={`Удалить позицию ${index + 1}`}
                onClick={() => removeValueField(index, name, valuesArr)}
              >
                <i className="fa fa-minus" aria-hidden="true" />
              </Button>
            ) : (
              <span className="position-row__spacer" aria-hidden="true" />
            )}
            <Input
              className="position-row__amount number-field"
              type="number"
              min="0"
              step="any"
              name={`${name}_value_${index}`}
              id={index === 0 ? labelId : undefined}
              value={element.value}
              placeholder={`Позиция ${index + 1}`}
              invalid={Boolean(fieldError(fieldErrorKey))}
              onChange={(e) => handleValues(index, e, name, valuesArr)}
            />
            {renderCurrencySelect({
              className: 'position-row__currency number-field',
              name: `${name}_currency_${index}`,
              value: element.currency,
              ariaLabel: `Валюта позиции ${index + 1}`,
              onChange: (e) => handleValues(index, e, name, valuesArr),
            })}
          </div>
        ))}
        <Button
          type="button"
          className={`btn-add-position btn-add-position--${modifier} w-100`}
          onClick={(e) => addValueField(e, name, valuesArr)}
        >
          <i className="fa fa-plus me-2" aria-hidden="true" />
          Добавить позицию
        </Button>
        {fieldError(fieldErrorKey) && (
          <FormFeedback className="d-block">{fieldError(fieldErrorKey)}</FormFeedback>
        )}
      </FormGroup>
    );
  };

  const renderBreakdown = (title, modifier, rows) =>
    rows?.length > 0 ? (
      <div className="result-breakdown">
        <h4 className={`result-breakdown__title result-breakdown__title--${modifier}`}>
          {title}
        </h4>
        {rows.map((row, index) => (
          <div className="result-breakdown__row" key={`${modifier}-buy-${index}`}>
            <span>Позиция {index + 1}</span>
            <span className={`result-breakdown__amount result-breakdown__amount--${modifier}`}>
              {formatSignedAmount(row.amount, row.currency, row.isSell)}
            </span>
          </div>
        ))}
      </div>
    ) : null;

  return (
    <div className="calculator-card">
      <header className="calculator-card__header">
        <div className="calculator-card__header-row">
          <span className="calculator-card__eyebrow">Финансовый калькулятор</span>
          <FormGroup className="locale-switcher mb-0">
            <Label for="locale" className="visually-hidden">
              {t('locale.label')}
            </Label>
            <Input
              id="locale"
              type="select"
              bsSize="sm"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
            >
              {SUPPORTED_LOCALES.map((code) => (
                <option key={code} value={code}>
                  {code.toUpperCase()}
                </option>
              ))}
            </Input>
          </FormGroup>
        </div>
        <h1 className="calculator-card__title">{t('app.title')}</h1>
        <p className="calculator-card__subtitle">{t('app.subtitle')}</p>
      </header>

      {configError && (
        <Alert color="danger" className="mb-3">
          {configError}
        </Alert>
      )}

      {ratesError && (
        <Alert color="warning" className="mb-3">
          {ratesError}
        </Alert>
      )}

      <Form className="portfolio-balancer-form" onSubmit={submitData} noValidate>
        <section className="form-section" aria-labelledby="section-mode">
          <h2 className="form-section__title" id="section-mode">
            <span className="form-section__number">1</span>
            <span>
              Режим расчёта
              <small>Взнос или полная балансировка</small>
            </span>
          </h2>
          <FormGroup className="form-group">
            <Input
              type="select"
              value={calculationMode}
              onChange={(e) => setCalculationMode(e.target.value)}
            >
              <option value={CALCULATION_MODES.contribution}>{t('mode.contribution')}</option>
              <option value={CALCULATION_MODES.rebalance}>{t('mode.rebalance')}</option>
            </Input>
            <FormText>
              {isRebalanceMode
                ? 'Режим показывает покупки и продажи для достижения целевой пропорции без обязательного взноса.'
                : 'Режим распределяет только новый взнос между классами активов.'}
            </FormText>
          </FormGroup>
        </section>

        <section className="form-section" aria-labelledby="section-ratio">
          <h2 className="form-section__title" id="section-ratio">
            <span className="form-section__number">2</span>
            <span>
              Целевая пропорция
              <small>Настройте желаемый баланс портфеля</small>
            </span>
          </h2>
          <FormGroup className="form-group">
            <Label for="ratio">Пропорция портфеля (акции/облигации, %)</Label>
            <div className="ratio-tiles" aria-live="polite">
              <div className="ratio-tile ratio-tile--stock">
                <span className="ratio-tile__label">Акции</span>
                <span className="ratio-tile__value">{ratioParts.stocks}%</span>
              </div>
              <div className="ratio-tile ratio-tile--bond">
                <span className="ratio-tile__label">Облигации</span>
                <span className="ratio-tile__value">{ratioParts.bonds}%</span>
              </div>
              {ratioParts.cash > 0 && (
                <div className="ratio-tile ratio-tile--cash">
                  <span className="ratio-tile__label">Наличные</span>
                  <span className="ratio-tile__value">{ratioParts.cash}%</span>
                </div>
              )}
            </div>
            <div className="range-slider__container">
              <RangeSlider
                value={ratio.value}
                tooltip="off"
                variant="primary"
                onChange={handleSliderRatio}
                size="sm"
                aria-labelledby="ratio"
              />
            </div>
            <Input
              required
              className={ratioValidClass}
              type="text"
              name="ratio"
              id="ratio"
              value={ratio.text}
              placeholder="70/30"
              invalid={Boolean(fieldError('ratio'))}
              onChange={validateRatio}
            />
            <FormText className="ratio-helper">
              Введите 100 (только акции), 0 (только облигации), дробь 70/30 или 60/30/10
              (акции/облигации/наличные), где сумма равна 100.
            </FormText>
            <div className="preset-row">
              {ALLOCATION_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  size="sm"
                  color="secondary"
                  outline
                  onClick={() => handleApplyPreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <GlidePathPanel onApplyRatio={handleApplyGlidePath} />
            {fieldError('ratio') && (
              <FormFeedback className="d-block">{fieldError('ratio')}</FormFeedback>
            )}
          </FormGroup>
        </section>

        {allocation.hasPositions && (
          <div className="distribution" aria-live="polite">
            <div className="distribution__header">
              <span className="distribution__title">Текущее распределение</span>
              <span className="distribution__drift">Отклонение {drift}%</span>
            </div>
            <div
              className="distribution__bar"
              role="img"
              aria-label={`Акции ${allocation.currentStockPct}%, облигации ${allocation.currentBondPct}%`}
            >
              <span
                className="distribution__segment distribution__segment--stock"
                style={{ width: `${allocation.currentStockPct}%` }}
              />
              <span className="distribution__segment distribution__segment--bond" />
            </div>
            <div className="distribution__legend">
              <span>Акции {allocation.currentStockPct}%</span>
              <span>
                Цель {ratioParts.stocks}/{ratioParts.bonds}
              </span>
              <span>Облигации {allocation.currentBondPct}%</span>
            </div>
            {allocation.isDriftHigh(ratioParts.stocks) && !isRebalanceMode && (
              <p className="distribution__note">
                Отклонение от цели более 10%. Только взнос может не хватить для точной
                балансировки — рассмотрите режим полной балансировки.
              </p>
            )}
          </div>
        )}

        <section className="form-section" aria-labelledby="section-portfolio">
          <h2 className="form-section__title" id="section-portfolio">
            <span className="form-section__number">3</span>
            <span>
              Текущий портфель
              <small>Добавьте позиции по классам активов</small>
            </span>
          </h2>
          {showCurrencyWarning && (
            <Alert color="warning" className="currency-warning">
              <i className="fa fa-triangle-exclamation me-2" aria-hidden="true" />
              Позиции указаны в разных валютах. Конвертация выполняется на сервере.
            </Alert>
          )}
          <div className="portfolio-classes">
            {renderAssetClass(
              'stocksValues',
              'stockValue',
              assets.stocksValues,
              'stocks',
              allocation.stockTotalBase,
            )}
            <div className="asset-divider" aria-hidden="true" />
            {renderAssetClass(
              'bondsValues',
              'bondValue',
              assets.bondsValues,
              'bonds',
              allocation.bondTotalBase,
            )}
            <div className="asset-divider" aria-hidden="true" />
            {renderAssetClass(
              'cashValues',
              'cashValue',
              assets.cashValues,
              'cash',
              allocation.cashTotalBase,
            )}
          </div>
          <div className="portfolio-import-row">
            <Button type="button" color="secondary" outline onClick={() => setImportOpen(true)}>
              {t('action.import')}
            </Button>
          </div>
        </section>

        <section className="form-section" aria-labelledby="section-advanced">
          <h2 className="form-section__title" id="section-advanced">
            <span className="form-section__number">4</span>
            <span>
              Дополнительные параметры
              <small>Допуск отклонения и минимальный размер сделки</small>
            </span>
          </h2>
          <div className="advanced-grid">
            <FormGroup>
              <Label for="driftThreshold">Допуск отклонения (%)</Label>
              <Input
                id="driftThreshold"
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={driftThreshold}
                placeholder="0"
                onChange={(e) => setDriftThreshold(e.target.value)}
              />
              <FormText>Для режима полной балансировки: не ребалансировать, если отклонение ниже порога.</FormText>
            </FormGroup>
            <FormGroup>
              <Label for="minTradeAmount">Минимальная сделка</Label>
              <Input
                id="minTradeAmount"
                type="number"
                min="0"
                step="any"
                value={minTradeAmount}
                placeholder="0"
                onChange={(e) => setMinTradeAmount(e.target.value)}
              />
              <FormText>Сделки меньше порога будут округлены до нуля в разбивке по позициям.</FormText>
            </FormGroup>
          </div>
        </section>

        <section className="form-section" aria-labelledby="section-contribution">
          <h2 className="form-section__title" id="section-contribution">
            <span className="form-section__number">5</span>
            <span>
              {isRebalanceMode ? 'Дополнительный взнос (необязательно)' : 'Новый взнос'}
              <small>
                {isRebalanceMode
                  ? 'Можно оставить 0 для чистой балансировки'
                  : 'Сумма для распределения между активами'}
              </small>
            </span>
          </h2>
          <FormGroup className="form-group">
            <Label for="contributionAmount">
              {isRebalanceMode ? 'Дополнительная сумма' : 'Сумма, которую хотите внести'}
            </Label>
            <div className="contribution-row">
              <Input
                required={!isRebalanceMode}
                className="contribution-row__amount number-field"
                type="number"
                min={isRebalanceMode ? '0' : '1'}
                step="any"
                name="contributionAmount"
                id="contributionAmount"
                value={contributionAmount.value}
                placeholder={isRebalanceMode ? '0' : '50 000'}
                invalid={Boolean(fieldError('contribution'))}
                onChange={changeContribution}
              />
              {renderCurrencySelect({
                className: 'contribution-row__currency number-field',
                name: 'contributionAmount_currency',
                value: contributionAmount.currency,
                ariaLabel: 'Валюта взноса',
                onChange: changeContribution,
              })}
            </div>
            {fieldError('contribution') && (
              <FormFeedback className="d-block">{fieldError('contribution')}</FormFeedback>
            )}
          </FormGroup>
        </section>

        <div className="form-actions">
          <Button
            color="primary"
            type="submit"
            className="btn-calculate"
            disabled={submitDisabled || !isFormValid || Boolean(configError)}
          >
            {submitDisabled ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />
                Расчёт…
              </>
            ) : (
              t('action.calculate')
            )}
          </Button>
          <Button type="button" color="secondary" outline onClick={handleShareScenario}>
            {t('action.share')}
          </Button>
          <Button type="button" color="secondary" outline onClick={() => setLibraryOpen(true)}>
            {t('action.library')}
          </Button>
          <Button tag={Link} to="/compare" color="secondary" outline>
            {t('action.compare')}
          </Button>
          <Button type="button" color="link" onClick={handleResetDraft}>
            {t('action.reset')}
          </Button>
          {shareMessage && <p className="form-actions__hint">{shareMessage}</p>}
          <p className="form-actions__hint">
            {isRebalanceMode
              ? 'Расчёт покажет покупки и продажи по классам активов.'
              : 'Расчёт покажет, какую часть взноса направить в акции и облигации.'}
          </p>
        </div>
      </Form>

      <section
        ref={resultRef}
        className="calculator-result"
        aria-labelledby="section-result"
      >
        <h2 className="form-section__title visually-hidden" id="section-result">
          Результат
        </h2>

        {isSuccess && (
          <div className="result-card" role="status" aria-live="polite">
            <div className="result-card__header">
              <h3 className="result-card__title">Результат расчёта</h3>
              <div className="result-card__actions">
                <Button type="button" color="secondary" outline size="sm" onClick={handleCopyResult}>
                  {t('action.copy')}
                </Button>
                <Button
                  type="button"
                  color="secondary"
                  outline
                  size="sm"
                  onClick={handleDownloadResult}
                >
                  {t('action.downloadCsv')}
                </Button>
                <Button
                  type="button"
                  className="result-card__edit"
                  onClick={() => setResult(null)}
                >
                  Изменить
                </Button>
              </div>
            </div>

            <div className="result-metrics">
              <div className="result-metric result-metric--stock">
                <span className="result-metric__label">
                  {isRebalanceMode || (result.stocksAmount ?? 0) < 0
                    ? 'Акции'
                    : 'Докупить акции'}
                </span>
                <span className="result-metric__value">
                  {result.stocksAmount != null
                    ? formatSignedAmount(
                        result.stocksAmount,
                        result.currency,
                        result.stocksAmount < 0,
                      )
                    : '—'}
                </span>
              </div>
              <div className="result-metric result-metric--bond">
                <span className="result-metric__label">
                  {isRebalanceMode || (result.bondsAmount ?? 0) < 0
                    ? 'Облигации'
                    : 'Докупить облигации'}
                </span>
                <span className="result-metric__value">
                  {result.bondsAmount != null
                    ? formatSignedAmount(
                        result.bondsAmount,
                        result.currency,
                        result.bondsAmount < 0,
                      )
                    : '—'}
                </span>
              </div>
              {(result.cashAmount != null && result.cashAmount !== 0) && (
                <div className="result-metric result-metric--cash">
                  <span className="result-metric__label">Наличные</span>
                  <span className="result-metric__value">
                    {formatSignedAmount(
                      result.cashAmount,
                      result.currency,
                      result.cashAmount < 0,
                    )}
                  </span>
                </div>
              )}
            </div>

            {resultTotal > 0 && (
              <div
                className="result-share-bar"
                role="img"
                aria-label={`Акции ${resultStockSharePct}% операции`}
              >
                <span
                  className="result-share-bar__segment result-share-bar__segment--stock"
                  style={{ width: `${resultStockSharePct}%` }}
                />
                <span className="result-share-bar__segment result-share-bar__segment--bond" />
              </div>
            )}

            {result.contributionOnlyNote && (
              <Alert color="info" className="result-note">
                {result.contributionOnlyNote}
              </Alert>
            )}

            {result.toleranceNote && (
              <Alert color="info" className="result-note">
                {result.toleranceNote}
              </Alert>
            )}

            {renderBreakdown('Акции', 'stock', result.stocksBreakdown)}
            {renderBreakdown('Облигации', 'bond', result.bondsBreakdown)}
            {renderBreakdown('Наличные', 'cash', result.cashBreakdown)}

            <p className="result-disclaimer">{result.fxDisclaimer}</p>
            <p className="result-disclaimer">{BREAKDOWN_ESTIMATE_NOTE}</p>
            {exportMessage && <p className="form-actions__hint">{exportMessage}</p>}
          </div>
        )}

        {result?.type === 'error' && (
          <Alert color="danger" className="result-alert" role="alert">
            <i className="fa fa-circle-exclamation me-2" aria-hidden="true" />
            {result.summary}
          </Alert>
        )}
      </section>

      <CsvImportModal
        isOpen={importOpen}
        toggle={() => setImportOpen(false)}
        onImport={handleImportAssets}
      />
      <ScenarioLibrary
        isOpen={libraryOpen}
        toggle={() => setLibraryOpen(false)}
        currentState={currentScenarioState}
        onLoadScenario={handleLoadScenario}
      />
    </div>
  );
};

export default BalanceForm;
