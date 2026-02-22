import prisma from '../prismaClient.js';

export const getTasks = async (req, res) => {
  try {
    const { orgId, userId, role, rosterId } = req.user;
    const queryRosterId = req.query.rosterId;
    
    // Admins see all tasks (or filter by query), employees see their roster's tasks
    let whereClause = { orgId };
    if (role === 'ADMIN') {
        if (queryRosterId) whereClause.rosterId = queryRosterId;
    } else {
        whereClause.rosterId = rosterId;
    }
    
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        assignee: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTask = async (req, res) => {
  try {
    const { orgId, userId } = req.user;
    const { title, description, assigneeId, complexityScore, rosterId } = req.body;

    const roster = await prisma.roster.findUnique({ where: { id: rosterId } });
    if (!roster || roster.adminId !== userId) {
        return res.status(403).json({ error: 'Access Denied: Admins can only assign tasks to their own roster' });
    }

    const task = await prisma.task.create({
      data: {
        orgId,
        title,
        description,
        assigneeId: assigneeId || null,
        complexityScore: complexityScore || 1,
        rosterId: rosterId || null
      }
    });

    res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, txHash } = req.body;
    const { userId, role } = req.user;

    const task = await prisma.task.findUnique({ where: { id } });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Only task assignees can update the task status
    if (role === 'ADMIN') {
      return res.status(403).json({ error: 'Admins can assign tasks but cannot complete them. Only the assigned employee can update this task.' });
    }
    
    if (task.assigneeId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }

    const updateData = { status };
    if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
    }
    if (txHash) {
        updateData.txHash = txHash;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData
    });

    res.json({ message: 'Task updated successfully', task: updatedTask });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
