/**
 * Fallback exchange rates against RSD (srpski dinar).
 *
 * Used when the backend does not yet expose a kursna-lista endpoint.
 * Rates are approximate and shown for informational / demo purposes only.
 * All values represent how many RSD equal 1 unit of the foreign currency.
 *
 * Replace / augment with backend data once the endpoint is available.
 */

export interface RateEntry {
  oznaka: string    // ISO 4217 code
  naziv: string     // Serbian name
  kupovni: number   // Bank buys foreign (client sells) — lower rate
  srednji: number   // Mid / reference rate
  prodajni: number  // Bank sells foreign (client buys) — higher rate
}

export const CURRENCY_NAMES: Record<string, string> = {
  RSD: 'Srpski dinar',
  EUR: 'Euro',
  CHF: 'Švajcarski franak',
  USD: 'Američki dolar',
  GBP: 'Britanska funta',
  JPY: 'Japanski jen',
  CAD: 'Kanadski dolar',
  AUD: 'Australijski dolar',
}

/** Supported currency codes (RSD is base, handled separately) */
export const SUPPORTED_CODES = ['RSD', 'EUR', 'CHF', 'USD', 'GBP', 'JPY', 'CAD', 'AUD'] as const

export const FALLBACK_RATES: RateEntry[] = [
  { oznaka: 'EUR', naziv: 'Euro',                kupovni: 116.50, srednji: 117.00, prodajni: 117.50 },
  { oznaka: 'CHF', naziv: 'Švajcarski franak',   kupovni: 126.00, srednji: 126.75, prodajni: 127.50 },
  { oznaka: 'USD', naziv: 'Američki dolar',      kupovni: 107.00, srednji: 107.75, prodajni: 108.50 },
  { oznaka: 'GBP', naziv: 'Britanska funta',     kupovni: 136.00, srednji: 136.75, prodajni: 137.50 },
  { oznaka: 'JPY', naziv: 'Japanski jen',        kupovni:   0.68, srednji:   0.69, prodajni:   0.70 },
  { oznaka: 'CAD', naziv: 'Kanadski dolar',      kupovni:  75.00, srednji:  75.50, prodajni:  76.00 },
  { oznaka: 'AUD', naziv: 'Australijski dolar',  kupovni:  68.00, srednji:  68.50, prodajni:  69.00 },
]

/** Provizija rate applied on each conversion (0.5 %) */
export const PROVIZIJA_RATE = 0.005

// ─── Conversion result ────────────────────────────────────────────────────────

export interface ConversionResult {
  result: number       // Final amount after provizija
  provizija: number    // Deducted commission
  bruto: number        // Amount before provizija
  viaRSD: boolean      // true when cross-currency went through RSD
  rateNote: string     // Human-readable rate description
}

// ─── Core conversion logic ────────────────────────────────────────────────────

/**
 * Calculates the converted amount using local fallback rates.
 *
 * Rules:
 * - Same currency → identity (no provizija)
 * - RSD → foreign : bank sells foreign at prodajni rate
 * - foreign → RSD : bank buys foreign at kupovni rate
 * - foreign → foreign : X → RSD (kupovni) → Y (prodajni), i.e. via base currency
 *
 * Returns null if a required rate is not found.
 */
export function convertLocally(
  amount: number,
  fromOznaka: string,
  toOznaka: string,
  rates: RateEntry[] = FALLBACK_RATES,
): ConversionResult | null {
  if (fromOznaka === toOznaka) {
    return {
      result: amount,
      provizija: 0,
      bruto: amount,
      viaRSD: false,
      rateNote: 'Ista valuta – nije potrebna konverzija.',
    }
  }

  const isFromRSD = fromOznaka === 'RSD'
  const isToRSD   = toOznaka   === 'RSD'
  const fromRate  = rates.find((r) => r.oznaka === fromOznaka)
  const toRate    = rates.find((r) => r.oznaka === toOznaka)

  if (isFromRSD) {
    // RSD → foreign: client gives RSD, bank sells foreign at prodajni
    if (!toRate) return null
    const bruto    = amount / toRate.prodajni
    const provizija = bruto * PROVIZIJA_RATE
    return {
      result: Math.max(0, bruto - provizija),
      provizija,
      bruto,
      viaRSD: false,
      rateNote: `Prodajni kurs: 1 ${toOznaka} = ${formatRate(toRate.prodajni)} RSD`,
    }
  }

  if (isToRSD) {
    // foreign → RSD: client gives foreign, bank buys at kupovni
    if (!fromRate) return null
    const bruto    = amount * fromRate.kupovni
    const provizija = bruto * PROVIZIJA_RATE
    return {
      result: Math.max(0, bruto - provizija),
      provizija,
      bruto,
      viaRSD: false,
      rateNote: `Kupovni kurs: 1 ${fromOznaka} = ${formatRate(fromRate.kupovni)} RSD`,
    }
  }

  // Cross-currency: X → RSD → Y
  if (!fromRate || !toRate) return null
  const rsdAmount  = amount * fromRate.kupovni     // sell source, receive RSD
  const bruto      = rsdAmount / toRate.prodajni   // buy target with RSD
  const provizija  = bruto * PROVIZIJA_RATE
  return {
    result: Math.max(0, bruto - provizija),
    provizija,
    bruto,
    viaRSD: true,
    rateNote:
      `Kupovni ${fromOznaka}: ${formatRate(fromRate.kupovni)} RSD ` +
      `→ Prodajni ${toOznaka}: ${formatRate(toRate.prodajni)} RSD`,
  }
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/** Format a rate value (adjusts decimal places for small numbers like JPY) */
export function formatRate(rate: number): string {
  const decimals = rate < 1 ? 4 : 2
  return rate.toLocaleString('sr-RS', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Format a monetary amount (more decimals for very small values) */
export function formatNum(n: number): string {
  if (n === 0) return '0,00'
  const abs = Math.abs(n)
  const decimals = abs < 0.001 ? 6 : abs < 0.1 ? 4 : 2
  return n.toLocaleString('sr-RS', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}
