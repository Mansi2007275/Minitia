/** Shared default verification specs (imported by AI service, task builder, smoke scripts). */

export const EXAMPLE_CODE_VERIFICATION_SPEC = {
  tests: [
    {
      id: 'defines-factorial',
      name: 'Declares factorial(',
      assert: 'regex',
      pattern: 'factorial\\s*\\(',
      flags: 'i',
    },
    {
      id: 'stdout-120',
      name: 'Documents factorial(5)=120',
      assert: 'mock_stdout',
      expectStdoutContains: '120',
    },
  ],
};

export const EXAMPLE_DATA_VERIFICATION_SPEC = {
  mustParseJson: true,
  jsonSchema: {
    type: 'object',
    required: ['name', 'price'],
    properties: {
      name: { type: 'string', minLength: 1 },
      price: { type: 'number', exclusiveMinimum: 0 },
    },
  },
};

export const EXAMPLE_API_CAPTURE_SPEC = {
  validateApiCapture: true,
  expectStatus: 200,
  expectBodyIncludes: '"id"',
};
