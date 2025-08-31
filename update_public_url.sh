#!/bin/bash

# 배포 후 실제 URL로 업데이트하는 스크립트

if [ -z "$1" ]; then
    echo "사용법: ./update_public_url.sh <API_URL>"
    echo "예시: ./update_public_url.sh https://emjay-api.abc123.koreacentral.azurecontainerapps.io"
    exit 1
fi

API_URL="$1"

echo "공개 URL을 $API_URL 로 업데이트합니다..."

# install.sh 업데이트
sed -i.bak "s|API_URL=\".*\"|API_URL=\"$API_URL\"|" install.sh

# config 예제 파일들 업데이트
find config-examples -name "*.json" -exec sed -i.bak "s|https://.*azurecontainerapps.io|$API_URL|g" {} \;

# 사용자 가이드 업데이트
sed -i.bak "s|https://emjay-api\.YOUR.*azurecontainerapps\.io|$API_URL|g" USER_GUIDE.md

echo "✅ 업데이트 완료!"
echo "이제 다른 사용자들이 다음 명령어로 설치할 수 있습니다:"
echo "curl -sSL https://raw.githubusercontent.com/your-repo/main/install.sh | bash"