import prisma from '../prismaClient.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendEmail } from '../utils/emailService.js';

export const getEmployees = async (req, res) => {
  try {
    const { orgId, role, rosterId } = req.user;
    
    // Admins can query any rosterId via req.query.rosterId, otherwise they see all org employees.
    // Standard employees are securely locked to their token's rosterId.
    let filter = { orgId };
    
    if (role === 'ADMIN') {
        if (req.query.rosterId) {
            filter.rosterId = req.query.rosterId;
        }
    } else {
        filter.rosterId = rosterId;
    }
    
    const employees = await prisma.employee.findMany({
      where: filter,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        skills: true,
        walletAddress: true,
        rosterId: true,
        roster: { select: { name: true } },
        createdAt: true
      }
    });
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const { orgId, role: adminRole, userId } = req.user; 
    
    if (adminRole !== 'ADMIN') return res.status(403).json({ error: 'Only admins can add employees' });
    
    const { name, email, password, role, department, skills, walletAddress, rosterId } = req.body;

    const roster = await prisma.roster.findUnique({ where: { id: rosterId } });
    if (!roster || roster.adminId !== userId) {
        return res.status(403).json({ error: 'Access Denied: Admins can only hire members to their own roster' });
    }

    const existingUser = await prisma.employee.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Employee with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const inviteToken = crypto.randomBytes(32).toString('hex');

    const employee = await prisma.employee.create({
      data: {
        orgId,
        name,
        email,
        passwordHash,
        role: role || 'EMPLOYEE',
        department,
        skills: skills || [],
        walletAddress: walletAddress || null,
        rosterId: rosterId || null,
        status: 'PENDING',
        inviteToken
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
      }
    });

    const adminUser = await prisma.employee.findUnique({ where: { id: userId } });
    const verifyLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${inviteToken}`;
    
    // Fire off the welcome email!
    await sendEmail(
      adminUser.email,
      adminUser.smtpPassword,
      email,
      'You are invited to join Mini AI-HRMS!',
      `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to Mini AI-HRMS!</h2>
        <p><strong>${adminUser.name}</strong> has invited you to join their team as a <strong>${role || 'EMPLOYEE'}</strong>.</p>
        <p>Please click the link below to accept the invitation and activate your account:</p>
        <a href="${verifyLink}" style="display:inline-block; padding: 10px 20px; color: white; background-color: #2563eb; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
      </div>
      `
    );

    res.status(201).json({ message: 'Employee created successfully. Invitation sent!', employee });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateWalletAddress = async (req, res) => {
  try {
    const employeeId = req.user.userId;
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: { walletAddress },
      select: { id: true, walletAddress: true }
    });

    res.json({ message: 'Wallet address updated', employee });
  } catch (error) {
    console.error('Error updating wallet address:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
