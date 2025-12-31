// LLM Score Engine - OpenAI Integration (GPT-5 compatible)
// - Score-only output (JSON)
// - Rubric-conditioned scoring for X(Ease) / Y(Impact)
// - No temperature/top_p/etc. (GPT-5 does not use them)
// - Uses max_completion_tokens instead of max_tokens

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
  const context = taskDescription || 'No additional context';

  return `Task:
${taskName}

Context:
${context}

Scoring Rubric:

Ease of Implementation (X):
1 = ${rubric.X['1']}
2 = ${rubric.X['2']}
3 = ${rubric.X['3']}
4 = ${rubric.X['4']}
5 = ${rubric.X['5']}

Impact of Implementation (Y):
1 = ${rubric.Y['1']}
2 = ${rubric.Y['2']}
3 = ${rubric.Y['3']}
4 = ${rubric.Y['4']}
5 = ${rubric.Y['5']}

Instructions:
- Assign exactly one integer score (1-5) for X and Y.
- Select the score whose definition best matches the task.
- Output JSON only. Example: {"X": 3, "Y": 4}`;
}

export interface LLMConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string; // default: gpt-5
}

/**
 * Scores a single task using GPT-5 (Chat Completions API).
 * Returns only numeric scores: { X: 1..5, Y: 1..5 }
 */
export async function scoreTask(
  config: LLMConfig,
  taskName: string,
  taskDescription: string | undefined,
  rubric: Rubric,
  retryCount: number = 0
): Promise<ScoreResponse> {
  const userPrompt = buildUserPrompt(taskName, taskDescription, rubric);

  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  const model = config.model || 'gpt-5';
  const apiUrl = `${baseUrl}/chat/completions`;

  console.log('');
  console.log('='.repeat(60));
  console.log(`[LLM] Starting LLM Score Request`);
  console.log('='.repeat(60));
  console.log(`[LLM] Task Name: "${taskName}"`);
  console.log(`[LLM] Description: "${taskDescription || 'None'}"`);
  console.log(`[LLM] Model: ${model}`);
  console.log(`[LLM] API URL: ${apiUrl}`);
  console.log(`[LLM] API Key: ${config.apiKey ? config.apiKey.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log(`[LLM] Retry Count: ${retryCount}`);
  console.log('-'.repeat(60));

  // GPT-5: use max_completion_tokens (NOT max_tokens)
  const requestBody = {
    model,
    messages: [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      { role: 'user' as const, content: userPrompt }
    ],
    max_completion_tokens: 4000,

    // Enforce JSON-only output
    response_format: { type: 'json_object' as const }
  };

  console.log(`[LLM] Request Body (messages truncated):`);
  console.log(`[LLM]    - model: ${requestBody.model}`);
  console.log(`[LLM]    - max_completion_tokens: ${requestBody.max_completion_tokens}`);

  try {
    const startTime = Date.now();
    console.log(`[LLM] Sending request to OpenAI API...`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const elapsed = Date.now() - startTime;
    console.log(`[LLM] Response received in ${elapsed}ms`);
    console.log(`[LLM] HTTP Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[LLM] API Error Response:`);
      console.log(`[LLM]    ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as {
      id?: string;
      model?: string;
      choices: Array<{
        message: { content: string };
        finish_reason?: string;
      }>;
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };

    console.log(`[LLM] API Response Success!`);
    console.log(`[LLM] Response ID: ${data.id || 'N/A'}`);
    console.log(`[LLM] Response Model: ${data.model || 'N/A'}`);

    if (data.usage) {
      console.log(`[LLM] Token Usage:`);
      console.log(`[LLM]    - Prompt: ${data.usage.prompt_tokens}`);
      console.log(`[LLM]    - Completion: ${data.usage.completion_tokens}`);
      console.log(`[LLM]    - Total: ${data.usage.total_tokens}`);
    }

    const content = data.choices?.[0]?.message?.content;
    const finishReason = data.choices?.[0]?.finish_reason;

    console.log(`[LLM] Finish Reason: ${finishReason || 'N/A'}`);
    console.log(`[LLM] Raw Content: ${content}`);

    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    let parsed: { X?: unknown; Y?: unknown };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(`Invalid JSON returned by model: ${content}`);
    }

    const normalized = {
      // accept numeric strings just in case, but enforce integers after coercion
      X: typeof parsed.X === 'string' ? Number(parsed.X) : (parsed.X as number),
      Y: typeof parsed.Y === 'string' ? Number(parsed.Y) : (parsed.Y as number)
    };

    console.log(`[LLM] Parsed JSON: ${JSON.stringify(normalized)}`);

    if (!validateScore(normalized)) {
      console.log(`[LLM] Invalid score format!`);
      console.log(`[LLM]    X type: ${typeof normalized.X}, value: ${String(normalized.X)}`);
      console.log(`[LLM]    Y type: ${typeof normalized.Y}, value: ${String(normalized.Y)}`);
      throw new Error('Invalid score format');
    }

    console.log('='.repeat(60));
    console.log(`[LLM] FINAL SCORE: X=${normalized.X}, Y=${normalized.Y}`);
    console.log('='.repeat(60));
    console.log('');

    return { X: normalized.X, Y: normalized.Y };
  } catch (error) {
    console.log(`[LLM] Error occurred: ${(error as Error).message}`);

    // Retry once on failure
    if (retryCount < 1) {
      console.log(`[LLM] Retrying (attempt ${retryCount + 2})...`);
      return scoreTask(config, taskName, taskDescription, rubric, retryCount + 1);
    }

    console.log(`[LLM] Max retries exceeded. Giving up.`);
    throw error;
  }
}

function validateScore(score: { X?: number; Y?: number }): score is { X: number; Y: number } {
  if (typeof score.X !== 'number' || typeof score.Y !== 'number') return false;
  if (!Number.isFinite(score.X) || !Number.isFinite(score.Y)) return false;
  if (!Number.isInteger(score.X) || !Number.isInteger(score.Y)) return false;
  if (score.X < 1 || score.X > 5 || score.Y < 1 || score.Y > 5) return false;
  return true;
}

/**
 * Scores tasks sequentially to reduce rate-limit risk.
 * Returns Map(task_id -> ScoreResponse).
 * On failure, stores { X:-1, Y:-1 } for manual input.
 */
export async function scoreTasks(
  config: LLMConfig,
  tasks: Array<{ task_id: string; task_name: string; description?: string }>,
  rubric: Rubric
): Promise<Map<string, ScoreResponse>> {
  const results = new Map<string, ScoreResponse>();

  for (const task of tasks) {
    try {
      const score = await scoreTask(config, task.task_name, task.description, rubric);
      results.set(task.task_id, score);
    } catch (error) {
      console.error(`Failed to score task ${task.task_id}:`, error);
      results.set(task.task_id, { X: -1, Y: -1 });
    }
  }

  return results;
}
