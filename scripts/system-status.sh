#!/bin/bash
# MCP Orchestrator System Status Script
# 
# Comprehensive system status checker that provides an overview
# of all MCP Orchestrator components and system resources

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
API_URL="${API_URL:-http://localhost:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Unicode symbols
CHECK_MARK="✅"
CROSS_MARK="❌"
WARNING="⚠️"
INFO="ℹ️"
GEAR="⚙️"
CHART="📊"
DATABASE="🗄️"
NETWORK="🌐"
SERVER="🖥️"

# Helper functions
print_header() {
    local title="$1"
    local icon="$2"
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}${icon} ${title}${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
}

print_section() {
    local title="$1"
    local icon="$2"
    echo ""
    echo -e "${CYAN}${icon} ${title}${NC}"
    echo -e "${CYAN}─────────────────────────────────────────────────────────────────${NC}"
}

status_icon() {
    case "$1" in
        "ok"|"running"|"active")
            echo -e "${GREEN}${CHECK_MARK}${NC}"
            ;;
        "warning"|"degraded")
            echo -e "${YELLOW}${WARNING}${NC}"
            ;;
        "error"|"failed"|"inactive")
            echo -e "${RED}${CROSS_MARK}${NC}"
            ;;
        *)
            echo -e "${YELLOW}${INFO}${NC}"
            ;;
    esac
}

format_bytes() {
    local bytes=$1
    local units=("B" "KB" "MB" "GB" "TB")
    local unit=0
    
    while [ $bytes -gt 1024 ] && [ $unit -lt 4 ]; do
        bytes=$((bytes / 1024))
        unit=$((unit + 1))
    done
    
    echo "${bytes}${units[$unit]}"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# System Information
show_system_info() {
    print_section "System Information" "$SERVER"
    
    echo "Hostname: $(hostname)"
    echo "OS: $(uname -s) $(uname -r)"
    
    if [ -f /etc/os-release ]; then
        local os_name=$(grep '^PRETTY_NAME=' /etc/os-release | cut -d'"' -f2)
        echo "Distribution: $os_name"
    fi
    
    echo "Architecture: $(uname -m)"
    echo "Uptime: $(uptime -p 2>/dev/null || uptime)"
    echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
    
    if command_exists nproc; then
        echo "CPU Cores: $(nproc)"
    fi
    
    local current_time=$(date '+%Y-%m-%d %H:%M:%S %Z')
    echo "Current Time: $current_time"
}

# Process Information
show_process_info() {
    print_section "MCP Orchestrator Processes" "$GEAR"
    
    # Check systemd service
    if command_exists systemctl; then
        local service_status
        if systemctl is-active --quiet mcp-orchestrator 2>/dev/null; then
            service_status="running"
        else
            service_status="not running"
        fi
        
        echo -e "$(status_icon "$service_status") MCP Orchestrator Service: $service_status"
        
        if [ "$service_status" = "running" ]; then
            local pid=$(systemctl show mcp-orchestrator --property MainPID --value 2>/dev/null)
            if [ -n "$pid" ] && [ "$pid" != "0" ]; then
                echo "  PID: $pid"
                
                if command_exists ps; then
                    local process_info=$(ps -p "$pid" -o pid,ppid,cpu,pmem,etime,cmd --no-headers 2>/dev/null || true)
                    if [ -n "$process_info" ]; then
                        echo "  Process Info: $process_info"
                    fi
                fi
            fi
        else
            # Show last few lines of service logs
            if command_exists journalctl; then
                echo "  Recent logs:"
                journalctl -u mcp-orchestrator --no-pager -n 3 --since "5 minutes ago" 2>/dev/null | sed 's/^/    /' || true
            fi
        fi
    fi
    
    # Check Python processes
    local python_processes
    python_processes=$(ps aux | grep -E "(mcp_orch|fastapi|uvicorn)" | grep -v grep || true)
    if [ -n "$python_processes" ]; then
        echo ""
        echo "Python/FastAPI processes:"
        echo "$python_processes" | while read -r line; do
            echo "  $line"
        done
    fi
}

# Docker Containers
show_docker_info() {
    print_section "Docker Containers" "🐳"
    
    if command_exists docker; then
        local containers
        containers=$(docker ps -a --filter "name=mcp-orch" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true)
        
        if [ -n "$containers" ]; then
            echo "$containers"
            
            # Show resource usage
            echo ""
            echo "Container Resource Usage:"
            docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" \
                $(docker ps --filter "name=mcp-orch" --format "{{.Names}}" | tr '\n' ' ') 2>/dev/null || echo "  Could not retrieve stats"
        else
            echo "No MCP Orchestrator containers found"
        fi
        
        # Show Docker system info
        echo ""
        echo "Docker System Info:"
        local docker_version=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "unknown")
        echo "  Version: $docker_version"
        
        if command_exists docker; then
            local disk_usage=$(docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}" 2>/dev/null || true)
            if [ -n "$disk_usage" ]; then
                echo "  Disk Usage:"
                echo "$disk_usage" | sed 's/^/    /'
            fi
        fi
    else
        echo "Docker not available"
    fi
}

# Network Status
show_network_status() {
    print_section "Network Status" "$NETWORK"
    
    # Check listening ports
    echo "Listening Ports:"
    if command_exists ss; then
        ss -tlnp | grep -E ":3000|:8000|:5432" | while read -r line; do
            echo "  $line"
        done
    elif command_exists netstat; then
        netstat -tlnp 2>/dev/null | grep -E ":3000|:8000|:5432" | while read -r line; do
            echo "  $line"
        done
    else
        echo "  No network tools available (ss/netstat)"
    fi
    
    # Test connectivity to key endpoints
    echo ""
    echo "Endpoint Connectivity:"
    
    local endpoints=(
        "localhost:8000 Backend_API"
        "localhost:3000 Frontend"
        "localhost:5432 Database"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local addr=$(echo "$endpoint" | cut -d' ' -f1)
        local name=$(echo "$endpoint" | cut -d' ' -f2)
        local host=$(echo "$addr" | cut -d':' -f1)
        local port=$(echo "$addr" | cut -d':' -f2)
        
        if timeout 3 bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null; then
            echo -e "  $(status_icon "ok") $name ($addr)"
        else
            echo -e "  $(status_icon "error") $name ($addr)"
        fi
    done
}

# Database Status
show_database_status() {
    print_section "Database Status" "$DATABASE"
    
    # Load environment variables
    if [ -f "$PROJECT_ROOT/.env" ]; then
        set -a
        source "$PROJECT_ROOT/.env" 2>/dev/null || true
        set +a
    fi
    
    if [ -n "$DATABASE_URL" ]; then
        echo "Database URL: ${DATABASE_URL%:*}:****@${DATABASE_URL##*@}"
        
        if command_exists psql; then
            # Test basic connectivity
            if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
                echo -e "$(status_icon "ok") Database connection successful"
                
                # Get database info
                local db_info
                db_info=$(psql "$DATABASE_URL" -t -c "
                    SELECT 
                        version() as version,
                        pg_size_pretty(pg_database_size(current_database())) as size,
                        (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as connections
                " 2>/dev/null | xargs)
                
                if [ -n "$db_info" ]; then
                    echo "  Database Info:"
                    psql "$DATABASE_URL" -c "
                        SELECT 
                            'Version' as metric, split_part(version(), ' ', 2) as value
                        UNION ALL
                        SELECT 
                            'Size' as metric, pg_size_pretty(pg_database_size(current_database())) as value
                        UNION ALL
                        SELECT 
                            'Connections' as metric, count(*)::text as value
                        FROM pg_stat_activity 
                        WHERE datname = current_database()
                    " 2>/dev/null | sed 's/^/    /' || true
                fi
                
                # Check for long-running queries
                local long_queries
                long_queries=$(psql "$DATABASE_URL" -t -c "
                    SELECT count(*) 
                    FROM pg_stat_activity 
                    WHERE state = 'active' 
                    AND query_start < now() - interval '1 minute'
                    AND datname = current_database()
                " 2>/dev/null | xargs)
                
                if [ -n "$long_queries" ] && [ "$long_queries" -gt 0 ]; then
                    echo -e "  $(status_icon "warning") Long-running queries: $long_queries"
                fi
                
            else
                echo -e "$(status_icon "error") Database connection failed"
            fi
        else
            echo -e "$(status_icon "warning") psql not available, cannot check database"
        fi
    else
        echo "DATABASE_URL not configured"
    fi
}

# Application Health
show_application_health() {
    print_section "Application Health" "🏥"
    
    # Check API health endpoint
    if command_exists curl; then
        local health_response
        health_response=$(curl -s --max-time 10 "$API_URL/health" 2>/dev/null)
        
        if [ $? -eq 0 ] && [ -n "$health_response" ]; then
            if command_exists jq; then
                local status=$(echo "$health_response" | jq -r '.status' 2>/dev/null)
                local version=$(echo "$health_response" | jq -r '.version' 2>/dev/null)
                local environment=$(echo "$health_response" | jq -r '.environment' 2>/dev/null)
                
                echo -e "$(status_icon "$status") API Status: $status"
                echo "  Version: $version"
                echo "  Environment: $environment"
                
                # Show detailed health checks
                echo "  Component Health:"
                echo "$health_response" | jq -r '.checks | to_entries[] | "    \(.key): \(.value.status // .value)"' 2>/dev/null || true
                
                # Show metrics
                local response_time=$(echo "$health_response" | jq -r '.metrics.response_time_ms' 2>/dev/null)
                local uptime=$(echo "$health_response" | jq -r '.metrics.uptime_seconds' 2>/dev/null)
                
                if [ "$response_time" != "null" ] && [ -n "$response_time" ]; then
                    echo "  Response Time: ${response_time}ms"
                fi
                
                if [ "$uptime" != "null" ] && [ -n "$uptime" ]; then
                    local uptime_human=$(date -u -d @"$uptime" +'%H:%M:%S' 2>/dev/null || echo "${uptime}s")
                    echo "  Uptime: $uptime_human"
                fi
            else
                echo -e "$(status_icon "ok") API Health endpoint responding"
                echo "  Raw response: $health_response"
            fi
        else
            echo -e "$(status_icon "error") API Health endpoint not accessible"
        fi
    else
        echo "curl not available, cannot check API health"
    fi
    
    # Check frontend
    echo ""
    echo "Frontend Status:"
    if command_exists curl; then
        if curl -s --max-time 5 -o /dev/null "$FRONTEND_URL" 2>/dev/null; then
            echo -e "$(status_icon "ok") Frontend accessible at $FRONTEND_URL"
        else
            echo -e "$(status_icon "error") Frontend not accessible at $FRONTEND_URL"
        fi
    else
        echo "curl not available, cannot check frontend"
    fi
}

# Resource Usage
show_resource_usage() {
    print_section "Resource Usage" "$CHART"
    
    # CPU Usage
    if command_exists top; then
        local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' 2>/dev/null || echo "unknown")
        echo "CPU Usage: $cpu_usage"
    fi
    
    # Memory Usage
    if command_exists free; then
        echo "Memory Usage:"
        free -h | sed 's/^/  /'
        
        local mem_percent=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')
        if command_exists bc && [ -n "$mem_percent" ]; then
            if [ "$(echo "$mem_percent > 90" | bc 2>/dev/null)" -eq 1 ]; then
                echo -e "  $(status_icon "error") Memory usage critical: ${mem_percent}%"
            elif [ "$(echo "$mem_percent > 80" | bc 2>/dev/null)" -eq 1 ]; then
                echo -e "  $(status_icon "warning") Memory usage high: ${mem_percent}%"
            else
                echo -e "  $(status_icon "ok") Memory usage normal: ${mem_percent}%"
            fi
        fi
    fi
    
    # Disk Usage
    echo ""
    echo "Disk Usage:"
    if command_exists df; then
        df -h | grep -E "^/dev|^tmpfs" | sed 's/^/  /'
        
        local root_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
        if [ -n "$root_usage" ]; then
            if [ "$root_usage" -gt 90 ]; then
                echo -e "  $(status_icon "error") Root filesystem usage critical: ${root_usage}%"
            elif [ "$root_usage" -gt 80 ]; then
                echo -e "  $(status_icon "warning") Root filesystem usage high: ${root_usage}%"
            else
                echo -e "  $(status_icon "ok") Root filesystem usage normal: ${root_usage}%"
            fi
        fi
    fi
    
    # Load Average
    if [ -f /proc/loadavg ]; then
        local load=$(cat /proc/loadavg)
        echo ""
        echo "Load Average: $load"
        
        local load_1min=$(echo "$load" | awk '{print $1}')
        local cpu_count=$(nproc 2>/dev/null || echo 1)
        
        if command_exists bc && [ -n "$load_1min" ] && [ -n "$cpu_count" ]; then
            local load_percent=$(echo "scale=1; $load_1min * 100 / $cpu_count" | bc 2>/dev/null || echo 0)
            if [ "$(echo "$load_percent > 100" | bc 2>/dev/null)" -eq 1 ]; then
                echo -e "  $(status_icon "error") Load high: ${load_percent}% of CPU capacity"
            elif [ "$(echo "$load_percent > 80" | bc 2>/dev/null)" -eq 1 ]; then
                echo -e "  $(status_icon "warning") Load elevated: ${load_percent}% of CPU capacity"
            else
                echo -e "  $(status_icon "ok") Load normal: ${load_percent}% of CPU capacity"
            fi
        fi
    fi
}

# Recent Logs
show_recent_logs() {
    print_section "Recent Activity" "📝"
    
    # Application logs
    if command_exists journalctl; then
        echo "Recent MCP Orchestrator logs (last 5 entries):"
        journalctl -u mcp-orchestrator --no-pager -n 5 --since "1 hour ago" 2>/dev/null | sed 's/^/  /' || echo "  No recent logs found"
    fi
    
    # System logs for errors
    echo ""
    echo "Recent system errors (last 10 minutes):"
    if command_exists journalctl; then
        journalctl --no-pager -p err --since "10 minutes ago" -n 5 2>/dev/null | sed 's/^/  /' || echo "  No recent errors"
    elif [ -f /var/log/syslog ]; then
        tail -20 /var/log/syslog | grep -i error | tail -5 | sed 's/^/  /' || echo "  No recent errors"
    else
        echo "  Log access not available"
    fi
}

# Configuration Summary
show_configuration() {
    print_section "Configuration Summary" "🔧"
    
    echo "Environment Variables:"
    echo "  API_URL: $API_URL"
    echo "  FRONTEND_URL: $FRONTEND_URL"
    
    if [ -f "$PROJECT_ROOT/.env" ]; then
        echo "  .env file: exists"
        
        # Show non-sensitive config
        local db_type=$(grep "^DATABASE_TYPE=" "$PROJECT_ROOT/.env" 2>/dev/null | cut -d'=' -f2 || echo "not set")
        echo "  Database Type: $db_type"
        
        local server_mode=$(grep "^SERVER_MODE=" "$PROJECT_ROOT/.env" 2>/dev/null | cut -d'=' -f2 || echo "not set")
        echo "  Server Mode: $server_mode"
    else
        echo "  .env file: not found"
    fi
    
    # Installation type detection
    echo ""
    echo "Installation Detection:"
    
    if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        echo -e "  $(status_icon "ok") Docker Compose configuration found"
    fi
    
    if [ -f "$PROJECT_ROOT/install.sh" ]; then
        echo -e "  $(status_icon "ok") Installation script found"
    fi
    
    if systemctl is-enabled mcp-orchestrator >/dev/null 2>&1; then
        echo -e "  $(status_icon "ok") Systemd service configured"
    fi
    
    if [ -d "$PROJECT_ROOT/venv" ]; then
        echo -e "  $(status_icon "ok") Python virtual environment found"
    fi
}

# Main function
main() {
    local start_time=$(date +%s)
    
    print_header "MCP Orchestrator System Status" "🚀"
    echo "Generated at: $(date)"
    echo "Report by: $(whoami)@$(hostname)"
    
    show_system_info
    show_configuration
    show_process_info
    show_docker_info
    show_network_status
    show_database_status
    show_application_health
    show_resource_usage
    show_recent_logs
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    print_header "Summary" "📋"
    echo "Status report completed in ${duration} seconds"
    echo ""
    echo "For detailed health checks, run: $SCRIPT_DIR/health-check.sh"
    echo "For troubleshooting help, see: $PROJECT_ROOT/docs/troubleshooting.md"
    echo ""
}

# Handle script arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "MCP Orchestrator System Status Script"
        echo ""
        echo "Usage: $0 [section]"
        echo ""
        echo "Sections:"
        echo "  system        Show system information only"
        echo "  processes     Show process information only"
        echo "  docker        Show Docker container status only"
        echo "  network       Show network status only"
        echo "  database      Show database status only"
        echo "  app           Show application health only"
        echo "  resources     Show resource usage only"
        echo "  logs          Show recent logs only"
        echo "  config        Show configuration summary only"
        echo ""
        echo "Environment variables:"
        echo "  API_URL       Backend API URL (default: http://localhost:8000)"
        echo "  FRONTEND_URL  Frontend URL (default: http://localhost:3000)"
        exit 0
        ;;
    "system")
        show_system_info
        ;;
    "processes")
        show_process_info
        ;;
    "docker")
        show_docker_info
        ;;
    "network")
        show_network_status
        ;;
    "database")
        show_database_status
        ;;
    "app")
        show_application_health
        ;;
    "resources")
        show_resource_usage
        ;;
    "logs")
        show_recent_logs
        ;;
    "config")
        show_configuration
        ;;
    "")
        main
        ;;
    *)
        echo "Unknown section: $1"
        echo "Use '$0 help' for available sections"
        exit 1
        ;;
esac