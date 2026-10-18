export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit (RM)' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (S$)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (¥)' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso (₱)' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (A$)' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar (C$)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
];

export function getPreferredCurrency(): string {
  if (typeof window === 'undefined') return '$';
  return localStorage.getItem('justcook_currency') || '$';
}

export function setPreferredCurrency(symbol: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('justcook_currency', symbol);
  window.dispatchEvent(new Event('justcook_currency_change'));
}
