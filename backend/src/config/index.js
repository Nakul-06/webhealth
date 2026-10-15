import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT || 8080;
const isProduction = process.env.NODE_ENV === 'production';

// Detect Azure environment variables
const azureSbConnection = process.env.AZURE_SERVICE_BUS_CONNECTION_STRING || null;
const azureCosmosEndpoint = process.env.AZURE_COSMOS_ENDPOINT || null;
const azureCosmosKey = process.env.AZURE_COSMOS_KEY || null;

const useMockAzure = process.env.USE_MOCK_AZURE === 'true' || (!azureSbConnection && !azureCosmosEndpoint);

export const config = {
  port,
  env: process.env.NODE_ENV || 'development',
  azure: {
    useMock: useMockAzure,
    resourceGroup: process.env.AZURE_RESOURCE_GROUP || 'rg-webhealth',
    location: process.env.AZURE_LOCATION || 'eastus',
    serviceBus: {
      connectionString: azureSbConnection,
      queueName: process.env.AZURE_QUEUE_NAME || 'dead-link-tasks'
    },
    cosmosDb: {
      endpoint: azureCosmosEndpoint,
      key: azureCosmosKey,
      databaseName: process.env.AZURE_DATABASE_NAME || 'webhealth-db',
      scansContainer: 'scans',
      linksContainer: 'links'
    },
    appInsights: {
      connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || null
    }
  },
  crawler: {
    defaultMaxLinks: parseInt(process.env.MAX_LINKS || '50', 10),
    defaultMaxDepth: parseInt(process.env.MAX_DEPTH || '2', 10),
    requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '10000', 10),
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 WebHealth/2.0'
  }
};

export default config;
