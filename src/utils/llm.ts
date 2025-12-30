// LLM Score Engine - GPT-5 Integration
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

export async function scoreTask(
  apiKey: string,
  taskName: string,
  taskDescription: string | undefined,
  rubric: Rubric,
  retryCount: number = 0
): Promise<ScoreResponse> {
  const userPrompt = buildUserPrompt(taskName, taskDescription, rubric);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
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
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(content) as { X?: number; Y?: number };
    
    // Validate response
    if (!validateScore(parsed)) {
      throw new Error('Invalid score format');
    }

    return {
      X: parsed.X!,
      Y: parsed.Y!
    };
  } catch (error) {
    // Retry once on failure
    if (retryCount < 1) {
      console.log(`Retrying score for task: ${taskName}`);
      return scoreTask(apiKey, taskName, taskDescription, rubric, retryCount + 1);
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
  apiKey: string,
  tasks: Array<{ task_id: string; task_name: string; description?: string }>,
  rubric: Rubric
): Promise<Map<string, ScoreResponse>> {
  const results = new Map<string, ScoreResponse>();
  
  // Process tasks sequentially to avoid rate limiting
  for (const task of tasks) {
    try {
      const score = await scoreTask(apiKey, task.task_name, task.description, rubric);
      results.set(task.task_id, score);
    } catch (error) {
      console.error(`Failed to score task ${task.task_id}:`, error);
      // Mark as needing manual input
      results.set(task.task_id, { X: -1, Y: -1 });
    }
  }
  
  return results;
}
