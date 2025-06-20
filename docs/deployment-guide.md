# MCP Orch Deployment Guide

## Overview
This guide covers deploying MCP Orch using Docker Compose for containerized environments.

## Prerequisites
- Docker 20.10+
- Docker Compose v2.0+
- Git

## Environment Configuration

### 1. Environment Variables Setup
Copy the example environment file and customize it:

```bash
cp .env.example .env
```

### 2. Key Environment Variables

#### Database Configuration
```env
DB_HOST=localhost          # Use 'postgresql' for Docker Compose
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_NAME=mcp_orch
```

#### Security Configuration
```env
JWT_SECRET=your-very-secure-jwt-secret-min-32-chars
NEXTAUTH_SECRET=your-very-secure-nextauth-secret
INITIAL_ADMIN_EMAIL=admin@yourcompany.com
INITIAL_ADMIN_PASSWORD=secure-admin-password
```

#### Application Configuration
```env
ENV=production
SERVER__HOST=0.0.0.0
SERVER__PORT=8000
NEXT_PUBLIC_MCP_API_URL=http://localhost:8000
```

## Docker Compose Deployment

### 1. Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd mcp-orch

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Start all services
docker-compose up -d
```

### 2. Service Architecture
The Docker Compose setup includes:

- **PostgreSQL Database**: Persistent data storage
- **MCP Orch Backend**: FastAPI application server
- **MCP Orch Frontend**: Next.js web interface

### 3. Service URLs
After successful deployment:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Database: localhost:5432 (internal only)

### 4. Health Checks
All services include health checks:
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f [service-name]
```

## Development vs Production

### Development Setup
```env
ENV=development
DB_HOST=localhost
NEXT_PUBLIC_MCP_API_URL=http://localhost:8000
SQL_ECHO=false
```

### Production Setup
```env
ENV=production
DB_HOST=postgresql
NEXT_PUBLIC_MCP_API_URL=http://mcp-orch-backend:8000
SQL_ECHO=false
```

## Database Management

### 1. Database Initialization
The database is automatically initialized on first startup. Tables are created automatically based on the SQLAlchemy models.

### 2. Database Backup
```bash
# Backup database
docker-compose exec postgresql pg_dump -U postgres mcp_orch > backup.sql

# Restore database
docker-compose exec -T postgresql psql -U postgres mcp_orch < backup.sql
```

### 3. Database Access
```bash
# Connect to database
docker-compose exec postgresql psql -U postgres -d mcp_orch
```

## Scaling and Production Considerations

### 1. Resource Requirements
Minimum recommended resources:
- CPU: 2 cores
- RAM: 4GB
- Storage: 20GB (with growth space)

### 2. Security Hardening
- Change all default passwords
- Use strong JWT secrets (minimum 32 characters)
- Enable HTTPS in production
- Configure proper firewall rules
- Regular security updates

### 3. Monitoring
Add monitoring services to the Docker Compose setup:
```yaml
# Add to docker-compose.yml
services:
  # ... existing services ...
  
  prometheus:
    image: prom/prometheus
    # ... configuration ...
    
  grafana:
    image: grafana/grafana
    # ... configuration ...
```

### 4. Backup Strategy
- Database: Daily automated backups
- Configuration: Version control for .env files
- Volumes: Regular volume snapshots

## Troubleshooting

### 1. Common Issues

#### Database Connection Failed
```bash
# Check database status
docker-compose logs postgresql

# Verify database is healthy
docker-compose exec postgresql pg_isready -U postgres
```

#### Backend Service Not Starting
```bash
# Check backend logs
docker-compose logs mcp-orch-backend

# Verify environment variables
docker-compose exec mcp-orch-backend env | grep DB_
```

#### Frontend Cannot Connect to Backend
- Verify `NEXT_PUBLIC_MCP_API_URL` is correctly set
- Check if backend service is healthy
- Ensure proper network connectivity between containers

### 2. Service Management
```bash
# Restart specific service
docker-compose restart mcp-orch-backend

# Rebuild and restart
docker-compose up -d --build mcp-orch-backend

# View real-time logs
docker-compose logs -f --tail=100 mcp-orch-backend
```

### 3. Database Issues
```bash
# Reset database (WARNING: Data loss)
docker-compose down -v
docker-compose up -d

# Check database connections
docker-compose exec postgresql psql -U postgres -c "\l"
```

## Updates and Maintenance

### 1. Application Updates
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart services
docker-compose down
docker-compose up -d --build
```

### 2. Database Migration
Database schema changes are handled automatically by the application startup process.

### 3. Backup Before Updates
Always backup your data before major updates:
```bash
# Backup database
docker-compose exec postgresql pg_dump -U postgres mcp_orch > backup-$(date +%Y%m%d).sql

# Backup volumes
docker run --rm -v mcp-orch_postgresql_data:/data -v $(pwd):/backup alpine tar czf /backup/volumes-$(date +%Y%m%d).tar.gz /data
```

## Environment-Specific Configurations

### 1. Development
```bash
# Use local development
cp .env.example .env.dev
# Set ENV=development in .env.dev
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### 2. Staging
```bash
# Staging environment
cp .env.example .env.staging
# Configure staging-specific values
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d
```

### 3. Production
```bash
# Production environment
cp .env.example .env.prod
# Configure production values
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Support

For deployment issues:
1. Check the logs: `docker-compose logs`
2. Verify environment configuration
3. Ensure all required ports are available
4. Check Docker and Docker Compose versions
5. Review system resources (CPU, RAM, disk)