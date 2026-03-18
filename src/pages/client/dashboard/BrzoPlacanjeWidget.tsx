import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { getClientAccounts } from '@/services/bankaService'
import { getPaymentRecipients } from '@/services/paymentService'
import type { AccountListItem, PaymentRecipient } from '@/types'

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

// Simple deterministic color from name
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function BrzoPlacanjeWidget() {
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)

  const [accounts, setAccounts] = useState<AccountListItem[]>([])
  const [recipients, setRecipients] = useState<PaymentRecipient[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getClientAccounts(), getPaymentRecipients()])
      .then(([accs, recs]) => {
        setAccounts(accs)
        setRecipients(recs)
        if (accs.length > 0) setSelectedAccountId(accs[0].id)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function handleRecipientClick(r: PaymentRecipient) {
    navigate('/client/payments/new', {
      state: {
        recipientId: r.id,
        recipientName: r.naziv,
        recipientAccount: r.broj_racuna,
        payerAccountId: selectedAccountId,
      },
    })
  }

  return (
    <div className="card flex flex-col">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-base font-semibold text-gray-900">Brzo plaćanje</h2>

        {/* Account selector */}
        {!loading && accounts.length > 0 && (
          <div className="relative">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.naziv_racuna} ({a.valuta_oznaka})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="flex-1 flex flex-col min-h-0">
        {loading ? (
          <div className="flex gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                <div className="h-12 w-12 rounded-full bg-gray-200" />
                <div className="h-3 w-14 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : recipients.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-gray-500">Nemate sačuvanih primalaca.</p>
            <button
              onClick={() => navigate('/client/payments/recipients')}
              className="text-xs text-primary-600 hover:text-primary-800 font-medium"
            >
              Dodaj primaoca
            </button>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-2 scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {recipients.map((r) => (
              <button
                key={r.id}
                onClick={() => handleRecipientClick(r)}
                className="flex flex-col items-center gap-2 group shrink-0"
                title={`Plati ${r.naziv}`}
              >
                <div
                  className={[
                    'h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold',
                    'ring-2 ring-transparent group-hover:ring-primary-300 transition-all',
                    avatarColor(r.naziv),
                  ].join(' ')}
                >
                  {getInitials(r.naziv)}
                </div>
                <span className="text-xs text-gray-600 text-center max-w-[64px] truncate leading-tight">
                  {r.naziv}
                </span>
              </button>
            ))}

            {/* New payment button */}
            <button
              onClick={() => navigate('/client/payments/new')}
              className="flex flex-col items-center gap-2 shrink-0 group"
              title="Novo plaćanje"
            >
              <div className="h-12 w-12 rounded-full flex items-center justify-center text-xl font-light text-gray-400 border-2 border-dashed border-gray-300 group-hover:border-primary-400 group-hover:text-primary-500 transition-colors">
                +
              </div>
              <span className="text-xs text-gray-400 leading-tight">Novo</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
