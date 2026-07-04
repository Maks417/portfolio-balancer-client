import React, { useRef, useState } from 'react';
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
import axios from 'axios';
import {
  currencyOptions,
  formatAmount,
  getRatioParts,
  hasFilledPosition,
  hasMixedCurrencies,
  normalizeDiffAmount,
  parseApiFieldErrors,
  ratioTextFromSlider,
  validateRatioText,
} from '../utils/portfolioFormUtils';

const NETWORK_ERROR_MESSAGE =
  'Не удалось связаться с сервером. Попробуйте позже.';

const BalanceForm = () => {
  const resultRef = useRef(null);

  const [ratioValidClass, setRatioValidClass] = useState('is-valid');
  const [ratio, setRatio] = useState({ text: '50/50', value: 50 });
  const [assets, setAssets] = useState({
    stocksValues: [{ value: '', currency: currencyOptions[0].value }],
    bondsValues: [{ value: '', currency: currencyOptions[0].value }],
  });
  const [contributionAmount, setContributionAmount] = useState({
    value: '',
    currency: currencyOptions[0].value,
  });
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [clientErrors, setClientErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [result, setResult] = useState(null);

  const ratioParts = getRatioParts(ratio.text);
  const showCurrencyWarning = hasMixedCurrencies(
    assets.stocksValues,
    assets.bondsValues,
    contributionAmount.currency,
  );

  const contributionNumber = Number(contributionAmount.value);
  const isFormValid =
    ratioValidClass === 'is-valid' &&
    contributionAmount.value !== '' &&
    !Number.isNaN(contributionNumber) &&
    contributionNumber > 0 &&
    (hasFilledPosition(assets.stocksValues) ||
      hasFilledPosition(assets.bondsValues));

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
      [name]: [
        ...valuesArr,
        { value: '', currency: currencyOptions[0].value },
      ],
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
      !hasFilledPosition(assets.bondsValues)
    ) {
      errors.stocks =
        'Укажите хотя бы одну позицию в акциях или облигациях.';
      errors.bonds = errors.stocks;
    }

    const amount = Number(contributionAmount.value);
    if (contributionAmount.value === '' || Number.isNaN(amount) || amount <= 0) {
      errors.contribution = 'Введите сумму взноса больше 0.';
    }

    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const scrollToResult = () => {
    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const submitData = (e) => {
    e.preventDefault();
    setFieldErrors({});
    setResult(null);

    if (!runClientValidation()) {
      return;
    }

    const contributionNumber = Number(contributionAmount.value);
    setSubmitDisabled(true);

    const data = {
      ratio: ratio.text,
      stockValues: assets.stocksValues,
      bondValues: assets.bondsValues,
      contributionAmount: {
        value: String(contributionNumber),
        currency: contributionAmount.currency,
      },
    };

    const url = `${import.meta.env.VITE_API_BASE_URL}/portfolio/calculate`;

    axios
      .post(url, data, { headers: { 'Content-Type': 'application/json' } })
      .then((response) => {
        const currency = response.data.currency ?? contributionAmount.currency;
        const stocksAmount = normalizeDiffAmount(response.data.stocksDiff);
        const bondsAmount = normalizeDiffAmount(response.data.bondsDiff);

        setResult({
          type: 'success',
          currency,
          stocksAmount,
          bondsAmount,
        });
        scrollToResult();
      })
      .catch((error) => {
        if (error.response?.status === 400) {
          const { fieldErrors: apiFieldErrors, summary } = parseApiFieldErrors(
            error.response.data,
          );
          setFieldErrors(apiFieldErrors);
          setResult({ type: 'error', summary });
          scrollToResult();
          return;
        }

        console.error(error.response ?? error);
        setResult({ type: 'error', summary: NETWORK_ERROR_MESSAGE });
        scrollToResult();
      })
      .finally(() => {
        setSubmitDisabled(false);
      });
  };

  const renderPositionRows = (name, labelId, valuesArr, fieldErrorKey) => {
    const isStocks = name === 'stocksValues';
    const label = isStocks ? 'Акции' : 'Облигации';
    const description = isStocks
      ? 'Стоимость каждой позиции в акциях'
      : 'Стоимость каждой позиции в облигациях';

    return (
      <FormGroup className={`form-group asset-group ${isStocks ? 'stocks-group' : 'bonds-group'}`}>
        <div className="asset-group__header">
          <Label for={labelId}>{label}</Label>
          <span className="asset-group__hint">{description}</span>
        </div>
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
              invalid={Boolean(clientErrors[fieldErrorKey] || fieldErrors[fieldErrorKey])}
              onChange={(e) => handleValues(index, e, name, valuesArr)}
            />
            <Input
              className="position-row__currency number-field"
              type="select"
              name={`${name}_currency_${index}`}
              value={element.currency}
              aria-label={`Валюта позиции ${index + 1}`}
              onChange={(e) => handleValues(index, e, name, valuesArr)}
            >
              {currencyOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.text}
                </option>
              ))}
            </Input>
          </div>
        ))}
        <Button
          type="button"
          color="secondary"
          outline
          className="btn-add-position w-100"
          onClick={(e) => addValueField(e, name, valuesArr)}
        >
          <i className="fa fa-plus me-2" aria-hidden="true" />
          Добавить позицию
        </Button>
        {(clientErrors[fieldErrorKey] || fieldErrors[fieldErrorKey]) && (
          <FormFeedback className="d-block">
            {clientErrors[fieldErrorKey] || fieldErrors[fieldErrorKey]}
          </FormFeedback>
        )}
      </FormGroup>
    );
  };

  return (
    <div className="calculator-card">
      <header className="calculator-card__header">
        <span className="calculator-card__eyebrow">Финансовый калькулятор</span>
        <h1 className="calculator-card__title">Балансировщик портфеля</h1>
        <p className="calculator-card__subtitle">
          Укажите текущие позиции и целевую долю акций/облигаций — подскажем,
          сколько докупить.
        </p>
      </header>

      <Form className="portfolio-balancer-form" onSubmit={submitData} noValidate>
        <section className="form-section" aria-labelledby="section-ratio">
          <h2 className="form-section__title" id="section-ratio">
            <span className="form-section__number">1</span>
            <span>
              Целевая пропорция
              <small>Настройте желаемый баланс портфеля</small>
            </span>
          </h2>
          <FormGroup className="form-group">
            <Label for="ratio">Пропорция портфеля (акции/облигации, %)</Label>
            <p className="ratio-summary" aria-live="polite">
              <span>Акции {ratioParts.stocks}%</span>
              <span>Облигации {ratioParts.bonds}%</span>
            </p>
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
              invalid={Boolean(clientErrors.ratio || fieldErrors.ratio)}
              onChange={validateRatio}
            />
            <FormText className="ratio-helper">
              Введите 100 (только акции), 0 (только облигации) или дробь, где
              сумма равна 100 (например, 70/30).
            </FormText>
            <FormFeedback>
              Значение пропорции должно быть целое (100) или дробное (например,
              50/50)
            </FormFeedback>
            {(clientErrors.ratio || fieldErrors.ratio) && (
              <FormFeedback className="d-block">
                {clientErrors.ratio || fieldErrors.ratio}
              </FormFeedback>
            )}
          </FormGroup>
        </section>

        <section className="form-section" aria-labelledby="section-portfolio">
          <h2 className="form-section__title" id="section-portfolio">
            <span className="form-section__number">2</span>
            <span>
              Текущий портфель
              <small>Добавьте позиции по классам активов</small>
            </span>
          </h2>
          {showCurrencyWarning && (
            <Alert color="warning" className="currency-warning">
              <i className="fa fa-triangle-exclamation me-2" aria-hidden="true" />
              Позиции указаны в разных валютах. Конвертация выполняется на
              сервере.
            </Alert>
          )}
          {!hasFilledPosition(assets.stocksValues) &&
            !hasFilledPosition(assets.bondsValues) && (
              <FormText className="portfolio-hint d-block">
                Укажите хотя бы одну позицию в акциях или облигациях.
              </FormText>
            )}
          <div className="portfolio-grid">
            {renderPositionRows('stocksValues', 'stockValue', assets.stocksValues, 'stocks')}
            {renderPositionRows('bondsValues', 'bondValue', assets.bondsValues, 'bonds')}
          </div>
        </section>

        <section className="form-section" aria-labelledby="section-contribution">
          <h2 className="form-section__title" id="section-contribution">
            <span className="form-section__number">3</span>
            <span>
              Новый взнос
              <small>Сумма для распределения между активами</small>
            </span>
          </h2>
          <FormGroup className="form-group">
            <Label for="contributionAmount">Сумма, которую хотите внести</Label>
            <div className="contribution-row">
              <Input
                required
                className="contribution-row__amount number-field"
                type="number"
                min="1"
                step="any"
                name="contributionAmount"
                id="contributionAmount"
                value={contributionAmount.value}
                placeholder="50 000"
                invalid={Boolean(clientErrors.contribution || fieldErrors.contribution)}
                onChange={changeContribution}
              />
              <Input
                className="contribution-row__currency number-field"
                type="select"
                name="contributionAmount_currency"
                value={contributionAmount.currency}
                aria-label="Валюта взноса"
                onChange={changeContribution}
              >
                {currencyOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.text}
                  </option>
                ))}
              </Input>
            </div>
            {(clientErrors.contribution || fieldErrors.contribution) && (
              <FormFeedback className="d-block">
                {clientErrors.contribution || fieldErrors.contribution}
              </FormFeedback>
            )}
          </FormGroup>
        </section>

        <div className="form-actions">
          <Button
            color="primary"
            type="submit"
            className="btn-calculate"
            disabled={submitDisabled || !isFormValid}
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
          <p className="form-actions__hint">
            Расчёт покажет, какую часть взноса направить в акции и облигации.
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

        {result?.type === 'success' && (
          <div className="result-success" role="status" aria-live="polite">
            <Alert color="success" className="result-alert">
              <i className="fa fa-circle-check me-2" aria-hidden="true" />
              <strong>Рекомендация по взносу</strong>
            </Alert>
            <div className="result-metrics">
              <div className="result-metric">
                <span className="result-metric__label">Акции</span>
                <span className="result-metric__value">
                  {result.stocksAmount != null
                    ? formatAmount(result.stocksAmount, result.currency)
                    : '—'}
                </span>
              </div>
              <div className="result-metric">
                <span className="result-metric__label">Облигации</span>
                <span className="result-metric__value">
                  {result.bondsAmount != null
                    ? formatAmount(result.bondsAmount, result.currency)
                    : '—'}
                </span>
              </div>
            </div>
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
