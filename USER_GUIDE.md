# Pensieve MCP 사용자 가이드

## 빠른 설치 (권장)

```bash
curl -sSL https://raw.githubusercontent.com/your-repo/main/install.sh | bash
```

## 수동 설치

### 1. 파일 다운로드

```bash
mkdir -p ~/.pensieve-mcp
cd ~/.pensieve-mcp

# MCP 서버 파일 다운로드
curl -O https://raw.githubusercontent.com/your-repo/main/mcp_server/server_api.py
curl -O https://raw.githubusercontent.com/your-repo/main/requirements_client.txt
```

### 2. Python 환경 설정

```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements_client.txt
```

### 3. Claude Desktop 설정

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pensieve": {
      "command": "/Users/your-username/.pensieve-mcp/venv/bin/python",
      "args": ["/Users/your-username/.pensieve-mcp/server_api.py"],
      "env": {
        "PENSIEVE_API_URL": "https://emjay-api.YOUR_URL.koreacentral.azurecontainerapps.io"
      }
    }
  }
}
```

### 4. Claude Desktop 재시작

## 사용법

### 1. 계정 생성
```
register 도구를 사용해서 새 계정을 만들어줘. 
이메일: your-email@example.com
비밀번호: your-password
```

### 2. 로그인
```
login 도구로 로그인해줘.
이메일: your-email@example.com
비밀번호: your-password
```

### 3. 대화 저장
```
현재 대화를 "프로젝트 회의"라는 제목으로 저장해줘
```

### 4. 대화 목록 조회
```
저장된 대화 목록을 보여줘
```

### 5. 대화 불러오기
```
conversation_id가 "12345"인 대화를 불러와줘
```

### 6. 대화 검색
```
"python"이 포함된 대화를 검색해줘
```

## 공개 API 엔드포인트

현재 제공되는 공개 API:
- **URL**: `https://emjay-api.YOUR_DEPLOYED_URL.koreacentral.azurecontainerapps.io`
- **인증**: JWT 토큰 기반
- **사용량 제한**: 사용자당 일일 1000 요청

## 문제 해결

### MCP 서버가 나타나지 않는 경우
1. Claude Desktop 완전히 재시작 (Cmd+Q 후 다시 실행)
2. 로그 확인: Claude Desktop → View → Developer → Developer Tools → Console

### API 연결 오류
1. 인터넷 연결 확인
2. API URL이 올바른지 확인
3. 방화벽 설정 확인

### 계정 생성/로그인 오류
1. 이메일 형식 확인
2. 비밀번호 길이 (최소 6자)
3. 네트워크 연결 상태 확인

## 자체 서버 배포

자체 서버를 배포하고 싶다면:

```bash
git clone https://github.com/your-repo/pensieve-mcp
cd pensieve-mcp/deploy
./deploy-azure.sh
```

배포 후 받은 URL을 `PENSIEVE_API_URL`로 설정하세요.