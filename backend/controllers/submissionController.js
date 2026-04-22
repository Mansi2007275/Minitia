import {
  createSubmission,
  getSubmissionById,
  updateSubmissionStatus,
  updateSubmissionMerge,
  getSubmissionsByTaskId,
  getTaskById,
  updateTaskStatus,
  incrementContributorTrust,
} from '../models/dataStore.js';
import { evaluateSubmission } from '../services/aiService.js';
import { releasePayment } from '../services/contractService.js';

const DISPUTE_RAISEABLE = new Set(['submitted', 'failed', 'passed_pending']);

export const submitWork = async (req, res) => {
  try {
    const {
      taskId,
      submissionText,
      submissionLink,
      contributorWallet,
      submissionCodeSnippet,
      submissionRepoUrl,
      powTestResults,
      powLogs,
      powOutputFiles,
    } = req.body;

    if (!taskId || !submissionText || !contributorWallet) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const task = getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.status !== 'open' && task.status !== 'failed') {
      return res.status(400).json({ success: false, message: 'Task is not open for submission' });
    }

    const submission = createSubmission(taskId, submissionText, submissionLink, contributorWallet, {
      submissionCodeSnippet,
      submissionRepoUrl,
      powTestResults,
      powLogs,
      powOutputFiles,
    });

    updateTaskStatus(taskId, 'submitted', {
      contributorWallet,
      disputeStatus: 'none',
      disputeReason: '',
    });

    res.json({ success: true, submission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Evaluation never sends on-chain payout when a dispute is active.
 * PASS without dispute -> passed_pending; creator must POST /finalize-payout (or admin resolves).
 * PASS with dispute already raised -> stays under_review, no payout.
 */
export const evaluateWork = async (req, res) => {
  try {
    const { taskId, submissionId } = req.body;

    if (!taskId) {
      return res.status(400).json({ success: false, message: 'taskId is required' });
    }

    const task = getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    let submission;
    if (submissionId) {
      submission = getSubmissionById(submissionId);
    } else {
      const submissions = getSubmissionsByTaskId(taskId);
      if (submissions.length > 0) {
        submission = submissions[submissions.length - 1];
      }
    }

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const evaluable = task.status === 'submitted' || task.status === 'under_review';
    if (!evaluable) {
      return res.status(400).json({
        success: false,
        message: 'Task is not in a state that allows evaluation (expected submitted or under_review).',
      });
    }

    const submissionRowId = submissionId || submission.id;

    const evaluation = await evaluateSubmission(task, submission);

    let txHash = null;
    let taskStatusAfter = task.status;
    let payoutDeferred = true;

    if (evaluation.verdict === 'PASS') {
      updateSubmissionMerge(submissionRowId, { status: 'passed' });

      if (task.disputeStatus === 'raised') {
        updateTaskStatus(taskId, 'under_review', {
          disputeStatus: 'raised',
        });
        taskStatusAfter = 'under_review';
        txHash = null;
      } else {
        updateTaskStatus(taskId, 'passed_pending', {});
        taskStatusAfter = 'passed_pending';
        txHash = null;
      }
    } else {
      updateTaskStatus(taskId, 'failed');
      updateSubmissionStatus(submissionRowId, 'failed');
      taskStatusAfter = 'failed';
      payoutDeferred = false;
    }

    res.json({
      success: true,
      result: {
        mode: evaluation.mode,
        score: evaluation.score,
        verdict: evaluation.verdict,
        reason: evaluation.summary,
        proof: evaluation.proof,
      },
      payment: {
        txHash,
        payoutDeferred,
        taskStatus: taskStatusAfter,
      },
    });
  } catch (error) {
    console.error('Evaluation Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const raiseDispute = async (req, res) => {
  try {
    const { taskId, submissionId, reason, wallet } = req.body;

    if (!taskId || !submissionId || !reason || typeof reason !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'taskId, submissionId, and reason are required',
      });
    }

    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ success: false, message: 'wallet is required (must match creator or contributor)' });
    }

    const task = getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const submission = getSubmissionById(submissionId);
    if (!submission || submission.taskId !== taskId) {
      return res.status(404).json({ success: false, message: 'Submission not found for this task' });
    }

    if (task.disputeStatus === 'raised') {
      return res.status(400).json({ success: false, message: 'A dispute is already open for this task' });
    }

    if (!DISPUTE_RAISEABLE.has(task.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot raise dispute in status "${task.status}"`,
      });
    }

    const isParty =
      wallet.trim().toLowerCase() === String(task.creatorWallet || '').trim().toLowerCase() ||
      wallet.trim().toLowerCase() === String(submission.contributorWallet || '').trim().toLowerCase();

    if (!isParty) {
      return res.status(403).json({ success: false, message: 'wallet does not match creator or contributor' });
    }

    const trimmedReason = reason.trim().slice(0, 4000);

    updateTaskStatus(taskId, 'under_review', {
      disputeStatus: 'raised',
      disputeReason: trimmedReason,
    });

    updateSubmissionMerge(submissionId, {
      disputeStatus: 'raised',
      disputeReason: trimmedReason,
    });

    res.json({
      success: true,
      task: getTaskById(taskId),
      submission: getSubmissionById(submissionId),
    });
  } catch (error) {
    console.error('raiseDispute:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

function assertAdmin(req) {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) {
    return { ok: false, message: 'ADMIN_SECRET is not configured on the server' };
  }
  const provided =
    (req.headers['x-admin-secret'] && String(req.headers['x-admin-secret'])) ||
    (req.body && req.body.adminSecret && String(req.body.adminSecret));
  if (provided !== secret) {
    return { ok: false, message: 'Invalid admin credentials' };
  }
  return { ok: true };
}

export const resolveDispute = async (req, res) => {
  try {
    const auth = assertAdmin(req);
    if (!auth.ok) {
      return res.status(403).json({ success: false, message: auth.message });
    }

    const { taskId, submissionId, outcome } = req.body;

    if (!taskId || !outcome) {
      return res.status(400).json({ success: false, message: 'taskId and outcome (PASS|FAIL) are required' });
    }

    const verdict = String(outcome).trim().toUpperCase();
    if (verdict !== 'PASS' && verdict !== 'FAIL') {
      return res.status(400).json({ success: false, message: 'outcome must be PASS or FAIL' });
    }

    const task = getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.disputeStatus !== 'raised') {
      return res.status(400).json({ success: false, message: 'No open dispute to resolve' });
    }

    let submission = submissionId ? getSubmissionById(submissionId) : null;
    if (!submission) {
      const list = getSubmissionsByTaskId(taskId);
      submission = list[list.length - 1] || null;
    }
    if (!submission || submission.taskId !== taskId) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const sid = submission.id;
    let txHash = null;

    if (verdict === 'PASS') {
      txHash = await releasePayment(task.onChainTaskId, submission.contributorWallet);
      updateTaskStatus(taskId, 'paid', {
        disputeStatus: 'resolved',
      });
      updateSubmissionMerge(sid, {
        status: 'passed',
        disputeStatus: 'resolved',
      });
      incrementContributorTrust(submission.contributorWallet, task.isVerifiable !== false);
    } else {
      updateTaskStatus(taskId, 'failed', {
        disputeStatus: 'resolved',
      });
      updateSubmissionMerge(sid, {
        status: 'failed',
        disputeStatus: 'resolved',
      });
    }

    res.json({
      success: true,
      outcome: verdict,
      payment: { txHash },
      task: getTaskById(taskId),
      submission: getSubmissionById(sid),
    });
  } catch (error) {
    console.error('resolveDispute:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const finalizePayout = async (req, res) => {
  try {
    const { taskId, wallet } = req.body;

    if (!taskId || !wallet) {
      return res.status(400).json({ success: false, message: 'taskId and wallet are required' });
    }

    const task = getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.status !== 'passed_pending') {
      return res.status(400).json({
        success: false,
        message: 'Task must be in passed_pending state to finalize payout',
      });
    }

    if (task.disputeStatus === 'raised') {
      return res.status(400).json({
        success: false,
        message: 'Cannot release funds while a dispute is open',
      });
    }

    const creatorOk =
      wallet.trim().toLowerCase() === String(task.creatorWallet || '').trim().toLowerCase();
    if (!creatorOk) {
      return res.status(403).json({ success: false, message: 'Only the task creator wallet can finalize payout' });
    }

    const submissions = getSubmissionsByTaskId(taskId);
    const latest = submissions[submissions.length - 1];
    if (!latest || latest.status !== 'passed') {
      return res.status(400).json({ success: false, message: 'No passed submission found for payout' });
    }

    const txHash = await releasePayment(task.onChainTaskId, latest.contributorWallet);

    updateTaskStatus(taskId, 'paid', {});
    updateSubmissionMerge(latest.id, { status: 'passed' });
    incrementContributorTrust(latest.contributorWallet, task.isVerifiable !== false);

    res.json({
      success: true,
      payment: { txHash },
      task: getTaskById(taskId),
    });
  } catch (error) {
    console.error('finalizePayout:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
