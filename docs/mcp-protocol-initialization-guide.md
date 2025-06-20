# MCP Protocol Initialization Guide

## Overview
This document describes the proper MCP (Model Context Protocol) initialization sequence and how to implement it in mcp-orch for different server types.

## Problem Description

### Issue
MCP servers using `resource_connection` type (like JDBC servers) were returning the error:
```
"Client not initialized yet [session-id]"
```

### Root Cause
mcp-orch was not following the complete MCP protocol initialization sequence:

**Incorrect Sequence (Before Fix):**
1. Send `initialize` request
2. Receive `initialize` response  
3. **Immediately send `tools/list` request** ← ERROR HERE
4. Get "Client not initialized yet" error

**Correct MCP Protocol Sequence:**
1. Send `initialize` request
2. Receive `initialize` response
3. **Send `notifications/initialized` notification** ← MISSING STEP
4. Send `tools/list` request (now succeeds)

## Solution Implementation

### Code Location
File: `/src/mcp_orch/services/mcp_connection_service.py`
Function: `_get_tools_sequential()` (for `resource_connection` type servers)

### Before Fix
```python
if response.get('id') == 1 and 'result' in response:
    init_response_received = True
    logger.info("✅ Initialize response received")
    # JDBC 서버 초기화 완료 대기 (Client not initialized yet 에러 방지)
    await asyncio.sleep(2)  # ❌ Workaround with sleep
    break
```

### After Fix
```python
if response.get('id') == 1 and 'result' in response:
    init_response_received = True
    logger.info("✅ Initialize response received")
    
    # MCP 프로토콜 표준: initialized notification 전송
    initialized_message = {
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
    }
    initialized_json = json.dumps(initialized_message) + '\n'
    process.stdin.write(initialized_json.encode())
    await process.stdin.drain()
    logger.info("📤 Sent initialized notification (MCP protocol standard)")
    break
```

## Implementation Details

### What Was Changed
1. **Removed**: `await asyncio.sleep(2)` workaround
2. **Added**: Proper `notifications/initialized` message sending
3. **Added**: Clear logging for protocol compliance

### Why This Works
- The `notifications/initialized` tells the MCP server that the client is ready
- This completes the handshake process according to MCP specification
- After this notification, the server accepts `tools/list` and other requests

## Testing the Fix

### Expected Behavior
After applying this fix:
1. `resource_connection` MCP servers should successfully return tool lists
2. No more "Client not initialized yet" errors
3. Tools should appear in the mcp-orch UI

### Test Steps
1. Register a `resource_connection` type MCP server (like JDBC)
2. Navigate to the server detail page
3. Check that tools are loaded and displayed
4. Verify in logs that `initialized notification` is sent

### Log Output (Success)
```
INFO     📤 Sent initialize request, waiting for response...
INFO     📋 Init response: {'jsonrpc': '2.0', 'id': 1, 'result': {...}}
INFO     ✅ Initialize response received
INFO     📤 Sent initialized notification (MCP protocol standard)
INFO     📤 Sent tools/list request, waiting for response...
INFO     📋 Tools response: {'jsonrpc': '2.0', 'id': 2, 'result': {'tools': [...]}}
```

## Implementation Status

### Fixed Components
- ✅ **Tool List Retrieval** (`_get_tools_sequential`): Fixed for `resource_connection` type
- ✅ **Tool Execution** (`call_tool`): Fixed for all server types
- 🔄 `api_wrapper` **Tool List**: Currently working but may need this fix in the future

### Tool Execution Fix
After fixing tool list retrieval, tool execution was also showing "Client not initialized yet" errors. The same fix was applied to the `call_tool` function:

**Location**: `mcp_connection_service.py` - `call_tool()` function, around line 612-625

**Before Fix**:
```python
if response.get('id') == 1 and 'result' in response:
    logger.info(f"✅ MCP server {server_id} initialized successfully")
    init_completed = True
    break
# Immediately proceeds to tool call → ERROR
```

**After Fix**:
```python
if response.get('id') == 1 and 'result' in response:
    logger.info(f"✅ MCP server {server_id} initialized successfully")
    
    # MCP 프로토콜 표준: initialized notification 전송
    initialized_message = {
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
    }
    initialized_json = json.dumps(initialized_message) + '\n'
    process.stdin.write(initialized_json.encode())
    await process.stdin.drain()
    logger.info("📤 Sent initialized notification for tool call (MCP protocol standard)")
    
    init_completed = True
    break
```

### How to Apply to `api_wrapper` Type

If `api_wrapper` servers start showing similar "Client not initialized yet" errors, apply the same fix to the corresponding connection logic:

1. **Find the location**: Look for `api_wrapper` connection handling in `mcp_connection_service.py`
2. **Identify the initialize sequence**: Find where `initialize` request/response is handled
3. **Add initialized notification**: Insert the same `notifications/initialized` code after receiving the initialize response
4. **Test thoroughly**: Ensure existing `api_wrapper` servers continue to work

### Template Code for Other Types
```python
# After receiving initialize response
if response.get('id') == 1 and 'result' in response:
    init_response_received = True
    logger.info("✅ Initialize response received")
    
    # MCP 프로토콜 표준: initialized notification 전송
    initialized_message = {
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
    }
    initialized_json = json.dumps(initialized_message) + '\n'
    process.stdin.write(initialized_json.encode())
    await process.stdin.drain()
    logger.info("📤 Sent initialized notification (MCP protocol standard)")
    break
```

## MCP Protocol Reference

### Official MCP Initialization Flow
1. **Client → Server**: `initialize` request with capabilities
2. **Server → Client**: `initialize` response with server capabilities  
3. **Client → Server**: `notifications/initialized` notification
4. **Normal operation**: Client can now make requests like `tools/list`, `resources/list`, etc.

### Key Points
- The `notifications/initialized` is a **notification**, not a request (no `id` field)
- This notification has no response - it's fire-and-forget
- Only after this notification should the client make other requests
- This is standardized in the MCP specification

## Troubleshooting

### If Tools Still Don't Load
1. **Check logs**: Look for the "Sent initialized notification" message
2. **Verify server type**: Ensure the server is correctly identified as `resource_connection`
3. **Test with MCP Inspector**: Compare behavior with the reference implementation
4. **Check command**: Ensure the MCP server command is correct and executable

### Common Mistakes
- Forgetting to call `await process.stdin.drain()` after writing
- Adding an `id` field to the notification (it should not have one)
- Not waiting for the initialize response before sending the notification
- Applying the fix to the wrong server type connection logic

## Related Files
- `/src/mcp_orch/services/mcp_connection_service.py` - Main connection logic
- `/src/mcp_orch/api/projects.py` - Server detail API that calls connection service
- `/web/src/components/servers/detail/` - Frontend components that display tools

## Commit Information
- Tool List Fix: `7121fd7` - "fix: [TASK_078] Add MCP protocol initialized notification for resource_connection servers"
- Tool Execution Fix: [next-commit] - "fix: [TASK_079] Add MCP protocol initialized notification for tool execution"
- Documentation: `7121fd7` - "docs: Add MCP protocol initialization guide"