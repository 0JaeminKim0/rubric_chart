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
- Output JSON only.`;
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

  // ✅ Default model changed to GPT-5
  // (Optionally, you can use "gpt-5-chat-latest" if you prefer the chat snapshot family.)
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

  // ✅ Strongly typed JSON schema to guarantee {"X": int(1..5), "Y": int(1..5)}
  const scoreSchema = {
    name: "score_response",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        X: { type: "integer", minimum: 1, maximum: 5 },
        Y: { type: "integer", minimum: 1, maximum: 5 }
      },
      required: ["X", "Y"]
    }
  } as const;

  const requestBody = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.0,
    max_tokens: 50,

    // ✅ Use Structured Outputs via JSON Schema (more reliable than json_object)
    response_format: {
      type: "json_schema",
      json_schema: scoreSchema
    }
  };

  console.log(`[LLM] Request Body (messages truncated):`);
  console.log(`[LLM]    - model: ${requestBody.model}`);
  console.log(`[LLM]    - temperature: ${requestBody.temperature}`);
  console.log(`[LLM]    - max_tokens: ${requestBody.max_tokens}`);

  try {
    const startTime = Date.now();

    console.log(`[LLM] Sending request to OpenAI API...`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
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

    const data = await response.json() as {
      id?: string;
      model?: string;
      choices: Array<{
        message: {
          content: string;
        };
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

    const content = data.choices[0]?.message?.content;
    const finishReason = data.choices[0]?.finish_reason;

    console.log(`[LLM] Finish Reason: ${finishReason || 'N/A'}`);
    console.log(`[LLM] Raw Content: ${content}`);

    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(content) as { X?: number; Y?: number };

    // Validate response (extra safety)
    if (!validateScore(parsed)) {
      throw new Error('Invalid score format');
    }

    console.log('='.repeat(60));
    console.log(`[LLM] FINAL SCORE: X=${parsed.X}, Y=${parsed.Y}`);
    console.log('='.repeat(60));
    console.log('');

    return { X: parsed.X!, Y: parsed.Y! };
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

function validateScore(score: { X?: number; Y?: number }): boolean {
  if (typeof score.X !== 'number' || typeof score.Y !== 'number') return false;
  if (!Number.isInteger(score.X) || !Number.isInteger(score.Y)) return false;
  if (score.X < 1 || score.X > 5 || score.Y < 1 || score.Y > 5) return false;
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
