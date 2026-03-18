import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ExternalLink } from 'lucide-react'
import { getClientAccounts } from '@/services/bankaService'
import {
  createPaymentIntent,
  verifyAndExecutePayment,
  getPaymentRecipients,
} from '@/services/paymentService'
import type { AccountListItem, PaymentRecipient, CreatePaymentIntentResult } from '@/types'

interface LocationState {
  recipientId?: string
  recipientName?: string
  recipientAccount?: string
  payerAccountId?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency: string) {
  return `${amount.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

type Step = 'form' | 'verify' | 'done'

// ─── Component ────────────────────────────────────────────────────────────────

export default function NovoPlacanjeWizard() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = (location.state ?? {}) as LocationState

  const [step, setStep] = useState<Step>('form')

  // Accounts & recipients
  const [accounts, setAccounts] = useState<AccountListItem[]>([])
  const [recipients, setRecipients] = useState<PaymentRecipient[]>([])
  const [loadingInit, setLoadingInit] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)

  // Form fields – pre-filled from location.state when coming from BrzoPlacanjeWidget
  const [racunPlatioceId, setRacunPlatioceId] = useState(prefill.payerAccountId ?? '')
  const [brojRacunaPrimaoca, setBrojRacunaPrimaoca] = useState(prefill.recipientAccount ?? '')
  const [nazivPrimaoca, setNazivPrimaoca] = useState(prefill.recipientName ?? '')
  const [iznos, setIznos] = useState('')
  const [sifraPlacanja, setSifraPlacanja] = useState('289')
  const [pozivNaBroj, setPozivNaBroj] = useState('')
  const [svrhaPlacanja, setSvrhaPlacanja] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Verification
  const [pendingIntent, setPendingIntent] = useState<CreatePaymentIntentResult | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifyLoading, setVerifyLoading] = useState(false)

  // Done
  const [completedIntentId, setCompletedIntentId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getClientAccounts(), getPaymentRecipients()])
      .then(([accs, recs]) => {
        setAccounts(accs)
        setRecipients(recs)
        // Pre-fill account from location state; fall back to first account
        if (!prefill.payerAccountId && accs.length > 0) {
          setRacunPlatioceId(accs[0].id)
        }
      })
      .catch((err: Error) => setInitError(err.message))
      .finally(() => setLoadingInit(false))
  }, [])

  function applyRecipient(r: PaymentRecipient) {
    setNazivPrimaoca(r.naziv)
    setBrojRacunaPrimaoca(r.broj_racuna)
  }

  // ── Step 1: submit payment form ────────────────────────────────────────────

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const account = accounts.find((a) => a.id === racunPlatioceId)
    if (!account) { setFormError('Odaberite račun platioca.'); return }

    const iznNum = parseFloat(iznos)
    if (!iznos || isNaN(iznNum) || iznNum <= 0) { setFormError('Unesite ispravan iznos.'); return }
    if (!brojRacunaPrimaoca.trim() || brojRacunaPrimaoca.length < 10) {
      setFormError('Unesite ispravan broj računa primaoca (min. 10 cifara).')
      return
    }
    if (!nazivPrimaoca.trim()) { setFormError('Unesite naziv primaoca.'); return }
    if (!sifraPlacanja.trim() || !/^2\d{2}$/.test(sifraPlacanja)) {
      setFormError('Šifra plaćanja mora imati 3 cifre i počinjati sa 2 (npr. 289).')
      return
    }

    setFormLoading(true)
    try {
      const result = await createPaymentIntent({
        idempotencyKey:     crypto.randomUUID(),
        racunPlatiocaId:    Number(racunPlatioceId),
        brojRacunaPrimaoca: brojRacunaPrimaoca.trim(),
        nazivPrimaoca:      nazivPrimaoca.trim(),
        iznos:              iznNum,
        sifraPlacanja:      sifraPlacanja,
        pozivNaBroj:        pozivNaBroj.trim(),
        svrhaPlacanja:      svrhaPlacanja.trim(),
      })
      setPendingIntent(result)
      setVerifyCode('')
      setVerifyError(null)
      setStep('verify')
    } catch (err: unknown) {
      setFormError((err as Error).message)
    } finally {
      setFormLoading(false)
    }
  }

  // ── Step 2: verify code ────────────────────────────────────────────────────

  async function handleVerify() {
    if (!pendingIntent) return
    if (verifyCode.length !== 6) { setVerifyError('Unesite 6-cifreni kod.'); return }

    setVerifyLoading(true)
    setVerifyError(null)
    try {
      const done = await verifyAndExecutePayment(pendingIntent.intent_id, verifyCode)
      setCompletedIntentId(done.id)
      setStep('done')
    } catch (err: unknown) {
      const e = err as Error & { grpcCode?: number }
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

  // ── Render ─────────────────────────────────────────────────────────────────

  const selectedAccount = accounts.find((a) => a.id === racunPlatioceId)

  if (loadingInit) {
    return <div className="card text-center py-10 text-gray-400">Učitavanje…</div>
  }

  if (initError) {
    return <div className="card bg-red-50 text-red-700 text-sm">{initError}</div>
  }

  // ── Done ────────────────────────────────────────────────────────────────────

  if (step === 'done') {
    return (
      <div className="max-w-lg space-y-6">
        <div className="card text-center py-10 space-y-4">
          <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
          <h2 className="text-xl font-bold text-gray-900">Plaćanje realizovano!</h2>
          <p className="text-sm text-gray-500">
            Nalog <span className="font-mono font-medium">{pendingIntent?.broj_naloga}</span> je uspešno izvršen.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {completedIntentId && (
              <a
                href={`/api/bank/payments/${completedIntentId}/receipt`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary flex items-center gap-1.5 text-sm justify-center"
              >
                <ExternalLink className="h-4 w-4" /> Preuzmi potvrdu
              </a>
            )}
            <button onClick={() => navigate('/client/payments/history')} className="btn btn-secondary text-sm">
              Pregled plaćanja
            </button>
            <button
              onClick={() => { setStep('form'); setPendingIntent(null); setVerifyCode(''); setFormError(null) }}
              className="btn btn-primary text-sm"
            >
              Novo plaćanje
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Verify step ─────────────────────────────────────────────────────────────

  if (step === 'verify') {
    return (
      <div className="max-w-lg space-y-6">
        <button
          onClick={() => { setStep('form'); setPendingIntent(null) }}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Nazad
        </button>

        <h1 className="text-2xl font-bold text-gray-900">Verifikacija plaćanja</h1>

        <div className="card space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-1">
            <p className="font-semibold">Nalog je kreiran — otvorite mobilnu aplikaciju</p>
            <p>Pronađite zahtev u sekciji &ldquo;Pending Approvals&rdquo; i pritisnite &ldquo;Approve Transaction&rdquo;.</p>
            <p className="mt-1">Mobilna aplikacija će vam prikazati 6-cifreni verifikacioni kod koji unesite ispod.</p>
          </div>

          {pendingIntent && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
              <div className="flex justify-between"><span>Nalog</span><span className="font-mono font-medium">{pendingIntent.broj_naloga}</span></div>
              <div className="flex justify-between"><span>Iznos</span><span className="font-semibold">{formatAmount(pendingIntent.iznos, pendingIntent.valuta)}</span></div>
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {verifyError}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => { setStep('form'); setPendingIntent(null); setVerifyCode('') }}
              className="btn btn-secondary"
              disabled={verifyLoading}
            >
              Otkaži
            </button>
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifyLoading || verifyCode.length !== 6}
              className="btn btn-primary"
            >
              {verifyLoading ? 'Proveravanje…' : 'Potvrdi plaćanje'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Form step ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/client')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Nazad
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">Novo plaćanje</h1>

      <form onSubmit={handleFormSubmit} className="card space-y-5">
        {/* Payer account */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Račun platioca</label>
          <select
            value={racunPlatioceId}
            onChange={(e) => setRacunPlatioceId(e.target.value)}
            className="input w-full"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.naziv_racuna} — {a.broj_racuna} ({formatAmount(a.raspolozivo_stanje, a.valuta_oznaka)})
              </option>
            ))}
          </select>
          {selectedAccount && (
            <p className="text-xs text-gray-400 mt-1">
              Raspoloživo: <span className="font-medium text-gray-600">{formatAmount(selectedAccount.raspolozivo_stanje, selectedAccount.valuta_oznaka)}</span>
            </p>
          )}
        </div>

        {/* Saved recipients shortcut */}
        {recipients.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sačuvani primaoci (opciono)</label>
            <select
              className="input w-full text-sm"
              defaultValue=""
              onChange={(e) => {
                const r = recipients.find((r) => r.id === e.target.value)
                if (r) applyRecipient(r)
              }}
            >
              <option value="" disabled>— Izaberite sačuvanog primaoca —</option>
              {recipients.map((r) => (
                <option key={r.id} value={r.id}>{r.naziv} ({r.broj_racuna})</option>
              ))}
            </select>
          </div>
        )}

        {/* Recipient account */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Broj računa primaoca</label>
          <input
            className="input w-full font-mono"
            value={brojRacunaPrimaoca}
            onChange={(e) => setBrojRacunaPrimaoca(e.target.value.replace(/\D/g, '').slice(0, 18))}
            placeholder="npr. 1234567890123456"
            inputMode="numeric"
            required
          />
        </div>

        {/* Recipient name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Naziv primaoca</label>
          <input
            className="input w-full"
            value={nazivPrimaoca}
            onChange={(e) => setNazivPrimaoca(e.target.value)}
            placeholder="npr. Marko Marković"
            required
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Iznos {selectedAccount ? `(${selectedAccount.valuta_oznaka})` : ''}
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

        {/* Payment code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Šifra plaćanja (3 cifre, počinje sa 2)</label>
          <input
            className="input w-full font-mono"
            value={sifraPlacanja}
            onChange={(e) => setSifraPlacanja(e.target.value.replace(/\D/g, '').slice(0, 3))}
            placeholder="289"
            inputMode="numeric"
            maxLength={3}
          />
        </div>

        {/* Reference number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Poziv na broj (opciono)</label>
          <input
            className="input w-full font-mono"
            value={pozivNaBroj}
            onChange={(e) => setPozivNaBroj(e.target.value)}
            placeholder="npr. 97 123456789"
          />
        </div>

        {/* Purpose */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Svrha plaćanja (opciono)</label>
          <input
            className="input w-full"
            value={svrhaPlacanja}
            onChange={(e) => setSvrhaPlacanja(e.target.value)}
            placeholder="npr. Uplata za usluge"
          />
        </div>

        {formError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">Otkaži</button>
          <button type="submit" disabled={formLoading || accounts.length === 0} className="btn btn-primary">
            {formLoading ? 'Kreiranje naloga…' : 'Nastavi'}
          </button>
        </div>
      </form>
    </div>
  )
}
