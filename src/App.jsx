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

const INITIAL_STUDENTS = [
  { studentId: 's-1', name: 'Carlos Pérez', status: 'PRESENT' },
  { studentId: 's-2', name: 'Ana Gómez', status: 'ABSENT' },
  { studentId: 's-3', name: 'Luis Ramos', status: 'LATE' },
  { studentId: 's-4', name: 'Sofía Torres', status: 'EXCUSED', reason: 'Cita médica' }
];

const LABELS = { PRESENT: 'Presente', ABSENT: 'Ausente', LATE: 'Tarde', EXCUSED: 'Excusa' };

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
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const summary = useMemo(() => calculateAttendanceSummary(students), [students]);
  const viewState = getAttendanceViewState({ isLoading, error, students });
  const stateMessage = { loading: 'Cargando estudiantes…', error: 'No fue posible cargar la lista. Intenta de nuevo.', empty: 'No hay estudiantes para esta sesión.' }[viewState];

  const changeStatus = (studentId, status) => {
    setStudents((current) => updateStudentStatus(current, studentId, status));
    setNotice('');
  };

  const saveAttendance = async () => {
    setIsSubmitting(true);
    setNotice('Guardando asistencia...');
    try {
      const payload = buildAttendanceSessionPayload({
        subjectId, sessionDate, period, students
      });
      const response = await apiFetch('/api/v1/attendance/sessions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Error del servidor');
      setNotice(`Asistencia del ${payload.sessionDate} guardada: ${payload.records.length} registros.`);
    } catch (e) {
      setNotice('Error de conexión al enviar la asistencia al API.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="attendance-page">
      <header className="page-header">
        <div><p className="eyebrow">Portal docente</p><h1>Registro de asistencia</h1><p>Matemáticas · Periodo 1</p></div>
        <label className="date-field">Fecha de clase
          <input type="date" required value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} />
        </label>
      </header>

      <section className="kpi-grid" aria-label="Resumen de asistencia">
        {ATTENDANCE_STATUSES.map((status) => (
          <article className="kpi-card" key={status}><strong>{summary[status]}</strong><span>{LABELS[status]}</span></article>
        ))}
        <article className="kpi-card total"><strong>{summary.total}</strong><span>Total</span></article>
      </section>

      <section className="roster" aria-labelledby="roster-title">
        <div className="section-heading"><div><h2 id="roster-title">Lista del curso</h2><p>{summary.total} estudiantes</p></div>
          <button className="primary" type="button" onClick={saveAttendance} disabled={viewState !== 'data' || !sessionDate || isSubmitting}>Guardar asistencia</button>
        </div>
        {viewState !== 'data' ? <p className="empty" role={viewState === 'error' ? 'alert' : undefined}>{stateMessage}</p> : (
          <div className="student-list">{students.map((student) => (
            <article className="student-row" key={student.studentId}>
              <div className="student"><span className="avatar" aria-hidden="true">{student.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
                <div><h3>{student.name}</h3><p>{student.studentId}</p></div></div>
              <StatusPicker student={student} onChange={changeStatus} />
            </article>
          ))}</div>
        )}
        <p className="notice" role="status" aria-live="polite">{notice}</p>
      </section>
    </main>
  );
}
