import appInsights from 'applicationinsights';
import config from '../config/index.js';

let appInsightsClient = null;

// Initialize Azure Application Insights if connection string exists
const appInsightsConn = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || config.azure?.appInsights?.connectionString;

if (appInsightsConn) {
  try {
    appInsights
      .setup(appInsightsConn)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(true, true)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(true, true)
      .start();

    appInsightsClient = appInsights.defaultClient;
    console.log('[AZURE:MONITOR] Azure Application Insights initialized and streaming to Log Analytics.');
  } catch (err) {
    console.warn(`[AZURE:MONITOR] Could not initialize Application Insights: ${err.message}`);
  }
}

const memoryLogs = [];
const MAX_MEMORY_LOGS = 200;

function recordLog(severity, component, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    severity,
    component,
    message,
    metadata
  };

  memoryLogs.unshift(logEntry);
  if (memoryLogs.length > MAX_MEMORY_LOGS) {
    memoryLogs.pop();
  }

  // Console output
  const colorPrefix = severity === 'ERROR' ? '\x1b[31m' : severity === 'WARNING' ? '\x1b[33m' : '\x1b[34m';
  const resetColor = '\x1b[0m';
  console.log(`${colorPrefix}[${timestamp}] [${severity}] [AZURE:${component}]${resetColor} ${message}`);

  // Forward to Azure Application Insights & Log Analytics
  if (appInsightsClient) {
    try {
      const customDimensions = {
        component,
        ...metadata
      };

      if (severity === 'ERROR') {
        if (metadata.error instanceof Error) {
          appInsightsClient.trackException({ exception: metadata.error, properties: customDimensions });
        } else {
          appInsightsClient.trackTrace({
            message: `[${component}] ${message}`,
            severity: appInsights.Contracts.SeverityLevel.Error,
            properties: customDimensions
          });
        }
      } else if (severity === 'WARNING') {
        appInsightsClient.trackTrace({
          message: `[${component}] ${message}`,
          severity: appInsights.Contracts.SeverityLevel.Warning,
          properties: customDimensions
        });
      } else {
        appInsightsClient.trackTrace({
          message: `[${component}] ${message}`,
          severity: appInsights.Contracts.SeverityLevel.Information,
          properties: customDimensions
        });
      }
    } catch {
      // Ignore telemetry export exceptions in non-critical flow
    }
  }

  return logEntry;
}

export const logger = {
  info: (component, message, metadata) => recordLog('INFO', component, message, metadata),
  warn: (component, message, metadata) => recordLog('WARNING', component, message, metadata),
  error: (component, message, metadata) => recordLog('ERROR', component, message, metadata),
  debug: (component, message, metadata) => recordLog('DEBUG', component, message, metadata),
  getRecentLogs: () => [...memoryLogs],
  isAppInsightsConnected: () => !!appInsightsClient
};

export default logger;
