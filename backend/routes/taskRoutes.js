import express from 'express';
import { generateTask, createNewTask, getTasks, getTaskDetails } from '../controllers/taskController.js';

const router = express.Router();

router.post('/generate', generateTask);
router.post('/', createNewTask);
router.get('/', getTasks);
router.get('/:id', getTaskDetails);

export default router;
