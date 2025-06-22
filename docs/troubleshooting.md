# Troubleshooting & Monitoring Guide

## Overview

This guide provides comprehensive troubleshooting steps and monitoring strategies for MCP Orchestrator deployments. It covers common issues, diagnostic tools, and proactive monitoring approaches.

## Quick Diagnostic Commands

### System Health Check
```bash
# One-liner health check
curl -s http://localhost:8000/health | jq '.'

# Comprehensive system status
./scripts/system-status.sh

# Service status
systemctl status mcp-orchestrator
docker ps | grep mcp-orch
```

### Log Access
```bash
# Application logs
journalctl -u mcp-orchestrator -f

# Docker logs
docker logs mcp-orch-frontend -f
docker logs mcp-orch-postgres -f

# Custom log location
tail -f /var/log/mcp-orch/app.log
```

---

## Common Issues & Solutions

### 1. Installation Problems

#### Issue: Install script fails
```bash
# Symptoms
./install.sh
Error: Python 3.11+ not found
Error: Docker not installed
Error: Insufficient permissions
```

**Diagnosis Steps:**
```bash
# Check Python version
python3 --version
python3.11 --version

# Check Docker
docker --version
docker ps

# Check permissions
whoami
groups $USER | grep docker
```

**Solutions:**
```bash
# Install Python 3.11+
sudo apt update
sudo apt install python3.11 python3.11-pip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Fix permissions
sudo chown -R $USER:$USER /opt/mcp-orch
sudo chmod +x /opt/mcp-orch/scripts/*.sh
```

#### Issue: Database initialization fails
```bash
# Symptoms
Database connection failed
Migration errors
Permission denied on database
```

**Diagnosis:**
```bash
# Test database connection
psql "postgresql://mcporch:password@localhost:5432/mcporch"

# Check Docker PostgreSQL
docker logs mcp-orch-postgres
docker exec -it mcp-orch-postgres psql -U mcporch -d mcporch

# Verify environment variables
echo $DATABASE_URL
cat .env | grep DATABASE
```

**Solutions:**
```bash
# Reset database
docker-compose down -v
docker-compose up -d postgres
sleep 10
python -m mcp_orch.database migrate

# Fix permissions
docker exec -it mcp-orch-postgres psql -U postgres
# In psql:
ALTER USER mcporch CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE mcporch TO mcporch;
```

---

### 2. Service Startup Issues

#### Issue: Backend service won't start
```bash
# Symptoms
systemctl status mcp-orchestrator
● mcp-orchestrator.service - failed
   Loaded: loaded (/etc/systemd/system/mcp-orchestrator.service; enabled; vendor preset: enabled)
   Active: failed (Result: exit-code) since...
```

**Diagnosis:**
```bash
# Check service logs
journalctl -u mcp-orchestrator -n 50

# Check configuration
systemctl cat mcp-orchestrator
ls -la /opt/mcp-orch/

# Test manual startup
cd /opt/mcp-orch
source venv/bin/activate
python -m mcp_orch.main
```

**Solutions:**
```bash
# Fix service file
sudo systemctl edit mcp-orchestrator
# Add:
[Service]
Environment=PATH=/opt/mcp-orch/venv/bin:/usr/bin:/bin
WorkingDirectory=/opt/mcp-orch
ExecStartPre=/bin/sleep 10

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart mcp-orchestrator

# Check startup dependencies
sudo systemctl list-dependencies mcp-orchestrator
```

#### Issue: Frontend container fails
```bash
# Symptoms
docker ps
CONTAINER ID   IMAGE   STATUS
abc123         ...     Exited (1) 2 minutes ago
```

**Diagnosis:**
```bash
# Check container logs
docker logs mcp-orch-frontend

# Check image
docker images | grep mcp-orch

# Check build
docker build -t mcp-orch-frontend ./web
```

**Solutions:**
```bash
# Rebuild and restart
docker-compose build frontend
docker-compose up -d frontend

# Check resources
docker stats
free -h
df -h

# Clean up and restart
docker system prune -f
docker-compose down
docker-compose up -d
```

---

### 3. Database Connection Issues

#### Issue: Connection timeouts
```bash
# Symptoms
sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) 
could not connect to server: Connection timed out
```

**Diagnosis:**
```bash
# Test connectivity
telnet database-host 5432
nc -zv database-host 5432

# Check firewall
sudo ufw status
iptables -L | grep 5432

# Check database status
docker ps | grep postgres
systemctl status postgresql
```

**Solutions:**
```bash
# Fix firewall
sudo ufw allow 5432
sudo iptables -A INPUT -p tcp --dport 5432 -j ACCEPT

# Restart database
docker restart mcp-orch-postgres
sudo systemctl restart postgresql

# Update connection string
# In .env, check:
DATABASE_URL="postgresql://user:pass@correct-host:5432/dbname"
```

#### Issue: Too many connections
```bash
# Symptoms
FATAL: remaining connection slots are reserved for non-replication superuser connections
```

**Diagnosis:**
```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Check connection limit
SELECT setting FROM pg_settings WHERE name = 'max_connections';

-- Check connection sources
SELECT usename, application_name, client_addr, count(*) 
FROM pg_stat_activity 
GROUP BY usename, application_name, client_addr;
```

**Solutions:**
```sql
-- Increase connection limit (restart required)
ALTER SYSTEM SET max_connections = 200;
SELECT pg_reload_conf();

-- Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
AND state_change < now() - interval '1 hour';
```

```python
# Implement connection pooling
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600
)
```

---

### 4. MCP Server Issues

#### Issue: MCP servers won't start
```bash
# Symptoms
Server 'github-mcp' failed to start
Connection refused
Process exited with code 1
```

**Diagnosis:**
```bash
# Check server logs
journalctl -u mcp-orchestrator -f | grep mcp_server

# Test server manually
cd /path/to/mcp/server
npm start
node server.js

# Check dependencies
npm ls
pip list | grep mcp
```

**Solutions:**
```bash
# Install missing dependencies
npm install
pip install -r requirements.txt

# Fix permissions
chmod +x server-executable
chown mcp-orch:mcp-orch /path/to/server

# Update server configuration
# In MCP Orchestrator UI:
# 1. Go to project settings
# 2. Edit server configuration
# 3. Update command/args/environment
```

#### Issue: MCP server communication fails
```bash
# Symptoms
MCP protocol error
JSON-RPC error
Timeout waiting for response
```

**Diagnosis:**
```bash
# Check process status
ps aux | grep mcp
pgrep -f "mcp-server"

# Test JSON-RPC manually
echo '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{}}' | nc localhost 3001

# Check logs for protocol errors
journalctl -u mcp-orchestrator | grep -i "json\|rpc\|protocol"
```

**Solutions:**
```python
# Increase timeout in server config
server_config = {
    'command': 'node',
    'args': ['server.js'],
    'timeout': 60,  # Increase from 30 to 60 seconds
    'env': {...}
}

# Add retry logic
async def start_mcp_server_with_retry(config, max_retries=3):
    for attempt in range(max_retries):
        try:
            return await start_mcp_server(config)
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
```

---

### 5. Performance Issues

#### Issue: Slow response times
```bash
# Symptoms
Pages loading slowly
API timeouts
High CPU/memory usage
```

**Diagnosis:**
```bash
# System resources
htop
free -h
iostat 1 5

# Application metrics
curl -s http://localhost:8000/health | jq '.checks'

# Database performance
psql -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

**Solutions:**
```bash
# Scale resources
# For Docker containers:
docker update --memory=4g --cpus=2 mcp-orch-frontend

# For systemd services:
sudo systemctl edit mcp-orchestrator
# Add:
[Service]
MemoryMax=4G
CPUQuota=200%

# Optimize database
psql -c "VACUUM ANALYZE;"
psql -c "REINDEX DATABASE mcporch;"

# Enable caching
# Add to .env:
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600
```

#### Issue: Memory leaks
```bash
# Symptoms
Memory usage keeps increasing
System becomes unresponsive
Out of memory errors
```

**Diagnosis:**
```bash
# Monitor memory over time
watch -n 5 free -h

# Process memory usage
ps aux --sort=-%mem | head -10

# Container memory
docker stats --no-stream
```

**Solutions:**
```python
# Add memory monitoring
import psutil
import logging

def log_memory_usage():
    memory = psutil.virtual_memory()
    logging.info(f"Memory usage: {memory.percent}%")
    if memory.percent > 80:
        logging.warning("High memory usage detected")

# Implement cleanup
import gc
import asyncio

async def periodic_cleanup():
    while True:
        gc.collect()
        await asyncio.sleep(300)  # Every 5 minutes
```

```bash
# Restart services periodically
# Add to crontab:
0 3 * * * /usr/bin/systemctl restart mcp-orchestrator
```

---

### 6. Network Issues

#### Issue: Cannot access web interface
```bash
# Symptoms
Connection refused on port 3000
Timeout connecting to server
DNS resolution failed
```

**Diagnosis:**
```bash
# Check ports
sudo netstat -tlnp | grep -E "3000|8000"
sudo ss -tlnp | grep -E "3000|8000"

# Test local access
curl -I http://localhost:3000
curl -I http://localhost:8000/health

# Check firewall
sudo ufw status
sudo iptables -L | grep -E "3000|8000"
```

**Solutions:**
```bash
# Open firewall ports
sudo ufw allow 3000
sudo ufw allow 8000

# Check service binding
# Ensure services bind to 0.0.0.0, not 127.0.0.1
# In docker-compose.yml:
ports:
  - "3000:3000"  # Not "127.0.0.1:3000:3000"

# Check nginx proxy (if used)
sudo nginx -t
sudo systemctl reload nginx
```

#### Issue: SSL/TLS certificate problems
```bash
# Symptoms
Certificate expired
SSL handshake failed
Mixed content warnings
```

**Diagnosis:**
```bash
# Check certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check certificate dates
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# Check nginx SSL config
sudo nginx -T | grep -A 10 -B 10 ssl
```

**Solutions:**
```bash
# Renew Let's Encrypt certificate
sudo certbot renew --nginx

# Update nginx SSL config
server {
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
}

# Auto-renewal
sudo crontab -e
# Add:
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## Monitoring Setup

### 1. Health Check Monitoring

#### Built-in Health Endpoint
```bash
# Application health
curl -s http://localhost:8000/health | jq '.'
{
  "status": "healthy",
  "timestamp": "2025-06-22T10:30:00Z",
  "version": "1.0.0",
  "checks": {
    "database": "ok",
    "mcp_servers": "ok"
  }
}
```

#### Custom Health Checks
```python
# Add custom health checks
from mcp_orch.monitoring import HealthChecker

health_checker = HealthChecker()

@health_checker.check("disk_space")
async def check_disk_space():
    usage = psutil.disk_usage('/')
    if usage.percent > 90:
        return {"status": "critical", "usage": f"{usage.percent}%"}
    elif usage.percent > 80:
        return {"status": "warning", "usage": f"{usage.percent}%"}
    return {"status": "ok", "usage": f"{usage.percent}%"}

@health_checker.check("mcp_servers")
async def check_mcp_servers():
    # Implementation to check all MCP servers
    pass
```

### 2. Log Monitoring

#### Structured Logging
```python
import structlog
import logging.config

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": structlog.stdlib.ProcessorFormatter,
            "processor": structlog.dev.ConsoleRenderer(colors=False),
            "foreign_pre_chain": [
                structlog.contextvars.merge_contextvars,
                structlog.stdlib.add_log_level,
                structlog.stdlib.PositionalArgumentsFormatter(),
            ],
        },
    },
    "handlers": {
        "default": {
            "level": "INFO",
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
        "file": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": "/var/log/mcp-orch/app.log",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 5,
            "formatter": "json",
        },
    },
    "loggers": {
        "mcp_orch": {
            "handlers": ["default", "file"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

logging.config.dictConfig(LOGGING_CONFIG)
logger = structlog.get_logger("mcp_orch")
```

#### Log Aggregation with ELK Stack
```bash
# Install Filebeat
curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-8.8.0-linux-x86_64.tar.gz
tar xzvf filebeat-8.8.0-linux-x86_64.tar.gz

# Configure Filebeat
cat > filebeat.yml << EOF
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/mcp-orch/*.log
  json.keys_under_root: true
  json.overwrite_keys: true

output.elasticsearch:
  hosts: ["localhost:9200"]

setup.kibana:
  host: "localhost:5601"
EOF

# Start Filebeat
sudo ./filebeat -e
```

### 3. Metrics Collection

#### Prometheus Metrics
```python
from prometheus_client import Counter, Histogram, Gauge, start_http_server

# Define metrics
REQUEST_COUNT = Counter('mcp_orch_requests_total', 'Total requests', ['method', 'endpoint'])
REQUEST_DURATION = Histogram('mcp_orch_request_duration_seconds', 'Request duration')
ACTIVE_CONNECTIONS = Gauge('mcp_orch_active_connections', 'Active database connections')
MCP_SERVERS_STATUS = Gauge('mcp_orch_mcp_servers_online', 'Online MCP servers')

# Middleware to collect metrics
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    REQUEST_DURATION.observe(duration)
    REQUEST_COUNT.labels(method=request.method, endpoint=request.url.path).inc()
    
    return response

# Start metrics server
start_http_server(9090)
```

#### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'mcp-orchestrator'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 5s
    metrics_path: /metrics

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['localhost:9187']
```

### 4. Grafana Dashboard

#### Installation
```bash
# Install Grafana
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
sudo apt-get update
sudo apt-get install grafana

# Start Grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server
```

#### Dashboard Configuration
```json
{
  "dashboard": {
    "title": "MCP Orchestrator Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(mcp_orch_requests_total[5m])",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(mcp_orch_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Database Connections",
        "type": "singlestat",
        "targets": [
          {
            "expr": "mcp_orch_active_connections"
          }
        ]
      }
    ]
  }
}
```

### 5. Alerting

#### Prometheus Alerting Rules
```yaml
# alerts.yml
groups:
  - name: mcp-orchestrator
    rules:
      - alert: HighErrorRate
        expr: rate(mcp_orch_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} per second"

      - alert: DatabaseConnectionsHigh
        expr: mcp_orch_active_connections > 80
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High database connection count"
          description: "Database connections: {{ $value }}"

      - alert: MCPServerDown
        expr: mcp_orch_mcp_servers_online < up
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MCP server is down"
          description: "One or more MCP servers are offline"
```

#### Alertmanager Configuration
```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@your-domain.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default'

receivers:
  - name: 'default'
    email_configs:
      - to: 'admin@your-domain.com'
        subject: '[MCP Orchestrator] Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}

  - name: 'slack'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
        title: 'MCP Orchestrator Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

---

## Automated Monitoring Scripts

### 1. System Health Check Script
```bash
#!/bin/bash
# scripts/health-check.sh

set -e

LOG_FILE="/var/log/mcp-orch/health-check.log"
ALERT_EMAIL="admin@your-domain.com"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

check_service() {
    local service=$1
    if systemctl is-active --quiet "$service"; then
        log "✅ $service is running"
        return 0
    else
        log "❌ $service is not running"
        return 1
    fi
}

check_port() {
    local port=$1
    local desc=$2
    if nc -z localhost "$port" 2>/dev/null; then
        log "✅ $desc (port $port) is accessible"
        return 0
    else
        log "❌ $desc (port $port) is not accessible"
        return 1
    fi
}

check_disk_space() {
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$usage" -lt 80 ]; then
        log "✅ Disk usage: ${usage}%"
        return 0
    else
        log "❌ Disk usage critical: ${usage}%"
        return 1
    fi
}

check_memory() {
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ "$usage" -lt 90 ]; then
        log "✅ Memory usage: ${usage}%"
        return 0
    else
        log "❌ Memory usage critical: ${usage}%"
        return 1
    fi
}

check_database() {
    if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        log "✅ Database connection successful"
        return 0
    else
        log "❌ Database connection failed"
        return 1
    fi
}

main() {
    log "Starting health check..."
    
    local failed=0
    
    check_service "mcp-orchestrator" || failed=$((failed + 1))
    check_port 8000 "Backend API" || failed=$((failed + 1))
    check_port 3000 "Frontend" || failed=$((failed + 1))
    check_port 5432 "Database" || failed=$((failed + 1))
    check_disk_space || failed=$((failed + 1))
    check_memory || failed=$((failed + 1))
    check_database || failed=$((failed + 1))
    
    if [ $failed -eq 0 ]; then
        log "✅ All health checks passed"
        exit 0
    else
        log "❌ $failed health checks failed"
        
        # Send alert email
        if command -v mail >/dev/null 2>&1; then
            tail -n 20 "$LOG_FILE" | mail -s "MCP Orchestrator Health Check Failed" "$ALERT_EMAIL"
        fi
        
        exit 1
    fi
}

main "$@"
```

### 2. Performance Monitoring Script
```bash
#!/bin/bash
# scripts/performance-monitor.sh

METRICS_FILE="/var/log/mcp-orch/metrics.log"

collect_metrics() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # System metrics
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    local memory_usage=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    # Application metrics
    local response_time=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:8000/health)
    local db_connections=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null || echo "0")
    
    # Log metrics in JSON format
    cat >> "$METRICS_FILE" << EOF
{
  "timestamp": "$timestamp",
  "system": {
    "cpu_usage": $cpu_usage,
    "memory_usage": $memory_usage,
    "disk_usage": $disk_usage
  },
  "application": {
    "response_time": $response_time,
    "db_connections": $db_connections
  }
}
EOF
}

# Collect metrics every 60 seconds
while true; do
    collect_metrics
    sleep 60
done
```

### 3. Log Analysis Script
```bash
#!/bin/bash
# scripts/log-analysis.sh

LOG_DIR="/var/log/mcp-orch"
REPORT_FILE="/tmp/mcp-orch-log-report.txt"

analyze_errors() {
    echo "=== Error Analysis (Last 24 hours) ===" > "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Count errors by type
    find "$LOG_DIR" -name "*.log" -mtime -1 -exec grep -i "error\|exception\|failed" {} \; | \
        awk '{print $0}' | sort | uniq -c | sort -nr | head -10 >> "$REPORT_FILE"
    
    echo "" >> "$REPORT_FILE"
    echo "=== Most Recent Errors ===" >> "$REPORT_FILE"
    find "$LOG_DIR" -name "*.log" -mtime -1 -exec grep -i "error\|exception\|failed" {} \; | \
        tail -20 >> "$REPORT_FILE"
}

analyze_performance() {
    echo "" >> "$REPORT_FILE"
    echo "=== Performance Analysis ===" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Slow requests
    grep "duration" "$LOG_DIR"/*.log | \
        awk '$NF > 1000 {print $0}' | \
        sort -k7 -nr | head -10 >> "$REPORT_FILE"
}

generate_summary() {
    echo "" >> "$REPORT_FILE"
    echo "=== Summary ===" >> "$REPORT_FILE"
    echo "Report generated: $(date)" >> "$REPORT_FILE"
    echo "Log files analyzed: $(find "$LOG_DIR" -name "*.log" -mtime -1 | wc -l)" >> "$REPORT_FILE"
    echo "Total errors: $(find "$LOG_DIR" -name "*.log" -mtime -1 -exec grep -ci "error\|exception\|failed" {} \; | awk '{sum+=$1} END {print sum}')" >> "$REPORT_FILE"
}

main() {
    analyze_errors
    analyze_performance
    generate_summary
    
    # Email report
    if [ -s "$REPORT_FILE" ]; then
        mail -s "MCP Orchestrator Daily Log Report" admin@your-domain.com < "$REPORT_FILE"
    fi
}

main "$@"
```

---

## Automated Maintenance

### 1. Database Maintenance
```bash
#!/bin/bash
# scripts/db-maintenance.sh

perform_vacuum() {
    echo "Starting database vacuum..."
    psql "$DATABASE_URL" -c "VACUUM ANALYZE;"
    echo "Database vacuum completed"
}

cleanup_old_logs() {
    echo "Cleaning up old activity logs..."
    psql "$DATABASE_URL" -c "
        DELETE FROM project_activities 
        WHERE created_at < NOW() - INTERVAL '90 days';
        
        DELETE FROM tool_call_logs 
        WHERE created_at < NOW() - INTERVAL '30 days';
    "
    echo "Old logs cleaned up"
}

update_statistics() {
    echo "Updating database statistics..."
    psql "$DATABASE_URL" -c "ANALYZE;"
    echo "Statistics updated"
}

# Run weekly maintenance
perform_vacuum
cleanup_old_logs
update_statistics
```

### 2. Log Rotation
```bash
# /etc/logrotate.d/mcp-orch
/var/log/mcp-orch/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 mcp-orch mcp-orch
    postrotate
        systemctl reload mcp-orchestrator
    endscript
}
```

### 3. Backup Automation
```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/opt/backups/mcp-orch"
S3_BUCKET="mcp-orch-backups"
RETENTION_DAYS=30

create_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/mcp-orch-backup-$timestamp.tar.gz"
    
    mkdir -p "$BACKUP_DIR"
    
    # Database backup
    pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/database-$timestamp.sql.gz"
    
    # Configuration backup
    tar -czf "$backup_file" \
        --exclude="*.log" \
        --exclude="venv" \
        --exclude="node_modules" \
        /opt/mcp-orch
    
    echo "Backup created: $backup_file"
    
    # Upload to S3 (if configured)
    if command -v aws >/dev/null 2>&1; then
        aws s3 cp "$backup_file" "s3://$S3_BUCKET/"
        aws s3 cp "$BACKUP_DIR/database-$timestamp.sql.gz" "s3://$S3_BUCKET/"
    fi
    
    # Cleanup old backups
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
}

create_backup
```

### 4. Security Audit
```bash
#!/bin/bash
# scripts/security-audit.sh

AUDIT_LOG="/var/log/mcp-orch/security-audit.log"

log_audit() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$AUDIT_LOG"
}

check_file_permissions() {
    log_audit "Checking file permissions..."
    
    # Check sensitive files
    local files=(
        "/opt/mcp-orch/.env"
        "/etc/systemd/system/mcp-orchestrator.service"
        "/opt/mcp-orch/configs/"
    )
    
    for file in "${files[@]}"; do
        if [ -e "$file" ]; then
            local perms=$(stat -c "%a" "$file")
            if [ "$perms" -gt 644 ]; then
                log_audit "WARNING: $file has permissions $perms (should be 644 or less)"
            else
                log_audit "OK: $file permissions: $perms"
            fi
        fi
    done
}

check_open_ports() {
    log_audit "Checking open ports..."
    
    # Check for unexpected open ports
    local open_ports=$(ss -tlnp | grep LISTEN | awk '{print $4}' | cut -d: -f2 | sort -n | uniq)
    local expected_ports="22 80 443 3000 5432 8000"
    
    for port in $open_ports; do
        if echo "$expected_ports" | grep -q "$port"; then
            log_audit "OK: Port $port is expected"
        else
            log_audit "WARNING: Unexpected open port: $port"
        fi
    done
}

check_failed_logins() {
    log_audit "Checking failed login attempts..."
    
    local failed_logins=$(journalctl --since "24 hours ago" | grep -i "failed\|invalid" | wc -l)
    if [ "$failed_logins" -gt 10 ]; then
        log_audit "WARNING: $failed_logins failed login attempts in last 24 hours"
    else
        log_audit "OK: $failed_logins failed login attempts in last 24 hours"
    fi
}

main() {
    log_audit "Starting security audit..."
    check_file_permissions
    check_open_ports
    check_failed_logins
    log_audit "Security audit completed"
}

main "$@"
```

---

## Cron Schedule Setup

```bash
# Edit crontab
sudo crontab -e

# Add monitoring and maintenance tasks
# Health check every 5 minutes
*/5 * * * * /opt/mcp-orch/scripts/health-check.sh

# Performance monitoring every minute
* * * * * /opt/mcp-orch/scripts/performance-monitor.sh

# Daily log analysis at 6 AM
0 6 * * * /opt/mcp-orch/scripts/log-analysis.sh

# Weekly database maintenance on Sunday at 2 AM
0 2 * * 0 /opt/mcp-orch/scripts/db-maintenance.sh

# Daily backup at 1 AM
0 1 * * * /opt/mcp-orch/scripts/backup.sh

# Weekly security audit on Monday at 3 AM
0 3 * * 1 /opt/mcp-orch/scripts/security-audit.sh

# Clean up old logs weekly
0 4 * * 0 /usr/sbin/logrotate /etc/logrotate.d/mcp-orch
```

---

## Emergency Procedures

### 1. Service Recovery
```bash
#!/bin/bash
# scripts/emergency-recovery.sh

log() {
    echo "$(date) - $1" | tee -a /var/log/mcp-orch/emergency.log
}

restart_services() {
    log "Restarting all services..."
    
    # Stop services
    systemctl stop mcp-orchestrator
    docker-compose down
    
    # Wait and start
    sleep 10
    docker-compose up -d postgres
    sleep 15
    systemctl start mcp-orchestrator
    
    log "Services restarted"
}

restore_from_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        log "ERROR: No backup file specified"
        return 1
    fi
    
    log "Restoring from backup: $backup_file"
    
    # Stop services
    systemctl stop mcp-orchestrator
    
    # Restore database
    if [ -f "$backup_file" ]; then
        gunzip -c "$backup_file" | psql "$DATABASE_URL"
        log "Database restored from $backup_file"
    fi
    
    # Start services
    systemctl start mcp-orchestrator
    
    log "Restore completed"
}

case "$1" in
    "restart")
        restart_services
        ;;
    "restore")
        restore_from_backup "$2"
        ;;
    *)
        echo "Usage: $0 {restart|restore backup_file}"
        exit 1
        ;;
esac
```

### 2. Disaster Recovery
```bash
#!/bin/bash
# scripts/disaster-recovery.sh

# Full system recovery procedure
BACKUP_LOCATION="/opt/backups/mcp-orch"
S3_BUCKET="mcp-orch-backups"

recover_system() {
    echo "Starting disaster recovery..."
    
    # 1. Download latest backup from S3
    if command -v aws >/dev/null 2>&1; then
        aws s3 sync "s3://$S3_BUCKET/" "$BACKUP_LOCATION/"
    fi
    
    # 2. Find latest backup
    local latest_backup=$(ls -t "$BACKUP_LOCATION"/mcp-orch-backup-*.tar.gz | head -1)
    local latest_db_backup=$(ls -t "$BACKUP_LOCATION"/database-*.sql.gz | head -1)
    
    if [ -z "$latest_backup" ] || [ -z "$latest_db_backup" ]; then
        echo "ERROR: No backups found"
        exit 1
    fi
    
    echo "Using backup: $latest_backup"
    echo "Using DB backup: $latest_db_backup"
    
    # 3. Stop all services
    systemctl stop mcp-orchestrator || true
    docker-compose down || true
    
    # 4. Restore application files
    cd /
    tar -xzf "$latest_backup"
    
    # 5. Restore database
    docker-compose up -d postgres
    sleep 30
    gunzip -c "$latest_db_backup" | psql "$DATABASE_URL"
    
    # 6. Start services
    systemctl start mcp-orchestrator
    
    echo "Disaster recovery completed"
}

recover_system
```

---

This comprehensive troubleshooting and monitoring guide should help you maintain a healthy MCP Orchestrator deployment and quickly resolve issues when they arise. Regular monitoring and proactive maintenance are key to preventing problems before they impact users.