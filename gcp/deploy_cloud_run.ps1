# Google Cloud Run Deployment Script
param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectId = (gcloud config get-value project 2>$null),
    [Parameter(Mandatory=$false)]
    [string]$ServiceName = "webhealth-gcp",
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-central1"
)

if (-not $ProjectId) {
    Write-Host "[ERROR] No GCP Project ID configured. Run 'gcloud config set project <YOUR_PROJECT_ID>'" -ForegroundColor Red
    exit 1
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  DEPLOYING TO GOOGLE CLOUD RUN: $ServiceName ($Region)         " -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Build Container Image via Google Cloud Build
$ImageTag = "gcr.io/$ProjectId/$ServiceName"
Write-Host "[1/3] Building container image via Google Cloud Build: $ImageTag..." -ForegroundColor Green
gcloud builds submit --tag $ImageTag .

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Cloud Build failed." -ForegroundColor Red
    exit 1
}

# 2. Deploy Container to Cloud Run
Write-Host "[2/3] Deploying to Cloud Run ($Region)..." -ForegroundColor Green
gcloud run deploy $ServiceName `
    --image $ImageTag `
    --platform managed `
    --region $Region `
    --allow-unauthenticated `
    --set-env-vars "GCP_PROJECT_ID=$ProjectId,USE_MOCK_GCP=false,PUBSUB_TOPIC_NAME=dead-link-tasks,NODE_ENV=production"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Cloud Run deployment failed." -ForegroundColor Red
    exit 1
}

# 3. Get the deployed Cloud Run Service URL
$ServiceUrl = (gcloud run services describe $ServiceName --platform managed --region $Region --format "value(status.url)")
Write-Host "`n[3/3] Cloud Run is LIVE at: $ServiceUrl" -ForegroundColor Green

# 4. Create Pub/Sub Push Subscription to the Cloud Run Worker endpoint
Write-Host "Configuring Pub/Sub Push Subscription to Cloud Run Worker endpoint..." -ForegroundColor Cyan
$PushEndpoint = "$ServiceUrl/api/worker/pubsub-push"

gcloud pubsub subscriptions create dead-link-tasks-push `
    --topic=dead-link-tasks `
    --push-endpoint=$PushEndpoint `
    --ack-deadline=60 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Pub/Sub Push Subscription created successfully -> $PushEndpoint" -ForegroundColor Green
} else {
    Write-Host "  Pub/Sub Subscription already exists. Updating push endpoint..." -ForegroundColor Yellow
    gcloud pubsub subscriptions update dead-link-tasks-push --push-endpoint=$PushEndpoint
}

Write-Host "`n================================================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT SUCCESSFUL!                                        " -ForegroundColor Green
Write-Host "  Open your browser to: $ServiceUrl                             " -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Green
