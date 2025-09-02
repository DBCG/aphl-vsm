# ValueSet Manager (VSM) App: Local Setup Guide

This guide provides step-by-step instructions to set up and run the **VSM application locally** on **Windows**, **macOS**, and **Linux**. It uses Docker for backend services and Next.js for the frontend.

---

## 💻 Prerequisites

Before you begin, make sure the following tools are installed:

### 🔧 Required Tools

| Tool         | Purpose                              | Installation Link                               |
|--------------|--------------------------------------|--------------------------------------------------|
| **Docker Desktop** | Run backend services via containers | [Docker Desktop](https://www.docker.com/products/docker-desktop) |
| **Node.js & npm**  | Run and build the frontend app     | [Node.js](https://nodejs.org/) |
| **VS Code**        | Source code editing (recommended)  | [Visual Studio Code](https://code.visualstudio.com/) |
| **Git**            | Version control & cloning repos    | [Git](https://git-scm.com/) |

> ⚠️ You’ll also need a **VSAC API key**. [Register here](https://vsac.nlm.nih.gov/) to obtain it.

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

## 📝 Step 2: Seed Sample Data

After the backend is up, you’ll load data into the FHIR server.

### Instructions:

```bash
bin/load-data.sh
```

> ⏳ Wait ~30–60 seconds after `docker-compose up` before running this.

This script:
- Loads sample data and static resources
- Calls `$eRSD-v2-import`
- Injects metadata for VSM usage

> 🔐 If deploying to Dev/QA, set an auth token inside the script (`AUTH_TOKEN`).

---
