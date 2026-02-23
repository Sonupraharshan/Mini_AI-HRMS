import express from 'express';
import { sendCustomMail, getMailLogs } from '../controllers/mailController.js';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/send', authenticateToken, requireAdmin, sendCustomMail);
router.get('/logs', authenticateToken, requireAdmin, getMailLogs);

export default router;
