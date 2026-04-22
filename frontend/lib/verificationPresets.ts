/** Mirrors backend example specs for quick task setup in the UI. */

/** Deterministic code checks: regex + mock stdout (submission text = stdout channel in MVP). */
export const CODE_VERIFICATION_PRESET = {
  tests: [
    {
      id: "defines-factorial",
      name: "Declares factorial(",
      assert: "regex",
      pattern: "factorial\\s*\\(",
      flags: "i",
    },
    {
      id: "stdout-120",
      name: "Documents factorial(5)=120",
      assert: "mock_stdout",
      expectStdoutContains: "120",
    },
  ],
};

export const DATA_VERIFICATION_PRESET = {
  mustParseJson: true,
  jsonSchema: {
    type: "object",
    required: ["name", "price"],
    properties: {
      name: { type: "string", minLength: 1 },
      price: { type: "number", exclusiveMinimum: 0 },
    },
  },
};

/** taskType stays "data"; verifier reads submitted capture JSON only (no live HTTP by default). */
export const API_CAPTURE_PRESET = {
  validateApiCapture: true,
  expectStatus: 200,
  expectBodyIncludes: '"id"',
};
