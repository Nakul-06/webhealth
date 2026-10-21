# Microsoft Azure Infrastructure Provisioning & Deployment Script
# Target Architecture: Azure App Service (API/UI) + Azure Functions (Workers)
# + Azure Service Bus + Azure Cosmos DB + Application Insights + Key Vault

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "rg-webhealth",
    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus",
    [Parameter(Mandatory=$false)]
    [string]$Suffix = (Get-Random -Minimum 1000 -Maximum 9999)
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "   WEBHEALTH CLOUD INFRASTRUCTURE PROVISIONING (MICROSOFT AZURE)          " -ForegroundColor Yellow
Write-Host "==========================================================================" -ForegroundColor Cyan

# 0. Check Azure CLI
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Azure CLI ('az') is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Azure CLI from: https://aka.ms/installazurecliwindows" -ForegroundColor Cyan
    exit 1
}

# 1. Create Resource Group
Write-Host "`n[1/8] Ensuring Resource Group exists: $ResourceGroup in $Location..." -ForegroundColor Green
az group create --name $ResourceGroup --location $Location -o none

# 2. Provision Log Analytics Workspace & Application Insights
Write-Host "[2/8] Provisioning Log Analytics Workspace & Application Insights..." -ForegroundColor Green
$LawName = "law-webhealth-$Suffix"
az monitor log-analytics workspace create --resource-group $ResourceGroup --workspace-name $LawName --location $Location -o none

$AppInsightsName = "appi-webhealth-$Suffix"
az monitor app-insights component create `
    --app $AppInsightsName `
    --location $Location `
    --resource-group $ResourceGroup `
    --workspace $LawName `
    --application-type web -o none

$AppInsightsConn = az monitor app-insights component show `
    --app $AppInsightsName `
    --resource-group $ResourceGroup `
    --query "connectionString" -o tsv

Write-Host "  -> Application Insights Connection String retrieved." -ForegroundColor Gray

# 3. Provision Azure Cosmos DB (NoSQL API) with Partition Keys
Write-Host "[3/8] Provisioning Azure Cosmos DB account & collections (Partition Keys: /id, /scanId)..." -ForegroundColor Green
$CosmosAccount = "cosmos-webhealth-$Suffix"
az cosmosdb create `
    --name $CosmosAccount `
    --resource-group $ResourceGroup `
    --locations regionName=$Location failoverPriority=0 isZoneRedundant=False `
    --default-consistency-level Session -o none

az cosmosdb sql database create `
    --account-name $CosmosAccount `
    --resource-group $ResourceGroup `
    --name "webhealth-db" -o none

# Container 'scans' with partition key /id
az cosmosdb sql container create `
    --account-name $CosmosAccount `
    --resource-group $ResourceGroup `
    --database-name "webhealth-db" `
    --name "scans" `
    --partition-key-path "/id" -o none

# Container 'links' with partition key /scanId
az cosmosdb sql container create `
    --account-name $CosmosAccount `
    --resource-group $ResourceGroup `
    --database-name "webhealth-db" `
    --name "links" `
    --partition-key-path "/scanId" -o none

$CosmosEndpoint = az cosmosdb show --name $CosmosAccount --resource-group $ResourceGroup --query "documentEndpoint" -o tsv
$CosmosKey = az cosmosdb keys list --name $CosmosAccount --resource-group $ResourceGroup --query "primaryMasterKey" -o tsv

Write-Host "  -> Cosmos DB endpoint & keys configured." -ForegroundColor Gray

# 4. Provision Azure Service Bus with Queue & Dead-Lettering
Write-Host "[4/8] Provisioning Azure Service Bus Namespace & Queue (dead-link-tasks)..." -ForegroundColor Green
$SbNamespace = "sb-webhealth-$Suffix"
az servicebus namespace create `
    --name $SbNamespace `
    --resource-group $ResourceGroup `
    --location $Location `
    --sku Standard -o none

az servicebus queue create `
    --resource-group $ResourceGroup `
    --namespace-name $SbNamespace `
    --name "dead-link-tasks" `
    --max-delivery-count 5 `
    --enable-dead-lettering-on-message-expiration true -o none

$SbConn = az servicebus namespace authorization-rule keys list `
    --resource-group $ResourceGroup `
    --namespace-name $SbNamespace `
    --name "RootManageSharedAccessKey" `
    --query "primaryConnectionString" -o tsv

Write-Host "  -> Azure Service Bus Queue created with Dead-Lettering (max delivery: 5)." -ForegroundColor Gray

# 5. Provision Azure Key Vault for Secure Secret Storage
Write-Host "[5/8] Provisioning Azure Key Vault for Secrets Management..." -ForegroundColor Green
$KvName = "kv-webhealth-$Suffix"
az keyvault create --name $KvName --resource-group $ResourceGroup --location $Location -o none

az keyvault secret set --vault-name $KvName --name "ServiceBusConnection" --value $SbConn -o none
az keyvault secret set --vault-name $KvName --name "CosmosEndpoint" --value $CosmosEndpoint -o none
az keyvault secret set --vault-name $KvName --name "CosmosKey" --value $CosmosKey -o none
az keyvault secret set --vault-name $KvName --name "AppInsightsConnection" --value $AppInsightsConn -o none

Write-Host "  -> Secrets stored securely in Azure Key Vault: $KvName" -ForegroundColor Gray

# 6. Provision Storage Account & Azure Function App for Workers
Write-Host "[6/8] Provisioning Azure Function App (Node.js 20 Consumption Plan) for Workers..." -ForegroundColor Green
$StorageName = "stwebhealth$Suffix"
az storage account create `
    --name $StorageName `
    --resource-group $ResourceGroup `
    --location $Location `
    --sku Standard_LRS -o none

$FunctionAppName = "func-webhealth-$Suffix"
az functionapp create `
    --name $FunctionAppName `
    --storage-account $StorageName `
    --consumption-plan-location $Location `
    --resource-group $ResourceGroup `
    --os-type Linux `
    --runtime node `
    --runtime-version 20 `
    --functions-version 4 -o none

az functionapp config appsettings set `
    --name $FunctionAppName `
    --resource-group $ResourceGroup `
    --settings `
        "AZURE_SERVICE_BUS_CONNECTION_STRING=$SbConn" `
        "AZURE_QUEUE_NAME=dead-link-tasks" `
        "AZURE_COSMOS_ENDPOINT=$CosmosEndpoint" `
        "AZURE_COSMOS_KEY=$CosmosKey" `
        "AZURE_DATABASE_NAME=webhealth-db" `
        "APPLICATIONINSIGHTS_CONNECTION_STRING=$AppInsightsConn" -o none

Write-Host "  -> Azure Function App provisioned: $FunctionAppName" -ForegroundColor Gray

# 7. Provision Azure App Service (API & Frontend Host)
Write-Host "[7/8] Provisioning Azure App Service Plan & Web App..." -ForegroundColor Green
$AppPlanName = "plan-webhealth-$Suffix"
az appservice plan create `
    --name $AppPlanName `
    --resource-group $ResourceGroup `
    --location $Location `
    --is-linux `
    --sku B1 -o none

$WebAppName = "webhealth-app-$Suffix"
az webapp create `
    --name $WebAppName `
    --plan $AppPlanName `
    --resource-group $ResourceGroup `
    --runtime "NODE:20-lts" -o none

az webapp config appsettings set `
    --name $WebAppName `
    --resource-group $ResourceGroup `
    --settings `
        "PORT=8080" `
        "NODE_ENV=production" `
        "AZURE_SERVICE_BUS_CONNECTION_STRING=$SbConn" `
        "AZURE_QUEUE_NAME=dead-link-tasks" `
        "AZURE_COSMOS_ENDPOINT=$CosmosEndpoint" `
        "AZURE_COSMOS_KEY=$CosmosKey" `
        "AZURE_DATABASE_NAME=webhealth-db" `
        "APPLICATIONINSIGHTS_CONNECTION_STRING=$AppInsightsConn" `
        "KEY_VAULT_NAME=$KvName" -o none

$AppUrl = (az webapp show --name $WebAppName --resource-group $ResourceGroup --query "defaultHostName" -o tsv)

# 8. Summary Output
Write-Host "`n==========================================================================" -ForegroundColor Green
Write-Host "   AZURE CLOUD INFRASTRUCTURE DEPLOYMENT COMPLETE!                        " -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host " Resource Group:         $ResourceGroup" -ForegroundColor Cyan
Write-Host " App Service (API/UI):   https://$AppUrl" -ForegroundColor Yellow
Write-Host " Function App (Workers): https://$FunctionAppName.azurewebsites.net" -ForegroundColor Cyan
Write-Host " Service Bus Queue:      $SbNamespace / dead-link-tasks" -ForegroundColor Cyan
Write-Host " Cosmos DB (NoSQL):      $CosmosEndpoint (DB: webhealth-db)" -ForegroundColor Cyan
Write-Host " Application Insights:   $AppInsightsName" -ForegroundColor Cyan
Write-Host " Key Vault:              $KvName" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Green
