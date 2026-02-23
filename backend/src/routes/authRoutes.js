import express from 'express';
import { registerOrgAndAdmin, login, me, verifyAccount } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', registerOrgAndAdmin);
router.post('/login', login);
router.get('/me', authenticateToken, me);
router.get('/verify/:token', verifyAccount);

export default router;
