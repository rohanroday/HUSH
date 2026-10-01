import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import morgan from 'morgan';
import multer from 'multer';
import config from '../config/config.js';
import authRouter from '../routes/auth.route.js';
import productRouter from '../routes/product.route.js';
import cartRouter from '../routes/cart.route.js';
import orderRouter from '../routes/order.route.js';
import paymentRouter from '../routes/payment.route.js';
import notificationRouter from '../routes/notification.route.js';
import contactRouter from '../routes/contact.route.js';

const app = express();

// behind Render / Railway / Nginx etc. so req.ip is the real client address
app.set('trust proxy', config.TRUST_PROXY);
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// Only needed when the client is served from a different origin than the API.
const allowedOrigins = config.CLIENT_URL.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '100kb' }));
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRouter);
app.use('/api/products', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/contact', contactRouter);

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// When the client has been built (client/dist), serve it from here too so the
// whole shop can be deployed as a single service.
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../client/dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(
    express.static(clientDist, {
      index: false,
      setHeaders(res, filePath) {
        // hashed build assets never change; index.html must always be fresh
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.set('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );
  // client-side routes (/shop, /product/:id, ...) all load the SPA shell
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Express 5 forwards async errors here; answer with JSON instead of an HTML page
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}` });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'That record already exists' });
  }
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: 'Each image must be 5 MB or smaller',
      LIMIT_FILE_COUNT: 'You can upload up to 5 images',
      LIMIT_UNEXPECTED_FILE: 'Too many images, or an unexpected file field',
    };
    return res.status(400).json({ message: messages[err.code] || err.message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body is too large' });
  }
  if (err.status === 400 && err.expose) {
    return res.status(400).json({ message: err.message });
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong' });
});

export default app;
