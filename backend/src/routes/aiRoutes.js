import express from 'express';
import { getProductivityScore, smartAssign, smartAssignDraft } from '../controllers/aiController.js';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin); // AI insights are admin-only in this demo

router.get('/productivity/:employeeId', getProductivityScore);
router.post('/smart-assign', smartAssign);
router.post('/smart-assign-draft', smartAssignDraft);

export default router;
