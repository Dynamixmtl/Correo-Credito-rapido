# deploy.ps1 - Deploiement complet sur Azure
# Prerequis: Azure CLI installe (az), Node.js 22+
# Usage: .\scripts\deploy.ps1 -EmailPassword "xxx" -ApiSecretKey "yyy"

param(
    [Parameter(Mandatory=$true)]
    [string]$EmailPassword,

    [Parameter(Mandatory=$true)]
    [string]$ApiSecretKey,

    [string]$ResourceGroup = "rg-creditrapide",
    [string]$AppName       = "creditrapide",
    [string]$Location      = "canadacentral"
)

$ErrorActionPreference = "Stop"

Write-Host "=== CreditRapide - Deploiement Azure ===" -ForegroundColor Cyan

# 1. Connexion Azure (si pas deja connecte)
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Connexion a Azure..." -ForegroundColor Yellow
    az login
}
Write-Host "Compte: $($account.user.name)" -ForegroundColor Green

# 2. Groupe de ressources
Write-Host "`n[1/5] Groupe de ressources: $ResourceGroup" -ForegroundColor Yellow
az group create --name $ResourceGroup --location $Location | Out-Null
Write-Host "OK" -ForegroundColor Green

# 3. Deploiement Bicep
Write-Host "`n[2/5] Deploiement infrastructure Azure..." -ForegroundColor Yellow
$deployment = az deployment group create `
    --resource-group $ResourceGroup `
    --template-file "infrastructure/main.bicep" `
    --parameters appName=$AppName location=$Location emailPassword=$EmailPassword apiSecretKey=$ApiSecretKey `
    --query "properties.outputs" -o json | ConvertFrom-Json

$appUrl    = $deployment.appUrl.value
$apiEndpoint = $deployment.apiEndpoint.value

Write-Host "App URL: $appUrl" -ForegroundColor Green
Write-Host "API endpoint: $apiEndpoint" -ForegroundColor Green

# 4. Build Next.js
Write-Host "`n[3/5] Build de l'application Next.js..." -ForegroundColor Yellow
$env:NEXT_PUBLIC_APP_URL = $appUrl
npm ci
npm run build
Write-Host "OK" -ForegroundColor Green

# 5. Package et deploiement
Write-Host "`n[4/5] Packaging..." -ForegroundColor Yellow
$zipPath = ".\deploy.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }

# Inclure le dossier standalone produit par next build --output standalone
Compress-Archive -Path ".next\standalone\*", ".next\static", "public" -DestinationPath $zipPath

Write-Host "`n[5/5] Deploiement sur App Service..." -ForegroundColor Yellow
az webapp deploy `
    --resource-group $ResourceGroup `
    --name $AppName `
    --src-path $zipPath `
    --type zip

Write-Host "`n=== Deploiement termine ===" -ForegroundColor Cyan
Write-Host "URL de l'application : $appUrl" -ForegroundColor Green
Write-Host "Endpoint Power Automate : $apiEndpoint" -ForegroundColor Green
Write-Host "Cle API a configurer dans Power Automate : $ApiSecretKey" -ForegroundColor Yellow
