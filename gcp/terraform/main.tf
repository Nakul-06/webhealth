terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# 1. Enable Required GCP APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "pubsub.googleapis.com",
    "firestore.googleapis.com",
    "logging.googleapis.com",
    "cloudbuild.googleapis.com"
  ])
  service            = each.key
  disable_on_destroy = false
}

# 2. Google Cloud Firestore Database (Native Mode)
resource "google_firestore_database" "database" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.apis]
}

# 3. Google Cloud Pub/Sub Topic for Distributing Tasks
resource "google_pubsub_topic" "dead_link_tasks" {
  name = var.pubsub_topic_name

  depends_on = [google_project_service.apis]
}

# 4. Google Cloud Run Service (Entry Point & Web Dashboard)
resource "google_cloud_run_service" "webhealth" {
  name     = var.service_name
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/${var.service_name}:latest"
        
        resources {
          limits = {
            memory = "512Mi"
            cpu    = "1000m"
          }
        }

        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
        }
        env {
          name  = "USE_MOCK_GCP"
          value = "false"
        }
        env {
          name  = "PUBSUB_TOPIC_NAME"
          value = var.pubsub_topic_name
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [google_project_service.apis, google_pubsub_topic.dead_link_tasks]
}

# Allow public unauthenticated access to the Cloud Run Web Dashboard
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.webhealth.name
  location = google_cloud_run_service.webhealth.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# 5. Pub/Sub Push Subscription to the Cloud Run Worker Endpoint
resource "google_pubsub_subscription" "worker_push_subscription" {
  name  = "${var.pubsub_topic_name}-push"
  topic = google_pubsub_topic.dead_link_tasks.name

  push_config {
    push_endpoint = "${google_cloud_run_service.webhealth.status[0].url}/api/worker/pubsub-push"
  }

  ack_deadline_seconds = 60
}
