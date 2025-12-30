import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Rubric, TaskWithScores } from './types';
import { parseExcel, createSampleTemplate } from './utils/excel';
import { scoreTask, LLMConfig } from './utils/llm';
import { getIndexHtml } from './views/index';

// Environment type for Node.js
type Env = {
  Bindings: {
    OPENAI_API_KEY?: string;
    OPENAI_BASE_URL?: string;
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

// Helper function to get LLM config
function getLLMConfig(): LLMConfig | null {
  const apiKey = process.env.OPENAI_API_KEY;
  
  console.log('');
  console.log('[Config] ========== LLM Configuration ==========');
  console.log(`[Config] OPENAI_API_KEY: ${apiKey ? apiKey.substring(0, 15) + '...' : 'NOT SET ❌'}`);
  console.log(`[Config] OPENAI_BASE_URL: ${process.env.OPENAI_BASE_URL || 'NOT SET (will use default)'}`);
  console.log(`[Config] OPENAI_MODEL: ${process.env.OPENAI_MODEL || 'NOT SET (will use gpt-4o)'}`);
  console.log('[Config] ==========================================');
  
  if (!apiKey) {
    console.error('[Config] ❌ OPENAI_API_KEY not found in environment!');
    return null;
  }
  
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  
  console.log(`[Config] ✅ LLM Config Ready - Base URL: ${baseUrl}, Model: ${model}`);
  
  return {
    apiKey,
    baseUrl,
    model
  };
}

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
    
    console.log('');
    console.log('[API] ########## NEW SCORING REQUEST ##########');
    console.log(`[API] Task ID: ${taskId}`);
    console.log(`[API] Task Name: "${taskName}"`);
    console.log(`[API] Task Description: "${taskDescription || 'None'}"`);
    console.log(`[API] Rubric X keys: ${Object.keys(rubric.X).join(', ')}`);
    console.log(`[API] Rubric Y keys: ${Object.keys(rubric.Y).join(', ')}`);
    console.log('[API] ###########################################');
    
    // Get LLM config from environment
    const config = getLLMConfig();
    if (!config) {
      console.error('[API] ❌ LLM config not available - returning default scores');
      return c.json({ X: -1, Y: -1, error: 'API key not configured' });
    }

    console.log('[API] ✅ LLM Config obtained, calling scoreTask...');
    
    const score = await scoreTask(config, taskName, taskDescription, rubric);
    
    console.log('[API] ✅ scoreTask completed successfully');
    console.log(`[API] 🎯 Final Score: X=${score.X}, Y=${score.Y}`);
    
    return c.json(score);
  } catch (error) {
    console.error('[API] ❌ Score error:', error);
    return c.json({ X: -1, Y: -1, error: (error as Error).message });
  }
});

// API: Health check
app.get('/api/health', (c) => {
  const hasApiKey = !!process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  
  console.log('[Health] Health check requested');
  console.log(`[Health] API Key: ${hasApiKey ? 'SET ✅' : 'NOT SET ❌'}`);
  console.log(`[Health] Base URL: ${baseUrl}`);
  console.log(`[Health] Model: ${model}`);
  
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    hasApiKey,
    baseUrl: hasApiKey ? baseUrl : undefined,
    model: hasApiKey ? model : undefined
  });
});

// API: Test LLM connection
app.get('/api/test-llm', async (c) => {
  console.log('[Test] Testing LLM connection...');
  
  const config = getLLMConfig();
  if (!config) {
    return c.json({ success: false, error: 'API key not configured' });
  }
  
  try {
    const testRubric: Rubric = {
      X: {
        "1": "Very difficult",
        "2": "Difficult", 
        "3": "Moderate",
        "4": "Easy",
        "5": "Very easy"
      },
      Y: {
        "1": "Minimal impact",
        "2": "Low impact",
        "3": "Moderate impact", 
        "4": "High impact",
        "5": "Transformative"
      }
    };
    
    const score = await scoreTask(config, "Test Task - Build a simple website", "A basic HTML/CSS website", testRubric);
    
    return c.json({ 
      success: true, 
      message: 'LLM connection successful!',
      testScore: score 
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

export default app;
