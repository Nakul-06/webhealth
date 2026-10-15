# Microsoft Azure Deployment Script
# Project: Cloud-Based Dead Link Detection and Website Health Monitoring System

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "rg-webhealth",
    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus",
    [Parameter(Mandatory=$false)]
    [string]$AppName = "webhealth-app-" + (Get-Random -Minimum 1000 -Maximum 9999)
)

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  DEPLOYING TO MICROSOFT AZURE: $AppName ($Location)            " -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Check if Azure CLI (az) is installed
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "[NOTE] Azure CLI ('az') is not installed yet." -ForegroundColor Yellow
    Write-Host "You can install Azure CLI from: https://aka.ms/installazurecliwindows" -ForegroundColor Cyan
    Write-Host "Or deploy directly from GitHub or Azure Portal." -ForegroundColor Cyan
    exit 1
}

Write-Host "[1/4] Ensuring Resource Group exists: $ResourceGroup..." -ForegroundColor Green
az group create --name $ResourceGroup --location $Location

Write-Host "[2/4] Creating Azure Service Bus Queue for link tasks..." -ForegroundColor Green
$SbNamespace = "sb-webhealth-" + (Get-Random -Minimum 1000 -Maximum 9999)
az servicebus namespace create --resource-group $ResourceGroup --name $SbNamespace --location $Location --sku Basic
az servicebus queue create --resource-group $ResourceGroup --namespace-name $SbNamespace --name dead-link-tasks

Write-Host "[3/4] Creating Azure Container Apps Environment..." -ForegroundColor Green
$EnvName = "env-webhealth"
az containerapp env create --name $EnvName --resource-group $ResourceGroup --location $Location

Write-Host "[4/4] Deploying Container App: $AppName..." -ForegroundColor Green
az containerapp up `
    --name $AppName `
    --resource-group $ResourceGroup `
    --location $Location `
    --environment $EnvName `
    --source . `
    --ingress external `
    --target-port 8080

$AppUrl = (az containerapp show --name $AppName --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv)

Write-Host "`n================================================================" -ForegroundColor Green
Write-Host "  AZURE DEPLOYMENT COMPLETE!                                    " -ForegroundColor Green
Write-Host "  Live URL: https://$AppUrl                                     " -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Green
