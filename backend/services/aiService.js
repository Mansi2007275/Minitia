/**
 * Task generation (optional LLM) + evaluation router.
 *
 * Evaluation (deterministic first):
 * - taskType "code" -> snippet / regex / mock_stdout checks (see verification/codeVerifier.js)
 * - taskType "data" + verificationSpec.validateApiCapture -> HTTP capture JSON checks (apiVerifier.js)
 * - taskType "data" -> JSON / lightweight schema (dataVerifier.js)
 * - taskType "generic" -> LLM fallback only (subjective)
 */
import OpenAI from 'openai';
import { normalizeValidationMethod, validationMethodToTaskType } from './taskSpecBuilder.js';
import { verifyCodeTask } from './verification/codeVerifier.js';
import { verifyDataTask } from './verification/dataVerifier.js';
import { verifyApiTask } from './verification/apiVerifier.js';
import {
  EXAMPLE_CODE_VERIFICATION_SPEC,
  EXAMPLE_DATA_VERIFICATION_SPEC,
  EXAMPLE_API_CAPTURE_SPEC,
} from './verification/presets.js';

const GROQ_BASE_URL =
  (process.env.GROQ_BASE_URL || '').trim() || 'https://api.groq.com/openai/v1';

/** Groq OpenAI-compatible API; returns null when key missing or placeholder. */
const getLlmClient = () => {
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (
    !apiKey ||
    apiKey === 'gsk_your-groq-api-key' ||
    apiKey === 'gsk-dummy-key' ||
    apiKey.startsWith('gsk-placeholder')
  ) {
    return null;
  }
  return new OpenAI({ apiKey, baseURL: GROQ_BASE_URL });
};

/** Strip optional ```json ... ``` fences from model output */
const extractJsonText = (text) => {
  const raw = (text || '').trim();
  const fence = raw.match(/^```(?:json)?\s*([\s\S]*?)```$/im);
  if (fence) return fence[1].trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start !== -1 && end > start) return raw.slice(start, end + 1);
  return raw;
};

const safeJsonParse = (text, fallback) => {
  try {
    return JSON.parse(extractJsonText(text));
  } catch {
    return fallback;
  }
};

function inferProofOfWorkFields(rawText) {
  const text = (rawText || '').trim();
  const lower = text.toLowerCase();
  let validationMethod = 'tests';
  let expectedOutputFormat =
    'Source text, optional GitHub URL, and PoW block with test command output and logs.';
  let successConditions =
    'Automated checks in verificationSpec pass; PoW logs show the run you claim.';

  if (/\bapi\b|\bhttp\b|\bendpoint\b|\brest\b|\bstatus code\b/i.test(text)) {
    validationMethod = 'api_capture';
    expectedOutputFormat =
      'JSON object in submission text: { "status": number, "body": string, "headers": object } documenting the HTTP response.';
    successConditions =
      'Captured status and body satisfy task verificationSpec (expectStatus / expectBodyIncludes / headers).';
  } else if (/\bjson\b|\bschema\b|\bgraphql\b|\bcsv\b.*\bjson\b/i.test(text)) {
    validationMethod = 'json_schema';
    expectedOutputFormat = 'One JSON value in submission text; no prose outside the JSON block.';
    successConditions =
      'JSON validates against task schema rules; required keys and const constraints satisfied.';
  } else if (
    /\b(opinion|subjective|creative writing|why do you think|debate|narrative essay)\b/i.test(text)
  ) {
    validationMethod = 'llm_fallback';
    expectedOutputFormat = 'Natural language response; no fixed machine oracle.';
    successConditions =
      'Secondary model review only (non-deterministic); use only when objective checks are impossible.';
  }

  const suggestedVerificationSpec =
    validationMethod === 'tests'
      ? { ...EXAMPLE_CODE_VERIFICATION_SPEC }
      : validationMethod === 'json_schema'
        ? { ...EXAMPLE_DATA_VERIFICATION_SPEC }
        : validationMethod === 'api_capture'
          ? { ...EXAMPLE_API_CAPTURE_SPEC }
          : {};

  const taskType = validationMethodToTaskType(validationMethod);
  return {
    taskType,
    validationMethod,
    expectedOutputFormat,
    successConditions,
    suggestedVerificationSpec,
  };
}

const mockTaskStructure = (rawDescription) => {
  const text = (rawDescription || '').trim();
  const title = text.slice(0, 60) || 'Objective deliverable';
  const inferred = inferProofOfWorkFields(text);
  return {
    title,
    description: text || 'Verifiable deliverable described by the creator.',
    criteria:
      '1. Match expectedOutputFormat exactly. 2. Satisfy successConditions. 3. Include PoW: test results, logs, and output file references in the submission.',
    ...inferred,
  };
};

const normalizeStructuredTask = (parsed, rawDescription) => {
  const fallback = mockTaskStructure(rawDescription);
  const title = String(parsed?.title || fallback.title).trim().slice(0, 200) || fallback.title;
  const description = String(parsed?.description || fallback.description)
    .trim()
    .slice(0, 8000);
  const criteria = String(parsed?.criteria || fallback.criteria).trim().slice(0, 4000);
  const validationMethod = normalizeValidationMethod(
    parsed?.validationMethod ?? fallback.validationMethod
  );
  const taskType = validationMethodToTaskType(validationMethod);
  const expectedOutputFormat = String(
    parsed?.expectedOutputFormat || fallback.expectedOutputFormat
  )
    .trim()
    .slice(0, 2000);
  const successConditions = String(parsed?.successConditions || fallback.successConditions)
    .trim()
    .slice(0, 4000);
  let suggestedVerificationSpec = fallback.suggestedVerificationSpec;
  if (parsed?.suggestedVerificationSpec && typeof parsed.suggestedVerificationSpec === 'object') {
    suggestedVerificationSpec = parsed.suggestedVerificationSpec;
  }

  return {
    title,
    description,
    criteria,
    taskType,
    validationMethod,
    expectedOutputFormat,
    successConditions,
    suggestedVerificationSpec,
  };
};

const mockLlmEvaluation = () => ({
  score: 85,
  verdict: 'PASS',
  summary: 'LLM fallback (no API key): subjective pass placeholder.',
  proof: {
    engine: 'llm_mock',
    validationLog: ['Groq LLM not configured; using subjective pass placeholder.'],
  },
});

const isAuthOrConfigError = (error) => {
  const code = String(error?.code || '');
  return (
    error?.status === 401 ||
    code === 'invalid_api_key' ||
    code === 'insufficient_quota' ||
    code === 'invalid_request_error'
  );
};

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

export const generateTaskStructure = async (rawDescription) => {
  const client = getLlmClient();
  if (!client) {
    return mockTaskStructure(rawDescription);
  }

  const prompt = `You help creators define OBJECTIVE, verifiable work (proof-of-work marketplace).
From the raw brief, return ONLY valid JSON (no markdown fences) with keys:
- "title": short headline
- "description": what to deliver
- "criteria": bullet-style acceptance for humans
- "taskType": one of "code" | "data" | "generic" (generic only if work cannot be machine-checked)
- "validationMethod": one of "tests" | "json_schema" | "api_capture" | "llm_fallback"
  (use llm_fallback only when no objective test/schema/capture exists)
- "expectedOutputFormat": exact artifact shape contributors must submit (formats, filenames, JSON keys)
- "successConditions": what must be true for objective pass (measurable)
- "suggestedVerificationSpec": JSON object with either { "tests": [...] } for code checks,
  or json_schema-style rules, or { "validateApiCapture": true, "expectStatus": 200, "expectBodyIncludes": "..." } for API capture tasks, or {} for llm_fallback

Raw brief:
"${rawDescription}"`;

  try {
    const response = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const content = response.choices?.[0]?.message?.content || '';
    const parsed = safeJsonParse(content, mockTaskStructure(rawDescription));
    return normalizeStructuredTask(parsed, rawDescription);
  } catch (error) {
    console.error('AI Generation Error:', error?.message || error);
    if (isAuthOrConfigError(error)) {
      return mockTaskStructure(rawDescription);
    }
    throw new Error('Failed to generate task structure using AI');
  }
};

/**
 * Subjective LLM evaluation — only for taskType "generic".
 * Returns same envelope as deterministic paths.
 */
async function evaluateGenericWithLLM(task, submission) {
  const client = getLlmClient();
  const criteria = task.criteria || '';

  if (!client) {
    const m = mockLlmEvaluation();
    return {
      mode: 'llm',
      verdict: m.verdict,
      score: m.score,
      summary: m.summary,
      proof: m.proof,
    };
  }

  const prompt = `You are an evaluator for a task marketplace. 
You are given the criteria for success and the contributor's submission.
Only use the given criteria to evaluate the submission.
You must return your evaluation purely in JSON format with the keys:
- "score": number between 0 and 100
- "verdict": exactly string "PASS" or "FAIL"
- "reason": short string explaining why.

Criteria:
${criteria}

Submission Text:
${submission.submissionText}

Submission Link:
${submission.submissionLink || 'None provided'}

Proof-of-work (verbatim excerpts for audit):
Test results:
${(submission.powTestResults || '').slice(0, 6000)}

Logs:
${(submission.powLogs || '').slice(0, 6000)}

Output files / references:
${(submission.powOutputFiles || '').slice(0, 2000)}
`;

  try {
    const response = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    });

    const content = response.choices?.[0]?.message?.content || '';
    const parsed = safeJsonParse(content, mockLlmEvaluation());
    const verdictRaw = String(parsed.verdict || '').trim().toUpperCase();
    const verdict = verdictRaw === 'PASS' || verdictRaw === 'FAIL' ? verdictRaw : 'FAIL';
    const scoreNum = Number(parsed.score);
    const score = Number.isFinite(scoreNum) ? Math.min(100, Math.max(0, scoreNum)) : 0;
    const summary =
      typeof parsed.reason === 'string' ? parsed.reason : String(parsed.reason || '');

    return {
      mode: 'llm',
      verdict,
      score,
      summary,
      proof: {
        engine: 'groq_chat',
        model: GROQ_MODEL,
        validationLog: [`Parsed LLM verdict=${verdict} score=${score}`],
      },
    };
  } catch (error) {
    console.error('AI Evaluation Error:', error?.message || error);
    if (isAuthOrConfigError(error)) {
      const m = mockLlmEvaluation();
      return {
        mode: 'llm',
        verdict: m.verdict,
        score: m.score,
        summary: m.summary,
        proof: { ...m.proof, validationLog: ['LLM error; used mock fallback.'] },
      };
    }
    throw new Error('Failed to evaluate submission using AI');
  }
}

function wrapDeterministic(inner, mode) {
  return {
    mode,
    verdict: inner.verdict,
    score: inner.score,
    summary: inner.summary,
    proof: inner.proof,
  };
}

/**
 * Main entry: routes by task.taskType and verificationSpec.
 * - code: deterministic tests (snippet / regex / mock_stdout)
 * - data + validateApiCapture: deterministic HTTP response capture JSON checks
 * - data: JSON / schema rules
 * - generic: LLM (only subjective path)
 */
export async function evaluateSubmission(task, submission) {
  const taskType = String(task.taskType || 'generic').toLowerCase();

  if (taskType === 'code') {
    return wrapDeterministic(verifyCodeTask(task, submission), 'code');
  }

  if (taskType === 'data' && task.verificationSpec?.validateApiCapture) {
    return wrapDeterministic(await verifyApiTask(task, submission), 'data_api');
  }

  if (taskType === 'data') {
    return wrapDeterministic(verifyDataTask(task, submission), 'data');
  }

  if (taskType === 'generic') {
    return evaluateGenericWithLLM(task, submission);
  }

  return wrapDeterministic(
    {
      verdict: 'FAIL',
      score: 0,
      summary: `Unknown taskType "${taskType}"`,
      proof: { engine: 'router', validationLog: ['Invalid taskType'] },
    },
    'error'
  );
}

export {
  EXAMPLE_CODE_VERIFICATION_SPEC,
  EXAMPLE_DATA_VERIFICATION_SPEC,
  EXAMPLE_API_CAPTURE_SPEC,
} from './verification/presets.js';
