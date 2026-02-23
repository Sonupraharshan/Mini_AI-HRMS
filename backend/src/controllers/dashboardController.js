import prisma from '../prismaClient.js';

export const getDashboardStats = async (req, res) => {
  try {
    const { userId, role, rosterId } = req.user;
    const queryRosterId = req.query.rosterId;

    let totalEmployees = 0;
    let taskList = [];

    if (role === 'ADMIN') {
        let employeeQuery = { roster: { adminId: userId } };
        let taskQuery = { employee: { roster: { adminId: userId } } };

        if (queryRosterId) {
            employeeQuery.rosterId = queryRosterId;
            taskQuery.employee = { rosterId: queryRosterId };
        }

        const [empCount, tasks] = await Promise.all([
            prisma.employee.count({ where: employeeQuery }),
            prisma.task.findMany({ where: taskQuery })
        ]);
        totalEmployees = empCount;
        taskList = tasks;
    } else {
        const [empCount, tasks] = await Promise.all([
            prisma.employee.count({ where: { rosterId } }),
            prisma.task.findMany({ where: { employeeId: userId } })
        ]);
        totalEmployees = empCount;
        taskList = tasks;
    }

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
