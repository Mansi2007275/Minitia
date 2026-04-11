import OpenAI from 'openai';

// To avoid crashing if no API key is set initially, we check
let openai;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-key',
  });
} catch (e) {
  console.warn("OpenAI initialized without a valid key. It will fail on actual requests.");
}

export const generateTaskStructure = async (rawDescription) => {
  if (!process.env.OPENAI_API_KEY) {
      // Mock logic for testing without real key
      return {
          title: "Mock AI Generated Title",
          description: rawDescription,
          criteria: "1. Must submit code. 2. Must pass tests."
      };
  }

  const prompt = `You are an AI assistant helping project creators structure their tasks. 
Please extract the title, description, and completion criteria from the following user prompt.
Return the output in purely JSON format with the keys: "title", "description", "criteria". Do not wrap in markdown blocks.

Raw Description:
"${rawDescription}"`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const parsed = JSON.parse(response.choices[0].message.content.trim());
    return parsed;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error('Failed to generate task structure using AI');
  }
};

export const evaluateSubmission = async (criteria, submission) => {
  if (!process.env.OPENAI_API_KEY) {
    // Mock logic for testing without real key
    return {
      score: 85,
      verdict: "PASS",
      reason: "Mock evaluation passed."
    };
  }

  const prompt = `You are an evaluator for a task marketplace. 
You are given the criteria for success and the contributor's submission.
Only use the given criteria to evaluate the submission.
You must return your evaluation purely in JSON format with the keys:
- "score": number between 0 and 100
- "verdict": exactly string "PASS" or "FAIL"
- "reason": short string explaining why.

Criteria:
${criteria}

Submission Text:
${submission.submissionText}

Submission Link:
${submission.submissionLink || 'None provided'}
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1, // Low temp for more deterministic evaluation
    });

    const parsed = JSON.parse(response.choices[0].message.content.trim());
    return parsed;
  } catch (error) {
    console.error("AI Evaluation Error:", error);
    throw new Error('Failed to evaluate submission using AI');
  }
};
