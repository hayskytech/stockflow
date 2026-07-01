import pino from 'pino';
import { ENV } from '../config/env.js';

export const logger = pino(
  ENV.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : {},
);
