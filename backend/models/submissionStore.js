import { v4 as uuidv4 } from 'uuid';

const submissions = new Map();

export const createSubmission = (taskId, submissionText, submissionLink, contributorWallet) => {
  const id = uuidv4();
  const submission = {
    id,
    taskId,
    submissionText,
    submissionLink,
    contributorWallet,
    status: 'pending', // pending, passed, failed
  };
  submissions.set(id, submission);
  return submission;
};

export const getSubmissionById = (id) => {
  return submissions.get(id);
};

export const getSubmissionsByTaskId = (taskId) => {
  return Array.from(submissions.values()).filter(sub => sub.taskId === taskId);
};

export const updateSubmissionStatus = (id, status) => {
  const submission = submissions.get(id);
  if (submission) {
    const updated = { ...submission, status };
    submissions.set(id, updated);
    return updated;
  }
  return null;
};
