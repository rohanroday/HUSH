import express from 'express';
import morgan from 'morgan';
import authRouter from '../routes/auth.route.js';
import productRouter from '../routes/product.route.js';
import cartRouter from '../routes/cart.route.js';
import orderRouter from '../routes/order.route.js';

const app = express();
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', authRouter);
app.use('/api/products', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);

// Express 5 forwards async errors here; answer with JSON instead of an HTML page
app.use((err, req, res, next) => {
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}` });
  }
  if (err instanceof SyntaxError && err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON body' });
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong' });
});

export default app;