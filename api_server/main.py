from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, validator
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from jose import jwt
import os
from uuid import uuid4
import motor.motor_asyncio
from passlib.context import CryptContext

app = FastAPI(title="Pensieve API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 환경 변수
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = "pensieve"

# MongoDB 연결
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client[DATABASE_NAME]
users_collection = db.users
conversations_collection = db.conversations

# 보안
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 모델
class UserCreate(BaseModel):
    email: EmailStr  # 이메일 형식 검증
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('비밀번호는 최소 6자 이상이어야 합니다')
        if len(v) > 100:
            raise ValueError('비밀번호는 100자 이하여야 합니다')
        return v

class UserLogin(BaseModel):
    email: str
    password: str

class Message(BaseModel):
    role: str
    content: str

class ConversationCreate(BaseModel):
    messages: List[Message]
    metadata: Optional[Dict[str, Any]] = None

class ConversationUpdate(BaseModel):
    messages: List[Message]

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# 헬퍼 함수
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    
    user = await users_collection.find_one({"email": email})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user

# 인증 엔드포인트
@app.post("/auth/register", response_model=Token)
async def register(user: UserCreate):
    # 이메일 중복 확인
    if await users_collection.find_one({"email": user.email}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # 사용자 생성
    hashed_password = pwd_context.hash(user.password)
    user_doc = {
        "_id": str(uuid4()),
        "email": user.email,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow()
    }
    await users_collection.insert_one(user_doc)
    
    # 토큰 생성
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token}

@app.post("/auth/login", response_model=Token)
async def login(user: UserLogin):
    # 사용자 확인
    db_user = await users_collection.find_one({"email": user.email})
    if not db_user or not pwd_context.verify(user.password, db_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # 토큰 생성
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token}

# 대화 엔드포인트
@app.post("/conversations")
async def create_conversation(
    conversation: ConversationCreate,
    current_user: dict = Depends(get_current_user)
):
    conversation_doc = {
        "_id": str(uuid4()),
        "user_id": current_user["_id"],
        "messages": [msg.dict() for msg in conversation.messages],
        "metadata": conversation.metadata or {},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await conversations_collection.insert_one(conversation_doc)
    return {"id": conversation_doc["_id"], "message": "Conversation created successfully"}

@app.get("/conversations")
async def list_conversations(
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    cursor = conversations_collection.find(
        {"user_id": current_user["_id"]}
    ).skip(offset).limit(limit)
    
    conversations = []
    async for conv in cursor:
        conversations.append({
            "id": conv["_id"],
            "metadata": conv.get("metadata", {}),
            "created_at": conv["created_at"],
            "updated_at": conv["updated_at"],
            "message_count": len(conv.get("messages", []))
        })
    
    return conversations

@app.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    conversation = await conversations_collection.find_one({
        "_id": conversation_id,
        "user_id": current_user["_id"]
    })
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return conversation

@app.put("/conversations/{conversation_id}")
async def update_conversation(
    conversation_id: str,
    update: ConversationUpdate,
    current_user: dict = Depends(get_current_user)
):
    result = await conversations_collection.update_one(
        {"_id": conversation_id, "user_id": current_user["_id"]},
        {
            "$set": {
                "messages": [msg.dict() for msg in update.messages],
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return {"message": "Conversation updated successfully"}

@app.post("/conversations/{conversation_id}/messages")
async def append_messages(
    conversation_id: str,
    messages: List[Message],
    current_user: dict = Depends(get_current_user)
):
    result = await conversations_collection.update_one(
        {"_id": conversation_id, "user_id": current_user["_id"]},
        {
            "$push": {"messages": {"$each": [msg.dict() for msg in messages]}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return {"message": f"Added {len(messages)} messages to conversation"}

@app.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    result = await conversations_collection.delete_one({
        "_id": conversation_id,
        "user_id": current_user["_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return {"message": "Conversation deleted successfully"}

@app.get("/conversations/search")
async def search_conversations(
    query: str,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    # MongoDB 텍스트 검색 사용
    cursor = conversations_collection.find(
        {
            "user_id": current_user["_id"],
            "$text": {"$search": query}
        }
    ).limit(limit)
    
    results = []
    async for conv in cursor:
        results.append({
            "id": conv["_id"],
            "metadata": conv.get("metadata", {}),
            "created_at": conv["created_at"],
            "message_count": len(conv.get("messages", []))
        })
    
    return results

@app.get("/")
async def root():
    return {"message": "Pensieve API", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)