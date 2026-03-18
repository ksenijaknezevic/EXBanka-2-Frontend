import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Info, X, Download } from 'lucide-react'
import { getClientAccounts, getAccountDetail } from '@/services/bankaService'
import {
  createPaymentIntent,
  verifyAndExecutePayment,
  getPaymentRecipients,
  createPaymentRecipient,
} from '@/services/paymentService'
import type { AccountListItem, AccountDetail, PaymentRecipient, CreatePaymentIntentResult } from '@/types'
import { downloadPaymentReceipt } from '@/utils/pdfReceipt'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency: string) {
  return `${amount.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

type Step = 'form' | 'verify' | 'done'

// ─── Component ────────────────────────────────────────────────────────────────

export default function NovoPlacanjeWizard() {
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('form')

  // Accounts & recipients
  const [accounts, setAccounts] = useState<AccountListItem[]>([])
  const [recipients, setRecipients] = useState<PaymentRecipient[]>([])
  const [loadingInit, setLoadingInit] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)

  // Selected account detail (for limits)
  const [accountDetail, setAccountDetail] = useState<AccountDetail | null>(null)
  const [showLimitInfo, setShowLimitInfo] = useState(false)

  // Form fields
  const [racunPlatioceId, setRacunPlatioceId] = useState('')
  const [brojRacunaPrimaoca, setBrojRacunaPrimaoca] = useState('')
  const [nazivPrimaoca, setNazivPrimaoca] = useState('')
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
  const [completedPayment, setCompletedPayment] = useState<import('@/types').PaymentIntent | null>(null)
  const [addRecipientLoading, setAddRecipientLoading] = useState(false)
  const [recipientAdded, setRecipientAdded] = useState(false)
  const [addRecipientError, setAddRecipientError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getClientAccounts(), getPaymentRecipients()])
      .then(([accs, recs]) => {
        setAccounts(accs)
        setRecipients(recs)
        if (accs.length > 0) setRacunPlatioceId(accs[0].id)
      })
      .catch((err: Error) => setInitError(err.message))
      .finally(() => setLoadingInit(false))
  }, [])

  // Fetch account detail when payer account changes (for limit info)
  useEffect(() => {
    if (!racunPlatioceId) return
    setAccountDetail(null)
    setShowLimitInfo(false)
    getAccountDetail(racunPlatioceId)
      .then(setAccountDetail)
      .catch(() => { /* silently ignore */ })
  }, [racunPlatioceId])

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
      setCompletedPayment(done)
      setRecipientAdded(false)
      setAddRecipientError(null)
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

  // ── Check if recipient is new ──────────────────────────────────────────────

  const isNewRecipient = !recipients.some(
    (r) => r.broj_racuna === brojRacunaPrimaoca.trim()
  )

  async function handleAddRecipient() {
    setAddRecipientLoading(true)
    setAddRecipientError(null)
    try {
      const newRec = await createPaymentRecipient(nazivPrimaoca.trim(), brojRacunaPrimaoca.trim())
      setRecipients((prev) => [...prev, newRec])
      setRecipientAdded(true)
    } catch (err: unknown) {
      setAddRecipientError((err as Error).message)
    } finally {
      setAddRecipientLoading(false)
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

          {/* Commission info */}
          {completedPayment && completedPayment.provizija > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 text-left">
              <p>Provizija banke: <span className="font-semibold">{formatAmount(completedPayment.provizija, 'EUR')}</span></p>
              <p className="text-xs text-yellow-600 mt-0.5">Provizija se naplaćuje pri plaćanju u različitim valutama.</p>
            </div>
          )}

          {/* Add recipient button for new recipients */}
          {isNewRecipient && !recipientAdded && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-left space-y-2">
              <p className="text-blue-800 font-medium">Novi primalac</p>
              <p className="text-blue-700 text-xs">
                Želite li da sačuvate <strong>{nazivPrimaoca}</strong> kao primaoca plaćanja za buduća plaćanja?
              </p>
              {addRecipientError && (
                <p className="text-red-600 text-xs">{addRecipientError}</p>
              )}
              <button
                onClick={handleAddRecipient}
                disabled={addRecipientLoading}
                className="btn btn-secondary text-xs px-3 py-1.5"
              >
                {addRecipientLoading ? 'Dodavanje…' : 'Dodaj primaoca'}
              </button>
            </div>
          )}

          {recipientAdded && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
              Primalac je uspešno sačuvan u Primaoci plaćanja.
            </div>
          )}

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
              onClick={() => { setStep('form'); setPendingIntent(null); setVerifyCode(''); setFormError(null); setCompletedPayment(null) }}
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
              <div className="flex justify-between text-gray-400"><span>Provizija</span><span>0 EUR (ista valuta)</span></div>
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
              Nazad
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

        {/* Amount with Info button */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Iznos {selectedAccount ? `(${selectedAccount.valuta_oznaka})` : ''}
          </label>
          <div className="flex gap-2 items-center">
            <input
              className="input flex-1"
              type="number"
              step="0.01"
              min="0.01"
              value={iznos}
              onChange={(e) => setIznos(e.target.value)}
              placeholder="0.00"
              required
            />
            <button
              type="button"
              onClick={() => setShowLimitInfo((v) => !v)}
              className={[
                'flex items-center justify-center h-10 w-10 rounded-lg border transition-colors shrink-0',
                showLimitInfo
                  ? 'border-primary-400 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600',
              ].join(' ')}
              title="Preostali limit plaćanja"
            >
              {showLimitInfo ? <X className="h-4 w-4" /> : <Info className="h-4 w-4" />}
            </button>
          </div>

          {showLimitInfo && accountDetail && (
            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
              <p className="font-semibold">Limiti plaćanja</p>
              <div className="flex justify-between">
                <span>Dnevni limit:</span>
                <span className="font-medium">
                  {accountDetail.dnevni_limit > 0
                    ? formatAmount(accountDetail.dnevni_limit, accountDetail.valuta_oznaka)
                    : 'Nije postavljen'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Mesečni limit:</span>
                <span className="font-medium">
                  {accountDetail.mesecni_limit > 0
                    ? formatAmount(accountDetail.mesecni_limit, accountDetail.valuta_oznaka)
                    : 'Nije postavljen'}
                </span>
              </div>
              <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                <span>Raspoloživo stanje:</span>
                <span className="font-semibold text-blue-900">
                  {formatAmount(accountDetail.raspolozivo_stanje, accountDetail.valuta_oznaka)}
                </span>
              </div>
            </div>
          )}

          {showLimitInfo && !accountDetail && (
            <div className="mt-2 bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
              Učitavanje podataka o limitu…
            </div>
          )}
        </div>

        {/* Payment code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Šifra plaćanja
            <span className="text-xs text-gray-400 ml-2">Online plaćanje — uvek počinje sa 2 (npr. 289)</span>
          </label>
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

        {/* Commission note */}
        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
          <strong>Provizija banke:</strong> 0 EUR (plaćanje u istoj valuti). Provizija se naplaćuje samo pri plaćanju između različitih valuta.
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
