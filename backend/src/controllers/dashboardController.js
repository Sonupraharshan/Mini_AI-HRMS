import prisma from '../prismaClient.js';

export const getDashboardStats = async (req, res) => {
  try {
    const { orgId, userId, role, rosterId } = req.user;
    const queryRosterId = req.query.rosterId;

    let employeeQuery = { orgId };
    let taskQuery = { orgId };

    if (role === 'ADMIN') {
        if (queryRosterId) {
            employeeQuery.rosterId = queryRosterId;
            taskQuery.rosterId = queryRosterId;
        }
    } else {
        employeeQuery.rosterId = rosterId;
        taskQuery.assigneeId = userId;
        taskQuery.rosterId = rosterId;
    }

    const [totalEmployees, taskList] = await Promise.all([
      prisma.employee.count({ where: employeeQuery }),
      prisma.task.findMany({ where: taskQuery })
    ]);

    const assignedTasks = taskList.filter(t => t.status === 'ASSIGNED').length;
    const inProgressTasks = taskList.filter(t => t.status === 'IN_PROGRESS').length;
    const completedTasks = taskList.filter(t => t.status === 'COMPLETED').length;
    const totalTasks = taskList.length;

    res.json({
      totalEmployees,
      tasks: {
        total: totalTasks,
        assigned: assignedTasks,
        inProgress: inProgressTasks,
        completed: completedTasks,
      },
      taskCompletionRate: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
    });

  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};
