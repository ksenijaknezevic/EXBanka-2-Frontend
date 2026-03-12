describe('Login Page', () => {
  beforeEach(() => {
    cy.visit('/login')
  })

  it('shows login form', () => {
    cy.get('input[type="email"]').should('exist')
    cy.get('input[type="password"]').should('exist')
    cy.get('button[type="submit"]').should('be.disabled')
  })

  it('submit stays disabled with empty inputs', () => {
    cy.get('button[type="submit"]').should('be.disabled')
  })

  it('submit stays disabled with only spaces', () => {
    cy.get('input[type="email"]').type('   ')
    cy.get('input[type="password"]').type('   ')
    cy.get('button[type="submit"]').should('be.disabled')
  })

  it('shows validation error for invalid email', () => {
    cy.get('input[type="email"]').type('notanemail')
    cy.get('input[type="password"]').type('Valid1password2')
    cy.contains('ispravan email').should('be.visible')
    cy.get('button[type="submit"]').should('be.disabled')
  })

  it('shows validation error for short password', () => {
    cy.get('input[type="email"]').type('user@test.com')
    cy.get('input[type="password"]').type('Ab1')
    cy.contains('najmanje 8').should('be.visible')
    cy.get('button[type="submit"]').should('be.disabled')
  })

  it('shows validation error for password over 32 chars', () => {
    cy.get('input[type="email"]').type('user@test.com')
    cy.get('input[type="password"]').type('Aa1'.repeat(12)) // 36 chars
    cy.contains('najviše 32').should('be.visible')
    cy.get('button[type="submit"]').should('be.disabled')
  })

  it('shows error when password missing uppercase', () => {
    cy.get('input[type="email"]').type('user@test.com')
    cy.get('input[type="password"]').type('abcdef12')
    cy.contains('veliko slovo').should('be.visible')
  })

  it('shows error when password missing 2 digits', () => {
    cy.get('input[type="email"]').type('user@test.com')
    cy.get('input[type="password"]').type('Abcdefgh1')
    cy.contains('2 broja').should('be.visible')
  })

  it('enables submit with valid credentials', () => {
    cy.get('input[type="email"]').type('user@test.com')
    cy.get('input[type="password"]').type('ValidPass12')
    cy.get('button[type="submit"]').should('not.be.disabled')
  })

  it('has a forgot password link', () => {
    cy.contains('Zaboravili ste lozinku').should('exist')
    cy.contains('Zaboravili ste lozinku').click()
    cy.url().should('include', '/forgot-password')
  })
})
