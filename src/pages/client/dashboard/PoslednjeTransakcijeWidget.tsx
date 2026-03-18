import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Clock, ChevronDown } from 'lucide-react'
import { getClientAccounts, getAccountTransactions } from '@/services/bankaService'
import type { AccountListItem, Transakcija } from '@/types'

function formatAmount(amount: number): string {
  return amount.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('sr-RS', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function primalacPosaljalac(tx: Transakcija): string {
  // opis field holds sender/recipient info when available
  return tx.opis || '—'
}

function isInflow(tx: Transakcija): boolean {
  return tx.tip_transakcije === 'UPLATA'
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'IZVRSEN':
      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
    case 'STORNIRAN':
      return <XCircle className="h-4 w-4 text-red-500 shrink-0" />
    default:
      return <Clock className="h-4 w-4 text-yellow-500 shrink-0" />
  }
}

export default function PoslednjeTransakcijeWidget() {
  const [accounts, setAccounts] = useState<AccountListItem[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [transactions, setTransactions] = useState<Transakcija[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingTx, setLoadingTx] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load accounts
  useEffect(() => {
    getClientAccounts()
      .then((data) => {
        setAccounts(data)
        if (data.length > 0) setSelectedId(data[0].id)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoadingAccounts(false))
  }, [])

  // Load transactions when account changes
  const loadTx = useCallback(() => {
    if (!selectedId) return
    setLoadingTx(true)
    getAccountTransactions(selectedId, { sort_by: 'date', order: 'desc' })
      .then((data) => setTransactions(data.slice(0, 10)))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoadingTx(false))
  }, [selectedId])

  useEffect(() => {
    loadTx()
  }, [loadTx])

  const selectedAccount = accounts.find((a) => a.id === selectedId)

  return (
    <div className="card flex flex-col">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-base font-semibold text-gray-900">Poslednje transakcije</h2>

        {/* Account selector */}
        {!loadingAccounts && accounts.length > 0 && (
          <div className="relative">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
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
        {loadingAccounts || loadingTx ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between animate-pulse">
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
                <div className="h-4 bg-gray-200 rounded w-20" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-500 text-center">
              {accounts.length === 0
                ? 'Nemate aktivnih računa.'
                : 'Nema transakcija za ovaj račun.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 whitespace-nowrap">Datum i vreme</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500">Primalac / Pošiljalac</th>
                  <th className="text-right py-2 pr-4 text-xs font-medium text-gray-500">Iznos</th>
                  <th className="text-center py-2 text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(tx.vreme_izvrsavanja)}
                    </td>
                    <td className="py-3 pr-4 text-xs text-gray-700 max-w-[180px]">
                      <span className="truncate block">{primalacPosaljalac(tx)}</span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <span
                        className={[
                          'text-sm font-semibold',
                          isInflow(tx) ? 'text-green-600' : 'text-red-500',
                        ].join(' ')}
                      >
                        {isInflow(tx) ? '+' : '−'}
                        {formatAmount(tx.iznos)} {selectedAccount?.valuta_oznaka ?? ''}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex justify-center">
                        <StatusIcon status={tx.status} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
