import jwt from 'jsonwebtoken';
import prisma from '../prismaClient.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_change_in_production';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    
    try {
        let dbUser;
        if (user.role === 'ADMIN') {
             dbUser = await prisma.admin.findUnique({ where: { id: user.userId } });
             if (!dbUser) return res.status(401).json({ error: 'Admin no longer exists' });
             req.user = { ...user, orgId: dbUser.orgId };
        } else {
             dbUser = await prisma.employee.findUnique({ where: { id: user.userId } });
             if (!dbUser) return res.status(401).json({ error: 'Employee no longer exists' });
             req.user = { ...user, rosterId: dbUser.rosterId };
        }
        next();
    } catch (e) {
        return res.status(500).json({ error: 'Database token verification failed' });
    }
  });
};

export const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};
