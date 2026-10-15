# Google Cloud Platform (GCP) Implementation Guide — From Scratch

Welcome! This guide is written specifically for students and developers who are new to Google Cloud Platform (GCP) and need to implement and present the **Cloud-Based Dead Link Detection and Website Health Monitoring System**.

---

## 🌟 1. Understand How the GCP Architecture Works (Simple Terms)

In our project (refer to Slide 6 & 7):

1. **Web Frontend (React + Tailwind)**:
   - The user interface where someone enters a website URL (e.g., `https://mysite.com`) and clicks **Start Scan**.
   - Displays real-time progress, the radial Website Health Score (e.g. 92% - Grade A), latency metrics, and broken link reports.

2. **Google Cloud Run (API & Web Crawler)** — *Handled by Naghulan*:
   - Cloud Run is a **fully managed serverless container platform**.
   - It receives the HTTP request from the frontend.
   - It acts as the coordinator: it fetches the homepage HTML, parses all `<a href="...">` anchor tags, normalizes links, and discovers all internal and external URLs.

3. **Google Cloud Pub/Sub (Message Queue)** — *Handled by Shreyaa*:
   - Pub/Sub is Google Cloud's **asynchronous messaging service** (equivalent to AWS SQS).
   - Instead of checking 100 links sequentially (which would take minutes and timeout), Cloud Run publishes each link as an individual task message to the Pub/Sub topic `dead-link-tasks`.

4. **Google Cloud Run Workers (Processing Workers)** — *Handled by Naghulan*:
   - Pub/Sub uses a **Push Subscription** to deliver tasks to Cloud Run Workers concurrently.
   - Each worker sends an HTTP HEAD/GET request to verify the link.
   - It measures the exact response time in milliseconds.
   - It classifies the link into:
     - `WORKING` (HTTP 200..299)
     - `REDIRECTED` (HTTP 301/302)
     - `BROKEN` (HTTP 404 Not Found, 410 Gone, 403 Forbidden)
     - `SERVER_ERROR` (HTTP 500..599)
     - `TIMEOUT` (Request timed out)

5. **Google Cloud Firestore (NoSQL Database)** — *Handled by Shreyaa*:
   - Firestore is Google's **serverless document database** (equivalent to AWS DynamoDB).
   - It stores the scan metadata (`scans/{scanId}`) and the individual link results in a subcollection (`scans/{scanId}/links/{linkId}`).
   - It recalculates the health score and aggregate counters.

6. **Google Cloud Logging** — *Handled by Shreyaa*:
   - Centralized structured logging for auditing, monitoring, and tracing errors across all components.

---

## 💻 2. Running Locally (Instant Demo — Zero Cost)

Your project is built with **dual-mode architecture**:
It contains a complete **Local Emulation Sandbox** that runs out of the box without requiring GCP billing or credit card!

### Step 1: Start the application
Simply double-click `run.bat` in the root folder, or in PowerShell:
```powershell
npm start
```

### Step 2: Open in your Browser
Open: **`http://localhost:8080`**

### Step 3: Run a Scan
- Click **"Built-in Testbed"** preset (pre-fills `http://localhost:8080/api/test-site`).
- Click **"Start Scan"**.
- Watch the live progress bar, radial health gauge, and link breakdown populate!
- Click **"Architecture"** in the top bar to inspect Slide 6 & 7 diagrams.
- Click **"Cloud Logs"** to view real-time Google Cloud audit logs.
- Click **"Export Report"** to download JSON or CSV.

---

## ☁️ 3. Deploying to Real Google Cloud Platform

When you are ready to deploy to live GCP:

### Step 1: Get Google Cloud Account
1. Visit [Google Cloud Free Trial](https://cloud.google.com/free) — you get **\$300 in free credits for 90 days**.
2. Or use [Google Cloud for Students](https://edu.google.com/programs/students/) for free student credits.

### Step 2: Install Google Cloud SDK (gcloud CLI)
1. Download and install `gcloud` from: [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)
2. Open PowerShell and run:
   ```powershell
   gcloud init
   gcloud auth login
   ```

### Step 3: Create a GCP Project
```powershell
gcloud projects create webhealth-gcp-team --set-as-default
```

### Step 4: Run the One-Click Setup Script
In your project directory, run:
```powershell
.\gcp\setup_gcp.ps1 -ProjectId "webhealth-gcp-team"
```
This automatically enables Cloud Run, Pub/Sub, Firestore, and Cloud Logging!

### Step 5: Deploy to Cloud Run
Run:
```powershell
.\gcp\deploy_cloud_run.ps1 -ProjectId "webhealth-gcp-team"
```
Within 2 minutes, Google Cloud Build will build the container and output a public live URL:
`https://webhealth-gcp-xxxx-uc.a.run.app`

Open that URL on your phone or laptop — it's live on the global internet!

---

## 🔒 4. Connecting Local Server to Live GCP Firestore & Pub/Sub

If you want to run the server on your computer but have it save data into **real Google Cloud Firestore and Pub/Sub**:

1. In GCP Console, go to **IAM & Admin > Service Accounts**.
2. Click **Create Service Account** > Name it `webhealth-key`.
3. Grant roles:
   - `Cloud Datastore User` (for Firestore)
   - `Pub/Sub Editor` (for Pub/Sub)
   - `Logs Writer` (for Cloud Logging)
4. Go to the **Keys** tab > **Add Key** > **Create new key** > Select **JSON**.
5. Save the downloaded `.json` file in `backend/gcp-key.json`.
6. In `backend/.env`, set:
   ```env
   USE_MOCK_GCP=false
   GCP_PROJECT_ID=your-project-id
   GOOGLE_APPLICATION_CREDENTIALS=./gcp-key.json
   ```
7. Restart `npm start`. The server will now connect directly to real Google Cloud!
