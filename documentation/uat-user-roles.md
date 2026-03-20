# UAT: Sequential Role-Based Testing

## Overview

This script runs as a **single session** from top to bottom, switching users at each
test case. Admin logs in first and verifies the pre-seeded test data, then runs
admin-specific feature tests. Each progressively less capable role then exercises the
data that was prepared in advance.

**Starting state:** programs loaded by `bin/load-data-uat.sh`:

| App name | Version | Status | Purpose |
| --- | --- | --- | --- |
| Specification Library | 2022-11-19 | active | Base program; all roles clone from this |
| Cardiovascular Disease Program | 1.0.0 | draft | Additional seed draft |
| Foodborne Illness Program | 1.0.0 | draft | Additional seed draft |
| Immunization Registry Program | 2.0.0 | active | Visible to Implementers (TC-05) |
| Respiratory Surveillance Program | 1.0.0 | retired | Visible to Implementers with toggle (TC-05) |

> To run this script again after a previous UAT session, see
> [Appendix C: Resetting to Base State](#appendix-c-resetting-to-base-state) at the bottom
> of this document.

### Prerequisites

- `./keycloak/configure` has been run and all five test users exist in Keycloak
- App is running at `http://localhost:3000`
- At least one endpoint is configured in Settings
- `./bin/load-data-uat.sh` has been run — one base program exists (see Starting State above)

---

## Table of Contents

- Test Cases
  - [TC-01 — Admin (`johndoe`)](#tc-01-admin-johndoe)
  - [TC-02 — Publisher (`rachel`)](#tc-02-publisher-rachel)
  - [TC-03 — Editor (`gary`)](#tc-03-editor-gary)
  - [TC-04 — Reviewer (`joybennet`)](#tc-04-reviewer-joybennet)
  - [TC-05 — Implementer (`ann`)](#tc-05-implementer-ann)
- [Pass/Fail Tracking](#passfail-tracking)
- Appendices
  - [Appendix A: Test Users](#appendix-a-test-users)
  - [Appendix B: Accessing Program Actions](#appendix-b-accessing-program-actions)
  - [Appendix C: Resetting to Base State](#appendix-c-resetting-to-base-state)

---

## TC-01 Admin (`johndoe`)

**Goal:** Verify that the Admin role has full access to all program lifecycle actions
(clone, edit, approve, release, retire, delete) and administrative features (API key,
endpoint management). Admin also seeds the test data that later TCs depend on.

**Sign in as `johndoe` / `password`**

> **Pre-condition — Verify pre-seeded programs:** Navigate to the Programs list and confirm
> the following programs are visible (enable **Show retired programs** to see the retired entry):
>
> | Title | Version | Status |
> | --- | --- | --- |
> | Cardiovascular Disease Program | 1.0.0 | draft |
> | Foodborne Illness Program | 1.0.0 | draft |
> | Immunization Registry Program | 2.0.0 | active |
> | Respiratory Surveillance Program | 1.0.0 | retired |
> | Specification Library | 2022-11-19 | active |
>
> If any program is missing, stop and re-run `./bin/load-data-uat.sh` before continuing.

### Step 1 — Verify profile display

1. Click the `MoreVert` (⋮) icon in the top-right corner
2. **Expected:** Username shown (e.g., `Johndoe` or full name)
3. **Expected:** Gray label reading `Admin` appears below the username
4. **Expected:** The following menu items are visible:
   - **API Key** — visible (admin only)
   - **Settings** — visible
   - **Sign Out** — visible

### Step 2 — Clone (for withdraw test)

1. From the Programs page, expand the row for **Specification Library** v2022-11-19
   - **Expected:** Five action buttons are visible:
     - **Clone** — enabled
     - **Release** — visible but disabled (requires draft status with an approval)
     - **Withdraw** — visible but disabled (requires draft status)
     - **Retire** — enabled
     - **Delete** — visible but disabled (requires retired status)
2. Click **Clone**
3. **Expected:** A confirmation pop-up appears — click **YES, CLONE** to proceed
4. **Expected:** A new draft appears in the list

### Step 3 — Withdraw

1. Expand the row for the new draft from Step 2
   - **Expected:** Five action buttons are visible:
     - **Clone** — visible but disabled (requires active status)
     - **Release** — visible but disabled (requires an approval)
     - **Withdraw** — enabled
     - **Retire** — visible but disabled (requires active status)
     - **Delete** — visible but disabled (requires retired status)
2. Click **Withdraw**
3. **Expected:** A confirmation pop-up appears — click **YES, WITHDRAW** to proceed
4. **Expected:** The draft is withdrawn

### Step 4 — Clone (for release flow)

1. From the Programs page, expand the row for **Specification Library** v2022-11-19
   - **Expected:** Five action buttons are visible:
     - **Clone** — enabled
     - **Release** — visible but disabled (requires draft status with an approval)
     - **Withdraw** — visible but disabled (requires draft status)
     - **Retire** — enabled
     - **Delete** — visible but disabled (requires retired status)
2. Click **Clone**
3. **Expected:** A confirmation pop-up appears — click **YES, CLONE** to proceed
4. **Expected:** A new draft appears in the list

### Step 5 — Edit

1. Click the new draft's **ID link** to open the detail page
2. Scroll to the **Program Metadata** section
3. Click the **Edit Metadata** button (bottom of the Program Metadata section)
4. Update the **Title** field to `Program-TC01`
5. Click **Save Changes**
6. **Expected:** Title updated to `Program-TC01`

### Step 6 — Approve

1. Scroll to **Approvals**, click **Approve Now!**, complete and submit the approval form
2. **Expected:** Approval entry recorded in the Approvals table; **Program-TC01** status is now approved

### Step 7 — Release

1. Return to the Programs page, expand the row for **Program-TC01**
   - **Expected:** Five action buttons are visible:
     - **Clone** — visible but disabled (requires active status)
     - **Release** — enabled
     - **Withdraw** — enabled
     - **Retire** — visible but disabled (requires active status)
     - **Delete** — visible but disabled (requires retired status)
2. Click **Release**
3. The Release modal opens with a two-step stepper. Fill in Step 1 — Review Program Details:
   - **Update Program Version** (required): `1.1.0`
   - **Description of Release** (required): `TestCase 01 Program`
   - **Label for Release** (required): `Program-TC01 Release v1.1.0`
   - **Effective Start Date** (required): select today or any future date
   - > **Note:** Do **not** check **Use Terminology Server to Pin Valuesets**
4. Click **Next** → advances to Step 2 — Review Manifest Details
5. Click **RELEASE**
6. **Expected:** Modal closes; the program row shows a spinning circle — this is expected.
   Release runs as a background job and the UI polls for completion every 5 seconds.
   Wait for the spinner to resolve (typically under 30 seconds with the trimmed dataset).
   Once complete, the status chip updates to `active`

### Step 8 — Retire

1. Expand the row for **Program-TC01**
   - **Expected:** Five action buttons are visible:
     - **Clone** — enabled
     - **Release** — visible but disabled (requires draft status with an approval)
     - **Withdraw** — visible but disabled (requires draft status)
     - **Retire** — enabled
     - **Delete** — visible but disabled (requires retired status)
2. Click **Retire**
3. **Expected:** A confirmation pop-up appears — click **YES, RETIRE** to proceed
4. **Expected:** Status changes to `retired`
   > **Note:** Retired programs are hidden by default. Enable the **Show retired programs**
   > toggle above the Programs table to confirm the program now appears with `retired` status.

### Step 9 — Delete

1. Enable the **Show retired programs** toggle above the table
2. Expand the row for **Program-TC01** (retired)
   - **Expected:** Five action buttons are visible:
     - **Clone** — visible but disabled (requires active status)
     - **Release** — visible but disabled (requires draft status with an approval)
     - **Withdraw** — visible but disabled (requires draft status)
     - **Retire** — visible but disabled (requires active status)
     - **Delete** — enabled
3. Click **Delete**
4. **Expected:** A confirmation pop-up appears — click **YES, DELETE** to proceed
5. **Expected:** Program is removed from the Programs list

### Step 10 — API Key access

1. Click the `MoreVert` (⋮) icon and select **API Key**
2. **Expected:** Navigates to `http://localhost:3000/apikey`; API Key page loads; key is displayed or can be generated

### Step 11 — Settings

#### Step 11a — Endpoints

1. Click the `MoreVert` (⋮) icon and select **Settings**
2. **Expected:** **Add New Terminology Endpoint** button is visible
3. **Expected:** Edit and delete actions are present in the endpoint table
4. Add a new endpoint (or edit an existing one), save, then delete it if a test endpoint was created
5. **Expected:** All changes save successfully; endpoint table reflects updates

#### Step 11b — Credentials

1. Expand an endpoint row
2. **Expected:** Credential form is visible and can be saved

**State after TC-01:** v2022-11-19 (active); Program-TC01 created and deleted within TC-01

---

## TC-02 Publisher (`rachel`)

**Goal:** Verify that the Publisher role can perform all program lifecycle actions
(clone, edit, approve, release, retire, delete, withdraw) but cannot manage endpoints.
Publisher uses only fresh clones in this TC — pre-seeded programs are untouched.

**Sign out of `johndoe`. Sign in as `rachel` / `password`**

> **Pre-condition — Verify program state:** Navigate to the Programs list and confirm
> the following programs are visible (enable **Show retired programs** if needed):
>
> | Title | Version | Status |
> | --- | --- | --- |
> | Cardiovascular Disease Program | 1.0.0 | draft |
> | Foodborne Illness Program | 1.0.0 | draft |
> | Immunization Registry Program | 2.0.0 | active |
> | Respiratory Surveillance Program | 1.0.0 | retired |
> | Specification Library | 2022-11-19 | active |
>
> If the state does not match, check that TC-01 completed successfully before continuing.

### Step 1 — Verify profile display

1. Click the `MoreVert` (⋮) icon in the top-right corner
2. **Expected:** Gray label reading `Publisher` appears below the username
3. **Expected:** The following menu items are visible:
   - **API Key** — not visible
   - **Settings** — visible
   - **Sign Out** — visible

### Step 2 — Clone (for withdraw test)

1. Expand the row for **Specification Library** v2022-11-19
   - **Expected:** Five action buttons are visible:
     - **Clone** — enabled
     - **Release** — visible but disabled (requires draft status with an approval)
     - **Withdraw** — visible but disabled (requires draft status)
     - **Retire** — enabled
     - **Delete** — visible but disabled (requires retired status)
2. Click **Clone**
3. **Expected:** A confirmation pop-up appears — click **YES, CLONE** to proceed
4. **Expected:** A new **Specification Library** draft appears in the Programs list

### Step 3 — Withdraw

1. Expand the row for the new draft from Step 2
   - **Expected:** Five action buttons are visible:
     - **Clone** — visible but disabled (requires active status)
     - **Release** — visible but disabled (requires an approval)
     - **Withdraw** — enabled
     - **Retire** — visible but disabled (requires active status)
     - **Delete** — visible but disabled (requires retired status)
2. Click **Withdraw**
3. **Expected:** A confirmation pop-up appears — click **YES, WITHDRAW** to proceed
4. **Expected:** The draft is withdrawn

### Step 4 — Clone (for release flow)

1. Expand the row for **Specification Library** v2022-11-19
   - **Expected:** Five action buttons are visible:
     - **Clone** — enabled
     - **Release** — visible but disabled (requires draft status with an approval)
     - **Withdraw** — visible but disabled (requires draft status)
     - **Retire** — enabled
     - **Delete** — visible but disabled (requires retired status)
2. Click **Clone**
3. **Expected:** A confirmation pop-up appears — click **YES, CLONE** to proceed
4. **Expected:** A new **Specification Library** draft appears in the Programs list

### Step 5 — Edit

1. Click the **ID link** for the draft created in Step 4 to open the detail page
2. Scroll to the **Program Metadata** section
3. **Expected:** The **Effective Start Date** field is blank (expected — clones do not inherit the source program's effective date)
4. Click the **Edit Metadata** button (bottom of the Program Metadata section)
5. Update the **Title** field to `Program-TC02`
6. Set the **Effective Start Date** to today or any future date
7. Click **Save Changes**
8. **Expected:** Title updated to `Program-TC02`; effective start date reflected on the detail page

### Step 6 — Approve

1. Scroll to **Approvals**, click **Approve Now!**
2. Complete and submit the approval form
3. **Expected:** Approval entry recorded in the Approvals table; this draft is now approved

### Step 7 — Release

1. Expand the row for the approved draft from Step 6
   - **Expected:** Five action buttons are visible:
     - **Clone** — visible but disabled (requires active status)
     - **Release** — enabled
     - **Withdraw** — enabled
     - **Retire** — visible but disabled (requires active status)
     - **Delete** — visible but disabled (requires retired status)
2. Click **Release**
3. The Release modal opens with a two-step stepper. Fill in Step 1 — Review Program Details:
   - **Update Program Version** (required): `1.1.0`
   - **Description of Release** (required): `TestCase 02 Program`
   - **Label for Release** (required): `Program-TC02 Release v1.1.0`
   - **Effective Start Date** (required): select today or any future date
   - > **Note:** Do **not** check **Use Terminology Server to Pin Valuesets**
4. Click **Next** → advances to Step 2 — Review Manifest Details
5. Click **RELEASE**
6. **Expected:** Modal closes; the program row shows a spinning circle — this is expected.
   Release runs as a background job and the UI polls for completion every 5 seconds.
   Wait for the spinner to resolve (typically under 30 seconds with the trimmed dataset).
   Once complete, the status chip updates to `active`

### Step 8 — Retire

1. Expand the row for the active program from Step 7
   - **Expected:** Five action buttons are visible:
     - **Clone** — enabled
     - **Release** — visible but disabled (requires draft status with an approval)
     - **Withdraw** — visible but disabled (requires draft status)
     - **Retire** — enabled
     - **Delete** — visible but disabled (requires retired status)
2. Click **Retire**
3. **Expected:** A confirmation pop-up appears — click **YES, RETIRE** to proceed
4. **Expected:** Enable the **Show retired programs** toggle above the table to see the
   retired program; status chip reads `retired`

### Step 9 — Delete

1. Expand the row for the retired program from Step 8
   - **Expected:** Five action buttons are visible:
     - **Clone** — visible but disabled (requires active status)
     - **Release** — visible but disabled (requires draft status with an approval)
     - **Withdraw** — visible but disabled (requires draft status)
     - **Retire** — visible but disabled (requires active status)
     - **Delete** — enabled
2. Click **Delete**
3. **Expected:** A confirmation pop-up appears — click **YES, DELETE** to proceed
4. **Expected:** Program removed from the Programs list

### Step 10 — Settings

#### Step 10a — Endpoints

1. Navigate to `http://localhost:3000/settings/create-endpoint`
2. **Expected:** Redirected to `/programs`
3. Click the `MoreVert` (⋮) icon and select **Settings**
4. **Expected:** Settings page loads; endpoint list visible
5. **Expected:** No **Add New Terminology Endpoint** button; no edit or delete actions in the endpoint table

#### Step 10b — Credentials

1. Expand an endpoint row
2. **Expected:** Credential form is visible and can be saved

**State after TC-02:** unchanged from end of TC-01 — publisher's own clones were created
and cleaned up within this TC

---

## TC-03 Editor (`gary`)

**Goal:** Verify that the Editor role can clone, edit, approve, withdraw, retire, and
delete programs but cannot release. All actions are performed against fresh clones of
the base active program — no pre-seeded programs are required.

**Sign out of `rachel`. Sign in as `gary` / `password`**

> **Pre-condition — Verify program state:** Navigate to the Programs list and confirm
> the following programs are visible (enable **Show retired programs** if needed):
>
> | Title | Version | Status |
> | --- | --- | --- |
> | Cardiovascular Disease Program | 1.0.0 | draft |
> | Foodborne Illness Program | 1.0.0 | draft |
> | Immunization Registry Program | 2.0.0 | active |
> | Respiratory Surveillance Program | 1.0.0 | retired |
> | Specification Library | 2022-11-19 | active |
>
> If the state does not match, check that TC-02 completed successfully before continuing.

### Step 1 — Verify profile display

1. Click the `MoreVert` (⋮) icon in the top-right corner
2. **Expected:** Gray label reading `Editor` appears below the username
3. **Expected:** The following menu items are visible:
   - **API Key** — not visible
   - **Settings** — visible
   - **Sign Out** — visible

### Step 2 — Clone (for withdraw test)

1. Expand the row for **Specification Library** v2022-11-19
   - **Expected:** Four action buttons are visible — no **Release** button (editors cannot release):
     - **Clone** — enabled
     - **Withdraw** — visible but disabled (requires draft status)
     - **Retire** — enabled
     - **Delete** — visible but disabled (requires retired status)
2. Click **Clone**
3. **Expected:** A confirmation pop-up appears — click **YES, CLONE** to proceed
4. **Expected:** A new **Specification Library** draft appears in the Programs list

### Step 3 — Withdraw

1. Expand the row for the new draft from Step 2
   - **Expected:** Four action buttons are visible — no **Release** button:
     - **Clone** — visible but disabled (requires active status)
     - **Withdraw** — enabled
     - **Retire** — visible but disabled (requires active status)
     - **Delete** — visible but disabled (requires retired status)
2. Click **Withdraw**
3. **Expected:** A confirmation pop-up appears — click **YES, WITHDRAW** to proceed
4. **Expected:** The draft is withdrawn

### Step 4 — Clone (for edit/approve flow)

1. Expand the row for **Specification Library** v2022-11-19
   - **Expected:** Four action buttons are visible — no **Release** button (editors cannot release):
     - **Clone** — enabled
     - **Withdraw** — visible but disabled (requires draft status)
     - **Retire** — enabled
     - **Delete** — visible but disabled (requires retired status)
2. Click **Clone**
3. **Expected:** A confirmation pop-up appears — click **YES, CLONE** to proceed
4. **Expected:** A new **Specification Library** draft appears in the Programs list

### Step 5 — Edit

1. Click the **ID link** for the draft created in Step 4 to open the detail page
2. Scroll to the **Program Metadata** section
3. **Expected:** The **Effective Start Date** field is blank (expected — clones do not inherit the source program's effective date)
4. Click the **Edit Metadata** button (bottom of the Program Metadata section)
5. Update the **Title** field to `Program-TC03`
6. Set the **Effective Start Date** to today or any future date
7. Click **Save Changes**
8. **Expected:** Title updated to `Program-TC03`; effective start date reflected on the detail page

### Step 6 — Approve

1. Scroll to **Approvals**, click **Approve Now!**
2. Complete and submit the approval form
3. **Expected:** Approval entry recorded in the Approvals table; **Program-TC03** is now approved

### Step 7 — Verify Release is not available

1. Return to the Programs page, expand the row for **Program-TC03** (approved draft)
   - **Expected:** Four action buttons are visible — no **Release** button:
     - **Clone** — visible but disabled (requires active status)
     - **Withdraw** — enabled
     - **Retire** — visible but disabled (requires active status)
     - **Delete** — visible but disabled (requires retired status)
2. **Expected:** No **Release** button is visible or enabled

### Step 8 — Retire

1. Expand the row for **Specification Library** v2022-11-19 (active)
   - **Expected:** Four action buttons are visible — no **Release** button:
     - **Clone** — enabled
     - **Withdraw** — visible but disabled (requires draft status)
     - **Retire** — enabled
     - **Delete** — visible but disabled (requires retired status)
2. Click **Retire**
3. **Expected:** A confirmation pop-up appears — click **YES, RETIRE** to proceed
4. **Expected:** Enable the **Show retired programs** toggle to confirm the status chip reads `retired`

### Step 9 — Delete

1. Expand the row for **Specification Library** v2022-11-19 (retired)
   - **Expected:** Four action buttons are visible — no **Release** button:
     - **Clone** — visible but disabled (requires active status)
     - **Withdraw** — visible but disabled (requires draft status)
     - **Retire** — visible but disabled (requires active status)
     - **Delete** — enabled
2. Click **Delete**
3. **Expected:** A confirmation pop-up appears — click **YES, DELETE** to proceed
4. **Expected:** Program removed from the Programs list

### Step 10 — Settings

#### Step 10a — Endpoints

1. Navigate to `http://localhost:3000/settings/create-endpoint`
2. **Expected:** Redirected to `/programs`
3. Click the `MoreVert` (⋮) icon and select **Settings**
4. **Expected:** Settings page loads; endpoint list visible
5. **Expected:** No **Add New Terminology Endpoint** button; no edit or delete actions in the endpoint table

#### Step 10b — Credentials

1. Expand an endpoint row
2. **Expected:** Credential form is visible and can be saved

**State after TC-03:** Program-TC03 (approved draft); v2022-11-19 retired and deleted

---

## TC-04 Reviewer (`joybennet`)

**Goal:** Verify that the Reviewer role can approve programs via the detail page but has
no access to any other write actions. The row expand arrow and all lifecycle buttons
(clone, release, withdraw, retire, delete) must not be visible.

**Sign out of `gary`. Sign in as `joybennet` / `password`**

> **Pre-condition — Verify program state:** Navigate to the Programs list and confirm
> the following programs are visible (enable **Show retired programs** if needed):
>
> | Title | Status | Notes |
> | --- | --- | --- |
> | Cardiovascular Disease Program | draft | Seed program (untouched) |
> | Foodborne Illness Program | draft | Seed program (untouched) |
> | Immunization Registry Program | active | Seed program (untouched) |
> | Program-TC03 | draft (approved) | Created by Editor in TC-03 |
> | Respiratory Surveillance Program | retired | Seed program (untouched) |
>
> Specification Library v2022-11-19 should be absent (retired and deleted in TC-03).
> If the state does not match, check that TC-03 completed successfully before continuing.

### Step 1 — Verify profile display

1. Click the `MoreVert` (⋮) icon in the top-right corner
2. **Expected:** Gray label reading `Reviewer` appears below the username
3. **Expected:** The following menu items are visible:
   - **API Key** — not visible
   - **Settings** — visible
   - **Sign Out** — visible

### Step 2 — Verify no row expand arrow

1. Look at any program row in the Programs list
2. **Expected:** No **▶ expand arrow** is visible on any row — Clone, Release, Withdraw,
   Retire, and Delete are inaccessible

### Step 3 — Verify no write actions on the detail page

1. Click the **ID link** for **Program-TC03** to open the detail page
2. **Expected:** No **Edit Metadata** button visible; no write action buttons present
3. **Note:** Copy the URL from the browser address bar and save it — you will need it in
   TC-05 Step 3 to verify that Implementers cannot access draft programs directly

### Step 4 — Approve

1. Scroll to **Approvals**, click **Approve Now!**
2. Complete and submit the approval form
3. **Expected:** A second approval entry recorded in the Approvals table on **Program-TC03**

### Step 5 — Settings

#### Step 5a — Endpoints

1. Navigate to `http://localhost:3000/settings/create-endpoint`
2. **Expected:** Redirected to `/programs`
3. Click the `MoreVert` (⋮) icon and select **Settings**
4. **Expected:** Settings page loads; endpoint list visible
5. **Expected:** No **Add New Terminology Endpoint** button; no edit or delete actions in the endpoint table

#### Step 5b — Credentials

1. Expand an endpoint row
2. **Expected:** Credential form is visible and can be saved

**State after TC-04:** Program-TC03 (doubly approved draft)

---

## TC-05 Implementer (`ann`)

**Goal:** Verify that the Implementer role is strictly read-only. No write actions,
approval buttons, or row expand arrows should be visible anywhere in the application.

**Sign out of `joybennet`. Sign in as `ann` / `password`**

> **Pre-condition — Verify program state:** Program-TC03 (doubly approved draft) exists
> from TC-03 and TC-04.
>
> > **Note:** Implementers cannot view draft programs. Ann will see only the active and
> > retired seed programs — draft programs (Program-TC03, Cardiovascular Disease Program,
> > Foodborne Illness Program) are hidden from Implementers.
>
> If TC-04 did not complete successfully, check before continuing.

### Step 1 — Verify profile display

1. Click the `MoreVert` (⋮) icon in the top-right corner
2. **Expected:** Gray label reading `Implementer` appears below the username
3. **Expected:** The following menu items are visible:
   - **API Key** — not visible
   - **Settings** — visible
   - **Sign Out** — visible

### Step 2 — Verify Programs list shows only active and retired programs

1. Navigate to the Programs list
2. **Expected:** Two programs are visible (no draft programs):
   - **Immunization Registry Program** v2.0.0 — `active`
   - Enable **Show retired programs** toggle → **Respiratory Surveillance Program** v1.0.0 — `retired`
3. **Expected:** No **▶ expand arrow** is visible on any row — Implementers have no write actions

### Step 3 — Verify draft program is inaccessible

1. Attempt to navigate directly to Program-TC03's detail page using its ID link (copy the URL from a previous session or another browser tab signed in as a different user)
2. **Expected:** Page returns an error or access denied — Implementers cannot view draft programs directly

### Step 4 — Settings

#### Step 4a — Endpoints

1. Navigate to `http://localhost:3000/settings/create-endpoint`
2. **Expected:** Redirected to `/programs`
3. Click the `MoreVert` (⋮) icon and select **Settings**
4. **Expected:** Settings page loads; endpoint list visible
5. **Expected:** No **Add New Terminology Endpoint** button; no edit or delete actions in the endpoint table

#### Step 4b — Credentials

1. Expand an endpoint row
2. **Expected:** Credential form is visible and can be saved

**State after TC-05:** unchanged — Implementer is read-only

---

## Pass/Fail Tracking

| Test Case | Step | Tester | Date | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| TC-01 Admin | Pre-condition — Verify seeded programs | | | | |
| TC-01 Admin | 1 Profile display | | | | |
| TC-01 Admin | 2 Clone (withdraw test) | | | | |
| TC-01 Admin | 3 Withdraw | | | | |
| TC-01 Admin | 4 Clone (release flow) | | | | |
| TC-01 Admin | 5 Edit | | | | |
| TC-01 Admin | 6 Approve | | | | |
| TC-01 Admin | 7 Release | | | | |
| TC-01 Admin | 8 Retire | | | | |
| TC-01 Admin | 9 Delete | | | | |
| TC-01 Admin | 10 API Key | | | | |
| TC-01 Admin | 11 Settings | | | | |
| TC-01 Admin | 11a Endpoints | | | | |
| TC-01 Admin | 11b Credentials | | | | |
| TC-02 Publisher | Pre-condition — Verify program state | | | | |
| TC-02 Publisher | 1 Profile display | | | | |
| TC-02 Publisher | 2 Clone (withdraw test) | | | | |
| TC-02 Publisher | 3 Withdraw | | | | |
| TC-02 Publisher | 4 Clone (release flow) | | | | |
| TC-02 Publisher | 5 Edit | | | | |
| TC-02 Publisher | 6 Approve | | | | |
| TC-02 Publisher | 7 Release | | | | |
| TC-02 Publisher | 8 Retire | | | | |
| TC-02 Publisher | 9 Delete | | | | |
| TC-02 Publisher | 10 Settings | | | | |
| TC-02 Publisher | 10a Endpoints | | | | |
| TC-02 Publisher | 10b Credentials | | | | |
| TC-03 Editor | Pre-condition — Verify program state | | | | |
| TC-03 Editor | 1 Profile display | | | | |
| TC-03 Editor | 2 Clone (withdraw test) | | | | |
| TC-03 Editor | 3 Withdraw | | | | |
| TC-03 Editor | 4 Clone (edit/approve flow) | | | | |
| TC-03 Editor | 5 Edit | | | | |
| TC-03 Editor | 6 Approve | | | | |
| TC-03 Editor | 7 No Release button | | | | |
| TC-03 Editor | 8 Retire v2022-11-19 | | | | |
| TC-03 Editor | 9 Delete retired v2022-11-19 | | | | |
| TC-03 Editor | 10 Settings | | | | |
| TC-03 Editor | 10a Endpoints | | | | |
| TC-03 Editor | 10b Credentials | | | | |
| TC-04 Reviewer | Pre-condition — Verify program state | | | | |
| TC-04 Reviewer | 1 Profile display | | | | |
| TC-04 Reviewer | 2 No row expand arrow | | | | |
| TC-04 Reviewer | 3 No write actions on detail page | | | | |
| TC-04 Reviewer | 4 Approve Program-TC03 | | | | |
| TC-04 Reviewer | 5 Settings | | | | |
| TC-04 Reviewer | 5a Endpoints | | | | |
| TC-04 Reviewer | 5b Credentials | | | | |
| TC-05 Implementer | Pre-condition — Verify program state | | | | |
| TC-05 Implementer | 1 Profile display | | | | |
| TC-05 Implementer | 2 Programs list (active/retired visible; drafts hidden) | | | | |
| TC-05 Implementer | 3 Draft program inaccessible directly | | | | |
| TC-05 Implementer | 4 Settings | | | | |
| TC-05 Implementer | 4a Endpoints | | | | |
| TC-05 Implementer | 4b Credentials | | | | |

---

## Appendix A: Test Users

| Username | Password | Role |
| --- | --- | --- |
| `johndoe` | `password` | Admin |
| `rachel` | `password` | Publisher |
| `gary` | `password` | Editor |
| `joybennet` | `password` | Reviewer |
| `ann` | `password` | Implementer |

---

## Appendix B: Accessing Program Actions

There are two ways to interact with a program from the Programs list:

- **Action buttons** (Clone, Release, Withdraw, Retire, Delete): click the **▶ expand arrow**
  on the left side of a program row. The row expands to show the available action buttons.
  A hint reading "Expand a row to view Program Actions" is shown above the table.
  Only users with at least Editor role see the expand arrow.
- **Edit and Approve**: these actions are on the program detail page. Click the program's
  **ID link** in the table to navigate to the detail page. Scroll to the bottom of the
  detail page to find the **Approvals** section.

> **Retired programs** are hidden by default. Enable the **Show retired programs** toggle
> above the table before attempting to expand a retired program's row to Delete it.

### Action Button State Matrix

Button visibility and enabled state are controlled by two factors: the user's role
(determines whether the button is visible at all) and the program's current status
(determines whether it is enabled).

> **▶ Expand arrow** is only visible to Editor, Publisher, and Admin. Implementer and
> Reviewer do not see the expand arrow and cannot access any action buttons.

| Button | Enabled when status is… | Implementer | Reviewer | Editor | Publisher | Admin |
| --- | --- | --- | --- | --- | --- | --- |
| **Clone** | `active` | — | — | ✓ | ✓ | ✓ |
| **Withdraw** | `draft` | — | — | ✓ | ✓ | ✓ |
| **Retire** | `active` | — | — | ✓ | ✓ | ✓ |
| **Delete** | `retired` | — | — | ✓ | ✓ | ✓ |
| **Release** | `draft` + at least one approval | — | — | — | ✓ | ✓ |

**Key:** ✓ = button visible; enabled when status condition is met / — = button not visible

---

## Appendix C: Resetting to Base State

The base state for this script is the five programs loaded by `bin/load-data-uat.sh`.
See the [Overview](#overview) table above.

Run this reset between UAT runs or any time the session needs to restart from scratch.

### 1. Stop the Next.js app

If the app is running in a terminal, press `Ctrl+C` to stop it.

### 2. Tear down Docker services and wipe data

Run these commands from the **repo root** (`aphl-vsm/`):

```sh
docker compose down -v
docker compose up -d
```

`-v` removes the named volumes, which deletes the Postgres database. Without it, program
data from the previous run would survive the restart.

`-d` runs the containers in detached mode (background), returning your terminal
immediately so you can continue with the steps below.

Wait for all containers to be healthy before continuing. You can check with:

```sh
docker compose ps
```

### 3. Re-provision Keycloak users and roles

> **Note:** After `docker compose up -d`, Keycloak needs time to initialize before the
> configure script can connect. Wait approximately 30 seconds before running the command
> below. If the script fails immediately, wait a few more seconds and retry.

From the **repo root**:

```sh
./keycloak/configure
```

### 4. Re-seed UAT programs

`load-data-uat.sh` lives in the `bin/` folder. Run it from the **repo root**:

```sh
./bin/load-data-uat.sh
```

The script will prompt: `This will expunge and reset all data on this FHIR server: http://localhost:8082/fhir — Continue? (y/n)`. Enter `y`.

### 5. Start the Next.js app

From the `vsm-app/` folder:

```sh
npm run dev
```

The app will be available at `http://localhost:3000`.

### 6. Verify

Navigate to `http://localhost:3000` and confirm that the five programs from the
[Starting State](#overview) table are present (enable **Show retired programs** to see
the retired entry).
