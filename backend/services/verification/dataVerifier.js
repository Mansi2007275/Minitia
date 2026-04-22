/**
 * Deterministic JSON / structure validation for "data" tasks.
 * submissionText must be JSON when mustParseJson is true.
 */

function parseJsonLoose(text) {
  const raw = String(text || '').trim();
  if (!raw) return { ok: false, error: 'Empty submission', value: null };
  try {
    return { ok: true, error: null, value: JSON.parse(raw) };
  } catch (e) {
    return { ok: false, error: e.message, value: null };
  }
}

function hasKeys(obj, keys) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  return keys.every((k) => Object.prototype.hasOwnProperty.call(obj, k));
}

function checkMinArrayLength(data, path, min) {
  const parts = path.split('.').filter(Boolean);
  let cur = data;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return { ok: false, message: `Path ${path} not found` };
    cur = cur[p];
  }
  if (!Array.isArray(cur)) return { ok: false, message: `${path} is not an array` };
  if (cur.length < min) return { ok: false, message: `${path} length ${cur.length} < ${min}` };
  return { ok: true, message: `${path} length ok` };
}

/** Minimal schema subset: type, properties, required, items (single shape), const */
function validateSchema(value, schema, path = '$') {
  const log = [];
  if (!schema || typeof schema !== 'object') {
    log.push('No jsonSchema object; skipping schema step.');
    return { ok: true, log };
  }

  if ('const' in schema && schema.type === undefined) {
    const ok = value === schema.const;
    if (!ok) log.push(`${path}: const mismatch`);
    return { ok, log };
  }

  const t = schema.type;
  if (t === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      log.push(`${path}: expected object`);
      return { ok: false, log };
    }
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) {
          log.push(`${path}: missing required key "${key}"`);
          return { ok: false, log };
        }
      }
    }
    if (schema.properties && typeof schema.properties === 'object') {
      for (const [key, sub] of Object.entries(schema.properties)) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          const subRes = validateSchema(value[key], sub, `${path}.${key}`);
          log.push(...subRes.log);
          if (!subRes.ok) return { ok: false, log };
        }
      }
    }
    return { ok: true, log };
  }

  if (t === 'array') {
    if (!Array.isArray(value)) {
      log.push(`${path}: expected array`);
      return { ok: false, log };
    }
    if (schema.items) {
      for (let i = 0; i < value.length; i++) {
        const subRes = validateSchema(value[i], schema.items, `${path}[${i}]`);
        log.push(...subRes.log);
        if (!subRes.ok) return { ok: false, log };
      }
    }
    return { ok: true, log };
  }

  if (t === 'string') {
    if (typeof value !== 'string') {
      log.push(`${path}: expected string`);
      return { ok: false, log };
    }
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      log.push(`${path}: string length ${value.length} < minLength ${schema.minLength}`);
      return { ok: false, log };
    }
    return { ok: true, log };
  }

  if (t === 'number') {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      log.push(`${path}: expected number`);
      return { ok: false, log };
    }
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      log.push(`${path}: number ${value} < minimum ${schema.minimum}`);
      return { ok: false, log };
    }
    if (typeof schema.exclusiveMinimum === 'number' && value <= schema.exclusiveMinimum) {
      log.push(`${path}: number ${value} must be > exclusiveMinimum ${schema.exclusiveMinimum}`);
      return { ok: false, log };
    }
    return { ok: true, log };
  }

  if (t === 'boolean') {
    if (typeof value !== 'boolean') {
      log.push(`${path}: expected boolean`);
      return { ok: false, log };
    }
    return { ok: true, log };
  }

  if ('const' in schema) {
    const ok = value === schema.const;
    if (!ok) log.push(`${path}: const mismatch (expected ${JSON.stringify(schema.const)})`);
    return { ok, log };
  }

  log.push(`${path}: schema type ${t || '?'} not fully checked — pass`);
  return { ok: true, log };
}

export function verifyDataTask(task, submission) {
  const spec = task.verificationSpec || {};
  const log = [];

  const parsed = parseJsonLoose(submission.submissionText);
  if (spec.mustParseJson !== false) {
    if (!parsed.ok) {
      log.push(`JSON parse error: ${parsed.error}`);
      return {
        verdict: 'FAIL',
        score: 0,
        summary: 'Submission is not valid JSON.',
        proof: { engine: 'data_verifier_v1', validationLog: log },
      };
    }
  }

  const data = parsed.ok ? parsed.value : submission.submissionText;

  if (spec.requiredTopLevelKeys?.length) {
    if (!parsed.ok || typeof data !== 'object' || data === null || Array.isArray(data)) {
      log.push('Expected top-level JSON object for requiredTopLevelKeys check.');
      return {
        verdict: 'FAIL',
        score: 0,
        summary: 'Expected JSON object at root.',
        proof: { engine: 'data_verifier_v1', validationLog: log },
      };
    }
    if (!hasKeys(data, spec.requiredTopLevelKeys)) {
      log.push(`Missing one of keys: ${spec.requiredTopLevelKeys.join(', ')}`);
      return {
        verdict: 'FAIL',
        score: 0,
        summary: 'Required top-level keys missing.',
        proof: { engine: 'data_verifier_v1', validationLog: log },
      };
    }
    log.push(`requiredTopLevelKeys: ok`);
  }

  if (spec.arrayMinLength && spec.arrayMinLength.path != null) {
    const min = Number(spec.arrayMinLength.min);
    const r = checkMinArrayLength(data, String(spec.arrayMinLength.path), min);
    log.push(r.message);
    if (!r.ok) {
      return {
        verdict: 'FAIL',
        score: 0,
        summary: r.message,
        proof: { engine: 'data_verifier_v1', validationLog: log },
      };
    }
  }

  if (spec.jsonSchema) {
    const sr = validateSchema(data, spec.jsonSchema, '$');
    log.push(...sr.log);
    if (!sr.ok) {
      return {
        verdict: 'FAIL',
        score: 0,
        summary: 'JSON schema validation failed.',
        proof: { engine: 'data_verifier_v1', validationLog: log },
      };
    }
  }

  if (spec.equals != null) {
    if (!parsed.ok) {
      log.push('equals: submission is not valid JSON');
      return {
        verdict: 'FAIL',
        score: 0,
        summary: 'Equals check requires valid JSON.',
        proof: { engine: 'data_verifier_v1', validationLog: log },
      };
    }
    try {
      const eq = JSON.stringify(parsed.value) === JSON.stringify(spec.equals);
      log.push(`equals: ${eq ? 'match' : 'mismatch'}`);
      if (!eq) {
        return {
          verdict: 'FAIL',
          score: 0,
          summary: 'Submission JSON does not match verificationSpec.equals.',
          proof: { engine: 'data_verifier_v1', validationLog: log },
        };
      }
    } catch {
      log.push('equals: comparison error');
      return {
        verdict: 'FAIL',
        score: 0,
        summary: 'Equals check failed.',
        proof: { engine: 'data_verifier_v1', validationLog: log },
      };
    }
  }

  if (
    !spec.requiredTopLevelKeys?.length &&
    !spec.arrayMinLength &&
    !spec.jsonSchema &&
    spec.equals == null
  ) {
    log.push('No data rules in verificationSpec — failing closed.');
    return {
      verdict: 'FAIL',
      score: 0,
      summary: 'Data task has no validation rules configured.',
      proof: { engine: 'data_verifier_v1', validationLog: log },
    };
  }

  return {
    verdict: 'PASS',
    score: 100,
    summary: 'All data validation rules passed.',
    proof: { engine: 'data_verifier_v1', validationLog: log },
  };
}
