#!/bin/bash

# Pensieve MCP 클라이언트 설치 스크립트
# 사용법: curl -sSL https://raw.githubusercontent.com/your-repo/main/install.sh | bash

set -e

# 색상 코드
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 공개 API URL (배포 후 실제 URL로 변경)
API_URL="https://emjay-api.YOUR_DEPLOYED_URL.koreacentral.azurecontainerapps.io"

echo -e "${BLUE}🔮 Pensieve MCP 클라이언트 설치${NC}"

# 운영체제 감지
if [[ "$OSTYPE" == "darwin"* ]]; then
    CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
    OS="macOS"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    CLAUDE_CONFIG_DIR="$APPDATA/Claude"
    OS="Windows"
else
    echo -e "${RED}지원되지 않는 운영체제입니다.${NC}"
    exit 1
fi

echo -e "${GREEN}감지된 OS: $OS${NC}"

# 설치 디렉토리 생성
INSTALL_DIR="$HOME/.pensieve-mcp"
mkdir -p "$INSTALL_DIR"

echo -e "${GREEN}1. Pensieve MCP 파일 다운로드...${NC}"

# MCP 서버 파일들 다운로드
curl -sSL "https://raw.githubusercontent.com/your-repo/main/mcp_server/server_api.py" -o "$INSTALL_DIR/server_api.py"
curl -sSL "https://raw.githubusercontent.com/your-repo/main/requirements_client.txt" -o "$INSTALL_DIR/requirements.txt"

# 실행 스크립트 생성
cat > "$INSTALL_DIR/run_server.sh" << EOF
#!/bin/bash
cd "\$(dirname "\$0")"
export PENSIEVE_API_URL="$API_URL"
python -m server_api
EOF

chmod +x "$INSTALL_DIR/run_server.sh"

echo -e "${GREEN}2. Python 의존성 설치...${NC}"

# Python과 pip 확인
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3가 설치되어 있지 않습니다. 먼저 Python을 설치해주세요.${NC}"
    exit 1
fi

# 가상환경 생성 및 의존성 설치
python3 -m venv "$INSTALL_DIR/venv"
source "$INSTALL_DIR/venv/bin/activate"
pip install -r "$INSTALL_DIR/requirements.txt"

echo -e "${GREEN}3. Claude Desktop 설정 업데이트...${NC}"

# Claude 설정 디렉토리 생성
mkdir -p "$CLAUDE_CONFIG_DIR"

# 기존 설정 백업
if [ -f "$CLAUDE_CONFIG_DIR/claude_desktop_config.json" ]; then
    cp "$CLAUDE_CONFIG_DIR/claude_desktop_config.json" "$CLAUDE_CONFIG_DIR/claude_desktop_config.json.backup"
    echo -e "${YELLOW}기존 설정을 백업했습니다: claude_desktop_config.json.backup${NC}"
fi

# 새 설정 생성
cat > "$CLAUDE_CONFIG_DIR/claude_desktop_config.json" << EOF
{
  "mcpServers": {
    "pensieve": {
      "command": "$INSTALL_DIR/venv/bin/python",
      "args": ["$INSTALL_DIR/server_api.py"],
      "env": {
        "PENSIEVE_API_URL": "$API_URL"
      }
    }
  }
}
EOF

echo -e "${GREEN}✅ 설치 완료!${NC}"
echo
echo -e "${BLUE}사용 방법:${NC}"
echo -e "1. Claude Desktop을 재시작하세요"
echo -e "2. 새 계정 등록: ${YELLOW}'register 도구를 사용해서 계정을 만들어줘'${NC}"
echo -e "3. 로그인: ${YELLOW}'login 도구를 사용해서 로그인해줘'${NC}"
echo -e "4. 대화 저장: ${YELLOW}'현재 대화를 저장해줘'${NC}"
echo
echo -e "${BLUE}설치 위치: $INSTALL_DIR${NC}"
echo -e "${BLUE}API URL: $API_URL${NC}"

# Claude Desktop 재시작 안내
if [[ "$OS" == "macOS" ]]; then
    echo
    echo -e "${YELLOW}Claude Desktop을 재시작하려면:${NC}"
    echo -e "Cmd+Q로 완전히 종료 후 다시 실행하세요"
fi