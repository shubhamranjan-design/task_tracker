import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1';

const HEADERS = [
  'ID', 'Title', 'Description', 'Status', 'Priority',
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

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee: string;
  dueDate: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
}

export async function ensureHeaders(): Promise<void> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1:J1`,
  });

  if (!res.data.values || res.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:J1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });

    // Format header row (bold + freeze)
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
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
                  backgroundColor: { red: 0.2, green: 0.2, blue: 0.3 },
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
    title: row[1] || '',
    description: row[2] || '',
    status: (row[3] as Task['status']) || 'todo',
    priority: (row[4] as Task['priority']) || 'medium',
    assignee: row[5] || '',
    dueDate: row[6] || '',
    tags: row[7] || '',
    createdAt: row[8] || '',
    updatedAt: row[9] || '',
  };
}

function taskToRow(task: Task): string[] {
  return [
    task.id, task.title, task.description, task.status, task.priority,
    task.assignee, task.dueDate, task.tags, task.createdAt, task.updatedAt,
  ];
}

export async function getAllTasks(): Promise<Task[]> {
  await ensureHeaders();
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:J1000`,
  });

  if (!res.data.values) return [];
  return res.data.values.map(rowToTask);
}

export async function addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  await ensureHeaders();
  const sheets = getSheets();
  const now = new Date().toISOString();
  const id = `T-${Date.now()}`;

  const newTask: Task = {
    ...task,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:J`,
    valueInputOption: 'RAW',
    requestBody: { values: [taskToRow(newTask)] },
  });

  return newTask;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  await ensureHeaders();
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:J1000`,
  });

  if (!res.data.values) return null;

  const rowIndex = res.data.values.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return null;

  const existing = rowToTask(res.data.values[rowIndex]);
  const updated: Task = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  const sheetRow = rowIndex + 2; // +1 for header, +1 for 1-indexed
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A${sheetRow}:J${sheetRow}`,
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
    range: `${SHEET_NAME}!A2:J1000`,
  });

  if (!res.data.values) return false;

  const rowIndex = res.data.values.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return false;

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  const sheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId || 0;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex + 1, // +1 for header
              endIndex: rowIndex + 2,
            },
          },
        },
      ],
    },
  });

  return true;
}
