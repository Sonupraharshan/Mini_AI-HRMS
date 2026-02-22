import express from 'express';
import { createRoster, getRosters, getRosterById } from '../controllers/rosterController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', createRoster);
router.get('/', getRosters);
router.get('/:id', getRosterById);

export default router;
