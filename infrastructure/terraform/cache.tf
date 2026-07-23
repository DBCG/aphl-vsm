resource "aws_elasticache_replication_group" "vsm-cache-dev" {
  replication_group_id = "vsm-cache-dev"
  description          = " "

  node_type          = "cache.t4g.micro"
  num_cache_clusters = 1
  port               = 6379

  subnet_group_name  = "vsm-app"
  security_group_ids = ["sg-04a01934d6f660e87", "sg-07eab90db0dbde532"]

  automatic_failover_enabled = false
  multi_az_enabled           = false

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  snapshot_retention_limit   = 0
  snapshot_window            = "05:30-06:30"
  auto_minor_version_upgrade = true

  log_delivery_configuration {
    destination      = "vsm-cache-dev-engine"
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "engine-log"
  }

  log_delivery_configuration {
    destination      = "vsm-cache-dev-slow"
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  lifecycle {
    ignore_changes = [engine, engine_version]
  }
}
