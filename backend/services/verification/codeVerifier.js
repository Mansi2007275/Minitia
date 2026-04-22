/**
 * Deterministic "code" task checks (MVP: no real sandbox).
 * Uses submission.submissionText, submission.submissionRepoUrl, submission.submissionCodeSnippet.
 */

const GITHUB_HOST = /github\.com/i;

function collectSource(submission) {
  const parts = [];
  if (submission.submissionCodeSnippet) parts.push(String(submission.submissionCodeSnippet));
  if (submission.submissionText) parts.push(String(submission.submissionText));
  if (submission.submissionRepoUrl && GITHUB_HOST.test(submission.submissionRepoUrl)) {
    parts.push(`repo:${submission.submissionRepoUrl}`);
  }
  if (submission.submissionLink && GITHUB_HOST.test(submission.submissionLink)) {
    parts.push(`link:${submission.submissionLink}`);
  }
  return parts.join('\n\n');
}

function runSnippetContains(source, needle, caseInsensitive) {
  if (!needle) return { passed: false, message: 'Missing needle in test spec' };
  const a = caseInsensitive ? source.toLowerCase() : source;
  const b = caseInsensitive ? needle.toLowerCase() : needle;
  const passed = a.includes(b);
  return {
    passed,
    message: passed ? `Source contains required snippet` : `Required snippet not found: ${needle.slice(0, 80)}`,
  };
}

function runRegex(source, pattern, flags = '') {
  try {
    const re = new RegExp(pattern, flags);
    const passed = re.test(source);
    return {
      passed,
      message: passed ? `Pattern matched: /${pattern}/${flags}` : `Pattern did not match: /${pattern}/${flags}`,
    };
  } catch (e) {
    return { passed: false, message: `Invalid regex: ${e.message}` };
  }
}

/**
 * Mock "test suite": deterministic string expectations (no subprocess).
 * Each test: { id, name?, assert: 'snippet_contains'|'regex'|'mock_stdout', ... }
 */
export function verifyCodeTask(task, submission) {
  const spec = task.verificationSpec || {};
  const tests = Array.isArray(spec.tests) ? spec.tests : [];
  const source = collectSource(submission);
  const log = [];
  const results = [];

  if (!source.trim()) {
    return {
      verdict: 'FAIL',
      score: 0,
      summary: 'No code snippet, repo URL, or text submission provided.',
      proof: { tests: [], validationLog: ['No source text collected from submission.'] },
    };
  }

  if (tests.length === 0) {
    log.push('No tests defined in task.verificationSpec.tests — failing closed.');
    return {
      verdict: 'FAIL',
      score: 0,
      summary: 'Code task has no verification tests configured.',
      proof: { tests: [], validationLog: log },
    };
  }

  for (const t of tests) {
    const id = t.id || `test_${results.length}`;
    const name = t.name || id;
    let passed = false;
    let message = '';

    switch (t.assert) {
      case 'snippet_contains':
        ({ passed, message } = runSnippetContains(source, t.value, !!t.caseInsensitive));
        break;
      case 'regex':
        ({ passed, message } = runRegex(source, t.pattern, t.flags || ''));
        break;
      case 'mock_stdout': {
        // MVP: compare canonical "stdout" derived only from submission text (deterministic).
        const simulated = String(submission.submissionText || '').trim();
        const expectSub = t.expectStdoutContains != null ? String(t.expectStdoutContains) : '';
        passed = expectSub !== '' && simulated.includes(expectSub);
        message = passed
          ? `Mock stdout check passed (submission text contains expected output fragment).`
          : `Mock stdout: submission must include verbatim: ${expectSub.slice(0, 120)}`;
        log.push(`[mock_stdout:${id}] simulated channel = submissionText`);
        break;
      }
      default:
        message = `Unknown assert type: ${t.assert}`;
        passed = false;
    }

    results.push({ id, name, passed, message });
    log.push(`[${passed ? 'PASS' : 'FAIL'}] ${name}: ${message}`);
  }

  const allPass = results.length > 0 && results.every((r) => r.passed);
  const score = allPass ? 100 : Math.round((results.filter((r) => r.passed).length / results.length) * 100);

  return {
    verdict: allPass ? 'PASS' : 'FAIL',
    score,
    summary: allPass
      ? `All ${results.length} code verification test(s) passed.`
      : `Code verification failed (${results.filter((r) => !r.passed).length} failing).`,
    proof: {
      engine: 'code_verifier_v1',
      tests: results,
      validationLog: log,
    },
  };
}
