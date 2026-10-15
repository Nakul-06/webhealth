# Cloud-Based Dead Link Detection and Website Health Monitoring System
### Google Cloud Platform (GCP) Implementation
**Course**: Cloud Computing — Review 1  
**Team Members (GCP Part)**: Naghulan Sivamani R V (23z238) & Shreyaa S V (23z264)  
**Team Members (AWS Part)**: Bommuraj E (23z215), Divakaran A (23z219), Sindhu Kalyani M (23z265)

---

## 🎯 Project Overview
Websites frequently suffer from link rot: pages are removed, URLs change, or external APIs fail, resulting in dead links (404 Not Found), broken user experiences, and SEO penalties.

This project implements a fully automated, cloud-native system on **Google Cloud Platform (GCP)** to:
1. Crawl websites and discover all internal and external hyperlinks.
2. Distribute link-checking tasks asynchronously at cloud scale.
3. Concurrently verify HTTP availability and measure response latency.
4. Detect working links, redirects, dead links, and server errors.
5. Generate an interactive, visual **Website Health Report** with health scoring and automated remediation advice.

---

## ☁️ Google Cloud Architecture (Slide 6 & 7)

```
[ User ]
   │
   ▼
[ Web Frontend ] (React + Tailwind CSS Dashboard)
   │
   ▼
[ Cloud Run (API & Crawler) ] ──Logs & Telemetry──► [ Cloud Logging ]
   │ (Publishes tasks)
   ▼
[ Cloud Pub/Sub ] (Topic: dead-link-tasks)
   │ (Push Subscription)
   ▼
[ Cloud Run Workers ] (Parallel HTTP Verification & Latency)
   │ (Writes results)
   ▼
[ Cloud Firestore ] (NoSQL Database: Scans & Links Subcollections)
   │
   ▼
[ Website Health Report ] (Radial Gauge, Latency Profile, CSV/JSON Export)
```

### Cloud Services Mapping (Slide 7)
| Purpose | AWS (Other Team) | Google Cloud (Our Implementation) |
|---|---|---|
| **API / Entry Point** | API Gateway | **Cloud Run** |
| **Serverless Compute** | Lambda | **Cloud Run** |
| **Message Queue** | Amazon SQS | **Cloud Pub/Sub** |
| **Processing Workers** | Lambda Workers | **Cloud Run Workers** |
| **Database** | DynamoDB | **Cloud Firestore** |
| **Monitoring** | CloudWatch | **Cloud Logging** |

---

## 👥 Team Work Distribution (Slide 8)
- **Naghulan Sivamani R V (23z238)**: Cloud Run, workers and link-processing logic.
  - Implemented Cloud Run REST API and HTML web crawler with Cheerio.
  - Developed parallel link availability verification with HEAD/GET fallback.
  - Engineered status classification (2xx Working, 3xx Redirect, 4xx Dead Link, 5xx Server Error, Timeout).
  - Measured latency round-trip in milliseconds.
- **Shreyaa S V (23z264)**: Pub/Sub, Firestore, Cloud Logging and GCP testing.
  - Configured Cloud Pub/Sub topics and Push Subscription dispatch.
  - Designed Cloud Firestore NoSQL schema (`scans` and `links` subcollections).
  - Integrated Cloud Logging structured audit logs stream.
  - Validated testbed scenarios and generated comprehensive health reports.

---

## 🚀 Quickstart Guide (Local Emulation Mode)

The project includes an **Instant Local Sandbox Mode** that runs immediately without requiring active GCP billing credentials:

### 1. Start the System
Simply double click `run.bat` or run in terminal:
```powershell
npm start
```

### 2. Access Web Dashboard
Open your browser to:
```
http://localhost:8080
```

### 3. Run a Scan
- Click the **"Built-in Testbed"** preset button to test 200 OK, 301 Redirects, 404 Dead links, and 500 Errors.
- Or enter any public URL (e.g., `https://news.ycombinator.com`).
- Click **"Start Scan"**.
- View live progress, the radial health score gauge, latency statistics, and export reports to CSV or JSON!

---

## 🌐 Production Google Cloud Deployment

### 1. Prerequisites
- Install [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install).
- Run `gcloud auth login` to authenticate.

### 2. Configure GCP Services
```powershell
.\gcp\setup_gcp.ps1 -ProjectId "your-gcp-project-id"
```

### 3. Deploy to Cloud Run
```powershell
.\gcp\deploy_cloud_run.ps1 -ProjectId "your-gcp-project-id"
```
The script will build the container with Google Cloud Build, deploy to Cloud Run, configure the Pub/Sub Push Subscription, and output your live public URL!

---

## 📁 Repository Structure
```
Cloud-WEBHEALTH/
├── backend/
│   ├── src/
│   │   ├── config/index.js           # GCP config & fallback settings
│   │   ├── services/
│   │   │   ├── crawler.js            # HTML parser & link discovery
│   │   │   ├── linkChecker.js        # HTTP verification & latency profiler
│   │   │   ├── pubsubService.js      # GCP Pub/Sub publish & push handler
│   │   │   ├── firestoreService.js   # GCP Firestore NoSQL database service
│   │   │   └── logger.js             # Google Cloud Logging structured logger
│   │   ├── routes/
│   │   │   ├── scanRoutes.js         # API & Health Report endpoints
│   │   │   └── workerRoutes.js       # Cloud Run Worker Pub/Sub receiver
│   │   ├── app.js                    # Express app & static UI server
│   │   └── server.js                 # Server entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Top navigation & GCP status
│   │   │   ├── GcpPipelineBanner.jsx # Visual GCP pipeline (Slide 6)
│   │   │   ├── ScanInput.jsx         # URL input & presets
│   │   │   ├── HealthScoreCard.jsx   # Radial gauge & latency profile
│   │   │   ├── StatCards.jsx         # Link counts breakdown
│   │   │   ├── StatusDistributionBar.jsx # Visual status bar
│   │   │   ├── RecommendationsPanel.jsx  # Automated health advice
│   │   │   ├── LinksTable.jsx        # Searchable verified links table
│   │   │   ├── CloudLogsDrawer.jsx   # Live GCP Cloud Logging viewer
│   │   │   ├── ArchitectureModal.jsx # Review 1 Slide 6 & 7 diagrams
│   │   │   └── ExportModal.jsx       # JSON/CSV download
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── gcp/
│   ├── setup_gcp.ps1                 # Automated GCP services setup
│   ├── deploy_cloud_run.ps1          # One-click Cloud Run deployment
│   └── terraform/                    # Infrastructure as Code (IaC)
├── Dockerfile                        # Multi-stage Cloud Run container
├── GCP_SETUP_GUIDE.md                # Step-by-step guide from scratch
├── REVIEW_PRESENTATION_CHEATSHEET.md # Viva Q&A and presentation script
└── run.bat                           # 1-click Windows launcher
```
