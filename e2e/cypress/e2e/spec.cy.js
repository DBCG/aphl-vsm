import moment from "moment";

describe("Smoke Tests", () => {
  before(() => {
    cy.setupData();
  });

  beforeEach(() => {
    cy.visit("http://localhost:3000");
    cy.login("johndoe", "password");
  });

  afterEach(function () {
    if (this.currentTest.state === "failed") {
      Cypress.runner.stop();
    }
  });

  context("Draft Library Setup", () => {
    it("clones active library", () => {
      cy.get('[data-button-context="clone"]').click();
      cy.get('[data-modal="confirm"]').click();
      cy.get('[data-column-id="1"]').contains("DRAFT").should("be.visible");
    });

    it("Edit Program Metadata", () => {
      cy.get('[data-column-id="1"]')
        .contains("DRAFT")
        .parents("div")
        .parents("div")
        .first()
        .click(50, 0, { force: true });
      cy.get("#edit-metadata").click();

      // Set program metadata values
      cy.get("#prog-name").clear().type("Draft Library");
      cy.get("#prog-desc").clear().type("Draft Library description");
      cy.get(".date-input button").click();
      cy.get(".MuiPickersDay-today").click();
      cy.get("#prog-release-desc").clear().type("this is a release description for the draft library");
      cy.get(".priority-level-selector__control").click();
      cy.get("#react-select-priority-level-selector-option-1").click();
      cy.intercept("PUT", "**/api/programs/*").as("updateProgramMetadata");
      cy.get("#edit-metadata-save").click();
      cy.wait("@updateProgramMetadata");
      cy.reload();

      // Run assertions to check for persistence after reload
      cy.get("#prog-name").should("have.value", "Draft Library");
      cy.get("#prog-version").should("have.value", "1.0.0-draft");
      cy.get("#prog-desc").should("have.value", "Draft Library description");
      cy.get("#prog-release-desc").should("have.value", "this is a release description for the draft library");
      cy.get("#priority-level").should("have.value", "Priority").should("be.visible");
      cy.get("#effectiveStartDate").should("have.value", moment().format("YYYY-MM-DD")).should("be.visible");
    });

    it("Adds a manifest to library", () => {
      cy.get('[data-column-id="1"]')
        .contains("DRAFT")
        .parents("div")
        .parents("div")
        .first()
        .click(50, 0, { force: true });

      cy.get("#edit-manifest").click();
      cy.get("#code-system-selector").click();
      cy.get("#react-select-3-listbox").contains("ICD10CM").click(); 

      // Add the manifests
      cy.get('[data-add-manifest="http://hl7.org/fhir/sid/icd-10-cm|2022"]').click();
      cy.get('[data-delete-manifest="http://hl7.org/fhir/sid/icd-10-cm|2022"]').should("exist");

      cy.get('[data-add-manifest="http://hl7.org/fhir/sid/icd-10-cm|2020"]').click();
      cy.get('[data-delete-manifest="http://hl7.org/fhir/sid/icd-10-cm|2020"]').should("exist");

      // Delete one of the manifests
      cy.get('[data-delete-manifest="http://hl7.org/fhir/sid/icd-10-cm|2022"]').click();
      cy.get('[data-modal="yes"]').click();

      // Check that it reappears on the available version manifest list
      cy.get('[data-add-manifest="http://hl7.org/fhir/sid/icd-10-cm|2022"]').should("exist");

      cy.get("#back-to-program").click();

      // Check that the manifest had been added to the program table
      cy.get('[id="cell-2-http://hl7.org/fhir/sid/icd-10-cm|2020"]').contains("ICD10CM").should("exist");
      cy.get('[id="cell-3-http://hl7.org/fhir/sid/icd-10-cm|2020"]')
        .contains("http://hl7.org/fhir/sid/icd-10-cm")
        .should("exist");
      cy.get('[id="cell-4-http://hl7.org/fhir/sid/icd-10-cm|2020"]').contains("2020").should("exist");
    });

    it("Creates/Deletes new grouper", () => {
      cy.get('[data-column-id="1"]')
        .contains("DRAFT")
        .parents("div")
        .parents("div")
        .first()
        .click(50, 0, { force: true });

      cy.get("#create-new-grouper").click();

      cy.get("#id").clear().type("test-grouper");
      cy.get("#title").clear().type("excellent title for grouper");
      cy.get("#purpose").clear().type("To group valuesets together");
      cy.get("#description").clear().type("a description of the grouper");

      // vsac search for valuesets
      cy.get("#vs-search").type("diabetes");
      cy.get("#submit-search-valueset-button").click();
      cy.get('[name="select-all-rows"]').click();
      cy.get("#add-valueset-to-program").click();

      cy.get("#submit-grouper-creation").click();
      // Do some assertions here
      cy.get("#cell-1-test-grouper").contains("Excellent_title_for_grouper").should("exist");
      cy.get("#cell-2-test-grouper").contains("excellent title for grouper").should("exist");
      cy.get("#cell-3-test-grouper")
        .contains("http://ersd.aimsplatform.org/fhir/ValueSet/test-grouper")
        .should("exist");
      cy.get("#cell-4-test-grouper").contains("1.0.0-draft").should("exist");

      // Now remove newly created grouper
      cy.get('#cell-5-test-grouper [data-button-context="delete"]').click();
      cy.get('[data-modal="yes"]').click();
      cy.get("#cell-1-test-grouper").should("not.exist");
    });

    it("Adds a new valueset to the program", () => {
      cy.get('[data-column-id="1"]')
        .contains("DRAFT")
        .parents("div")
        .parents("div")
        .first()
        .click(50, 0, { force: true });

      cy.get("#view-valuesets").click();
      cy.get("#add-valueset").click();

      cy.get("#vs-search").type("brain");
      cy.get("#submit-search-valueset-button").click();
      cy.get(".rdt_TableBody input").first().click();

      cy.get('.rdt_TableBody [data-column-id="6"]')
        .first()
        .then((message) => {
          let oid = message.text();
          cy.wrap(oid).as("oid");
        });

      let vsId = "";
      cy.get("@oid").then((oid) => {
        vsId = oid;
        cy.get("#react-select-search-page-groups-live-region").parent().click();
        cy.get("#react-select-search-page-groups-option-0").click();
        cy.get("#add-valueset-to-program").click();
        cy.get('.rdt_TableBody [data-column-id="vs-oid-search"]').first().contains(vsId).should("exist");

        // navigate back to program view
        cy.get("#breadcrumb-programs").click();
        cy.get('[data-column-id="1"]')
          .contains("DRAFT")
          .parents("div")
          .parents("div")
          .first()
          .click(50, 0, { force: true });

        // Check grouper to see if version exists
        cy.get('#grouper-overview-table .rdt_TableBody [data-column-id="1"]').first().click(50, 10, { force: true });
        cy.get(`[id="cell-1-http://cts.nlm.nih.gov/fhir/ValueSet/${vsId}"]`).should("exist");
      });
    });

    it("Creates approval for draft library", () => {
      cy.get('[data-column-id="1"]')
        .contains("DRAFT")
        .parents("div")
        .parents("div")
        .first()
        .click(50, 0, { force: true });

      cy.get("#approve").click();

      cy.get("#text").clear().type("This is a test approval");
      cy.get("#reference").clear().type("http://example.com");
      cy.get("#user").clear().type("johndoe");
      cy.get("#submit-approve").click();

      cy.get(`#cell-1-comment_${moment().utc().format("YYYY-MM-DD")}_0`).should("exist");
      // cy.get(`#cell-2-comment_${moment().utc().format("YYYY-MM-DD")}_0`).contains("")
    });

    it("Logs out of application", () => {
      cy.get("#logout").click();
      cy.get("#provider-logo-dark").should("be.visible");
    });
  });
});
