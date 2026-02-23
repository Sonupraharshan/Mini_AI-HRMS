import bcrypt from 'bcrypt';
import prisma from '../prismaClient.js';
import crypto from 'crypto';
import { sendEmail } from '../utils/emailService.js';

export const createRoster = async (req, res) => {
  try {
    const { name, adminName, adminEmail, adminPassword } = req.body;
    const { role } = req.user;
    
    if (role !== 'ADMIN') return res.status(403).json({ error: 'Only admins can create rosters' });
    
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      return res.status(400).json({ error: 'User with this admin email already exists' });
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviter = await prisma.admin.findUnique({ 
      where: { id: req.user.userId },
      include: { organization: true }
    });
    
    const roster = await prisma.$transaction(async (tx) => {
      const admin = await tx.admin.create({
        data: {
          orgId: inviter.orgId,
          name: adminName,
          email: adminEmail,
          passwordHash,
          status: 'PENDING',
          inviteToken
        }
      });
      
      const newRoster = await tx.roster.create({
        data: {
          name,
          adminId: admin.id
        }
      });
      
      return newRoster;
    });
    
    const verifyLink = `${req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${inviteToken}`;
    
    await sendEmail(
      adminEmail,
      'You are invited to manage a new Roster!',
      `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to ${inviter.organization?.name || 'Mini AI-HRMS'}!</h2>
        <p><strong>${inviter.name}</strong> has invited you to administrate the <strong>${name}</strong> Roster.</p>
        <p>Please click the button below to accept the invitation and activate your new Admin account:</p>
        <a href="${verifyLink}" style="display:inline-block; padding: 10px 20px; color: white; background-color: #2563eb; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
      </div>
      `,
      inviter.name,
      inviter.organization?.name,
      inviter.email
    );

    // Track the mail inside the DB
    await prisma.mail.create({
      data: {
        subject: 'You are invited to manage a new Roster!',
        body: `Invitation sent to ${adminEmail}`,
        type: 'INVITATION',
        senderId: req.user.userId,
        orgId: inviter.orgId,
        rosterId: roster.id,
        recipientEmail: adminEmail
      }
    });

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
      where: { admin: { orgId } },
      include: {
        admin: {
          select: { name: true, email: true, status: true }
        },
        _count: {
          select: { employees: true }
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
    
    let whereClause = { id };
    if (role === 'ADMIN') {
        whereClause.admin = { orgId }; // Security check
    }

    const roster = await prisma.roster.findUnique({
      where: whereClause,
      include: {
        admin: {
          select: { name: true, email: true, status: true }
        },
        employees: {
          include: {
            tasks: {
              include: { employee: true }
            }
          }
        }
      }
    });
    
    if (!roster) return res.status(404).json({ error: 'Roster not found' });

    // Flatten tasks into roster object so frontend continues to work with roster.tasks array
    const allTasks = roster.employees.flatMap(emp => 
        emp.tasks.map(task => ({
            ...task,
            assignee: task.employee
        }))
    );

    res.json({ ...roster, tasks: allTasks });
  } catch (error) {
    console.error('Get Roster Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
