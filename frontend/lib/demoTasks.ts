import type { StructuredTaskDraft } from "@/lib/types";
import { REQUIRED_EVM_ADDRESS } from "@/lib/keplr";
import {
  API_CAPTURE_PRESET,
  CODE_VERIFICATION_PRESET,
  DATA_VERIFICATION_PRESET,
} from "@/lib/verificationPresets";

function shortEvm(addr: string) {
  if (!addr.startsWith("0x") || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Readable label for UI (same canonical address as Keplr wiring). */
export const INITIA_DEMO_WALLET_LABEL = `${shortEvm(REQUIRED_EVM_ADDRESS)} (Initia MiniEVM)`;

export function buildDemoApiCaptureTask(): StructuredTaskDraft {
  return {
    title: "Verify capture of GET /users/1 (jsonplaceholder)",
    description:
      "Call https://jsonplaceholder.typicode.com/users/1 (curl, browser, or script). Submit a single JSON object as submission text: { \"status\": number, \"body\": string, \"headers\": object }. Stringify the HTTP response body into the body field.",
    criteria:
      "Status must be 200; body string must include the user id field as specified in the verification spec (deterministic check on your capture, no live HTTP from the server).",
    taskType: "data",
    validationMethod: "api_capture",
    expectedOutputFormat:
      '{"status":200,"body":"{\\"id\\":1,...}","headers":{}} — paste the exact capture JSON only.',
    successConditions:
      "Submitted capture JSON: status === 200; body contains expectBodyIncludes fragment from verificationSpec.",
    suggestedVerificationSpec: API_CAPTURE_PRESET,
  };
}

export function buildDemoJsonSchemaTask(): StructuredTaskDraft {
  return {
    title: "Product listing JSON (strict schema)",
    description:
      "Deliver one JSON object for a storefront listing. No markdown, no commentary outside the JSON.",
    criteria: "name is a non-empty string; price is a number > 0.",
    taskType: "data",
    validationMethod: "json_schema",
    expectedOutputFormat: '{"name":"Example","price":12.5}',
    successConditions: "JSON parses and satisfies verificationSpec.jsonSchema.",
    suggestedVerificationSpec: DATA_VERIFICATION_PRESET,
  };
}

export function buildDemoCodeTask(): StructuredTaskDraft {
  return {
    title: "Factorial: implementation + stated result",
    description:
      "Provide code that defines factorial (any language in snippet). The MVP verifier treats submission text as a mock stdout channel: it must include 120 for factorial(5).",
    criteria:
      "Regex requires a factorial( identifier; mock_stdout requires substring 120 in submission text.",
    taskType: "code",
    validationMethod: "tests",
    expectedOutputFormat:
      "Code snippet with factorial definition; submission text includes 120 (mock stdout).",
    successConditions: "Both checks in verificationSpec.tests pass.",
    suggestedVerificationSpec: CODE_VERIFICATION_PRESET,
  };
}
