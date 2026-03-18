import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, Clock, XCircle, Filter, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { getPaymentHistory, getPaymentDetail } from '@/services/paymentService'
import Dialog from '@/components/common/Dialog'
import type { PaymentIntent, PaymentHistoryFilter } from '@/types'
import { downloadPaymentReceipt } from '@/utils/pdfReceipt'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency: string) {
  return `${amount.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('sr-RS', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'REALIZOVANO':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="h-3 w-3" /> Realizovano
        </span>
      )
    case 'U_OBRADI':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">
          <Clock className="h-3 w-3" /> U obradi
        </span>
      )
    case 'ODBIJENO':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
          <XCircle className="h-3 w-3" /> Odbijeno
        </span>
      )
    default:
      return <span className="text-xs text-gray-500">{status}</span>
  }
}

function tipLabel(tip: string): string {
  return tip === 'PRENOS' ? 'Interni prenos' : 'Plaćanje'
}

// ─── FieldRow ─────────────────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 sm:w-44 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium text-gray-900 break-all">{value}</span>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PregledPlacanja() {
  const [payments, setPayments] = useState<PaymentIntent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [showFilters, setShowFilters] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterMinIznos, setFilterMinIznos] = useState('')
  const [filterMaxIznos, setFilterMaxIznos] = useState('')

  // Detail dialog
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<PaymentIntent | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)

  const loadPayments = useCallback(() => {
    setLoading(true)
    setError(null)

    const filter: PaymentHistoryFilter = {}
    if (filterStatus) filter.status = filterStatus
    if (filterDateFrom) filter.date_from = new Date(filterDateFrom).toISOString()
    if (filterDateTo) filter.date_to = new Date(filterDateTo + 'T23:59:59').toISOString()
    if (filterMinIznos) filter.min_iznos = parseFloat(filterMinIznos)
    if (filterMaxIznos) filter.max_iznos = parseFloat(filterMaxIznos)

    getPaymentHistory(filter)
      .then(setPayments)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [filterStatus, filterDateFrom, filterDateTo, filterMinIznos, filterMaxIznos])

  useEffect(() => {
    loadPayments()
  }, [loadPayments])

  function openDetail(id: string) {
    setSelectedId(id)
    setDetail(null)
    setDetailError(null)
    setDetailLoading(true)
    getPaymentDetail(id)
      .then(setDetail)
      .catch((err: Error) => setDetailError(err.message))
      .finally(() => setDetailLoading(false))
  }

  function clearFilters() {
    setFilterStatus('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterMinIznos('')
    setFilterMaxIznos('')
  }

  const hasActiveFilters = filterStatus || filterDateFrom || filterDateTo || filterMinIznos || filterMaxIznos

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pregled plaćanja</h1>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={[
            'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors',
            showFilters || hasActiveFilters
              ? 'border-primary-400 bg-primary-50 text-primary-700'
              : 'border-gray-200 text-gray-600 hover:border-gray-300',
          ].join(' ')}
        >
          <Filter className="h-4 w-4" />
          Filteri
          {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {hasActiveFilters && (
            <span className="ml-1 h-2 w-2 rounded-full bg-primary-500" />
          )}
        </button>
      </div>

      {/* ── Filters panel ──────────────────────────────────────────────────── */}
      {showFilters && (
        <div className="card space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input w-full text-sm">
                <option value="">Svi statusi</option>
                <option value="REALIZOVANO">Realizovano</option>
                <option value="U_OBRADI">U obradi</option>
                <option value="ODBIJENO">Odbijeno</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Od datuma</label>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="input w-full text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Do datuma</label>
              <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="input w-full text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Min iznos</label>
              <input type="number" step="0.01" min="0" value={filterMinIznos} onChange={(e) => setFilterMinIznos(e.target.value)} className="input w-full text-sm" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max iznos</label>
              <input type="number" step="0.01" min="0" value={filterMaxIznos} onChange={(e) => setFilterMaxIznos(e.target.value)} className="input w-full text-sm" placeholder="0.00" />
            </div>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-gray-800 underline">
              Obriši sve filtere
            </button>
          )}
        </div>
      )}

      {/* ── Payment list ───────────────────────────────────────────────────── */}
      {error && <div className="card bg-red-50 text-red-700 text-sm">{error}</div>}

      {loading ? (
        <div className="card text-center py-10 text-gray-400">Učitavanje…</div>
      ) : payments.length === 0 ? (
        <div className="card text-center py-10 text-gray-500 text-sm">
          {hasActiveFilters ? 'Nema naloga koji odgovaraju zadatim filterima.' : 'Nemate nijedan nalog plaćanja.'}
        </div>
      ) : (
        <div className="card divide-y divide-gray-100 p-0">
          {payments.map((p) => (
            <button
              key={p.id}
              onClick={() => openDetail(p.id)}
              className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400">{tipLabel(p.tip_transakcije)}</span>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-sm font-semibold text-gray-900 mt-1 truncate">{p.naziv_primaoca}</p>
                <p className="text-xs font-mono text-gray-400 mt-0.5">{p.broj_racuna_primaoca}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(p.created_at)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-gray-900">{formatAmount(p.iznos, p.valuta)}</p>
                {p.svrha_placanja && (
                  <p className="text-xs text-gray-400 mt-0.5 max-w-[140px] truncate">{p.svrha_placanja}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Detail dialog ──────────────────────────────────────────────────── */}
      <Dialog
        open={!!selectedId}
        onClose={() => { setSelectedId(null); setDetail(null) }}
        title="Detalji naloga"
        maxWidth="md"
      >
        {detailLoading && <p className="text-sm text-gray-400 text-center py-6">Učitavanje…</p>}
        {detailError && <p className="text-sm text-red-600">{detailError}</p>}
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <StatusBadge status={detail.status} />
              <span className="text-xs text-gray-400">{tipLabel(detail.tip_transakcije)}</span>
            </div>

            <div>
              <FieldRow label="Broj naloga" value={<span className="font-mono">{detail.broj_naloga}</span>} />
              <FieldRow label="Datum kreiranja" value={formatDate(detail.created_at)} />
              {detail.executed_at && <FieldRow label="Datum izvršenja" value={formatDate(detail.executed_at)} />}
              <FieldRow label="Račun platioca" value={<span className="font-mono">{detail.broj_racuna_platioca}</span>} />
              <FieldRow label="Primalac" value={detail.naziv_primaoca} />
              <FieldRow label="Račun primaoca" value={<span className="font-mono">{detail.broj_racuna_primaoca}</span>} />
              <FieldRow label="Iznos" value={<span className="text-primary-700 font-bold">{formatAmount(detail.iznos, detail.valuta)}</span>} />
              {detail.provizija > 0 && <FieldRow label="Provizija" value={formatAmount(detail.provizija, detail.valuta)} />}
              {detail.krajnji_iznos > 0 && <FieldRow label="Ukupno zaduženo" value={formatAmount(detail.krajnji_iznos, detail.valuta)} />}
              {detail.sifra_placanja && <FieldRow label="Šifra plaćanja" value={detail.sifra_placanja} />}
              {detail.poziv_na_broj && <FieldRow label="Poziv na broj" value={detail.poziv_na_broj} />}
              {detail.svrha_placanja && <FieldRow label="Svrha plaćanja" value={detail.svrha_placanja} />}
              {detail.failed_reason && (
                <FieldRow label="Razlog odbijanja" value={<span className="text-red-600">{detail.failed_reason}</span>} />
              )}
            </div>

            {detail.status === 'REALIZOVANO' && (
              <button
                onClick={() => downloadPaymentReceipt(detail)}
                className="btn btn-secondary flex items-center gap-1.5 text-sm w-full justify-center"
              >
                <Download className="h-4 w-4" /> Štampaj potvrdu
              </button>
            )}
          </div>
        )}
      </Dialog>
    </div>
  )
}
