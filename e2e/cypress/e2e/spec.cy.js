describe('Smoke Tests', () => {
  before(() => {
    cy.setupData()
  })

  beforeEach(() => {
    cy.visit('http://localhost:3000')
    cy.login('johndoe', 'password')
  })

  context("Draft Library Setup", () => {
    it('clones active library', () => {
      cy.get('[data-button-context="clone"]').click()
      cy.get('[data-modal="confirm"]').click()
      cy.get('[data-column-id="1"]').contains('draft').should('be.visible')
    })

    it('Edit Program Metadata', () => {
      cy.get('[data-column-id="1"]').contains('draft').parents('div').first().click(50, 0,{ force: true })
      cy.get('#edit-metadata').click()
      
      // Set program metadata values
      cy.get('#prog-name').clear().type('Draft Library')
      cy.get('#prog-version').clear().type('1.0.1-draft')
      cy.get('#prog-desc').clear().type('Draft Library description')
      cy.get('#prog-release-desc').clear().type('this is a release description for the draft library')
      cy.get('.priority-level-selector__control').click()
      cy.get('#react-select-priority-level-selector-option-1').click()
      cy.intercept('PUT', '**/api/programs/*').as('updateProgramMetadata')
      cy.get('#edit-metadata-save').click()
      cy.wait('@updateProgramMetadata')
      cy.reload()

      // Run assertions to check for persistence after reload
      cy.get('#prog-name').contains('Draft Library')
      cy.get('#prog-version').contains('1.0.1-draft')
      cy.get('#prog-desc').contains('Draft Library description')
      cy.get('#prog-release-desc').contains('this is a release description for the draft library')
      cy.get('#priority-level').contains('Priority').should('be.visible')
    })

    it('Logs out of application', () => {
      cy.get('#logout').click()
      cy.get('#provider-logo-dark').should('be.visible')
    })
  })


})