import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient.js';
import { sendEmail } from '../utils/emailService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_change_in_production';

export const registerOrgAndAdmin = async (req, res) => {
  try {
    const { orgName, adminName, adminEmail, adminPassword } = req.body;

    // Check if employee/admin already exists
    const existingUser = await prisma.employee.findUnique({
      where: { email: adminEmail }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create organization and admin inside a transaction
    const [organization, admin, roster] = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: orgName }
      });

      const user = await tx.employee.create({
        data: {
          orgId: org.id,
          name: adminName,
          email: adminEmail,
          passwordHash,
          role: 'ADMIN',
          department: 'Management',
          skills: []
        }
      });
      
      const newRoster = await tx.roster.create({
        data: {
          name: 'Main Roster',
          orgId: org.id,
          adminId: user.id
        }
      });
      
      await tx.employee.update({
        where: { id: user.id },
        data: { rosterId: newRoster.id }
      });

      return [org, user, newRoster];
    });

    const token = jwt.sign({ userId: admin.id, orgId: organization.id, role: admin.role, rosterId: roster.id }, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({
      message: 'Organization and Admin registered successfully',
      organization,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      },
      token
    });

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.employee.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status === 'PENDING') {
      return res.status(403).json({ error: 'Your account is pending verification. Please check your email for the invitation link.' });
    }

    const token = jwt.sign({ userId: user.id, orgId: user.orgId, role: user.role, rosterId: user.rosterId }, JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
        rosterId: user.rosterId,
        walletAddress: user.walletAddress
      },
      token
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const me = async (req, res) => {
  try {
    const user = await prisma.employee.findUnique({
      where: { id: req.user.userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      rosterId: user.rosterId,
      walletAddress: user.walletAddress,
      hasSmtpPassword: !!user.smtpPassword
    });
  } catch (error) {
    console.error('Fetch Me Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSmtpPassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { smtpPassword } = req.body;

    if (!smtpPassword) {
      return res.status(400).json({ error: 'SMTP Password is required' });
    }

    await prisma.employee.update({
      where: { id: userId },
      data: { smtpPassword }
    });

    res.json({ message: 'SMTP Password updated successfully' });
  } catch (error) {
    console.error('Update SMTP Password Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyAccount = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await prisma.employee.findFirst({ where: { inviteToken: token } });

    if (!user || user.status !== 'PENDING') {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    await prisma.employee.update({
      where: { id: user.id },
      data: { status: 'ACTIVE', inviteToken: null }
    });

    let notifyingAdminEmail = null;
    let notifyingAppPassword = null;
    if (user.rosterId) {
         const roster = await prisma.roster.findUnique({ where: { id: user.rosterId }, include: { admin: true } });
         if (roster && roster.admin) {
             notifyingAdminEmail = roster.admin.email;
             notifyingAppPassword = roster.admin.smtpPassword;
         }
    }
    
    if (notifyingAdminEmail) {
        await sendEmail(
            notifyingAdminEmail, // Using admin email as the 'from' since it's the only one with credentials
            notifyingAppPassword,
            notifyingAdminEmail, // Sending to themselves
            'Team Member Joined!',
            `<div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Great news!</h2>
              <p><strong>${user.name}</strong> has accepted their invitation and joined your roster.</p>
            </div>`
        );
    }

    res.json({ message: 'Account verified successfully' });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
