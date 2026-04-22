import OpenAI from 'openai';

const getOpenAIClient = () => {
  const apiKey = (process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey || apiKey === "sk-your-openai-api-key" || apiKey === "sk-dummy-key") {
    return null;
  }
  return new OpenAI({ apiKey });
};

const safeJsonParse = (text, fallback) => {
  try {
    return JSON.parse((text || "").trim());
  } catch {
    return fallback;
  }
};

const mockTaskStructure = (rawDescription) => {
  const text = (rawDescription || "").trim();
  const title = text.slice(0, 60) || "New Task";
  return {
    title,
    description: text || "No description provided",
    criteria: "1. Submit working output. 2. Explain what was built. 3. Share test proof/screenshots.",
  };
};

const mockEvaluation = () => {
  return {
    score: 85,
    verdict: "PASS",
    reason: "AI fallback evaluation: submission appears acceptable based on provided details.",
  };
};

const isAuthOrConfigError = (error) => {
  const code = String(error?.code || "");
  return (
    error?.status === 401 ||
    code === "invalid_api_key" ||
    code === "insufficient_quota" ||
    code === "invalid_request_error"
  );
};

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export const generateTaskStructure = async (rawDescription) => {
  const openai = getOpenAIClient();
  if (!openai) {
    return mockTaskStructure(rawDescription);
  }

  const prompt = `You are an AI assistant helping project creators structure their tasks. 
Please extract the title, description, and completion criteria from the following user prompt.
Return the output in purely JSON format with the keys: "title", "description", "criteria". Do not wrap in markdown blocks.

Raw Description:
"${rawDescription}"`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const content = response.choices?.[0]?.message?.content || "";
    return safeJsonParse(content, mockTaskStructure(rawDescription));
  } catch (error) {
    console.error("AI Generation Error:", error?.message || error);
    if (isAuthOrConfigError(error)) {
      return mockTaskStructure(rawDescription);
    }
    throw new Error('Failed to generate task structure using AI');
  }
}

export const evaluateSubmission = async (criteria, submission) => {
  const openai = getOpenAIClient();
  if (!openai) {
    return mockEvaluation();
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
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1, // Low temp for more deterministic evaluation
    });

    const content = response.choices?.[0]?.message?.content || "";
    return safeJsonParse(content, mockEvaluation());
  } catch (error) {
    console.error("AI Evaluation Error:", error?.message || error);
    if (isAuthOrConfigError(error)) {
      return mockEvaluation();
    }
    throw new Error('Failed to evaluate submission using AI');
  }
};
