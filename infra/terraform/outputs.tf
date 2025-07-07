output "rds_endpoint" {
  value       = aws_db_instance.mysql.endpoint
  description = "The RDS endpoint"
}
output "rds_address" {
  value       = aws_db_instance.mysql.address
  description = "The RDS hostname"
}
output "rds_port" {
  description = "RDS port"
  value       = aws_db_instance.mysql.port
}

output "rds_db_name" {
  description = "RDS database name"
  value       = aws_db_instance.mysql.db_name
}

output "ecr_backend_repository_url" {
  description = "ECR repository URL for backend"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_repository_url" {
  description = "ECR repository URL for frontend"
  value       = aws_ecr_repository.frontend.repository_url
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "backend_service_name" {
  value = aws_ecs_service.backend.name
}

output "frontend_service_name" {
  value = aws_ecs_service.frontend.name
}
