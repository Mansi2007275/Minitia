import express from 'express';
import {
  submitWork,
  evaluateWork,
  raiseDispute,
  resolveDispute,
  finalizePayout,
} from '../controllers/submissionController.js';

const router = express.Router();

router.post('/submit-work', submitWork);
router.post('/evaluate-submission', evaluateWork);
router.post('/raise-dispute', raiseDispute);
router.post('/resolve-dispute', resolveDispute);
router.post('/finalize-payout', finalizePayout);

export default router;
