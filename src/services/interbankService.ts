/**
 * interbankService.ts — frontend klijent za si-tx-proto modul (međubankarska
 * komunikacija). Komunicira ka bank-service-u kroz JWT-zaštićene endpoint-e:
 *
 *   POST   /bank/interbank/payments
 *   GET    /bank/interbank/public-stocks
 *   POST   /bank/interbank/negotiations
 *   GET    /bank/interbank/negotiations/{routing}/{id}
 *   PUT    /bank/interbank/negotiations/{routing}/{id}
 *   DELETE /bank/interbank/negotiations/{routing}/{id}
 *   POST   /bank/interbank/negotiations/{routing}/{id}/accept
 *   GET    /bank/interbank/contracts
 *   POST   /bank/interbank/contracts/{routing}/{id}/exercise
 */

import { apiGet, apiPost, apiPut, apiDelete } from './grpcClient'

// ─── Tipovi ───────────────────────────────────────────────────────────────────

export interface ForeignBankId {
  routingNumber: number
  id: string
}

export interface MonetaryValue {
  currency: string
  amount: number
}

export interface PublicStockSeller {
  seller: ForeignBankId
  amount: number
}

export interface PublicStock {
  stock: { ticker: string }
  sellers: PublicStockSeller[]
}

export interface PublicStocksDTO {
  local: PublicStock[]
  remote: PublicStock[]
}

export interface OtcOffer {
  stock: { ticker: string }
  settlementDate: string
  pricePerUnit: MonetaryValue
  premium: MonetaryValue
  buyerId: ForeignBankId
  sellerId: ForeignBankId
  amount: number
  lastModifiedBy: ForeignBankId
}

export interface OtcNegotiation extends OtcOffer {
  isOngoing: boolean
}

// OTC pregovor u kojem je naša banka strana (kupac ILI prodavac). Vraća GET /negotiations.
export interface IncomingNegotiation {
  negotiationId: ForeignBankId
  ticker: string
  amount: number
  pricePerUnit: MonetaryValue
  premium: MonetaryValue
  settlementDate: string
  buyer: ForeignBankId
  seller: ForeignBankId
  status: string
  isOngoing: boolean
  lastModifiedBy: ForeignBankId
  myTurn: boolean
  myRole?: 'BUYER' | 'SELLER' // uloga NAŠE banke: BUYER (mi kupac) | SELLER (mi prodavac)
}

export interface InterbankPaymentResult {
  interbankTxId: number
  transactionRoutingNumber: number
  transactionForeignId: string
  status: string
  failureReason?: string
}

export interface InterbankOptionContract {
  ID: number
  NegotiationRoutingNumber: number
  NegotiationForeignID: string
  StockTicker: string
  PriceCurrency: string
  PriceAmount: string
  PremiumCurrency: string
  PremiumAmount: string
  SettlementDate: string
  Amount: number
  BuyerRoutingNumber: number
  BuyerID: string
  SellerRoutingNumber: number
  SellerID: string
  Status: string
  UsedAt?: string | null
  CreatedAt: string
  UpdatedAt: string
}

// ─── Plaćanje ────────────────────────────────────────────────────────────────

export interface CreateInterbankPaymentParams {
  senderAccountId: number
  recipientAccountNumber: string
  recipientName: string
  amount: number
  currency: string
  paymentCode: string
  paymentPurpose: string
  callNumber?: string
  message?: string
}

export async function createInterbankPayment(
  params: CreateInterbankPaymentParams
): Promise<InterbankPaymentResult> {
  return apiPost<CreateInterbankPaymentParams, InterbankPaymentResult>(
    '/bank/interbank/payments',
    params
  )
}

// ─── Public stocks ───────────────────────────────────────────────────────────

export async function getPublicStocks(): Promise<PublicStocksDTO> {
  return apiGet<PublicStocksDTO>('/bank/interbank/public-stocks')
}

// ─── Negotiations ────────────────────────────────────────────────────────────

export interface CreateNegotiationParams {
  ticker: string
  settlementDate: string
  priceCurrency: string
  priceAmount: number
  premiumCurrency: string
  premiumAmount: number
  buyerRoutingNumber?: number
  buyerId?: string
  sellerRoutingNumber: number
  sellerId: string
  amount: number
}

export async function createNegotiation(params: CreateNegotiationParams): Promise<ForeignBankId> {
  return apiPost<CreateNegotiationParams, ForeignBankId>(
    '/bank/interbank/negotiations',
    params
  )
}

// listIncomingNegotiations — dolazne OTC ponude koje mi hostujemo (mi = prodavac).
// CLIENT dobija samo svoje; AGENT/SUPERVISOR sve (filter je na backendu po JWT-u).
export async function listIncomingNegotiations(): Promise<IncomingNegotiation[]> {
  return apiGet<IncomingNegotiation[]>('/bank/interbank/negotiations')
}

export async function getNegotiation(routing: number, id: string): Promise<OtcNegotiation> {
  return apiGet<OtcNegotiation>(
    `/bank/interbank/negotiations/${routing}/${encodeURIComponent(id)}`
  )
}

export async function counterNegotiation(
  routing: number,
  id: string,
  params: CreateNegotiationParams
): Promise<void> {
  await apiPut<CreateNegotiationParams, unknown>(
    `/bank/interbank/negotiations/${routing}/${encodeURIComponent(id)}`,
    params
  )
}

export async function cancelNegotiation(routing: number, id: string): Promise<void> {
  await apiDelete<unknown>(
    `/bank/interbank/negotiations/${routing}/${encodeURIComponent(id)}`
  )
}

export async function acceptNegotiation(routing: number, id: string): Promise<void> {
  await apiPost<Record<string, never>, unknown>(
    `/bank/interbank/negotiations/${routing}/${encodeURIComponent(id)}/accept`,
    {}
  )
}

// ─── Contracts ───────────────────────────────────────────────────────────────

export async function listInterbankContracts(): Promise<InterbankOptionContract[]> {
  return apiGet<InterbankOptionContract[]>('/bank/interbank/contracts')
}

export async function exerciseInterbankContract(
  routing: number,
  id: string
): Promise<{ interbankTxId: number; status: string }> {
  return apiPost<Record<string, never>, { interbankTxId: number; status: string }>(
    `/bank/interbank/contracts/${routing}/${encodeURIComponent(id)}/exercise`,
    {}
  )
}
