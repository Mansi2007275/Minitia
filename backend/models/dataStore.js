import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, '../data/store.json');

const tasks = new Map();
const submissions = new Map();
const contributorTrust = new Map();
let currentOnChainId = 1;

function readDisk() {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return { tasks: [], submissions: [], contributorTrust: {} };
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Store read failed, starting empty:', e.message);
    return { tasks: [], submissions: [], contributorTrust: {} };
  }
}

function writeDisk() {
  const trustObj = Object.fromEntries(contributorTrust);
  const payload = {
    tasks: Array.from(tasks.values()),
    submissions: Array.from(submissions.values()),
    contributorTrust: trustObj,
  };
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(payload, null, 2), 'utf8');
}

function hydrateLegacyTask(t) {
  if (!t.taskType) t.taskType = 'generic';
  if (!t.verificationSpec || typeof t.verificationSpec !== 'object') t.verificationSpec = {};
  if (!t.disputeStatus) t.disputeStatus = 'none';
  if (t.disputeReason == null) t.disputeReason = '';
  if (!t.validationMethod) {
    if (t.taskType === 'generic') t.validationMethod = 'llm_fallback';
    else if (t.taskType === 'data' && t.verificationSpec?.validateApiCapture) t.validationMethod = 'api_capture';
    else if (t.taskType === 'data') t.validationMethod = 'json_schema';
    else t.validationMethod = 'tests';
  }
  if (t.expectedOutputFormat == null || t.expectedOutputFormat === '') {
    t.expectedOutputFormat = 'See criteria and verificationSpec (legacy task).';
  }
  if (t.successConditions == null || t.successConditions === '') {
    t.successConditions = t.criteria || 'Satisfy published criteria.';
  }
  if (typeof t.isVerifiable !== 'boolean') {
    t.isVerifiable = t.validationMethod !== 'llm_fallback';
  }
}

function hydrate() {
  const data = readDisk();
  const { tasks: taskRows, submissions: subRows } = data;
  contributorTrust.clear();
  if (data.contributorTrust && typeof data.contributorTrust === 'object') {
    for (const [k, v] of Object.entries(data.contributorTrust)) {
      contributorTrust.set(k, {
        trustScore: Number(v?.trustScore) || 0,
        completedVerifiableTasks: Number(v?.completedVerifiableTasks) || 0,
      });
    }
  }
  for (const t of taskRows || []) {
    if (t?.id) {
      hydrateLegacyTask(t);
      tasks.set(t.id, t);
    }
  }
  for (const s of subRows || []) {
    if (s?.id) {
      if (s.submissionCodeSnippet == null) s.submissionCodeSnippet = '';
      if (s.submissionRepoUrl == null) s.submissionRepoUrl = '';
      if (!s.disputeStatus) s.disputeStatus = 'none';
      if (s.disputeReason == null) s.disputeReason = '';
      if (s.powTestResults == null) s.powTestResults = '';
      if (s.powLogs == null) s.powLogs = '';
      if (s.powOutputFiles == null) s.powOutputFiles = '';
      submissions.set(s.id, s);
    }
  }
  let maxOnChain = 0;
  for (const t of tasks.values()) {
    const n = Number(t.onChainTaskId);
    if (Number.isFinite(n) && n > maxOnChain) maxOnChain = n;
  }
  currentOnChainId = Math.max(1, maxOnChain + 1);
}

hydrate();

// --- Contributor trust (proof-of-work reputation) ---

export const getContributorTrust = (wallet) => {
  const key = String(wallet || '')
    .trim()
    .toLowerCase();
  return contributorTrust.get(key) || { trustScore: 0, completedVerifiableTasks: 0 };
};

export const incrementContributorTrust = (wallet, isVerifiable = true) => {
  const key = String(wallet || '')
    .trim()
    .toLowerCase();
  if (!key.startsWith('0x')) return null;
  const cur = contributorTrust.get(key) || { trustScore: 0, completedVerifiableTasks: 0 };
  cur.trustScore += isVerifiable ? 10 : 3;
  cur.completedVerifiableTasks += 1;
  contributorTrust.set(key, { ...cur });
  writeDisk();
  return cur;
};

// --- Tasks ---

const ALLOWED_TASK_TYPES = new Set(['code', 'data', 'generic']);

function normalizeTaskType(raw) {
  const t = String(raw || 'generic').toLowerCase();
  return ALLOWED_TASK_TYPES.has(t) ? t : 'generic';
}

export const createTask = (taskData) => {
  const id = uuidv4();
  const onChainTaskId = currentOnChainId++;
  const spec =
    taskData.verificationSpec != null && typeof taskData.verificationSpec === 'object'
      ? taskData.verificationSpec
      : {};
  const task = {
    id,
    title: taskData.title,
    description: taskData.description,
    criteria: taskData.criteria,
    reward: taskData.reward,
    creatorWallet: taskData.creatorWallet,
    contributorWallet: null,
    onChainTaskId,
    status: 'open',
    createdAt: new Date().toISOString(),
    taskType: normalizeTaskType(taskData.taskType),
    verificationSpec: spec,
    disputeStatus: 'none',
    disputeReason: '',
    expectedOutputFormat: String(taskData.expectedOutputFormat || '').trim(),
    validationMethod: String(taskData.validationMethod || 'tests').trim(),
    successConditions: String(taskData.successConditions || '').trim(),
    isVerifiable: Boolean(taskData.isVerifiable),
  };
  tasks.set(id, task);
  writeDisk();
  return task;
};

export const getTaskById = (id) => tasks.get(id);

export const getAllTasks = () =>
  Array.from(tasks.values()).sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });

export const updateTaskStatus = (id, status, updates = {}) => {
  const task = tasks.get(id);
  if (task) {
    const updated = { ...task, status, ...updates };
    tasks.set(id, updated);
    writeDisk();
    return updated;
  }
  return null;
};

// --- Submissions ---

export const createSubmission = (taskId, submissionText, submissionLink, contributorWallet, extras = {}) => {
  const id = uuidv4();
  const submission = {
    id,
    taskId,
    submissionText,
    submissionLink: submissionLink || '',
    contributorWallet,
    submissionCodeSnippet: extras.submissionCodeSnippet || '',
    submissionRepoUrl: extras.submissionRepoUrl || '',
    powTestResults: String(extras.powTestResults || '').trim(),
    powLogs: String(extras.powLogs || '').trim(),
    powOutputFiles: String(extras.powOutputFiles || '').trim(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    disputeStatus: 'none',
    disputeReason: '',
  };
  submissions.set(id, submission);
  writeDisk();
  return submission;
};

export const getSubmissionById = (id) => submissions.get(id);

export const getSubmissionsByTaskId = (taskId) =>
  Array.from(submissions.values())
    .filter((sub) => sub.taskId === taskId)
    .sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return ta - tb;
    });

export const updateSubmissionMerge = (id, partial) => {
  const submission = submissions.get(id);
  if (!submission) return null;
  const updated = { ...submission, ...partial };
  submissions.set(id, updated);
  writeDisk();
  return updated;
};

export const updateSubmissionStatus = (id, status) => {
  return updateSubmissionMerge(id, { status });
};
