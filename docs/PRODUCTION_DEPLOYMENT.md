# Production Deployment Guide

This guide provides a comprehensive checklist and step-by-step instructions for deploying MCP Orchestrator to production environments.

## 🚀 Quick Deployment Checklist

### Pre-Deployment Requirements
- [ ] Domain name configured with DNS
- [ ] SSL/TLS certificates obtained
- [ ] Database server ready (PostgreSQL recommended)
- [ ] Server infrastructure provisioned
- [ ] Firewall and security groups configured

### Configuration Changes Required

#### 1. Domain and URL Settings
**Critical**: Change all localhost URLs to your production domains

```bash
# Frontend URL (where users access the application)
NEXTAUTH_URL=https://your-domain.com

# Backend API URL (where the API is hosted)
NEXT_PUBLIC_MCP_API_URL=https://api.your-domain.com

# MCP Server Base URL (for MCP client configurations)
MCP_SERVER_BASE_URL=https://api.your-domain.com
```

**Examples:**
- Main application: `https://mcp.company.com`
- API endpoint: `https://api.mcp.company.com`
- Or subdirectory: `https://company.com/mcp` and `https://company.com/api`

#### 2. Database Configuration
**Critical**: Replace localhost database with production database

```bash
# Production database (replace with your actual connection string)
DATABASE_URL=postgresql+asyncpg://username:password@your-db-host:5432/mcp_orch

# Examples:
# AWS RDS:
# DATABASE_URL=postgresql+asyncpg://admin:password@mcp-db.cluster-xxx.us-east-1.rds.amazonaws.com:5432/mcp_orch

# Google Cloud SQL:
# DATABASE_URL=postgresql+asyncpg://user:pass@xxx.xxx.xxx.xxx:5432/mcp_orch

# Azure Database:
# DATABASE_URL=postgresql+asyncpg://user:pass@server.postgres.database.azure.com:5432/mcp_orch
```

#### 3. Security Configuration
**Critical**: Generate secure secrets for production

```bash
# Generate strong secrets (run these commands):
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 32  # For NEXTAUTH_SECRET
python3 -c "import secrets; print(secrets.token_urlsafe(32))"  # For MCP_ENCRYPTION_KEY

# Set in your .env file:
JWT_SECRET=your-generated-jwt-secret-here
NEXTAUTH_SECRET=your-generated-nextauth-secret-here
MCP_ENCRYPTION_KEY=your-generated-encryption-key-here
```

#### 4. Environment Mode
**Critical**: Switch to production mode

```bash
NODE_ENV=production
ENV=production
DEBUG=false
AUTH_TRUST_HOST=true  # Required for proxy/load balancer setups
```

#### 5. Admin User Setup
**Important**: Configure initial admin user

```bash
# Option A: Designate specific admin user
INITIAL_ADMIN_EMAIL=admin@your-company.com

# Option B: Let first signup become admin (leave empty)
# INITIAL_ADMIN_EMAIL=
```

### Server Configuration

#### 6. Port and Host Settings
```bash
# Backend server (adjust if needed)
SERVER__HOST=0.0.0.0
SERVER__PORT=8000

# Frontend port (adjust if needed)  
FRONTEND_PORT=3000
```

#### 7. MCP Server Settings
```bash
# Adjust based on your server capacity
MAX_CONCURRENT_SERVERS=20
MCP_TIMEOUT_SECONDS=60

# Set appropriate workspace directory
MCP_WORKSPACE_DIR=/var/lib/mcp-orchestrator/workspaces

# Security: Consider disabling in high-security environments
MCP_ALLOW_HOST_COMMANDS=true
```

## 📋 Step-by-Step Deployment

### Step 1: Prepare Environment File
1. Copy the example environment file:
   ```bash
   cp .env.hybrid.example .env
   ```

2. Edit `.env` and make ALL the changes listed in the checklist above

3. Verify your configuration:
   ```bash
   # Check that no localhost URLs remain (should return empty)
   grep -n "localhost" .env
   
   # Check that secrets are changed (should not show 'your-' prefix)
   grep -E "(JWT_SECRET|NEXTAUTH_SECRET|MCP_ENCRYPTION_KEY)" .env
   ```

### Step 2: Database Setup
1. Create production database:
   ```sql
   CREATE DATABASE mcp_orch;
   CREATE USER mcp_orch WITH PASSWORD 'your-secure-password';
   GRANT ALL PRIVILEGES ON DATABASE mcp_orch TO mcp_orch;
   ```

2. Run database migrations:
   ```bash
   cd /path/to/mcp-orch
   python -m alembic upgrade head
   ```

### Step 3: SSL/TLS Setup
Configure your reverse proxy (nginx/Apache) or load balancer to handle HTTPS:

**Example nginx configuration:**
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/your/certificate.pem;
    ssl_certificate_key /path/to/your/private.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl;
    server_name api.your-domain.com;
    
    ssl_certificate /path/to/your/certificate.pem;
    ssl_certificate_key /path/to/your/private.key;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Step 4: Deploy Application
1. Build and start services:
   ```bash
   # Using Docker Compose
   docker compose -f docker-compose.yml up -d
   
   # Or using quickstart script (with your custom .env)
   ./scripts/quickstart.sh
   ```

2. Verify deployment:
   ```bash
   # Check service status
   docker compose ps
   
   # Check logs
   docker compose logs -f
   
   # Test API health
   curl https://api.your-domain.com/health
   ```

### Step 5: Post-Deployment Verification
- [ ] Application loads at your domain
- [ ] Login/signup works correctly
- [ ] API endpoints respond properly
- [ ] Database connections are stable
- [ ] SSL certificates are valid
- [ ] Admin user can access admin panel
- [ ] MCP servers can be added and connected

## 🔒 Security Considerations

### Environment Security
- Store sensitive environment variables in secure vault systems
- Never commit `.env` files to version control
- Use different encryption keys for different environments
- Regularly rotate secrets and keys

### Network Security
- Configure firewall rules to restrict access
- Use private networks for database connections
- Enable HTTPS-only (HSTS headers)
- Configure proper CORS settings

### Database Security
- Use dedicated database users with minimal privileges
- Enable database SSL connections
- Regular database backups
- Monitor database access logs

## 🚨 Common Deployment Issues

### Issue: "NextAuth URL mismatch"
**Solution**: Ensure `NEXTAUTH_URL` exactly matches your domain (including https://)

### Issue: "Database connection failed"
**Solution**: 
1. Check DATABASE_URL format includes `+asyncpg`
2. Verify database server is accessible
3. Confirm credentials are correct

### Issue: "CORS errors"
**Solution**: Verify `NEXT_PUBLIC_MCP_API_URL` matches your API domain

### Issue: "MCP servers won't connect"
**Solution**: Check `MCP_SERVER_BASE_URL` and firewall settings

### Issue: "JWT token issues"
**Solution**: Ensure `JWT_SECRET` and `NEXTAUTH_SECRET` are properly set and consistent

## 📊 Monitoring and Maintenance

### Health Checks
Set up monitoring for:
- Application uptime
- Database connectivity
- API response times
- MCP server connections

### Log Management
Configure log rotation and monitoring:
```bash
# Check application logs
docker compose logs backend
docker compose logs frontend

# Monitor system resources
docker stats
```

### Backup Strategy
- Regular database backups
- Environment configuration backups
- MCP server configuration backups
- SSL certificate backup and renewal

## 🆘 Support

If you encounter issues during deployment:

1. Check the [Troubleshooting Guide](troubleshooting.md)
2. Review application logs for error details
3. Verify all configuration changes were applied
4. Open an issue on GitHub with deployment details

Remember: Never share your actual environment variables or secrets when requesting support!