export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code'];

// Baseline exchange rates relative to USD (1 USD = X target)
export const DEFAULT_FX_RATES_TO_USD: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  INR: 86.5,
  AUD: 1.54,
  CAD: 1.38,
  JPY: 153.2,
  SGD: 1.34,
  AED: 3.67,
};

/**
 * Returns currency symbol for a currency code
 */
export function getCurrencySymbol(code: string): string {
  const match = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  return match ? match.symbol : code;
}

/**
 * Formats a financial amount with currency symbol, decimals, and clean grouping
 */
export function formatCurrency(
  amount: number | undefined | null,
  currencyCode = 'USD',
  options?: {
    showSign?: boolean;
    compact?: boolean;
    hideDecimals?: boolean;
    numberFormat?: string;
  }
): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '—';
  }

  const symbol = getCurrencySymbol(currencyCode);
  const isNegative = amount < -0.000001;
  const isPositive = amount > 0.000001;
  const absAmount = Math.abs(amount);

  let formattedNumber: string;
  const fractionDigits = currencyCode === 'JPY' || options?.hideDecimals ? 0 : 2;

  try {
    const locale = options?.numberFormat || (currencyCode === 'INR' ? 'en-IN' : 'en-US');
    formattedNumber = new Intl.NumberFormat(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      notation: options?.compact ? 'compact' : 'standard',
    }).format(absAmount);
  } catch {
    formattedNumber = absAmount.toFixed(fractionDigits);
  }

  let sign = '';
  if (isNegative) {
    sign = '-';
  } else if (isPositive && options?.showSign) {
    sign = '+';
  }

  return `${sign}${symbol}${formattedNumber}`;
}

/**
 * Converts an amount from one currency to another using the FX matrix
 */
export function convertCurrency(
  amount: number,
  fromCode: string,
  toCode: string,
  customRates?: Record<string, number>
): { convertedAmount: number; rateUsed: number } {
  if (!amount || fromCode === toCode) {
    return { convertedAmount: amount, rateUsed: 1 };
  }

  const rates = customRates || DEFAULT_FX_RATES_TO_USD;
  const fromRate = rates[fromCode] || 1.0;
  const toRate = rates[toCode] || 1.0;

  // Convert from -> USD -> to
  // amount in USD = amount / fromRate
  // amount in target = (amount / fromRate) * toRate
  const rateUsed = toRate / fromRate;
  const convertedAmount = Number((amount * rateUsed).toFixed(2));

  return { convertedAmount, rateUsed: Number(rateUsed.toFixed(4)) };
}
