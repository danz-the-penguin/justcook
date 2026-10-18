export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  position?: 'prefix' | 'suffix';
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar ($)', position: 'prefix' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit (RM)', position: 'prefix' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (S$)', position: 'prefix' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)', position: 'prefix' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)', position: 'prefix' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (¥)', position: 'prefix' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso (₱)', position: 'prefix' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (A$)', position: 'prefix' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar (C$)', position: 'prefix' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)', position: 'prefix' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona (kr)', position: 'suffix' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc (CHF)', position: 'prefix' },
];

export interface CurrencyConfig {
  symbol: string;
  position: 'prefix' | 'suffix';
}

export function getPreferredCurrency(): CurrencyConfig {
  if (typeof window === 'undefined') return { symbol: '$', position: 'prefix' };
  const rawSymbol = localStorage.getItem('justcook_currency') || '$';
  const rawPosition = (localStorage.getItem('justcook_currency_position') as 'prefix' | 'suffix') || 'prefix';
  return { symbol: rawSymbol, position: rawPosition };
}

export function setPreferredCurrency(symbol: string, position: 'prefix' | 'suffix' = 'prefix'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('justcook_currency', symbol.trim());
  localStorage.setItem('justcook_currency_position', position);
  window.dispatchEvent(new Event('justcook_currency_change'));
}

export function formatCurrencyAmount(amount: number, config?: CurrencyConfig): string {
  const active = config || getPreferredCurrency();
  const formatted = (amount || 0).toFixed(2);
  if (active.position === 'suffix') {
    return `${formatted} ${active.symbol}`;
  }
  return `${active.symbol}${formatted}`;
}
