export interface Currency {
    code: string
    label: string
    locale: string
    symbol: string
}

export const CURRENCIES: Currency[] = [
    { code: 'COP', label: 'Peso Colombiano (COP)', locale: 'es-CO', symbol: '$' },
    { code: 'MXN', label: 'Peso Mexicano (MXN)', locale: 'es-MX', symbol: '$' },
    { code: 'USD', label: 'Dólar Estadounidense (USD)', locale: 'en-US', symbol: '$' },
]

export function getStoredCurrency(): Currency {
    const code = localStorage.getItem('budget_app_currency') || 'COP'
    return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0]
}

export function setStoredCurrency(code: string) {
    localStorage.setItem('budget_app_currency', code)
}
