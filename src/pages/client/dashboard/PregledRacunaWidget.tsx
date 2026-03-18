import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getClientAccounts } from '@/services/bankaService'
import type { AccountListItem } from '@/types'

function formatAmount(amount: number, oznaka: string): string {
  return `${amount.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${oznaka}`
}

function kategorijaLabel(k: string): string {
  return k === 'TEKUCI' ? 'Tekući' : k === 'DEVIZNI' ? 'Devizni' : k
}

function vrstaLabel(v: string): string {
  return v === 'LICNI' ? 'Lični' : v === 'POSLOVNI' ? 'Poslovni' : v
}

// Skeleton card
function SkeletonCard() {
  return (
    <div className="flex-1 min-w-[220px] bg-white rounded-2xl border border-gray-200 p-5 animate-pulse space-y-3">
      <div className="h-3 bg-gray-200 rounded w-1/3" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
      <div className="h-7 bg-gray-200 rounded w-1/2 mt-2" />
      <div className="h-3 bg-gray-200 rounded w-1/4" />
    </div>
  )
}

export default function PregledRacunaWidget() {
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)

  const [accounts, setAccounts] = useState<AccountListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getClientAccounts()
      .then(setAccounts)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function scrollBy(delta: number) {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' })
  }

  return (
    <div className="card flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-gray-900">Pregled računa i raspoloživo</h2>
        {accounts.length > 0 && (
          <button
            onClick={() => navigate('/client/accounts')}
            className="text-xs text-primary-600 hover:text-primary-800 font-medium"
          >
            Svi računi
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-3">{error}</p>
      )}

      <div className="flex-1 flex flex-col min-h-0 justify-center">
        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center my-auto">Nemate aktivnih računa.</p>
        ) : (
          <div className="relative">
            {/* Left arrow */}
            {accounts.length > 1 && (
              <button
                onClick={() => scrollBy(-300)}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 h-8 w-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
            )}

            {/* Scrollable container */}
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto pb-2 scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => navigate(`/client/accounts/${acc.id}`)}
                  className="flex-1 min-w-[220px] text-left rounded-2xl border border-gray-200 bg-gradient-to-br from-primary-700 to-primary-900 text-white p-5 hover:from-primary-600 hover:to-primary-800 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-primary-200">
                      {kategorijaLabel(acc.kategorija_racuna)} · {vrstaLabel(acc.vrsta_racuna)}
                    </span>
                    <span className="text-xs font-bold text-primary-200">{acc.valuta_oznaka}</span>
                  </div>

                  <p className="text-xs font-mono text-primary-300 mb-1 tracking-wider">
                    {acc.broj_racuna}
                  </p>

                  <p className="text-lg font-bold truncate mb-0.5">
                    {acc.naziv_racuna}
                  </p>

                  <div className="mt-3 pt-3 border-t border-primary-600">
                    <p className="text-xs text-primary-300 mb-0.5">Raspoloživo</p>
                    <p className="text-xl font-bold">
                      {formatAmount(acc.raspolozivo_stanje, acc.valuta_oznaka)}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Right arrow */}
            {accounts.length > 1 && (
              <button
                onClick={() => scrollBy(300)}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 h-8 w-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
