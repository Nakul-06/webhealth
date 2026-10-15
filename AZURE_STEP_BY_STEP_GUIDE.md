# Microsoft Azure Deployment & Usage Guide — From Scratch

Welcome! Since you have created your **Azure for Students** account, you now have free cloud resources to deploy and run your **Cloud-Based Dead Link Detection and Website Health Monitoring System**.

---

## 🏗️ 1. How the System Operates on Microsoft Azure

Our project uses the industry-standard decoupled microservices architecture on Microsoft Azure:

```
[ User ]
   │
   ▼
[ Web Frontend ] (React + Tailwind CSS Dashboard)
   │
   ▼
[ Azure Container Apps (API & Crawler) ] ──Telemetry──► [ Azure Monitor / App Insights ]
   │ (Enqueues tasks)
   ▼
[ Azure Service Bus Queue ] (Queue: dead-link-tasks)
   │ (Worker Consumption)
   ▼
[ Azure Container Workers ] (Parallel HTTP Verification & Latency Profiling)
   │ (Writes results)
   ▼
[ Azure Cosmos DB ] (NoSQL Database: Container 'scans' & 'links')
   │
   ▼
[ Website Health Report ] (Radial Gauge, Latency Profile, CSV/JSON Export)
```

### Cloud Architecture Service Mapping:
| Purpose | Microsoft Azure | Amazon Web Services | Google Cloud Platform |
|---|---|---|---|
| **API / Entry Point** | **Azure App Service / Container Apps** | API Gateway | Cloud Run |
| **Serverless Compute** | **Azure Functions / Container Apps** | Lambda | Cloud Run |
| **Message Queue** | **Azure Service Bus** | Amazon SQS | Cloud Pub/Sub |
| **Processing Workers** | **Azure Container Workers** | Lambda Workers | Cloud Run Workers |
| **Database** | **Azure Cosmos DB (NoSQL)** | DynamoDB | Firestore |
| **Monitoring** | **Azure Monitor & App Insights** | CloudWatch | Cloud Logging |

---

## 💻 2. Testing Locally (Zero Setup, Instant Demo)

Your project has a built-in **Azure Emulation Sandbox** so you can run and test everything right on your machine:

1. Double-click **`run.bat`** in your project folder, or run:
   ```cmd
   cd "c:\Users\naghu\OneDrive\Desktop\Cloud WEBHEALTH"
   npm start
   ```
2. Open your browser to: **`http://localhost:8080`**
3. Click the **"Built-in Testbed"** button and click **"Start Scan"**.
4. You will see:
   - The **Azure Pipeline Banner** animate from Container Apps ➔ Service Bus ➔ Workers ➔ Cosmos DB.
   - The **Radial Health Score Gauge** and status cards.
   - Verified dead links (404/410), redirects (301/302), and server errors (500).
   - Click **"Azure Monitor"** in the top-right to inspect live structured cloud logs.
   - Click **"Architecture"** to show the evaluators the Slide comparison diagram.
   - Click **"Export Report"** to download the CSV or JSON.

---

## ☁️ 3. Deploying to Live Microsoft Azure

There are **two simple methods** to deploy to live Azure:

### Method A: One-Command Deployment using Azure CLI (Fastest)

1. **Install Azure CLI** (if you don't have it yet):
   - Download the installer from: [https://aka.ms/installazurecliwindows](https://aka.ms/installazurecliwindows)
   - Or in PowerShell:
     ```powershell
     winget install Microsoft.AzureCLI
     ```
2. **Log into your Azure Account**:
   ```powershell
   az login
   ```
   *(A browser window opens — select your student Microsoft account)*.

3. **Deploy with 1 command**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\azure\deploy_azure.ps1
   ```
   The script will:
   - Create Resource Group `rg-webhealth`
   - Create Azure Service Bus queue `dead-link-tasks`
   - Build and deploy your container to **Azure Container Apps**
   - Output your live public URL: `https://webhealth-app-xxxx.azurecontainerapps.io`!

---

### Method B: Deploying via the Azure Portal Web UI (No Terminal Needed)

If you prefer using the graphical Azure Portal in your browser:

1. Open **[portal.azure.com](https://portal.azure.com/)** and sign in.
2. In the top search bar, type **"App Services"** and click **Create** > **Web App**.
3. Fill in:
   - **Subscription**: Azure for Students
   - **Resource Group**: Create new `rg-webhealth`
   - **Name**: `webhealth-app-238` (or any unique name)
   - **Publish**: Code
   - **Runtime stack**: Node 20 LTS
   - **Operating System**: Linux
   - **Region**: East US (or Central US)
   - **Pricing Plan**: Free F1 (Shared infrastructure — 100% Free)
4. Click **Review + Create** > **Create**.
5. Once created, push your code from your local machine or GitHub repo.
