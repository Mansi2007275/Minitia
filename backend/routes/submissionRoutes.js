import express from 'express';
import { submitWork, evaluateWork } from '../controllers/submissionController.js';

const router = express.Router();

router.post('/submit-work', submitWork);
router.post('/evaluate-submission', evaluateWork);

export default router;
