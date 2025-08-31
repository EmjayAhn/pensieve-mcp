#!/usr/bin/env python3
import asyncio
import json
import os
from typing import Dict, List, Optional, Any
import httpx
from mcp.server import Server
from mcp.types import Tool, TextContent
from mcp.server.stdio import stdio_server

# API 설정
API_BASE_URL = os.getenv("PENSIEVE_API_URL", "http://localhost:8000")
API_TOKEN = os.getenv("PENSIEVE_API_TOKEN", "")

# 서버 인스턴스
app = Server("pensieve-mcp")

# HTTP 클라이언트
async def get_http_client():
    global API_TOKEN
    headers = {}
    if API_TOKEN:
        headers["Authorization"] = f"Bearer {API_TOKEN}"
    return httpx.AsyncClient(base_url=API_BASE_URL, headers=headers)

@app.list_tools()
async def list_tools() -> List[Tool]:
    """사용 가능한 도구 목록 반환"""
    return [
        Tool(
            name="save_conversation",
            description="대화 내역을 저장합니다",
            inputSchema={
                "type": "object",
                "properties": {
                    "messages": {
                        "type": "array",
                        "description": "저장할 메시지 목록",
                        "items": {
                            "type": "object",
                            "properties": {
                                "role": {"type": "string", "enum": ["user", "assistant", "system"]},
                                "content": {"type": "string"}
                            },
                            "required": ["role", "content"]
                        }
                    },
                    "metadata": {
                        "type": "object",
                        "description": "대화에 대한 추가 메타데이터 (제목, 태그 등)"
                    }
                },
                "required": ["messages"]
            }
        ),
        Tool(
            name="load_conversation",
            description="저장된 대화를 불러옵니다",
            inputSchema={
                "type": "object",
                "properties": {
                    "conversation_id": {
                        "type": "string",
                        "description": "불러올 대화 ID"
                    }
                },
                "required": ["conversation_id"]
            }
        ),
        Tool(
            name="list_conversations",
            description="저장된 대화 목록을 조회합니다",
            inputSchema={
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "조회할 대화 수 (기본값: 50)",
                        "default": 50
                    },
                    "offset": {
                        "type": "integer",
                        "description": "시작 위치 (기본값: 0)",
                        "default": 0
                    }
                }
            }
        ),
        Tool(
            name="search_conversations",
            description="대화 내용을 검색합니다",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "검색할 텍스트"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "최대 결과 수 (기본값: 20)",
                        "default": 20
                    }
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="append_to_conversation",
            description="기존 대화에 메시지를 추가합니다",
            inputSchema={
                "type": "object",
                "properties": {
                    "conversation_id": {
                        "type": "string",
                        "description": "대화 ID"
                    },
                    "messages": {
                        "type": "array",
                        "description": "추가할 메시지 목록",
                        "items": {
                            "type": "object",
                            "properties": {
                                "role": {"type": "string", "enum": ["user", "assistant", "system"]},
                                "content": {"type": "string"}
                            },
                            "required": ["role", "content"]
                        }
                    }
                },
                "required": ["conversation_id", "messages"]
            }
        ),
        Tool(
            name="set_api_token",
            description="API 토큰을 설정합니다 (로그인 후 받은 토큰)",
            inputSchema={
                "type": "object",
                "properties": {
                    "token": {
                        "type": "string",
                        "description": "API 액세스 토큰"
                    }
                },
                "required": ["token"]
            }
        ),
        Tool(
            name="login",
            description="이메일과 비밀번호로 로그인합니다",
            inputSchema={
                "type": "object",
                "properties": {
                    "email": {
                        "type": "string",
                        "description": "이메일 주소"
                    },
                    "password": {
                        "type": "string",
                        "description": "비밀번호"
                    }
                },
                "required": ["email", "password"]
            }
        ),
        Tool(
            name="register",
            description="새 계정을 등록합니다",
            inputSchema={
                "type": "object",
                "properties": {
                    "email": {
                        "type": "string",
                        "description": "이메일 주소"
                    },
                    "password": {
                        "type": "string",
                        "description": "비밀번호"
                    }
                },
                "required": ["email", "password"]
            }
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """도구 실행"""
    global API_TOKEN
    
    try:
        if name == "set_api_token":
            API_TOKEN = arguments["token"]
            return [TextContent(
                type="text",
                text="API 토큰이 설정되었습니다. 이제 대화를 저장하고 불러올 수 있습니다."
            )]
        
        elif name == "login":
            async with httpx.AsyncClient(base_url=API_BASE_URL) as client:
                response = await client.post(
                    "/auth/login",
                    json={
                        "email": arguments["email"],
                        "password": arguments["password"]
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    API_TOKEN = data["access_token"]
                    return [TextContent(
                        type="text",
                        text=f"로그인 성공! 토큰이 자동으로 설정되었습니다."
                    )]
                else:
                    return [TextContent(
                        type="text",
                        text=f"로그인 실패: {response.text}"
                    )]
        
        elif name == "register":
            async with httpx.AsyncClient(base_url=API_BASE_URL) as client:
                response = await client.post(
                    "/auth/register",
                    json={
                        "email": arguments["email"],
                        "password": arguments["password"]
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    API_TOKEN = data["access_token"]
                    return [TextContent(
                        type="text",
                        text=f"회원가입 성공! 토큰이 자동으로 설정되었습니다."
                    )]
                else:
                    return [TextContent(
                        type="text",
                        text=f"회원가입 실패: {response.text}"
                    )]
        
        # 나머지 도구들은 인증이 필요
        if not API_TOKEN:
            return [TextContent(
                type="text",
                text="먼저 로그인하거나 API 토큰을 설정해주세요. login 또는 set_api_token 도구를 사용하세요."
            )]
        
        client = await get_http_client()
        async with client:
            if name == "save_conversation":
                messages = arguments["messages"]
                metadata = arguments.get("metadata", {})
                
                # 디버그: API 토큰 확인
                import sys
                print(f"DEBUG: API_TOKEN exists: {bool(API_TOKEN)}", file=sys.stderr)
                print(f"DEBUG: API_BASE_URL: {API_BASE_URL}", file=sys.stderr)
                
                response = await client.post(
                    "/conversations",
                    json={
                        "messages": messages,
                        "metadata": metadata
                    }
                )
                
                print(f"DEBUG: Response status: {response.status_code}", file=sys.stderr)
                print(f"DEBUG: Response text: {response.text[:200]}", file=sys.stderr)
                
                if response.status_code == 200:
                    data = response.json()
                    return [TextContent(
                        type="text",
                        text=f"대화가 저장되었습니다. ID: {data['id']}"
                    )]
                else:
                    return [TextContent(
                        type="text",
                        text=f"대화 저장 실패: {response.text}"
                    )]
            
            elif name == "load_conversation":
                conversation_id = arguments["conversation_id"]
                response = await client.get(f"/conversations/{conversation_id}")
                
                if response.status_code == 200:
                    conversation = response.json()
                    return [TextContent(
                        type="text",
                        text=json.dumps(conversation, ensure_ascii=False, indent=2)
                    )]
                else:
                    return [TextContent(
                        type="text",
                        text=f"대화를 찾을 수 없습니다: {response.text}"
                    )]
            
            elif name == "list_conversations":
                limit = arguments.get("limit", 50)
                offset = arguments.get("offset", 0)
                
                response = await client.get(
                    "/conversations",
                    params={"limit": limit, "offset": offset}
                )
                
                if response.status_code == 200:
                    conversations = response.json()
                    return [TextContent(
                        type="text",
                        text=json.dumps(conversations, ensure_ascii=False, indent=2)
                    )]
                else:
                    return [TextContent(
                        type="text",
                        text=f"대화 목록 조회 실패: {response.text}"
                    )]
            
            elif name == "search_conversations":
                query = arguments["query"]
                limit = arguments.get("limit", 20)
                
                response = await client.get(
                    "/conversations/search",
                    params={"query": query, "limit": limit}
                )
                
                if response.status_code == 200:
                    results = response.json()
                    return [TextContent(
                        type="text",
                        text=json.dumps(results, ensure_ascii=False, indent=2)
                    )]
                else:
                    return [TextContent(
                        type="text",
                        text=f"검색 실패: {response.text}"
                    )]
            
            elif name == "append_to_conversation":
                conversation_id = arguments["conversation_id"]
                messages = arguments["messages"]
                
                response = await client.post(
                    f"/conversations/{conversation_id}/messages",
                    json=messages
                )
                
                if response.status_code == 200:
                    return [TextContent(
                        type="text",
                        text=f"대화에 {len(messages)}개의 메시지가 추가되었습니다."
                    )]
                else:
                    return [TextContent(
                        type="text",
                        text=f"메시지 추가 실패: {response.text}"
                    )]
            
            else:
                return [TextContent(
                    type="text",
                    text=f"알 수 없는 도구: {name}"
                )]
                
    except Exception as e:
        return [TextContent(
            type="text",
            text=f"오류 발생: {str(e)}"
        )]

async def main():
    """서버 실행"""
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())