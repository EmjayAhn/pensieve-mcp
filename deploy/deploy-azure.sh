#!/bin/bash

# Azure 설정
RESOURCE_GROUP=""
LOCATION=""
ACR_NAME=""
CONTAINER_APP_ENV=""
CONTAINER_APP_NAME=""
COSMOS_ACCOUNT=""
COSMOS_DB=""
ACR_USERNAME=""                                                              │
ACR_PASSWORD=""

# 색상 코드
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Pensieve API Azure 배포 시작${NC}"

# 1. 리소스 그룹 생성
echo -e "${GREEN}1. 리소스 그룹 생성${NC}"
az group create --name $RESOURCE_GROUP --location $LOCATION

# 2. Azure Container Registry 생성
echo -e "${GREEN}2. Container Registry 생성${NC}"
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic
az acr login --name $ACR_NAME

# 3. Docker 이미지 빌드 및 푸시
echo -e "${GREEN}3. Docker 이미지 빌드 및 푸시${NC}"
cd ../api_server
docker build -t pensieve-api .
docker tag pensieve-api $ACR_NAME.azurecr.io/pensieve-api:latest
docker push $ACR_NAME.azurecr.io/pensieve-api:latest

# 4. Cosmos DB 생성 (MongoDB API)
echo -e "${GREEN}4. Cosmos DB 생성${NC}"
az cosmosdb create \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --kind MongoDB \
  --locations regionName=$LOCATION

# Cosmos DB 연결 문자열 가져오기
COSMOS_CONNECTION=$(az cosmosdb keys list \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --type connection-strings \
  --query connectionStrings[0].connectionString \
  --output tsv)

# 5. Container Apps 환경 생성
echo -e "${GREEN}5. Container Apps 환경 생성${NC}"
az containerapp env create \
  --name $CONTAINER_APP_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# 6. Container App 생성
echo -e "${GREEN}6. Container App 생성${NC}"
az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_APP_ENV \
  --image $ACR_NAME.azurecr.io/pensieve-api:latest \
  --target-port 8000 \
  --ingress 'external' \
  --registry-server $ACR_NAME.azurecr.io \
  --secrets mongodb-url="$COSMOS_CONNECTION" jwt-secret="$(openssl rand -base64 32)" \
  --env-vars MONGODB_URL=secretref:mongodb-url JWT_SECRET=secretref:jwt-secret \
  --cpu 0.5 \
  --memory 1

# 7. URL 가져오기
echo -e "${GREEN}7. 배포 완료!${NC}"
API_URL=$(az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  --output tsv)

echo -e "${BLUE}API URL: https://$API_URL${NC}"
echo -e "${BLUE}이 URL을 MCP 서버의 PENSIEVE_API_URL 환경 변수로 설정하세요.${NC}"