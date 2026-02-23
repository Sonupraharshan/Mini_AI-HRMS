import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient.js';
import { sendEmail } from '../utils/emailService.js';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_change_in_production';

export const registerOrgAndAdmin = async (req, res) => {
  try {
    const { orgName, adminName, adminEmail, adminPassword } = req.body;

    const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } });
    const existingEmployee = await prisma.employee.findUnique({ where: { email: adminEmail } });

    if (existingAdmin || existingEmployee) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const inviteToken = crypto.randomBytes(32).toString('hex');

    const [organization, admin, roster] = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: orgName }
      });

      const newAdmin = await tx.admin.create({
        data: {
          orgId: org.id,
          name: adminName,
          email: adminEmail,
          passwordHash,
          status: 'PENDING',
          inviteToken
        }
      });
      
      const newRoster = await tx.roster.create({
        data: {
          name: 'Main Roster',
          adminId: newAdmin.id
        }
      });
      
      return [org, newAdmin, newRoster];
    });

    const verificationLink = `${req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${inviteToken}`;

    const emailResult = await sendEmail(
      adminEmail,
      'Welcome to Mini AI-HRMS! Please verify your email.',
      `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to Mini AI-HRMS, ${adminName}!</h2>
        <p>Your organization <strong>${orgName}</strong> has been successfully registered.</p>
        <p>To finish setting up your Admin account, please verify your email address by clicking the link below:</p>
        <a href="${verificationLink}" style="display:inline-block; padding:10px 20px; color:#fff; background-color:#1e3a8a; text-decoration:none; border-radius:5px;">Verify My Email</a>
      </div>`,
      'System Admin',
      orgName,
      process.env.SMTP_USER
    );

    await prisma.mail.create({
      data: {
        subject: 'Welcome to Mini AI-HRMS! Please verify your email.',
        body: `Organization ${orgName} registered. Verification link sent to ${adminEmail}`,
        type: 'INVITATION',
        senderId: admin.id,
        orgId: organization.id,
        rosterId: roster.id,
        recipientEmail: adminEmail
      }
    });

    res.status(201).json({
      message: 'Organization registered successfully! Please check your email to verify your account.',
      organization,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: 'ADMIN',
        orgId: admin.orgId
      },
      previewUrl: emailResult.previewUrl
    });

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await prisma.admin.findUnique({ where: { email } });
    let role = 'ADMIN';

    if (!user) {
      user = await prisma.employee.findUnique({ where: { email } });
      role = 'EMPLOYEE';
    }

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

    const tokenPayload = { userId: user.id, role };
    if (role === 'ADMIN') tokenPayload.orgId = user.orgId;
    if (role === 'EMPLOYEE') tokenPayload.rosterId = user.rosterId;

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role,
        ...(role === 'ADMIN' ? { orgId: user.orgId } : { rosterId: user.rosterId, walletAddress: user.walletAddress })
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
    let user;
    let role = req.user.role;

    if (role === 'ADMIN') {
      user = await prisma.admin.findUnique({ where: { id: req.user.userId } });
    } else {
      user = await prisma.employee.findUnique({ where: { id: req.user.userId } });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role,
      ...(role === 'ADMIN' ? { orgId: user.orgId } : { rosterId: user.rosterId, walletAddress: user.walletAddress })
    });
  } catch (error) {
    console.error('Fetch Me Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyAccount = async (req, res) => {
  try {
    const { token } = req.params;
    let user = await prisma.admin.findFirst({ 
      where: { inviteToken: token },
      include: { organization: true }
    });
    let role = 'ADMIN';

    if (!user) {
      user = await prisma.employee.findFirst({ 
        where: { inviteToken: token },
        include: { roster: { include: { admin: { include: { organization: true } } } } }
      });
      role = 'EMPLOYEE';
    }

    if (!user || user.status !== 'PENDING') {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    if (role === 'ADMIN') {
      await prisma.admin.update({
        where: { id: user.id },
        data: { status: 'ACTIVE', inviteToken: null }
      });
      
    } else {
      await prisma.employee.update({
        where: { id: user.id },
        data: { status: 'ACTIVE', inviteToken: null }
      });

      const notifyingAdminEmail = user.roster?.admin?.email;
      if (notifyingAdminEmail) {
          await sendEmail(
              notifyingAdminEmail, 
              'Team Member Joined!',
              `<div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Great news!</h2>
                <p><strong>${user.name}</strong> has accepted their invitation and joined your roster.</p>
              </div>`,
              user.name,
              null,
              user.email
          );
      }
    }

    const tokenPayload = { userId: user.id, role };
    if (role === 'ADMIN') tokenPayload.orgId = user.orgId;
    if (role === 'EMPLOYEE') tokenPayload.rosterId = user.rosterId;

    const tokenJwt = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({
      message: 'Account verified successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role,
        ...(role === 'ADMIN' ? { orgId: user.orgId } : { rosterId: user.rosterId, walletAddress: user.walletAddress })
      },
      token: tokenJwt
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
