import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Users,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Settings,
  LogOut,
  FolderOpen,
  X,
  PlusCircle,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import {
  db,
  type Intern,
  recalculateProgramProgress
} from '../db';

interface AdminDashboardProps {
  adminUser: Intern;
  onLogout: () => void;
}

type Tab = 'dashboard' | 'settings';

export default function AdminDashboard({ adminUser, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  // Reactively query database tables
  const interns = useLiveQuery(() => db.interns.where('type').equals(2).toArray()) || [];
  const programs = useLiveQuery(() => db.program_list.toArray()) || [];
  const pgTypes = useLiveQuery(() => db.pg_type_list.toArray()) || [];
  const statuses = useLiveQuery(() => db.status_list.toArray()) || [];
  const tasks = useLiveQuery(() => db.task_list.toArray()) || [];

  // Filter and Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPgTypeId, setSelectedPgTypeId] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [selectedStatusId, setSelectedStatusId] = useState<string>('all');

  // Sort states
  const [sortField, setSortField] = useState<'name' | 'program' | 'start_date' | 'end_date' | 'progress'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal States
  const [isAddInternOpen, setIsAddInternOpen] = useState(false);
  const [isManageProgramOpen, setIsManageProgramOpen] = useState(false);
  const [selectedInternForProgram, setSelectedInternForProgram] = useState<Intern | null>(null);

  // Form States - Add Intern
  const [newInternName, setNewInternName] = useState('');
  const [newInternEmail, setNewInternEmail] = useState('');
  const [newInternPassword, setNewInternPassword] = useState('');
  const [newInternJoinDate, setNewInternJoinDate] = useState(new Date().toISOString().split('T')[0]);

  // Form States - Manage Program & Tasks
  const [progTypeId, setProgTypeId] = useState<number>(0);
  const [progStartDate, setProgStartDate] = useState('');
  const [progEndDate, setProgEndDate] = useState('');
  
  // Task Creation States (within Program Modal)
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskStart, setNewTaskStart] = useState('');
  const [newTaskEnd, setNewTaskEnd] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState<number>(0);

  // Settings Management States
  const [newPgTypeName, setNewPgTypeName] = useState('');
  const [newStatusName, setNewStatusName] = useState('');

  // ----------------------------------------------------
  // Database Operations (CRUD)
  // ----------------------------------------------------

  const handleAddIntern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInternName || !newInternEmail || !newInternPassword) return;

    try {
      await db.interns.add({
        name: newInternName,
        email: newInternEmail,
        password: newInternPassword,
        type: 2,
        join_date: newInternJoinDate,
      });

      // Reset
      setNewInternName('');
      setNewInternEmail('');
      setNewInternPassword('');
      setIsAddInternOpen(false);
    } catch (err) {
      alert('Error adding intern: Email might already exist.');
    }
  };

  const handleDeleteIntern = async (internId: number) => {
    if (!confirm('Are you sure you want to remove this intern? All associated programs and tasks will be deleted.')) return;

    // Delete tasks and programs for this intern
    const internPrograms = await db.program_list.where('intern_id').equals(internId).toArray();
    for (const prog of internPrograms) {
      if (prog.pg_id) {
        await db.task_list.where('pg_id').equals(prog.pg_id).delete();
        await db.program_list.delete(prog.pg_id);
      }
    }
    await db.interns.delete(internId);
  };

  const handleOpenProgramModal = async (intern: Intern) => {
    setSelectedInternForProgram(intern);
    const existingProg = programs.find((p) => p.intern_id === intern.intern_id);

    if (existingProg) {
      setProgTypeId(existingProg.pg_type_id);
      setProgStartDate(existingProg.pg_start_date);
      setProgEndDate(existingProg.pg_end_date);
    } else {
      setProgTypeId(pgTypes[0]?.pg_type_id || 0);
      setProgStartDate(new Date().toISOString().split('T')[0]);
      setProgEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    }

    // Reset task form inside modal
    setNewTaskName('');
    setNewTaskDesc('');
    setNewTaskStart(new Date().toISOString().split('T')[0]);
    setNewTaskEnd(new Date().toISOString().split('T')[0]);
    setNewTaskStatus(statuses[0]?.status_id || 0);

    setIsManageProgramOpen(true);
  };

  const handleSaveProgram = async () => {
    if (!selectedInternForProgram?.intern_id) return;

    const existingProg = programs.find((p) => p.intern_id === selectedInternForProgram.intern_id);

    if (existingProg?.pg_id) {
      // Update
      await db.program_list.update(existingProg.pg_id, {
        pg_type_id: progTypeId,
        pg_start_date: progStartDate,
        pg_end_date: progEndDate,
      });
      await recalculateProgramProgress(existingProg.pg_id);
    } else {
      // Create new
      await db.program_list.add({
        intern_id: selectedInternForProgram.intern_id,
        pg_type_id: progTypeId,
        pg_start_date: progStartDate,
        pg_end_date: progEndDate,
        pg_status: 0,
      });
    }

    setIsManageProgramOpen(false);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInternForProgram?.intern_id || !newTaskName) return;

    let prog = programs.find((p) => p.intern_id === selectedInternForProgram.intern_id);

    // Create program first if it doesn't exist
    if (!prog) {
      const newProgId = await db.program_list.add({
        intern_id: selectedInternForProgram.intern_id,
        pg_type_id: progTypeId,
        pg_start_date: progStartDate,
        pg_end_date: progEndDate,
        pg_status: 0,
      });
      prog = {
        pg_id: newProgId,
        intern_id: selectedInternForProgram.intern_id,
        pg_type_id: progTypeId,
        pg_start_date: progStartDate,
        pg_end_date: progEndDate,
        pg_status: 0,
      };
    }

    if (prog.pg_id) {
      await db.task_list.add({
        pg_id: prog.pg_id,
        task: newTaskName,
        description: newTaskDesc,
        task_start_date: newTaskStart,
        task_end_date: newTaskEnd,
        status_id: newTaskStatus || statuses[0]?.status_id || 0,
      });

      await recalculateProgramProgress(prog.pg_id);

      // Reset fields
      setNewTaskName('');
      setNewTaskDesc('');
    }
  };

  const handleDeleteTask = async (taskId: number, pgId: number) => {
    await db.task_list.delete(taskId);
    await recalculateProgramProgress(pgId);
  };

  // Program Type Settings CRUD
  const handleAddPgType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPgTypeName) return;
    try {
      await db.pg_type_list.add({
        pg_type: newPgTypeName,
        filter_pg: 'checked',
      });
      setNewPgTypeName('');
    } catch (err) {
      alert('Program Type already exists');
    }
  };

  const handleDeletePgType = async (id: number) => {
    try {
      await db.pg_type_list.delete(id);
    } catch (err) {
      alert('Could not delete program type.');
    }
  };

  // Status List Settings CRUD
  const handleAddStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatusName) return;
    try {
      await db.status_list.add({
        status: newStatusName,
        filter_status: 'checked',
      });
      setNewStatusName('');
    } catch (err) {
      alert('Status already exists');
    }
  };

  const handleDeleteStatus = async (id: number) => {
    try {
      await db.status_list.delete(id);
    } catch (err) {
      alert('Could not delete status.');
    }
  };

  // Toggle Filters stored in DB
  const togglePgFilter = async (id: number, current: 'checked' | 'unchecked') => {
    await db.pg_type_list.update(id, { filter_pg: current === 'checked' ? 'unchecked' : 'checked' });
  };

  const toggleStatusFilter = async (id: number, current: 'checked' | 'unchecked') => {
    await db.status_list.update(id, { filter_status: current === 'checked' ? 'unchecked' : 'checked' });
  };

  // ----------------------------------------------------
  // Sorting and Filtering Calculations
  // ----------------------------------------------------

  // Metrics calculations
  const totalInterns = interns.length;
  const activeProgramsCount = programs.filter(p => {
    const today = new Date().toISOString().split('T')[0];
    return p.pg_start_date <= today && p.pg_end_date >= today;
  }).length;

  const avgProgress = programs.length > 0
    ? Math.round(programs.reduce((acc, p) => acc + p.pg_status, 0) / programs.length)
    : 0;

  const doneStatus = statuses.find(s => s.status.toLowerCase() === 'done');
  const pendingTasksCount = doneStatus 
    ? tasks.filter(t => t.status_id !== doneStatus.status_id).length
    : tasks.length;

  // Filtered interns list
  const filteredInterns = interns.filter((intern) => {
    // 1. Search term match (Name / Email)
    const matchesSearch =
      intern.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      intern.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Program details and program type matches
    const program = programs.find((p) => p.intern_id === intern.intern_id);

    if (selectedPgTypeId !== 'all') {
      const typeIdNum = parseInt(selectedPgTypeId);
      if (!program || program.pg_type_id !== typeIdNum) return false;
    }

    // 3. Date Filters
    if (startDateFilter && (!program || program.pg_start_date < startDateFilter)) return false;
    if (endDateFilter && (!program || program.pg_end_date > endDateFilter)) return false;

    // 4. Status Filter (requires fetching tasks for that program)
    if (selectedStatusId !== 'all') {
      const statusIdNum = parseInt(selectedStatusId);
      if (!program) return false;
      const programTasks = tasks.filter((t) => t.pg_id === program.pg_id);
      const hasTaskWithStatus = programTasks.some((t) => t.status_id === statusIdNum);
      if (!hasTaskWithStatus) return false;
    }

    return true;
  });

  // Sorting
  const sortedInterns = [...filteredInterns].sort((a, b) => {
    const progA = programs.find((p) => p.intern_id === a.intern_id);
    const progB = programs.find((p) => p.intern_id === b.intern_id);

    let valA: any = '';
    let valB: any = '';

    if (sortField === 'name') {
      valA = a.name.toLowerCase();
      valB = b.name.toLowerCase();
    } else if (sortField === 'program') {
      const typeA = pgTypes.find((t) => t.pg_type_id === progA?.pg_type_id);
      const typeB = pgTypes.find((t) => t.pg_type_id === progB?.pg_type_id);
      valA = typeA?.pg_type.toLowerCase() || '';
      valB = typeB?.pg_type.toLowerCase() || '';
    } else if (sortField === 'start_date') {
      valA = progA?.pg_start_date || '';
      valB = progB?.pg_start_date || '';
    } else if (sortField === 'end_date') {
      valA = progA?.pg_end_date || '';
      valB = progB?.pg_end_date || '';
    } else if (sortField === 'progress') {
      valA = progA?.pg_status || 0;
      valB = progB?.pg_status || 0;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  // Find selected intern's active program tasks for modal view
  const activeProgram = selectedInternForProgram
    ? programs.find((p) => p.intern_id === selectedInternForProgram.intern_id)
    : null;
  const activeProgramTasks = activeProgram
    ? tasks.filter((t) => t.pg_id === activeProgram.pg_id)
    : [];

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar Nav */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Briefcase size={28} className="text-primary" />
          <span>PortalAdmin</span>
        </div>

        <div className="sidebar-user">
          <div className="user-info">
            <h4 className="user-name">{adminUser.name}</h4>
            <span className="user-role">Administrator</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>Intern Board</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
          >
            <Settings size={18} />
            <span>Configurations</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button onClick={onLogout} className="nav-link" style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-panel">
        <div className="panel-header">
          <div className="panel-title">
            <h1>{activeTab === 'dashboard' ? 'Intern Management Board' : 'Global Settings'}</h1>
            <p>{activeTab === 'dashboard' ? 'Create, monitor, and assign tasks to interns.' : 'Configure status codes and program streams.'}</p>
          </div>
          {activeTab === 'dashboard' && (
            <button onClick={() => setIsAddInternOpen(true)} className="btn btn-primary">
              <Plus size={18} /> Add Intern
            </button>
          )}
        </div>

        {activeTab === 'dashboard' ? (
          <>
            {/* Metrics Stripe */}
            <div className="metrics-grid">
              <div className="metric-card glass-panel">
                <div className="metric-details">
                  <h3>Total Interns</h3>
                  <div className="metric-value">{totalInterns}</div>
                </div>
                <div className="metric-icon">
                  <Users size={24} />
                </div>
              </div>
              <div className="metric-card glass-panel">
                <div className="metric-details">
                  <h3>Active Streams</h3>
                  <div className="metric-value">{activeProgramsCount}</div>
                </div>
                <div className="metric-icon">
                  <Briefcase size={24} />
                </div>
              </div>
              <div className="metric-card glass-panel">
                <div className="metric-details">
                  <h3>Average Progress</h3>
                  <div className="metric-value">{avgProgress}%</div>
                </div>
                <div className="metric-icon">
                  <CheckCircle size={24} />
                </div>
              </div>
              <div className="metric-card glass-panel">
                <div className="metric-details">
                  <h3>Pending Tasks</h3>
                  <div className="metric-value">{pendingTasksCount}</div>
                </div>
                <div className="metric-icon">
                  <AlertCircle size={24} />
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="filter-strip glass-panel">
              <div className="filter-input-group">
                <div className="input-wrapper" style={{ width: '100%' }}>
                  <input
                    type="text"
                    className="form-input search-input"
                    placeholder="Search name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Program filter */}
              <select
                className="filter-select"
                value={selectedPgTypeId}
                onChange={(e) => setSelectedPgTypeId(e.target.value)}
              >
                <option value="all">All Programs</option>
                {pgTypes.map((t) => (
                  <option key={t.pg_type_id} value={t.pg_type_id}>
                    {t.pg_type}
                  </option>
                ))}
              </select>

              {/* Status filter */}
              <select
                className="filter-select"
                value={selectedStatusId}
                onChange={(e) => setSelectedStatusId(e.target.value)}
              >
                <option value="all">Contains Task Status</option>
                {statuses.map((s) => (
                  <option key={s.status_id} value={s.status_id}>
                    {s.status}
                  </option>
                ))}
              </select>

              {/* Date Filters */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>From:</span>
                <input
                  type="date"
                  className="filter-select"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>To:</span>
                <input
                  type="date"
                  className="filter-select"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                />
              </div>
            </div>

            {/* Interns Table */}
            <div className="table-container glass-panel">
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => requestSort('name')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Intern Name <SortIcon field="name" />
                      </div>
                    </th>
                    <th onClick={() => requestSort('program')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Assigned Program <SortIcon field="program" />
                      </div>
                    </th>
                    <th onClick={() => requestSort('start_date')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Start Date <SortIcon field="start_date" />
                      </div>
                    </th>
                    <th onClick={() => requestSort('end_date')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        End Date <SortIcon field="end_date" />
                      </div>
                    </th>
                    <th onClick={() => requestSort('progress')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Progress <SortIcon field="progress" />
                      </div>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInterns.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        No interns found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    sortedInterns.map((intern) => {
                      const prog = programs.find((p) => p.intern_id === intern.intern_id);
                      const progType = prog ? pgTypes.find((t) => t.pg_type_id === prog.pg_type_id) : null;
                      return (
                        <tr key={intern.intern_id}>
                          <td>
                            <div>
                              <div style={{ fontWeight: '700' }}>{intern.name}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{intern.email}</div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                              {progType ? progType.pg_type : 'No Active Program'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{prog?.pg_start_date || '-'}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{prog?.pg_end_date || '-'}</td>
                          <td>
                            {prog ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '120px' }}>
                                <div className="progress-bar-container">
                                  <div className="progress-bar-fill" style={{ width: `${prog.pg_status}%` }}></div>
                                </div>
                                <span className="progress-percentage">{prog.pg_status}%</span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Not Started</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => handleOpenProgramModal(intern)}
                                className="btn btn-secondary"
                                style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                                title="Manage program and tasks"
                              >
                                <FolderOpen size={14} /> Manage
                              </button>
                              <button
                                onClick={() => intern.intern_id && handleDeleteIntern(intern.intern_id)}
                                className="btn btn-secondary btn-icon"
                                style={{ color: 'var(--accent-pink)' }}
                                title="Remove intern"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* Configurations Panel */
          <div className="settings-grid">
            {/* Program Streams Management */}
            <div className="settings-card glass-panel">
              <div className="settings-card-header">
                <h2>Program Streams</h2>
              </div>
              <form onSubmit={handleAddPgType} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '10px 14px' }}
                  placeholder="e.g. Winter Break Internship"
                  value={newPgTypeName}
                  onChange={(e) => setNewPgTypeName(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 16px' }}>
                  <Plus size={18} /> Add
                </button>
              </form>

              <div className="settings-list">
                {pgTypes.map((type) => (
                  <div key={type.pg_type_id} className="settings-item">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        className="checkbox-input"
                        checked={type.filter_pg === 'checked'}
                        onChange={() => type.pg_type_id && togglePgFilter(type.pg_type_id, type.filter_pg)}
                      />
                      <span className="checkbox-custom"></span>
                      <span>{type.pg_type}</span>
                    </label>
                    <button
                      onClick={() => type.pg_type_id && handleDeletePgType(type.pg_type_id)}
                      className="btn btn-secondary btn-icon"
                      style={{ color: 'var(--accent-pink)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Status Management */}
            <div className="settings-card glass-panel">
              <div className="settings-card-header">
                <h2>Task Status Nodes</h2>
              </div>
              <form onSubmit={handleAddStatus} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '10px 14px' }}
                  placeholder="e.g. Under Review"
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 16px' }}>
                  <Plus size={18} /> Add
                </button>
              </form>

              <div className="settings-list">
                {statuses.map((status) => (
                  <div key={status.status_id} className="settings-item">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        className="checkbox-input"
                        checked={status.filter_status === 'checked'}
                        onChange={() => status.status_id && toggleStatusFilter(status.status_id, status.filter_status)}
                      />
                      <span className="checkbox-custom"></span>
                      <span>{status.status}</span>
                    </label>
                    <button
                      onClick={() => status.status_id && handleDeleteStatus(status.status_id)}
                      className="btn btn-secondary btn-icon"
                      style={{ color: 'var(--accent-pink)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            MODALS
        ---------------------------------------------------- */}

        {/* Modal: Add Intern */}
        {isAddInternOpen && (
          <div className="modal-overlay">
            <div className="modal-content glass-panel">
              <div className="modal-header">
                <h3 className="modal-title">Create New Intern Profile</h3>
                <button onClick={() => setIsAddInternOpen(false)} className="modal-close">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddIntern}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Jane Doe"
                      value={newInternName}
                      onChange={(e) => setNewInternName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="input-wrapper" style={{ width: '100%' }}>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="jane.doe@internflow.com"
                      value={newInternEmail}
                      onChange={(e) => setNewInternEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Access Password</label>
                  <div className="input-wrapper" style={{ width: '100%' }}>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="••••••••"
                      value={newInternPassword}
                      onChange={(e) => setNewInternPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Join Date</label>
                  <div className="input-wrapper">
                    <input
                      type="date"
                      className="form-input"
                      style={{ paddingLeft: '14px' }}
                      value={newInternJoinDate}
                      onChange={(e) => setNewInternJoinDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" onClick={() => setIsAddInternOpen(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Manage Program & Tasks */}
        {isManageProgramOpen && selectedInternForProgram && (
          <div className="modal-overlay">
            <div className="modal-content glass-panel" style={{ maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="modal-header">
                <h3 className="modal-title">Program & Tasks: {selectedInternForProgram.name}</h3>
                <button onClick={() => setIsManageProgramOpen(false)} className="modal-close">
                  <X size={20} />
                </button>
              </div>

              {/* Program Configurations */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div>
                  <label className="form-label">Program Type</label>
                  <select
                    className="filter-select"
                    style={{ width: '100%' }}
                    value={progTypeId}
                    onChange={(e) => setProgTypeId(parseInt(e.target.value))}
                  >
                    {pgTypes.map((t) => (
                      <option key={t.pg_type_id} value={t.pg_type_id}>
                        {t.pg_type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="filter-select"
                    style={{ width: '100%' }}
                    value={progStartDate}
                    onChange={(e) => setProgStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="filter-select"
                    style={{ width: '100%' }}
                    value={progEndDate}
                    onChange={(e) => setProgEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Tasks List */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  Current Tasks ({activeProgramTasks.length})
                </h4>

                {activeProgramTasks.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '10px 0' }}>No tasks assigned yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                    {activeProgramTasks.map((task) => {
                      const tStatus = statuses.find((s) => s.status_id === task.status_id);
                      return (
                        <div
                          key={task.task_id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px',
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.03)',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{task.task}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {task.task_start_date} to {task.task_end_date}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span className={`status-badge ${tStatus?.status.toLowerCase().replace(' ', '')}`}>
                              {tStatus?.status || 'No status'}
                            </span>
                            <button
                              type="button"
                              onClick={() => task.task_id && activeProgram?.pg_id && handleDeleteTask(task.task_id, activeProgram.pg_id)}
                              className="btn btn-secondary btn-icon"
                              style={{ color: 'var(--accent-pink)', padding: '6px' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Task Creation Form */}
              <form onSubmit={handleAddTask} style={{ border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)' }}>
                <h4 style={{ marginBottom: '12px', fontSize: '0.95rem' }}>Create New Task Node</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Task Name</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '10px 14px' }}
                      placeholder="e.g. Setup API endpoints"
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Initial Status</label>
                    <select
                      className="filter-select"
                      style={{ width: '100%', height: '45px' }}
                      value={newTaskStatus}
                      onChange={(e) => setNewTaskStatus(parseInt(e.target.value))}
                    >
                      {statuses.map((s) => (
                        <option key={s.status_id} value={s.status_id}>
                          {s.status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Task Description</label>
                  <textarea
                    className="form-input"
                    style={{ padding: '10px 14px', height: '60px', resize: 'none' }}
                    placeholder="Brief description of the deliverables..."
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="filter-select"
                      style={{ width: '100%' }}
                      value={newTaskStart}
                      onChange={(e) => setNewTaskStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      className="filter-select"
                      style={{ width: '100%' }}
                      value={newTaskEnd}
                      onChange={(e) => setNewTaskEnd(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-secondary" style={{ width: '100%', display: 'flex', gap: '6px' }}>
                  <PlusCircle size={16} /> Append Task Node
                </button>
              </form>

              <div className="modal-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                <button type="button" onClick={() => setIsManageProgramOpen(false)} className="btn btn-secondary">
                  Close
                </button>
                <button type="button" onClick={handleSaveProgram} className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
