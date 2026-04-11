import { v4 as uuidv4 } from 'uuid';

const tasks = new Map();
let currentOnChainId = 1; // Simulated incrementing counter for smart contract IDs

export const createTask = (taskData) => {
  const id = uuidv4();
  const onChainTaskId = currentOnChainId++;
  const task = {
    id,
    title: taskData.title,
    description: taskData.description,
    criteria: taskData.criteria,
    reward: taskData.reward,
    creatorWallet: taskData.creatorWallet,
    contributorWallet: null,
    onChainTaskId, // Numeric ID for contract
    status: 'open', // open, submitted, passed, failed, paid, refunded
  };
  tasks.set(id, task);
  return task;
};

export const getTaskById = (id) => {
  return tasks.get(id);
};

export const getAllTasks = () => {
  return Array.from(tasks.values());
};

export const updateTaskStatus = (id, status, updates = {}) => {
  const task = tasks.get(id);
  if (task) {
    const updated = { ...task, status, ...updates };
    tasks.set(id, updated);
    return updated;
  }
  return null;
};
