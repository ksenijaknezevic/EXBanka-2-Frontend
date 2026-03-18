import { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { getCurrencies, getExchangeRate } from '@/services/bankaService'
import type { Currency } from '@/types'

export default function MenjacnicaWidget() {
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loadingCurrencies, setLoadingCurrencies] = useState(true)

  const [amountRaw, setAmountRaw] = useState<string>('')
  const [fromId, setFromId] = useState<string>('')
  const [toId, setToId] = useState<string>('')

  const [result, setResult] = useState<number | null>(null)
  const [converting, setConverting] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load currencies once
  useEffect(() => {
    getCurrencies()
      .then((data) => {
        setCurrencies(data)
        if (data.length >= 2) {
          setFromId(data[0].id)
          setToId(data[1].id)
        } else if (data.length === 1) {
          setFromId(data[0].id)
          setToId(data[0].id)
        }
      })
      .catch(() => {
        // Currencies unavailable – widget will show fallback
      })
      .finally(() => setLoadingCurrencies(false))
  }, [])

  // Trigger conversion when inputs change (debounced 400ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setResult(null)

    const amount = parseFloat(amountRaw)
    if (!amountRaw || isNaN(amount) || amount <= 0) return
    if (!fromId || !toId) return

    const fromCurrency = currencies.find((c) => c.id === fromId)
    const toCurrency = currencies.find((c) => c.id === toId)
    if (!fromCurrency || !toCurrency) return

    // Same currency → trivial result
    if (fromId === toId) {
      setResult(amount)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setConverting(true)
      setUnavailable(false)
      const res = await getExchangeRate(fromCurrency.oznaka, toCurrency.oznaka, amount)
      if (res === null) {
        setUnavailable(true)
      } else {
        setResult(res)
      }
      setConverting(false)
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [amountRaw, fromId, toId, currencies])

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    // Allow only digits and a single decimal point; no negatives
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setAmountRaw(val)
    }
  }

  function swapCurrencies() {
    setFromId(toId)
    setToId(fromId)
    setResult(null)
  }

  const fromCurrency = currencies.find((c) => c.id === fromId)
  const toCurrency = currencies.find((c) => c.id === toId)
  const amount = parseFloat(amountRaw)
  const hasValidAmount = amountRaw !== '' && !isNaN(amount) && amount > 0

  return (
    <div className="card flex flex-col">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Menjačnica</h2>

      {loadingCurrencies ? (
        <div className="flex-1 flex flex-col justify-center space-y-4 animate-pulse">
          <div className="h-10 bg-gray-200 rounded-lg" />
          <div className="h-10 bg-gray-200 rounded-lg" />
          <div className="h-10 bg-gray-200 rounded-lg" />
        </div>
      ) : currencies.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500">Lista valuta nije dostupna.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-4">
          {/* Amount input */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Iznos</label>
            <input
              type="text"
              inputMode="decimal"
              value={amountRaw}
              onChange={handleAmountChange}
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-colors"
            />
          </div>

          {/* From / Swap / To */}
          <div className="flex items-end gap-2">
            {/* From currency */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Iz valute</label>
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-colors"
              >
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.oznaka} – {c.naziv}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap button */}
            <button
              onClick={swapCurrencies}
              className="mb-0.5 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-primary-300 text-gray-500 hover:text-primary-600 transition-colors"
              title="Zameni valute"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>

            {/* To currency */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">U valutu</label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-colors"
              >
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.oznaka} – {c.naziv}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Result area – pushed to bottom */}
          <div className="mt-auto min-h-[64px] rounded-xl bg-gray-50 border border-gray-100 px-4 py-4 flex items-center justify-between">
            {!hasValidAmount ? (
              <span className="text-sm text-gray-400">Unesite iznos za konverziju</span>
            ) : converting ? (
              <span className="text-sm text-gray-400 animate-pulse">Konverzija…</span>
            ) : unavailable ? (
              <span className="text-sm text-amber-600">
                Kursna lista trenutno nije dostupna.
              </span>
            ) : result !== null ? (
              <>
                <div>
                  <p className="text-xs text-gray-500">
                    {amountRaw} {fromCurrency?.oznaka} =
                  </p>
                  <p className="text-lg font-bold text-primary-700">
                    {result.toLocaleString('sr-RS', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}{' '}
                    {toCurrency?.oznaka}
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
