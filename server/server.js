import app from './src/app/app.js';
import {connectDB} from './src/config/db.js';
import config, {assertRequiredConfig} from './src/config/config.js';
import {startPaymentSweeper} from './src/services/checkout.service.js';

assertRequiredConfig();

await connectDB();
startPaymentSweeper();

const server = app.listen(config.PORT, () => {
  console.log(`Server is running on port ${config.PORT}`);
});

// Hosting platforms send SIGTERM on redeploy; finish in-flight requests first.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 10000).unref();
  });
}
