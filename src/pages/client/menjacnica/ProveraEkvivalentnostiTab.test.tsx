import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ProveraEkvivalentnostiTab from './ProveraEkvivalentnostiTab'
import type { AccountListItem } from '@/types'
import type { ExchangeTransferResult } from '@/services/bankaService'

// ─── Service mocks ────────────────────────────────────────────────────────────

vi.mock('@/services/bankaService', () => ({
  getCurrencies: vi.fn().mockResolvedValue([]),
  getClientAccounts: vi.fn(),
  executeExchangeTransfer: vi.fn(),
}))

import {
  getClientAccounts,
  executeExchangeTransfer,
} from '@/services/bankaService'

const mockGetClientAccounts = vi.mocked(getClientAccounts)
const mockExecuteExchangeTransfer = vi.mocked(executeExchangeTransfer)

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

const mockExecResult: ExchangeTransferResult = {
  referenceId: 'KNV-1234567890-abc123',
  sourceAccountId: '1',
  targetAccountId: '2',
  fromOznaka: 'EUR',
  toOznaka: 'RSD',
  originalAmount: 100,
  grossAmount: 11641.5,
  provizija: 58.21,
  netAmount: 11583.29,
  viaRsd: false,
  rateNote: 'Kupovni kurs: 1 EUR = 116,42 RSD',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Render the component and flush the mount useEffects (service calls). */
async function renderComponent() {
  const result = render(<ProveraEkvivalentnostiTab />)
  // Flush promise microtasks from getCurrencies + getClientAccounts
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProveraEkvivalentnostiTab – execution section', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockGetClientAccounts.mockResolvedValue(mockAccounts)
    mockExecuteExchangeTransfer.mockResolvedValue(mockExecResult)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // ── Rendering ───────────────────────────────────────────────────────────────

  it('renders the execution section heading when currencies are different', async () => {
    await renderComponent()
    // Default: EUR → RSD (different), section should be visible
    expect(screen.getByRole('heading', { name: 'Izvrši konverziju' })).toBeInTheDocument()
  })

  it('hides the execution section when the same currency is selected', async () => {
    await renderComponent()

    // Set both selects to EUR
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
    // Should contain EUR account option
    expect(sourceSelect).toContainHTML('EUR Tekući')
    // Should NOT contain RSD or USD accounts
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
    // Only RSD and USD accounts – no CHF
    mockGetClientAccounts.mockResolvedValue([rsdAccount, usdAccount])
    await renderComponent()

    // Change fromOznaka to CHF (which has no accounts)
    const [fromSelect] = screen.getAllByRole('combobox')
    fireEvent.change(fromSelect, { target: { value: 'CHF' } })

    expect(screen.getByText(/Nemate CHF račun/)).toBeInTheDocument()
  })

  it('shows empty state message when no accounts match toOznaka', async () => {
    // Only EUR accounts – no RSD
    mockGetClientAccounts.mockResolvedValue([eurAccount])
    await renderComponent()

    // Default toOznaka is RSD – no RSD account → empty state
    expect(screen.getByText(/Nemate RSD račun/)).toBeInTheDocument()
  })

  it('resets source account selection when fromOznaka changes', async () => {
    await renderComponent()

    // Select source account
    const sourceSelect = screen.getByTestId('source-account-select')
    fireEvent.change(sourceSelect, { target: { value: '1' } })
    expect(sourceSelect).toHaveValue('1')

    // Change fromOznaka → reset expected
    const [fromSelect] = screen.getAllByRole('combobox')
    fireEvent.change(fromSelect, { target: { value: 'USD' } })
    await act(async () => {})

    // Source select should now show USD accounts (not previous EUR selection)
    const newSourceSelect = screen.getByTestId('source-account-select')
    expect(newSourceSelect).toHaveValue('')
  })

  // ── Execute button disabled states ───────────────────────────────────────────

  it('execute button is disabled when amount is empty', async () => {
    await renderComponent()

    const btn = screen.getByTestId('execute-button')
    expect(btn).toBeDisabled()
  })

  it('execute button is disabled when no source account is selected', async () => {
    await renderComponent()

    typeAmount('100')
    // Do not select source account
    const targetSelect = screen.getByTestId('target-account-select')
    fireEvent.change(targetSelect, { target: { value: '2' } })

    expect(screen.getByTestId('execute-button')).toBeDisabled()
  })

  it('execute button is disabled when no target account is selected', async () => {
    await renderComponent()

    typeAmount('100')
    const sourceSelect = screen.getByTestId('source-account-select')
    fireEvent.change(sourceSelect, { target: { value: '1' } })
    // Do not select target account

    expect(screen.getByTestId('execute-button')).toBeDisabled()
  })

  it('execute button is disabled when source account has insufficient funds', async () => {
    await renderComponent()

    // Amount exceeds EUR account balance (1000)
    typeAmount('9999')

    const sourceSelect = screen.getByTestId('source-account-select')
    fireEvent.change(sourceSelect, { target: { value: '1' } })
    const targetSelect = screen.getByTestId('target-account-select')
    fireEvent.change(targetSelect, { target: { value: '2' } })

    expect(screen.getByTestId('execute-button')).toBeDisabled()
  })

  it('shows insufficient funds warning when balance is too low', async () => {
    await renderComponent()

    typeAmount('9999')
    const sourceSelect = screen.getByTestId('source-account-select')
    fireEvent.change(sourceSelect, { target: { value: '1' } })

    expect(screen.getByText(/Nedovoljno sredstava/)).toBeInTheDocument()
  })

  it('execute button is enabled when all conditions are met', async () => {
    await renderComponent()

    typeAmount('100')

    const sourceSelect = screen.getByTestId('source-account-select')
    fireEvent.change(sourceSelect, { target: { value: '1' } })
    const targetSelect = screen.getByTestId('target-account-select')
    fireEvent.change(targetSelect, { target: { value: '2' } })

    expect(screen.getByTestId('execute-button')).not.toBeDisabled()
  })

  // ── Request payload ──────────────────────────────────────────────────────────

  it('calls executeExchangeTransfer with the correct payload on click', async () => {
    await renderComponent()

    typeAmount('100')

    const sourceSelect = screen.getByTestId('source-account-select')
    fireEvent.change(sourceSelect, { target: { value: '1' } })
    const targetSelect = screen.getByTestId('target-account-select')
    fireEvent.change(targetSelect, { target: { value: '2' } })

    const btn = screen.getByTestId('execute-button')
    await act(async () => {
      fireEvent.click(btn)
    })

    expect(mockExecuteExchangeTransfer).toHaveBeenCalledOnce()
    expect(mockExecuteExchangeTransfer).toHaveBeenCalledWith({
      sourceAccountId: '1',
      targetAccountId: '2',
      fromOznaka: 'EUR',
      toOznaka: 'RSD',
      amount: 100,
    })
  })

  // ── Success / error feedback ─────────────────────────────────────────────────

  it('displays success panel with net amount and reference ID after successful execute', async () => {
    await renderComponent()

    typeAmount('100')
    fireEvent.change(screen.getByTestId('source-account-select'), { target: { value: '1' } })
    fireEvent.change(screen.getByTestId('target-account-select'), { target: { value: '2' } })

    await act(async () => {
      fireEvent.click(screen.getByTestId('execute-button'))
    })

    const panel = screen.getByTestId('exec-success')
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveTextContent('Konverzija izvršena')
    expect(panel).toHaveTextContent('RSD')
    expect(panel).toHaveTextContent('KNV-1234567890-abc123')
  })

  it('does not display error panel after successful execute', async () => {
    await renderComponent()

    typeAmount('100')
    fireEvent.change(screen.getByTestId('source-account-select'), { target: { value: '1' } })
    fireEvent.change(screen.getByTestId('target-account-select'), { target: { value: '2' } })

    await act(async () => {
      fireEvent.click(screen.getByTestId('execute-button'))
    })

    expect(screen.queryByTestId('exec-error')).not.toBeInTheDocument()
  })

  it('displays error panel when executeExchangeTransfer rejects', async () => {
    mockExecuteExchangeTransfer.mockRejectedValueOnce(new Error('Nedovoljno raspoloživih sredstava'))
    await renderComponent()

    typeAmount('100')
    fireEvent.change(screen.getByTestId('source-account-select'), { target: { value: '1' } })
    fireEvent.change(screen.getByTestId('target-account-select'), { target: { value: '2' } })

    await act(async () => {
      fireEvent.click(screen.getByTestId('execute-button'))
    })

    const panel = screen.getByTestId('exec-error')
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveTextContent('Nedovoljno raspoloživih sredstava')
  })

  it('does not display success panel when execute fails', async () => {
    mockExecuteExchangeTransfer.mockRejectedValueOnce(new Error('server error'))
    await renderComponent()

    typeAmount('100')
    fireEvent.change(screen.getByTestId('source-account-select'), { target: { value: '1' } })
    fireEvent.change(screen.getByTestId('target-account-select'), { target: { value: '2' } })

    await act(async () => {
      fireEvent.click(screen.getByTestId('execute-button'))
    })

    expect(screen.queryByTestId('exec-success')).not.toBeInTheDocument()
  })

  it('refreshes accounts after successful execute', async () => {
    await renderComponent()

    typeAmount('100')
    fireEvent.change(screen.getByTestId('source-account-select'), { target: { value: '1' } })
    fireEvent.change(screen.getByTestId('target-account-select'), { target: { value: '2' } })

    await act(async () => {
      fireEvent.click(screen.getByTestId('execute-button'))
    })
    // Flush the fire-and-forget getClientAccounts().then(...) microtask
    await act(async () => {})

    // getClientAccounts called once on mount + once after success
    expect(mockGetClientAccounts).toHaveBeenCalledTimes(2)
  })
})
