import { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight, ArrowRight, CheckCircle, Info, Loader2 } from 'lucide-react'
import { getCurrencies, getClientAccounts, createExchangeTransferIntent } from '@/services/bankaService'
import { verifyAndExecutePayment } from '@/services/paymentService'
import type { Currency, AccountListItem } from '@/types'
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

type Step = 'form' | 'confirm' | 'verify' | 'done'

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

  // ── Wizard state ───────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('form')
  const [intentId, setIntentId] = useState('')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [execError, setExecError] = useState<string | null>(null)

  // Enrich currency names from backend on mount
  useEffect(() => {
    getCurrencies()
      .then((data) => setOptions(buildOptions(data)))
      .catch(() => {})
  }, [])

  // Load user accounts once on mount
  useEffect(() => {
    getClientAccounts()
      .then(setAccounts)
      .catch(() => {})
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

  // Reset source account when source currency changes
  useEffect(() => {
    setSourceAccountId('')
    setExecError(null)
  }, [fromOznaka])

  // Reset target account when target currency changes
  useEffect(() => {
    setTargetAccountId('')
    setExecError(null)
  }, [toOznaka])

  // Validate: digits and single decimal point only
  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (val === '' || /^\d*\.?\d*$/.test(val)) setAmountRaw(val)
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

  const hasEnoughFunds = selectedSource ? selectedSource.raspolozivo_stanje >= amount : false

  const canExecute =
    hasValidAmount &&
    !isSame &&
    convResult !== null &&
    !calculating &&
    sourceAccountId !== '' &&
    targetAccountId !== '' &&
    sourceAccountId !== targetAccountId &&
    hasEnoughFunds

  // ── Step handlers ──────────────────────────────────────────────────────────

  async function handleConfirm() {
    if (!canExecute || !convResult) return
    setSubmitting(true)
    setExecError(null)
    try {
      const idempotencyKey = crypto.randomUUID()
      const result = await createExchangeTransferIntent({
        idempotencyKey,
        sourceAccountId,
        targetAccountId,
        amount,
        convertedAmount: convResult.result,
        svrhaPlacanja: `Konverzija ${fromOznaka} → ${toOznaka}`,
      })
      setIntentId(result.intentId)
      setStep('verify')
    } catch (err: unknown) {
      setExecError(err instanceof Error ? err.message : 'Greška pri kreiranju konverzije.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerify() {
    if (!intentId || code.length !== 6) return
    setSubmitting(true)
    setExecError(null)
    try {
      await verifyAndExecutePayment(intentId, code)
      // Refresh balances
      getClientAccounts().then(setAccounts).catch(() => {})
      setStep('done')
    } catch (err: unknown) {
      setExecError(err instanceof Error ? err.message : 'Netačan kod ili greška pri izvršenju.')
    } finally {
      setSubmitting(false)
    }
  }

  function resetWizard() {
    setStep('form')
    setIntentId('')
    setCode('')
    setExecError(null)
    setAmountRaw('')
    setSourceAccountId('')
    setTargetAccountId('')
    setConvResult(null)
  }

  // ── Verify step ────────────────────────────────────────────────────────────
  if (step === 'verify') {
    return (
      <div className="card max-w-md mx-auto space-y-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Verifikacija konverzije</h2>
          <p className="text-xs text-gray-500 mt-1">
            Unesite 6-cifreni kod koji ste primili na mobilni telefon.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Verifikacioni kod
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="______"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          />
        </div>

        {execError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{execError}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => { setStep('confirm'); setCode(''); setExecError(null) }}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Nazad
          </button>
          <button
            onClick={handleVerify}
            disabled={code.length !== 6 || submitting}
            className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Potvrdi
          </button>
        </div>
      </div>
    )
  }

  // ── Done step ──────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="card max-w-md mx-auto space-y-5 text-center">
        <div className="flex flex-col items-center gap-3 py-4">
          <CheckCircle className="h-12 w-12 text-green-500" />
          <h2 className="text-lg font-semibold text-gray-900">Konverzija izvršena</h2>
          <p className="text-sm text-gray-500">
            Sredstva su uspešno konvertovana i prebačena na ciljni račun.
          </p>
        </div>
        <button
          onClick={resetWizard}
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Nova konverzija
        </button>
      </div>
    )
  }

  // ── Confirm step ───────────────────────────────────────────────────────────
  if (step === 'confirm' && convResult) {
    const srcAccount = accounts.find((a) => a.id === sourceAccountId)
    const tgtAccount = accounts.find((a) => a.id === targetAccountId)
    return (
      <div className="card max-w-md mx-auto space-y-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Potvrdi konverziju</h2>
          <p className="text-xs text-gray-500 mt-1">Proverite detalje pre slanja na verifikaciju.</p>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-100 divide-y divide-gray-100 text-sm">
          <div className="flex justify-between px-4 py-3">
            <span className="text-gray-500">Sa računa</span>
            <span className="font-medium text-gray-900 text-right">
              {srcAccount?.naziv_racuna}<br />
              <span className="text-xs font-mono text-gray-400">{srcAccount?.broj_racuna}</span>
            </span>
          </div>
          <div className="flex justify-between px-4 py-3">
            <span className="text-gray-500">Na račun</span>
            <span className="font-medium text-gray-900 text-right">
              {tgtAccount?.naziv_racuna}<br />
              <span className="text-xs font-mono text-gray-400">{tgtAccount?.broj_racuna}</span>
            </span>
          </div>
          <div className="flex justify-between px-4 py-3">
            <span className="text-gray-500">Zadužuje se</span>
            <span className="font-semibold text-gray-900">
              {formatNum(amount)} {fromOznaka}
            </span>
          </div>
          <div className="flex justify-between px-4 py-3">
            <span className="text-gray-500">Uplaćuje se</span>
            <span className="font-semibold text-primary-700">
              {formatNum(convResult.result)} {toOznaka}
            </span>
          </div>
          {convResult.provizija > 0 && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-gray-500">Provizija (~{provizijaPct}%)</span>
              <span className="text-red-500">− {formatNum(convResult.provizija)} {toOznaka}</span>
            </div>
          )}
          {convResult.rateNote && (
            <div className="px-4 py-3 text-xs text-gray-400">{convResult.rateNote}</div>
          )}
        </div>

        {execError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{execError}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => { setStep('form'); setExecError(null) }}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Nazad
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Izvrši konverziju
          </button>
        </div>
      </div>
    )
  }

  // ── Form step (default) ────────────────────────────────────────────────────
  return (
    <div className="card">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Proveri ekvivalentnost</h2>

      {/* Two-column layout: input left, result right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-gray-100">

        {/* ── INPUT SECTION ─────────────────────────────────────────────────── */}
        <div className="md:pr-8 space-y-5 pb-6 md:pb-0">

          {/* Amount */}
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

          {/* From currency */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Iz valute</label>
            <select
              value={fromOznaka}
              onChange={(e) => setFromOznaka(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-colors"
            >
              {options.map((o) => (
                <option key={o.oznaka} value={o.oznaka}>{o.oznaka} – {o.naziv}</option>
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
            <label className="block text-xs font-medium text-gray-600 mb-1.5">U valutu</label>
            <select
              value={toOznaka}
              onChange={(e) => setToOznaka(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-colors"
            >
              {options.map((o) => (
                <option key={o.oznaka} value={o.oznaka}>{o.oznaka} – {o.naziv}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── RESULT SECTION ────────────────────────────────────────────────── */}
        <div className="md:pl-8 pt-6 md:pt-0 border-t md:border-t-0 border-gray-100 flex flex-col justify-center min-h-[240px]">

          {!hasValidAmount && !calculating && (
            <div className="flex flex-col items-center justify-center text-center flex-1 gap-2 py-8">
              <ArrowRight className="h-8 w-8 text-gray-200" />
              <p className="text-sm text-gray-400">Unesite iznos za pregled konverzije</p>
            </div>
          )}

          {hasValidAmount && isSame && !calculating && (
            <div className="flex flex-col items-center justify-center text-center flex-1 gap-2 py-8">
              <p className="text-sm text-gray-500">Ista valuta – konverzija nije potrebna.</p>
              <p className="text-xl font-bold text-gray-900">{formatNum(amount)} {fromOznaka}</p>
            </div>
          )}

          {calculating && (
            <div className="flex flex-col gap-3 animate-pulse py-4">
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          )}

          {!isSame && !calculating && convResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                <span className="font-semibold text-gray-800">{amountRaw} {fromOznaka}</span>
                <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
                <span className="font-semibold text-gray-800">{toOznaka}</span>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Dobijate</p>
                <p className="text-3xl font-bold text-primary-700 tracking-tight">
                  {formatNum(convResult.result)}{' '}
                  <span className="text-xl font-semibold text-primary-500">{toOznaka}</span>
                </p>
              </div>

              {convResult.provizija > 0 && (
                <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3.5 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bruto iznos</span>
                    <span className="font-medium text-gray-700">{formatNum(convResult.bruto)} {toOznaka}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Provizija (~{provizijaPct}%)</span>
                    <span className="font-medium text-red-500">− {formatNum(convResult.provizija)} {toOznaka}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="font-medium text-gray-700">Neto iznos</span>
                    <span className="font-semibold text-gray-900">{formatNum(convResult.result)} {toOznaka}</span>
                  </div>
                </div>
              )}

              {convResult.rateNote && (
                <p className="text-xs text-gray-500">{convResult.rateNote}</p>
              )}

              {convResult.viaRSD && (
                <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 text-xs text-blue-700">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>Konverzija se vrši posredno – obračun ide preko RSD kao bazne valute banke.</span>
                </div>
              )}
            </div>
          )}

          {!isSame && !calculating && hasValidAmount && !convResult && (
            <p className="text-sm text-red-500 py-4 text-center">
              Kurs za izabranu valutu nije dostupan.
            </p>
          )}
        </div>
      </div>

      {/* ── EXECUTION SECTION ───────────────────────────────────────────────── */}
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
                  onChange={(e) => { setSourceAccountId(e.target.value); setExecError(null) }}
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
                  <span className={hasValidAmount && !hasEnoughFunds ? 'text-red-500 font-medium' : 'font-medium text-gray-700'}>
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
                  onChange={(e) => { setTargetAccountId(e.target.value); setExecError(null) }}
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

          {execError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{execError}</p>
          )}

          {/* Execute button → goes to confirm step */}
          <button
            data-testid="execute-button"
            onClick={() => { setExecError(null); setStep('confirm') }}
            disabled={!canExecute}
            className="w-full sm:w-auto rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Izvrši konverziju
          </button>
        </div>
      )}
    </div>
  )
}
