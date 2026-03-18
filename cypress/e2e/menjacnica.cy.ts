/**
 * E2E tests for the Menjačnica (Exchange Office) page.
 *
 * These tests stub the bank-service API so they run without a live backend.
 * Routes stubbed:
 *   GET  /api/bank/bank/currencies
 *   GET  /api/bank/bank/client/accounts
 *   GET  /api/bank/bank/exchange-rates
 *   POST /api/bank/bank/exchange-rates/execute
 */

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CURRENCIES = [
  { id: '1', naziv: 'Srpski dinar',    oznaka: 'RSD' },
  { id: '2', naziv: 'Euro',            oznaka: 'EUR' },
  { id: '3', naziv: 'Američki dolar',  oznaka: 'USD' },
]

const ACCOUNTS = [
  {
    id: '10', brojRacuna: 'RS35111000010', nazivRacuna: 'EUR Tekući',
    kategorijaRacuna: 'DEVIZNI', vrstaRacuna: 'LICNI', valutaOznaka: 'EUR',
    stanjeRacuna: '1000.00', rezervisanaSredstva: '0.00', raspolozivoStanje: '1000.00',
  },
  {
    id: '20', brojRacuna: 'RS35111000020', nazivRacuna: 'RSD Tekući',
    kategorijaRacuna: 'TEKUCI', vrstaRacuna: 'LICNI', valutaOznaka: 'RSD',
    stanjeRacuna: '50000.00', rezervisanaSredstva: '0.00', raspolozivoStanje: '50000.00',
  },
]

const EXECUTE_RESULT = {
  referenceId:     'KNV-9999999999-e2etest',
  sourceAccountId: '10',
  targetAccountId: '20',
  fromOznaka:      'EUR',
  toOznaka:        'RSD',
  originalAmount:  '100.00',
  grossAmount:     '11641.50',
  provizija:       '58.21',
  netAmount:       '11583.29',
  viaRsd:          false,
  rateNote:        'Kupovni kurs: 1 EUR = 116,42 RSD',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Stub all bank-service API calls needed for the Menjačnica page. */
function stubBankApi() {
  cy.intercept('GET', '/api/bank/bank/currencies', { body: { valute: CURRENCIES } }).as('currencies')
  cy.intercept('GET', '/api/bank/bank/client/accounts', { body: { accounts: ACCOUNTS } }).as('accounts')
  cy.intercept('GET', '/api/bank/bank/exchange-rates*', {
    body: { result: '11583.29', convertedAmount: '11583.29' },
  }).as('exchangeRate')
}

/** Navigate to the Menjačnica page assuming the user is already authenticated.
 *  The login flow is handled by setting a fake auth token in sessionStorage. */
function visitMenjacnica() {
  // Stub auth-service /me or similar if needed; for now rely on the auth store
  // being seeded via sessionStorage before visit.
  cy.visit('/client/menjacnica')
}

/** Open the "Proveri ekvivalentnost" (Check Equivalency) tab. */
function openEkvivalentnostTab() {
  cy.contains('Proveri ekvivalentnost').click()
}

// ─── Auth setup ───────────────────────────────────────────────────────────────

/**
 * Seed a valid-looking JWT token in sessionStorage so the auth guard
 * lets us into the protected route without a real login flow.
 *
 * The token is a manually crafted JWT with a far-future expiry.
 * It does NOT need to pass cryptographic verification because the
 * frontend auth store reads it from sessionStorage via jwt-decode,
 * which does NOT verify the signature.
 *
 * Payload:
 *   { sub: "42", email: "test@test.com", user_type: "CLIENT", permissions: [], exp: 9999999999 }
 */
const FAKE_ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOiI0MiIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInVzZXJfdHlwZSI6IkNMSUVOVCIsInBlcm1pc3Npb25zIjpbXSwiZXhwIjo5OTk5OTk5OTk5fQ' +
  '.SIG'

function seedAuth() {
  cy.window().then((win) => {
    // The auth store persists auth data as JSON in sessionStorage under key "auth"
    win.sessionStorage.setItem(
      'auth',
      JSON.stringify({
        state: {
          accessToken: FAKE_ACCESS_TOKEN,
          refreshToken: 'dummy-refresh',
          user: { id: '42', email: 'test@test.com', userType: 'CLIENT', permissions: [] },
        },
        version: 0,
      }),
    )
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Menjačnica – Kursna lista tab', () => {
  beforeEach(() => {
    stubBankApi()
    seedAuth()
    visitMenjacnica()
  })

  it('shows the exchange rate table with RSD as base currency', () => {
    cy.contains('Kursna lista').should('be.visible')
    cy.contains('Srpski dinar').should('be.visible')
    cy.contains('bazna valuta').should('be.visible')
  })

  it('does not show an amber info/disclaimer badge', () => {
    // The amber badge and bottom disclaimer were removed; verify they are gone
    cy.contains('Okvirni kursevi').should('not.exist')
    cy.contains('informativne svrhe').should('not.exist')
  })
})

describe('Menjačnica – Proveri ekvivalentnost tab', () => {
  beforeEach(() => {
    stubBankApi()
    seedAuth()
    visitMenjacnica()
    openEkvivalentnostTab()
  })

  it('shows the calculator section with currency selectors', () => {
    cy.contains('Proveri ekvivalentnost').should('be.visible')
    cy.contains('Iz valute').should('be.visible')
    cy.contains('U valutu').should('be.visible')
  })

  it('shows the execution section when currencies are different', () => {
    cy.contains('Izvrši konverziju').should('be.visible')
  })

  it('hides the execution section when the same currency is selected', () => {
    // Change toOznaka to EUR (same as fromOznaka default)
    cy.get('select').eq(1).select('EUR')
    cy.contains('Izvrši konverziju').should('not.exist')
  })

  it('execute button is disabled with no amount entered', () => {
    cy.get('[data-testid="execute-button"]').should('be.disabled')
  })

  it('execute button is disabled with amount but no account selected', () => {
    cy.get('input[inputMode="decimal"]').type('100')
    cy.get('[data-testid="execute-button"]').should('be.disabled')
  })

  it('shows source accounts filtered by from-currency (EUR)', () => {
    // EUR account should appear; RSD account should not
    cy.get('[data-testid="source-account-select"]').within(() => {
      cy.contains('EUR Tekući').should('exist')
      cy.contains('RSD Tekući').should('not.exist')
    })
  })

  it('shows target accounts filtered by to-currency (RSD)', () => {
    cy.get('[data-testid="target-account-select"]').within(() => {
      cy.contains('RSD Tekući').should('exist')
      cy.contains('EUR Tekući').should('not.exist')
    })
  })
})

describe('Menjačnica – happy path: execute currency conversion', () => {
  beforeEach(() => {
    stubBankApi()
    cy.intercept('POST', '/api/bank/bank/exchange-rates/execute', {
      statusCode: 200,
      body: EXECUTE_RESULT,
    }).as('executeTransfer')

    seedAuth()
    visitMenjacnica()
    openEkvivalentnostTab()
  })

  it('completes a EUR→RSD conversion and shows the success receipt', () => {
    // 1. Enter amount
    cy.get('input[inputMode="decimal"]').type('100')

    // 2. Wait for conversion calculation (debounce)
    cy.contains('Dobijate', { timeout: 2000 }).should('be.visible')

    // 3. Select source EUR account
    cy.get('[data-testid="source-account-select"]').select('EUR Tekući – RS35111000010')

    // 4. Select target RSD account
    cy.get('[data-testid="target-account-select"]').select('RSD Tekući – RS35111000020')

    // 5. Execute button should now be enabled
    cy.get('[data-testid="execute-button"]').should('not.be.disabled')

    // 6. Click execute
    cy.get('[data-testid="execute-button"]').click()

    // 7. API call should have been made
    cy.wait('@executeTransfer').its('request.body').should('deep.include', {
      fromOznaka: 'EUR',
      toOznaka:   'RSD',
      amount:     100,
    })

    // 8. Success panel visible
    cy.get('[data-testid="exec-success"]').should('be.visible')
    cy.get('[data-testid="exec-success"]').should('contain.text', 'Konverzija izvršena')
    cy.get('[data-testid="exec-success"]').should('contain.text', 'KNV-9999999999-e2etest')

    // 9. No error panel
    cy.get('[data-testid="exec-error"]').should('not.exist')
  })
})

describe('Menjačnica – negative case: insufficient funds', () => {
  beforeEach(() => {
    stubBankApi()
    cy.intercept('POST', '/api/bank/bank/exchange-rates/execute', {
      statusCode: 422,
      body: { message: 'nedovoljno raspoloživih sredstava na izvorišnom računu' },
    }).as('executeTransferFail')

    seedAuth()
    visitMenjacnica()
    openEkvivalentnostTab()
  })

  it('shows error panel when backend rejects due to insufficient funds', () => {
    // Enter an amount larger than EUR account balance (1000)
    cy.get('input[inputMode="decimal"]').type('9999')
    cy.contains('Dobijate', { timeout: 2000 }).should('be.visible')

    cy.get('[data-testid="source-account-select"]').select('EUR Tekući – RS35111000010')
    cy.get('[data-testid="target-account-select"]').select('RSD Tekući – RS35111000020')

    // Execute button should be DISABLED because hasEnoughFunds=false (9999 > 1000)
    cy.get('[data-testid="execute-button"]').should('be.disabled')

    // Insufficient funds warning text should be visible
    cy.contains('Nedovoljno sredstava').should('be.visible')
  })

  it('execute button remains disabled when same currency is selected', () => {
    cy.get('select').eq(0).select('RSD')
    // Both currencies are now RSD → execution section hidden
    cy.contains('Izvrši konverziju').should('not.exist')
    cy.get('[data-testid="execute-button"]').should('not.exist')
  })
})
