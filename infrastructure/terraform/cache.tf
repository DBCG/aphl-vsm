resource "aws_elasticache_replication_group" "redis-cache" {
  automatic_failover_enabled = false
  availability_zones         = ["us-east-1a"]
  replication_group_id       = "redis-cache"
  description                = "Store for caching data in the application"
  node_type                  = "cache.t3.micro"
  num_cache_clusters         = 1
  port                       = 6379
}
