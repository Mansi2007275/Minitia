/** Mirrors backend example specs for quick task setup in the UI. */

export const CODE_VERIFICATION_PRESET = {
  tests: [
    {
      id: "has-print",
      name: "Uses print",
      assert: "snippet_contains",
      value: "print(",
      caseInsensitive: false,
    },
    {
      id: "mentions-hello",
      name: "Greets",
      assert: "snippet_contains",
      value: "hello",
      caseInsensitive: true,
    },
  ],
};

export const DATA_VERIFICATION_PRESET = {
  mustParseJson: true,
  jsonSchema: {
    type: "object",
    required: ["ok"],
    properties: {
      ok: { const: true },
    },
  },
};

/** taskType must stay "data"; API checks use validateApiCapture on the same spec object. */
export const API_CAPTURE_PRESET = {
  validateApiCapture: true,
  expectStatus: 200,
  expectBodyIncludes: "success",
};
