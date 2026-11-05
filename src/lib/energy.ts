export type Inputs = {
  itMw: number;
  pue: number;
  tariff: number;
  carbon: number;
};

export type Scenario = {
  name: string;
  facilityMw: number;
  annualKwh: number;
  annualCost: number;
  annualEmissions: number;
  itMw: number;
  cleanShare: number;
};

export const DEFAULTS: Inputs = {
  itMw: 50,
  pue: 1.4,
  tariff: 1500,
  carbon: 0.45,
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const calculateScenario = (
  name: string,
  itMw: number,
  pue: number,
  tariff: number,
  carbon: number,
  cleanShare = 0,
): Scenario => {
  const facilityMw = itMw * pue;
  const annualKwh = facilityMw * 24 * 365 * 1000;
  return {
    name,
    facilityMw,
    annualKwh,
    annualCost: annualKwh * tariff,
    annualEmissions: annualKwh * (1 - cleanShare) * carbon,
    itMw,
    cleanShare,
  };
};

export const formatNumber = (value: number, maximumFractionDigits = 1) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits }).format(value);

export const formatRupiah = (value: number) =>
  `Rp${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value)}`;
