import prisma from '../prismaClient.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

const getOpenAIClient = () => {
  dotenv.config(); 
  return new OpenAI({ 
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKey: process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
  });
};

export const getProductivityScore = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { userId, role } = req.user;

    let employeeWhere = { id: employeeId };
    if (role === 'ADMIN') {
        employeeWhere.roster = { adminId: userId };
    } else {
        if (userId !== employeeId) {
            return res.status(403).json({ error: 'You can only view your own productivity score' });
        }
    }

    const employee = await prisma.employee.findUnique({
      where: employeeWhere,
      include: { tasks: true }
    });

    if (!employee) return res.status(404).json({ error: 'Employee not found or access denied' });

    const totalTasks = employee.tasks.length;
    
    if (totalTasks === 0) {
        return res.json({ productivity: { score: 0, reason: "No tasks assigned yet." } });
    }

    const taskSummary = employee.tasks.map(t => 
      `- ${t.title} [Status: ${t.status}, Complexity: ${t.complexityScore}]`
    ).join('\n');

    const prompt = `
      You are an expert AI HR Manager evaluating employee productivity objectively.
      
      Employee Name: ${employee.name}
      Department: ${employee.department}
      
      Below is the list of tasks assigned to this employee:
      ${taskSummary}
      
      Scoring Rules:
      1. If the employee has completed most or all of their tasks, their score MUST be between 80 and 100.
      2. If they have tasks IN_PROGRESS but none completed, their score should be between 40 and 70.
      3. If all tasks are only ASSIGNED and nothing is started, the score should be below 40.
      4. Higher complexity COMPLETED tasks should boost the score closer to 100.
      5. Base the score strictly on the ratio of COMPLETED tasks to total tasks.
      
      Return ONLY a JSON object with keys: "score" (number between 0 and 100) and "reason" (short string explaining the math).
    `;

    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const aiResult = JSON.parse(response.choices[0].message.content);
    
    res.json({
        employee: { name: employee.name, id: employee.id },
        productivity: aiResult
    });

  } catch (error) {
    if (error.status === 429 || error.status === 400) {
      return res.status(500).json({ error: "Google Gemini Quota Exceeded. Please check your API billing account." });
    }
    console.error('AI Productivity Error:', error.message);
    res.status(500).json({ error: 'Failed to generate productivity score: ' + error.message });
  }
};

export const smartAssign = async (req, res) => {
  // Not used actively in UI over smartAssignDraft, but updated for compatibility
  res.status(501).json({ error: 'Not implemented' });
};

export const smartAssignDraft = async (req, res) => {
  try {
    const { title, description, complexityScore, rosterId } = req.body;
    const { userId, role } = req.user;

    if (role !== 'ADMIN') return res.status(403).json({ error: 'Only admins can use smart assign' });

    let filter = { roster: { adminId: userId } };
    if (rosterId) {
        filter.rosterId = rosterId;
    }
    
    const employees = await prisma.employee.findMany({
      where: filter
    });

    if (employees.length === 0) {
      return res.status(400).json({ error: 'No employees available to assign' });
    }

    const employeeList = employees.map(e => 
      `ID: ${e.id}, Name: ${e.name}, Role: Employee, Skills: ${e.skills.join(', ')}`
    ).join('\n');

    const prompt = `
      You are an AI task assignment system.
      Task Title: "${title}"
      Task Description: "${description}"
      Task Complexity: ${complexityScore || 1}/10
      
      Available Employees:
      ${employeeList}
      
      Choose the best employee for this task based on their skills and role.
      Return ONLY a JSON object with keys: "recommendedEmployeeId" (string matching the ID) and "reason" (1 sentence explanation).
    `;

    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const aiResult = JSON.parse(response.choices[0].message.content);

    res.json({
      recommendation: aiResult
    });

  } catch (error) {
    if (error.status === 429 || error.status === 400) {
      return res.status(500).json({ error: "Google Gemini Quota Exceeded. Please check your API billing account." });
    }
    console.error('AI Assignment Draft Error:', error.message);
    res.status(500).json({ error: 'Failed to generate smart assignment draft: ' + error.message });
  }
};
