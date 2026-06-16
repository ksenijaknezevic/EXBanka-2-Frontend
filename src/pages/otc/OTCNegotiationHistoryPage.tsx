import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, History, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import Button from '@/components/common/Button'
import {
  getNegotiationHistory,
  type NegotiationSummary,
  type OTCHistoryEntry,
  type HistoryFilter,
} from '@/services/otcHistoryService'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt2(n?: number) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(s?: string) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('sr-RS')
}

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('sr-RS', { dateStyle: 'short', timeStyle: 'short' })
}

// ─── Status badges ────────────────────────────────────────────────────────────

const FINAL_STATUS_STYLE: Record<string, string> = {
  ACCEPTED:    'bg-green-100 text-green-800',
  REJECTED:    'bg-red-100 text-red-800',
  DEACTIVATED: 'bg-gray-100 text-gray-600',
  EXPIRED:     'bg-slate-200 text-slate-700',
}

const FINAL_STATUS_LABEL: Record<string, string> = {
  ACCEPTED:    'Prihvaćeno',
  REJECTED:    'Odbijeno',
  DEACTIVATED: 'Povučeno',
  EXPIRED:     'Isteklo',
}

const ACTION_STYLE: Record<string, string> = {
  CREATED:  'bg-blue-100 text-blue-800',
  COUNTER:  'bg-amber-100 text-amber-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  DECLINED: 'bg-red-100 text-red-800',
  EXPIRED:  'bg-slate-200 text-slate-700',
}

const ACTION_LABEL: Record<string, string> = {
  CREATED:  'Kreiranje',
  COUNTER:  'Kontraponuda',
  ACCEPTED: 'Prihvatanje',
  DECLINED: 'Odbijanje',
  EXPIRED:  'Isteklo',
}

// ─── History entry row ────────────────────────────────────────────────────────

function HistoryEntryRow({ entry, myId }: { entry: OTCHistoryEntry; myId: number }) {
  const isMe = entry.changedBy === myId
  const hasValues = entry.amount != null || entry.pricePerStock != null || entry.premium != null || entry.settlementDate != null
  const hasOldValues = entry.oldAmount != null || entry.oldPricePerStock != null || entry.oldPremium != null || entry.oldSettlementDate != null

  return (
    <div className="flex gap-3">
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div className={`h-3 w-3 rounded-full mt-1 flex-shrink-0 ${ACTION_STYLE[entry.action]?.replace('bg-', 'bg-').replace('text-', 'border-2 border-')}`} />
        <div className="w-px flex-1 bg-gray-200 my-1" />
      </div>

      {/* Content */}
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_STYLE[entry.action] ?? 'bg-gray-100 text-gray-700'}`}>
            {ACTION_LABEL[entry.action] ?? entry.action}
          </span>
          <span className="text-xs text-gray-500">
            {entry.changedBy === 0 ? 'Sistem' : isMe ? 'Vi' : `Korisnik #${entry.changedBy}`} · {fmtDateTime(entry.createdAt)}
          </span>
          {entry.newStatus && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${FINAL_STATUS_STYLE[entry.newStatus] ?? 'bg-gray-100 text-gray-700'}`}>
              → {FINAL_STATUS_LABEL[entry.newStatus] ?? entry.newStatus}
            </span>
          )}
        </div>

        {/* Values comparison */}
        {hasValues && (
          <div className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 space-y-1">
            {hasOldValues && (
              <div className="grid grid-cols-4 gap-2 text-gray-400 line-through">
                <span>Kol: {entry.oldAmount ?? '—'}</span>
                <span>Cena: {fmt2(entry.oldPricePerStock)}</span>
                <span>Premija: {fmt2(entry.oldPremium)}</span>
                <span>Settlement: {fmtDate(entry.oldSettlementDate)}</span>
              </div>
            )}
            <div className={`grid grid-cols-4 gap-2 ${hasOldValues ? 'text-gray-800 font-medium' : 'text-gray-700'}`}>
              <span>Kol: {entry.amount ?? '—'}</span>
              <span>Cena: {fmt2(entry.pricePerStock)}</span>
              <span>Premija: {fmt2(entry.premium)}</span>
              <span>Settlement: {fmtDate(entry.settlementDate)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Negotiation card ─────────────────────────────────────────────────────────

function NegotiationCard({ neg, myId }: { neg: NegotiationSummary; myId: number }) {
  const [expanded, setExpanded] = useState(false)
  const isBuyer = neg.buyerId === myId
  const counterpart = isBuyer ? `Prodavac #${neg.sellerId}` : `Kupac #${neg.buyerId}`

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      {/* Summary row */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-gray-900">{neg.ticker || `Listing #${neg.listingId}`}</span>
            {neg.stockName && neg.stockName !== neg.ticker && (
              <span className="text-xs text-gray-400">{neg.stockName}</span>
            )}
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${FINAL_STATUS_STYLE[neg.finalStatus] ?? 'bg-gray-100 text-gray-700'}`}>
              {FINAL_STATUS_LABEL[neg.finalStatus] ?? neg.finalStatus}
            </span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${isBuyer ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
              {isBuyer ? 'Kupac' : 'Prodavac'}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {counterpart} · {neg.history.length} korak(a) · Završeno: {fmtDateTime(neg.lastModified)}
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
      </button>

      {/* History timeline */}
      {expanded && (
        <div className="px-4 pt-2 pb-1 border-t border-gray-100">
          {neg.history.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nema sačuvane istorije za ovu ponudu.</p>
          ) : (
            <div className="mt-2">
              {neg.history.map((entry) => (
                <HistoryEntryRow key={entry.id} entry={entry} myId={myId} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OTCNegotiationHistoryPage() {
  const { user } = useAuthStore()
  const myId = Number(user?.id ?? 0)

  const [loading, setLoading] = useState(true)
  const [negotiations, setNegotiations] = useState<NegotiationSummary[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [filterStatus, setFilterStatus] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterCounterpart, setFilterCounterpart] = useState('')

  const [appliedFilter, setAppliedFilter] = useState<HistoryFilter>({})

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getNegotiationHistory(appliedFilter)
      .then(data => { if (!cancelled) setNegotiations(data) })
      .catch(() => { if (!cancelled) toast.error('Greška pri učitavanju istorije pregovora.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [appliedFilter])

  function applyFilters() {
    const f: HistoryFilter = {}
    if (filterStatus) f.status = filterStatus
    if (filterFrom) f.from = filterFrom
    if (filterTo) f.to = filterTo
    const cp = parseInt(filterCounterpart, 10)
    if (!isNaN(cp) && cp > 0) f.counterpartId = cp
    setAppliedFilter(f)
  }

  function resetFilters() {
    setFilterStatus('')
    setFilterFrom('')
    setFilterTo('')
    setFilterCounterpart('')
    setAppliedFilter({})
  }

  const hasActiveFilters = Object.keys(appliedFilter).length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <History className="h-6 w-6 text-primary-600" />
            Istorija pregovora
          </h1>
          <p className="text-sm text-gray-500 mt-1">Završeni OTC pregovori — prihvaćeni, odbijeni i povučeni</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Filter className="h-4 w-4" />}
          onClick={() => setFiltersOpen(o => !o)}
        >
          Filteri {hasActiveFilters && <span className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary-600 text-white text-[10px] font-bold">{Object.keys(appliedFilter).length}</span>}
        </Button>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="bg-white rounded-xl shadow p-4 space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
              >
                <option value="">Svi</option>
                <option value="ACCEPTED">Prihvaćeno</option>
                <option value="REJECTED">Odbijeno</option>
                <option value="DEACTIVATED">Povučeno</option>
                <option value="EXPIRED">Isteklo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Od datuma</label>
              <input
                type="date"
                value={filterFrom}
                onChange={e => setFilterFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Do datuma</label>
              <input
                type="date"
                value={filterTo}
                onChange={e => setFilterTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">ID druge strane</label>
              <input
                type="number"
                min={1}
                placeholder="npr. 42"
                value={filterCounterpart}
                onChange={e => setFilterCounterpart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={resetFilters}>Poništi</Button>
            <Button variant="primary" size="sm" onClick={applyFilters}>Primeni</Button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : negotiations.length === 0 ? (
        <div className="bg-white rounded-xl shadow text-center py-20 text-gray-400">
          <History className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">
            {hasActiveFilters ? 'Nema pregovora koji odgovaraju filterima.' : 'Nemate završenih pregovora.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {negotiations.map(neg => (
            <NegotiationCard key={neg.offerId} neg={neg} myId={myId} />
          ))}
        </div>
      )}
    </div>
  )
}
