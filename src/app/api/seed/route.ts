import { NextResponse } from 'next/server';
import { clearAllTasks, addBulk, type Task } from '@/lib/sheets';

interface SeedProject {
  title: string;
  status: string;
  priority: string;
  tags: string;
  subtasks: { title: string; status: string; assignee?: string }[];
}

export async function POST() {
  try {
    await clearAllTasks();

    const now = new Date().toISOString();
    const ts = Date.now();

    const projects: SeedProject[] = [
      {
        title: 'Vendor Update Action Items',
        status: 'in_progress', priority: 'high', tags: 'vendor,hardware',
        subtasks: [
          { title: 'Pune (Proceed for prototype)', status: 'todo' },
          { title: 'Zmd (waiting for cost and will tell go ahead tomorrow)', status: 'in_progress' },
          { title: 'Panoculon (follow up for faster delivery)', status: 'todo' },
          { title: 'Seed Studio (reach out)', status: 'todo' },
          { title: 'Dfr robot (reach out)', status: 'todo' },
          { title: 'Sahil (multiple vendors update)', status: 'todo', assignee: 'Sahil' },
          { title: 'Mercury labs (Anirudh to follow up)', status: 'todo', assignee: 'Anirudh' },
          { title: 'Prince get back on Panoculon device testing', status: 'todo', assignee: 'Prince' },
        ],
      },
      {
        title: 'AI Annotation (Scalability Discussion)',
        status: 'todo', priority: 'high', tags: 'ai,annotation',
        subtasks: [],
      },
      {
        title: 'Hand + Head Pose (3D)',
        status: 'in_progress', priority: 'high', tags: 'ai,3d,pose',
        subtasks: [
          { title: 'Connect with friends', status: 'todo' },
          { title: 'Get the sample data input & suggested output', status: 'todo' },
          { title: 'Problems we are facing currently', status: 'todo' },
        ],
      },
      {
        title: 'Figure AI (What to Send)',
        status: 'in_progress', priority: 'critical', tags: 'figure,client',
        subtasks: [
          { title: 'Regarding the questions asked what to share 150deg or 180deg', status: 'todo' },
          { title: 'Meeting with the Figure tech team', status: 'todo' },
          { title: 'Ask for detailed checklist if possible with the threshold', status: 'todo' },
        ],
      },
      {
        title: 'Camera R&D',
        status: 'in_progress', priority: 'high', tags: 'hardware,camera,r&d',
        subtasks: [
          { title: 'USB webcam & SD card for RPi 02W and RPi5', status: 'todo' },
          { title: 'IMU setup', status: 'todo' },
          { title: 'Test everything', status: 'todo' },
          { title: 'Create a 3D model', status: 'todo' },
          { title: 'Test stereo camera module', status: 'todo' },
          { title: 'Check all the threshold or checklist of the data', status: 'todo' },
          { title: 'Santhuan R&D check', status: 'todo', assignee: 'Santhuan' },
          { title: 'Check Camera log with IMU directly', status: 'todo' },
        ],
      },
      {
        title: 'Call with Poojith',
        status: 'todo', priority: 'medium', tags: 'call',
        subtasks: [],
      },
      {
        title: 'BOB Testing for US',
        status: 'in_progress', priority: 'critical', tags: 'bob,us,testing',
        subtasks: [
          { title: 'Modify the infra to support call', status: 'todo' },
          { title: 'WhatsApp messaging', status: 'todo' },
          { title: 'SMS part', status: 'todo' },
          { title: 'Email part', status: 'todo' },
          { title: 'Google Sheet setup', status: 'todo' },
          { title: 'DB function check and update', status: 'todo' },
        ],
      },
      {
        title: 'Telspiel Purchase',
        status: 'in_progress', priority: 'high', tags: 'purchase,telspiel',
        subtasks: [
          { title: 'Share payment receipt', status: 'todo' },
          { title: 'SMS for US - separate email thread initiate', status: 'todo' },
          { title: 'Approval mail', status: 'done' },
        ],
      },
      {
        title: 'Call Recording Push to Cloudflare R2',
        status: 'todo', priority: 'medium', tags: 'cloudflare,recording',
        subtasks: [
          { title: 'Get all conv ID', status: 'todo' },
          { title: 'Write a script to download recording', status: 'todo' },
          { title: 'Upload to Cloudflare R2', status: 'todo' },
        ],
      },
      {
        title: 'LinkedIn Profile Scrapping',
        status: 'in_progress', priority: 'high', tags: 'scraping,linkedin,lead-gen',
        subtasks: [
          { title: 'Using Google search scrapper find the relevant profile', status: 'todo' },
          { title: 'Get profile data using link URL', status: 'todo' },
          { title: 'Filter out users based on link CV', status: 'todo' },
          { title: 'Setup Lusha API to get contact and email ID', status: 'todo' },
          { title: 'Lusha Payment from Kavya', status: 'todo', assignee: 'Kavya' },
          { title: 'Let the team verify the data and share the final data to be used for BOB', status: 'todo' },
          { title: 'Create the pipeline', status: 'todo' },
        ],
      },
      {
        title: 'Factory List Scrapper',
        status: 'in_progress', priority: 'medium', tags: 'scraping,factory',
        subtasks: [
          { title: 'Advance search from different platforms like LinkedIn or others', status: 'todo' },
          { title: 'Google Maps scraper', status: 'done' },
        ],
      },
      {
        title: 'Peter Screening Stop and Cost Reduce',
        status: 'in_progress', priority: 'medium', tags: 'cost,screening',
        subtasks: [
          { title: 'Check for more cost reduction', status: 'todo' },
          { title: 'Stop Peter screening', status: 'done' },
        ],
      },
      {
        title: 'Sales Relevant Lead Scrapper',
        status: 'todo', priority: 'medium', tags: 'scraping,sales',
        subtasks: [],
      },
      {
        title: 'MIS Update and New FY Sheet Preparation',
        status: 'todo', priority: 'medium', tags: 'mis,finance',
        subtasks: [],
      },
      {
        title: 'Invoice Sharing to Stalin',
        status: 'todo', priority: 'medium', tags: 'invoice',
        subtasks: [],
      },
      {
        title: 'Computer Vision CV and Forward',
        status: 'todo', priority: 'low', tags: 'cv,hiring',
        subtasks: [],
      },
      {
        title: 'Call Audio and Transcript JSON QC Tool',
        status: 'todo', priority: 'medium', tags: 'qc,audio',
        subtasks: [],
      },
      {
        title: 'Annotation Tool (QC Scalability Follow Up)',
        status: 'done', priority: 'high', tags: 'annotation,qc',
        subtasks: [
          { title: 'EC2 creds to Arvind', status: 'done', assignee: 'Arvind' },
          { title: 'Git project to Arvind', status: 'done', assignee: 'Arvind' },
        ],
      },
    ];

    // Build flat Task array with consistent IDs
    const rows: Task[] = [];
    let subCounter = 0;

    projects.forEach((proj, pIdx) => {
      const projectId = `P-${ts}-${pIdx}`;

      rows.push({
        id: projectId,
        parentId: '',
        type: 'project',
        title: proj.title,
        description: '',
        status: proj.status as Task['status'],
        priority: proj.priority as Task['priority'],
        assignee: '',
        dueDate: '',
        tags: proj.tags,
        createdAt: now,
        updatedAt: now,
      });

      proj.subtasks.forEach((sub) => {
        rows.push({
          id: `ST-${ts}-${subCounter++}`,
          parentId: projectId,
          type: 'task',
          title: sub.title,
          description: '',
          status: sub.status as Task['status'],
          priority: 'medium',
          assignee: sub.assignee || '',
          dueDate: '',
          tags: '',
          createdAt: now,
          updatedAt: now,
        });
      });
    });

    const result = await addBulk(rows);
    return NextResponse.json({ success: true, count: result.length });
  } catch (error: any) {
    console.error('SEED error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
