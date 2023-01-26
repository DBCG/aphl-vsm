resource "aws_elasticache_replication_group" "redis-cache" {
  automatic_failover_enabled    = false
  availability_zones            = ["us-east-1a"]
  replication_group_id          = "redis-cache"
  replication_group_description = "Store for caching data in the application"
  node_type                     = "cache.t3.small"
  number_cache_clusters         = 1
  port                          = 6379
}