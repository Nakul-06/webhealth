# WebHealth 🌐
### Cloud-Based Distributed Dead Link Detection & Website Health Monitoring System

[![Build and Deploy to Azure](https://github.com/Nakul-06/webhealth/actions/workflows/main_webhealth.yml/badge.svg)](https://github.com/Nakul-06/webhealth/actions/workflows/main_webhealth.yml)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

WebHealth is a high-throughput, cloud-native website crawler and availability monitoring system. It recursively analyzes websites, discovers all internal and external hyperlinks, verifies endpoint health in parallel, and delivers an interactive diagnostic health report with latency profiling and actionable SEO remediation.

---

## 🚀 Key Features

- **Distributed Microservice Pipeline**: Decouples crawling discovery from link verification via an asynchronous message queue.
- **High-Accuracy Link Prober**:
  - Issues lightweight HTTP `HEAD` probes first to minimize network overhead.
  - Automatically falls back to streaming HTTP `GET` with desktop browser headers when servers reject `HEAD` (handling 405 Method Not Allowed, Cloudflare bot challenges, and CDNs).
  - Handles SSL certificate verification, DNS resolution, and connection timeouts gracefully.
- **Smart URL Normalization**: Automatically strips URL hash anchors (`#section`), resolves relative paths, normalizes trailing slashes, and deduplicates identical endpoints.
- **Comprehensive Status Classification**:
  - `WORKING` (HTTP 200–299)
  - `REDIRECTED` (HTTP 301 Permanent, 302 Temporary, with target URL tracking)
  - `BROKEN` (Dead links: 404 Not Found, 410 Gone, 403 Forbidden)
  - `SERVER_ERROR` (HTTP 500–599)
  - `TIMEOUT` (Network latency exceeded threshold)
- **Interactive Health Dashboard**:
  - Circular SVG Health Score gauge.
  - Latency metrics: Average response time, P50 median, P95 percentile latency.
  - Searchable, filterable links audit table with direct target navigation.
  - 1-click report export in CSV and JSON formats.
  - Live audit log telemetry drawer streaming background worker actions.
- **Dual-Mode Cloud Architecture**:
  - **Cloud Mode**: Seamlessly connects to **Azure App Service**, **Azure Service Bus**, and **Azure Cosmos DB** when configured.
  - **Sandbox / Local Mode**: Embedded in-memory NoSQL document store and parallel worker queue for instantaneous zero-config local development and testing.

---

## 🏗️ Architecture

```
[ Web Browser ]
      │ (Submits Target URL & Polls Live Status)
      ▼
[ API & Web Crawler ] (Express.js + Cheerio)
      │
      ├──────────────────────► [ Centralized Telemetry / Audit Logs ]
      │ (Publishes Tasks)
      ▼
[ Asynchronous Message Queue ] (Azure Service Bus / Parallel Task Queue)
      │ (Pulls Tasks Concurrently)
      ▼
[ Link Verification Workers ] (HTTP HEAD + Streaming GET Fallback + Latency Timing)
      │ (Persists Records)
      ▼
[ NoSQL Database ] (Azure Cosmos DB / Local Audit Store)
      │
      ▼
[ Website Health Report & Analytics ] (Health Score Index, P95 Latency, CSV/JSON Export)
```

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons
- **Backend API**: Node.js (ES Modules), Express.js, Axios, Cheerio
- **Queue & Workers**: Azure Service Bus (`@azure/service-bus`) / Worker Queue
- **Database**: Azure Cosmos DB NoSQL (`@azure/cosmos`) / In-Memory Store
- **Deployment & CI/CD**: Microsoft Azure App Service, GitHub Actions

---

## ⚡ Quickstart

### Prerequisites
- Node.js 20.x or higher
- npm 10.x or higher

### 1. Clone the Repository
```bash
git clone https://github.com/Nakul-06/webhealth.git
cd webhealth
```

### 2. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Build & Run Locally
```bash
# Build the frontend production bundle
npm run build

# Start the unified backend server
cd ../backend
npm start
```

Open your browser at `http://localhost:8080` to access the dashboard.

---

## 🌐 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/scan` | `POST` | Initiates a new website crawl and verification scan |
| `/api/scans/:id` | `GET` | Fetches live scan progress and summary counts |
| `/api/scans/:id/links` | `GET` | Queries verified links with optional status/type filters |
| `/api/scans/:id/report` | `GET` | Generates full health report, score, and latency metrics |
| `/api/system/status` | `GET` | Checks health of cloud services and queue status |
| `/api/system/logs` | `GET` | Streams recent worker and pipeline audit logs |
| `/api/test-site` | `GET` | Built-in testbed containing live, redirect, and dead links |

---

## ☁️ Microsoft Azure Configuration (Optional)

To connect live Azure cloud resources, configure the following environment variables in Azure App Service Configuration or a local `.env` file:

```env
PORT=8080
NODE_ENV=production

# Azure Service Bus
AZURE_SERVICE_BUS_CONNECTION_STRING=Endpoint=sb://<your-namespace>.servicebus.windows.net/...
AZURE_QUEUE_NAME=dead-link-tasks

# Azure Cosmos DB
AZURE_COSMOS_ENDPOINT=https://<your-account>.documents.azure.com:443/
AZURE_COSMOS_KEY=<your-primary-key>
AZURE_DATABASE_NAME=webhealth-db
```

*Note: If these variables are omitted, WebHealth automatically runs in Sandbox Emulation Mode with identical functionality.*

---

## 📄 License
This project is licensed under the ISC License.
