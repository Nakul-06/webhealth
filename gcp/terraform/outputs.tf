output "cloud_run_url" {
  description = "The public URL of the deployed Cloud Run service"
  value       = google_cloud_run_service.webhealth.status[0].url
}

output "pubsub_topic" {
  description = "Name of the created Pub/Sub topic"
  value       = google_pubsub_topic.dead_link_tasks.name
}

output "firestore_database" {
  description = "Firestore database name"
  value       = google_firestore_database.database.name
}
