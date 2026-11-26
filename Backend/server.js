import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './src/config/index.js';
import { connectDB } from './src/config/db.js';
import { initSocket } from './src/socket.js';
import { recoverSessions } from './src/services/sessions.js';
import publicRoutes from './src/routes/public.js';
import authRoutes from './src/routes/auth.js';
import userRoutes from './src/routes/user.js';
import astrologerRoutes from './src/routes/astrologer.js';
import adminRoutes from './src/routes/admin.js';
import adminPanelRoutes from './src/routes/adminPanel.js';
import { UPLOAD_DIR } from './src/services/uploads.js';
import { appGate } from './src/services/system.js';

const app = express();
const server = http.createServer(app);
app.set('io', initSocket(server));

app.use(helmet());
app.use(cors({ origin: config.env === 'production' ? config.frontendUrl.split(',') : true, credentials: true }));
// Admin image uploads arrive as base64 JSON, so that one route gets a larger body limit.
app.use('/api/admin/upload', express.json({ limit: '6mb' }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', (_q, res, next) => { res.set('Cross-Origin-Resource-Policy', 'cross-origin'); next(); }, express.static(UPLOAD_DIR, { maxAge: '7d', fallthrough: false }));
if (config.env !== 'test') app.use(morgan('dev'));

app.get('/api/health', (_q, res) => res.json({ ok: true }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60e3, limit: 60 }), authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/user', appGate('user'), userRoutes);
app.use('/api/astrologer', appGate('astrologer'), astrologerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminPanelRoutes);

app.use((_q, res) => res.status(404).json({ message: 'Not found' }));
app.use((err, _q, res, _n) => {
  console.error(err);
  const status = err.name === 'CastError' || err.name === 'ValidationError' ? 400 : err.status || 500;
  res.status(status).json({ message: status === 500 ? 'Something went wrong' : err.message });
});

await connectDB();
await recoverSessions();
server.listen(config.port, () => console.log(`[api] http://localhost:${config.port}`));
