import express from 'express';
import { getTasks, createTask, updateTaskStatus } from '../controllers/taskController.js';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken); // Protect all task routes

router.get('/', getTasks);
router.post('/', requireAdmin, createTask);
router.put('/:id/status', updateTaskStatus);

export default router;
