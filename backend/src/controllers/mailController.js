import prisma from '../prismaClient.js';
import { sendEmail } from '../utils/emailService.js';

export const sendCustomMail = async (req, res) => {
    try {
        const { subject, body, targetType, targetId } = req.body;
        // targetType: 'ROSTER' | 'ORGANIZATION' | 'EMPLOYEE'
        const { userId, role } = req.user;

        if (role !== 'ADMIN') return res.status(403).json({ error: 'Only admins can send custom mails' });

        const admin = await prisma.admin.findUnique({
            where: { id: userId },
            include: { organization: true }
        });

        let recipientEmails = [];
        let orgId = null;
        let rosterId = null;

        if (targetType === 'ORGANIZATION') {
            const allEmployees = await prisma.employee.findMany({
                where: { roster: { admin: { orgId: admin.orgId } } }
            });
            recipientEmails = allEmployees.map(e => e.email);
            orgId = admin.orgId;
        } else if (targetType === 'ROSTER') {
            const roster = await prisma.roster.findUnique({ where: { id: targetId } });
            if (!roster || roster.adminId !== userId) return res.status(403).json({ error: 'Access denied to this roster' });
            
            const employees = await prisma.employee.findMany({ where: { rosterId: targetId } });
            recipientEmails = employees.map(e => e.email);
            rosterId = targetId;
        } else if (targetType === 'EMPLOYEE') {
            const employee = await prisma.employee.findUnique({ 
                where: { id: targetId },
                include: { roster: true }
            });
            if (!employee || employee.roster.adminId !== userId) return res.status(403).json({ error: 'Access denied to this employee' });
            recipientEmails = [employee.email];
            rosterId = employee.rosterId;
        } else if (targetType === 'INDIVIDUALS') {
            const { targetIds } = req.body;
            if (!Array.isArray(targetIds) || targetIds.length === 0) return res.status(400).json({ error: 'No individuals selected' });
            
            const employees = await prisma.employee.findMany({ 
                where: { 
                    id: { in: targetIds },
                    roster: { admin: { orgId: admin.orgId } }
                } 
            });
            recipientEmails = employees.map(e => e.email);
            orgId = admin.orgId;
        }

        if (recipientEmails.length === 0) return res.status(400).json({ error: 'No recipients found' });

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Message from ${admin.name}</h2>
                <div style="margin-top: 15px;">
                    ${body.replace(/\n/g, '<br/>')}
                </div>
            </div>
        `;

        for (const email of recipientEmails) {
             await sendEmail(email, subject, htmlContent, admin.name, admin.organization.name, admin.email);
             
             await prisma.mail.create({
                 data: {
                     subject,
                     body,
                     type: 'CUSTOM',
                     senderId: userId,
                     orgId,
                     rosterId,
                     recipientEmail: email
                 }
             });
        }

        res.json({ message: `Mail sent to ${recipientEmails.length} recipients successfully.` });

    } catch (error) {
        console.error('Send Custom Mail Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getMailLogs = async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { rosterId, orgId } = req.query;

        if (role !== 'ADMIN') return res.status(403).json({ error: 'Only admins can view mail logs' });

        const admin = await prisma.admin.findUnique({ where: { id: userId }});

        let filterConditions = [
           {
              OR: [
                 { senderId: userId },
                 { recipientEmail: admin.email }
              ]
           }
        ];
        if (rosterId) filterConditions.push({ rosterId });
        if (orgId) filterConditions.push({ orgId });

        const mails = await prisma.mail.findMany({
            where: {
               AND: filterConditions
            },
            include: {
               sender: {
                   select: { name: true, email: true }
               }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(mails);
    } catch (error) {
        console.error('Get Mail Logs Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
