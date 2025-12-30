import 'dotenv/config';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import app from './app';

// Serve static files from public directory
app.use('/static/*', serveStatic({ root: './public' }));

const port = parseInt(process.env.PORT || '3000', 10);

console.log(`🚀 Server starting on port ${port}...`);
console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Set' : 'Not set'}`);
console.log(`🌐 OpenAI Base URL: ${process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'}`);

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`✅ Server is running on http://localhost:${info.port}`);
  console.log(`📊 Task Scoring System ready!`);
});
