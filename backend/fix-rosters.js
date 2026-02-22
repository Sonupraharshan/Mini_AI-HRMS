import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Fetching existing employees...");
  const employees = await prisma.employee.findMany();
  
  if (employees.length === 0) {
    console.log("No employees found to migrate.");
    return;
  }

  const organizationId = employees[0].orgId;

  // Find an admin to own the Roster
  let admin = employees.find(e => e.role === 'ADMIN');
  if (!admin) {
     console.log("No admin found among employees, using the first employee as admin.");
     admin = employees[0];
  }

  console.log(`Creating Main Roster for Org: ${organizationId}, Admin: ${admin.name}`);

  // Create "Main" roster
  const mainRoster = await prisma.roster.create({
    data: {
      name: 'Main',
      orgId: organizationId,
      adminId: admin.id
    }
  });

  console.log(`Created Main Roster with ID: ${mainRoster.id}`);

  console.log("Assigning all existing employees to this Roster...");
  
  // Update all existing employees to belong to this roster
  for (const emp of employees) {
    await prisma.employee.update({
      where: { id: emp.id },
      data: { rosterId: mainRoster.id }
    });
    console.log(`- Assigned ${emp.name} (${emp.role})`);
  }

  // Update all existing tasks to belong to this roster
  const tasks = await prisma.task.findMany({ where: { orgId: organizationId } });
  for (const task of tasks) {
    await prisma.task.update({
      where: { id: task.id },
      data: { rosterId: mainRoster.id }
    });
  }
  console.log(`Assigned ${tasks.length} existing tasks to the Main Roster.`);

  console.log("Migration complete!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
