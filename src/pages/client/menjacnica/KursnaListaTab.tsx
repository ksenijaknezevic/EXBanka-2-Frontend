import { useEffect, useState } from 'react'
import { getCurrencies } from '@/services/bankaService'
import type { Currency } from '@/types'
import { FALLBACK_RATES, formatRate, type RateEntry } from './exchangeRatesFallback'

interface DisplayRow extends RateEntry {
  displayNaziv: string
}

export default function KursnaListaTab() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<DisplayRow[]>([])

  useEffect(() => {
    getCurrencies()
      .then((backendCurrencies: Currency[]) => {
        // Enrich FALLBACK_RATES with official names from backend when available
        const enriched: DisplayRow[] = FALLBACK_RATES.map((rate) => {
          const match = backendCurrencies.find((c) => c.oznaka === rate.oznaka)
          return { ...rate, displayNaziv: match?.naziv ?? rate.naziv }
        })
        setRows(enriched)
      })
      .catch(() => {
        // Backend unavailable – use local names
        setRows(FALLBACK_RATES.map((r) => ({ ...r, displayNaziv: r.naziv })))
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="card">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Kursna lista</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Kursevi za 1 jedinicu strane valute, izraženi u RSD
          </p>
        </div>
        </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-10" />
              <div className="h-4 bg-gray-200 rounded col-span-2" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left pb-3 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Valuta
                </th>
                <th className="text-left pb-3 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Naziv
                </th>
                <th className="text-right pb-3 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Kupovni
                </th>
                <th className="text-right pb-3 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Srednji
                </th>
                <th className="text-right pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Prodajni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* RSD – base currency row */}
              <tr className="bg-primary-50">
                <td className="py-3.5 pr-4 font-bold text-primary-800 text-sm">RSD</td>
                <td className="py-3.5 pr-4 text-primary-700 text-sm">Srpski dinar</td>
                <td className="py-3.5 pr-4 text-right text-primary-600 text-xs font-medium">—</td>
                <td className="py-3.5 pr-4 text-right text-primary-600 text-xs font-medium">—</td>
                <td className="py-3.5 text-right text-xs font-semibold text-primary-700 tracking-wide">
                  bazna valuta
                </td>
              </tr>

              {/* Foreign currency rows */}
              {rows.map((row) => (
                <tr key={row.oznaka} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3.5 pr-4 font-semibold text-gray-900">{row.oznaka}</td>
                  <td className="py-3.5 pr-4 text-gray-600 text-sm">{row.displayNaziv}</td>
                  <td className="py-3.5 pr-4 text-right font-mono text-gray-700 text-sm">
                    {formatRate(row.kupovni)}
                  </td>
                  <td className="py-3.5 pr-4 text-right font-mono text-gray-500 text-sm">
                    {formatRate(row.srednji)}
                  </td>
                  <td className="py-3.5 text-right font-mono font-semibold text-gray-900 text-sm">
                    {formatRate(row.prodajni)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
