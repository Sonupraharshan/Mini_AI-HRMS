import express from 'express';
import { getEmployees, createEmployee, updateWalletAddress, deleteEmployee } from '../controllers/employeeController.js';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken); // Protect all employee routes

router.get('/', getEmployees);
router.post('/', requireAdmin, createEmployee);
router.put('/wallet', updateWalletAddress);
router.delete('/:id', requireAdmin, deleteEmployee);

export default router;
