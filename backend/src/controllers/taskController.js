import prisma from '../prismaClient.js';

export const getTasks = async (req, res) => {
  try {
    const { userId, role, rosterId } = req.user;
    const queryRosterId = req.query.rosterId;
    
    let whereClause = {};
    if (role === 'ADMIN') {
        whereClause.employee = { roster: { adminId: userId } };
        if (queryRosterId) {
            whereClause.employee.rosterId = queryRosterId;
        }
    } else {
        whereClause.employee = { rosterId };
    }
    
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        employee: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Map employee to assignee to maintain frontend compatibility
    const mappedTasks = tasks.map(t => ({
      ...t,
      assigneeId: t.employeeId,
      assignee: t.employee
    }));

    res.json(mappedTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTask = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { title, description, assigneeId, complexityScore } = req.body;

    if (role !== 'ADMIN') return res.status(403).json({ error: 'Only admins can create tasks' });
    if (!assigneeId) return res.status(400).json({ error: 'assigneeId is required' });

    const employee = await prisma.employee.findUnique({ 
        where: { id: assigneeId },
        include: { roster: true }
    });

    if (!employee || employee.roster.adminId !== userId) {
        return res.status(403).json({ error: 'Access Denied: Admins can only assign tasks to employees within their own rosters' });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        employeeId: assigneeId,
        complexityScore: complexityScore || 1
      },
      include: {
        employee: true
      }
    });

    // Map output for frontend
    res.status(201).json({ 
        message: 'Task created successfully', 
        task: { ...task, assigneeId: task.employeeId, assignee: task.employee } 
    });
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

    if (role === 'ADMIN') {
      return res.status(403).json({ error: 'Admins can assign tasks but cannot complete them. Only the assigned employee can update this task.' });
    }
    
    if (task.employeeId !== userId) {
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
