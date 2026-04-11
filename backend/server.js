import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import taskRoutes from './routes/taskRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Strict Endpoints Requirement
app.use('/tasks', taskRoutes);
app.use('/', submissionRoutes); // /submit-work, /evaluate-submission

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
