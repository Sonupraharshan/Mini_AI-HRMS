import bcrypt from 'bcrypt';
import prisma from '../prismaClient.js';
import crypto from 'crypto';
import { sendEmail } from '../utils/emailService.js';

export const createRoster = async (req, res) => {
  try {
    const { name, adminName, adminEmail, adminPassword } = req.body;
    const { orgId, role } = req.user;
    
    if (role !== 'ADMIN') return res.status(403).json({ error: 'Only admins can create rosters' });
    
    // Check if the admin email already exists
    const existingUser = await prisma.employee.findUnique({
      where: { email: adminEmail }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this admin email already exists' });
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviter = await prisma.employee.findUnique({ where: { id: req.user.userId } });
    
    // Create the roster and the new admin together in a transaction
    const roster = await prisma.$transaction(async (tx) => {
      // Create user first
      const admin = await tx.employee.create({
        data: {
          orgId,
          name: adminName,
          email: adminEmail,
          passwordHash,
          role: 'ADMIN',
          department: 'Management',
          skills: [],
          status: 'PENDING',
          inviteToken
        }
      });
      
      // Create roster owned by user
      const newRoster = await tx.roster.create({
        data: {
          name,
          orgId,
          adminId: admin.id
        }
      });
      
      // Update admin to point to their new roster
      await tx.employee.update({
        where: { id: admin.id },
        data: { rosterId: newRoster.id }
      });
      
      return newRoster;
    });
    
    const verifyLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${inviteToken}`;
    
    await sendEmail(
      inviter.email,
      inviter.smtpPassword,
      adminEmail,
      'You are invited to manage a new Roster!',
      `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to Mini AI-HRMS!</h2>
        <p><strong>${inviter.name}</strong> has invited you to administrate the <strong>${name}</strong> Roster.</p>
        <p>Please click the button below to accept the invitation and activate your new Admin account:</p>
        <a href="${verifyLink}" style="display:inline-block; padding: 10px 20px; color: white; background-color: #2563eb; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
      </div>
      `
    );

    res.status(201).json(roster);
  } catch (error) {
    console.error('Create Roster Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRosters = async (req, res) => {
  try {
    const { orgId, role } = req.user;
    
    if (role !== 'ADMIN') return res.status(403).json({ error: 'Only admins can view all rosters' });
    
    const rosters = await prisma.roster.findMany({
      where: { orgId },
      include: {
        _count: {
          select: { employees: true, tasks: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(rosters);
  } catch (error) {
    console.error('Get Rosters Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRosterById = async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId, role, rosterId } = req.user;
    
    if (role !== 'ADMIN' && rosterId !== id) {
      return res.status(403).json({ error: 'Not authorized to view this roster' });
    }
    
    const roster = await prisma.roster.findUnique({
      where: { id, orgId },
      include: {
        employees: true,
        tasks: {
          include: { assignee: true }
        }
      }
    });
    
    if (!roster) return res.status(404).json({ error: 'Roster not found' });
    
    res.json(roster);
  } catch (error) {
    console.error('Get Roster Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
