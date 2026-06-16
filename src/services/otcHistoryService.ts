import { useAuthStore } from '@/store/authStore'

export interface OTCHistoryEntry {
  id: number
  action: 'CREATED' | 'COUNTER' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'
  changedBy: number
  amount?: number
  pricePerStock?: number
  premium?: number
  settlementDate?: string
  oldAmount?: number
  oldPricePerStock?: number
  oldPremium?: number
  oldSettlementDate?: string
  newStatus?: string
  createdAt: string
}

export interface NegotiationSummary {
  offerId: number
  listingId: number
  ticker: string
  stockName: string
  buyerId: number
  sellerId: number
  finalStatus: 'ACCEPTED' | 'REJECTED' | 'DEACTIVATED' | 'EXPIRED'
  createdAt: string
  lastModified: string
  history: OTCHistoryEntry[]
}

export interface HistoryFilter {
  status?: string
  from?: string
  to?: string
  counterpartId?: number
}

const RUNTIME_BASE =
  (typeof window !== 'undefined' && window.__APP_CONFIG__?.API_BASE_URL) ||
  (import.meta.env as Record<string, string | undefined>).VITE_API_BASE_URL ||
  ''
const API_BASE = RUNTIME_BASE.replace(/\/api\/?$/, '')

async function apiFetch<T>(path: string): Promise<T> {
  const { accessToken } = useAuthStore.getState()
  const res = await fetch(`${API_BASE}${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? res.statusText)
  }
  return res.json() as Promise<T>
}

export async function getNegotiationHistory(filter: HistoryFilter = {}): Promise<NegotiationSummary[]> {
  const q = new URLSearchParams()
  if (filter.status) q.set('status', filter.status)
  if (filter.from) q.set('from', filter.from)
  if (filter.to) q.set('to', filter.to)
  if (filter.counterpartId != null) q.set('counterpartId', String(filter.counterpartId))
  const qs = q.toString()
  const path = qs ? `/api/otc/history?${qs}` : '/api/otc/history'
  const res = await apiFetch<{ negotiations: NegotiationSummary[] }>(path)
  return res.negotiations ?? []
}
