import { computeGlidePathRatio, computeYearsToGoalRatio } from '../utils/glidePath';
import { t } from '../locale';
import { escapeHtml } from './dom';

export function renderGlidePathHtml(state) {
  const mode = state.glideMode ?? 'age';
  return `
    <div class="glide-path" data-glide-path>
      <h3 class="glide-path__title">${escapeHtml(t('glide.title'))}</h3>
      <div class="form-group">
        <select class="form-control" data-action="glide-mode" aria-label="${escapeHtml(t('glide.title'))}">
          <option value="age"${mode === 'age' ? ' selected' : ''}>${escapeHtml(t('glide.byAge'))}</option>
          <option value="goal"${mode === 'goal' ? ' selected' : ''}>${escapeHtml(t('glide.byGoal'))}</option>
        </select>
      </div>
      ${
        mode === 'age'
          ? `
        <div class="glide-path__inputs">
          <div class="form-group">
            <label for="currentAge">${escapeHtml(t('glide.currentAge'))}</label>
            <input id="currentAge" class="form-control" type="number" min="18" max="90" value="${escapeHtml(state.currentAge)}" data-action="glide-current-age" />
          </div>
          <div class="form-group">
            <label for="retirementAge">${escapeHtml(t('glide.retirementAge'))}</label>
            <input id="retirementAge" class="form-control" type="number" min="40" max="100" value="${escapeHtml(state.retirementAge)}" data-action="glide-retirement-age" />
          </div>
        </div>`
          : `
        <div class="form-group">
          <label for="yearsToGoal">${escapeHtml(t('glide.yearsToGoal'))}</label>
          <input id="yearsToGoal" class="form-control" type="number" min="1" max="50" value="${escapeHtml(state.yearsToGoal)}" data-action="glide-years" />
        </div>`
      }
      <button type="button" class="btn btn-outline-secondary" data-action="glide-apply">${escapeHtml(t('glide.apply'))}</button>
    </div>
  `;
}

export function applyGlidePath(state) {
  if ((state.glideMode ?? 'age') === 'age') {
    return computeGlidePathRatio({
      currentAge: state.currentAge,
      retirementAge: state.retirementAge,
    });
  }
  return computeYearsToGoalRatio({ yearsToGoal: state.yearsToGoal });
}
