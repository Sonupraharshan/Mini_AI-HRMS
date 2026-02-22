import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken); // Protect dashboard routes

router.get('/', getDashboardStats);

export default router;
