/**
 * Namecheap cPanel Node.js Application Startup File
 * 
 * This file acts as the main entry point for the Phusion Passenger server
 * used by Namecheap. It sets the environment to production and loads
 * the pre-compiled server bundle.
 */

// Force production environment
process.env.NODE_ENV = 'production';

// Load the compiled server bundle
require('./dist/server.cjs');
