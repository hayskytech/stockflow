import app from './app.js';
import { ENV } from './config/env.js';
import { logger } from './utils/logger.js';

app.listen(ENV.APP_PORT, () => {
  logger.info(`${ENV.APP_NAME} backend listening on port ${ENV.APP_PORT}`);
});
