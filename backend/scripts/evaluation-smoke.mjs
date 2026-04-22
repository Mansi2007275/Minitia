/**
 * Example deterministic evaluation runs (no server).
 * Usage: node scripts/evaluation-smoke.mjs
 */
import { verifyCodeTask } from '../services/verification/codeVerifier.js';
import { verifyDataTask } from '../services/verification/dataVerifier.js';
import { verifyApiTask } from '../services/verification/apiVerifier.js';
import {
  EXAMPLE_CODE_VERIFICATION_SPEC,
  EXAMPLE_DATA_VERIFICATION_SPEC,
  EXAMPLE_API_CAPTURE_SPEC,
} from '../services/verification/presets.js';
import { evaluateSubmission } from '../services/aiService.js';

const codeTask = {
  taskType: 'code',
  criteria: 'N/A for deterministic path',
  verificationSpec: EXAMPLE_CODE_VERIFICATION_SPEC,
};

const passSubmit = {
  submissionText: "print('hello world')",
  submissionCodeSnippet: '',
  submissionLink: '',
};

const failSubmit = {
  submissionText: 'fn main() {}',
  submissionCodeSnippet: '',
  submissionLink: '',
};

console.log('--- Code PASS (snippet checks) ---');
console.log(verifyCodeTask(codeTask, passSubmit));

console.log('--- Code FAIL ---');
console.log(verifyCodeTask(codeTask, failSubmit));

const dataTask = {
  taskType: 'data',
  verificationSpec: EXAMPLE_DATA_VERIFICATION_SPEC,
};

console.log('--- Data PASS ---');
console.log(verifyDataTask(dataTask, { submissionText: JSON.stringify({ ok: true }) }));

console.log('--- Data FAIL ---');
console.log(verifyDataTask(dataTask, { submissionText: JSON.stringify({ ok: false }) }));

const apiTask = {
  taskType: 'data',
  verificationSpec: EXAMPLE_API_CAPTURE_SPEC,
};

console.log('--- API capture PASS ---');
console.log(
  await verifyApiTask(apiTask, {
    submissionText: JSON.stringify({
      status: 200,
      body: '{"success":true}',
      headers: {},
    }),
  })
);

const genericTask = {
  taskType: 'generic',
  criteria: 'Must mention apples',
};

console.log('--- Router generic (mock if no GROQ_API_KEY) ---');
console.log(await evaluateSubmission(genericTask, { submissionText: 'I like apples.' }));
