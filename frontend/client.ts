// API Client for Express Backend - Manually written to replace Encore client

// Re-export everything from the new client
export * from './client-new.js';
import client from './client-new.js';
export default client;