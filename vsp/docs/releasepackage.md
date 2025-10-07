# FHIR Manifest Release and Package Retrieval: Step-by-Step Guide

This guide provides step-by-step instructions for releasing a FHIR manifest using the CQ Framework and retrieving the associated package contents from a HAPI FHIR server. The process uses Docker for backend deployment and `curl` commands to interact with the FHIR API.

---

```markdown
## 🔧 Prerequisites

Before proceeding with the release and retrieval of a FHIR manifest package, ensure your environment is set up with the necessary tools.

You have **two setup options** depending on how you plan to run the project:

---

### 🛠️ Option 1: Clone and Build the Project Locally

If you want to **customize** the project and manage your own build environment:

1. **Fork and Clone the Repository**  
   It's recommended to create a GitHub fork of this project, then clone it locally to make changes and track your customizations.

2. **Install the following tools**:

| Tool         | Description                                                              | Download / Install                                     |
|--------------|--------------------------------------------------------------------------|--------------------------------------------------------|
| **Git**      | Used to clone the project and manage version control                     | [https://git-scm.com/](https://git-scm.com/)           |
| **Java JDK** | Required to build the Java components (JDK 17 or newer recommended)      | [https://adoptium.net/](https://adoptium.net/)         |
| **Maven**    | Build tool used to compile and package the project                       | [https://maven.apache.org/download.cgi](https://maven.apache.org/download.cgi) |

---

### 🐳 Option 2: Use Docker (Recommended)

If you prefer a simpler, containerized setup without managing local builds:

- The entire project can be built and run using Docker. A multistage Docker setup includes both **JDK** and **Maven**, so you don’t need to install them manually.
- You can also run the backend directly using **prebuilt Docker images** from Docker Hub.

#### Required Tools:

| Tool                            | Description                                                                                             | Download / Install                                                                 |
|---------------------------------|---------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| **Docker**                      | Required to run backend services and build the project using Docker                                     | [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) |
| **Clinical Reasoning Module**   | Used for authoring and releasing FHIR manifest content                                                  | [https://github.com/cqframework/clinical-reasoning](https://github.com/cqframework/clinical-reasoning) |
| **HAPI FHIR JPA Server Starter**| Backend FHIR server for hosting and retrieving manifest packages                                        | [GitHub Repository](https://github.com/hapifhir/hapi-fhir-jpaserver-starter) · [Docker Image](https://hub.docker.com/r/hapiproject/hapi) |

---

### 🌐 Additional Tool (Applies to Both Setups)

| Tool     | Description                                                         | Download / Install                        |
|----------|---------------------------------------------------------------------|-------------------------------------------|
| **cURL** | Command-line tool used to send HTTP requests to the FHIR API        | [https://curl.se/download.html](https://curl.se/download.html) |

---

✅ **Recommended Setup:**  
Use **Docker** for faster onboarding, no manual Java/Maven setup, and easier environment management.
```

---

### 🔐 VSAC Credentials (Required for Release & Package Steps)

To interact with the VSAC terminology server, you must have:
- **VSAC API Username**
- **VSAC API Key**

> 🔗 Sign up at [https://vsac.nlm.nih.gov/](https://vsac.nlm.nih.gov/) to obtain credentials.
```
---

### 💡 Terminal Recommendations

Depending on your OS, we recommend the following:

- **Windows**:
  - Use **Git Bash** inside VS Code for all shell commands.
  - You can launch Git Bash from the dropdown in the VS Code terminal panel.
  - Git Bash supports all the `bash` commands used in this guide.

- **macOS/Linux**:
  - Use the default **Terminal** or any shell (e.g., Bash, Zsh).
  - All commands in this guide are compatible with Unix-like environments.

---

## 📁 Step 0: Clone the Repository

You can use **either HTTPS or SSH** to clone the repo into VS Code.

### Using HTTPS:

```bash
git clone https://github.com/your-org/aphl-vsm.git
```

### Using SSH:

```bash
git clone git@github.com:your-org/aphl-vsm.git
```

Then, open the project in **VS Code**:

```bash
cd aphl-vsm
code .
```

Make sure you open the terminal in **Git Bash** on Windows.

---

## 🚀 Step 1: Start Backend Services with Docker

Start the essential backend services:

- CQF-Ruler (FHIR Server)
- Redis
- Keycloak
- PostgreSQL

### Instructions:

```bash
docker-compose up
```

Let the containers fully initialize (may take 1–2 minutes).

---

## 🔐 Step 2: Configure Keycloak

This step sets up the Keycloak realm, clients, and environment variables needed for authentication.

---

### ✅ Prerequisite: Install `jq`

The Keycloak configuration script uses [`jq`](https://stedolan.github.io/jq/) — a lightweight command-line JSON processor — to modify Keycloak config files.

#### ▶ Windows

1. Download `jq-win64.exe` from the official release page:
   👉 [https://github.com/stedolan/jq/releases](https://github.com/stedolan/jq/releases)

2. Rename it to:

   ```
   jq.exe
   ```

3. Move it to a folder, e.g.:

   ```
   C:\Tools\jq\
   ```

4. Add that folder to your system `PATH`:

   * Open **Start → Environment Variables**
   * Edit the `Path` under **System Variables**
   * Add:

     ```
     C:\Tools\jq
     ```

5. Restart your terminal and **code editor (e.g., VS Code)** to apply the changes.

6. Verify with:

   ```bash
   jq --version
   ```

   You should see something like `jq-1.6`.

#### ▶ macOS

```bash
brew install jq
```

#### ▶ Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install jq
```

---

### ✅ 2.1 Create `.env.local` File (Required Before Init)

Before running the Keycloak initialization script, create the `.env.local` file. This file is required so the script can inject the Keycloak client secret automatically.

```bash
cp vsm-app/.env.local.example vsm-app/.env.local
```

---

### ✅ 2.2 Complete Keycloak Setup via UI

1. Open [http://localhost:8080](http://localhost:8080)
2. Login with:

   * Username: `admin`
   * Password: `admin`
3. In the top-left realm dropdown, select **APHL**
4. Go to **Clients → `server_auth`**
5. Open the **Credentials** tab
6. **Copy the `Client Secret`**

---

### ✅ 2.3 Set Up `.env.local` for Next.js App


### ✅ 2.4 Run the Keycloak Initialization Script


```markdown
Here is your refined **README** section for **Step 4: Manifest `$release` and `$package` Operations**, restructured for **clarity**, **clean formatting**, and **developer usability**, while preserving all technical details:

````markdown
## 📦 Step 4: Manifest `$release` and `$package` Operations (MVP Functionality)

This step demonstrates how to use the FHIR `$release` and `$package` operations to process value set packages based on a FHIR `Library` manifest. This functionality supports **US Core** and **CCDA** Implementation Guides as part of the MVP.

---

### ⚠️ Prerequisites

Before invoking the `$release` or `$package` operations, ensure the following:

---

#### ✅ 1. Upload the IG Package Bundle

Upload the **entire NPM package contents** of the relevant Implementation Guide (e.g., US Core or CCDA) to the FHIR server as a **FHIR `Bundle`**.

- This must include `ValueSet`, `CodeSystem`, `Library`, and other dependent resources.
- **Do not upload only the `ImplementationGuide` resource** — that is insufficient.

**Example: Upload US Core package bundle**

```bash
curl -X POST http://localhost:8082/fhir \
  -H "Content-Type: application/fhir+json" \
  -d @uscore-package-bundle.json
````

🔗 [Sample Bundle File (uscore-package-bundle.json)](https://github.com/cqframework/clinical-reasoning/blob/54b95181f6875ecf610dbfae3a7a9b7aee4344b2/cqf-fhir-cr-hapi/src/test/resources/org/opencds/cqf/fhir/cr/hapi/r4/uscore-package-bundle.json)

---

#### ✅ 2. Upload the Manifest `Library` Resource

The manifest `Library` defines the structure and parameters used for the `$release` and `$package` operations.

**Example: Upload manifest Library**

```bash
curl -X POST http://localhost:8082/fhir/Library \
  -H "Content-Type: application/fhir+json" \
  -d @Library-uscore-vsp-6-1-0.json
```

**Sample Manifest Payload (`Library-uscore-vsp-6-1-0.json`)**:

<details>
<summary>Click to expand JSON</summary>

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
  "experimental": false,
  "type": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/library-type",
        "code": "asset-collection"
      }
    ]
  },
  "date": "2025-09-23",
  "description": "This is a Value Set Refresh Package for the US Core 6.1.0 implementation guide. It contains expansions of any value sets in the US Core 6.1.0 implementation guide, but refreshed using the code systems versions specified in the manifest expansion parameters.",
  "lastReviewDate": "2025-09-23",
  "approvalDate": "2025-09-23",
  "relatedArtifact": [
    {
      "type": "composed-of",
      "resource": "http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core|6.1.0"
    }
  ]
}
```

</details>

> 🛠️ Operations are intended to be run manually via the command line using `curl`.

---

### 4.1 `$release` Operation

**Purpose:**  
Releases a manifest by resolving and pinning all its dependencies (e.g., code systems, value sets). This is the first step in generating a distributable value set package.

**Endpoint:**

```

POST [http://localhost:8082/fhir/Library/](http://localhost:8082/fhir/Library/)<manifest-library-id>/$release

````

Replace `<manifest-library-id>` with the actual ID of your manifest `Library`.

#### 🧪 What This Does:

- Resolves value sets and code systems defined in the manifest.
- Pulls the latest versions (or pinned versions) of external content (e.g., from VSAC).
- Stores a new released version of the value set content in the repository.

#### ✅ Sample `curl` Command

```bash
curl -X POST http://localhost:8082/fhir/Library/my-manifest/$release \
  -H "Content-Type: application/fhir+json" \
  -d @release-params.json
````

#### 📝 Sample `release-params.json` File

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
        "extension": [
          {
            "url": "vsacUsername",
            "valueString": "<vsac-username>"
          },
          {
            "url": "apiKey",
            "valueString": "<vsac-api-key>"
          }
        ],
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
        ]
      }
    }
  ]
}
```

---

### 4.2 `$package` Operation

**Purpose:**
Packages the released content into a distributable unit (e.g., for publishing, validation, or deployment). This is typically done after a successful `$release`.

**Endpoint:**

```
POST http://localhost:8082/fhir/Library/<manifest-library-id>/$package
```

#### 🧪 What This Does:

* Collects all artifacts from the `$release` output.
* Produces a FHIR `Bundle` (or NPM-like structure) that represents the value set package.
* Can be downloaded or validated for completeness.

#### ✅ Sample `curl` Command

```bash
curl -X POST http://localhost:8082/fhir/Library/my-manifest/$package \
  -H "Content-Type: application/fhir+json" \
  -d @package-params.json
```

#### 📝 Sample `package-params.json` File

```json
{
  "resourceType": "Parameters",
  "parameter": [
    {
      "name": "terminologyEndpoint",
      "resource": {
        "resourceType": "Endpoint",
        "id": "vsac-creds",
        "extension": [
          {
            "url": "vsacUsername",
            "valueString": "<vsac-username>"
          },
          {
            "url": "apiKey",
            "valueString": "<vsac-api-key>"
          }
        ],
        "status": "active",
        "connectionType": {
          "system": "http://terminology.hl7.org/CodeSystem/endpoint-connection-type",
          "code": "hl7-fhir-rest"
        },
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
        "address": "https://cts.nlm.nih.gov/fhir"
      }
    }
  ]
}
```

---

### 📋 What to Check (Validation Guidance)

After running both operations, confirm the following:

* ✅ **Correct Value Sets** are included in the output.
* ✅ **Correct Code System versions** are used (as defined in manifest).
* ❌ **No irrelevant Value Sets** (i.e., from unrelated base specs).
* 📦 The packaged output includes everything needed to use or publish the value sets (e.g., for terminology validation).

---

### 🧠 Additional Notes

* `terminologyEndpoint` is used here for simplicity, but the **preferred long-term approach** is to use the [`endpointConfiguration`](https://hl7.org/fhir/uv/crmi/2025Sep/StructureDefinition-crmi-artifact-endpoint-configurable-operation.html) extension (per CRMI spec).
* Hardcoded endpoints and single-server assumptions are acceptable for the MVP.

---

## 🧼 Cleanup Commands

### Clear All Docker Volumes (Postgres, CQF-Ruler, etc.)

```bash
./bin/docker-cleanup
```

> ⚠️ Warning: This will delete **all persistent data**, including other local CQF servers.

---

### Clear Only FHIR Data from CQF Server

```bash
./bin/clear-data.sh
```

Optional: to use a custom FHIR server URL:

```bash
./bin/clear-data.sh http://your-fhir-server-url
```
