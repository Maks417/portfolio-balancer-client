import React, { useState } from 'react';
import { Alert, Col, Row, Form, FormGroup, Button, Label, Input, FormFeedback } from 'reactstrap';
import RangeSlider from 'react-bootstrap-range-slider';
import axios from 'axios';

const currencyOptions = [
  { value: 'rub', text: '₽' },
  { value: 'usd', text: '$' },
  { value: 'eur', text: '€' }
];

const BalanceForm = () => {

  const [ratioValidClass, setRatioValidClass] = useState('');
  const [ratio, setRatio] = useState({ text: '50/50', value: 50 });
  const [assets, setAssets] = useState({ 
    stocksValues: [{ value: '', currency: currencyOptions[0].value }], 
    bondsValues: [{ value: '', currency: currencyOptions[0].value }]
  });
  const [contributionAmount, setContributionAmount] = useState({ value: 0, currency: currencyOptions[0].value});
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [resultBox, setResultBox] = useState({ showResult: false, resultBoxClass: 'success', text: '' });

  const validateRatio = (e) => {
    let validClass = e.target.value === '100' ? 'is-valid' : 'is-invalid';
    const arr = e.target.value.split('/')

    if(e.target.value.length > 3 && e.target.value.length < 6){   
      validClass = arr.length === 2 && arr.reduce((prev, curr) => (Number(prev) || 0) + (Number(curr) || 0)) === 100 ? "is-valid" : "is-invalid"
    }

    setRatioValidClass(validClass)
    setRatio({ text: e.target.value, value: Number(arr[0]) })
  }

  const handleSliderRatio = (e) => {
    let newText = ''
    const bondsPart = 100 - e.target.value;
    switch(bondsPart) {
      case 0:
        newText = '100'
        break;
      case 100:
        newText = '0'
        break;
      default:
        newText = `${e.target.value}/${bondsPart}`
    }

    setRatio({ text: newText, value: e.target.value })
  }

  const addValueField = (e, name, valuesArr) => {
    e.stopPropagation();
    setAssets(prevState => ({ ...prevState, [name]: [...valuesArr, { value: '', currency: currencyOptions[0].value }] }));
  }

  const removeValueField = (i, name, valuesArr) => {
    let values = valuesArr;
    values.splice(i, 1);
    setAssets(prevState => ({ ...prevState, [name]: [...values] }));
  }

  const handleValues = (i, e, name, valuesArr) => {
    let values = valuesArr;

    if(e.target.type === 'number'){
      values[i].value = e.target.value;
    } else {
      values[i].currency = e.target.value;
    }

    setAssets(prevState => ({ ...prevState, [name]: [...values] }));
  }

  const changeContribution = (e) => {
    const contribution = e.target.type === 'number' 
      ? { value: e.target.value, currency: contributionAmount.currency }
      :  { value: contributionAmount.value, currency: e.target.value };

    setContributionAmount(contribution)
  }

  const submitData = (e) => {
    e.preventDefault();

    setSubmitDisabled(true);

    const data = {
      ratio: ratio.text,
      stockValues: assets.stocksValues,
      bondValues: assets.bondsValues,
      contributionAmount: contributionAmount
    }
    
    const url = `${import.meta.env.VITE_API_BASE_URL}/portfolio/calculate`;
    
    console.log(url);

    axios.post(
        url, 
        data, 
        { 'Content-Type': 'application/json' }
      )
      .then((response) => {

        const currencySign = currencyOptions.find(e => e.value === response.data.currency).text;

        setResultBox({
          showResult: true,
          resultBoxClass: 'success',
          text: `Купить акций на: ${currencySign}${JSON.stringify(response.data.stocksDiff)}. Купить облигаций на: ${currencySign}${JSON.stringify(response.data.bondsDiff)}`
        })
      })
      .catch((error) => {
        if(error.response && error.response.status === 400) {
          setResultBox({
            showResult: true,
            resultBoxClass: 'danger',
            text: JSON.stringify(error.response.data.errors ?? error.response.data)
          })
        } else {
          console.error(error.response ?? error)
        }
      })
      .finally(() => {
        setSubmitDisabled(false)
      });
  }

  return (
    <div className='col-md-6 col-md-offset-3' style={{ 
      maxWidth: '600px',
      margin: '0 auto',
      padding: '40px',
      backgroundColor: 'white',
      borderRadius: '20px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <Form className="portfolio-balancer-form" onSubmit={submitData}>
        <Row>
          <Col sm="12">
            <FormGroup className='form-group'>
              <Label for="ratio">Пропорция портфеля (акции/облигации, %)</Label>
              <div className='range-slider__container'>
                <RangeSlider 
                  value={ratio.value}
                  tooltip='off'
                  onChange={handleSliderRatio}
                  size='sm' />
              </div>
              <Input required className={ratioValidClass} type="text" name="ratio" id="ratio" value={ratio.text} placeholder="e.g. 70/30" onChange={validateRatio} />
              <FormFeedback>Значение пропорции должно быть целое (100) или дробное (например, 50/50)</FormFeedback>
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col sm="12" md="6">
            <FormGroup className="form-group stocks-group">
              <Label for="stockValue">Добавьте стоимость каждой позиции в акциях</Label>
              {assets.stocksValues.map((element, index) => (
                <div className='row justify-content-center' key={index}>
                  {
                    index ? 
                    <Button className="number-field minus col-1" 
                      onClick={() => removeValueField(index, 'stocksValues', assets.stocksValues)}>
                        <i className="fa fa-minus"></i>
                    </Button> 
                    : null
                  }
                  <Input className={index ? 'col-7 number-field' : 'offset-1 col-7 number-field'} type="number" name={`stockValue_value_${index}`} value={element.value} onChange={e => handleValues(index, e, 'stocksValues', assets.stocksValues)} />
                  <Input className="col-3 number-field" type="select" name={`stockValue_currency_${index}`} value={element.currency} onChange={e => handleValues(index, e, 'stocksValues', assets.stocksValues)}>
                    {currencyOptions.map((item, i) => (
                      <option key={i} value={item.value}>{item.text}</option>
                    ))}
                  </Input>
                </div>
              ))}
              <Button className="number-field plus"
                onClick={e => addValueField(e, 'stocksValues', assets.stocksValues)}>
                  <i className="fa fa-plus"></i>
              </Button>
            </FormGroup>
          </Col>
          <Col sm="12" md="6">
            <FormGroup className="form-group bonds-group">
                <Label for="bondValue">Добавьте стоимость каждой позиции в облигациях</Label>
                {assets.bondsValues.map((element, index) => (
                  <div className='row justify-content-center' key={index}>
                    {
                      index ? 
                      <Button className="number-field minus col-1" 
                        onClick={() => removeValueField(index, 'bondsValues', assets.bondsValues)}>
                          <i className="fa fa-minus"></i>
                      </Button> 
                      : null
                    }
                    <Input className={index ? 'col-7 number-field' : 'offset-1 col-7 number-field'} type="number" name={`bondValue_value_${index}`} value={element.value} onChange={e => handleValues(index, e, 'bondsValues', assets.bondsValues)} />
                    <Input className="col-3 number-field" type="select" name={`bondValue_currency_${index}`} value={element.currency} onChange={e => handleValues(index, e, 'bondsValues', assets.bondsValues)}>
                      {currencyOptions.map((item, i) => (
                        <option key={i} value={item.value}>{item.text}</option>
                      ))}
                    </Input>
                  </div>
                ))}
                <Button className="number-field plus" 
                  onClick={e => addValueField(e, 'bondsValues', assets.bondsValues)}>
                    <i className="fa fa-plus"></i>
                </Button>
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col sm="12">
            <FormGroup className='form-group'>
              <Label for="contributionAmount">Сумма, которую хотите внести</Label>
              <div className='row justify-content-center'>
                <Input required className='offset-1 number-field' type="number" name="contributionAmount" id="contributionAmount" onChange={changeContribution}/>
                <Input className="col-2 number-field" type="select" name={'contributionAmount_currency'} value={contributionAmount.currency} onChange={changeContribution}>
                      {currencyOptions.map((item, i) => (
                        <option key={i} value={item.value}>{item.text}</option>
                      ))}
                </Input>
              </div>
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col className='text-center'>
            <Button color="primary" type="submit" disabled={submitDisabled}>Рассчитать</Button>
          </Col>
        </Row>
      </Form>

      <div className='col-10 offset-1'>
        {
          resultBox.showResult ?
          <Alert show={resultBox.showResult.toString()} variant={resultBox.resultBoxClass}>
              {resultBox.text}
          </Alert>
          : null
        }
      </div>
    </div>
  );
}

export default BalanceForm;
