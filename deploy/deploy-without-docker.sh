#!/bin/bash

# Docker 없이 Azure에 배포하는 스크립트 (GitHub Actions 사용)

# Azure 설정
RESOURCE_GROUP=""
LOCATION=""
CONTAINER_APP_ENV=""
CONTAINER_APP_NAME=""
COSMOS_ACCOUNT=""

# 색상 코드
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Docker 없이 Pensieve API Azure 배포${NC}"

# Cosmos DB 연결 문자열 가져오기
echo -e "${GREEN}1. Cosmos DB 연결 문자열 가져오기${NC}"
COSMOS_CONNECTION=$(az cosmosdb keys list \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --type connection-strings \
  --query connectionStrings[0].connectionString \
  --output tsv)

if [ -z "$COSMOS_CONNECTION" ]; then
    echo "Cosmos DB 연결 문자열을 가져올 수 없습니다."
    exit 1
fi

# JWT Secret 생성
JWT_SECRET=$(openssl rand -base64 32)

echo -e "${GREEN}2. Container App 생성 (공개 이미지 사용)${NC}"

# 공개 Python 이미지를 사용해서 Container App 생성
cat > app-config.yaml << EOF
location: $LOCATION
resourceGroup: $RESOURCE_GROUP
type: Microsoft.App/containerApps
tags: {}
properties:
  managedEnvironmentId: /subscriptions/\$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.App/managedEnvironments/$CONTAINER_APP_ENV
  configuration:
    secrets:
    - name: mongodb-url
      value: "$COSMOS_CONNECTION"
    - name: jwt-secret
      value: "$JWT_SECRET"
    activeRevisionsMode: single
    ingress:
      external: true
      targetPort: 8000
      transport: auto
      traffic:
      - weight: 100
        latestRevision: true
  template:
    containers:
    - image: python:3.11-slim
      name: pensieve-api
      env:
      - name: MONGODB_URL
        secretRef: mongodb-url
      - name: JWT_SECRET
        secretRef: jwt-secret
      - name: PORT
        value: "8000"
      command:
      - /bin/sh
      - -c
      args:
      - |
        pip install fastapi uvicorn motor passlib[bcrypt] python-jose[cryptography] python-multipart httpx pydantic python-dotenv &&
        cat > main.py << 'PYTHON_EOF'
$(cat ../api_server/main.py)
PYTHON_EOF
        uvicorn main:app --host 0.0.0.0 --port 8000
      resources:
        cpu: 0.5
        memory: 1Gi
    scale:
      minReplicas: 0
      maxReplicas: 10
EOF

# Container App 생성
az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --yaml app-config.yaml

# URL 가져오기
echo -e "${GREEN}3. 배포 완료!${NC}"
API_URL=$(az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  --output tsv 2>/dev/null)

if [ ! -z "$API_URL" ]; then
    echo -e "${BLUE}API URL: https://$API_URL${NC}"
    echo -e "${BLUE}이 URL을 사용자들에게 제공하세요.${NC}"
else
    echo "Container App URL을 가져올 수 없습니다. Azure Portal에서 확인해주세요."
fi

# 정리
rm -f app-config.yaml