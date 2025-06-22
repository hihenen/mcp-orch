#!/bin/bash
# MCP Orchestrator Health Check Script
# 
# This script performs comprehensive health checks for MCP Orchestrator
# Can be used for manual checks or automated monitoring

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/var/log/mcp-orch/health-check.log"
ALERT_EMAIL="${ALERT_EMAIL:-admin@localhost}"
API_URL="${API_URL:-http://localhost:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${GREEN}✅${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}❌${NC} $message"
            ;;
        *)
            echo "$message"
            ;;
    esac
    
    echo "$timestamp - [$level] $message" >> "$LOG_FILE"
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check service status
check_service() {
    local service=$1
    local description=${2:-$service}
    
    if systemctl is-active --quiet "$service" 2>/dev/null; then
        log "INFO" "$description service is running"
        return 0
    else
        log "ERROR" "$description service is not running"
        if systemctl is-enabled --quiet "$service" 2>/dev/null; then
            log "WARN" "$description service is enabled but not running"
        else
            log "WARN" "$description service is not enabled"
        fi
        return 1
    fi
}

# Check port accessibility
check_port() {
    local host=${1:-localhost}
    local port=$2
    local description=$3
    local timeout=${4:-5}
    
    if timeout "$timeout" bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null; then
        log "INFO" "$description (port $port) is accessible"
        return 0
    else
        log "ERROR" "$description (port $port) is not accessible"
        return 1
    fi
}

# Check HTTP endpoint
check_http() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    
    if command_exists curl; then
        local response
        local status_code
        
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "HTTPSTATUS:000")
        status_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
        
        if [ "$status_code" = "$expected_status" ]; then
            log "INFO" "$description is accessible (HTTP $status_code)"
            return 0
        else
            log "ERROR" "$description returned HTTP $status_code (expected $expected_status)"
            return 1
        fi
    else
        log "WARN" "curl not available, skipping HTTP check for $description"
        return 1
    fi
}

# Check API health endpoint
check_api_health() {
    local url="$API_URL/health"
    
    if command_exists curl && command_exists jq; then
        local response
        response=$(curl -s --max-time 10 "$url" 2>/dev/null)
        
        if [ $? -eq 0 ]; then
            local status
            status=$(echo "$response" | jq -r '.status' 2>/dev/null)
            
            case "$status" in
                "healthy")
                    log "INFO" "API health check passed"
                    
                    # Extract additional metrics
                    local response_time
                    local db_status
                    response_time=$(echo "$response" | jq -r '.metrics.response_time_ms' 2>/dev/null)
                    db_status=$(echo "$response" | jq -r '.checks.database.status' 2>/dev/null)
                    
                    if [ "$response_time" != "null" ]; then
                        log "INFO" "API response time: ${response_time}ms"
                    fi
                    
                    if [ "$db_status" = "ok" ]; then
                        log "INFO" "Database connectivity confirmed"
                    else
                        log "WARN" "Database status: $db_status"
                    fi
                    
                    return 0
                    ;;
                "warning")
                    log "WARN" "API health check returned warning status"
                    return 1
                    ;;
                "unhealthy")
                    log "ERROR" "API health check failed - service unhealthy"
                    return 1
                    ;;
                *)
                    log "ERROR" "API health check returned unknown status: $status"
                    return 1
                    ;;
            esac
        else
            log "ERROR" "Failed to connect to API health endpoint"
            return 1
        fi
    else
        log "WARN" "curl or jq not available, falling back to basic HTTP check"
        check_http "$url" "API health endpoint"
    fi
}

# Check disk space
check_disk_space() {
    local threshold=${1:-80}
    local path=${2:-/}
    
    local usage
    usage=$(df "$path" 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ -n "$usage" ]; then
        if [ "$usage" -lt "$threshold" ]; then
            log "INFO" "Disk usage: ${usage}% (threshold: ${threshold}%)"
            return 0
        else
            log "ERROR" "Disk usage critical: ${usage}% (threshold: ${threshold}%)"
            return 1
        fi
    else
        log "ERROR" "Could not check disk usage for $path"
        return 1
    fi
}

# Check memory usage
check_memory() {
    local threshold=${1:-90}
    
    if command_exists free; then
        local usage
        usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
        
        if [ "$usage" -lt "$threshold" ]; then
            log "INFO" "Memory usage: ${usage}% (threshold: ${threshold}%)"
            return 0
        else
            log "ERROR" "Memory usage critical: ${usage}% (threshold: ${threshold}%)"
            return 1
        fi
    else
        log "WARN" "free command not available, skipping memory check"
        return 1
    fi
}

# Check CPU load
check_cpu_load() {
    local threshold=${1:-2.0}
    
    if [ -f /proc/loadavg ]; then
        local load_1min
        load_1min=$(awk '{print $1}' /proc/loadavg)
        
        # Use bc for floating point comparison if available
        if command_exists bc; then
            if [ "$(echo "$load_1min < $threshold" | bc)" -eq 1 ]; then
                log "INFO" "CPU load (1min): $load_1min (threshold: $threshold)"
                return 0
            else
                log "WARN" "CPU load high: $load_1min (threshold: $threshold)"
                return 1
            fi
        else
            log "INFO" "CPU load (1min): $load_1min"
            return 0
        fi
    else
        log "WARN" "/proc/loadavg not available, skipping CPU load check"
        return 1
    fi
}

# Check database connectivity
check_database() {
    # Load environment variables
    if [ -f "$PROJECT_ROOT/.env" ]; then
        # Source environment variables safely
        set -a
        source "$PROJECT_ROOT/.env"
        set +a
    fi
    
    if [ -n "$DATABASE_URL" ]; then
        if command_exists psql; then
            if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
                log "INFO" "Database connection successful"
                
                # Check database size if possible
                local db_size
                db_size=$(psql "$DATABASE_URL" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null | xargs)
                if [ -n "$db_size" ]; then
                    log "INFO" "Database size: $db_size"
                fi
                
                return 0
            else
                log "ERROR" "Database connection failed"
                return 1
            fi
        else
            log "WARN" "psql not available, skipping database connectivity check"
            return 1
        fi
    else
        log "WARN" "DATABASE_URL not set, skipping database check"
        return 1
    fi
}

# Check Docker containers (if Docker is used)
check_docker_containers() {
    if command_exists docker; then
        local containers
        containers=$(docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null | grep mcp-orch || true)
        
        if [ -n "$containers" ]; then
            log "INFO" "Docker containers status:"
            echo "$containers" | while read -r line; do
                if [[ "$line" == *"Up"* ]]; then
                    log "INFO" "  $line"
                else
                    log "WARN" "  $line"
                fi
            done
        else
            log "INFO" "No MCP Orchestrator Docker containers found"
        fi
    else
        log "INFO" "Docker not available, skipping container check"
    fi
}

# Send alert notification
send_alert() {
    local subject="$1"
    local body="$2"
    
    # Try to send email if mail command is available
    if command_exists mail && [ "$ALERT_EMAIL" != "admin@localhost" ]; then
        echo "$body" | mail -s "$subject" "$ALERT_EMAIL"
        log "INFO" "Alert email sent to $ALERT_EMAIL"
    fi
    
    # Log alert for other monitoring systems to pick up
    log "ERROR" "ALERT: $subject"
}

# Generate health report
generate_report() {
    local failed_checks=$1
    local total_checks=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "========================================="
    echo "MCP Orchestrator Health Check Report"
    echo "========================================="
    echo "Timestamp: $timestamp"
    echo "Total Checks: $total_checks"
    echo "Failed Checks: $failed_checks"
    echo "Success Rate: $(((total_checks - failed_checks) * 100 / total_checks))%"
    echo ""
    
    if [ $failed_checks -eq 0 ]; then
        echo "✅ All health checks passed!"
    else
        echo "❌ $failed_checks health check(s) failed"
        echo ""
        echo "Recent log entries:"
        tail -20 "$LOG_FILE" | grep -E "(ERROR|WARN)"
    fi
    
    echo ""
    echo "Full log: $LOG_FILE"
    echo "========================================="
}

# Main health check function
main() {
    local failed=0
    local total=0
    local start_time=$(date '+%Y-%m-%d %H:%M:%S')
    
    log "INFO" "Starting comprehensive health check at $start_time"
    
    # System checks
    echo "Performing system checks..."
    
    ((total++))
    check_disk_space 80 || ((failed++))
    
    ((total++))
    check_memory 90 || ((failed++))
    
    ((total++))
    check_cpu_load 2.0 || ((failed++))
    
    # Service checks
    echo "Performing service checks..."
    
    ((total++))
    check_service "mcp-orchestrator" "MCP Orchestrator" || ((failed++))
    
    # Network checks
    echo "Performing network checks..."
    
    ((total++))
    check_port "localhost" 8000 "Backend API" || ((failed++))
    
    ((total++))
    check_port "localhost" 3000 "Frontend" || ((failed++))
    
    ((total++))
    check_http "$FRONTEND_URL" "Frontend HTTP" || ((failed++))
    
    # Application checks
    echo "Performing application checks..."
    
    ((total++))
    check_api_health || ((failed++))
    
    ((total++))
    check_database || ((failed++))
    
    # Infrastructure checks
    echo "Performing infrastructure checks..."
    
    ((total++))
    check_docker_containers || ((failed++))
    
    # Generate report
    echo ""
    generate_report $failed $total
    
    # Send alerts if there are failures
    if [ $failed -gt 0 ]; then
        local alert_subject="MCP Orchestrator Health Check Failed ($failed/$total checks failed)"
        local alert_body=$(generate_report $failed $total)
        send_alert "$alert_subject" "$alert_body"
    fi
    
    log "INFO" "Health check completed with $failed/$total failures"
    
    # Exit with appropriate code
    if [ $failed -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "MCP Orchestrator Health Check Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  help          Show this help message"
        echo "  quick         Run quick health check (essential services only)"
        echo "  detailed      Run detailed health check (includes performance metrics)"
        echo "  api-only      Check only API health"
        echo "  system-only   Check only system resources"
        echo ""
        echo "Environment variables:"
        echo "  API_URL       Backend API URL (default: http://localhost:8000)"
        echo "  FRONTEND_URL  Frontend URL (default: http://localhost:3000)"
        echo "  ALERT_EMAIL   Email for alerts (default: admin@localhost)"
        echo ""
        echo "Examples:"
        echo "  $0                    # Run full health check"
        echo "  $0 quick              # Run quick check"
        echo "  API_URL=http://prod.example.com:8000 $0"
        exit 0
        ;;
    "quick")
        # Quick check - only essential services
        failed=0
        total=0
        
        ((total++))
        check_service "mcp-orchestrator" "MCP Orchestrator" || ((failed++))
        
        ((total++))
        check_port "localhost" 8000 "Backend API" || ((failed++))
        
        ((total++))
        check_api_health || ((failed++))
        
        generate_report $failed $total
        exit $failed
        ;;
    "detailed")
        # Detailed check - includes performance metrics
        main
        
        # Additional detailed checks
        echo ""
        echo "Performing detailed checks..."
        
        if command_exists curl && command_exists jq; then
            echo "Fetching detailed health information..."
            curl -s "$API_URL/health/detailed" | jq '.' 2>/dev/null || echo "Could not fetch detailed health info"
        fi
        ;;
    "api-only")
        check_api_health
        exit $?
        ;;
    "system-only")
        failed=0
        total=0
        
        ((total++))
        check_disk_space 80 || ((failed++))
        
        ((total++))
        check_memory 90 || ((failed++))
        
        ((total++))
        check_cpu_load 2.0 || ((failed++))
        
        generate_report $failed $total
        exit $failed
        ;;
    "")
        # Default: run full health check
        main
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac