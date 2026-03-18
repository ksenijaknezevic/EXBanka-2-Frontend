import { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight, ArrowRight, CheckCircle, Info } from 'lucide-react'
import { getCurrencies, getClientAccounts, executeExchangeTransfer } from '@/services/bankaService'
import type { Currency, AccountListItem } from '@/types'
import type { ExchangeTransferResult } from '@/services/bankaService'
import {
  FALLBACK_RATES,
  SUPPORTED_CODES,
  CURRENCY_NAMES,
  PROVIZIJA_RATE,
  convertLocally,
  formatNum,
  type ConversionResult,
} from './exchangeRatesFallback'

// Build selector options: try backend currencies first, fall back to local list
function buildOptions(backendCurrencies: Currency[]): { oznaka: string; naziv: string }[] {
  return SUPPORTED_CODES.map((code) => {
    const match = backendCurrencies.find((c) => c.oznaka === code)
    return { oznaka: code, naziv: match?.naziv ?? CURRENCY_NAMES[code] ?? code }
  })
}

export default function ProveraEkvivalentnostiTab() {
  const [options, setOptions] = useState<{ oznaka: string; naziv: string }[]>(
    SUPPORTED_CODES.map((code) => ({ oznaka: code, naziv: CURRENCY_NAMES[code] ?? code })),
  )

  const [amountRaw, setAmountRaw] = useState('')
  const [fromOznaka, setFromOznaka] = useState('EUR')
  const [toOznaka, setToOznaka] = useState('RSD')

  const [convResult, setConvResult] = useState<ConversionResult | null>(null)
  const [calculating, setCalculating] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Account state ──────────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<AccountListItem[]>([])
  const [sourceAccountId, setSourceAccountId] = useState('')
  const [targetAccountId, setTargetAccountId] = useState('')
  const [executing, setExecuting] = useState(false)
  const [execResult, setExecResult] = useState<ExchangeTransferResult | null>(null)
  const [execError, setExecError] = useState<string | null>(null)

  // Enrich currency names from backend on mount
  useEffect(() => {
    getCurrencies()
      .then((data) => setOptions(buildOptions(data)))
      .catch(() => {
        // Keep local options – no-op
      })
  }, [])

  // Load user accounts once on mount
  useEffect(() => {
    getClientAccounts()
      .then(setAccounts)
      .catch(() => {
        // Accounts unavailable – execution section will show empty state
      })
  }, [])

  // Recalculate whenever amount or currencies change (debounced 300 ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setConvResult(null)

    const amount = parseFloat(amountRaw)
    if (!amountRaw || isNaN(amount) || amount <= 0) {
      setCalculating(false)
      return
    }

    setCalculating(true)
    debounceRef.current = setTimeout(() => {
      const result = convertLocally(amount, fromOznaka, toOznaka, FALLBACK_RATES)
      setConvResult(result)
      setCalculating(false)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [amountRaw, fromOznaka, toOznaka])

  // Reset source account + execution state when source currency changes
  useEffect(() => {
    setSourceAccountId('')
    setExecResult(null)
    setExecError(null)
  }, [fromOznaka])

  // Reset target account + execution state when target currency changes
  useEffect(() => {
    setTargetAccountId('')
    setExecResult(null)
    setExecError(null)
  }, [toOznaka])

  // Validate: digits and single decimal point only
  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setAmountRaw(val)
    }
  }

  function swapCurrencies() {
    setFromOznaka(toOznaka)
    setToOznaka(fromOznaka)
    setConvResult(null)
  }

  const amount = parseFloat(amountRaw)
  const hasValidAmount = amountRaw !== '' && !isNaN(amount) && amount > 0
  const isSame = fromOznaka === toOznaka
  const provizijaPct = (PROVIZIJA_RATE * 100).toFixed(1)

  // ── Account derived state ──────────────────────────────────────────────────
  const sourceAccounts = accounts.filter((a) => a.valuta_oznaka === fromOznaka)
  const targetAccounts = accounts.filter((a) => a.valuta_oznaka === toOznaka)
  const selectedSource = sourceAccounts.find((a) => a.id === sourceAccountId)
  //const selectedTarget = targetAccounts.find((a) => a.id === targetAccountId)

  const hasEnoughFunds = selectedSource
    ? selectedSource.raspolozivo_stanje >= amount
    : false

  const canExecute =
    hasValidAmount &&
    !isSame &&
    convResult !== null &&
    !calculating &&
    sourceAccountId !== '' &&
    targetAccountId !== '' &&
    sourceAccountId !== targetAccountId &&
    hasEnoughFunds

  async function handleExecute() {
    if (!canExecute) return
    setExecuting(true)
    setExecResult(null)
    setExecError(null)
    try {
      const result = await executeExchangeTransfer({
        sourceAccountId,
        targetAccountId,
        fromOznaka,
        toOznaka,
        amount,
      })
      setExecResult(result)
      // Refresh account balances to reflect the transfer
      getClientAccounts().then(setAccounts).catch(() => {})
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Greška pri izvršenju konverzije. Pokušajte ponovo.'
      setExecError(msg)
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="card">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Proveri ekvivalentnost</h2>

      {/* Two-column layout: input left, result right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-gray-100">

        {/* ── INPUT SECTION ─────────────────────────────────────────────────── */}
        <div className="md:pr-8 space-y-5 pb-6 md:pb-0">

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Iznos
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={amountRaw}
              onChange={handleAmountChange}
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-colors"
            />
          </div>

          {/* From currency */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Iz valute
            </label>
            <select
              value={fromOznaka}
              onChange={(e) => setFromOznaka(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-colors"
            >
              {options.map((o) => (
                <option key={o.oznaka} value={o.oznaka}>
                  {o.oznaka} – {o.naziv}
                </option>
              ))}
            </select>
          </div>

          {/* Swap button */}
          <div className="flex justify-center">
            <button
              onClick={swapCurrencies}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-primary-600 hover:border-primary-300 transition-colors"
              title="Zameni valute"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Zameni valute
            </button>
          </div>

          {/* To currency */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              U valutu
            </label>
            <select
              value={toOznaka}
              onChange={(e) => setToOznaka(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-colors"
            >
              {options.map((o) => (
                <option key={o.oznaka} value={o.oznaka}>
                  {o.oznaka} – {o.naziv}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── RESULT SECTION ────────────────────────────────────────────────── */}
        <div className="md:pl-8 pt-6 md:pt-0 border-t md:border-t-0 border-gray-100 flex flex-col justify-center min-h-[240px]">

          {/* Empty state */}
          {!hasValidAmount && !calculating && (
            <div className="flex flex-col items-center justify-center text-center flex-1 gap-2 py-8">
              <ArrowRight className="h-8 w-8 text-gray-200" />
              <p className="text-sm text-gray-400">Unesite iznos za pregled konverzije</p>
            </div>
          )}

          {/* Same currency */}
          {hasValidAmount && isSame && !calculating && (
            <div className="flex flex-col items-center justify-center text-center flex-1 gap-2 py-8">
              <p className="text-sm text-gray-500">Ista valuta – konverzija nije potrebna.</p>
              <p className="text-xl font-bold text-gray-900">
                {formatNum(amount)} {fromOznaka}
              </p>
            </div>
          )}

          {/* Calculating */}
          {calculating && (
            <div className="flex flex-col gap-3 animate-pulse py-4">
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          )}

          {/* Result */}
          {!isSame && !calculating && convResult && (
            <div className="space-y-4">

              {/* Source → target summary */}
              <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                <span className="font-semibold text-gray-800">{amountRaw} {fromOznaka}</span>
                <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
                <span className="font-semibold text-gray-800">{toOznaka}</span>
              </div>

              {/* Main result */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Dobijate</p>
                <p className="text-3xl font-bold text-primary-700 tracking-tight">
                  {formatNum(convResult.result)}{' '}
                  <span className="text-xl font-semibold text-primary-500">{toOznaka}</span>
                </p>
              </div>

              {/* Breakdown */}
              {convResult.provizija > 0 && (
                <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3.5 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bruto iznos</span>
                    <span className="font-medium text-gray-700">
                      {formatNum(convResult.bruto)} {toOznaka}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Provizija (~{provizijaPct}%)</span>
                    <span className="font-medium text-red-500">
                      − {formatNum(convResult.provizija)} {toOznaka}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="font-medium text-gray-700">Neto iznos</span>
                    <span className="font-semibold text-gray-900">
                      {formatNum(convResult.result)} {toOznaka}
                    </span>
                  </div>
                </div>
              )}

              {/* Rate info */}
              {convResult.rateNote && (
                <p className="text-xs text-gray-500">{convResult.rateNote}</p>
              )}

              {/* Via RSD notice */}
              {convResult.viaRSD && (
                <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 text-xs text-blue-700">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>Konverzija se vrši posredno – obračun ide preko RSD kao bazne valute banke.</span>
                </div>
              )}
            </div>
          )}

          {/* Error: rate not found */}
          {!isSame && !calculating && hasValidAmount && !convResult && (
            <p className="text-sm text-red-500 py-4 text-center">
              Kurs za izabranu valutu nije dostupan.
            </p>
          )}
        </div>
      </div>

      {/* ── EXECUTION SECTION ───────────────────────────────────────────────── */}
      {/* Only shown when currencies are different (execution requires different currencies) */}
      {!isSame && (
        <div className="mt-6 pt-6 border-t border-gray-100 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Izvrši konverziju</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Prenesi sredstva između svojih računa uz konverziju valute
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Source account selector */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Sa računa ({fromOznaka})
              </label>
              {sourceAccounts.length === 0 ? (
                <p className="text-xs text-gray-400 py-2.5 px-3 rounded-lg border border-dashed border-gray-200 bg-gray-50">
                  Nemate {fromOznaka} račun
                </p>
              ) : (
                <select
                  data-testid="source-account-select"
                  value={sourceAccountId}
                  onChange={(e) => {
                    setSourceAccountId(e.target.value)
                    setExecResult(null)
                    setExecError(null)
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-colors"
                >
                  <option value="">Izaberi račun</option>
                  {sourceAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.naziv_racuna} – {a.broj_racuna}
                    </option>
                  ))}
                </select>
              )}
              {selectedSource && (
                <p className="text-xs text-gray-500 mt-1.5">
                  Raspoloživo:{' '}
                  <span
                    className={
                      hasValidAmount && !hasEnoughFunds
                        ? 'text-red-500 font-medium'
                        : 'font-medium text-gray-700'
                    }
                  >
                    {formatNum(selectedSource.raspolozivo_stanje)} {fromOznaka}
                  </span>
                </p>
              )}
            </div>

            {/* Target account selector */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Na račun ({toOznaka})
              </label>
              {targetAccounts.length === 0 ? (
                <p className="text-xs text-gray-400 py-2.5 px-3 rounded-lg border border-dashed border-gray-200 bg-gray-50">
                  Nemate {toOznaka} račun
                </p>
              ) : (
                <select
                  data-testid="target-account-select"
                  value={targetAccountId}
                  onChange={(e) => {
                    setTargetAccountId(e.target.value)
                    setExecResult(null)
                    setExecError(null)
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-colors"
                >
                  <option value="">Izaberi račun</option>
                  {targetAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.naziv_racuna} – {a.broj_racuna}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Insufficient funds warning */}
          {selectedSource && hasValidAmount && !hasEnoughFunds && (
            <p className="text-xs text-red-500">
              Nedovoljno sredstava: potrebno {formatNum(amount)} {fromOznaka}, raspoloživo{' '}
              {formatNum(selectedSource.raspolozivo_stanje)} {fromOznaka}.
            </p>
          )}

          {/* Execute button */}
          <button
            data-testid="execute-button"
            onClick={handleExecute}
            disabled={!canExecute || executing}
            className="w-full sm:w-auto rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {executing ? 'Izvršavanje…' : 'Izvrši konverziju'}
          </button>

          {/* Success feedback */}
          {execResult && (
            <div
              data-testid="exec-success"
              className="rounded-xl bg-green-50 border border-green-200 px-4 py-4 space-y-2"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-sm font-semibold text-green-800">Konverzija izvršena</span>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <p>
                  Prebačeno:{' '}
                  <span className="font-medium">
                    {formatNum(execResult.netAmount)} {execResult.toOznaka}
                  </span>
                </p>
                <p className="text-xs text-green-600">
                  Referenca: {execResult.referenceId}
                </p>
              </div>
            </div>
          )}

          {/* Error feedback */}
          {execError && (
            <div
              data-testid="exec-error"
              className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
            >
              {execError}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
