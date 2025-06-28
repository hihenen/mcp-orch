"""
MCP Error Handler

Responsible for error handling and classification in MCP operations:
- Error message extraction and cleaning
- Error type classification
- Standardized error response creation
- Retry logic determination

Extracted from mcp_connection_service.py to follow Single Responsibility Principle.
"""

import re
import logging
import asyncio
from typing import Dict, Optional, Any
from datetime import datetime

from .interfaces import IMcpErrorHandler, ToolExecutionError


logger = logging.getLogger(__name__)


class McpErrorHandler(IMcpErrorHandler):
    """
    MCP Error Handler Implementation
    
    Handles error processing, classification, and standardization for MCP operations.
    """
    
    def __init__(self):
        # Common error patterns for extraction
        self.error_patterns = [
            r"Error: (.+)",
            r"Exception: (.+)",
            r"ERROR: (.+)",
            r"FATAL: (.+)",
            r"Failed to (.+)",
            r"Cannot (.+)",
            r"Unable to (.+)"
        ]
        
        # Error classification patterns
        self.connection_errors = [
            "connection refused", "connection reset", "connection timeout",
            "network unreachable", "host unreachable", "no route to host"
        ]
        
        self.authentication_errors = [
            "authentication failed", "invalid credentials", "access denied",
            "unauthorized", "permission denied", "forbidden"
        ]
        
        self.timeout_errors = [
            "timeout", "timed out", "deadline exceeded", "operation timeout"
        ]
        
        self.resource_errors = [
            "file not found", "no such file", "permission denied",
            "disk full", "out of memory", "resource temporarily unavailable"
        ]
    
    def extract_meaningful_error(self, stderr_text: str) -> str:
        """
        Extract meaningful error message from stderr output
        
        Args:
            stderr_text: Raw stderr output from MCP server
            
        Returns:
            str: Cleaned and meaningful error message
        """
        if not stderr_text:
            return "Unknown error - no error details provided"
        
        try:
            # Clean up the text
            clean_text = stderr_text.strip()
            
            # Remove ANSI color codes
            ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
            clean_text = ansi_escape.sub('', clean_text)
            
            # Split into lines and process
            lines = [line.strip() for line in clean_text.split('\n') if line.strip()]
            
            if not lines:
                return "Empty error output"
            
            # Try to extract meaningful error using patterns
            for line in lines:
                for pattern in self.error_patterns:
                    match = re.search(pattern, line, re.IGNORECASE)
                    if match:
                        error_msg = match.group(1).strip()
                        if error_msg and len(error_msg) > 5:  # Avoid too short messages
                            return error_msg
            
            # If no pattern matches, look for lines containing key error indicators
            error_indicators = ['error', 'exception', 'failed', 'cannot', 'unable', 'invalid']
            for line in lines:
                line_lower = line.lower()
                if any(indicator in line_lower for indicator in error_indicators):
                    # Clean up common prefixes
                    cleaned = re.sub(r'^\w+:\s*', '', line)  # Remove "Error:", "Exception:", etc.
                    cleaned = re.sub(r'^\[\d+\]\s*', '', cleaned)  # Remove timestamps like [123]
                    cleaned = re.sub(r'^\d{4}-\d{2}-\d{2}.*?:\s*', '', cleaned)  # Remove date timestamps
                    
                    if cleaned and len(cleaned.strip()) > 10:
                        return cleaned.strip()
            
            # If still no meaningful error found, return the first non-empty line
            if lines:
                first_line = lines[0]
                if len(first_line) > 100:
                    # Truncate very long lines
                    return first_line[:100] + "..."
                return first_line
            
            return "Unknown error occurred"
            
        except Exception as e:
            logger.warning(f"Error processing stderr text: {e}")
            # Fallback: return first 200 characters of original text
            return stderr_text[:200] + ("..." if len(stderr_text) > 200 else "")
    
    def classify_error(self, error: Exception) -> str:
        """
        Classify error type for appropriate handling
        
        Args:
            error: Exception to classify
            
        Returns:
            str: Error classification (connection, authentication, timeout, resource, unknown)
        """
        try:
            error_msg = str(error).lower()
            
            # Check for connection errors
            if any(pattern in error_msg for pattern in self.connection_errors):
                return "connection"
            
            # Check for authentication errors
            if any(pattern in error_msg for pattern in self.authentication_errors):
                return "authentication"
            
            # Check for timeout errors
            if any(pattern in error_msg for pattern in self.timeout_errors):
                return "timeout"
            
            # Check for resource errors
            if any(pattern in error_msg for pattern in self.resource_errors):
                return "resource"
            
            # Check exception type
            if isinstance(error, asyncio.TimeoutError):
                return "timeout"
            elif isinstance(error, ConnectionError):
                return "connection"
            elif isinstance(error, PermissionError):
                return "authentication"
            elif isinstance(error, FileNotFoundError):
                return "resource"
            elif isinstance(error, ToolExecutionError):
                return "tool_execution"
            
            return "unknown"
            
        except Exception as e:
            logger.warning(f"Error classifying error: {e}")
            return "unknown"
    
    def create_error_response(self, error: Exception, context: Optional[Dict] = None) -> Dict:
        """
        Create standardized error response
        
        Args:
            error: Exception to convert to response
            context: Additional context information
            
        Returns:
            Dict: Standardized error response
        """
        try:
            error_type = self.classify_error(error)
            
            response = {
                "success": False,
                "error": {
                    "type": error_type,
                    "message": str(error),
                    "timestamp": datetime.now().isoformat()
                }
            }
            
            # Add error code if available
            if hasattr(error, 'error_code'):
                response["error"]["code"] = error.error_code
            
            # Add details if available
            if hasattr(error, 'details'):
                response["error"]["details"] = error.details
            
            # Add context if provided
            if context:
                response["error"]["context"] = context
            
            # Add retry recommendation
            response["error"]["retryable"] = self.should_retry(error, 1)
            
            return response
            
        except Exception as e:
            logger.error(f"Error creating error response: {e}")
            return {
                "success": False,
                "error": {
                    "type": "unknown",
                    "message": "Internal error processing exception",
                    "timestamp": datetime.now().isoformat(),
                    "retryable": False
                }
            }
    
    def should_retry(self, error: Exception, attempt_count: int) -> bool:
        """
        Determine if operation should be retried based on error type
        
        Args:
            error: Exception that occurred
            attempt_count: Current attempt number
            
        Returns:
            bool: True if operation should be retried
        """
        try:
            # Don't retry after too many attempts
            if attempt_count >= 3:
                return False
            
            error_type = self.classify_error(error)
            
            # Retryable error types
            retryable_types = ["timeout", "connection", "resource"]
            
            # Never retry authentication errors
            if error_type == "authentication":
                return False
            
            # Retry connection and timeout errors
            if error_type in retryable_types:
                return True
            
            # For tool execution errors, check error code
            if isinstance(error, ToolExecutionError):
                retryable_codes = ["TIMEOUT", "CONNECTION_FAILED", "TEMPORARY_FAILURE"]
                return error.error_code in retryable_codes
            
            return False
            
        except Exception as e:
            logger.warning(f"Error determining retry logic: {e}")
            return False
    
    def create_tool_execution_error(
        self, 
        message: str, 
        error_code: str = "UNKNOWN", 
        details: Optional[Dict] = None
    ) -> ToolExecutionError:
        """
        Create a ToolExecutionError with proper context
        
        Args:
            message: Error message
            error_code: Error code for classification
            details: Additional error details
            
        Returns:
            ToolExecutionError: Properly formatted error
        """
        return ToolExecutionError(
            message=message,
            error_code=error_code,
            details=details or {}
        )