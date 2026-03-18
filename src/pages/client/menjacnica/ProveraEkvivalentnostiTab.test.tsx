import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ProveraEkvivalentnostiTab from './ProveraEkvivalentnostiTab'
import type { AccountListItem } from '@/types'

// ─── Service mocks ────────────────────────────────────────────────────────────

vi.mock('@/services/bankaService', () => ({
  getCurrencies: vi.fn().mockResolvedValue([]),
  getClientAccounts: vi.fn(),
  createExchangeTransferIntent: vi.fn(),
}))

vi.mock('@/services/paymentService', () => ({
  verifyAndExecutePayment: vi.fn(),
}))

import {
  getClientAccounts,
  createExchangeTransferIntent,
} from '@/services/bankaService'
import { verifyAndExecutePayment } from '@/services/paymentService'

const mockGetClientAccounts = vi.mocked(getClientAccounts)
const mockCreateExchangeTransferIntent = vi.mocked(createExchangeTransferIntent)
const mockVerifyAndExecutePayment = vi.mocked(verifyAndExecutePayment)

// ─── Test data ────────────────────────────────────────────────────────────────

const eurAccount: AccountListItem = {
  id: '1',
  broj_racuna: 'RS35123000000001',
  naziv_racuna: 'EUR Tekući',
  kategorija_racuna: 'DEVIZNI',
  vrsta_racuna: 'LICNI',
  valuta_oznaka: 'EUR',
  stanje_racuna: 1000,
  rezervisana_sredstva: 0,
  raspolozivo_stanje: 1000,
}

const rsdAccount: AccountListItem = {
  id: '2',
  broj_racuna: 'RS35123000000002',
  naziv_racuna: 'RSD Tekući',
  kategorija_racuna: 'TEKUCI',
  vrsta_racuna: 'LICNI',
  valuta_oznaka: 'RSD',
  stanje_racuna: 50000,
  rezervisana_sredstva: 0,
  raspolozivo_stanje: 50000,
}

const usdAccount: AccountListItem = {
  id: '3',
  broj_racuna: 'RS35123000000003',
  naziv_racuna: 'USD Tekući',
  kategorija_racuna: 'DEVIZNI',
  vrsta_racuna: 'LICNI',
  valuta_oznaka: 'USD',
  stanje_racuna: 500,
  rezervisana_sredstva: 0,
  raspolozivo_stanje: 500,
}

const mockAccounts: AccountListItem[] = [eurAccount, rsdAccount, usdAccount]

const mockIntentResult = {
  intentId: '42',
  actionId: '99',
  brojNaloga: 'PR-2024-00001',
  status: 'U_OBRADI',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Render the component and flush the mount useEffects (service calls). */
async function renderComponent() {
  const result = render(<ProveraEkvivalentnostiTab />)
  await act(async () => {})
  return result
}

/** Type an amount and advance the 300 ms debounce timer. */
function typeAmount(value: string) {
  const input = screen.getByPlaceholderText('0.00')
  fireEvent.change(input, { target: { value } })
  act(() => {
    vi.advanceTimersByTime(300)
  })
}

/** Bring the component to the confirm step with EUR→RSD, amount=100. */
async function reachConfirmStep() {
  await renderComponent()
  typeAmount('100')
  fireEvent.change(screen.getByTestId('source-account-select'), { target: { value: '1' } })
  fireEvent.change(screen.getByTestId('target-account-select'), { target: { value: '2' } })
  await act(async () => { fireEvent.click(screen.getByTestId('execute-button')) })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProveraEkvivalentnostiTab – execution section', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockGetClientAccounts.mockResolvedValue(mockAccounts)
    mockCreateExchangeTransferIntent.mockResolvedValue(mockIntentResult)
    mockVerifyAndExecutePayment.mockResolvedValue({} as never)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // ── Rendering ───────────────────────────────────────────────────────────────

  it('renders the execution section heading when currencies are different', async () => {
    await renderComponent()
    expect(screen.getByRole('heading', { name: 'Izvrši konverziju' })).toBeInTheDocument()
  })

  it('hides the execution section when the same currency is selected', async () => {
    await renderComponent()

    const [fromSelect] = screen.getAllByRole('combobox')
    fireEvent.change(fromSelect, { target: { value: 'EUR' } })
    const toSelects = screen.getAllByRole('combobox')
    fireEvent.change(toSelects[1], { target: { value: 'EUR' } })

    expect(screen.queryByRole('heading', { name: 'Izvrši konverziju' })).not.toBeInTheDocument()
  })

  // ── Account filtering ────────────────────────────────────────────────────────

  it('populates source account select with accounts matching fromOznaka (EUR)', async () => {
    await renderComponent()

    const sourceSelect = screen.getByTestId('source-account-select')
    expect(sourceSelect).toContainHTML('EUR Tekući')
    expect(sourceSelect).not.toContainHTML('RSD Tekući')
    expect(sourceSelect).not.toContainHTML('USD Tekući')
  })

  it('populates target account select with accounts matching toOznaka (RSD)', async () => {
    await renderComponent()

    const targetSelect = screen.getByTestId('target-account-select')
    expect(targetSelect).toContainHTML('RSD Tekući')
    expect(targetSelect).not.toContainHTML('EUR Tekući')
    expect(targetSelect).not.toContainHTML('USD Tekući')
  })

  it('shows empty state message when no accounts match fromOznaka', async () => {
    mockGetClientAccounts.mockResolvedValue([rsdAccount, usdAccount])
    await renderComponent()

    const [fromSelect] = screen.getAllByRole('combobox')
    fireEvent.change(fromSelect, { target: { value: 'CHF' } })

    expect(screen.getByText(/Nemate CHF račun/)).toBeInTheDocument()
  })

  it('shows empty state message when no accounts match toOznaka', async () => {
    mockGetClientAccounts.mockResolvedValue([eurAccount])
    await renderComponent()

    expect(screen.getByText(/Nemate RSD račun/)).toBeInTheDocument()
  })

  it('resets source account selection when fromOznaka changes', async () => {
    await renderComponent()

    const sourceSelect = screen.getByTestId('source-account-select')
    fireEvent.change(sourceSelect, { target: { value: '1' } })
    expect(sourceSelect).toHaveValue('1')

    const [fromSelect] = screen.getAllByRole('combobox')
    fireEvent.change(fromSelect, { target: { value: 'USD' } })
    await act(async () => {})

    const newSourceSelect = screen.getByTestId('source-account-select')
    expect(newSourceSelect).toHaveValue('')
  })

  // ── Execute button disabled states ───────────────────────────────────────────

  it('execute button is disabled when amount is empty', async () => {
    await renderComponent()
    expect(screen.getByTestId('execute-button')).toBeDisabled()
  })

  it('execute button is disabled when no source account is selected', async () => {
    await renderComponent()

    typeAmount('100')
    fireEvent.change(screen.getByTestId('target-account-select'), { target: { value: '2' } })

    expect(screen.getByTestId('execute-button')).toBeDisabled()
  })

  it('execute button is disabled when no target account is selected', async () => {
    await renderComponent()

    typeAmount('100')
    fireEvent.change(screen.getByTestId('source-account-select'), { target: { value: '1' } })

    expect(screen.getByTestId('execute-button')).toBeDisabled()
  })

  it('execute button is disabled when source account has insufficient funds', async () => {
    await renderComponent()

    typeAmount('9999')
    fireEvent.change(screen.getByTestId('source-account-select'), { target: { value: '1' } })
    fireEvent.change(screen.getByTestId('target-account-select'), { target: { value: '2' } })

    expect(screen.getByTestId('execute-button')).toBeDisabled()
  })

  it('shows insufficient funds warning when balance is too low', async () => {
    await renderComponent()

    typeAmount('9999')
    fireEvent.change(screen.getByTestId('source-account-select'), { target: { value: '1' } })

    expect(screen.getByText(/Nedovoljno sredstava/)).toBeInTheDocument()
  })

  it('execute button is enabled when all conditions are met', async () => {
    await renderComponent()

    typeAmount('100')
    fireEvent.change(screen.getByTestId('source-account-select'), { target: { value: '1' } })
    fireEvent.change(screen.getByTestId('target-account-select'), { target: { value: '2' } })

    expect(screen.getByTestId('execute-button')).not.toBeDisabled()
  })

  // ── Wizard: confirm step ─────────────────────────────────────────────────────

  it('navigates to confirm step when execute button is clicked', async () => {
    await reachConfirmStep()

    expect(screen.getByText('Potvrdi konverziju')).toBeInTheDocument()
    expect(screen.getByText(/Zadužuje se/)).toBeInTheDocument()
    expect(screen.getByText(/Uplaćuje se/)).toBeInTheDocument()
  })

  it('shows source and target account info in confirm step', async () => {
    await reachConfirmStep()

    expect(screen.getByText('EUR Tekući')).toBeInTheDocument()
    expect(screen.getByText('RSD Tekući')).toBeInTheDocument()
  })

  it('navigates back to form step when Nazad is clicked in confirm step', async () => {
    await reachConfirmStep()

    const nazadBtn = screen.getByRole('button', { name: 'Nazad' })
    await act(async () => { fireEvent.click(nazadBtn) })

    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument()
    expect(screen.getByTestId('execute-button')).toBeInTheDocument()
  })

  // ── Wizard: verify step ──────────────────────────────────────────────────────

  it('calls createExchangeTransferIntent and navigates to verify step on confirm', async () => {
    await reachConfirmStep()

    const confirmBtn = screen.getByRole('button', { name: 'Izvrši konverziju' })
    await act(async () => { fireEvent.click(confirmBtn) })

    expect(mockCreateExchangeTransferIntent).toHaveBeenCalledOnce()
    expect(screen.getByText('Verifikacija konverzije')).toBeInTheDocument()
  })

  it('calls createExchangeTransferIntent with correct payload', async () => {
    await reachConfirmStep()

    const confirmBtn = screen.getByRole('button', { name: 'Izvrši konverziju' })
    await act(async () => { fireEvent.click(confirmBtn) })

    expect(mockCreateExchangeTransferIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceAccountId: '1',
        targetAccountId: '2',
        amount: 100,
      })
    )
  })

  it('shows error in confirm step when createExchangeTransferIntent fails', async () => {
    mockCreateExchangeTransferIntent.mockRejectedValueOnce(new Error('Nedovoljno sredstava'))
    await reachConfirmStep()

    const confirmBtn = screen.getByRole('button', { name: 'Izvrši konverziju' })
    await act(async () => { fireEvent.click(confirmBtn) })

    expect(screen.getByText('Nedovoljno sredstava')).toBeInTheDocument()
    // Still on confirm step
    expect(screen.getByText('Potvrdi konverziju')).toBeInTheDocument()
  })

  // ── Wizard: done step ────────────────────────────────────────────────────────

  it('calls verifyAndExecutePayment and shows done screen after correct code', async () => {
    await reachConfirmStep()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Izvrši konverziju' }))
    })

    // Enter 6-digit code
    const codeInput = screen.getByPlaceholderText('______')
    fireEvent.change(codeInput, { target: { value: '123456' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Potvrdi' }))
    })

    expect(mockVerifyAndExecutePayment).toHaveBeenCalledWith('42', '123456')
    expect(screen.getByText('Konverzija izvršena')).toBeInTheDocument()
  })

  it('shows error on verify step when verifyAndExecutePayment fails', async () => {
    mockVerifyAndExecutePayment.mockRejectedValueOnce(new Error('Netačan kod'))
    await reachConfirmStep()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Izvrši konverziju' }))
    })

    const codeInput = screen.getByPlaceholderText('______')
    fireEvent.change(codeInput, { target: { value: '000000' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Potvrdi' }))
    })

    expect(screen.getByText('Netačan kod')).toBeInTheDocument()
    // Still on verify step
    expect(screen.getByPlaceholderText('______')).toBeInTheDocument()
  })

  it('refreshes accounts after successful verification', async () => {
    await reachConfirmStep()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Izvrši konverziju' }))
    })

    const codeInput = screen.getByPlaceholderText('______')
    fireEvent.change(codeInput, { target: { value: '123456' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Potvrdi' }))
    })
    await act(async () => {})

    // getClientAccounts: once on mount + once after success
    expect(mockGetClientAccounts).toHaveBeenCalledTimes(2)
  })

  it('resets to form step when Nova konverzija is clicked on done screen', async () => {
    await reachConfirmStep()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Izvrši konverziju' }))
    })

    fireEvent.change(screen.getByPlaceholderText('______'), { target: { value: '123456' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Potvrdi' }))
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Nova konverzija' }))
    })

    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument()
  })
})
