import { computeGlidePathRatio, computeYearsToGoalRatio, withPreservedCash } from '../utils/glidePath';
import { getRatioParts } from '../utils/portfolioFormUtils';
import { useLocale } from '../locale';

export function applyGlidePath(state) {
  const base =
    (state.glideMode ?? 'age') === 'age'
      ? computeGlidePathRatio({
          currentAge: state.currentAge,
          retirementAge: state.retirementAge,
        })
      : computeYearsToGoalRatio({ yearsToGoal: state.yearsToGoal });
  const cash = getRatioParts(state.ratio?.text).cash;
  return withPreservedCash(base, cash);
}

export function GlidePath({
  glideMode,
  currentAge,
  retirementAge,
  yearsToGoal,
  onGlideModeChange,
  onCurrentAgeChange,
  onRetirementAgeChange,
  onYearsToGoalChange,
  onApply,
}) {
  const { t } = useLocale();
  const mode = glideMode ?? 'age';

  return (
    <div className="glide-path" data-glide-path>
      <h3 className="glide-path__title">{t('glide.title')}</h3>
      <div className="form-group">
        <select
          className="form-control"
          aria-label={t('glide.title')}
          value={mode}
          onChange={(event) => onGlideModeChange(event.target.value)}
        >
          <option value="age">{t('glide.byAge')}</option>
          <option value="goal">{t('glide.byGoal')}</option>
        </select>
      </div>
      {mode === 'age' ? (
        <div className="glide-path__inputs">
          <div className="form-group">
            <label htmlFor="currentAge">{t('glide.currentAge')}</label>
            <input
              id="currentAge"
              className="form-control"
              type="number"
              min="18"
              max="90"
              value={currentAge}
              onChange={(event) => onCurrentAgeChange(event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="retirementAge">{t('glide.retirementAge')}</label>
            <input
              id="retirementAge"
              className="form-control"
              type="number"
              min="40"
              max="100"
              value={retirementAge}
              onChange={(event) => onRetirementAgeChange(event.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="form-group">
          <label htmlFor="yearsToGoal">{t('glide.yearsToGoal')}</label>
          <input
            id="yearsToGoal"
            className="form-control"
            type="number"
            min="1"
            max="50"
            value={yearsToGoal}
            onChange={(event) => onYearsToGoalChange(event.target.value)}
          />
        </div>
      )}
      <button type="button" className="btn btn-outline-secondary" onClick={onApply}>
        {t('glide.apply')}
      </button>
    </div>
  );
}
