import { createSubmission, getSubmissionById, updateSubmissionStatus, getSubmissionsByTaskId } from '../models/submissionStore.js';
import { getTaskById, updateTaskStatus } from '../models/taskStore.js';
import { evaluateSubmission } from '../services/aiService.js';
import { releasePayment } from '../services/contractService.js';

export const submitWork = async (req, res) => {
  try {
    const { taskId, submissionText, submissionLink, contributorWallet } = req.body;

    if (!taskId || !submissionText || !contributorWallet) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const task = getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (task.status !== 'open' && task.status !== 'failed') {
      return res.status(400).json({ success: false, message: "Task is not open for submission" });
    }

    const submission = createSubmission(taskId, submissionText, submissionLink, contributorWallet);
    
    updateTaskStatus(taskId, "submitted", { contributorWallet });

    res.json({ success: true, submission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const evaluateWork = async (req, res) => {
  try {
    const { taskId, submissionId } = req.body;

    if (!taskId) {
      return res.status(400).json({ success: false, message: "taskId is required" });
    }

    const task = getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    let submission;
    if (submissionId) {
      submission = getSubmissionById(submissionId);
    } else {
      const submissions = getSubmissionsByTaskId(taskId);
      if (submissions.length > 0) {
        submission = submissions[submissions.length - 1]; // latest
      }
    }

    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found" });
    }

    const submissionRowId = submissionId || submission.id;

    // Call OpenAI with prompt
    const evaluation = await evaluateSubmission(task.criteria, submission);

    let txHash = null;

    if (evaluation.verdict === 'PASS') {
      // Call contract
      txHash = await releasePayment(task.onChainTaskId, submission.contributorWallet);
      
      // Update statuses
      updateTaskStatus(taskId, "paid");
      updateSubmissionStatus(submissionRowId, "passed");
    } else {
      updateTaskStatus(taskId, "failed");
      updateSubmissionStatus(submissionRowId, "failed");
    }

    // Strict Response Format
    res.json({
      success: true,
      result: {
        score: evaluation.score,
        verdict: evaluation.verdict,
        reason: evaluation.reason
      },
      payment: {
        txHash: txHash
      }
    });

  } catch (error) {
    console.error("Evaluation Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
