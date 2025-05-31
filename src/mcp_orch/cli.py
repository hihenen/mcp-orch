"""
CLI 인터페이스

명령행 인터페이스를 제공합니다.
"""

import asyncio
import logging
import sys
from pathlib import Path
from typing import Optional

import typer
import uvicorn
from rich.console import Console
from rich.logging import RichHandler
from rich.table import Table

from .api.app import create_app
from .config import Settings
from .config_parser import create_example_config

# Typer 앱 생성
app = typer.Typer(
    name="mcp-orch",
    help="MCP Orch - 하이브리드 MCP 프록시 및 병렬화 오케스트레이션 도구",
    add_completion=False,
)

console = Console()


def setup_logging(log_level: str = "INFO"):
    """로깅 설정"""
    logging.basicConfig(
        level=log_level,
        format="%(message)s",
        datefmt="[%X]",
        handlers=[RichHandler(console=console, rich_tracebacks=True)]
    )


@app.command()
def serve(
    mode: str = typer.Option(
        "proxy",
        "--mode", "-m",
        help="운영 모드 (proxy 또는 batch)"
    ),
    host: str = typer.Option(
        "0.0.0.0",
        "--host", "-h",
        help="서버 호스트"
    ),
    port: int = typer.Option(
        3000,
        "--port", "-p",
        help="서버 포트"
    ),
    config_file: Optional[Path] = typer.Option(
        None,
        "--config", "-c",
        help="설정 파일 경로"
    ),
    mcp_config: Optional[Path] = typer.Option(
        Path("mcp-config.json"),
        "--mcp-config",
        help="MCP 서버 설정 파일 경로"
    ),
    log_level: str = typer.Option(
        "INFO",
        "--log-level", "-l",
        help="로그 레벨 (DEBUG, INFO, WARNING, ERROR)"
    ),
    reload: bool = typer.Option(
        False,
        "--reload", "-r",
        help="코드 변경 시 자동 리로드"
    ),
    workers: int = typer.Option(
        1,
        "--workers", "-w",
        help="워커 프로세스 수"
    ),
    sse_standard: bool = typer.Option(
        False,
        "--sse-standard",
        help="MCP SDK 표준 SSE 구현 사용 (Cline 호환)"
    ),
    server_name: Optional[str] = typer.Option(
        None,
        "--server",
        help="표준 SSE 모드에서 사용할 서버 이름 (기본값: 첫 번째 서버)"
    ),
    mcp_proxy: bool = typer.Option(
        False,
        "--mcp-proxy",
        help="mcp-proxy 호환 모드 사용 (단일 포트에서 여러 서버 제공)"
    ),
):
    """MCP Orch 서버 실행"""
    setup_logging(log_level)
    
    # 설정 로드
    settings = Settings.from_env()
    settings.server.mode = mode
    settings.server.host = host
    settings.server.port = port
    settings.server.log_level = log_level
    settings.server.reload = reload
    settings.server.workers = workers
    
    if config_file:
        settings.config_file = config_file
    settings.mcp_config_file = mcp_config
    
    # 모드 확인
    console.print(f"[bold green]Starting MCP Orch in {mode.upper()} mode[/bold green]")
    console.print(f"Host: {host}:{port}")
    console.print(f"MCP Config: {mcp_config}")
    console.print(f"Log Level: {log_level}")
    
    # mcp-proxy 모드 확인
    if mcp_proxy:
        console.print("[bold yellow]Using mcp-proxy compatible mode[/bold yellow]")
        console.print("[cyan]Multiple servers will be available on different endpoints[/cyan]")
        # mcp-proxy 호환 모드 실행
        from .api.mcp_proxy_mode import run_mcp_proxy_mode
        
        asyncio.run(run_mcp_proxy_mode(settings, host=host, port=port))
    # SSE 표준 모드 확인
    elif sse_standard:
        console.print("[bold yellow]Using MCP SDK Standard SSE implementation[/bold yellow]")
        # MCP 표준 SSE 서버 실행
        from .api.mcp_sse_server import create_mcp_sse_server
        
        async def run_sse_server():
            server = await create_mcp_sse_server(str(mcp_config))
            await server.start(host=host, port=port, server_name=server_name)
        
        asyncio.run(run_sse_server())
    else:
        # FastAPI 앱 생성
        fastapi_app = create_app(settings)
        
        # Uvicorn 서버 실행
        uvicorn.run(
            fastapi_app,
            host=host,
            port=port,
            log_level=log_level.lower(),
            reload=reload,
            workers=workers if not reload else 1,
        )


@app.command()
def list_tools(
    mcp_config: Optional[Path] = typer.Option(
        Path("mcp-config.json"),
        "--mcp-config",
        help="MCP 서버 설정 파일 경로"
    ),
):
    """사용 가능한 도구 목록 표시"""
    setup_logging()
    
    async def _list_tools():
        # 설정 로드
        settings = Settings.from_env()
        settings.mcp_config_file = mcp_config
        
        # 도구 레지스트리 생성
        from .core.registry import ToolRegistry
        registry = ToolRegistry(mcp_config)
        
        # 설정 로드 및 서버 연결
        console.print("[bold]Loading MCP servers...[/bold]")
        await registry.load_configuration()
        await registry.connect_servers()
        
        # 도구 목록 표시
        tools = registry.get_all_tools()
        
        if not tools:
            console.print("[yellow]No tools found[/yellow]")
            return
            
        # 테이블 생성
        table = Table(title="Available Tools")
        table.add_column("Namespace", style="cyan")
        table.add_column("Server", style="green")
        table.add_column("Tool", style="yellow")
        table.add_column("Description", style="white")
        
        for tool in tools:
            table.add_row(
                tool.namespace,
                tool.server_name,
                tool.name,
                tool.description or "No description"
            )
            
        console.print(table)
        
    # 비동기 함수 실행
    asyncio.run(_list_tools())


@app.command()
def list_servers(
    mcp_config: Optional[Path] = typer.Option(
        Path("mcp-config.json"),
        "--mcp-config",
        help="MCP 서버 설정 파일 경로"
    ),
):
    """MCP 서버 목록 표시"""
    setup_logging()
    
    async def _list_servers():
        # 설정 로드
        settings = Settings.from_env()
        settings.mcp_config_file = mcp_config
        
        # 도구 레지스트리 생성
        from .core.registry import ToolRegistry
        registry = ToolRegistry(mcp_config)
        
        # 설정 로드
        console.print("[bold]Loading MCP server configurations...[/bold]")
        await registry.load_configuration()
        
        # 서버 목록 표시
        servers = registry.get_servers()
        
        if not servers:
            console.print("[yellow]No servers configured[/yellow]")
            return
            
        # 테이블 생성
        table = Table(title="MCP Servers")
        table.add_column("Name", style="cyan")
        table.add_column("Command", style="green")
        table.add_column("Transport", style="yellow")
        table.add_column("Status", style="white")
        table.add_column("Tools", style="magenta")
        
        for server in servers:
            status = "✓ Connected" if server.connected else "✗ Disconnected"
            if server.disabled:
                status = "⊘ Disabled"
            if server.error:
                status = f"✗ Error: {server.error[:30]}..."
                
            table.add_row(
                server.name,
                server.command,
                server.transport_type,
                status,
                str(len(server.tools))
            )
            
        console.print(table)
        
    # 비동기 함수 실행
    asyncio.run(_list_servers())


@app.command()
def init(
    path: Path = typer.Argument(
        Path("mcp-config.json"),
        help="생성할 설정 파일 경로"
    ),
    force: bool = typer.Option(
        False,
        "--force", "-f",
        help="기존 파일 덮어쓰기"
    ),
):
    """MCP 설정 파일 초기화"""
    setup_logging()
    
    if path.exists() and not force:
        console.print(f"[red]File already exists: {path}[/red]")
        console.print("Use --force to overwrite")
        raise typer.Exit(1)
        
    # config_parser의 create_example_config 함수 사용
    create_example_config(str(path))
        
    console.print(f"[green]Created MCP configuration file: {path}[/green]")
    console.print("\nNext steps:")
    console.print("1. Edit the configuration file to add your MCP servers")
    console.print("2. Run 'mcp-orch serve' to start the server")


@app.command()
def version():
    """버전 정보 표시"""
    from . import __version__
    
    console.print(f"[bold]MCP Orch[/bold] version [cyan]{__version__}[/cyan]")
    console.print("하이브리드 MCP 프록시 및 병렬화 오케스트레이션 도구")


def main():
    """메인 진입점"""
    try:
        app()
    except KeyboardInterrupt:
        console.print("\n[yellow]Interrupted by user[/yellow]")
        sys.exit(0)
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        sys.exit(1)


if __name__ == "__main__":
    main()
