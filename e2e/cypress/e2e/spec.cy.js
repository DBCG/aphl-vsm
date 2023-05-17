describe('Smoke Tests', () => {
  // before(() => {
  //   cy.setupData()
  // })

  beforeEach(() => {
    cy.visit('http://localhost:3000')
    cy.login('johndoe', 'password')
  })

  context("Draft Library Setup", () => {
    // it('clones active library', () => {
    //   cy.get('[data-button-context="clone"]').click()
    //   cy.get('[data-modal="confirm"]').click()
    //   cy.get('[data-column-id="1"]').contains('draft').should('be.visible')
    // })

    // it('Edit Program Metadata', () => {
    //   cy.get('[data-column-id="1"]').contains('draft').parents('div').first().click(50, 0,{ force: true })
    //   cy.get('#edit-metadata').click()
      
    //   // Set program metadata values
    //   cy.get('#prog-name').clear().type('Draft Library')
    //   cy.get('#prog-version').clear().type('1.0.1-draft')
    //   cy.get('#prog-desc').clear().type('Draft Library description')
    //   cy.get('#prog-release-desc').clear().type('this is a release description for the draft library')
    //   cy.get('.priority-level-selector__control').click()
    //   cy.get('#react-select-priority-level-selector-option-1').click()
    //   cy.intercept('PUT', '**/api/programs/*').as('updateProgramMetadata')
    //   cy.get('#edit-metadata-save').click()
    //   cy.wait('@updateProgramMetadata')
    //   cy.reload()

    //   // Run assertions to check for persistence after reload
    //   cy.get('#prog-name').contains('Draft Library')
    //   cy.get('#prog-version').contains('1.0.1-draft')
    //   cy.get('#prog-desc').contains('Draft Library description')
    //   cy.get('#prog-release-desc').contains('this is a release description for the draft library')
    //   cy.get('#priority-level').contains('Priority').should('be.visible')
    // })

    it('Adds a manifest to library', () => {
      cy.get('[data-column-id="1"]').contains('draft').parents('div').first().click(50, 0,{ force: true })
      cy.get('#edit-manifest').click()
      cy.get('#code-system-selector').click()
      cy.get('#react-select-3-option-20').click()

      // Add the manifests
      cy.get('[data-add-manifest="http://hl7.org/fhir/sid/icd-10-cm|2022"]').click()
      cy.get('[data-add-manifest="http://hl7.org/fhir/sid/icd-10-cm|2020"]').click()

      // Delete one of the manifests
      cy.get('[data-delete-manifest="http://hl7.org/fhir/sid/icd-10-cm|2022"]').click()
      cy.get('[data-modal="confirm"]').click()

      // Check that it reappears on the available version manifest list
      cy.get('[data-add-manifest="http://hl7.org/fhir/sid/icd-10-cm|2022"]').should('exist')

      cy.get("#back-to-program").click()

      // Check that the manifest had been added to the program table
      cy.get('[id="cell-2-http://hl7.org/fhir/sid/icd-10-cm|2020"]').contains('ICD10CM').should('exist')
      cy.get('[id="cell-3-http://hl7.org/fhir/sid/icd-10-cm|2020"]').contains('http://hl7.org/fhir/sid/icd-10-cm').should('exist')
      cy.get('[id="cell-4-http://hl7.org/fhir/sid/icd-10-cm|2020"]').contains('2020').should('exist')
    })

    // it('Logs out of application', () => {
    //   cy.get('#logout').click()
    //   cy.get('#provider-logo-dark').should('be.visible')
    // })
  })


})