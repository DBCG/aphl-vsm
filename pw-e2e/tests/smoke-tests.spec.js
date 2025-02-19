import { test, expect } from "@playwright/test";

let appUrl = "http://localhost:3000";
if (process.env.CI) {
  appUrl = process.env.VSM_APP_URL;
}

async function login(page) {
  await page.goto(appUrl);
  await page.getByRole("button", { name: "Sign in" }).click();
  if (process.env.CI) {
    await page.getByRole("textbox", { name: "Email" }).click();
    await page.getByRole("textbox", { name: "Email" }).fill("johndoe@test.com");
    await page.getByRole("textbox", { name: "Email" }).press("Tab");
  } else {
    await page.getByRole("textbox", { name: "Username or email" }).click();
    await page.getByRole("textbox", { name: "Username or email" }).fill("johndoe");
    await page.getByRole("textbox", { name: "Username or email" }).press("Tab");
  }
  await page.getByRole("textbox", { name: "Password" }).fill("password");
  await page.getByRole("button", { name: "Sign In" }).click();
}

// test("Enters Setup Credentials for VSAC", async ({ page }) => {
//   await login(page);
//   await page.getByRole("button", { name: "+ Add Credentials" }).click();
//   await page.getByRole("textbox", { name: "Username" }).click();
//   await page.getByRole("textbox", { name: "Username" }).fill("admin");
//   await page.getByRole("textbox", { name: "Password" }).click();
//   await page.getByRole("textbox", { name: "Password" }).fill("d94c5044-3010-4adb-8df3-27b0bd4721f7");
//   await page.getByRole("button", { name: "Update Credentials" }).click();
//   await page.getByRole("link", { name: "Home" }).click();
//   await expect(page.getByRole("button", { name: "Select 2 Programs to Compare" })).toHaveCount(1);
// });

test.describe.serial("Smoke Tests", () => {
  test("Creates a draft program", async ({ page }) => {
    await login(page);
    await page.getByTestId("expander-button-SpecificationLibrary").click();
    await page.getByRole("button", { name: "Clone" }).click();
    await page.getByRole("button", { name: "YES, clone" }).click();
    await expect(page.getByRole("cell", { name: "DRAFT", exact: true }).locator("div").first()).toHaveCount(1);
  });

  test("Edit Program Metadata", async ({ page }) => {
    await login(page);
    await page.getByTestId("text-link").first().click();
    await page.getByRole("button", { name: "Edit Metadata" }).click();

    const titleField = page.getByRole("textbox", { name: "Title" });
    await titleField.click();
    await titleField.clear();
    await titleField.fill("test update");

    await page.getByRole("button", { name: "Choose date" }).click();
    await page.waitForTimeout(1000); // Wait for the date picker to open fully
    await page.getByRole("button", { name: "Today", exact: true }).click();

    const descriptionField = await page.getByRole("textbox", { name: "Description", exact: true });
    await descriptionField.click();
    await descriptionField.clear();
    await descriptionField.fill("new description");

    const releaseDescriptionField = await page.getByRole("textbox", { name: "Release Description" });
    await releaseDescriptionField.click();
    await releaseDescriptionField.clear();
    await releaseDescriptionField.fill("release description");

    await page.getByRole("checkbox", { name: "Experimental?" }).check();
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(titleField).toHaveValue("test update");
    await expect(descriptionField).toHaveValue("new description");
    await expect(releaseDescriptionField).toHaveValue("release description");
    await expect(page.getByRole("checkbox", { name: "Experimental?" })).toBeChecked();

    const today = new Date();
    const formattedDate =
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0");

    await expect(page.getByRole("textbox", { name: "Effective Start Date" })).toHaveValue(formattedDate);
  });

  test("Adds a manifest to program", async ({ page }) => {
    await login(page);
    await page.getByTestId("text-link").first().click();
    await page.getByRole("button", { name: "Edit Manifest" }).click();
    await page.locator("#code-system-selector svg").click();
    await page.getByText("ICD10CM").click();
    await page
      .getByRole("row", { name: "ICD10CM http://hl7.org/fhir/sid/icd-10-cm 2022 Add" })
      .getByRole("button")
      .click();
    // can only add one manifest of the same codesystem at a time
    await expect(
      page.getByRole("row", { name: "ICD10CM http://hl7.org/fhir/sid/icd-10-cm 2020 Add" }).getByRole("button")
    ).toBeDisabled();

    // Check that the one not added is on the available version manifest list
    await expect(page.locator('[data-add-manifest="http://hl7.org/fhir/sid/icd-10-cm|2022"]')).toHaveCount(0);
    await page.waitForTimeout(1000); // Wait for data to save
    await page.getByRole("button", { name: "← Back to program" }).click();

    // Check that the manifest had been added to the program table
    await expect(page.locator(`[id="cell-3-http://hl7.org/fhir/sid/icd-10-cm|2022"]`)).toHaveCount(1);
  });

  test("Creates, Edits, and Deletes new grouper", async ({ page }) => {
    await login(page);
    await page.getByTestId("text-link").first().click();

    // Create New Grouper
    await page.getByRole("button", { name: "Create New Grouper" }).click();
    await page.getByRole("textbox", { name: "Title Title" }).click();
    await page.getByRole("textbox", { name: "Title Title" }).fill("excellent title for grouper");
    await page.getByRole("textbox", { name: "Purpose Purpose" }).click();
    await page.getByRole("textbox", { name: "Purpose Purpose" }).fill("To group valuesets together");
    await page.getByRole("textbox", { name: "Author Author" }).fill("test author");
    await page.getByRole("textbox", { name: "Publisher/Steward Publisher/" }).click();
    await page.getByRole("textbox", { name: "Publisher/Steward Publisher/" }).fill("test publisher");
    await page.getByRole("textbox", { name: "Description Description" }).click();
    await page.getByRole("textbox", { name: "Description Description" }).fill("a description of the grouper");
    await page
      .locator("div")
      .filter({ hasText: /^Terminology SourceSelect\.\.\.$/ })
      .locator("svg")
      .click();
    await page.getByText("VSAC", { exact: true }).click();
    await page.getByRole("textbox", { name: "Search Text" }).click();
    await page.getByRole("textbox", { name: "Search Text" }).fill("diabetes");
    await page.getByRole("button", { name: "search" }).click();
    await page.getByRole("checkbox", { name: "select-all-rows" }).check();
    await page.getByText("* This search will only").click();
    await page
      .locator("div")
      .filter({ hasText: /^ConditionsSelect\.\.\.$/ })
      .locator("svg")
      .click();
    await page.getByText("Anaplasmosis").click();
    await page.getByRole("button", { name: "Add Selected To Program" }).click();
    await page.getByRole("button", { name: "SUBMIT" }).click();

    await page.waitForLoadState("networkidle");
    await expect(page.getByText("http://ersd.aimsplatform.org/fhir/ValueSet/ExcellentTitleForGrouper")).toBeVisible({
      timeout: 30000,
    });

    // Edit Grouper
    await page.getByRole("link", { name: "ExcellentTitleForGrouper" }).click();

    await page.getByRole("button", { name: "Edit Metadata" }).click();

    // TODO: Sometimes for some reason you have to click twice. This is a workaround
    try {
      await page.getByRole("button", { name: "Edit Metadata" }).click({ timeout: 20000 });
    } catch (error) {
      console.error("Second Click failed, but continuing execution:", error);
    }

    await page.getByRole("textbox", { name: "Grouper Title" }).click();
    await page.getByRole("textbox", { name: "Grouper Title" }).fill("test-title");
    await page.getByRole("textbox", { name: "Publisher" }).click();
    await page.getByRole("textbox", { name: "Publisher" }).fill("test-publisher2");
    await page.getByRole("textbox", { name: "Author" }).click();
    await page.getByRole("textbox", { name: "Author" }).fill("test-author2");
    await page.getByRole("textbox", { name: "Purpose" }).click();
    await page.getByRole("textbox", { name: "Purpose" }).fill("test purpose 2");
    await page.getByRole("textbox", { name: "Description" }).clear();
    await page.getByRole("textbox", { name: "Description" }).click();
    await page.getByRole("textbox", { name: "Description" }).fill("test description 2");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await page.waitForTimeout(10000);

    // Check that the metadata was updated
    await expect(page.getByRole("textbox", { name: "Grouper Title" })).toHaveValue("test-title");
    await expect(page.getByRole("textbox", { name: "Publisher" })).toHaveValue("test-publisher2");
    await expect(page.getByRole("textbox", { name: "Author" })).toHaveValue("test-author2");
    await expect(page.getByRole("textbox", { name: "Purpose" })).toHaveValue("test purpose 2");
    await expect(page.getByRole("textbox", { name: "Description" })).toHaveValue("test description 2");

    // Navigate back to program view
    await page.goBack({ waitUntil: "load" });
    await expect(page.getByText("test-title")).toHaveCount(1);

    // Now remove newly created grouper
    await page.getByRole("row", { name: "ExcellentTitleForGrouper test" }).getByLabel("delete").click();
    await page.getByRole("button", { name: "YES" }).click();
    await page.waitForTimeout(1000); // Wait for data load

    // Check that the grouper had been removed
    await expect(page.getByText("test-title")).toHaveCount(0);
  });

  test("Adds a new valueset to multiple program groupers then removes it", async ({ page }) => {
    await login(page);
    await page.getByTestId("text-link").first().click();

    // vsac search for valuesets
    await page.getByRole("button", { name: "View ValueSets" }).click();
    await page.getByRole("button", { name: "Add Valuesets" }).click();
    await page.getByRole("textbox", { name: "Search Text" }).click();
    await page.getByRole("textbox", { name: "Search Text" }).fill("brain");
    await page.getByRole("button", { name: "search", exact: true }).click();
    await page.getByRole("checkbox", { name: "select-row-2.16.840.1.113762.1.4.1146.2217-" }).check();
    await page
      .locator("div")
      .filter({ hasText: /^ConditionsSelect\.\.\.$/ })
      .locator("svg")
      .click();
    await page.getByText("Acute Flaccid Myelitis (AFM)").click();

    await page.locator("#react-select-search-page-groups-input").click();
    await page.getByText("Diagnosis_Problem Triggers for Public Health Reporting", { exact: true }).click();
    await page.locator("#react-select-search-page-groups-input").click();
    await page.getByText("Organism_Substance Release Triggers for Public Health Reporting", { exact: true }).click();
    await page.getByRole("button", { name: "Add Selected To Program" }).click();
    await page.getByRole("button", { name: "close" }).click(); // close notification
    await page.waitForTimeout(1000); // Wait for data load

    await page.locator("#breadcrumb-programs", { exact: true }).click();
    await page.waitForTimeout(1000); // Wait for data load
    await page.getByTestId("text-link").first().click();

    // Check First Grouper to see if leaf exists
    await page.getByRole("link", { name: "Diagnosis_ProblemTriggersforPublicHealthReporting" }).click();
    await page.getByRole("textbox", { name: "Filter by canonical" }).dblclick();
    await page.getByRole("textbox", { name: "Filter by canonical" }).fill("2.16.840.1.113762.1.4.1146.2217");
    await expect(page.getByText("http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.2217")).toHaveCount(1);

    await page.goBack();
    // Select second grouper to see if leaf exists
    await page.waitForTimeout(1000); // Wait for data load
    await page.getByRole("link", { name: "Organism_SubstanceReleaseTriggersforPublicHealthReporting" }).click();
    await page.getByRole("textbox", { name: "Filter by canonical" }).dblclick();
    await page.getByRole("textbox", { name: "Filter by canonical" }).fill("2.16.840.1.113762.1.4.1146.2217");
    await expect(page.getByText("http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.2217")).toHaveCount(1);

    // Remove same leaf from program
    await page.goBack();

    // Check grouper to see valueset has been removed
    await page.getByRole("button", { name: "View ValueSets" }).click();
    await page
      .getByRole("row", { name: "select-row-http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.2217" })
      .getByLabel("Remove Diagnosis Problem")
      .click();

    await page.waitForTimeout(30000);

    await page.goto(appUrl);
    await page.getByTestId("text-link").first().click();

    // TODO: We need to refactor the backend, so that the leaf valueset is removed more quickly.

    await page.getByRole("link", { name: "Diagnosis_ProblemTriggersforPublicHealthReporting" }).click();
    await page.getByRole("textbox", { name: "Filter by canonical" }).dblclick();
    await page.getByRole("textbox", { name: "Filter by canonical" }).fill("2.16.840.1.113762.1.4.1146.2217");
    await expect(page.getByText("http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.2217")).toHaveCount(0);

    // Ensure second grouper still has the leaf
    await page.goBack();
    await page.getByRole("link", { name: "Organism_SubstanceReleaseTriggersforPublicHealthReporting" }).click();
    await page.getByRole("textbox", { name: "Filter by canonical" }).dblclick();
    await page.getByRole("textbox", { name: "Filter by canonical" }).fill("2.16.840.1.113762.1.4.1146.2217");
    await expect(page.getByText("http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.2217")).toHaveCount(1);
  });

  test("Adds a leaf valueset to grouper twice without duplicating", async ({ page }) => {
    await login(page);
    await page.getByTestId("text-link").first().click();

    // vsac search for valuesets
    await page.getByRole("button", { name: "View ValueSets" }).click();
    await page.getByRole("button", { name: "Add Valuesets" }).click();
    await page.getByRole("textbox", { name: "Search Text" }).click();
    await page.getByRole("textbox", { name: "Search Text" }).fill("brain");
    await page.getByRole("button", { name: "search", exact: true }).click();
    await page.getByRole("checkbox", { name: "select-row-2.16.840.1.113762.1.4.1146.2216-" }).check();
    await page
      .locator("div")
      .filter({ hasText: /^ConditionsSelect\.\.\.$/ })
      .locator("svg")
      .click();
    await page.getByText("Acute Flaccid Myelitis (AFM)").click();

    await page.locator("#react-select-search-page-groups-input").click();
    await page.getByText("Diagnosis_Problem Triggers for Public Health Reporting", { exact: true }).click();
    await page.locator("#react-select-search-page-groups-input").click();
    await page.getByText("Organism_Substance Release Triggers for Public Health Reporting", { exact: true }).click();
    await page.getByRole("button", { name: "Add Selected To Program" }).click();
    await page.getByRole("button", { name: "close" }).click(); // close notification
    await page.waitForTimeout(1000); // Wait for data load

    // Add same leaf valueset again and ensure only one exists on grouper

    // vsac search for valuesets
    await page.getByRole("button", { name: "Add Valuesets" }).click();
    await page.getByRole("textbox", { name: "Search Text" }).click();
    await page.getByRole("textbox", { name: "Search Text" }).fill("brain");
    await page.getByRole("button", { name: "search", exact: true }).click();
    await page.getByRole("checkbox", { name: "select-row-2.16.840.1.113762.1.4.1146.2216-" }).check();
    await page
      .locator("div")
      .filter({ hasText: /^ConditionsSelect\.\.\.$/ })
      .locator("svg")
      .click();
    await page.getByText("Acute Flaccid Myelitis (AFM)").click();

    await page.locator("#react-select-search-page-groups-input").click();
    await page.getByText("Diagnosis_Problem Triggers for Public Health Reporting", { exact: true }).click();

    await page.getByRole("button", { name: "Add Selected To Program" }).click();
    await page.getByRole("button", { name: "close" }).click(); // close notification
    await page.waitForTimeout(1000); // Wait for data load

    await page.locator("#breadcrumb-programs", { exact: true }).click();
    await page.waitForTimeout(1000); // Wait for data load
    await page.getByTestId("text-link").first().click();

    // Check First Grouper to see if leaf exists
    await page.getByRole("link", { name: "Diagnosis_ProblemTriggersforPublicHealthReporting" }).click();
    await page.getByRole("textbox", { name: "Filter by canonical" }).dblclick();
    await page.getByRole("textbox", { name: "Filter by canonical" }).fill("2.16.840.1.113762.1.4.1146.2216");
    await expect(page.getByText("http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.2216")).toHaveCount(1);
  });

  test("Sets Priority on a valueset", async ({ page }) => {
    await login(page);
    await page.getByTestId("text-link").first().click();
    await page.getByRole("button", { name: "View ValueSets" }).click();
    await expect(
      page.locator(
        '[id="cell-value-set-priority-http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.2217-20240123-0"]'
      )
    ).toHaveText("Routine");
    await page
      .locator(
        '[id="cell-value-set-priority-http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.2217-20240123-0"] .priority-selector__control'
      )
      .click({ force: true });
    await page.getByText("Emergent", { exact: true }).click();
    await expect(
      page.locator(
        '[id="cell-value-set-priority-http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.2217-20240123-0"]'
      )
    ).toHaveText("Emergent");
  });

  test("Adds and Removes conditions from valuesets", async ({ page }) => {
    await login(page);
    await page.getByTestId("text-link").first().click();
    await page.getByRole("button", { name: "View ValueSets" }).click();

    await page.locator('[id="condition-selector-2.16.840.1.113762.1.4.1146.1260"] input').click({ force: true });
    await page.getByText("Animal Bite Injury").click();
    await page.waitForTimeout(10000);
    await expect(page.getByText("Animal Bite Injury")).toHaveCount(1);

    await page.getByRole("button", { name: "Remove Animal Bite Injury" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Animal Bite Injury")).toHaveCount(0);
  });

  // TODO: wait until condition issue is fixed
  // test("Creates approval for draft library and release", async ({ page }) => {
  //   await login(page);
  //   const packageId = await page.getByTestId("text-link").first().textContent();
  //   await expect(page.getByText("DRAFT", { exact: true })).toHaveCount(1);

  //   await page.getByTestId("text-link").first().click();
  //   await page.getByRole("button", { name: "Approve Now!" }).click();
  //   await page.getByRole("textbox", { name: "Text" }).click();
  //   await page.getByRole("textbox", { name: "Text" }).fill("approval text");
  //   await page.getByRole("textbox", { name: "Reference" }).click();
  //   await page.getByRole("textbox", { name: "Reference" }).fill("http://www.example.com");
  //   await page.getByRole("button", { name: "Submit" }).click();

  //   await page.waitForTimeout(5000); // Wait for data load
  //   await page.reload({ waitUntil: "domcontentloaded" });

  //   await expect(page.getByText("johndoe@test.com")).toHaveCount(1);
  //   await expect(page.getByText("approval text")).toHaveCount(1);
  //   await expect(page.getByText("http://www.example.com")).toHaveCount(1);

  //   await page.locator("#breadcrumb-programs", { exact: true }).click();
  //   await page.waitForTimeout(5000); // Wait for data load

  //   await page.getByTestId(`expander-button-${packageId}`).click();
  //   await page.getByRole("button", { name: "Release" }).click();
  //   await page.getByRole("textbox", { name: "Description of Release" }).click();
  //   await page.getByRole("textbox", { name: "Description of Release" }).fill("release description");
  //   await page.getByRole("textbox", { name: "Label for Release" }).click();
  //   await page.getByRole("textbox", { name: "Label for Release" }).fill("release label");
  //   await page.getByRole("textbox", { name: "Effective Start Date *" }).click();
  //   await page.getByRole("button", { name: "Choose date" }).click();
  //   await page.waitForTimeout(5000); // Wait for data load
  //   await page.getByRole("button", { name: "Today", exact: true }).click();
  //   await page.getByRole("button", { name: "Next" }).first().click();
  //   await page.getByRole("button", { name: "RELEASE" }).click();
  //   await page.waitForLoadState("networkidle");
  //   await page.waitForTimeout(10000);
  //   await expect(page.getByText("DRAFT", { exact: true })).toHaveCount(0);
  // });

  test("Retires an active program", async ({ page }) => {
    await login(page);
    await page.getByTestId("expander-button-SpecificationLibrary").click();
    await page.locator("body").press("ControlOrMeta+r");
    await page.locator("body").press("ControlOrMeta+r");
    await page.getByRole("button", { name: "Retire" }).click();
    await page.getByRole("button", { name: "YES, retire" }).click();
    await expect(page.getByText("RETIRED", { exact: true })).toHaveCount(0);
    await page.getByRole("checkbox", { name: "Show retired programs" }).check();
    await expect(page.getByText("RETIRED", { exact: true })).toBeVisible();
  });

  test("Creates provisional valueset and codesystem", async ({ page }) => {
    await login(page);
    await page.waitForTimeout(5000);
    await page.getByRole("tab", { name: "Provisional Resources", exact: true }).click({ force: true });

    // Create new Provisional CodeSystem
    await page.getByRole("button", { name: "+ Create New" }).first().click();
    await page.locator("#code-system-url-selector").click();
    await page.getByText("CPT").click();
    await page.getByRole("textbox", { name: "Code", exact: true }).click();
    await page.getByRole("textbox", { name: "Code", exact: true }).fill("CPTCode");
    await page.getByRole("textbox", { name: "Display" }).click();
    await page.getByRole("textbox", { name: "Display" }).fill("CPTDisplay");
    await page.getByRole("textbox", { name: "Definition (more detail about" }).click();
    await page.getByRole("textbox", { name: "Definition (more detail about" }).fill("CptDefinition");
    await page.getByRole("button", { name: "Add to List" }).click();
    await page.getByRole("button", { name: "ADD TO SYSTEM" }).click();
    await page.waitForTimeout(10000);
    await page.getByRole("link", { name: "provisional" }).click();
    await expect(page.getByText("CPT_provisional")).toHaveCount(1);

    // Create Provisional ValueSet with the newly created CodeSystem
    await page.getByRole("button", { name: "+ Create New" }).nth(1).click();
    await page.getByRole("button", { name: "+ Create New VS" }).click();
    await page.getByRole("textbox", { name: "Title" }).click();
    await page.getByRole("textbox", { name: "Title" }).fill("provsTitle");
    await page.getByRole("textbox", { name: "Author" }).click();
    await page.getByRole("textbox", { name: "Author" }).fill("provsAuthor");
    await page.getByRole("textbox", { name: "Steward" }).click();
    await page.getByRole("textbox", { name: "Steward" }).fill("provsSteward");
    await page.locator("#code-system-url-selector").click();
    await page.getByText("CPT").click();
    await page.getByRole("checkbox", { name: "select-row-CPTCode" }).check();
    await page.getByRole("button", { name: "Add to Staging" }).click();
    await page.getByRole("button", { name: "Create Provisional Value Set" }).click();
    await page.waitForTimeout(10000);
    await page.getByRole("link", { name: "provisional" }).click();

    await expect(page.getByText("provsTitle")).toHaveCount(1);
  });

  test("Update provisional code system and value set", async ({ page }) => {
    await login(page);
    await page.waitForTimeout(5000);
    await page.getByRole("tab", { name: "Provisional Resources", exact: true }).click({ force: true });

    await page.getByRole("row", { name: "CPT_provisional http://ersd." }).getByRole("button").click();
    await page.locator("#cell-4-CPTCode").getByRole("button").click();
    await page.getByLabel("Code", { exact: true }).click();
    await page.getByLabel("Code", { exact: true }).fill("CPTCodeEdit");
    await page.getByRole("textbox", { name: "Update Display" }).click();
    await page.getByRole("textbox", { name: "Update Display" }).fill("CPTDisplayEdit");
    await page.getByRole("textbox", { name: "Update Definition" }).click();
    await page.getByRole("textbox", { name: "Update Definition" }).fill("CptDefinitionEdit");

    await page.getByRole("button", { name: "Save changes" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForTimeout(10000);
    await page.goto(appUrl + "?resourceType=provisional");
    await page.getByRole("row", { name: "provsTitle provsAuthor" }).getByRole("button").click();
    await page.locator('[data-testid*="expander-button-"]').first().click();
    await expect(page.getByText("CPTCodeEdit")).toBeVisible();
    await expect(page.getByText("CPTDisplayEdit")).toBeVisible();
  });
});
