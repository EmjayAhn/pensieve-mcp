#!/usr/bin/env python3
import asyncio
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from uuid import uuid4

from mcp.server import Server
from mcp.types import (
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
)
from mcp.server.stdio import stdio_server

# 대화 저장 디렉토리
STORAGE_DIR = Path.home() / ".pensieve-mcp" / "conversations"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

# 서버 인스턴스
app = Server("pensieve-mcp")

# 메모리 내 대화 캐시 (성능 향상)
conversation_cache: Dict[str, Dict[str, Any]] = {}


def save_conversation(conversation_id: str, messages: List[Dict[str, Any]], metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """대화를 파일 시스템에 저장"""
    conversation_data = {
        "id": conversation_id,
        "messages": messages,
        "metadata": metadata or {},
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    # 파일로 저장
    file_path = STORAGE_DIR / f"{conversation_id}.json"
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(conversation_data, f, ensure_ascii=False, indent=2)
    
    # 캐시에도 저장
    conversation_cache[conversation_id] = conversation_data
    
    return conversation_data


def load_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    """대화를 파일 시스템에서 불러오기"""
    # 캐시 확인
    if conversation_id in conversation_cache:
        return conversation_cache[conversation_id]
    
    # 파일에서 로드
    file_path = STORAGE_DIR / f"{conversation_id}.json"
    if file_path.exists():
        with open(file_path, 'r', encoding='utf-8') as f:
            conversation_data = json.load(f)
            conversation_cache[conversation_id] = conversation_data
            return conversation_data
    
    return None


def list_conversations(limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """저장된 모든 대화 목록 반환"""
    conversations = []
    
    # 모든 JSON 파일 읽기
    json_files = sorted(STORAGE_DIR.glob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True)
    
    for file_path in json_files[offset:offset + limit]:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # 메타데이터만 포함한 간략한 정보
                conversations.append({
                    "id": data["id"],
                    "metadata": data.get("metadata", {}),
                    "created_at": data.get("created_at"),
                    "updated_at": data.get("updated_at"),
                    "message_count": len(data.get("messages", []))
                })
        except Exception as e:
            print(f"Error loading {file_path}: {e}")
    
    return conversations


def search_conversations(query: str, limit: int = 20) -> List[Dict[str, Any]]:
    """대화 내용 검색"""
    results = []
    query_lower = query.lower()
    
    for file_path in STORAGE_DIR.glob("*.json"):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                # 메시지 내용에서 검색
                for message in data.get("messages", []):
                    content = message.get("content", "").lower()
                    if query_lower in content:
                        results.append({
                            "id": data["id"],
                            "metadata": data.get("metadata", {}),
                            "created_at": data.get("created_at"),
                            "matched_message": message,
                            "message_count": len(data.get("messages", []))
                        })
                        break
                
                # 메타데이터에서도 검색
                metadata_str = json.dumps(data.get("metadata", {})).lower()
                if query_lower in metadata_str and data["id"] not in [r["id"] for r in results]:
                    results.append({
                        "id": data["id"],
                        "metadata": data.get("metadata", {}),
                        "created_at": data.get("created_at"),
                        "message_count": len(data.get("messages", []))
                    })
                    
                if len(results) >= limit:
                    break
                    
        except Exception as e:
            print(f"Error searching {file_path}: {e}")
    
    return results[:limit]


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
                    "conversation_id": {
                        "type": "string",
                        "description": "대화 ID (없으면 자동 생성)"
                    },
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
        )
    ]


@app.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """도구 실행"""
    try:
        if name == "save_conversation":
            conversation_id = arguments.get("conversation_id") or str(uuid4())
            messages = arguments["messages"]
            metadata = arguments.get("metadata", {})
            
            result = save_conversation(conversation_id, messages, metadata)
            return [TextContent(
                type="text",
                text=f"대화가 저장되었습니다. ID: {result['id']}"
            )]
            
        elif name == "load_conversation":
            conversation_id = arguments["conversation_id"]
            conversation = load_conversation(conversation_id)
            
            if conversation:
                return [TextContent(
                    type="text",
                    text=json.dumps(conversation, ensure_ascii=False, indent=2)
                )]
            else:
                return [TextContent(
                    type="text",
                    text=f"대화를 찾을 수 없습니다: {conversation_id}"
                )]
                
        elif name == "list_conversations":
            limit = arguments.get("limit", 50)
            offset = arguments.get("offset", 0)
            
            conversations = list_conversations(limit, offset)
            return [TextContent(
                type="text",
                text=json.dumps(conversations, ensure_ascii=False, indent=2)
            )]
            
        elif name == "search_conversations":
            query = arguments["query"]
            limit = arguments.get("limit", 20)
            
            results = search_conversations(query, limit)
            return [TextContent(
                type="text",
                text=json.dumps(results, ensure_ascii=False, indent=2)
            )]
            
        elif name == "append_to_conversation":
            conversation_id = arguments["conversation_id"]
            new_messages = arguments["messages"]
            
            # 기존 대화 로드
            conversation = load_conversation(conversation_id)
            if not conversation:
                return [TextContent(
                    type="text",
                    text=f"대화를 찾을 수 없습니다: {conversation_id}"
                )]
            
            # 메시지 추가
            conversation["messages"].extend(new_messages)
            conversation["updated_at"] = datetime.now().isoformat()
            
            # 저장
            result = save_conversation(
                conversation_id,
                conversation["messages"],
                conversation.get("metadata", {})
            )
            
            return [TextContent(
                type="text",
                text=f"대화에 {len(new_messages)}개의 메시지가 추가되었습니다."
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