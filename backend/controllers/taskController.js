import { generateTaskStructure } from '../services/aiService.js';
import { createTask, getAllTasks, getTaskById, getContributorTrust } from '../models/dataStore.js';
import {
  normalizeValidationMethod,
  validationMethodToTaskType,
  resolveVerificationSpec,
  isVerifiableMethod,
} from '../services/taskSpecBuilder.js';

export const generateTask = async (req, res) => {
  try {
    const { rawDescription } = req.body;
    if (!rawDescription || typeof rawDescription !== 'string') {
      return res.status(400).json({ success: false, message: 'rawDescription is required' });
    }
    if (rawDescription.length > 12000) {
      return res.status(400).json({ success: false, message: 'Description is too long' });
    }

    const structuredTask = await generateTaskStructure(rawDescription.trim());
    res.json({ success: true, structuredTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createNewTask = async (req, res) => {
  try {
    const {
      title,
      description,
      criteria,
      reward,
      creatorWallet,
      verificationSpec,
      expectedOutputFormat,
      validationMethod: vmIn,
      successConditions,
      suggestedVerificationSpec,
    } = req.body;

    if (!title || !description || !criteria || reward === undefined || !creatorWallet) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const rewardNum = Number(reward);
    if (!Number.isFinite(rewardNum) || rewardNum <= 0) {
      return res.status(400).json({ success: false, message: 'reward must be a positive number' });
    }

    if (!expectedOutputFormat || typeof expectedOutputFormat !== 'string' || !expectedOutputFormat.trim()) {
      return res.status(400).json({
        success: false,
        message: 'expectedOutputFormat is required (exact artifact shape contributors must submit)',
      });
    }
    if (!successConditions || typeof successConditions !== 'string' || !successConditions.trim()) {
      return res.status(400).json({
        success: false,
        message: 'successConditions is required (measurable pass rules)',
      });
    }

    const validationMethod = normalizeValidationMethod(vmIn);
    const taskType = validationMethodToTaskType(validationMethod);

    if (verificationSpec != null && typeof verificationSpec !== 'object') {
      return res.status(400).json({ success: false, message: 'verificationSpec must be a JSON object' });
    }

    const mergedVerification = resolveVerificationSpec(
      validationMethod,
      verificationSpec || {},
      suggestedVerificationSpec
    );

    const task = createTask({
      title,
      description,
      criteria,
      reward: rewardNum,
      creatorWallet,
      taskType,
      verificationSpec: mergedVerification,
      expectedOutputFormat: expectedOutputFormat.trim(),
      validationMethod,
      successConditions: successConditions.trim(),
      isVerifiable: isVerifiableMethod(validationMethod),
    });

    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTasks = (req, res) => {
  const list = getAllTasks();
  const enrich = req.query.includeTrust === '1';
  const tasks = list.map((t) => {
    if (!enrich || !t.contributorWallet) return t;
    return {
      ...t,
      contributorTrust: getContributorTrust(t.contributorWallet),
    };
  });
  res.json({ success: true, tasks });
};

export const getContributorTrustEndpoint = (req, res) => {
  const wallet = req.params.wallet;
  if (!wallet) {
    return res.status(400).json({ success: false, message: 'wallet is required' });
  }
  res.json({ success: true, wallet, ...getContributorTrust(wallet) });
};

export const getTaskDetails = (req, res) => {
  const task = getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }
  res.json({ success: true, task });
};

export const getTaskSubmissions = (req, res) => {
  const task = getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }
  const submissions = getSubmissionsByTaskId(req.params.id);
  res.json({ success: true, submissions });
};
