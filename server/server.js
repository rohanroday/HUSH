import app from './src/app/app.js';
import {connectDB} from './src/config/db.js';
import config from './src/config/config.js';
import {startPaymentSweeper} from './src/services/checkout.service.js';

if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET) {
  console.warn('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set: checkout will fail');
}

await connectDB();
startPaymentSweeper();

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
