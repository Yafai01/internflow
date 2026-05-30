import Dexie, { type Table } from 'dexie';

// Interfaces for our database entities
export interface Intern {
  intern_id?: number;
  name: string;
  avatar?: string;
  email: string;
  password?: string;
  type: 1 | 2; // 1 = Admin, 2 = Intern
  join_date: string;
}

export interface PgType {
  pg_type_id?: number;
  pg_type: string;
  filter_pg: 'checked' | 'unchecked';
}

export interface Program {
  pg_id?: number;
  intern_id: number;
  pg_start_date: string;
  pg_end_date: string;
  pg_status: number; // 0 - 100 calculated program progress
  pg_type_id: number;
}

export interface StatusItem {
  status_id?: number;
  status: string;
  filter_status: 'checked' | 'unchecked';
}

export interface Task {
  task_id?: number;
  pg_id: number;
  task: string;
  description: string;
  task_start_date: string;
  task_end_date: string;
  status_id: number;
}

class InternManagementDatabase extends Dexie {
  interns!: Table<Intern, number>;
  pg_type_list!: Table<PgType, number>;
  program_list!: Table<Program, number>;
  status_list!: Table<StatusItem, number>;
  task_list!: Table<Task, number>;

  constructor() {
    super('InternManagementDB');
    this.version(1).stores({
      interns: '++intern_id, name, &email, type',
      pg_type_list: '++pg_type_id, &pg_type',
      program_list: '++pg_id, intern_id, pg_type_id',
      status_list: '++status_id, &status',
      task_list: '++task_id, pg_id, status_id',
    });
  }
}

export const db = new InternManagementDatabase();

// Pre-configured avatars are disabled in retro style
export const PRESET_AVATARS: string[] = [];

// Helper to seed database if empty
export async function seedDatabase() {
  // 1. Seed Status List
  const statusCount = await db.status_list.count();
  const seededStatuses: Record<string, number> = {};
  const statuses = [
    { status: 'Done', filter_status: 'checked' as const },
    { status: 'No status', filter_status: 'checked' as const },
    { status: 'Testing', filter_status: 'checked' as const },
    { status: 'Blocked', filter_status: 'checked' as const },
    { status: 'Doing', filter_status: 'checked' as const },
  ];

  if (statusCount === 0) {
    for (const s of statuses) {
      const id = await db.status_list.add(s);
      seededStatuses[s.status] = id;
    }
  } else {
    const existing = await db.status_list.toArray();
    for (const s of existing) {
      if (s.status_id) seededStatuses[s.status] = s.status_id;
    }
  }

  // 2. Seed Program Types
  const pgTypeCount = await db.pg_type_list.count();
  const seededPgTypes: Record<string, number> = {};
  const pgTypes = [
    { pg_type: 'Long-term Internship', filter_pg: 'checked' as const },
    { pg_type: 'One-day Internship', filter_pg: 'checked' as const },
    { pg_type: 'No Program', filter_pg: 'checked' as const },
    { pg_type: 'Intensive Program', filter_pg: 'checked' as const },
    { pg_type: 'New Program', filter_pg: 'checked' as const },
  ];

  if (pgTypeCount === 0) {
    for (const p of pgTypes) {
      const id = await db.pg_type_list.add(p);
      seededPgTypes[p.pg_type] = id;
    }
  } else {
    const existing = await db.pg_type_list.toArray();
    for (const p of existing) {
      if (p.pg_type_id) seededPgTypes[p.pg_type] = p.pg_type_id;
    }
  }

  // 3. Seed Interns, Programs, Tasks
  const internCount = await db.interns.count();
  if (internCount === 0) {
    const interns = [
      {
        name: 'Jane Ngo',
        email: 'admin123@internflow.com',
        password: 'admin123',
        type: 1 as const, // Admin
        join_date: '2022-01-01',
      },
      {
        name: 'Hiro Taro',
        email: 'hirotaro@internflow.com',
        password: 'beiti123',
        type: 2 as const, // Intern
        join_date: '2022-05-23',
      },
      {
        name: 'Takahiro Nakanishi',
        email: 'nakanishi@internflow.com',
        password: 'phongnguyen123',
        type: 2 as const, // Intern
        join_date: '2022-05-23',
      },
      {
        name: 'Ai Tanaka',
        email: 'aitanaka123@internflow.com',
        password: 'tanaka123',
        type: 2 as const, // Intern
        join_date: '2022-05-23',
      },
    ];

    const seededInterns: Record<string, number> = {};
    for (const i of interns) {
      const id = await db.interns.add(i);
      seededInterns[i.name] = id;
    }

    // 4. Seed Programs
    const programs = [
      {
        intern_id: seededInterns['Hiro Taro'],
        pg_start_date: '2022-05-23',
        pg_end_date: '2022-05-28',
        pg_status: 50,
        pg_type_id: seededPgTypes['Intensive Program'] || 1,
      },
      {
        intern_id: seededInterns['Takahiro Nakanishi'],
        pg_start_date: '2022-05-23',
        pg_end_date: '2022-05-24',
        pg_status: 0,
        pg_type_id: seededPgTypes['Long-term Internship'] || 1,
      },
      {
        intern_id: seededInterns['Ai Tanaka'],
        pg_start_date: '2022-05-23',
        pg_end_date: '2022-05-24',
        pg_status: 100,
        pg_type_id: seededPgTypes['Intensive Program'] || 1,
      },
    ];

    const seededPrograms: Record<number, number> = {}; // maps intern_id to pg_id
    for (const p of programs) {
      const id = await db.program_list.add(p);
      seededPrograms[p.intern_id] = id;
    }

    // 5. Seed Tasks
    const tasks = [
      {
        pg_id: seededPrograms[seededInterns['Hiro Taro']],
        task: 'Feed Habib',
        description: 'Make sure Habib gets fed twice today.',
        task_start_date: '2022-05-24',
        task_end_date: '2022-05-27',
        status_id: seededStatuses['Done'] || 1,
      },
      {
        pg_id: seededPrograms[seededInterns['Hiro Taro']],
        task: 'Cook dinner',
        description: 'Make delicious dishes for the team.',
        task_start_date: '2022-05-23',
        task_end_date: '2022-05-23',
        status_id: seededStatuses['Blocked'] || 1,
      },
      {
        pg_id: seededPrograms[seededInterns['Takahiro Nakanishi']],
        task: 'General Task onboarding',
        description: 'Read the onboarding handbook.',
        task_start_date: '2022-05-23',
        task_end_date: '2022-05-24',
        status_id: seededStatuses['Blocked'] || 1,
      },
      {
        pg_id: seededPrograms[seededInterns['Takahiro Nakanishi']],
        task: 'New task setup',
        description: 'Initialize the local server config.',
        task_start_date: '2022-05-23',
        task_end_date: '2022-05-23',
        status_id: seededStatuses['Blocked'] || 1,
      },
      {
        pg_id: seededPrograms[seededInterns['Takahiro Nakanishi']],
        task: 'Task 3 integration',
        description: 'Integrate the UI mockups.',
        task_start_date: '2022-05-24',
        task_end_date: '2022-05-24',
        status_id: seededStatuses['Testing'] || 1,
      },
      {
        pg_id: seededPrograms[seededInterns['Ai Tanaka']],
        task: 'Task 2 implementation',
        description: 'Complete the database tables setup.',
        task_start_date: '2022-05-23',
        task_end_date: '2022-05-23',
        status_id: seededStatuses['Done'] || 1,
      },
    ];

    for (const t of tasks) {
      await db.task_list.add(t);
    }
  }
}

// Utility to recalculate program progress automatically based on task status
export async function recalculateProgramProgress(pgId: number) {
  const tasks = await db.task_list.where('pg_id').equals(pgId).toArray();
  if (tasks.length === 0) {
    await db.program_list.update(pgId, { pg_status: 0 });
    return 0;
  }

  // Get status items mapping
  const doneStatus = await db.status_list.where('status').equalsIgnoreCase('done').first();
  const doneStatusId = doneStatus?.status_id || 0;

  const doneCount = tasks.filter(t => t.status_id === doneStatusId).length;
  const progress = Math.round((doneCount / tasks.length) * 100);

  await db.program_list.update(pgId, { pg_status: progress });
  return progress;
}
