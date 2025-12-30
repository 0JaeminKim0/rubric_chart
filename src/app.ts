import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Rubric, TaskWithScores, ScoreResponse } from './types';
import { parseExcel, createSampleTemplate } from './utils/excel';
import { scoreTask } from './utils/llm';
import { getIndexHtml } from './views/index';

// Environment type for Node.js
type Env = {
  Bindings: {
    OPENAI_API_KEY?: string;
  };
};

const app = new Hono<Env>();

// Enable CORS
app.use('/api/*', cors());

// In-memory session storage
const sessions = new Map<string, {
  rubric: Rubric;
  tasks: TaskWithScores[];
  created_at: string;
}>();

// Serve main application page
app.get('/', (c) => {
  return c.html(getIndexHtml());
});

// API: Parse Excel file
app.post('/api/parse-excel', async (c) => {
  try {
    const buffer = await c.req.arrayBuffer();
    const result = parseExcel(buffer);
    return c.json(result);
  } catch (error) {
    console.error('Parse Excel error:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to parse Excel file' 
    }, 500);
  }
});

// API: Download template
app.get('/api/template', (c) => {
  const template = createSampleTemplate();
  return new Response(template, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="task_template.xlsx"'
    }
  });
});

// API: Score a task using LLM
app.post('/api/score', async (c) => {
  try {
    const { taskId, taskName, taskDescription, rubric } = await c.req.json();
    
    // Get API key from environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured');
      return c.json({ X: -1, Y: -1, error: 'API key not configured' });
    }

    const score = await scoreTask(apiKey, taskName, taskDescription, rubric);
    return c.json(score);
  } catch (error) {
    console.error('Score error:', error);
    return c.json({ X: -1, Y: -1, error: (error as Error).message });
  }
});

// API: Health check
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    hasApiKey: !!process.env.OPENAI_API_KEY
  });
});

export default app;
