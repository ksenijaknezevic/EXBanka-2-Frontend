/**
 * InterbankOTCPage — međubankarska OTC trading stranica.
 *
 * Sekcije:
 *   1. Lista javnih akcija (lokalne + remote banka /public-stock).
 *   2. Forma "Napravi ponudu" (POST /negotiations ka banci prodavca).
 *   3. Lista mojih opcionih ugovora sa dugmetom "Iskoristi" (exercise).
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, RefreshCw } from 'lucide-react'
import {
  getPublicStocks,
  createNegotiation,
  listInterbankContracts,
  exerciseInterbankContract,
  listIncomingNegotiations,
  acceptNegotiation,
  counterNegotiation,
  cancelNegotiation,
  type PublicStocksDTO,
  type InterbankOptionContract,
  type PublicStock,
  type PublicStockSeller,
  type IncomingNegotiation,
} from '@/services/interbankService'

export default function InterbankOTCPage() {
  const [publicStocks, setPublicStocks] = useState<PublicStocksDTO | null>(null)
  const [contracts, setContracts] = useState<InterbankOptionContract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Inline create-offer state
  const [selected, setSelected] = useState<{ stock: PublicStock; seller: PublicStockSeller } | null>(null)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerPrice, setOfferPrice] = useState('')
  const [offerCurrency, setOfferCurrency] = useState('USD')
  const [offerPremium, setOfferPremium] = useState('')
  const [offerSettlement, setOfferSettlement] = useState('')
  const [offerError, setOfferError] = useState<string | null>(null)
  const [offerSubmitting, setOfferSubmitting] = useState(false)
  const [offerSuccess, setOfferSuccess] = useState<string | null>(null)

  // Exercise state
  const [exercising, setExercising] = useState<string | null>(null)
  const [exerciseMsg, setExerciseMsg] = useState<string | null>(null)

  // Dolazne ponude (mi smo banka prodavca)
  const [incoming, setIncoming] = useState<IncomingNegotiation[]>([])
  const [acting, setActing] = useState<string | null>(null)
  const [incomingMsg, setIncomingMsg] = useState<string | null>(null)
  const [counterFor, setCounterFor] = useState<IncomingNegotiation | null>(null)
  const [cAmount, setCAmount] = useState('')
  const [cPrice, setCPrice] = useState('')
  const [cPremium, setCPremium] = useState('')
  const [cCurrency, setCCurrency] = useState('USD')
  const [cSettlement, setCSettlement] = useState('')

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const [ps, cts, inc] = await Promise.all([
        getPublicStocks(),
        listInterbankContracts(),
        listIncomingNegotiations(),
      ])
      setPublicStocks(ps)
      setContracts(cts ?? [])
      setIncoming(inc ?? [])
    } catch (e) {
      setError(String((e as { message?: string })?.message ?? e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function submitOffer() {
    if (!selected) return
    const amt = parseInt(offerAmount, 10)
    const price = parseFloat(offerPrice)
    const premium = parseFloat(offerPremium)
    if (!amt || amt <= 0) return setOfferError('Količina mora biti > 0.')
    if (!price || price <= 0) return setOfferError('Cena po jedinici mora biti > 0.')
    if (Number.isNaN(premium) || premium < 0) return setOfferError('Premium mora biti ≥ 0.')
    if (!offerSettlement) return setOfferError('Settlement datum je obavezan.')
    if (amt > selected.seller.amount) return setOfferError('Količina veća od raspoložive.')
    setOfferError(null)
    setOfferSubmitting(true)
    try {
      const id = await createNegotiation({
        ticker: selected.stock.stock.ticker,
        settlementDate: new Date(offerSettlement).toISOString(),
        priceCurrency: offerCurrency,
        priceAmount: price,
        premiumCurrency: offerCurrency,
        premiumAmount: premium,
        sellerRoutingNumber: selected.seller.seller.routingNumber,
        sellerId: selected.seller.seller.id,
        amount: amt,
      })
      setOfferSuccess(`Ponuda kreirana: ${id.routingNumber}/${id.id}`)
      setSelected(null)
      setOfferAmount('')
      setOfferPrice('')
      setOfferPremium('')
      setOfferSettlement('')
    } catch (e) {
      setOfferError(String((e as { message?: string })?.message ?? e))
    } finally {
      setOfferSubmitting(false)
    }
  }

  async function handleExercise(c: InterbankOptionContract) {
    const key = `${c.NegotiationRoutingNumber}/${c.NegotiationForeignID}`
    setExercising(key)
    setExerciseMsg(null)
    try {
      const r = await exerciseInterbankContract(c.NegotiationRoutingNumber, c.NegotiationForeignID)
      setExerciseMsg(`Ugovor iskorišćen. Status: ${r.status}`)
      await refresh()
    } catch (e) {
      setExerciseMsg(`Greška: ${String((e as { message?: string })?.message ?? e)}`)
    } finally {
      setExercising(null)
    }
  }

  function negKey(n: IncomingNegotiation) {
    return `${n.negotiationId.routingNumber}/${n.negotiationId.id}`
  }

  async function runIncomingAction(n: IncomingNegotiation, fn: () => Promise<void>, ok: string) {
    setActing(negKey(n))
    setIncomingMsg(null)
    try {
      await fn()
      setIncomingMsg(ok)
      await refresh()
    } catch (e) {
      setIncomingMsg(`Greška: ${String((e as { message?: string })?.message ?? e)}`)
    } finally {
      setActing(null)
    }
  }

  function handleAccept(n: IncomingNegotiation) {
    void runIncomingAction(
      n,
      () => acceptNegotiation(n.negotiationId.routingNumber, n.negotiationId.id),
      'Ponuda prihvaćena — kreiran je opcioni ugovor.',
    )
  }

  function handleReject(n: IncomingNegotiation) {
    void runIncomingAction(
      n,
      () => cancelNegotiation(n.negotiationId.routingNumber, n.negotiationId.id),
      'Ponuda odbijena.',
    )
  }

  function openCounter(n: IncomingNegotiation) {
    setCounterFor(n)
    setCAmount(String(n.amount))
    setCPrice(String(n.pricePerUnit.amount))
    setCPremium(String(n.premium.amount))
    setCCurrency(n.pricePerUnit.currency || 'USD')
    setCSettlement(n.settlementDate ? n.settlementDate.slice(0, 10) : '')
    setIncomingMsg(null)
  }

  async function submitCounter() {
    if (!counterFor) return
    const n = counterFor
    const amt = parseInt(cAmount, 10)
    const price = parseFloat(cPrice)
    const premium = parseFloat(cPremium)
    if (!amt || amt <= 0 || !price || price <= 0 || Number.isNaN(premium) || premium < 0 || !cSettlement) {
      setIncomingMsg('Neispravne vrednosti kontraponude.')
      return
    }
    await runIncomingAction(
      n,
      () =>
        counterNegotiation(n.negotiationId.routingNumber, n.negotiationId.id, {
          ticker: n.ticker,
          settlementDate: new Date(cSettlement).toISOString(),
          priceCurrency: cCurrency,
          priceAmount: price,
          premiumCurrency: cCurrency,
          premiumAmount: premium,
          buyerRoutingNumber: n.buyer.routingNumber,
          buyerId: n.buyer.id,
          sellerRoutingNumber: n.seller.routingNumber,
          sellerId: n.seller.id,
          amount: amt,
        }),
      'Kontraponuda poslata.',
    )
    setCounterFor(null)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Međubankarska OTC trgovina</h1>
        <button
          onClick={refresh}
          className="flex items-center gap-2 text-sm px-3 py-1 border rounded hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Osveži
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Public stocks ── */}
      <section data-testid="public-stocks" className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Akcije u javnom režimu</h2>
        {loading && <Loader2 className="animate-spin text-blue-600" />}
        {!loading && publicStocks && (
          <PublicStockTables
            data={publicStocks}
            onPickSeller={(s, sel) => {
              setSelected({ stock: s, seller: sel })
              setOfferSuccess(null)
              setOfferError(null)
            }}
          />
        )}
      </section>

      {/* ── New offer form ── */}
      {selected && (
        <section data-testid="new-offer" className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">
            Napravi ponudu za {selected.stock.stock.ticker}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Prodavac: banka {selected.seller.seller.routingNumber}, korisnik {selected.seller.seller.id}; raspoloživo: {selected.seller.amount}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Količina">
              <input
                type="number"
                min="1"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </Field>
            <Field label="Cena po jedinici">
              <input
                type="number"
                step="0.01"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </Field>
            <Field label="Premium (jednokratna)">
              <input
                type="number"
                step="0.01"
                value={offerPremium}
                onChange={(e) => setOfferPremium(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </Field>
            <Field label="Valuta">
              <select
                value={offerCurrency}
                onChange={(e) => setOfferCurrency(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                {['USD', 'EUR', 'RSD', 'CHF', 'JPY', 'AUD', 'CAD', 'GBP'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Settlement datum">
              <input
                type="date"
                value={offerSettlement}
                onChange={(e) => setOfferSettlement(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </Field>
          </div>
          {offerError && <p className="text-sm text-red-600 mt-3">{offerError}</p>}
          <div className="flex gap-2 mt-4">
            <button
              onClick={submitOffer}
              disabled={offerSubmitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm"
            >
              {offerSubmitting ? 'Šaljem…' : 'Pošalji ponudu'}
            </button>
            <button
              onClick={() => setSelected(null)}
              className="border px-4 py-2 rounded text-sm"
            >
              Otkaži
            </button>
          </div>
        </section>
      )}

      {offerSuccess && (
        <div className="bg-green-50 border border-green-200 p-3 rounded text-sm text-green-700">
          {offerSuccess}
        </div>
      )}

      {/* ── OTC pregovori (mi smo kupac ili prodavac) ── */}
      <section data-testid="incoming-negotiations" className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-1">OTC pregovori</h2>
        <p className="text-xs text-gray-400 mb-4">
          Pregovori gde ste kupac ili prodavac (uključujući ponude koje ste poslali drugoj banci).
          Prihvatanje kreira opcioni ugovor; naplata premije je zaseban korak.
        </p>
        {loading && <Loader2 className="animate-spin text-blue-600" />}
        {!loading && incoming.length === 0 && (
          <p className="text-sm text-gray-500">Nema dolaznih ponuda.</p>
        )}
        {!loading && incoming.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Ticker</th>
                <th>Količina</th>
                <th>Cena/jed.</th>
                <th>Premium</th>
                <th>Uloga</th>
                <th>Druga strana</th>
                <th>Status</th>
                <th>Na potezu</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {incoming.map((n) => {
                const key = negKey(n)
                const busy = acting === key
                const canAct = n.isOngoing && n.myTurn
                return (
                  <tr key={key} className="border-b">
                    <td className="py-2 font-medium">{n.ticker}</td>
                    <td>{n.amount}</td>
                    <td>{n.pricePerUnit.amount} {n.pricePerUnit.currency}</td>
                    <td>{n.premium.amount} {n.premium.currency}</td>
                    <td>{n.myRole === 'BUYER' ? 'Kupac' : 'Prodavac'}</td>
                    <td>
                      {n.myRole === 'BUYER'
                        ? `${n.seller.routingNumber}/${n.seller.id}`
                        : `${n.buyer.routingNumber}/${n.buyer.id}`}
                    </td>
                    <td>{n.status}</td>
                    <td>{n.isOngoing ? (n.myTurn ? 'Vi' : 'Druga banka') : '—'}</td>
                    <td className="space-x-2 whitespace-nowrap">
                      <button
                        data-testid={`accept-${n.negotiationId.id}`}
                        onClick={() => handleAccept(n)}
                        disabled={!canAct || busy}
                        className="text-green-700 hover:underline disabled:opacity-40"
                      >
                        Prihvati
                      </button>
                      <button
                        onClick={() => openCounter(n)}
                        disabled={!canAct || busy}
                        className="text-blue-600 hover:underline disabled:opacity-40"
                      >
                        Kontra
                      </button>
                      <button
                        onClick={() => handleReject(n)}
                        disabled={!n.isOngoing || busy}
                        className="text-red-600 hover:underline disabled:opacity-40"
                      >
                        Odbij
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {counterFor && (
          <div className="mt-4 bg-blue-50 border border-blue-200 p-4 rounded">
            <h3 className="text-sm font-semibold mb-3">
              Kontraponuda za {counterFor.ticker} ({negKey(counterFor)})
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Količina">
                <input type="number" min="1" value={cAmount} onChange={(e) => setCAmount(e.target.value)} className="w-full border rounded px-3 py-2" />
              </Field>
              <Field label="Cena po jedinici">
                <input type="number" step="0.01" value={cPrice} onChange={(e) => setCPrice(e.target.value)} className="w-full border rounded px-3 py-2" />
              </Field>
              <Field label="Premium">
                <input type="number" step="0.01" value={cPremium} onChange={(e) => setCPremium(e.target.value)} className="w-full border rounded px-3 py-2" />
              </Field>
              <Field label="Valuta">
                <select value={cCurrency} onChange={(e) => setCCurrency(e.target.value)} className="w-full border rounded px-3 py-2">
                  {['USD', 'EUR', 'RSD', 'CHF', 'JPY', 'AUD', 'CAD', 'GBP'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Settlement datum">
                <input type="date" value={cSettlement} onChange={(e) => setCSettlement(e.target.value)} className="w-full border rounded px-3 py-2" />
              </Field>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={submitCounter} disabled={acting !== null} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm">
                Pošalji kontraponudu
              </button>
              <button onClick={() => setCounterFor(null)} className="border px-4 py-2 rounded text-sm">
                Otkaži
              </button>
            </div>
          </div>
        )}

        {incomingMsg && <p className="mt-3 text-sm text-gray-700">{incomingMsg}</p>}
      </section>

      {/* ── My contracts ── */}
      <section data-testid="my-contracts" className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Moji opcioni ugovori</h2>
        {contracts.length === 0 && (
          <p className="text-sm text-gray-500">Nemate aktivnih ugovora.</p>
        )}
        {contracts.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Ticker</th>
                <th>Količina</th>
                <th>Strike</th>
                <th>Premium</th>
                <th>Settlement</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => {
                const key = `${c.NegotiationRoutingNumber}/${c.NegotiationForeignID}`
                return (
                  <tr key={key} className="border-b">
                    <td className="py-2 font-medium">{c.StockTicker}</td>
                    <td>{c.Amount}</td>
                    <td>{c.PriceAmount} {c.PriceCurrency}</td>
                    <td>{c.PremiumAmount} {c.PremiumCurrency}</td>
                    <td>{new Date(c.SettlementDate).toLocaleDateString('sr-RS')}</td>
                    <td>{c.Status}</td>
                    <td>
                      {c.Status === 'ACTIVE' && (
                        <button
                          data-testid={`exercise-${c.NegotiationForeignID}`}
                          onClick={() => handleExercise(c)}
                          disabled={exercising === key}
                          className="text-blue-600 hover:underline disabled:opacity-50"
                        >
                          {exercising === key ? 'Izvršavam…' : 'Iskoristi'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {exerciseMsg && (
          <p className="mt-3 text-sm text-gray-700">{exerciseMsg}</p>
        )}
      </section>

      <p className="text-xs text-gray-400">
        <Link to="/otc" className="underline">Lokalna OTC trading</Link>
      </p>
    </div>
  )
}

function PublicStockTables({
  data,
  onPickSeller,
}: {
  data: PublicStocksDTO
  onPickSeller: (s: PublicStock, sel: PublicStockSeller) => void
}) {
  const groups = [
    { title: 'Naša banka', list: data.local },
    { title: 'Druga banka', list: data.remote },
  ]
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.title}>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">{g.title}</h3>
          {g.list.length === 0 && (
            <p className="text-xs text-gray-400">Nema dostupnih akcija.</p>
          )}
          {g.list.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2">Ticker</th>
                  <th>Prodavac (routing)</th>
                  <th>Korisnik</th>
                  <th>Količina</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {g.list.flatMap((s) =>
                  s.sellers.map((seller, i) => (
                    <tr key={`${s.stock.ticker}-${seller.seller.routingNumber}-${seller.seller.id}-${i}`} className="border-b">
                      <td className="py-2 font-medium">{s.stock.ticker}</td>
                      <td>{seller.seller.routingNumber}</td>
                      <td>{seller.seller.id}</td>
                      <td>{seller.amount}</td>
                      <td>
                        <button
                          onClick={() => onPickSeller(s, seller)}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          Napravi ponudu
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700 block mb-1">{label}</span>
      {children}
    </label>
  )
}
