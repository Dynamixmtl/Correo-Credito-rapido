@description('Nom de base pour toutes les ressources')
param appName string = 'creditrapide'

@description('Region Azure (Canada Central pour conformite canadienne)')
param location string = 'canadacentral'

@description('App Service Plan SKU')
@allowed(['B1', 'B2', 'S1'])
param appServiceSku string = 'B1'

@description('Variables d\'environnement secretes - a configurer via Azure Portal apres deploiement')
@secure()
param emailPassword string

@description('Cle API secrete pour Power Automate')
@secure()
param apiSecretKey string

var safeAppName = toLower(replace(replace(appName, '-', ''), '_', ''))
var storageAccountName = take('st${safeAppName}${uniqueString(resourceGroup().id)}', 24)

// ─── Storage Account (Table Storage pour les demandes) ───────────────────────
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

// ─── App Service Plan ─────────────────────────────────────────────────────────
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: 'asp-${appName}'
  location: location
  sku: {
    name: appServiceSku
    tier: appServiceSku == 'B1' || appServiceSku == 'B2' ? 'Basic' : 'Standard'
  }
  properties: {
    reserved: true // Linux
  }
  kind: 'linux'
}

// ─── App Service (Next.js) ────────────────────────────────────────────────────
resource appService 'Microsoft.Web/sites@2023-01-01' = {
  name: appName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      appCommandLine: 'node server.js'
      appSettings: [
        {
          name: 'AZURE_STORAGE_CONNECTION_STRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'
        }
        {
          name: 'EMAIL_FROM'
          value: 'admin@dynamixmtl.com'
        }
        {
          name: 'EMAIL_PASSWORD'
          value: emailPassword
        }
        {
          name: 'NOTIFICATION_RECIPIENT'
          value: 'acostasalcedo.d@csdm.qc.ca'
        }
        {
          name: 'NEXT_PUBLIC_APP_URL'
          value: 'https://${appName}.azurewebsites.net'
        }
        {
          name: 'API_SECRET_KEY'
          value: apiSecretKey
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~22'
        }
      ]
      minTlsVersion: '1.2'
    }
    httpsOnly: true
  }
}

// ─── Outputs ──────────────────────────────────────────────────────────────────
output appUrl string = 'https://${appService.properties.defaultHostName}'
output storageAccountName string = storageAccount.name
output apiEndpoint string = 'https://${appService.properties.defaultHostName}/api/requests'
