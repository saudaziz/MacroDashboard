param location string = resourceGroup().location
param acrName string = 'macromregistry${uniqueString(resourceGroup().id)}'
param appServicePlanName string = 'plan-macrodashboard'
param backendAppName string = 'macro-api-prod'
param frontendAppName string = 'macro-ui-prod'

// 1. Container Registry (To store Docker images)
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: true }
}

// 2. App Service Plan (Linux - B1 is the recommended entry production tier)
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: appServicePlanName
  location: location
  kind: 'linux'
  sku: { name: 'B1' }
  properties: { reserved: true }
}

// 3. Backend Web App (.NET 10 API)
resource backendApp 'Microsoft.Web/sites@2022-09-01' = {
  name: backendAppName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'DOCKER|${acr.properties.loginServer}/macro-backend:latest'
      appSettings: [
        { name: 'DOCKER_REGISTRY_SERVER_URL', value: 'https://${acr.properties.loginServer}' }
        { name: 'DOCKER_REGISTRY_SERVER_USERNAME', value: acr.listCredentials().username }
        { name: 'DOCKER_REGISTRY_SERVER_PASSWORD', value: acr.listCredentials().passwords[0].value }
        // The following are placeholders that should be managed via KeyVault or App Settings in production
        { name: 'AI__ApiKey', value: 'YOUR_AI_API_KEY' }
        { name: 'Fred__ApiKey', value: 'YOUR_FRED_API_KEY' }
      ]
    }
  }
}

// 4. Frontend Web App (Angular 19 / Nginx)
resource frontendApp 'Microsoft.Web/sites@2022-09-01' = {
  name: frontendAppName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'DOCKER|${acr.properties.loginServer}/macro-frontend:latest'
      appSettings: [
        { name: 'DOCKER_REGISTRY_SERVER_URL', value: 'https://${acr.properties.loginServer}' }
        { name: 'DOCKER_REGISTRY_SERVER_USERNAME', value: acr.listCredentials().username }
        { name: 'DOCKER_REGISTRY_SERVER_PASSWORD', value: acr.listCredentials().passwords[0].value }
      ]
    }
  }
}

output acrLoginServer string = acr.properties.loginServer
output backendUrl string = backendApp.properties.defaultHostName
output frontendUrl string = frontendApp.properties.defaultHostName
