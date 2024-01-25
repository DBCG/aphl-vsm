import moment from "moment";
import path from "path";
const downloadsFolder = Cypress.config('downloadsFolder')
const deleteDownloadsFolder = () => {
  cy.task('deleteFolder', downloadsFolder)
}

const clickDraftProgramRow = () => {
  cy.get('[data-column-id="1"]')
  .contains("DRAFT")
  .parents("div")
  .parents("div")
  .parents("div")
  .first()
  .click(200,0, { force: true });
}

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
      cy.wait(3000)
      cy.get('[data-button-context="clone-active"]').first().click();
      cy.get('[data-modal="confirm"]').click();
      cy.get('[data-modal="confirm"]').should("not.exist"); // Wait for draft operation to finish
      cy.get('[data-column-id="1"]').first().scrollIntoView()
      cy.get('[data-column-id="1"]').contains("DRAFT").should("be.visible");
    });

    it("Edit Program Metadata", () => {
      clickDraftProgramRow()
      cy.get("#edit-metadata").click();
      // Set program metadata values
      cy.get("#prog-title").clear().type("Draft Library");
      cy.get("#prog-desc").clear().type("Draft Library description");
      cy.get(".date-input button").click();
      cy.get("button").contains('Today').click();
      cy.get("span").contains('Experimental?').click();
      cy.get("#prog-release-desc").clear().type("this is a release description for the draft library");
      cy.intercept("PUT", "**/api/programs/*").as("updateProgramMetadata");
      cy.get("#edit-metadata-save").click();
      cy.wait("@updateProgramMetadata");
      cy.reload();

      // Run assertions to check for persistence after reload
      cy.get("#prog-title").should("have.value", "Draft Library");
      cy.get("#prog-version").should("have.value", "1.1.0.0-draft");
      cy.get("#prog-desc").should("have.value", "Draft Library description");
      cy.get("#experimental-indicator input").should("not.be.checked");
      cy.get("#prog-release-desc").should("have.value", "this is a release description for the draft library");
      cy.get("#effectiveStartDate").should("have.value", moment().format("YYYY-MM-DD")).should("be.visible");
    });

    it("Adds a manifest to library", () => {
      clickDraftProgramRow()

      cy.get("#edit-manifest").click();
      cy.get("#code-system-selector").click();
      cy.get("#react-select-3-listbox").contains("ICD10CM").click();

      // Add the manifests
      cy.get('[data-add-manifest="http://hl7.org/fhir/sid/icd-10-cm|2022"]').click();
      cy.get('[data-delete-manifest="http://hl7.org/fhir/sid/icd-10-cm|2022"]').should("exist");

      // can only add one manifest of the same codesystem at a time
      cy.get('[data-add-manifest="http://hl7.org/fhir/sid/icd-10-cm|2020"]').should("be.disabled");

      // // Delete one of the manifests
      // cy.get('[data-delete-manifest="http://hl7.org/fhir/sid/icd-10-cm|2022"]').click();
      // cy.get('[data-modal="yes"]').click();

      // Check that the one not added is on the available version manifest list
      cy.get('[data-add-manifest="http://hl7.org/fhir/sid/icd-10-cm|2020"]').should("exist");

      cy.get("#back-to-program").click();

      // Check that the manifest had been added to the program table
      cy.get('[id="cell-1-http://hl7.org/fhir/sid/icd-10-cm|2022"]').contains("ICD10CM").should("exist");
      cy.get('[id="cell-2-http://hl7.org/fhir/sid/icd-10-cm|2022"]')
        .contains("http://hl7.org/fhir/sid/icd-10-cm")
        .should("exist");
      cy.get('[id="cell-3-http://hl7.org/fhir/sid/icd-10-cm|2022"]').contains("2022").should("exist");
    });

    it("Creates, Edits, and Deletes new grouper", () => {
      clickDraftProgramRow()

      cy.get("#create-new-grouper").click();

      cy.get("#title").clear().type("excellent title for grouper");
      cy.get("#purpose").clear().type("To group valuesets together");
      cy.get("#author").clear().type("test author");
      cy.get("#publisher").clear().type("test publisher");
      cy.get("#description").clear().type("a description of the grouper");

      // vsac search for valuesets
      cy.get("#vs-search").type("diabetes");
      cy.get("#submit-search-valueset-button").click();
      cy.get('[name="select-all-rows"]').click();
      cy.get("#add-valueset-to-program").click();

      cy.get("#submit-grouper-creation").click();
      // Do some assertions on Program Detail View Page
      cy.get('[data-column-id="1"]').contains("excellent title for grouper").should("exist");
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
      clickDraftProgramRow()

      // Now remove newly created grouper
      cy.get('[data-button-context="delete"]').last().click();
      cy.get('[data-modal="yes"]').click();
      cy.get('[data-column-id="1"]').contains("Excellent_title_for_grouper").should("not.exist");
    });

    it("Adds a new valueset to multiple program groupers then removes it", () => {
      clickDraftProgramRow()

      cy.get("#view-valuesets").click();
      cy.get("#add-valueset").click();

      // vsac search for valuesets
      cy.get("#vs-search").type("brain");
      cy.get("#submit-search-valueset-button").click();
      cy.get(".rdt_TableBody input").first().click();

      // Set alias for oid
      cy.get('.rdt_TableBody [data-column-id="5"]')
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
        cy.get('.rdt_TableBody [data-column-id="5"]').first().contains(vsId).should("exist");

        // navigate back to program view
        cy.get("#breadcrumb-programs").click();
        clickDraftProgramRow()

        // Check grouper to see if version exists
        cy.get("@grouper1").then((grouper1) => {
          cy.get("#grouper-overview-table .rdt_TableBody").contains(grouper1).first().click(200,10, { force: true });
        });
        cy.wait(3000) // Wait for valueset to load due to async nature of the call above
        cy.get('[data-column-id="3"]').contains(`http://cts.nlm.nih.gov/fhir/ValueSet/${vsId}`).should("exist");

        // navigate back to program view
        cy.go("back");

        // // Check second grouper to see if version exists
        cy.get("@grouper2").then((grouper2) => {
          cy.get("#grouper-overview-table .rdt_TableBody").contains(grouper2).first().click(200,10, { force: true });
        });
        cy.wait(3000)

        cy.get('[data-column-id="3"]').contains(`http://cts.nlm.nih.gov/fhir/ValueSet/${vsId}`).should("exist");

        // Remove same leaf from program
        cy.go("back");

        cy.get("#view-valuesets").click();
        // second checkbox to delete
        cy.get('input[type="checkbox"]').eq(1).check({ force: true })
        // cy.get(`[data-remove-grouper-vs="http://cts.nlm.nih.gov/fhir/ValueSet/${vsId}`).click({ force: true });
        cy.get('[data-action="delete"]').click();
        cy.wait(100)
        cy.get('[data-modal="yes"]').click();
        // extra one just to get it working again
        cy.get('[data-modal="yes"]').first().click();
        cy.go("back");

        // Check grouper to see valueset has been removed
        cy.get("@grouper1").then((grouper1) => {
          cy.get("#grouper-overview-table .rdt_TableBody").contains(grouper1).first().click(200,10, { force: true });
          cy.get('#page-title').contains(grouper1).should("exist")
        });
        cy.wait(3000)

        cy.get('[data-column-id="3"]').contains(`https://cts.nlm.nih.gov/fhir/ValueSet/${vsId}`).should("not.exist");

        // navigate back to program view
        cy.go("back");

        // Check second grouper to see valueset has been removed
        cy.get("@grouper2").then((grouper2) => {
          cy.get("#grouper-overview-table .rdt_TableBody").contains(grouper2).first().click(200,10, { force: true });
          cy.get('#page-title').contains(grouper2).should("exist")
        });
        cy.wait(3000)

        cy.get('[data-column-id="3"]').contains(`https://cts.nlm.nih.gov/fhir/ValueSet/${vsId}"]`).should("not.exist");
      });
    });

    it("Ability to filter Valuesets by OID, Name, or Version", () => {
      clickDraftProgramRow()

      cy.get("#view-valuesets").click();
      // Search By Name
      cy.get('[data-column-id="vs-title-search"] input').clear().type("covid");
      cy.get('[data-column-id="vs-title-search"]').contains("COVID_19 (Tests for SARS_CoV_2 by Culture and Identification Method)")
      cy.get('[data-column-id="vs-title-search"] input').clear()

      // Search By OID
      cy.get('[data-column-id="vs-oid-search"] input').clear().type("2.16.840.1.113762.1.4.1146.481");
      cy.get('[data-column-id="vs-title-search"]').contains("Anthrax (Tests for Bacillis anthracis Antibody)").should("exist");
      cy.get('[data-column-id="vs-oid-search"] input').clear();
    })

    it("Sets Priority on a valueset", {scrollBehavior: false}, () => {
      clickDraftProgramRow()
      cy.get("#view-valuesets").click();
      cy.wait(1000)
      cy.get("#vs-table-detail").children().eq(1).scrollTo("topLeft", {duration: 500})

      // changes this valueset's priority from emergent to routine
      cy.get('[id="cell-value-set-priority-http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1506-20220118-0"]').should('include.text', 'Emergent')
      cy.get('[id="cell-value-set-priority-http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1506-20220118-0"]').click()

      cy.get('#react-select-priority-selector-option-1').click()
      cy.get('[id="cell-value-set-priority-http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1506-20220118-0"]').should('not.include.text', 'Emergent')
    });

    it("Adds and Removes conditions from valuesets", {scrollBehavior: false}, () => {
      clickDraftProgramRow()

      cy.get("#view-valuesets").click();
      cy.wait(1000)
      cy.get("#vs-table-detail").children().eq(1).scrollTo("topLeft", {duration: 500})

      cy.get('[id="react-select-condition-selector-placeholder"]').first().click({ force: true })

      // Removing last condition on valueset should not break page
      cy.get("#react-select-condition-selector-listbox").contains("Acanthamoeba").click()
      cy.get('[id="condition-selector-2.16.840.1.113762.1.4.1146.1506"]').should('include.text', "Acanthamoeba")
      cy.get('[id="condition-selector-2.16.840.1.113762.1.4.1146.1506"]').should('exist')
      cy.get('[aria-label="Remove Acanthamoeba"]').first().click({force: true})
      cy.get('[id="condition-selector-2.16.840.1.113762.1.4.1146.1506"]').should('not.include.text', "Acanthamoeba")


      // add it back because conditions cannot be empty for release
      cy.get('[id="react-select-condition-selector-placeholder"]').first().click({ force: true })
      cy.get("#react-select-condition-selector-listbox").contains("Acanthamoeba").click()
      cy.get('[id="condition-selector-2.16.840.1.113762.1.4.1146.1506"]').should('include.text', "Acanthamoeba")
    });


    it("Creates approval for draft library and release", () => {
      // View first draft program
      clickDraftProgramRow()

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
      cy.get('#releaseDescription').clear().type("description");
      cy.get('[data-modal="next"]').click();
      cy.get('[data-modal="confirm"]').click();

      // cy.wait(60000); // If you are running this test right after drafting then you will need to await draft to finish background work.
      cy.get('[data-column-id="1"]').contains("DRAFT").should("not.exist")
      cy.get('[data-button-context="mustApproveRelease-active"]').first().should("exist")
    });

    it("Downloads a JSON bundle using the Export button", () => {
      // click on the first Draft Library on the programs page
      cy.get('[data-column-id="3"]')
        .contains("Specification Library")
        // .parents("div")
        // .parents("div")
        // .first()
        .click(200,0, { force: true });
      // click the Export button
      cy.get('button').contains('Export').click()
      // if we don't wait here the program data is lost somewhere
      cy.wait(3000)
      // click the Download button
      cy.get('button').contains('Download').click()
      // file path is relative to the working folder
      const filename = path.join(downloadsFolder, 'SpecificationLibrary-bundle.json')
      cy.readFile(filename, { timeout: 30000 }).should('exist')
      // actually checking contents is memory intensive
      //.should('have.a.property','resourceType')
      deleteDownloadsFolder()
    });

    it("Downloads an XML bundle using the Export button", () => {
      // click on the first Draft Library on the programs page
      cy.get('[data-column-id="1"]')
        .contains("ACTIVE")
        .parents("div")
        .parents("div")
        .parents("div")
        .first()
        .click(200,0, { force: true });
      // click the Export button
      cy.get('button').contains('Export').click()
      // if we don't wait here the program data is lost somewhere
      cy.wait(3000)
      // move the toggle to XML
      cy.get('[data-switch="file-type"]').click()
      // click the Download button
      cy.get('button').contains('Download').click()
      // file path is relative to the working folder
      const filename = path.join(downloadsFolder, 'Draft-Library-bundle.xml')
      cy.readFile(filename, { timeout: 30000 })
      // actually checking contents is memory intensive
      //.should('have.length.gt',50).and('contain.text','<')
      deleteDownloadsFolder()
    });
  });
});
