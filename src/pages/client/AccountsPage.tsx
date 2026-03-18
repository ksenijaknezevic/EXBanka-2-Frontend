import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react'
import { getClientAccounts, getAccountTransactions } from '@/services/bankaService'
import type { AccountListItem, Transakcija } from '@/types'

type SortBy = 'date' | 'type'
type SortOrder = 'asc' | 'desc'

function formatAmount(amount: number, oznaka: string): string {
  return `${amount.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${oznaka}`
}

function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('sr-RS', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

function tipLabel(tip: string): string {
  switch (tip) {
    case 'UPLATA':           return 'Uplata'
    case 'ISPLATA':          return 'Isplata'
    case 'INTERNI_TRANSFER': return 'Interni prenos'
    default:                 return tip
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'IZVRSEN':   return 'text-green-600'
    case 'CEKANJE':   return 'text-yellow-600'
    case 'STORNIRAN': return 'text-red-500'
    default:          return 'text-gray-500'
  }
}

export default function AccountsPage() {
  const navigate = useNavigate()

  const [accounts, setAccounts] = useState<AccountListItem[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [accountsError, setAccountsError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Transakcija[]>([])
  const [loadingTx, setLoadingTx] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)

  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  useEffect(() => {
    setLoadingAccounts(true)
    getClientAccounts()
      .then((data) => {
        const sorted = [...data].sort((a, b) => b.raspolozivo_stanje - a.raspolozivo_stanje)
        setAccounts(sorted)
        if (sorted.length > 0) setSelectedId(sorted[0].id)
      })
      .catch((err: Error) => setAccountsError(err.message))
      .finally(() => setLoadingAccounts(false))
  }, [])

  const loadTransactions = useCallback(() => {
    if (!selectedId) return
    setLoadingTx(true)
    setTxError(null)
    getAccountTransactions(selectedId, { sort_by: sortBy, order: sortOrder })
      .then(setTransactions)
      .catch((err: Error) => setTxError(err.message))
      .finally(() => setLoadingTx(false))
  }, [selectedId, sortBy, sortOrder])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const selectedAccount = accounts.find((a) => a.id === selectedId) ?? null

  const sortedTransactions = useMemo(() => {
    if (!transactions.length) return transactions
    return [...transactions].sort((a, b) => {
      if (sortBy === 'date') {
        const diff = new Date(a.vreme_izvrsavanja).getTime() - new Date(b.vreme_izvrsavanja).getTime()
        return sortOrder === 'asc' ? diff : -diff
      } else {
        const diff = a.tip_transakcije.localeCompare(b.tip_transakcije)
        return sortOrder === 'asc' ? diff : -diff
      }
    })
  }, [transactions, sortBy, sortOrder])

  function toggleSortOrder() {
    setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
  }

  function SortIcon({ active }: { active: boolean }) {
    if (!active) return <ArrowUpDown className="h-4 w-4 text-gray-400" />
    return sortOrder === 'asc'
      ? <ChevronUp className="h-4 w-4 text-primary-600" />
      : <ChevronDown className="h-4 w-4 text-primary-600" />
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Moji računi</h1>

      {accountsError && (
        <div className="card bg-red-50 text-red-700 text-sm">{accountsError}</div>
      )}

      {loadingAccounts ? (
        <div className="card text-center py-10 text-gray-400">Učitavanje računa…</div>
      ) : accounts.length === 0 ? (
        <div className="card text-center py-10 text-gray-500">Nemate aktivnih računa.</div>
      ) : (
        <div className="flex gap-6 items-start">
          {/* ── Account list (left panel) ─────────────────────────── */}
          <div className="w-72 shrink-0 space-y-3">
            {accounts.map((acc) => (
              <div key={acc.id} className="relative">
                <button
                  onClick={() => setSelectedId(acc.id)}
                  className={[
                    'w-full text-left rounded-xl border p-4 transition-colors',
                    acc.id === selectedId
                      ? 'border-primary-500 bg-primary-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-primary-500 shrink-0" />
                    <span className="text-xs font-medium text-gray-500 truncate">{acc.broj_racuna}</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm mb-1 truncate">{acc.naziv_racuna}</p>
                  <p className="text-lg font-bold text-primary-700">
                    {formatAmount(acc.raspolozivo_stanje, acc.valuta_oznaka)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {acc.kategorija_racuna === 'TEKUCI' ? 'Tekući' : 'Devizni'} ·{' '}
                    {acc.vrsta_racuna === 'LICNI' ? 'Lični' : 'Poslovni'} ·{' '}
                    {acc.valuta_oznaka}
                  </p>
                </button>
                <button
                  onClick={() => navigate(`/client/accounts/${acc.id}`)}
                  className="absolute top-3 right-3 text-xs text-primary-600 hover:text-primary-800 font-medium"
                >
                  Detalji
                </button>
              </div>
            ))}
          </div>

          {/* ── Right panel ──────────────────────────────────────── */}
          <div className="flex-1 space-y-4 min-w-0">
            {selectedAccount && (
              <>
                {/* Account summary */}
                <div className="card">
                  <div className="mb-4">
                    <h2 className="text-lg font-bold text-gray-900">{selectedAccount.naziv_racuna}</h2>
                    <p className="text-sm text-gray-500">{selectedAccount.broj_racuna}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Stanje računa</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatAmount(selectedAccount.stanje_racuna, selectedAccount.valuta_oznaka)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Raspoloživo</p>
                      <p className="text-xl font-bold text-primary-700">
                        {formatAmount(selectedAccount.raspolozivo_stanje, selectedAccount.valuta_oznaka)}
                      </p>
                    </div>
                    {selectedAccount.rezervisana_sredstva > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Rezervisano</p>
                        <p className="text-base font-semibold text-yellow-600">
                          {formatAmount(selectedAccount.rezervisana_sredstva, selectedAccount.valuta_oznaka)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transactions */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-900">Transakcije</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (sortBy === 'date') toggleSortOrder()
                          else { setSortBy('date'); setSortOrder('desc') }
                        }}
                        className={[
                          'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors',
                          sortBy === 'date'
                            ? 'border-primary-400 bg-primary-50 text-primary-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300',
                        ].join(' ')}
                      >
                        Datum
                        <SortIcon active={sortBy === 'date'} />
                      </button>
                      <button
                        onClick={() => {
                          if (sortBy === 'type') toggleSortOrder()
                          else { setSortBy('type'); setSortOrder('asc') }
                        }}
                        className={[
                          'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors',
                          sortBy === 'type'
                            ? 'border-primary-400 bg-primary-50 text-primary-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300',
                        ].join(' ')}
                      >
                        Tip
                        <SortIcon active={sortBy === 'type'} />
                      </button>
                    </div>
                  </div>

                  {txError && <p className="text-sm text-red-600 mb-3">{txError}</p>}

                  {loadingTx ? (
                    <p className="text-sm text-gray-400 text-center py-6">Učitavanje transakcija…</p>
                  ) : transactions.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">Nema transakcija za ovaj račun.</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {sortedTransactions.map((tx) => (
                        <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{tipLabel(tx.tip_transakcije)}</span>
                              <span className={`text-xs font-medium ${statusColor(tx.status)}`}>{tx.status}</span>
                            </div>
                            {tx.opis && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate">{tx.opis}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.vreme_izvrsavanja)}</p>
                          </div>
                          <span
                            className={[
                              'text-sm font-bold shrink-0',
                              tx.tip_transakcije === 'UPLATA' ? 'text-green-600' : 'text-red-500',
                            ].join(' ')}
                          >
                            {tx.tip_transakcije === 'UPLATA' ? '+' : '-'}
                            {formatAmount(tx.iznos, selectedAccount.valuta_oznaka)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
