import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Download } from 'lucide-react'
import { getClientAccounts } from '@/services/bankaService'
import { createTransferIntent, verifyAndExecutePayment } from '@/services/paymentService'
import type { AccountListItem, CreatePaymentIntentResult } from '@/types'
import { downloadPaymentReceipt } from '@/utils/pdfReceipt'

function formatAmount(amount: number, currency: string) {
  return `${amount.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

type Step = 'form' | 'confirm' | 'verify' | 'done'

export default function PrenosPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('form')

  const [accounts, setAccounts] = useState<AccountListItem[]>([])
  const [loadingInit, setLoadingInit] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)

  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [iznos, setIznos] = useState('')
  const [svrha, setSvrha] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const [pendingIntent, setPendingIntent] = useState<CreatePaymentIntentResult | null>(null)
  const [intentLoading, setIntentLoading] = useState(false)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifyLoading, setVerifyLoading] = useState(false)

  const [completedPayment, setCompletedPayment] = useState<import('@/types').PaymentIntent | null>(null)

  useEffect(() => {
    getClientAccounts()
      .then((accs) => {
        setAccounts(accs)
        if (accs.length >= 1) setFromId(accs[0].id)
        if (accs.length >= 2) setToId(accs[1].id)
      })
      .catch((err: Error) => setInitError(err.message))
      .finally(() => setLoadingInit(false))
  }, [])

  const fromAccount = accounts.find((a) => a.id === fromId)
  const toAccount = accounts.find((a) => a.id === toId)

  // ── Step 1: validate form → go to confirm ─────────────────────────────────

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!fromId || !toId) { setFormError('Odaberite oba računa.'); return }
    if (fromId === toId) { setFormError('Račun platioca i primaoca ne smeju biti isti.'); return }

    // Currency validation — cannot transfer between different currencies
    if (fromAccount && toAccount && fromAccount.valuta_oznaka !== toAccount.valuta_oznaka) {
      setFormError(
        `Prenos nije moguć između računa različitih valuta (${fromAccount.valuta_oznaka} → ${toAccount.valuta_oznaka}). Odaberite račune u istoj valuti.`
      )
      return
    }

    const iznNum = parseFloat(iznos)
    if (!iznos || isNaN(iznNum) || iznNum <= 0) { setFormError('Unesite ispravan iznos.'); return }

    setStep('confirm')
  }

  // ── Step 2: confirm → create intent → verify ──────────────────────────────

  async function handleConfirm() {
    const iznNum = parseFloat(iznos)
    setIntentLoading(true)
    setVerifyError(null)
    try {
      const result = await createTransferIntent({
        idempotencyKey:  crypto.randomUUID(),
        racunPlatiocaId: Number(fromId),
        racunPrimaocaId: Number(toId),
        iznos:           iznNum,
        svrhaPlacanja:   svrha.trim(),
      })
      setPendingIntent(result)
      setVerifyCode('')
      setStep('verify')
    } catch (err: unknown) {
      setVerifyError((err as Error).message)
    } finally {
      setIntentLoading(false)
    }
  }

  // ── Step 3: verify code ────────────────────────────────────────────────────

  async function handleVerify() {
    if (!pendingIntent) return
    if (verifyCode.length !== 6) { setVerifyError('Unesite 6-cifreni kod.'); return }

    setVerifyLoading(true)
    setVerifyError(null)
    try {
      const done = await verifyAndExecutePayment(pendingIntent.intent_id, verifyCode)
      setCompletedPayment(done)
      setStep('done')
    } catch (err: unknown) {
      const e = err as Error
      if (e.message?.includes('otkazan') || e.message?.includes('previše')) {
        setVerifyError('Nalog je otkazan — previše neuspešnih pokušaja. Kreirajte novi nalog.')
        setPendingIntent(null)
        setStep('form')
      } else if (e.message?.includes('istekao')) {
        setVerifyError('Kod je istekao. Kreirajte novi nalog.')
        setPendingIntent(null)
        setStep('form')
      } else {
        setVerifyError(e.message)
      }
    } finally {
      setVerifyLoading(false)
    }
  }

  if (loadingInit) return <div className="card text-center py-10 text-gray-400">Učitavanje…</div>
  if (initError) return <div className="card bg-red-50 text-red-700 text-sm">{initError}</div>

  if (accounts.length < 2) {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Prenos između računa</h1>
        <div className="card bg-yellow-50 text-yellow-800 text-sm">
          Za prenos između računa potrebno je da imate najmanje 2 aktivna računa.
        </div>
      </div>
    )
  }

  // ── Done ──────────────────────────────────────────────────────────────────

  if (step === 'done') {
    return (
      <div className="max-w-lg space-y-6">
        <div className="card text-center py-10 space-y-4">
          <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
          <h2 className="text-xl font-bold text-gray-900">Prenos realizovan!</h2>
          <p className="text-sm text-gray-500">
            Nalog <span className="font-mono font-medium">{pendingIntent?.broj_naloga}</span> je uspešno izvršen.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {completedPayment && (
              <button
                onClick={() => downloadPaymentReceipt(completedPayment)}
                className="btn btn-secondary flex items-center gap-1.5 text-sm justify-center"
              >
                <Download className="h-4 w-4" /> Preuzmi potvrdu o plaćanju
              </button>
            )}
            <button onClick={() => navigate('/client/payments/history')} className="btn btn-secondary text-sm">
              Pregled plaćanja
            </button>
            <button
              onClick={() => { setStep('form'); setPendingIntent(null); setVerifyCode(''); setIznos(''); setSvrha(''); setCompletedPayment(null) }}
              className="btn btn-primary text-sm"
            >
              Novi prenos
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Verify ────────────────────────────────────────────────────────────────

  if (step === 'verify') {
    return (
      <div className="max-w-lg space-y-6">
        <button
          onClick={() => { setStep('confirm'); setPendingIntent(null) }}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Nazad
        </button>

        <h1 className="text-2xl font-bold text-gray-900">Verifikacija prenosa</h1>

        <div className="card space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-1">
            <p className="font-semibold">Nalog je kreiran — otvorite mobilnu aplikaciju</p>
            <p>Pronađite zahtev u sekciji &ldquo;Pending Approvals&rdquo; i pritisnite &ldquo;Approve Transaction&rdquo;.</p>
            <p>Mobilna aplikacija će vam prikazati 6-cifreni verifikacioni kod.</p>
          </div>

          {pendingIntent && fromAccount && toAccount && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
              <div className="flex items-center justify-between">
                <div className="truncate">
                  <p className="font-medium text-gray-800">{fromAccount.naziv_racuna}</p>
                  <p className="font-mono text-gray-400">{fromAccount.broj_racuna}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 mx-2 shrink-0 text-gray-400" />
                <div className="truncate text-right">
                  <p className="font-medium text-gray-800">{toAccount.naziv_racuna}</p>
                  <p className="font-mono text-gray-400">{toAccount.broj_racuna}</p>
                </div>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-200">
                <span>Iznos</span>
                <span className="font-semibold">{formatAmount(pendingIntent.iznos, pendingIntent.valuta)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verifikacioni kod (6 cifara)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input w-full text-center text-2xl font-mono tracking-widest"
              placeholder="• • • • • •"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">Kod važi 5 minuta · Nakon 3 neuspešna pokušaja nalog se otkazuje</p>
          </div>

          {verifyError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{verifyError}</div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => { setStep('confirm'); setPendingIntent(null); setVerifyCode('') }}
              className="btn btn-secondary"
              disabled={verifyLoading}
            >
              Nazad
            </button>
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifyLoading || verifyCode.length !== 6}
              className="btn btn-primary"
            >
              {verifyLoading ? 'Proveravanje…' : 'Potvrdi prenos'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Confirm step ──────────────────────────────────────────────────────────

  if (step === 'confirm') {
    return (
      <div className="max-w-lg space-y-6">
        <button
          onClick={() => setStep('form')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Nazad
        </button>

        <h1 className="text-2xl font-bold text-gray-900">Potvrda prenosa</h1>

        <div className="card space-y-5">
          <p className="text-sm text-gray-600">Proverite detalje prenosa pre potvrde:</p>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">Sa računa</p>
                <p className="font-semibold text-gray-900 truncate">{fromAccount?.naziv_racuna}</p>
                <p className="font-mono text-xs text-gray-500">{fromAccount?.broj_racuna}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 shrink-0 mt-4" />
              <div className="flex-1 min-w-0 text-right">
                <p className="text-xs text-gray-400 mb-0.5">Na račun</p>
                <p className="font-semibold text-gray-900 truncate">{toAccount?.naziv_racuna}</p>
                <p className="font-mono text-xs text-gray-500">{toAccount?.broj_racuna}</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Iznos</span>
                <span className="font-bold text-gray-900">
                  {formatAmount(parseFloat(iznos), fromAccount?.valuta_oznaka ?? '')}
                </span>
              </div>
              {svrha && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Svrha</span>
                  <span className="text-gray-700">{svrha}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-gray-400">
                <span>Provizija</span>
                <span>0 EUR (ista valuta)</span>
              </div>
            </div>
          </div>

          {verifyError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{verifyError}</div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setStep('form')}
              className="btn btn-secondary"
              disabled={intentLoading}
            >
              Nazad
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={intentLoading}
              className="btn btn-primary"
            >
              {intentLoading ? 'Kreiranje naloga…' : 'Potvrdi'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-xl space-y-6">
      <button
        onClick={() => navigate('/client')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Nazad
      </button>

      <h1 className="text-2xl font-bold text-gray-900">Prenos između računa</h1>

      <form onSubmit={handleFormSubmit} className="card space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sa računa</label>
          <select value={fromId} onChange={(e) => setFromId(e.target.value)} className="input w-full">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.naziv_racuna} — {a.broj_racuna} ({a.valuta_oznaka})
              </option>
            ))}
          </select>
          {fromAccount && (
            <p className="text-xs text-gray-400 mt-1">
              Raspoloživo: <span className="font-medium text-gray-600">{formatAmount(fromAccount.raspolozivo_stanje, fromAccount.valuta_oznaka)}</span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Na račun</label>
          <select value={toId} onChange={(e) => setToId(e.target.value)} className="input w-full">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.naziv_racuna} — {a.broj_racuna} ({a.valuta_oznaka})
              </option>
            ))}
          </select>
          {toAccount && fromAccount && fromAccount.valuta_oznaka !== toAccount.valuta_oznaka && (
            <p className="text-xs text-red-600 mt-1 font-medium">
              Prenos između računa različitih valuta nije dozvoljen.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Iznos {fromAccount ? `(${fromAccount.valuta_oznaka})` : ''}
          </label>
          <input
            className="input w-full"
            type="number"
            step="0.01"
            min="0.01"
            value={iznos}
            onChange={(e) => setIznos(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Svrha plaćanja (opciono)</label>
          <input
            className="input w-full"
            value={svrha}
            onChange={(e) => setSvrha(e.target.value)}
            placeholder="npr. Mesačne uštedine"
          />
        </div>

        {formError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{formError}</div>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">Otkaži</button>
          <button type="submit" className="btn btn-primary">
            Nastavi
          </button>
        </div>
      </form>
    </div>
  )
}
