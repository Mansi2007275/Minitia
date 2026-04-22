/** Shared default verification specs (imported by AI service, task builder, smoke scripts). */

export const EXAMPLE_CODE_VERIFICATION_SPEC = {
  tests: [
    {
      id: 'has-print',
      name: 'Uses print',
      assert: 'snippet_contains',
      value: 'print(',
      caseInsensitive: false,
    },
    {
      id: 'mentions-hello',
      name: 'Greets',
      assert: 'snippet_contains',
      value: 'hello',
      caseInsensitive: true,
    },
  ],
};

export const EXAMPLE_DATA_VERIFICATION_SPEC = {
  mustParseJson: true,
  jsonSchema: {
    type: 'object',
    required: ['ok'],
    properties: {
      ok: { const: true },
    },
  },
};

export const EXAMPLE_API_CAPTURE_SPEC = {
  validateApiCapture: true,
  expectStatus: 200,
  expectBodyIncludes: 'success',
};
