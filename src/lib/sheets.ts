import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1';

const HEADERS = [
  'ID', 'Parent ID', 'Type', 'Title', 'Description', 'Status', 'Priority',
  'Assignee', 'Due Date', 'Tags', 'Created At', 'Updated At'
];

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSheets() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskType = 'project' | 'task';

export interface Task {
  id: string;
  parentId: string;      // empty for projects, project ID for subtasks
  type: TaskType;         // 'project' or 'task'
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  dueDate: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project extends Task {
  type: 'project';
  subtasks: Task[];
}

export async function ensureHeaders(): Promise<void> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1:L1`,
  });

  if (!res.data.values || res.data.values.length === 0 || res.data.values[0][0] !== 'ID') {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:L1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId || 0;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true },
                  backgroundColor: { red: 0.15, green: 0.15, blue: 0.2 },
                },
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor)',
            },
          },
          {
            updateSheetProperties: {
              properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
              fields: 'gridProperties.frozenRowCount',
            },
          },
        ],
      },
    });
  }
}

function rowToTask(row: string[]): Task {
  return {
    id: row[0] || '',
    parentId: row[1] || '',
    type: (row[2] as TaskType) || 'task',
    title: row[3] || '',
    description: row[4] || '',
    status: (row[5] as TaskStatus) || 'todo',
    priority: (row[6] as TaskPriority) || 'medium',
    assignee: row[7] || '',
    dueDate: row[8] || '',
    tags: row[9] || '',
    createdAt: row[10] || '',
    updatedAt: row[11] || '',
  };
}

function taskToRow(task: Task): string[] {
  return [
    task.id, task.parentId, task.type, task.title, task.description,
    task.status, task.priority, task.assignee, task.dueDate, task.tags,
    task.createdAt, task.updatedAt,
  ];
}

export async function getAllTasks(): Promise<Task[]> {
  await ensureHeaders();
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:L5000`,
  });

  if (!res.data.values) return [];
  return res.data.values.filter((row) => row[0]).map(rowToTask);
}

export function buildProjectTree(tasks: Task[]): Project[] {
  const projects = tasks.filter((t) => t.type === 'project') as Project[];
  const subtasks = tasks.filter((t) => t.type === 'task');

  return projects.map((p) => ({
    ...p,
    subtasks: subtasks.filter((t) => t.parentId === p.id),
  }));
}

export async function addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  await ensureHeaders();
  const sheets = getSheets();
  const now = new Date().toISOString();
  const prefix = task.type === 'project' ? 'P' : 'ST';
  const id = `${prefix}-${Date.now()}`;

  const newTask: Task = { ...task, id, createdAt: now, updatedAt: now };

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:L`,
    valueInputOption: 'RAW',
    requestBody: { values: [taskToRow(newTask)] },
  });

  return newTask;
}

export async function addBulk(items: Task[]): Promise<Task[]> {
  await ensureHeaders();
  const sheets = getSheets();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:L`,
    valueInputOption: 'RAW',
    requestBody: { values: items.map(taskToRow) },
  });

  return items;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  await ensureHeaders();
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:L5000`,
  });

  if (!res.data.values) return null;

  const rowIndex = res.data.values.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return null;

  const existing = rowToTask(res.data.values[rowIndex]);
  const updated: Task = {
    ...existing,
    ...updates,
    id: existing.id,
    parentId: existing.parentId,
    type: existing.type,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  const sheetRow = rowIndex + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A${sheetRow}:L${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [taskToRow(updated)] },
  });

  return updated;
}

export async function deleteTask(id: string): Promise<boolean> {
  await ensureHeaders();
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:L5000`,
  });

  if (!res.data.values) return false;

  // Find all rows to delete: the task itself + any subtasks if it's a project
  const rowsToDelete: number[] = [];
  res.data.values.forEach((row, index) => {
    if (row[0] === id || row[1] === id) {
      rowsToDelete.push(index);
    }
  });

  if (rowsToDelete.length === 0) return false;

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId || 0;

  // Delete from bottom to top to preserve row indices
  const requests = rowsToDelete.reverse().map((rowIndex) => ({
    deleteDimension: {
      range: {
        sheetId,
        dimension: 'ROWS' as const,
        startIndex: rowIndex + 1,
        endIndex: rowIndex + 2,
      },
    },
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests },
  });

  return true;
}

export async function clearAllTasks(): Promise<void> {
  await ensureHeaders();
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:L5000`,
  });

  if (!res.data.values || res.data.values.length === 0) return;

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId || 0;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: 1,
            endIndex: res.data.values.length + 1,
          },
        },
      }],
    },
  });
}
