/**
 * API / HTTP response checks.
 * MVP mock: does not perform live HTTP unless allowLiveFetch is true and URL is http(s).
 * Default: validate contributor-submitted capture JSON against expected constraints (deterministic).
 */

function parseCapture(text) {
  const raw = String(text || '').trim();
  try {
    return { ok: true, value: JSON.parse(raw), error: null };
  } catch (e) {
    return { ok: false, value: null, error: e.message };
  }
}

export async function verifyApiTask(task, submission) {
  const spec = task.verificationSpec || {};
  const log = [];

  const expectStatus = spec.expectStatus != null ? Number(spec.expectStatus) : null;
  const expectBodyIncludes = spec.expectBodyIncludes != null ? String(spec.expectBodyIncludes) : null;
  const expectHeaders = spec.expectHeaders && typeof spec.expectHeaders === 'object' ? spec.expectHeaders : null;
  const hasHeaderRules =
    expectHeaders && typeof expectHeaders === 'object' && Object.keys(expectHeaders).length > 0;

  if (expectStatus == null && !expectBodyIncludes && !hasHeaderRules) {
    log.push('API task missing verificationSpec (expectStatus / expectBodyIncludes / expectHeaders).');
    return {
      verdict: 'FAIL',
      score: 0,
      summary: 'API task not configured.',
      proof: { engine: 'api_verifier_v1', validationLog: log, httpChecks: [] },
    };
  }

  const parsed = parseCapture(submission.submissionText);
  if (!parsed.ok) {
    log.push(`Expected submissionText to be JSON capture { status, body, headers? }: ${parsed.error}`);
    return {
      verdict: 'FAIL',
      score: 0,
      summary: 'Invalid API capture JSON in submission.',
      proof: { engine: 'api_verifier_v1', validationLog: log, httpChecks: [] },
    };
  }

  const cap = parsed.value;
  const status = Number(cap.status ?? cap.statusCode);
  const body = typeof cap.body === 'string' ? cap.body : JSON.stringify(cap.body ?? '');
  const headers = cap.headers && typeof cap.headers === 'object' ? cap.headers : {};

  const httpChecks = [];

  if (expectStatus != null) {
    const ok = Number.isFinite(status) && status === expectStatus;
    httpChecks.push({
      id: 'status',
      passed: ok,
      detail: `status ${status} vs expected ${expectStatus}`,
    });
    log.push(ok ? `[PASS] status` : `[FAIL] status`);
  }

  if (expectBodyIncludes != null) {
    const ok = body.includes(expectBodyIncludes);
    httpChecks.push({
      id: 'body_includes',
      passed: ok,
      detail: ok ? 'body contains required fragment' : 'required body fragment missing',
    });
    log.push(ok ? `[PASS] body includes` : `[FAIL] body includes`);
  }

  if (hasHeaderRules) {
    for (const [hk, hv] of Object.entries(expectHeaders)) {
      const actual = headers[hk] ?? headers[hk.toLowerCase()];
      const ok = String(actual ?? '') === String(hv);
      httpChecks.push({
        id: `header:${hk}`,
        passed: ok,
        detail: ok ? `header ${hk} ok` : `header ${hk}: got "${actual}", expected "${hv}"`,
      });
      log.push(`[${ok ? 'PASS' : 'FAIL'}] header ${hk}`);
    }
  }

  const allPass = httpChecks.length > 0 && httpChecks.every((c) => c.passed);
  const score = allPass ? 100 : Math.round((httpChecks.filter((c) => c.passed).length / httpChecks.length) * 100);

  return {
    verdict: allPass ? 'PASS' : 'FAIL',
    score,
    summary: allPass ? 'API capture matched all expectations.' : 'API capture failed one or more checks.',
    proof: {
      engine: 'api_verifier_v1',
      mode: 'submitted_capture',
      httpChecks,
      validationLog: log,
    },
  };
}
