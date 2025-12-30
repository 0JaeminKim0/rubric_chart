// Task Scoring System Type Definitions

export interface Task {
  task_id: string;
  task_name: string;
  description?: string;
}

export interface LLMScore {
  task_id: string;
  x_score_llm: number;
  y_score_llm: number;
  model_version: string;
  created_at: string;
}

export interface FinalScore {
  task_id: string;
  x_score_final: number;
  y_score_final: number;
  human_override: boolean;
  updated_at: string;
}

export interface TaskWithScores extends Task {
  x_score_llm?: number;
  y_score_llm?: number;
  x_score_final: number;
  y_score_final: number;
  human_override: boolean;
}

export interface Rubric {
  X: {
    "1": string;
    "2": string;
    "3": string;
    "4": string;
    "5": string;
  };
  Y: {
    "1": string;
    "2": string;
    "3": string;
    "4": string;
    "5": string;
  };
}

export interface ScoreRequest {
  taskId: string;
  taskName: string;
  taskDescription?: string;
  rubric: Rubric;
}

export interface ScoreResponse {
  X: number;
  Y: number;
}

export interface Session {
  session_id: string;
  rubric: Rubric;
  tasks: TaskWithScores[];
  created_at: string;
  updated_at: string;
}

// Cloudflare Environment Bindings
export interface Env {
  OPENAI_API_KEY: string;
  DB?: D1Database;
}
