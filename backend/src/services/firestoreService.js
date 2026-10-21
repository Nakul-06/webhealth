// Re-export cosmosService for backward compatibility with existing imports
import cosmosService from './cosmosService.js';
export { cosmosService as default, cosmosService as databaseService };
