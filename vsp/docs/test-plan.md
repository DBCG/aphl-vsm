# ✅ Test Plan: Validation of `$release` and `$package` Operations

> 📄 **Purpose**
> Validate the correctness, completeness, and reproducibility of FHIR `$release` and `$package` operations for Implementation Guides (IGs) and their dependencies.

---

## 🎯 Objectives

Ensure that:

* ✅ All required resources and **dependencies** are included
* 🎯 Exact **versions** (not latest) are respected
* 🧼 Output contains **no extraneous content**
* 📦 Packaged artifacts **match the released output exactly**
* ♻️ Output is **structurally valid** and **reproducible**
* 🌐 Base FHIR and external IG dependencies are handled correctly

---

## 📋 Prerequisites

* ✅ FHIR server supporting `$release` and `$package`
* 📦 Draft IG content loaded (e.g., US Core or custom)
* 📄 `Library` resource (manifest) with correct structure
* 📚 Follow: [ReleasePackage Documentation](https://github.com/DBCG/aphl-vsm/blob/initial-docu/vsp/docs/releasepackage.md)

---

## 🔍 `$release` Operation Tests

<details>
<summary><strong>🧪 Test 1: Environment Setup</strong></summary>

**Goal:** Ensure the test server is correctly initialized.

**Steps:**

1. Load IG content (e.g., US Core `.tgz` package)
2. Upload manifest `Library` resource:

   * Profile: `crmi-manifestlibrary`
   * Contains `Parameters` (e.g., `system-version`)
   * Links to IG via `relatedArtifact`

**Expected:**

* IG & manifest resources return `201 Created` or `200 OK`
* Manifest retrievable at `/Library/[id]`
* Contains valid `url`, `version`, `contained`, and `status`

</details>

<details>
<summary><strong>🧪 Test 2: Dependency Traversal</strong></summary>

**Goal:** Ensure `$release` includes **all referenced and transitive** resources.

**Steps:**

```http
POST /Library/[id]/$release
```

* Inspect `Bundle.entry[]` → check resource types

**Expected:**

* Includes: `Library`, `ValueSet`, `CodeSystem`, `StructureDefinition`
* Grouped ValueSets resolved via `compose.include.valueSet`
* No unreferenced or extraneous dependencies

</details>

<details>
<summary><strong>🧪 Test 3: Version Control from Manifest</strong></summary>

**Goal:** Ensure manifest-defined versions (e.g., `LOINC 2.78`) are honored.

**Steps:**

* Check `Parameters.name = system-version`
* Confirm each appears exactly in `$release` output

**Expected:**

* Versions **not upgraded or downgraded**
* Expansions (if any) use correct system versions

</details>

<details>
<summary><strong>🧪 Test 4: Minimal Output</strong></summary>

**Goal:** Ensure no unrelated artifacts are released.

**Steps:**

* Trace each resource back to:

  * Manifest
  * IG or profile transitive inclusion

**Expected:**

* All resources are referenced directly or indirectly
* No stray `ValueSet`, `CodeSystem`, etc.

</details>

<details>
<summary><strong>🧪 Test 5: Metadata Accuracy</strong></summary>

**Goal:** Ensure all artifacts have correct metadata.

**Steps:**

* Inspect metadata of each resource

**Expected:**

* `meta.versionId`, `meta.lastUpdated` present
* `status` = `active`
* `url` and `version` match manifest/IG

</details>

---

## 📦 `$package` Output Validation

<details>
<summary><strong>🧪 Test 1: Bundle Format</strong></summary>

**Goal:** Confirm structure is a valid FHIR `Bundle` of type `transaction`.

**Expected:**

* `resourceType = "Bundle"`
* `type = "transaction"`
* `entry.length > 0`

</details>

<details>
<summary><strong>🧪 Test 2: Manifest Inclusion</strong></summary>

**Goal:** Manifest `Library` is included in package.

**Expected:**

* Includes `meta.profile = crmi-manifestlibrary`
* Contains `url`, `version`, `status`, and `contained[]`

</details>

<details>
<summary><strong>🧪 Test 3: Expansion Parameters</strong></summary>

**Goal:** Validate correctness of contained `Parameters` for code system versions.

**Expected:**

* All `system-version` parameters have correct canonical + version
* No unknown or duplicated systems

</details>

<details>
<summary><strong>🧪 Test 4: Canonical Versions</strong></summary>

**Goal:** Ensure each `canonicalVersion` has:

* Canonical URL with version
* Extension `cqf-resourceType`
* Optional display text

**Example:**

```json
{
  "name": "canonicalVersion",
  "valueCanonical": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-vital-signs|6.1.0",
  "_valueCanonical": {
    "extension": [
      {
        "url": "http://hl7.org/fhir/StructureDefinition/cqf-resourceType",
        "valueCode": "StructureDefinition"
      }
    ]
  }
}
```

</details>

<details>
<summary><strong>🧪 Test 5: Cross-IG and Base FHIR Dependencies</strong></summary>

**Goal:** Confirm inclusion of all required artifacts across IGs and base FHIR.

**Expected:**

* No unresolved references
* All required base and external profiles included

</details>

<details>
<summary><strong>🧪 Test 6: Duplicate Detection</strong></summary>

**Goal:** No duplicate artifacts by canonical URL + version.

**Expected:**

* No `resourceType/id` conflicts
* No duplicate content with same `url|version`

</details>

<details>
<summary><strong>🧪 Test 7: Naming & ID Conventions</strong></summary>

**Goal:** IDs are consistent and match naming conventions.

**Expected:**

* Lowercase, hyphenated
* Consistent with IG/package names

</details>

<details>
<summary><strong>🧪 Test 8: fullUrl Accuracy</strong></summary>

**Goal:** `entry.fullUrl` aligns with resource `url|version`.

**Expected:**

* `fullUrl = url|version`
* All entries conform

</details>

---

## 🧾 Validation & Tooling

| ✅ Area              | Tool / Approach                        |
| ------------------- | -------------------------------------- |
| FHIR schema         | HL7 FHIR Validator CLI                 |
| Bundle structure    | JSON Schema or FHIR test harness       |
| Version correctness | Compare to IG manifest or `$validate`  |
| Manual inspection   | VS Code + `jq` or similar JSON viewers |

---

## 🛠 Tools Required

| Tool             | Use Case                                      |
| ---------------- | --------------------------------------------- |
| `curl`, Postman  | Submit `$release` / `$package` requests       |
| `jq`             | Filter/analyze FHIR JSON                      |
| FHIR Server      | Must support `$release` and `$package`        |
| VSAC credentials | If resolving external ValueSets (e.g., LOINC) |
| VS Code          | JSON review, diff, validation                 |

---