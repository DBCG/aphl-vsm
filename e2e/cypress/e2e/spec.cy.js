import moment from "moment";
import path from "path";
const downloadsFolder = Cypress.config('downloadsFolder')
const deleteDownloadsFolder = () => {
  cy.task('deleteFolder', downloadsFolder)
}
describe("Smoke Tests", () => {
  before(() => {
    cy.setupData();
  });

  beforeEach(() => {
    cy.visit("http://localhost:3000");
    cy.login("johndoe", "password");
    deleteDownloadsFolder()
  });

  afterEach(function () {
    if (this.currentTest.state === "failed") {
      Cypress.runner.stop();
    }
  });

  context("Draft Library Setup", () => {
    it("clones active library", () => {
      cy.wait(3000)
      cy.get('[data-button-context="clone-active"]').click();
      cy.get('[data-modal="confirm"]').click();
      cy.get('[data-modal="confirm"]').should("not.exist"); // Wait for draft operation to finish
      cy.get('[data-column-id="1"]').first().scrollIntoView()
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
      cy.get("button").contains('Today').click();
      cy.get("#prog-release-desc").clear().type("this is a release description for the draft library");
      cy.get(".priority-level-selector__control").click();
      cy.get("#react-select-priority-level-selector-option-1").click();
      cy.intercept("PUT", "**/api/programs/*").as("updateProgramMetadata");
      cy.get("#edit-metadata-save").click();
      cy.wait("@updateProgramMetadata");
      cy.reload();

      // Run assertions to check for persistence after reload
      cy.get("#prog-name").should("have.value", "Draft Library");
      cy.get("#prog-version").should("have.value", "1.1.0-draft");
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

    it("Creates, Edits, and Deletes new grouper", () => {
      cy.get('[data-column-id="1"]')
        .contains("DRAFT")
        .parents("div")
        .parents("div")
        .first()
        .click(50, 0, { force: true });

      cy.get("#create-new-grouper").click();

      cy.get("#title").clear().type("excellent title for grouper");
      cy.get("#purpose").clear().type("To group valuesets together");
      cy.get("#description").clear().type("a description of the grouper");

      // vsac search for valuesets
      cy.get("#vs-search").type("diabetes");
      cy.get("#submit-search-valueset-button").click();
      cy.get('[name="select-all-rows"]').click();
      cy.get("#add-valueset-to-program").click();

      cy.get("#submit-grouper-creation").click();
      // Do some assertions on Program Detail View Page
      cy.get('[data-column-id="1"]').contains("Excellent_title_for_grouper").should("exist");
      cy.get('[data-column-id="2"]').contains("excellent title for grouper").should("exist");
      cy.get('[data-column-id="3"]')
        .contains("http://ersd.aimsplatform.org/fhir/ValueSet/Excellent_title_for_grouper")
        .should("exist");

      // Edit the grouper
      cy.get('[data-column-id="1"]').last().click({force: true})
      cy.get('[data-button="edit-metadata"]').click();
      cy.get("#vs-publisher").clear().type("test-publisher");
      cy.get("#vs-author").clear().type("test-author");
      cy.get("#vs-purpose").clear().type("test-purpose");
      cy.get("#vs-description").clear().type("test-description");
      cy.get('[data-button="edit-metadata-save"]').click();

      // Check that the metadata was updated
      cy.get("#vs-publisher").should("have.value", "test-publisher");
      cy.get("#vs-author").should("have.value", "test-author");
      cy.get("#vs-purpose").should("have.value", "test-purpose");
      cy.get("#vs-description").should("have.value", "test-description");

      // Navigate back to program view
      cy.get("#breadcrumb-programs").click();
      cy.get('[data-column-id="1"]')
      .contains("DRAFT")
      .parents("div")
      .parents("div")
      .first()
      .click(50, 0, { force: true });

      // Now remove newly created grouper
      cy.get('[data-button-context="delete"]').last().click();
      cy.get('[data-modal="yes"]').click();
      cy.get('[data-column-id="1"]').contains("Excellent_title_for_grouper").should("not.exist");
    });

    it("Adds a new valueset to multiple program groupers then removes it", () => {
      cy.get('[data-column-id="1"]')
        .contains("DRAFT")
        .parents("div")
        .parents("div")
        .first()
        .click(50, 0, { force: true });

      cy.get("#view-valuesets").click();
      cy.get("#add-valueset").click();

      // vsac search for valuesets
      cy.get("#vs-search").type("brain");
      cy.get("#submit-search-valueset-button").click();
      cy.get(".rdt_TableBody input").first().click();

      // Set alias for oid
      cy.get('.rdt_TableBody [data-column-id="6"]')
        .first()
        .then((oid) => cy.wrap(oid.text()).as("oid"));

      cy.get("@oid").then((vsId) => {
        // Select first grouper on list
        cy.get("#react-select-search-page-groups-live-region").parent().click();
        // Grab text from grouper1
        cy.get("#react-select-search-page-groups-option-0")
          .first()
          .then((grouperEl) => cy.wrap(grouperEl.text()).as("grouper1"));
        cy.get("#react-select-search-page-groups-option-0").click();

        // Select second grouper on list
        cy.get("#react-select-search-page-groups-live-region").parent().click();
        cy.get("#react-select-search-page-groups-option-1")
          .first()
          .then((grouperEl) => cy.wrap(grouperEl.text()).as("grouper2"));
        cy.get("#react-select-search-page-groups-option-1").click();

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
        cy.get("@grouper1").then((grouper1) => {
          cy.get("#grouper-overview-table .rdt_TableBody").contains(grouper1).first().click(50, 10, { force: true });
        });
        cy.wait(3000) // Wait for valueset to load due to async nature of the call above
        cy.get('[data-column-id="3"]').contains(`http://cts.nlm.nih.gov/fhir/ValueSet/${vsId}`).should("exist");

        // navigate back to program view
        cy.go("back");

        // // Check second grouper to see if version exists
        cy.get("@grouper2").then((grouper2) => {
          cy.get("#grouper-overview-table .rdt_TableBody").contains(grouper2).first().click(50, 10, { force: true });
        });
        cy.wait(3000)

        cy.get('[data-column-id="3"]').contains(`http://cts.nlm.nih.gov/fhir/ValueSet/${vsId}`).should("exist");

        // Remove same valueset from program
        cy.go("back");

        cy.get("#view-valuesets").click();
        cy.get(`[data-remove-grouper-vs="http://cts.nlm.nih.gov/fhir/ValueSet/${vsId}`).click({ force: true });
        cy.get('[data-modal="yes"]').click();
        cy.go("back");

        // Check grouper to see valueset has been removed
        cy.get("@grouper1").then((grouper1) => {
          cy.get("#grouper-overview-table .rdt_TableBody").contains(grouper1).first().click(50, 10, { force: true });
          cy.get('#page-title').contains(grouper1).should("exist")
        });
        cy.wait(3000)

        cy.get('[data-column-id="3"]').contains(`http://cts.nlm.nih.gov/fhir/ValueSet/${vsId}`).should("not.exist");

        // navigate back to program view
        cy.go("back");

        // Check second grouper to see valueset has been removed
        cy.get("@grouper2").then((grouper2) => {
          cy.get("#grouper-overview-table .rdt_TableBody").contains(grouper2).first().click(50, 10, { force: true });
          cy.get('#page-title').contains(grouper2).should("exist")
        });
        cy.wait(3000)

        cy.get('[data-column-id="3"]').contains(`http://cts.nlm.nih.gov/fhir/ValueSet/${vsId}"]`).should("not.exist");
      });
    });

    it("Ability to filter Valuesets by OID, Name, or Version", () => {
      cy.get('[data-column-id="1"]')
      .contains("DRAFT")
      .parents("div")
      .parents("div")
      .first()
      .click(50, 0, { force: true });

      cy.get("#view-valuesets").click();
      // Search By Name
      cy.get('[data-column-id="vs-name-search"] input').clear().type("covid");
      cy.get('[id="cell-vs-name-search-http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1223-2022-10-19-0"]').contains("COVID_19TestsforSARS_CoV_2byCultureandIdentificationMethod")
      cy.get('[data-column-id="vs-name-search"] input').clear()

      // Search By OID
      cy.get('[data-column-id="vs-oid-search"] input').clear().type("2.16.840.1.113762.1.4.1146.481");
      cy.get('[id="cell-vs-name-search-http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.481-2022-10-19-0"]').contains("AnthraxTestsforBacillisanthracisAntibody").should("exist");
      cy.get('[data-column-id="vs-oid-search"] input').clear();
    })

    it("Adds and Removes conditions from valuesets", {scrollBehavior: false}, () => {
      cy.get('[data-column-id="1"]')
        .contains("DRAFT")
        .parents("div")
        .parents("div")
        .first()
        .click(50, 0, { force: true });

      cy.get("#view-valuesets").click();
      cy.get("#vs-table-detail").children().first().scrollTo("right")
      
      cy.get('[id="condition-selector-2.16.840.1.113762.1.4.1146.360"]').should('not.include.text', "California Serogroup Virus Disease")
      cy.get('[id="condition-selector-2.16.840.1.113762.1.4.1146.360"],[id="#react-select-condition-selector-input"]').click()

      cy.get("#react-select-condition-selector-listbox").contains("California Serogroup Virus Disease").scrollIntoView().click()
      cy.get('[id="condition-selector-2.16.840.1.113762.1.4.1146.360"]').should('include.text', "California Serogroup Virus Disease")

      // Removes condition from valueset
      cy.get('[aria-label="Remove California Serogroup Virus Disease"]').click()
      cy.get('body').click(0,0, {force: true}); // For bluring the element
      cy.get('[id="condition-selector-2.16.840.1.113762.1.4.1146.360"]').should('not.include.text', "California Serogroup Virus Disease")
    });

    it("Creates approval for draft library and release", () => {
      // View first draft program
      cy.get('[data-column-id="1"]')
        .contains("DRAFT")
        .parents("div")
        .parents("div")
        .first()
        .click(50, 0, { force: true });

      cy.get("#approve").click();
      
      // Fill out Approval form
      cy.get("#text").clear().type("This is a test approval");
      cy.get("#reference").clear().type("http://example.com");
      cy.get("#submit-approve").click();

      cy.get(`#cell-1-comment_${moment().utc().format("YYYY-MM-DD")}_0`).should("exist");
      cy.get(`#cell-5-comment_${moment().utc().format("YYYY-MM-DD")}_0`).contains('johndoe@test.com')
      // Navigate back to program view
      cy.get('#breadcrumb-programs').click();
      cy.get('[data-button-context="mustApproveRelease-draft"]').first().click();
      cy.get('#releaseLabel').clear().type("1.1.0");
      cy.get('[data-modal="confirm"]').click();

      // cy.wait(60000); // If you are running this test right after drafting then you will need to await draft to finish background work.
      cy.get('[data-column-id="1"]').should("not.exist", "DRAFT")
      cy.get('[data-button-context="mustApproveRelease-active"]').first().should("exist")
    });
    it("Downloads a JSON bundle using the Export button", () => {
      // click on the first Draft Library on the programs page
      cy.get('[data-column-id="1"]')
        .contains("DRAFT")
        .parents("div")
        .parents("div")
        .first()
        .click(50, 0, { force: true });
      // click the Export button
      cy.get('button').contains('Export').click()
      // click the Download button
      cy.get('button').contains('Download').click()
      // file path is relative to the working folder
      const filename = path.join(downloadsFolder, 'undefined-bundle.json')
      cy.readFile(filename, { timeout: 30000 })
      // actually checking contents is memory intensive
      //.should('have.a.property','resourceType')
    });

    it("Downloads an XML bundle using the Export button", () => {
      // click on the first Draft Library on the programs page
      cy.get('[data-column-id="1"]')
        .contains("DRAFT")
        .parents("div")
        .parents("div")
        .first()
        .click(50, 0, { force: true });
      // click the Export button
      cy.get('button').contains('Export').click()
      // tick the XML checkbox
      cy.get('span').contains('XML').parents('label').click()
      // click the Download button
      cy.get('button').contains('Download').click()
      // file path is relative to the working folder
      const filename = path.join(downloadsFolder, 'undefined-bundle.xml')
      cy.readFile(filename, { timeout: 30000 })
      // actually checking contents is memory intensive
      //.should('have.length.gt',50).and('contain.text','<')
    });
  });
});
