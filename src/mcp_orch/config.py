"""
설정 관리 모듈

애플리케이션 설정을 관리하고 환경 변수를 처리합니다.
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class ServerConfig(BaseModel):
    """서버 설정"""
    host: str = "0.0.0.0"
    port: int = 3000
    mode: str = "proxy"  # proxy 또는 batch
    workers: int = 1
    reload: bool = False
    log_level: str = "INFO"


class SecurityConfig(BaseModel):
    """보안 설정"""
    enable_auth: bool = True
    api_keys: List[Dict[str, Any]] = Field(default_factory=list)
    jwt_secret: Optional[str] = None
    cors_origins: List[str] = Field(default_factory=lambda: ["*"])
    
    # 초기 관리자 계정 설정
    initial_admin_email: Optional[str] = None
    initial_admin_password: Optional[str] = None
    
    @field_validator('jwt_secret')
    def validate_jwt_secret(cls, v):
        if v is None:
            # 개발 환경에서는 기본값 사용, 프로덕션에서는 필수
            if os.getenv("ENV", "development") == "production":
                raise ValueError("JWT_SECRET is required in production")
            return "dev-secret-key-change-in-production"
        return v


class LLMProviderConfig(BaseModel):
    """LLM 제공자별 설정"""
    endpoint: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 4096


class LLMConfig(BaseModel):
    """LLM 설정"""
    provider: str = "azure"  # azure, bedrock, openai, anthropic
    azure: Optional[LLMProviderConfig] = None
    bedrock: Optional[LLMProviderConfig] = None
    openai: Optional[LLMProviderConfig] = None
    anthropic: Optional[LLMProviderConfig] = None
    
    def get_active_provider(self) -> Optional[LLMProviderConfig]:
        """활성 프로바이더 설정 반환"""
        return getattr(self, self.provider, None)


class ExecutionConfig(BaseModel):
    """실행 엔진 설정"""
    max_parallel_tasks: int = 10
    task_timeout: int = 300  # seconds
    retry_count: int = 3
    retry_delay: int = 5  # seconds
    queue_size: int = 100


class MCPServerConfig(BaseModel):
    """MCP 서버 설정"""
    command: str
    args: List[str] = Field(default_factory=list)
    env: Dict[str, str] = Field(default_factory=dict)
    transport_type: str = "stdio"
    timeout: int = 60
    auto_approve: List[str] = Field(default_factory=list)
    disabled: bool = False


class Settings(BaseSettings):
    """
    애플리케이션 설정
    
    환경 변수와 설정 파일에서 설정을 로드합니다.
    """
    
    # 서버 설정
    server: ServerConfig = Field(default_factory=ServerConfig)
    
    # 보안 설정
    security: SecurityConfig = Field(default_factory=SecurityConfig)
    
    # LLM 설정
    llm: LLMConfig = Field(default_factory=LLMConfig)
    
    # 실행 설정
    execution: ExecutionConfig = Field(default_factory=ExecutionConfig)
    
    # MCP 서버 설정
    mcp_servers: Dict[str, MCPServerConfig] = Field(default_factory=dict)
    
    # 설정 파일 경로
    config_file: Optional[Path] = None
    mcp_config_file: Path = Path("mcp-config.json")
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_nested_delimiter="__",
        case_sensitive=False,
        extra="ignore"
    )
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._load_config_files()
        
    def _load_config_files(self):
        """설정 파일 로드"""
        # YAML/JSON 설정 파일 로드
        if self.config_file and self.config_file.exists():
            self._load_config_file(self.config_file)
            
        # MCP 서버 설정 파일 로드
        if self.mcp_config_file.exists():
            self._load_mcp_config()
            
    def _load_config_file(self, path: Path):
        """일반 설정 파일 로드"""
        try:
            if path.suffix in [".yaml", ".yml"]:
                import yaml
                with open(path, 'r', encoding='utf-8') as f:
                    config = yaml.safe_load(f)
            else:
                with open(path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    
            # 설정 업데이트
            for key, value in config.items():
                if hasattr(self, key):
                    if isinstance(getattr(self, key), BaseModel):
                        setattr(self, key, type(getattr(self, key))(**value))
                    else:
                        setattr(self, key, value)
                        
        except Exception as e:
            print(f"Error loading config file {path}: {e}")
            
    def _load_mcp_config(self):
        """MCP 서버 설정 파일 로드"""
        try:
            with open(self.mcp_config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
                
            mcp_servers = config.get("mcpServers", {})
            
            for server_name, server_config in mcp_servers.items():
                self.mcp_servers[server_name] = MCPServerConfig(**server_config)
                
        except Exception as e:
            print(f"Error loading MCP config file: {e}")
            
    def reload(self):
        """설정 리로드"""
        # 기존 설정 초기화
        self.mcp_servers.clear()
        
        # 설정 파일 다시 로드
        self._load_config_files()
        
    def get_mcp_server(self, name: str) -> Optional[MCPServerConfig]:
        """특정 MCP 서버 설정 조회"""
        return self.mcp_servers.get(name)
        
    def get_enabled_mcp_servers(self) -> Dict[str, MCPServerConfig]:
        """활성화된 MCP 서버 목록 조회"""
        return {
            name: config
            for name, config in self.mcp_servers.items()
            if not config.disabled
        }
        
    @classmethod
    def from_env(cls) -> "Settings":
        """환경 변수에서 설정 로드"""
        # 환경 변수 매핑
        env_mapping = {
            # 서버 설정
            "PROXY_PORT": ("server", "port"),
            "SERVER_MODE": ("server", "mode"),
            "LOG_LEVEL": ("server", "log_level"),
            
            # 보안 설정
            "API_KEY": ("security", "api_keys"),
            "JWT_SECRET": ("security", "jwt_secret"),
            "INITIAL_ADMIN_EMAIL": ("security", "initial_admin_email"),
            "INITIAL_ADMIN_PASSWORD": ("security", "initial_admin_password"),
            
            # LLM 설정
            "LLM_PROVIDER": ("llm", "provider"),
            "AZURE_AI_ENDPOINT": ("llm", "azure", "endpoint"),
            "AZURE_AI_API_KEY": ("llm", "azure", "api_key"),
            "AWS_REGION": ("llm", "bedrock", "region"),
            "OPENAI_API_KEY": ("llm", "openai", "api_key"),
            "ANTHROPIC_API_KEY": ("llm", "anthropic", "api_key"),
        }
        
        kwargs = {}
        
        for env_key, path in env_mapping.items():
            value = os.getenv(env_key)
            if value is not None:
                # 중첩된 설정 처리
                current = kwargs
                for key in path[:-1]:
                    if key not in current:
                        current[key] = {}
                    current = current[key]
                    
                # API 키 특별 처리
                if env_key == "API_KEY":
                    current[path[-1]] = [{"name": "default", "key": value}]
                else:
                    current[path[-1]] = value
                    
        return cls(**kwargs)
        
    def to_dict(self) -> Dict[str, Any]:
        """설정을 딕셔너리로 변환"""
        return {
            "server": self.server.model_dump(),
            "security": self.security.model_dump(exclude={"jwt_secret"}),
            "llm": self.llm.model_dump(exclude={"azure__api_key", "openai__api_key", "anthropic__api_key"}),
            "execution": self.execution.model_dump(),
            "mcp_servers": {
                name: config.model_dump()
                for name, config in self.mcp_servers.items()
            }
        }


# 전역 설정 인스턴스
settings = Settings.from_env()
