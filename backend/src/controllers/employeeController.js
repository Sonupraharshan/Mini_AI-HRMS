import prisma from '../prismaClient.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendEmail } from '../utils/emailService.js';

export const getEmployees = async (req, res) => {
  try {
    const { role, userId, rosterId } = req.user;
    
    let filter = {};
    
    if (role === 'ADMIN') {
        if (req.query.rosterId) {
            // Verify admin owns the roster
            const roster = await prisma.roster.findUnique({ where: { id: req.query.rosterId } });
            if (!roster || roster.adminId !== userId) {
                return res.status(403).json({ error: 'Not authorized for this roster' });
            }
            filter.rosterId = req.query.rosterId;
        } else {
            // See all employees out of all rosters the admin owns
            filter.roster = { adminId: userId };
        }
    } else {
        // Standard employees see peers in their exact roster
        filter.rosterId = rosterId;
    }
    
    const employees = await prisma.employee.findMany({
      where: filter,
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        skills: true,
        walletAddress: true,
        rosterId: true,
        status: true,
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
    const { role: adminRole, userId } = req.user; 
    
    if (adminRole !== 'ADMIN') return res.status(403).json({ error: 'Only admins can add employees' });
    
    const { name, email, password, department, skills, walletAddress, rosterId } = req.body;

    if (!rosterId) return res.status(400).json({ error: 'rosterId is required' });

    const adminUser = await prisma.admin.findUnique({ 
      where: { id: userId },
      include: { organization: true }
    });

    const roster = await prisma.roster.findUnique({ where: { id: rosterId } });
    if (!roster || roster.adminId !== userId) {
        return res.status(403).json({ error: 'Access Denied: Admins can only hire members to their own roster' });
    }

    const existingAdmin = await prisma.admin.findUnique({ where: { email } });
    const existingEmployee = await prisma.employee.findUnique({ where: { email } });

    if (existingAdmin || existingEmployee) {
      return res.status(400).json({ error: 'Account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const inviteToken = crypto.randomBytes(32).toString('hex');

    const employee = await prisma.employee.create({
      data: {
        rosterId,
        name,
        email,
        passwordHash,
        department,
        skills: skills || [],
        walletAddress: walletAddress || null,
        status: 'PENDING',
        inviteToken
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
      }
    });

    const verifyLink = `${req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${inviteToken}`;
    
    const emailResult = await sendEmail(
      email,
      'You are invited to join Mini AI-HRMS!',
      `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to ${adminUser.organization?.name || 'Mini AI-HRMS'}!</h2>
        <p><strong>${adminUser.name}</strong> has invited you to join the <strong>${roster.name}</strong> Roster.</p>
        <p>Please click the link below to accept the invitation and activate your account:</p>
        <a href="${verifyLink}" style="display:inline-block; padding: 10px 20px; color: white; background-color: #2563eb; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
        <br><br>
        <p>Your temporary password is: <strong>${password}</strong></p>
        <p><em>Please make sure to login and change your password as soon as possible.</em></p>
      </div>`,
      adminUser.name,
      adminUser.organization?.name,
      adminUser.email
    );

    await prisma.mail.create({
      data: {
        subject: 'You are invited to join Mini AI-HRMS!',
        body: `Invitation sent to ${email} for roster ${roster.name}`,
        type: 'INVITATION',
        senderId: userId,
        orgId: adminUser.orgId,
        rosterId: rosterId,
        recipientEmail: email
      }
    });

    res.status(201).json({ 
        message: 'Employee created successfully. Invitation sent!', 
        employee,
        previewUrl: emailResult.previewUrl
    });
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

export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { role: adminRole, userId } = req.user;
    
    if (adminRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can delete employees' });
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { roster: true }
    });

    if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
    }

    if (employee.roster.adminId !== userId) {
        return res.status(403).json({ error: 'Access Denied: You cannot delete employees outside your rosters.' });
    }

    await prisma.employee.delete({
      where: { id }
    });

    res.json({ message: 'Employee successfully removed from the roster.' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
