# 수동 배포 가이드

## 1. 변수 설정
```bash
RESOURCE_GROUP="rg-emjay-test"
LOCATION="koreacentral"
ACR_NAME="emjayacr"  # 유니크한 이름을 위해 타임스탬프 추가
CONTAINER_APP_ENV="emjay-env"
CONTAINER_APP_NAME="emjay-api"
COSMOS_ACCOUNT="emjay-cosmos"
```

## 2. 리소스 그룹 생성
```bash
az group create --name $RESOURCE_GROUP --location $LOCATION
```

## 3. Container Registry 생성
```bash
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic
az acr login --name $ACR_NAME
```

## 4. Docker 이미지 빌드 및 푸시
```bash
cd ../api_server
docker build -t pensieve-api .
docker tag pensieve-api $ACR_NAME.azurecr.io/pensieve-api:latest
docker push $ACR_NAME.azurecr.io/pensieve-api:latest
```

## 5. Cosmos DB 생성
```bash
az cosmosdb create \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --kind MongoDB \
  --locations regionName=$LOCATION \
  --default-consistency-level Eventual \
  --enable-automatic-failover false
```

## 6. Cosmos DB 연결 문자열 가져오기
```bash
COSMOS_CONNECTION=$(az cosmosdb keys list \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --type connection-strings \
  --query connectionStrings[0].connectionString \
  --output tsv)
```

## 7. Container Apps 환경 생성
```bash
az containerapp env create \
  --name $CONTAINER_APP_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

## 8. Container App 생성
```bash
JWT_SECRET=$(openssl rand -base64 32)

az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_APP_ENV \
  --image $ACR_NAME.azurecr.io/pensieve-api:latest \
  --target-port 8000 \
  --ingress 'external' \
  --registry-server $ACR_NAME.azurecr.io \
  --secrets mongodb-url="$COSMOS_CONNECTION" jwt-secret="$JWT_SECRET" \
  --env-vars MONGODB_URL=secretref:mongodb-url JWT_SECRET=secretref:jwt-secret \
  --cpu 0.5 \
  --memory 1
```

## 9. API URL 확인
```bash
API_URL=$(az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  --output tsv)

echo "API URL: https://$API_URL"
```