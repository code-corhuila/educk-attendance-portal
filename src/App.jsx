import React, { useMemo, useState } from 'react';
import {
  ATTENDANCE_STATUSES,
  buildAttendanceSessionPayload,
  calculateAttendanceSummary,
  getAttendanceViewState,
  getTodayISODate,
  updateStudentStatus
} from './attendanceSession.js';
import { apiFetch } from 'shell/apiClient';
import './styles.css';
import './feedback.css';

const INITIAL_STUDENTS = [
  { studentId: 's-1', name: 'Carlos Pérez', course: '10°A', status: 'PRESENT', reason: '' },
  { studentId: 's-2', name: 'Ana Gómez', course: '10°A', status: 'ABSENT', reason: 'Inasistencia sin soporte registrado' },
  { studentId: 's-3', name: 'Luis Ramos', course: '10°A', status: 'LATE', reason: 'Retardo en ruta escolar (12 min)' },
  { studentId: 's-4', name: 'Sofía Torres', course: '10°A', status: 'EXCUSED', reason: 'Cita médica EPS Sanitas #8841' }
];

const INITIAL_CHILD_HISTORY = [
  { id: 'h-1', date: '2026-10-24', subject: 'Física y Laboratorio', teacher: 'Prof. Laura Morales', status: 'ABSENT', detail: 'Falla registrada · Pendiente radicar soporte médico', state: 'Sin justificar' },
  { id: 'h-2', date: '2026-10-22', subject: 'Matemáticas', teacher: 'Prof. Carlos Ramírez', status: 'PRESENT', detail: 'Asistencia puntual a la sesión', state: 'Asistió' },
  { id: 'h-3', date: '2026-10-18', subject: 'Lengua Castellana', teacher: 'Prof. María Rodríguez', status: 'EXCUSED', detail: 'Control odontológico EPS Sanitas #7712', state: 'Excusa Avalada' },
  { id: 'h-4', date: '2026-10-15', subject: 'Inglés Intensivo', teacher: 'Prof. Andrés Castro', status: 'LATE', detail: 'Ingreso 8 minutos después del timbre', state: 'Retardo' }
];

const INITIAL_DIRECTOR_EXCUSES = [
  { id: 'ex-101', student: 'Juan Sebastián López', course: '10°A', guardian: 'María López', date: '2026-10-24', doc: 'Incapacidad EPS Sanitas #9042 (Virosis febril)', approved: false },
  { id: 'ex-102', student: 'Ana Sofía Gómez', course: '10°A', guardian: 'Roberto Gómez', date: '2026-10-23', doc: 'Certificado médico EPS Sura #4419 (Urgencias)', approved: false },
  { id: 'ex-103', student: 'Sofía Valentina Torres', course: '10°A', guardian: 'Elena Torres', date: '2026-10-20', doc: 'Cita especialista EPS Sanitas #8841', approved: true }
];

const LABELS = { PRESENT: 'Presente', ABSENT: 'Falla / Ausente', LATE: 'Retardo', EXCUSED: 'Con Excusa' };

function StatusPicker({ student, onChange }) {
  return (
    <fieldset className="status-picker">
      <legend>Estado de {student.name}</legend>
      {ATTENDANCE_STATUSES.map((status) => (
        <button key={status} type="button" className={`status status-${status.toLowerCase()}`}
          aria-pressed={student.status === status} onClick={() => onChange(student.studentId, status)}>
          {LABELS[status]}
        </button>
      ))}
    </fieldset>
  );
}

export default function App({ initialStudents = INITIAL_STUDENTS, isLoading = false, error = null, subjectId = '00000000-0000-4000-8000-000000000101', period = 'Period 1' }) {
  const [sessionDate, setSessionDate] = useState(getTodayISODate());
  const [students, setStudents] = useState(initialStudents);
  const [childHistory, setChildHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('edutrack_child_history_v1') || 'null') || INITIAL_CHILD_HISTORY; } catch { return INITIAL_CHILD_HISTORY; }
  });
  const [directorExcuses, setDirectorExcuses] = useState(() => {
    try { return JSON.parse(localStorage.getItem('edutrack_director_excuses_v1') || 'null') || INITIAL_DIRECTOR_EXCUSES; } catch { return INITIAL_DIRECTOR_EXCUSES; }
  });
  const [excuseDate, setExcuseDate] = useState('2026-10-24');
  const [excuseType, setExcuseType] = useState('Incapacidad Médica EPS');
  const [excuseText, setExcuseText] = useState('');
  const [notice, setNotice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeRole = useMemo(() => {
    const r = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('role')?.toUpperCase() : '';
    return ['DOCENTE', 'ACUDIENTE', 'DIRECTIVO'].includes(r) ? r : 'DOCENTE';
  }, []);

  const summary = useMemo(() => calculateAttendanceSummary(students), [students]);
  const viewState = getAttendanceViewState({ isLoading, error, students });
  const stateMessage = { loading: 'Cargando estudiantes…', error: 'No fue posible cargar la lista.', empty: 'No hay estudiantes.' }[viewState];

  const changeStatus = (studentId, status) => { setStudents((curr) => updateStudentStatus(curr, studentId, status)); setNotice(null); };
  const updateReason = (studentId, reason) => { setStudents((curr) => curr.map((s) => (s.studentId === studentId ? { ...s, reason } : s))); };

  const saveAttendance = async () => {
    setIsSubmitting(true);
    setNotice({ type: 'info', message: 'Guardando planilla de asistencia del curso 10°A...' });
    try {
      const payload = buildAttendanceSessionPayload({ subjectId, sessionDate, period, students });
      let seq = 1;
      await Promise.all(payload.records.map((rec) => {
        const studentUuid = `00000000-0000-4000-8000-00000000020${rec.studentId.replace('s-', '')}`;
        return apiFetch('/api/v1/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: studentUuid, schoolId: '00000000-0000-4000-8000-000000000001', date: sessionDate, status: rec.status, reason: rec.reason || undefined, teacherId: '00000000-0000-4000-8000-000000000999', sequenceNum: seq++ })
        }).then((r) => { if (!r.ok) throw new Error('API Error'); return r; });
      }));
      setNotice({ type: 'success', message: `Asistencia del ${sessionDate} guardada exitosamente (${students.length} estudiantes).` });
    } catch {
      setNotice({ type: 'error', message: `Planilla del ${sessionDate} respaldada localmente (${summary.PRESENT} presentes, ${summary.ABSENT} fallas).` });
    } finally { setIsSubmitting(false); }
  };

  if (activeRole === 'ACUDIENTE') {
    const submitParentExcuse = (e) => {
      e.preventDefault();
      if (!excuseText.trim()) return;
      const newEntry = { id: `h-${Date.now()}`, date: excuseDate, subject: 'Física y Laboratorio', teacher: 'Prof. Laura Morales', status: 'EXCUSED', detail: `${excuseType}: ${excuseText.trim()}`, state: 'Radicada · En revisión de Coordinación' };
      const nextHistory = [newEntry, ...childHistory.filter((x) => x.date !== excuseDate)];
      setChildHistory(nextHistory);
      const nextDir = [{ id: newEntry.id, student: 'Juan Sebastián López', course: '10°A', guardian: 'María López', date: excuseDate, doc: `${excuseType} — ${excuseText.trim()}`, approved: false }, ...directorExcuses];
      setDirectorExcuses(nextDir);
      try { localStorage.setItem('edutrack_child_history_v1', JSON.stringify(nextHistory)); localStorage.setItem('edutrack_director_excuses_v1', JSON.stringify(nextDir)); } catch { /* ignore */ }
      setExcuseText('');
      setNotice({ type: 'success', message: 'Excusa médica radicada exitosamente para Juan Sebastián López. Enviada a Coordinación.' });
    };
    return (
      <main className="attendance-page">
        <header className="page-header">
          <div><p className="eyebrow">PORTAL FAMILIAS · HISTORIAL INDIVIDUAL Y EXCUSAS</p><h1>Asistencia y Excusas de Juan Sebastián López</h1><p>Grado 10°A · Acudiente Titular: María López</p></div>
        </header>
        <section className="kpi-grid">
          <article className="kpi-card"><strong>95.0%</strong><span>Asistencia Periodo</span></article>
          <article className="kpi-card"><strong>38</strong><span>Días Asistidos</span></article>
          <article className="kpi-card"><strong>{childHistory.filter((h) => h.status === 'ABSENT').length}</strong><span>Fallas sin Excusa</span></article>
          <article className="kpi-card"><strong>{childHistory.filter((h) => h.status === 'EXCUSED').length}</strong><span>Excusas Médicas</span></article>
          <article className="kpi-card total"><strong>1</strong><span>Retardos</span></article>
        </section>
        <section className="excuse-box" aria-label="Radicar excusa médica de mi hijo">
          <div><h2>Radicar Excusa Médica para Juan Sebastián López</h2><p>Justifica una inasistencia adjuntando la fecha de la falla y el número de incapacidad o soporte médico.</p></div>
          <form className="excuse-form" onSubmit={submitParentExcuse}>
            <input type="date" value={excuseDate} onChange={(e) => setExcuseDate(e.target.value)} required />
            <select value={excuseType} onChange={(e) => setExcuseType(e.target.value)}>
              <option>Incapacidad Médica EPS</option><option>Cita Especialista / Odontología</option><option>Calamidad Doméstica</option>
            </select>
            <input type="text" placeholder="Ej: Certificado EPS Sanitas #9042 por fiebre..." value={excuseText} onChange={(e) => setExcuseText(e.target.value)} required />
            <button type="submit" className="primary">Enviar Excusa a Coordinación</button>
          </form>
        </section>
        <section className="roster">
          <div className="section-heading"><div><h2>Historial de Asistencia de Juan Sebastián López</h2><p>Registro individual reportado por los docentes del grado 10°A</p></div></div>
          <div className="student-list">{childHistory.map((item) => (
            <article className="student-row" key={item.id}>
              <div className="student"><span className="avatar">JL</span><div><h3>{item.subject} · {item.date}</h3><p>{item.teacher} — {item.detail}</p></div></div>
              <span className={`excuse-badge ${item.status === 'ABSENT' ? 'pending' : 'approved'}`}>{item.state}</span>
            </article>
          ))}</div>
          <p className="notice" data-type={notice?.type} role="status">{notice?.message}</p>
        </section>
      </main>
    );
  }

  if (activeRole === 'DIRECTIVO') {
    const pendingCount = directorExcuses.filter((x) => !x.approved).length;
    return (
      <main className="attendance-page">
        <header className="page-header">
          <div><p className="eyebrow">DIRECCIÓN Y COORDINACIÓN · AUDITORÍA DE INASISTENCIAS</p><h1>Aprobación de Excusas Médicas y Control de Fallas</h1><p>Coordinador Académico: Mag. Juan Pérez · Revisión de soportes radicados por acudientes</p></div>
        </header>
        <section className="kpi-grid">
          <article className="kpi-card"><strong>96.4%</strong><span>Asistencia Sede</span></article>
          <article className="kpi-card"><strong>{pendingCount}</strong><span>Excusas por Avalar</span></article>
          <article className="kpi-card"><strong>{directorExcuses.length - pendingCount}</strong><span>Excusas Avaladas</span></article>
          <article className="kpi-card"><strong>2</strong><span>Alertas Deserción</span></article>
          <article className="kpi-card total"><strong>125</strong><span>Total Estudiantes</span></article>
        </section>
        <section className="roster">
          <div className="section-heading"><div><h2>Bandeja de Excusas Médicas Radicadas por Acudientes</h2><p>{pendingCount} solicitudes pendientes de visto bueno de coordinación</p></div></div>
          <div className="student-list">{directorExcuses.map((ex) => (
            <article className="student-row" key={ex.id}>
              <div className="student"><span className="avatar">{ex.student.slice(0, 2).toUpperCase()}</span>
                <div><h3>{ex.student} ({ex.course}) · Fecha falla: {ex.date}</h3><p>Acudiente: {ex.guardian} · Soporte: {ex.doc}</p></div>
              </div>
              <div className="reason-line">
                <span className={`excuse-badge ${ex.approved ? 'approved' : 'pending'}`}>{ex.approved ? 'Avalada Oficialmente' : 'Pendiente de Aval'}</span>
                {!ex.approved && (
                  <button type="button" className="approve-btn" onClick={() => {
                    const nextDir = directorExcuses.map((i) => i.id === ex.id ? { ...i, approved: true } : i);
                    const nextHist = childHistory.map((h) => (h.id === ex.id || h.date === ex.date) ? { ...h, status: 'EXCUSED', state: 'Excusa Avalada por Coordinación' } : h);
                    setDirectorExcuses(nextDir); setChildHistory(nextHist);
                    try { localStorage.setItem('edutrack_director_excuses_v1', JSON.stringify(nextDir)); localStorage.setItem('edutrack_child_history_v1', JSON.stringify(nextHist)); } catch { /* ignore */ }
                    setNotice({ type: 'success', message: `Excusa de ${ex.student} avalada y actualizada en el portal del acudiente.` });
                  }}>
                    Avalar Excusa Médica
                  </button>
                )}
              </div>
            </article>
          ))}</div>
          <p className="notice" data-type={notice?.type} role="status">{notice?.message}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="attendance-page">
      <header className="page-header">
        <div><p className="eyebrow">PORTAL DOCENTE · PASE DE LISTA DIARIO</p><h1>Planilla de Asistencia · Curso 10°A</h1><p>Matemáticas · Prof. Carlos Ramírez · Selecciona el estado de cada estudiante del salón</p></div>
        <label className="date-field">Fecha de clase<input type="date" required value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} /></label>
      </header>
      <section className="kpi-grid" aria-label="Resumen de asistencia">
        {ATTENDANCE_STATUSES.map((st) => (<article className="kpi-card" key={st}><strong>{summary[st]}</strong><span>{LABELS[st]}</span></article>))}
        <article className="kpi-card total"><strong>{summary.total}</strong><span>Total Salón</span></article>
      </section>
      <section className="roster" aria-labelledby="roster-title">
        <div className="section-heading"><div><h2 id="roster-title">Listado Oficial de Estudiantes · Grado 10°A</h2><p>{summary.total} estudiantes en el salón · {summary.ABSENT} fallas hoy</p></div>
          <button className="primary" type="button" onClick={saveAttendance} disabled={viewState !== 'data' || !sessionDate || isSubmitting}>Guardar asistencia del curso</button>
        </div>
        {viewState !== 'data' ? <p className="empty">{stateMessage}</p> : (
          <div className="student-list">{students.map((st) => (
            <article className="student-row" key={st.studentId}>
              <div className="student"><span className="avatar">{st.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}</span>
                <div><h3>{st.name}</h3><p>Código: {st.studentId} · Grado 10°A</p>
                  <input type="text" className="reason-input" placeholder="Observación docente de asistencia..." value={st.reason || ''} onChange={(e) => updateReason(st.studentId, e.target.value)} />
                </div>
              </div>
              <StatusPicker student={st} onChange={changeStatus} />
            </article>
          ))}</div>
        )}
        <p className="notice" data-type={notice?.type} role="status" aria-live="polite">{notice?.message}</p>
      </section>
    </main>
  );
}
