import 'dotenv/config';
import './config/env'; // Validates env vars — will exit(1) if invalid
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { setupSwagger } from './config/swagger';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import catalogRoutes from './modules/catalog/catalog.routes';
import sellerRoutes from './modules/seller/seller.routes';
import discoveryRoutes from './modules/discovery/discovery.routes';
import commerceRoutes from './modules/commerce/commerce.routes';
import auctionsRoutes from './modules/auctions/auctions.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import adminRoutes from './modules/admin/admin.routes';
import aiRoutes from './modules/ai/ai.routes';

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  env.CORS_ORIGIN,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'https://auctionfrontend-gamma.vercel.app',
];

// ─── Socket.IO ───────────────────────────────────────────────────────────────
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  // Join auction room for public broadcasts
  socket.on('join:auction', (auctionId: string) => {
    socket.join(`auction:${auctionId}`);
  });

  socket.on('leave:auction', (auctionId: string) => {
    socket.leave(`auction:${auctionId}`);
  });

  // Join user room for private notifications (outbid, winning, deposit refunds)
  socket.on('join:user', (userId: string) => {
    socket.join(`user:${userId}`);
  });

  socket.on('disconnect', () => {
    // disconnected
  });
});

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: env.NODE_ENV });
});

// ─── Swagger Documentation ──────────────────────────────────────────────────
setupSwagger(app);

// ─── API Routes ───────────────────────────────────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, usersRoutes);
app.use(`${API}/catalog`, catalogRoutes);
app.use(`${API}/seller`, sellerRoutes);
app.use(`${API}/discovery`, discoveryRoutes);
app.use(`${API}/commerce`, commerceRoutes);
app.use(`${API}/auctions`, auctionsRoutes);
app.use(`${API}/payments`, paymentsRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/ai`, aiRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Route not found' });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

export { app, httpServer };
