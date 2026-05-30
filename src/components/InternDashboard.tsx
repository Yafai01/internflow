import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  type Intern,
  recalculateProgramProgress
} from '../db';

interface InternDashboardProps {
  internUser: Intern;
  onLogout: () => void;
  onUserUpdate: (updatedUser: Intern) => void;
}

type Tab = 'tasks' | 'profile';

export default function InternDashboard({ internUser, onLogout, onUserUpdate }: InternDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('tasks');

  // Reactively query database tables
  const programs = useLiveQuery(() => db.program_list.toArray()) || [];
  const pgTypes = useLiveQuery(() => db.pg_type_list.toArray()) || [];
  const statuses = useLiveQuery(() => db.status_list.toArray()) || [];
  const tasks = useLiveQuery(() => db.task_list.toArray()) || [];

  // Profile Form States
  const [name, setName] = useState(internUser.name);
  const [email, setEmail] = useState(internUser.email);
  const [password, setPassword] = useState(internUser.password || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Find active program for current intern
  const activeProgram = programs.find((p) => p.intern_id === internUser.intern_id);
  const activeProgramType = activeProgram
    ? pgTypes.find((t) => t.pg_type_id === activeProgram.pg_type_id)
    : null;

  // Filter tasks belonging only to this intern's active program
  const myTasks = activeProgram
    ? tasks.filter((t) => t.pg_id === activeProgram.pg_id)
    : [];

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('text/plain', taskId.toString());
  };

  const handleDrop = async (e: React.DragEvent, targetStatusId: number) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData('text/plain');
    if (!taskIdStr) return;
    const taskId = parseInt(taskIdStr);

    // Update status in db
    await db.task_list.update(taskId, { status_id: targetStatusId });

    // Recalculate progress for program
    if (activeProgram?.pg_id) {
      await recalculateProgramProgress(activeProgram.pg_id);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Helper to trigger status change on click (for accessibility/mobile)
  const handleTaskStatusChange = async (taskId: number, newStatusId: number) => {
    await db.task_list.update(taskId, { status_id: newStatusId });
    if (activeProgram?.pg_id) {
      await recalculateProgramProgress(activeProgram.pg_id);
    }
  };

  // Save profile updates
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internUser.intern_id) return;

    try {
      await db.interns.update(internUser.intern_id, {
        name,
        email,
        password,
      });

      const updated = await db.interns.get(internUser.intern_id);
      if (updated) {
        onUserUpdate(updated);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Error updating profile details.');
    }
  };

  // Helper icon based on status name
  const getStatusIcon = (statusName: string) => {
    const name = statusName.toLowerCase();
    if (name.includes('done')) return '[OK] ';
    if (name.includes('doing') || name.includes('progress')) return '[>>] ';
    if (name.includes('blocked')) return '[!!] ';
    return '[?] ';
  };

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar Nav */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>InternPortal</span>
        </div>

        <div className="sidebar-user">
          <div className="user-info">
            <h4 className="user-name">{internUser.name}</h4>
            <span className="user-role">Intern Developer</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`nav-link ${activeTab === 'tasks' ? 'active' : ''}`}
          >
            <span>My Tasks</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`}
          >
            <span>My Profile</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button onClick={onLogout} className="nav-link" style={{ width: '100%' }}>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-panel">
        <div className="panel-header">
          <div className="panel-title">
            <h1>{activeTab === 'tasks' ? 'My Taskboard' : 'Profile Settings'}</h1>
            <p>{activeTab === 'tasks' ? 'View and update progress of assigned deliverables.' : 'Update your personal credentials and avatar.'}</p>
          </div>
        </div>

        {activeTab === 'tasks' ? (
          <>
            {/* Active Program Progress Panel */}
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>
                    {activeProgramType ? activeProgramType.pg_type : 'Unassigned Program Stream'}
                  </h2>
                  <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <span>Start: {activeProgram?.pg_start_date || '-'}</span>
                    <span>End: {activeProgram?.pg_end_date || '-'}</span>
                  </div>
                </div>

                {activeProgram && (
                  <div style={{ textAlign: 'right', minWidth: '200px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: '600' }}>Overall Stream Progress</span>
                      <span className="progress-percentage">{activeProgram.pg_status}%</span>
                    </div>
                    <div className="progress-bar-container" style={{ height: '10px' }}>
                      <div className="progress-bar-fill" style={{ width: `${activeProgram.pg_status}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Kanban Board */}
            {!activeProgram ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                <h3>You are currently not registered in any internship programs.</h3>
                <p style={{ marginTop: '8px' }}>Please contact your administrator to set up your learning stream.</p>
              </div>
            ) : (
              <div className="kanban-board">
                {statuses.map((columnStatus) => {
                  const columnTasks = myTasks.filter((t) => t.status_id === columnStatus.status_id);
                  return (
                    <div
                      key={columnStatus.status_id}
                      className="kanban-column glass-panel"
                      onDragOver={handleDragOver}
                      onDrop={(e) => columnStatus.status_id && handleDrop(e, columnStatus.status_id)}
                    >
                      <div className="column-header">
                        <div className="column-title">
                          {getStatusIcon(columnStatus.status)}
                          <span>{columnStatus.status}</span>
                        </div>
                        <span className="task-count">{columnTasks.length}</span>
                      </div>

                      <div className="task-list-container">
                        {columnTasks.length === 0 ? (
                          <div style={{ border: '2px dashed rgba(255,255,255,0.03)', borderRadius: '8px', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', minHeight: '120px' }}>
                            Drop tasks here
                          </div>
                        ) : (
                          columnTasks.map((task) => (
                            <div
                              key={task.task_id}
                              className="task-card"
                              draggable
                              onDragStart={(e) => task.task_id && handleDragStart(e, task.task_id)}
                            >
                              <div className="task-card-title">{task.task}</div>
                              {task.description && <div className="task-card-desc">{task.description}</div>}
                              
                              {/* Quick click options for status changes on mobile/accessible inputs */}
                              <div style={{ margin: '8px 0 12px 0', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {statuses.map((s) => (
                                  s.status_id !== task.status_id && (
                                    <button
                                      key={s.status_id}
                                      onClick={() => task.task_id && s.status_id && handleTaskStatusChange(task.task_id, s.status_id)}
                                      style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: '4px',
                                        padding: '2px 6px',
                                        fontSize: '0.65rem',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      → {s.status}
                                    </button>
                                  )
                                ))}
                              </div>

                              <div className="task-card-dates">
                                <span>Due: {task.task_end_date}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Profile Settings Panel */
          <div className="profile-card">
            <form onSubmit={handleProfileSave}>
              {saveSuccess && (
                <div style={{ background: '#d4edda', border: '1px solid var(--status-done)', padding: '10px', marginBottom: '20px', color: '#155724', fontSize: '0.85rem' }}>
                  <span>[OK] Profile credentials updated successfully.</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '14px' }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '14px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '30px' }}>
                <label className="form-label">Update Access Password</label>
                <div className="input-wrapper" style={{ width: '100%' }}>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary">
                Save Settings
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
