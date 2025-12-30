// LLM Score Engine - OpenAI Integration
import { Rubric, ScoreResponse } from '../types';

const SYSTEM_PROMPT = `You are a scoring engine.
You strictly apply the provided scoring definitions.
You do not explain or justify scores.
You output only integer values.`;

function buildUserPrompt(
  taskName: string,
  taskDescription: string | undefined,
  rubric: Rubric
): string {
  const context = taskDescription || "No additional context";
  
  return `Task:
${taskName}

Context:
${context}

Scoring Rubric:

Ease of Implementation (X):
1 = ${rubric.X["1"]}
2 = ${rubric.X["2"]}
3 = ${rubric.X["3"]}
4 = ${rubric.X["4"]}
5 = ${rubric.X["5"]}

Impact of Implementation (Y):
1 = ${rubric.Y["1"]}
2 = ${rubric.Y["2"]}
3 = ${rubric.Y["3"]}
4 = ${rubric.Y["4"]}
5 = ${rubric.Y["5"]}

Instructions:
- Assign exactly one integer score (1-5) for X and Y.
- Select the score whose definition best matches the task.
- Output JSON only. Example: {"X": 3, "Y": 4}`;
}

export interface LLMConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export async function scoreTask(
  config: LLMConfig,
  taskName: string,
  taskDescription: string | undefined,
  rubric: Rubric,
  retryCount: number = 0
): Promise<ScoreResponse> {
  const userPrompt = buildUserPrompt(taskName, taskDescription, rubric);
  
  // Use custom base URL if provided, otherwise default to OpenAI
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  const model = config.model || 'gpt-4o';
  
  console.log(`[LLM] Scoring task: "${taskName}" using model: ${model}`);
  console.log(`[LLM] Base URL: ${baseUrl}`);
  
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 50,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[LLM] API error: ${response.status} - ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as {
      choices: Array<{
        message: {
          content: string;
        };
      }>;
    };
    
    const content = data.choices[0]?.message?.content;
    console.log(`[LLM] Response content: ${content}`);
    
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(content) as { X?: number; Y?: number };
    
    // Validate response
    if (!validateScore(parsed)) {
      console.error(`[LLM] Invalid score format: ${JSON.stringify(parsed)}`);
      throw new Error('Invalid score format');
    }

    console.log(`[LLM] Score result: X=${parsed.X}, Y=${parsed.Y}`);
    
    return {
      X: parsed.X!,
      Y: parsed.Y!
    };
  } catch (error) {
    console.error(`[LLM] Error scoring task "${taskName}":`, error);
    
    // Retry once on failure
    if (retryCount < 1) {
      console.log(`[LLM] Retrying score for task: ${taskName}`);
      return scoreTask(config, taskName, taskDescription, rubric, retryCount + 1);
    }
    throw error;
  }
}

function validateScore(score: { X?: number; Y?: number }): boolean {
  if (typeof score.X !== 'number' || typeof score.Y !== 'number') {
    return false;
  }
  if (!Number.isInteger(score.X) || !Number.isInteger(score.Y)) {
    return false;
  }
  if (score.X < 1 || score.X > 5 || score.Y < 1 || score.Y > 5) {
    return false;
  }
  return true;
}

export async function scoreTasks(
  config: LLMConfig,
  tasks: Array<{ task_id: string; task_name: string; description?: string }>,
  rubric: Rubric
): Promise<Map<string, ScoreResponse>> {
  const results = new Map<string, ScoreResponse>();
  
  // Process tasks sequentially to avoid rate limiting
  for (const task of tasks) {
    try {
      const score = await scoreTask(config, task.task_name, task.description, rubric);
      results.set(task.task_id, score);
    } catch (error) {
      console.error(`Failed to score task ${task.task_id}:`, error);
      // Mark as needing manual input
      results.set(task.task_id, { X: -1, Y: -1 });
    }
  }
  
  return results;
}
