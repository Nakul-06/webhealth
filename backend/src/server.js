import app from './app.js';
import config from './config/index.js';
import logger from './services/logger.js';

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log('================================================================');
  console.log('  🌐 CLOUD-BASED DEAD LINK DETECTION & HEALTH MONITORING SYSTEM  ');
  console.log('               Microsoft Azure Implementation                   ');
  console.log('================================================================');
  console.log(`  🚀 Service URL:     http://localhost:${PORT}`);
  console.log(`  ☁️  Cloud Platform: Microsoft Azure`);
  console.log(`  📦 Operating Mode:  ${config.azure.useMock ? 'Local Emulation (Sandbox)' : 'Production Azure'}`);
  console.log(`  📬 Service Bus:     ${config.azure.serviceBus.queueName}`);
  console.log(`  🗄️  Cosmos DB:       ${config.azure.cosmosDb.databaseName}`);
  console.log(`  📊 Azure Monitor:   Application Insights Active`);
  console.log('================================================================\n');

  logger.info('CONTAINER_APPS', `Server successfully started on port ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('CONTAINER_APPS', 'SIGTERM received: shutting down gracefully');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  logger.info('CONTAINER_APPS', 'SIGINT received: exiting');
  server.close(() => process.exit(0));
});
