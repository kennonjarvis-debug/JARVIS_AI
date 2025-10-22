#!/usr/bin/env tsx
/**
 * Start Jarvis Control Plane
 */

import 'dotenv/config';
import { startServer } from './src/core/gateway.js';

console.log('🚀 Starting Jarvis Control Plane...');
startServer();
