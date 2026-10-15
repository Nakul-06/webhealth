# Google Cloud Platform Setup Script for Cloud-Based Dead Link Detection
# Team: Naghulan Sivamani R V & Shreyaa S V

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectId = "webhealth-gcp-" + (Get-Random -Minimum 1000 -Maximum 9999),
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-central1"
)

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  GCP INFRASTRUCTURE SETUP: DEAD LINK DETECTION SYSTEM          " -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Verify gcloud CLI is installed
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] 'gcloud' CLI is not found on your system." -ForegroundColor Red
    Write-Host "Please install Google Cloud SDK from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    Write-Host "Then run 'gcloud auth login' and re-run this script." -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/5] Setting active project to: $ProjectId" -ForegroundColor Green
gcloud config set project $ProjectId

Write-Host "[2/5] Enabling required Google Cloud APIs..." -ForegroundColor Green
gcloud services enable `
    run.googleapis.com `
    pubsub.googleapis.com `
    firestore.googleapis.com `
    logging.googleapis.com `
    cloudbuild.googleapis.com

Write-Host "[3/5] Initializing Cloud Firestore in Datastore / Native Mode..." -ForegroundColor Green
gcloud firestore databases create --location=$Region --type=firestore-native 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Firestore database initialized successfully." -ForegroundColor Green
} else {
    Write-Host "  Firestore database already exists or is being initialized." -ForegroundColor Yellow
}

Write-Host "[4/5] Creating Cloud Pub/Sub topic 'dead-link-tasks'..." -ForegroundColor Green
gcloud pubsub topics create dead-link-tasks 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Pub/Sub topic 'dead-link-tasks' created successfully." -ForegroundColor Green
} else {
    Write-Host "  Pub/Sub topic 'dead-link-tasks' already exists." -ForegroundColor Yellow
}

Write-Host "[5/5] Creating Service Account for Local / Worker Access..." -ForegroundColor Green
$SaName = "webhealth-sa"
gcloud iam service-accounts create $SaName --description="Service account for WebHealth Detection" --display-name="WebHealth SA" 2>$null
gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$SaName@$ProjectId.iam.gserviceaccount.com" --role="roles/pubsub.editor"
gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$SaName@$ProjectId.iam.gserviceaccount.com" --role="roles/datastore.user"
gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$SaName@$ProjectId.iam.gserviceaccount.com" --role="roles/logging.logWriter"

Write-Host "`nSetup complete! You can now deploy the container to Cloud Run using .\gcp\deploy_cloud_run.ps1" -ForegroundColor Green
