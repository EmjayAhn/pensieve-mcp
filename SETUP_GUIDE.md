# Pensieve MCP 사용자 설정 가이드

## 사전 준비

1. **Python 3.10+ 설치**
2. **Claude Desktop 설치** 

## 설치 방법

### 방법 1: 자동 설치 (권장)

```bash
# MCP 클라이언트 다운로드 및 설치
mkdir -p ~/.pensieve-mcp
cd ~/.pensieve-mcp

# 필요한 파일들 다운로드
curl -O https://raw.githubusercontent.com/your-repo/main/mcp_server/server_api.py
curl -O https://raw.githubusercontent.com/your-repo/main/mcp_server/__init__.py

# Python 가상환경 생성
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install mcp>=1.1.2 httpx>=0.25.2 python-dotenv>=1.0.0
```

### 방법 2: 수동 설정

1. **MCP 서버 파일 복사**

   이 폴더의 `mcp_server/server_api.py` 파일을 자신의 컴퓨터에 복사합니다.

2. **실행 스크립트 생성**

   다음 내용으로 `run_pensieve.sh` 파일을 생성:

   ```bash
   #!/bin/bash
   export PENSIEVE_API_URL="https://emjay-api.wonderfulglacier-5c83e0ab.koreacentral.azurecontainerapps.io"
   python3 /path/to/your/server_api.py
   ```

## Claude Desktop 설정

### macOS
설정 파일 위치: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows  
설정 파일 위치: `%APPDATA%\Claude\claude_desktop_config.json`

### 설정 내용

```json
{
  "mcpServers": {
    "pensieve": {
      "command": "python3",
      "args": ["/path/to/your/server_api.py"],
      "env": {
        "PENSIEVE_API_URL": "https://emjay-api.wonderfulglacier-5c83e0ab.koreacentral.azurecontainerapps.io"
      }
    }
  }
}
```

**주의**: `/path/to/your/server_api.py`를 실제 파일 경로로 변경하세요.

## 사용 방법

1. **Claude Desktop 재시작**

2. **회원가입**
   ```
   register 도구를 사용해서 새 계정을 만들어줘.
   이메일: your-email@example.com
   비밀번호: your-password
   ```

3. **로그인**
   ```
   login 도구로 로그인해줘.
   이메일: your-email@example.com  
   비밀번호: your-password
   ```

4. **대화 저장**
   ```
   현재 대화를 "첫 번째 테스트" 제목으로 저장해줘
   ```

5. **대화 목록 조회**
   ```
   저장된 대화 목록을 보여줘
   ```

6. **대화 검색**
   ```
   "python"이 포함된 대화를 검색해줘
   ```

## 문제 해결

### MCP 서버가 나타나지 않는 경우
1. Claude Desktop 완전 재시작 (Cmd+Q 후 다시 실행)
2. 로그 확인: Claude Desktop → View → Developer → Developer Tools → Console

### API 연결 오류
1. 인터넷 연결 확인
2. API URL 확인: https://emjay-api.wonderfulglacier-5c83e0ab.koreacentral.azurecontainerapps.io

### 파일 경로 문제
- macOS/Linux: `/Users/username/path/to/server_api.py`
- Windows: `C:\Users\username\path\to\server_api.py`

## 지원

문제가 있으면 repository의 Issues 탭에서 문의하세요.