variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
}

variable "region" {
  description = "Google Cloud region for deployment"
  type        = string
  default     = "us-central1"
}

variable "service_name" {
  description = "Name of the Cloud Run service"
  type        = string
  default     = "webhealth-gcp"
}

variable "pubsub_topic_name" {
  description = "Pub/Sub topic for link checking tasks"
  type        = string
  default     = "dead-link-tasks"
}
