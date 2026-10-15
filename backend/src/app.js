import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import scanRoutes from './routes/scanRoutes.js';
import workerRoutes from './routes/workerRoutes.js';
import logger from './services/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Standard middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cloud Request Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api') || req.path === '/health') {
      logger.info('API_GATEWAY', `${req.method} ${req.originalUrl} [${res.statusCode}] - ${duration}ms`, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: duration,
        ip: req.ip
      });
    }
  });
  next();
});

// Container Liveness / Readiness Health Probe
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'dead-link-detector',
    cloudPlatform: 'Microsoft Azure',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', scanRoutes);
app.use('/api', workerRoutes);

// Serve Frontend Static files if built
const candidatePaths = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(process.cwd(), 'dist'),
  path.resolve(__dirname, '../dist')
];

const clientBuildPath = candidatePaths.find((p) => fs.existsSync(p));

if (clientBuildPath) {
  logger.info('API_GATEWAY', `Serving frontend UI from: ${clientBuildPath}`);
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && req.path !== '/health') {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    }
  });
}

// 404 handler for API
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('API_GATEWAY', `Unhandled Express Error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

export default app;
