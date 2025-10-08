# 📦 FHIR Manifest Release & Package Retrieval Guide

This guide provides step-by-step instructions for releasing a FHIR manifest using the **CQ Framework** and retrieving associated package contents from a **HAPI FHIR server**.

It uses:
- 🐳 **Docker** to run the backend (HAPI FHIR JPA Server)
- 🧰 **cURL** for invoking FHIR `$release` and `$package` operations

---

## 🔧 Prerequisites

Ensure your system has the following tools installed:

| Tool       | Purpose                                               | Download Link                                        |
|------------|--------------------------------------------------------|------------------------------------------------------|
| **Docker** | Run the HAPI FHIR server as a containerized service    | [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) |
| **cURL**   | Send HTTP requests to the FHIR API                     | [https://curl.se/download.html](https://curl.se/download.html) |

> No need to install Java, Maven, or build anything locally. Everything runs inside Docker containers.

---

## 🐳 Running the FHIR Server with Docker

You can run the FHIR server using the official [HAPI FHIR JPA Server Docker image](https://hub.docker.com/r/hapiproject/hapi).

### ▶️ Step 1: Pull and Start the Server

```bash
docker pull hapiproject/hapi:latest
docker run -p 8080:8080 hapiproject/hapi:latest
````

This exposes the FHIR server at:

```
http://localhost:8080/fhir
```

### ✅ Step 2: Verify the Server

Visit `http://localhost:8080/fhir` in your browser.
If the landing page appears, your server is running correctly and ready to accept API requests.

---

## 🧠 Terminal Recommendations

Use a shell that supports standard bash syntax:

* **Windows:** Use **Git Bash** in VS Code or the standalone Git Bash terminal.
* **macOS/Linux:** Use your default terminal (Bash, Zsh, etc.).

---

## 🔐 VSAC Credentials Required

The `$release` and `$package` operations require access to the **VSAC terminology server**.

You’ll need:

* Your **VSAC API Username**
* Your **VSAC API Key**

> Register for a VSAC account at [https://vsac.nlm.nih.gov/](https://vsac.nlm.nih.gov/)

---

## 🚀 Step-by-Step: `$release` and `$package` Operations

These operations enable the transformation of an IG’s content into a curated, reusable value set package.

### ⚙️ Step 1: Upload the IG Package Bundle

Upload the full NPM package bundle (e.g., US Core or CCDA) as a FHIR `Bundle`.
This must include `ValueSet`, `CodeSystem`, `Library`, etc.

```bash
curl -X POST http://localhost:8080/fhir \
  -H "Content-Type: application/fhir+json" \
  -d @uscore-package-bundle.json
```

🔗 [Sample Bundle File](https://github.com/cqframework/clinical-reasoning/blob/54b95181f6875ecf610dbfae3a7a9b7aee4344b2/cqf-fhir-cr-hapi/src/test/resources/org/opencds/cqf/fhir/cr/hapi/r4/uscore-package-bundle.json)

---

### ⚙️ Step 2: Upload the Manifest `Library` Resource

This defines the structure and parameters for release/packaging.

```bash
curl -X POST http://localhost:8080/fhir/Library \
  -H "Content-Type: application/fhir+json" \
  -d @Library-uscore-vsp-6-1-0.json
```

<details>
<summary>📄 Sample Manifest Payload (click to expand)</summary>

```json
{
  "resourceType": "Library",
  "id": "uscore-vsp-6-1-0",
  "meta": {
    "profile": [
      "http://hl7.org/fhir/uv/crmi/StructureDefinition/crmi-manifestlibrary"
    ]
  },
  "contained": [
    {
      "resourceType": "Parameters",
      "id": "exp-params",
      "parameter": [
        {
          "name": "activeOnly",
          "valueBoolean": true
        }
      ]
    }
  ],
  "extension": [
    {
      "url": "http://hl7.org/fhir/StructureDefinition/cqf-expansionParameters",
      "valueReference": {
        "reference": "#exp-params"
      }
    },
    {
      "url": "http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-softwaresystem",
      "valueReference": {
        "reference": "Device/cqf-tooling"
      }
    }
  ],
  "url": "http://hl7.org/fhir/us/core-vsp/6.1.0/Library/hl7.fhir.us.core-vsp-6-1-0",
  "version": "2025-09-draft",
  "name": "USCore610ValueSetPackage",
  "title": "US Core 6.1.0 Value Set Package",
  "status": "draft",
  "type": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/library-type",
        "code": "asset-collection"
      }
    ]
  },
  "date": "2025-09-23",
  "description": "This is a Value Set Refresh Package for the US Core 6.1.0 implementation guide...",
  "relatedArtifact": [
    {
      "type": "composed-of",
      "resource": "http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core|6.1.0"
    }
  ]
}
```

</details>

---

### 📤 Step 3: Run the `$release` Operation

**Purpose:** Resolve and pin dependencies, create a versioned release.

```bash
curl -X POST http://localhost:8080/fhir/Library/uscore-vsp-6-1-0/$release \
  -H "Content-Type: application/fhir+json" \
  -d @release-params.json
```

📄 `release-params.json`:

```json
{
  "resourceType": "Parameters",
  "parameter": [
    {
      "name": "version",
      "valueString": "1.0.0"
    },
    {
      "name": "versionBehavior",
      "valueString": "force"
    },
    {
      "name": "latestFromTxServer",
      "valueBoolean": true
    },
    {
      "name": "terminologyEndpoint",
      "resource": {
        "resourceType": "Endpoint",
        "address": "https://cts.nlm.nih.gov/fhir",
        "connectionType": {
          "system": "http://hl7.org/fhir/ValueSet/endpoint-connection-type",
          "code": "hl7-fhir-rest"
        },
        "status": "active",
        "payloadType": [
          {
            "coding": [
              {
                "system": "http://hl7.org/fhir/ValueSet/endpoint-payload-type",
                "code": "any"
              }
            ]
          }
        ],
        "extension": [
          {
            "url": "vsacUsername",
            "valueString": "<your-vsac-username>"
          },
          {
            "url": "apiKey",
            "valueString": "<your-vsac-api-key>"
          }
        ]
      }
    }
  ]
}
```

---

### 📦 Step 4: Run the `$package` Operation

**Purpose:** Build a distributable package (FHIR Bundle or NPM-like structure).

```bash
curl -X POST http://localhost:8080/fhir/Library/uscore-vsp-6-1-0/$package \
  -H "Content-Type: application/fhir+json" \
  -d @package-params.json
```

📄 `package-params.json`:

```json
{
  "resourceType": "Parameters",
  "parameter": [
    {
      "name": "terminologyEndpoint",
      "resource": {
        "resourceType": "Endpoint",
        "id": "vsac-creds",
        "address": "https://cts.nlm.nih.gov/fhir",
        "connectionType": {
          "system": "http://terminology.hl7.org/CodeSystem/endpoint-connection-type",
          "code": "hl7-fhir-rest"
        },
        "status": "active",
        "payloadType": [
          {
            "coding": [
              {
                "system": "http://hl7.org/fhir/ValueSet/endpoint-payload-type",
                "code": "any"
              }
            ]
          }
        ],
        "extension": [
          {
            "url": "vsacUsername",
            "valueString": "<your-vsac-username>"
          },
          {
            "url": "apiKey",
            "valueString": "<your-vsac-api-key>"
          }
        ]
      }
    }
  ]
}
```

---

## ✅ Validation Checklist

After running both operations:

* [x] Only expected


**ValueSets** are included

* [x] Correct **CodeSystem versions** are applied
* [x] No extra or unrelated value sets included
* [x] Final `Bundle` or package is suitable for deployment or publication

---

## 🧼 Cleanup

### 🧽 Clear All Docker Volumes (optional)

```bash
./bin/docker-cleanup
```

> ⚠️ Warning: This deletes **all persistent data**, including Postgres and server files.

### 🔄 Clear Only FHIR Data

```bash
./bin/clear-data.sh
```

Optional: clear a custom FHIR server

```bash
./bin/clear-data.sh http://your-custom-fhir-server
```

---