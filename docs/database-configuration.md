# Database Configuration Guide

## Overview

MCP Orchestrator supports multiple database backends to accommodate different deployment scenarios. This guide covers configuration for local development, team collaboration, and production deployments.

## Supported Database Backends

| Database | Use Case | Setup Complexity | Scalability | Cost |
|----------|----------|------------------|-------------|------|
| SQLite | Development, Testing | ⭐ | ⭐ | Free |
| Docker PostgreSQL | Team, Standard Production | ⭐⭐ | ⭐⭐⭐ | Free |
| AWS RDS | Production, Enterprise | ⭐⭐⭐ | ⭐⭐⭐⭐ | Paid |
| AWS Aurora | High-scale Enterprise | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Paid |
| Supabase | Managed, Developer-friendly | ⭐⭐ | ⭐⭐⭐⭐ | Freemium |
| Google Cloud SQL | GCP Environment | ⭐⭐⭐ | ⭐⭐⭐⭐ | Paid |

---

## 1. SQLite Configuration (Development)

### When to Use
- ✅ Local development and testing
- ✅ Single-user environments
- ✅ Quick prototyping
- ❌ Team collaboration
- ❌ Production workloads

### Configuration

#### Environment Variables
```bash
# .env
DATABASE_URL="sqlite:///./mcp_orch.db"
DATABASE_TYPE="sqlite"
```

#### Installation
```bash
# Automatic setup with install script
./install.sh
# Choose option 1: Minimal (SQLite + Local)

# Manual setup
python -m mcp_orch.database init
python -m mcp_orch.database migrate
```

#### File Location
```
mcp-orch/
├── mcp_orch.db          # SQLite database file
├── mcp_orch.db-wal      # Write-ahead log
└── mcp_orch.db-shm      # Shared memory file
```

#### Backup & Restore
```bash
# Backup
cp mcp_orch.db mcp_orch_backup_$(date +%Y%m%d_%H%M%S).db

# Restore
cp mcp_orch_backup_20250622_103000.db mcp_orch.db

# Automated backup script
#!/bin/bash
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR
sqlite3 mcp_orch.db ".backup $BACKUP_DIR/mcp_orch_$(date +%Y%m%d_%H%M%S).db"
```

---

## 2. Docker PostgreSQL Configuration (Standard)

### When to Use
- ✅ Team development
- ✅ Small to medium production
- ✅ Easy backup/restore
- ✅ Multi-user support
- ❌ High-availability requirements

### Quick Setup
```bash
# Automatic setup with install script
./install.sh
# Choose option 2: Standard (PostgreSQL Docker + Native Backend)
```

### Manual Configuration

#### Docker Compose Setup
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    container_name: mcp-orch-postgres
    environment:
      POSTGRES_DB: mcporch
      POSTGRES_USER: mcporch
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mcporch"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
    driver: local
```

#### Environment Variables
```bash
# .env
DATABASE_URL="postgresql://mcporch:${POSTGRES_PASSWORD}@localhost:5432/mcporch"
DATABASE_TYPE="postgresql"
POSTGRES_PASSWORD="your_secure_password_here"

# Generate secure password
POSTGRES_PASSWORD=$(openssl rand -base64 32)
```

#### Service Management
```bash
# Start PostgreSQL
docker compose up -d postgres

# Check status
docker compose ps
docker logs mcp-orch-postgres

# Stop PostgreSQL
docker compose down

# Reset database (⚠️ WARNING: Data loss)
docker compose down -v
docker compose up -d postgres
```

#### Database Operations
```bash
# Connect to database
docker exec -it mcp-orch-postgres psql -U mcporch -d mcporch

# Run migrations
python -m mcp_orch.database migrate

# Create backup
docker exec mcp-orch-postgres pg_dump -U mcporch mcporch > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker exec -i mcp-orch-postgres psql -U mcporch -d mcporch < backup_20250622_103000.sql
```

---

## 3. AWS RDS Configuration (Production)

### When to Use
- ✅ Production deployments
- ✅ Managed database service
- ✅ Automatic backups
- ✅ High availability options
- ✅ Security compliance

### Setup Process

#### 1. Create RDS Instance
```bash
# Using AWS CLI
aws rds create-db-instance \
    --db-instance-identifier mcp-orch-prod \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 15.4 \
    --master-username mcporch \
    --master-user-password $(aws secretsmanager get-random-password --password-length 32 --require-each-included-type --output text --query Password) \
    --allocated-storage 20 \
    --storage-type gp2 \
    --storage-encrypted \
    --vpc-security-group-ids sg-12345678 \
    --db-subnet-group-name mcp-orch-subnet-group \
    --backup-retention-period 7 \
    --enable-performance-insights \
    --performance-insights-retention-period 7 \
    --deletion-protection
```

#### 2. Security Group Configuration
```bash
# Allow access from application servers
aws ec2 authorize-security-group-ingress \
    --group-id sg-12345678 \
    --protocol tcp \
    --port 5432 \
    --source-group sg-87654321  # App server security group
```

#### 3. Environment Configuration
```bash
# .env
DATABASE_URL="postgresql://mcporch:password@mcp-orch-prod.cluster-xyz.us-east-1.rds.amazonaws.com:5432/mcporch"
DATABASE_TYPE="postgresql"

# Using AWS Secrets Manager (recommended)
DATABASE_URL_SECRET_ARN="arn:aws:secretsmanager:us-east-1:123456789:secret:mcp-orch-db-credentials"
```

#### 4. Connection Testing
```bash
# Test connection from application server
psql "postgresql://mcporch:password@mcp-orch-prod.cluster-xyz.us-east-1.rds.amazonaws.com:5432/mcporch"

# Test with application
python -c "
from mcp_orch.database import engine
with engine.connect() as conn:
    result = conn.execute('SELECT version()')
    print(result.fetchone())
"
```

### Best Practices

#### Security
- ✅ Use IAM database authentication
- ✅ Enable encryption at rest
- ✅ Use VPC for network isolation
- ✅ Store credentials in AWS Secrets Manager
- ✅ Enable CloudTrail for audit logging

#### Performance
- ✅ Enable Performance Insights
- ✅ Configure appropriate instance size
- ✅ Use connection pooling
- ✅ Monitor slow query logs
- ✅ Set up CloudWatch alarms

#### Backup & Recovery
```bash
# Automated backups (configured during creation)
BACKUP_RETENTION_PERIOD=7  # days

# Manual snapshot
aws rds create-db-snapshot \
    --db-instance-identifier mcp-orch-prod \
    --db-snapshot-identifier mcp-orch-manual-$(date +%Y%m%d-%H%M%S)

# Point-in-time recovery
aws rds restore-db-instance-to-point-in-time \
    --source-db-instance-identifier mcp-orch-prod \
    --target-db-instance-identifier mcp-orch-restored \
    --restore-time 2025-06-22T10:30:00Z
```

---

## 4. AWS Aurora Configuration (Enterprise)

### When to Use
- ✅ High-scale production
- ✅ Global applications
- ✅ Serverless workloads
- ✅ Advanced monitoring needs
- ✅ Multi-region deployments

### Serverless Aurora Setup

#### 1. Create Aurora Serverless Cluster
```bash
aws rds create-db-cluster \
    --db-cluster-identifier mcp-orch-aurora \
    --engine aurora-postgresql \
    --engine-mode serverless \
    --master-username mcporch \
    --master-user-password $(aws secretsmanager get-random-password --password-length 32 --require-each-included-type --output text --query Password) \
    --scaling-configuration MinCapacity=2,MaxCapacity=16,AutoPause=true,SecondsUntilAutoPause=300 \
    --storage-encrypted \
    --vpc-security-group-ids sg-12345678 \
    --db-subnet-group-name mcp-orch-subnet-group \
    --backup-retention-period 7 \
    --enable-http-endpoint \
    --deletion-protection
```

#### 2. Data API Configuration (Serverless)
```python
# Using Aurora Data API for serverless apps
import boto3

rds_data = boto3.client('rds-data')

def execute_query(sql, parameters=None):
    response = rds_data.execute_statement(
        resourceArn='arn:aws:rds:us-east-1:123456789:cluster:mcp-orch-aurora',
        secretArn='arn:aws:secretsmanager:us-east-1:123456789:secret:aurora-credentials',
        database='mcporch',
        sql=sql,
        parameters=parameters or []
    )
    return response
```

### Provisioned Aurora Setup

#### 1. Create Aurora Cluster
```bash
aws rds create-db-cluster \
    --db-cluster-identifier mcp-orch-aurora-cluster \
    --engine aurora-postgresql \
    --master-username mcporch \
    --master-user-password $(aws secretsmanager get-random-password --password-length 32 --require-each-included-type --output text --query Password) \
    --storage-encrypted \
    --vpc-security-group-ids sg-12345678 \
    --db-subnet-group-name mcp-orch-subnet-group \
    --backup-retention-period 7
```

#### 2. Create Aurora Instances
```bash
# Primary instance
aws rds create-db-instance \
    --db-instance-identifier mcp-orch-aurora-writer \
    --db-instance-class db.r5.large \
    --engine aurora-postgresql \
    --db-cluster-identifier mcp-orch-aurora-cluster

# Read replica
aws rds create-db-instance \
    --db-instance-identifier mcp-orch-aurora-reader-1 \
    --db-instance-class db.r5.large \
    --engine aurora-postgresql \
    --db-cluster-identifier mcp-orch-aurora-cluster
```

#### 3. Global Database (Multi-Region)
```bash
# Create global cluster
aws rds create-global-cluster \
    --global-cluster-identifier mcp-orch-global \
    --source-db-cluster-identifier mcp-orch-aurora-cluster

# Add secondary region
aws rds create-db-cluster \
    --db-cluster-identifier mcp-orch-aurora-eu \
    --engine aurora-postgresql \
    --global-cluster-identifier mcp-orch-global \
    --region eu-west-1
```

### Environment Configuration
```bash
# .env
# Writer endpoint (read/write)
DATABASE_URL="postgresql://mcporch:password@mcp-orch-aurora-cluster.cluster-xyz.us-east-1.rds.amazonaws.com:5432/mcporch"

# Reader endpoint (read-only)
DATABASE_READER_URL="postgresql://mcporch:password@mcp-orch-aurora-cluster.cluster-ro-xyz.us-east-1.rds.amazonaws.com:5432/mcporch"

DATABASE_TYPE="postgresql"
```

---

## 5. Supabase Configuration (Managed)

### When to Use
- ✅ Rapid development
- ✅ Real-time features
- ✅ Managed PostgreSQL
- ✅ Built-in authentication
- ✅ Developer-friendly dashboard

### Setup Process

#### 1. Create Supabase Project
1. Visit [supabase.com](https://supabase.com)
2. Create new project
3. Choose region and database password
4. Wait for provisioning (2-3 minutes)

#### 2. Get Connection Details
```bash
# From Supabase Dashboard > Settings > Database
HOST="db.abcdefghijklmnop.supabase.co"
PORT="5432"
DATABASE="postgres"
USERNAME="postgres"
PASSWORD="your_secure_password"
```

#### 3. Environment Configuration
```bash
# .env
DATABASE_URL="postgresql://postgres:your_secure_password@db.abcdefghijklmnop.supabase.co:5432/postgres"
DATABASE_TYPE="postgresql"

# Optional: Connection pooling
DATABASE_URL="postgresql://postgres.abcdefghijklmnop:your_secure_password@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```

#### 4. SSL Configuration
```python
# mcp_orch/database.py
from sqlalchemy import create_engine

# Supabase requires SSL
engine = create_engine(
    DATABASE_URL,
    connect_args={
        "sslmode": "require"
    }
)
```

### Best Practices

#### Security
- ✅ Use Row Level Security (RLS)
- ✅ Configure API keys properly
- ✅ Use connection pooling
- ✅ Monitor usage in dashboard

#### Features Integration
```sql
-- Enable real-time for activity tracking
ALTER PUBLICATION supabase_realtime ADD TABLE project_activities;

-- Row Level Security example
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own projects" ON projects
    FOR SELECT USING (auth.uid()::text = user_id);
```

---

## 6. Google Cloud SQL Configuration

### When to Use
- ✅ Google Cloud Platform environment
- ✅ Integration with GCP services
- ✅ Managed PostgreSQL
- ✅ High availability options

### Setup Process

#### 1. Create Cloud SQL Instance
```bash
# Using gcloud CLI
gcloud sql instances create mcp-orch-prod \
    --database-version=POSTGRES_15 \
    --tier=db-custom-2-4096 \
    --region=us-central1 \
    --storage-size=20GB \
    --storage-type=SSD \
    --storage-auto-increase \
    --backup-start-time=03:00 \
    --enable-bin-log \
    --maintenance-window-day=SUN \
    --maintenance-window-hour=4
```

#### 2. Create Database and User
```bash
# Create database
gcloud sql databases create mcporch --instance=mcp-orch-prod

# Create user
gcloud sql users create mcporch \
    --instance=mcp-orch-prod \
    --password=$(openssl rand -base64 32)
```

#### 3. Configure Access
```bash
# Allow application server IP
gcloud sql instances patch mcp-orch-prod \
    --authorized-networks=YOUR_APP_SERVER_IP/32

# Or use Cloud SQL Proxy (recommended)
./cloud_sql_proxy -instances=PROJECT_ID:us-central1:mcp-orch-prod=tcp:5432
```

#### 4. Environment Configuration
```bash
# .env
# Direct connection
DATABASE_URL="postgresql://mcporch:password@INSTANCE_IP:5432/mcporch"

# Using Cloud SQL Proxy
DATABASE_URL="postgresql://mcporch:password@127.0.0.1:5432/mcporch"

DATABASE_TYPE="postgresql"
```

---

## Connection Pooling Configuration

### Why Connection Pooling?
- ⚡ Improved performance
- 📈 Better resource utilization
- 🔧 Connection limit management
- 💰 Reduced database costs

### PgBouncer Setup
```bash
# Install PgBouncer
sudo apt-get install pgbouncer

# Configuration
# /etc/pgbouncer/pgbouncer.ini
[databases]
mcporch = host=localhost port=5432 dbname=mcporch

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = trust
pool_mode = transaction
max_client_conn = 100
default_pool_size = 25
```

### Application Configuration
```python
# mcp_orch/database.py
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,           # Number of connections to maintain
    max_overflow=30,        # Additional connections when needed
    pool_pre_ping=True,     # Validate connections before use
    pool_recycle=3600,      # Recycle connections every hour
)
```

---

## Monitoring and Maintenance

### Database Health Checks
```python
# Health check implementation
async def check_database_health():
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
            return {"status": "healthy", "latency_ms": 5}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
```

### Performance Monitoring
```sql
-- Top 10 slowest queries
SELECT query, mean_time, calls, rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Database size monitoring
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'mcp_orch'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Connection monitoring
SELECT 
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active_connections,
    count(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity;
```

### Automated Backups
```bash
#!/bin/bash
# backup-database.sh

# Configuration
BACKUP_DIR="/opt/mcp-orch/backups"
RETENTION_DAYS=30
DB_NAME="mcporch"
DB_USER="mcporch"
DB_HOST="localhost"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/mcporch_backup_$TIMESTAMP.sql"

# Perform backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Remove old backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_FILE.gz s3://mcp-orch-backups/
# gsutil cp $BACKUP_FILE.gz gs://mcp-orch-backups/

echo "Backup completed: $BACKUP_FILE.gz"
```

### Cron Schedule
```bash
# crontab -e
# Daily backup at 3 AM
0 3 * * * /opt/mcp-orch/scripts/backup-database.sh

# Weekly health check report
0 9 * * 1 /opt/mcp-orch/scripts/database-health-report.sh
```

---

## Migration Guides

### SQLite to PostgreSQL
```python
# migration script
import sqlite3
import psycopg2
from sqlalchemy import create_engine

def migrate_sqlite_to_postgresql():
    # Export from SQLite
    sqlite_conn = sqlite3.connect('mcp_orch.db')
    sqlite_conn.row_factory = sqlite3.Row
    
    # Import to PostgreSQL
    pg_engine = create_engine(POSTGRESQL_URL)
    
    tables = ['users', 'teams', 'projects', 'mcp_servers']
    
    for table in tables:
        # Read from SQLite
        cursor = sqlite_conn.execute(f"SELECT * FROM {table}")
        rows = cursor.fetchall()
        
        # Write to PostgreSQL
        with pg_engine.begin() as conn:
            for row in rows:
                columns = ', '.join(row.keys())
                placeholders = ', '.join(['?' for _ in row])
                sql = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
                conn.execute(sql, tuple(row))
    
    sqlite_conn.close()
    print("Migration completed successfully!")
```

### Database Version Upgrades
```bash
# PostgreSQL major version upgrade
# 1. Create backup
pg_dump mcporch > pre_upgrade_backup.sql

# 2. Setup new database
docker run -d --name postgres-15 postgres:15-alpine

# 3. Restore data
psql -h new-host -d mcporch < pre_upgrade_backup.sql

# 4. Update connection string
sed -i 's/old-host/new-host/g' .env

# 5. Restart application
systemctl restart mcp-orchestrator
```

---

## Troubleshooting Common Issues

### Connection Issues
```bash
# Test basic connectivity
telnet database-host 5432

# Test database connection
psql "postgresql://user:pass@host:port/dbname"

# Check application logs
journalctl -u mcp-orchestrator -f | grep database

# Verify connection string
python -c "
from mcp_orch.config import settings
print(f'Database URL: {settings.database.url}')
"
```

### Performance Issues
```sql
-- Check for locks
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
    JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
    JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'mcp_orch'
ORDER BY size_bytes DESC;
```

### Space Issues
```bash
# Check disk space
df -h

# Check database size
psql -c "\l+"

# Clean up logs
sudo journalctl --vacuum-time=7d

# Vacuum database
psql -c "VACUUM ANALYZE;"
```

---

## Security Best Practices

### Database Security Checklist
- [ ] ✅ Use strong passwords (32+ characters)
- [ ] ✅ Enable SSL/TLS encryption
- [ ] ✅ Restrict network access
- [ ] ✅ Regular security updates
- [ ] ✅ Monitor access logs
- [ ] ✅ Use least privilege principle
- [ ] ✅ Regular backup testing
- [ ] ✅ Encrypt backups
- [ ] ✅ Use secrets management
- [ ] ✅ Enable audit logging

### Password Security
```bash
# Generate secure passwords
openssl rand -base64 32

# Store in environment variable
export POSTGRES_PASSWORD=$(openssl rand -base64 32)

# Use AWS Secrets Manager
aws secretsmanager create-secret \
    --name mcp-orch/database/password \
    --description "MCP Orchestrator database password" \
    --secret-string $(openssl rand -base64 32)
```

### Network Security
```bash
# Firewall rules (UFW)
sudo ufw allow from APP_SERVER_IP to any port 5432

# Security groups (AWS)
aws ec2 authorize-security-group-ingress \
    --group-id sg-database \
    --protocol tcp \
    --port 5432 \
    --source-group sg-application
```

---

## Cost Optimization

### Database Sizing Guidelines

| Users | Projects | Servers | DB Size | Instance Type | Monthly Cost* |
|-------|----------|---------|---------|---------------|---------------|
| 1-10  | 1-50     | 1-100   | 1-5 GB  | db.t3.micro   | $15-25        |
| 10-50 | 50-200   | 100-500 | 5-20 GB | db.t3.small   | $30-50        |
| 50-200| 200-1000 | 500-2000| 20-50 GB| db.t3.medium  | $60-100       |
| 200+  | 1000+    | 2000+   | 50+ GB  | db.r5.large+  | $150+         |

*Approximate AWS RDS costs

### Cost Optimization Tips
- ✅ Use appropriate instance sizing
- ✅ Enable storage auto-scaling
- ✅ Use reserved instances for production
- ✅ Monitor and optimize queries
- ✅ Use connection pooling
- ✅ Regular cleanup of old data
- ✅ Choose the right backup retention

---

This comprehensive guide should help you configure and manage your MCP Orchestrator database across different environments and requirements. Choose the option that best fits your deployment scenario and scale as needed.