import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import taskRoutes from './routes/taskRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';

dotenv.config();

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(
  cors({
    origin: [corsOrigin, 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
  })
);
app.use(express.json({ limit: '512kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'minitia-api' });
});

// Strict Endpoints Requirement
app.use('/tasks', taskRoutes);
app.use('/', submissionRoutes); // /submit-work, /evaluate-submission

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
