import {
  EXAMPLE_CODE_VERIFICATION_SPEC,
  EXAMPLE_DATA_VERIFICATION_SPEC,
  EXAMPLE_API_CAPTURE_SPEC,
} from './verification/presets.js';

const ALLOWED_VALIDATION = new Set(['tests', 'json_schema', 'api_capture', 'llm_fallback']);

export function normalizeValidationMethod(raw) {
  const v = String(raw || 'tests').toLowerCase();
  return ALLOWED_VALIDATION.has(v) ? v : 'tests';
}

export function validationMethodToTaskType(method) {
  if (method === 'llm_fallback') return 'generic';
  if (method === 'json_schema' || method === 'api_capture') return 'data';
  return 'code';
}

export function isVerifiableMethod(method) {
  return normalizeValidationMethod(method) !== 'llm_fallback';
}

/** Prefer explicit client spec; else AI suggestion; else defaults for the validation method. */
export function resolveVerificationSpec(validationMethod, clientSpec, suggestedFromAi) {
  const hasClient =
    clientSpec && typeof clientSpec === 'object' && Object.keys(clientSpec).length > 0;
  const hasSuggested =
    suggestedFromAi && typeof suggestedFromAi === 'object' && Object.keys(suggestedFromAi).length > 0;

  if (hasClient) return { ...clientSpec };
  if (hasSuggested) return { ...suggestedFromAi };

  switch (validationMethod) {
    case 'tests':
      return { ...EXAMPLE_CODE_VERIFICATION_SPEC };
    case 'json_schema':
      return { ...EXAMPLE_DATA_VERIFICATION_SPEC };
    case 'api_capture':
      return { ...EXAMPLE_API_CAPTURE_SPEC };
    default:
      return {};
  }
}
