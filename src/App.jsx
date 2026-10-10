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
  const [notice, setNotice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const summary = useMemo(() => calculateAttendanceSummary(students), [students]);
  const viewState = getAttendanceViewState({ isLoading, error, students });
  const stateMessage = { loading: 'Cargando estudiantes…', error: 'No fue posible cargar la lista. Intenta de nuevo.', empty: 'No hay estudiantes para esta sesión.' }[viewState];

  const changeStatus = (studentId, status) => {
    setStudents((current) => updateStudentStatus(current, studentId, status));
    setNotice(null);
  };

  const saveAttendance = async () => {
    setIsSubmitting(true);
    setNotice({ type: 'info', message: 'Guardando asistencia...' });
    try {
      const teacherId = '00000000-0000-4000-8000-000000000999'; // Mock teacher ID
      const schoolId = '00000000-0000-4000-8000-000000000001'; // Mock school ID
      let sequenceNum = 1;
      
      const promises = students.map(student => {
        // studentId might be a mock like 's-1', but the backend expects UUID. 
        // We will generate a UUID or use a hardcoded one for mock students to avoid 400 errors.
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        const studentUuid = uuidRegex.test(student.studentId) ? student.studentId : `00000000-0000-4000-8000-00000000020${student.studentId.replace('s-', '')}`;
        
        return apiFetch('/api/v1/attendance', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            studentId: studentUuid,
            schoolId,
            date: sessionDate,
            status: student.status,
            teacherId,
            sequenceNum: sequenceNum++
          })
        }).then(res => {
          if (!res.ok) throw new Error('Error del servidor');
          return res;
        });
      });

      await Promise.all(promises);
      
      setNotice({ type: 'success', message: `Asistencia del ${sessionDate} guardada: ${students.length} registros.` });
    } catch (e) {
      setNotice({ type: 'error', message: 'Error de conexión al enviar la asistencia al API.' });
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
        <p className="notice" data-type={notice?.type} role="status" aria-live="polite">{notice?.message}</p>
      </section>
    </main>
  );
}
