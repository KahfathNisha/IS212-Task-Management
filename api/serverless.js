// Vercel Serverless Function Entry Point
// This wraps the Express app for Vercel deployment

const app = require('../backend/src/server.js');

// Export as Vercel serverless function
module.exports = (req, res) => {
  // Vercel sets VERCEL=1 automatically
  process.env.VERCEL = '1';
  return app(req, res);
};

