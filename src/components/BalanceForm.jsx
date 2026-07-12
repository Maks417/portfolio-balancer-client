import React, { useEffect, useRef, useState } from 'react';
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
  getShareableUrl,
  loadDraftState,
  readScenarioFromUrl,
  saveDraftState,
  writeScenarioToUrl,
} from '../utils/scenarioStorage';

const defaultAssets = () => ({
  stocksValues: [{ value: '', currency: currencyOptions[0].value }],
  bondsValues: [{ value: '', currency: currencyOptions[0].value }],
});

const defaultContribution = () => ({
  value: '',
  currency: currencyOptions[0].value,
});

function applyScenarioState(scenario) {
  return {
    ratio: scenario.ratio ?? { text: '50/50', value: 50 },
    assets: scenario.assets ?? defaultAssets(),
    contributionAmount: scenario.contributionAmount ?? defaultContribution(),
    calculationMode: scenario.calculationMode ?? CALCULATION_MODES.contribution,
  };
}

const BalanceForm = () => {
  const resultRef = useRef(null);
  const initialScenario = readScenarioFromUrl() ?? loadDraftState();

  const [ratioValidClass, setRatioValidClass] = useState(
    validateRatioText(initialScenario?.ratio?.text ?? '50/50'),
  );
  const [ratio, setRatio] = useState(initialScenario?.ratio ?? { text: '50/50', value: 50 });
  const [assets, setAssets] = useState(initialScenario?.assets ?? defaultAssets());
  const [contributionAmount, setContributionAmount] = useState(
    initialScenario?.contributionAmount ?? defaultContribution(),
  );
  const [calculationMode, setCalculationMode] = useState(
    initialScenario?.calculationMode ?? CALCULATION_MODES.contribution,
  );
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [clientErrors, setClientErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [result, setResult] = useState(null);
  const [ratesError, setRatesError] = useState(null);
  const [shareMessage, setShareMessage] = useState('');
  const [configError, setConfigError] = useState(getApiBaseUrl() ? null : 'API не настроен');

  const ratioParts = getRatioParts(ratio.text);
  const showCurrencyWarning = hasMixedCurrencies(
    assets.stocksValues,
    assets.bondsValues,
    contributionAmount.currency,
  );

  const allocation = getCurrentAllocation(assets.stocksValues, assets.bondsValues);
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
    (hasFilledPosition(assets.stocksValues) || hasFilledPosition(assets.bondsValues));

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
    const scenario = buildScenarioState({
      ratio,
      assets,
      contributionAmount,
      calculationMode,
    });
    saveDraftState(scenario);
    writeScenarioToUrl(scenario);
  }, [ratio, assets, contributionAmount, calculationMode]);

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

    if (!hasFilledPosition(assets.stocksValues) && !hasFilledPosition(assets.bondsValues)) {
      errors.stocks = 'Укажите хотя бы одну позицию в акциях или облигациях.';
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
      });
      const response = await calculatePortfolio(payload);
      const currency = response.currency ?? contributionAmount.currency;
      const stocksAmount = normalizeDiffAmount(response.stocksDiff);
      const bondsAmount = normalizeDiffAmount(response.bondsDiff);

      if (response.fx?.ratesPerUnitInRub) {
        setFxRates(response.fx.ratesPerUnitInRub, response.fx);
      }

      setResult({
        type: 'success',
        currency,
        stocksAmount,
        bondsAmount,
        mode: response.mode ?? calculationMode,
        contributionOnlyNote: response.contributionOnlyNote,
        fxDisclaimer: formatFxDisclaimer(response.fx),
        stocksBreakdown: mapServerBreakdown(response.stocksBreakdown),
        bondsBreakdown: mapServerBreakdown(response.bondsBreakdown),
      });
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
      buildScenarioState({ ratio, assets, contributionAmount, calculationMode }),
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
    const reset = applyScenarioState({});
    setRatio(reset.ratio);
    setRatioValidClass(validateRatioText(reset.ratio.text));
    setAssets(reset.assets);
    setContributionAmount(reset.contributionAmount);
    setCalculationMode(reset.calculationMode);
    setResult(null);
    setShareMessage('');
  };

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
    const label = isStocks ? 'Акции' : 'Облигации';
    const description = isStocks
      ? 'Стоимость каждой позиции в акциях'
      : 'Стоимость каждой позиции в облигациях';
    const modifier = isStocks ? 'stock' : 'bond';

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
        <span className="calculator-card__eyebrow">Финансовый калькулятор</span>
        <h1 className="calculator-card__title">Балансировщик портфеля</h1>
        <p className="calculator-card__subtitle">
          Укажите текущие позиции и целевую долю акций/облигаций — подскажем,
          сколько докупить или как перераспределить активы.
        </p>
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
              <option value={CALCULATION_MODES.contribution}>
                Распределить новый взнос
              </option>
              <option value={CALCULATION_MODES.rebalance}>
                Полная балансировка (покупка и продажа)
              </option>
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
              Введите 100 (только акции), 0 (только облигации) или дробь, где сумма
              равна 100 (например, 70/30).
            </FormText>
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
          </div>
        </section>

        <section className="form-section" aria-labelledby="section-contribution">
          <h2 className="form-section__title" id="section-contribution">
            <span className="form-section__number">4</span>
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
              'Рассчитать'
            )}
          </Button>
          <Button type="button" color="secondary" outline onClick={handleShareScenario}>
            Поделиться сценарием
          </Button>
          <Button type="button" color="link" onClick={handleResetDraft}>
            Сбросить черновик
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
              <Button
                type="button"
                className="result-card__edit"
                onClick={() => setResult(null)}
              >
                Изменить
              </Button>
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

            {renderBreakdown('Акции', 'stock', result.stocksBreakdown)}
            {renderBreakdown('Облигации', 'bond', result.bondsBreakdown)}

            <p className="result-disclaimer">{result.fxDisclaimer}</p>
            <p className="result-disclaimer">{BREAKDOWN_ESTIMATE_NOTE}</p>
          </div>
        )}

        {result?.type === 'error' && (
          <Alert color="danger" className="result-alert" role="alert">
            <i className="fa fa-circle-exclamation me-2" aria-hidden="true" />
            {result.summary}
          </Alert>
        )}
      </section>
    </div>
  );
};

export default BalanceForm;
