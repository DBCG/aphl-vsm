// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
Cypress.Commands.add('login', (username, password) => { 
  cy.get('#signin').click()
  cy.get('#username').type(username)
  cy.get('#password').type(password)
  cy.get('#kc-login').click()
})

Cypress.Commands.add('setupData', () => { 
  cy.request('POST', 'http://localhost:8082/fhir/$expunge',{
    "resourceType": "Parameters",
    "parameter": [
      {
        "name": "expungeEverything",
        "valueBoolean": true
      }
    ]
  })
  cy.exec('../bin/load-data.sh')
})
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })