# ValueSet Manager (VSM) App: Local Setup Guide

This guide provides step-by-step instructions to set up and run the **VSM application locally** on **Windows**, **macOS**, and **Linux**. It uses Docker for backend services and Next.js for the frontend.

---

## 🔧 Prerequisites

Before getting started, ensure the following tools and services are installed and configured:

### 📦 Required Tools

| Tool            | Description                                      | Download / Install                                |
|-----------------|--------------------------------------------------|---------------------------------------------------|
| **Docker**      | Required to run the backend services             | [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) |
| **Node.js**     | Used to run the Next.js frontend (v16+ recommended) | [https://nodejs.org/](https://nodejs.org/)       |
| **npm**         | Comes with Node.js (used for package management) | Installed with Node.js                            |
| **Java JDK**    | Required for building Java components (v11+)     | [https://adoptium.net/](https://adoptium.net/)    |
| **Git**         | To clone and manage the code repository          | [https://git-scm.com/](https://git-scm.com/)      |

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

The `configure` script will attempt to inject the `server_auth` client secret into your `vsm-app/.env.local` file automatically.

> ⚠️ **Note:** In some environments (e.g. macOS or when the secret contains special characters), the injection may fail with an error like:
>
> ```
> sed: can't read s/^KEYCLOAK_SECRET=.*/KEYCLOAK_SECRET=null/: No such file or directory
> ```
>
> If this happens, **you must manually update the `.env.local` file** with the client secret you copied in step 2.2.

Open the `vsm-app/.env.local` file and update the following section:

```env
# Keycloak Configuration
KEYCLOAK_ID=aphl_app
KEYCLOAK_SECRET=<PASTE_CLIENT_SECRET_HERE>
KEYCLOAK_ISSUER=http://localhost:8080/realms/aphl
KEYCLOAK_REDIRECT_URI=http://localhost:3000/api/auth/callback/keycloak
```

> Replace `<PASTE_CLIENT_SECRET_HERE>` with the actual client secret copied from the Keycloak UI.

---

### ✅ 2.4 Run the Keycloak Initialization Script

```bash
./keycloak/configure
```

This script sets up:

* The `APHL` realm
* Keycloak clients
* Roles
* Default users
* **Attempts to inject the Keycloak client secret** into `.env.local`

---

## 🌐 Step 3: Run the Frontend App

### 3.1 Generate RSA Key Pair

```bash
cd vsm-app
node generateKeyPair.js
```

### 3.2 Install Dependencies

```bash
npm install
```

### 3.3 Start the Development Server

```bash
npm run dev
```

> Visit: [http://localhost:3000](http://localhost:3000)

Login using:

* Username: `johndoe`
* Password: `password`

---

📘 For a step-by-step guide on release and package operations, refer to the [documentation below](#documentation).

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