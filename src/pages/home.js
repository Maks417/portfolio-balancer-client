import { mountCalculatorForm } from '../ui/calculatorForm';

export function mountHome(outlet) {
  const page = document.createElement('main');
  page.className = 'calculator-page';
  outlet.appendChild(page);
  return mountCalculatorForm(page);
}
