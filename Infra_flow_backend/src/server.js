import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import net from 'net';

import connectDB from '../config/db.js';
import authRoutes from '../routes/auth.routes.js';
import complaintRoutes from '../routes/complaint.routes.js';
import adminRoutes from '../routes/admin.routes.js';
import workerRoutes from '../routes/worker.routes.js';
import studentRoutes from '../routes/student.routes.js';
import { initSocket } from '../utils/socket.js';
import { startMaintenanceCron } from '../jobs/maintenance.job.js';
import { seedDemoWorkerAccount } from '../services/seedDemoWorker.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const httpServer = createServer(app);

// Middleware
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  process.env.SOCKET_ORIGIN,
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const isConfiguredOrigin = allowedOrigins.includes(origin);
    const isLocalhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

    if (isConfiguredOrigin || isLocalhostOrigin) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

initSocket(httpServer);

// Routes
app.use('/auth', authRoutes);
app.use('/complaints', complaintRoutes);
app.use('/admin', adminRoutes);
app.use('/worker', workerRoutes);
app.use('/student', studentRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'InfraFlow API is running' });
});

const PORT = Number(process.env.PORT) || 5000;
const MAX_PORT_ATTEMPTS = 10;
const ALLOW_PORT_FALLBACK = process.env.ALLOW_PORT_FALLBACK === 'true';

const listenOnPort = (port) =>
  new Promise((resolve, reject) => {
    const handleListening = () => {
      httpServer.off('error', handleError);
      resolve(port);
    };

    const handleError = (error) => {
      httpServer.off('listening', handleListening);
      reject(error);
    };

    httpServer.once('listening', handleListening);
    httpServer.once('error', handleError);
    httpServer.listen(port);
  });

const startServer = async () => {
  await connectDB();
  await seedDemoWorkerAccount();

  if (!ALLOW_PORT_FALLBACK) {
    try {
      await new Promise((resolve, reject) => {
        const tester = net
          .createServer()
          .once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
              // eslint-disable-next-line no-console
              console.error(`Port ${PORT} is already in use. Stop existing node processes before starting a new backend instance.`);
            }
            reject(err);
          })
          .once('listening', () => tester.close(resolve))
          .listen(PORT);
      });
      await listenOnPort(PORT);
      startMaintenanceCron();
      // eslint-disable-next-line no-console
      console.log(`Server started on port ${PORT}`);
      return;
    } catch (error) {
      if (error.code === 'EADDRINUSE') {
        // eslint-disable-next-line no-console
        console.error(`Port ${PORT} is already in use. Stop existing node processes before starting a new backend instance.`);
      }
      throw error;
    }
  }

  for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt += 1) {
    const targetPort = PORT + attempt;

    try {
      await listenOnPort(targetPort);
      startMaintenanceCron();
      // eslint-disable-next-line no-console
      console.log(`Server started on port ${targetPort}`);
      return;
    } catch (error) {
      if (error.code === 'EADDRINUSE' && attempt < MAX_PORT_ATTEMPTS - 1) {
        // eslint-disable-next-line no-console
        console.warn(`Port ${targetPort} in use, trying ${targetPort + 1}...`);
        continue;
      }

      throw error;
    }
  }
};

startServer().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Server startup failed:', error.message);
  process.exit(1);
});
