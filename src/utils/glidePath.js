function packTwoWayRatio(clampedStocks, bondsPct) {
  if (bondsPct === 0) {
    return { ratioText: '100', sliderValue: 100, stocksPct: 100, bondsPct: 0 };
  }
  if (clampedStocks === 0) {
    return { ratioText: '0', sliderValue: 0, stocksPct: 0, bondsPct: 100 };
  }

  return {
    ratioText: `${clampedStocks}/${bondsPct}`,
    sliderValue: clampedStocks,
    stocksPct: clampedStocks,
    bondsPct,
  };
}

export function computeGlidePathRatio({
  currentAge,
  retirementAge,
  stocksAtStart = 90,
  stocksAtRetirement = 40,
  startAge = 25,
}) {
  const age = Number(currentAge);
  const targetAge = Number(retirementAge);
  const start = Number(stocksAtStart);
  const end = Number(stocksAtRetirement);
  const baselineAge = Number(startAge);

  if (
    !Number.isFinite(age) ||
    !Number.isFinite(targetAge) ||
    targetAge <= age ||
    !Number.isFinite(start) ||
    !Number.isFinite(end)
  ) {
    return null;
  }

  const progress = Math.min(
    1,
    Math.max(0, (age - baselineAge) / Math.max(1, targetAge - baselineAge)),
  );
  const stocksPct = Math.round(start + (end - start) * progress);
  const clampedStocks = Math.min(100, Math.max(0, stocksPct));
  const bondsPct = 100 - clampedStocks;

  return packTwoWayRatio(clampedStocks, bondsPct);
}

export function computeYearsToGoalRatio({ yearsToGoal, stocksNear = 80, stocksAtGoal = 50 }) {
  const years = Number(yearsToGoal);
  const near = Number(stocksNear);
  const atGoal = Number(stocksAtGoal);

  if (!Number.isFinite(years) || years <= 0 || !Number.isFinite(near) || !Number.isFinite(atGoal)) {
    return null;
  }

  const progress = Math.min(1, 1 / years);
  const stocksPct = Math.round(near + (atGoal - near) * progress);
  const clampedStocks = Math.min(100, Math.max(0, stocksPct));
  const bondsPct = 100 - clampedStocks;

  return packTwoWayRatio(clampedStocks, bondsPct);
}

/** Apply glide result while preserving an existing cash target percentage. */
export function withPreservedCash(glideResult, cashPct = 0) {
  if (!glideResult) {
    return null;
  }
  const cash = Math.min(100, Math.max(0, Math.round(Number(cashPct) || 0)));
  if (cash <= 0) {
    return glideResult;
  }

  const remainder = 100 - cash;
  const stockShare = (glideResult.stocksPct ?? 0) / 100;
  const stocks = Math.round(remainder * stockShare);
  const bonds = remainder - stocks;

  return {
    ratioText: `${stocks}/${bonds}/${cash}`,
    sliderValue: stocks,
    stocksPct: stocks,
    bondsPct: bonds,
    cashPct: cash,
  };
}
