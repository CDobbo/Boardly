import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { initDatabase } from './db/index.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import boardRoutes from './routes/boards.js';
import taskRoutes from './routes/tasks.js';
import adminRoutes from './routes/admin.js';
import eventRoutes from './routes/events.js';
import diaryRoutes from './routes/diary.js';
import goalRoutes from './routes/goals.js';
import testRoutes from './routes/tests.js';
import testSimpleRoutes from './routes/tests-simple.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;

// Trust proxy headers (required for Render and other hosting services)
app.set('trust proxy', true);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Increased to 10000 requests per window for testing
  message: 'Too many requests, please try again later.'
});

app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow all localhost origins
    if (origin.includes('localhost')) return callback(null, true);
    
    // Allow all Vercel deployments
    if (origin.includes('vercel.app')) return callback(null, true);
    
    // Allow specific origins
    const allowedOrigins = [
      'https://boardly-552zeqlhs-cdobbos-projects.vercel.app',
      'https://boardly-iota.vercel.app'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));
app.use(express.json());
app.use('/api/', limiter);

initDatabase();

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/tests-simple', testSimpleRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});