import express from 'express';
import {
  generateTask,
  createNewTask,
  getTasks,
  getTaskDetails,
  getTaskSubmissions,
  getContributorTrustEndpoint,
} from '../controllers/taskController.js';

const router = express.Router();

router.post('/generate', generateTask);
router.post('/', createNewTask);
router.get('/', getTasks);
router.get('/trust/:wallet', getContributorTrustEndpoint);
router.get('/:id/submissions', getTaskSubmissions);
router.get('/:id', getTaskDetails);

export default router;
