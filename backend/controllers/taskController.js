import { generateTaskStructure } from '../services/aiService.js';
import { createTaskOnChain } from '../services/contractService.js';
import { createTask, getAllTasks, getTaskById } from '../models/taskStore.js';

export const generateTask = async (req, res) => {
  try {
    const { rawDescription } = req.body;
    if (!rawDescription) {
      return res.status(400).json({ success: false, message: "rawDescription is required" });
    }

    const structuredTask = await generateTaskStructure(rawDescription);
    res.json({ success: true, structuredTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createNewTask = async (req, res) => {
  try {
    const { title, description, criteria, reward, creatorWallet } = req.body;
    
    if (!title || !description || !criteria || reward === undefined || !creatorWallet) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // 1. Store task locally (gets UUID + onChainTaskId)
    const task = createTask({ title, description, criteria, reward, creatorWallet });

    // 2. Call smart contract createTask()
    // Doing this asynchronously so it doesn't block necessarily, but for MVP we track it
    // If it fails, we might want to revert the task, but for MVP let's await it.
    await createTaskOnChain(task.onChainTaskId, reward);

    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTasks = (req, res) => {
  const tasks = getAllTasks();
  res.json({ success: true, tasks });
};

export const getTaskDetails = (req, res) => {
  const task = getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, message: "Task not found" });
  }
  res.json({ success: true, task });
};
