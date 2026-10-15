import config from '../config/index.js';

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

  const colorPrefix = severity === 'ERROR' ? '\x1b[31m' : severity === 'WARNING' ? '\x1b[33m' : '\x1b[34m';
  const resetColor = '\x1b[0m';
  console.log(`${colorPrefix}[${timestamp}] [${severity}] [AZURE:${component}]${resetColor} ${message}`);

  return logEntry;
}

export const logger = {
  info: (component, message, metadata) => recordLog('INFO', component, message, metadata),
  warn: (component, message, metadata) => recordLog('WARNING', component, message, metadata),
  error: (component, message, metadata) => recordLog('ERROR', component, message, metadata),
  debug: (component, message, metadata) => recordLog('DEBUG', component, message, metadata),
  getRecentLogs: () => [...memoryLogs]
};

export default logger;
