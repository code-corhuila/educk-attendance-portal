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
  { studentId: 's-2', name: 'Ana Gómez', course: '10°A', status: 'ABSENT', reason: 'Sin justificar (Falla registrada)' },
  { studentId: 's-3', name: 'Luis Ramos', course: '10°A', status: 'LATE', reason: 'Retardo en transporte escolar (15 min)' },
  { studentId: 's-4', name: 'Sofía Torres', course: '10°A', status: 'EXCUSED', reason: 'Cita médica EPS Sanitas #8841', excuseApproved: true }
];

const LABELS = { PRESENT: 'Presente', ABSENT: 'Falla / Ausente', LATE: 'Retardo', EXCUSED: 'Con Excusa' };

const ROLE_META = {
  DOCENTE: { eyebrow: 'PORTAL DOCENTE · PASE DE LISTA', title: 'Registro de Asistencia y Fallas', subtitle: 'Matemáticas · Grado 10°A · Periodo 2' },
  ACUDIENTE: { eyebrow: 'PORTAL ACUDIENTE · JUSTIFICACIÓN DE INASISTENCIAS', title: 'Consulta de Fallas y Radicación de Excusas', subtitle: 'Estudiante matriculado · Grado 10°A · Vigencia 2026-B' },
  DIRECTIVO: { eyebrow: 'DIRECCIÓN Y COORDINACIÓN · AUDITORÍA', title: 'Supervisión de Fallas y Aprobación de Excusas', subtitle: 'Consolidado Institucional · Sedes Integradas' }
};

function StatusPicker({ student, onChange, disabled }) {
  return (
    <fieldset className="status-picker" disabled={disabled}>
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
  const [activeRole, setActiveRole] = useState(() => {
    const urlRole = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('role')?.toUpperCase() : '';
    return ['DOCENTE', 'ACUDIENTE', 'DIRECTIVO'].includes(urlRole) ? urlRole : 'DOCENTE';
  });
  const [students, setStudents] = useState(initialStudents);
  const [excuseStudentId, setExcuseStudentId] = useState('s-2');
  const [excuseText, setExcuseText] = useState('');
  const [notice, setNotice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const summary = useMemo(() => calculateAttendanceSummary(students), [students]);
  const viewState = getAttendanceViewState({ isLoading, error, students });
  const stateMessage = { loading: 'Cargando estudiantes…', error: 'No fue posible cargar la lista. Intenta de nuevo.', empty: 'No hay estudiantes para esta sesión.' }[viewState];
  const roleInfo = ROLE_META[activeRole];

  const changeStatus = (studentId, status) => {
    setStudents((current) => updateStudentStatus(current, studentId, status));
    setNotice(null);
  };

  const updateReason = (studentId, reason) => {
    setStudents((current) => current.map((s) => (s.studentId === studentId ? { ...s, reason } : s)));
  };

  const handleSubmitExcuse = (e) => {
    e.preventDefault();
    if (!excuseText.trim()) return;
    setStudents((current) =>
      current.map((s) =>
        s.studentId === excuseStudentId
          ? { ...s, status: 'EXCUSED', reason: excuseText.trim(), excuseApproved: false }
          : s
      )
    );
    const targetName = students.find((s) => s.studentId === excuseStudentId)?.name || excuseStudentId;
    setExcuseText('');
    setNotice({ type: 'success', message: `Excusa radicada para ${targetName}. Estado actualizado a Con Excusa (pendiente de visto bueno).` });
  };

  const handleApproveExcuse = (studentId) => {
    setStudents((current) =>
      current.map((s) => (s.studentId === studentId ? { ...s, status: 'EXCUSED', excuseApproved: true } : s))
    );
    setNotice({ type: 'success', message: `Excusa médica avalada oficialmente por Coordinación.` });
  };

  const saveAttendance = async () => {
    setIsSubmitting(true);
    setNotice({ type: 'info', message: 'Guardando asistencia...' });
    try {
      const teacherId = '00000000-0000-4000-8000-000000000999';
      const schoolId = '00000000-0000-4000-8000-000000000001';
      let sequenceNum = 1;
      const sessionPayload = buildAttendanceSessionPayload({ subjectId, sessionDate, period, students });

      const promises = sessionPayload.records.map((record) => {
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        const studentUuid = uuidRegex.test(record.studentId) ? record.studentId : `00000000-0000-4000-8000-00000000020${record.studentId.replace('s-', '')}`;

        return apiFetch('/api/v1/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: studentUuid,
            schoolId,
            date: sessionDate,
            status: record.status,
            reason: record.reason || undefined,
            teacherId,
            sequenceNum: sequenceNum++
          })
        }).then((res) => {
          if (!res.ok) throw new Error('Error del servidor');
          return res;
        });
      });

      await Promise.all(promises);
      setNotice({ type: 'success', message: `Asistencia del ${sessionDate} guardada: ${students.length} registros.` });
    } catch {
      setNotice({ type: 'error', message: `Error de conexión al enviar la asistencia al API. Se conserva el registro local (${summary.ABSENT} fallas, ${summary.EXCUSED} excusas).` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="attendance-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{roleInfo.eyebrow}</p>
          <h1>{roleInfo.title}</h1>
          <p>{roleInfo.subtitle}</p>
        </div>
        <div className="header-controls">
          <div className="role-switcher" role="tablist" aria-label="Cambiar rol en Asistencia">
            {['DOCENTE', 'ACUDIENTE', 'DIRECTIVO'].map((role) => (
              <button key={role} type="button" role="tab" aria-selected={activeRole === role}
                className={`role-btn ${activeRole === role ? 'active' : ''}`} onClick={() => setActiveRole(role)}>
                {role === 'DOCENTE' ? 'Vista Docente' : role === 'ACUDIENTE' ? 'Vista Acudiente' : 'Vista Director'}
              </button>
            ))}
          </div>
          <label className="date-field">Fecha de clase
            <input type="date" required value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} />
          </label>
        </div>
      </header>

      <section className="kpi-grid" aria-label="Resumen de asistencia">
        {ATTENDANCE_STATUSES.map((status) => (
          <article className="kpi-card" key={status}><strong>{summary[status]}</strong><span>{LABELS[status]}</span></article>
        ))}
        <article className="kpi-card total"><strong>{summary.total}</strong><span>Total Curso</span></article>
      </section>

      {activeRole === 'ACUDIENTE' && (
        <section className="excuse-box" aria-label="Radicar excusa de inasistencia">
          <div>
            <h2>Radicar Excusa o Justificación de Falla</h2>
            <p>Adjunta el motivo o número de soporte médico para justificar una inasistencia o retardo.</p>
          </div>
          <form className="excuse-form" onSubmit={handleSubmitExcuse}>
            <select aria-label="Seleccionar estudiante" value={excuseStudentId} onChange={(e) => setExcuseStudentId(e.target.value)}>
              {students.map((s) => (
                <option key={s.studentId} value={s.studentId}>{s.name} ({LABELS[s.status]})</option>
              ))}
            </select>
            <input type="text" placeholder="Ej: Incapacidad médica EPS Sanitas #9021 por fiebre..." value={excuseText} onChange={(e) => setExcuseText(e.target.value)} required />
            <button type="submit" className="primary">Radicar Excusa</button>
          </form>
        </section>
      )}

      <section className="roster" aria-labelledby="roster-title">
        <div className="section-heading">
          <div>
            <h2 id="roster-title">Lista del curso y estado de excusas</h2>
            <p>{summary.total} estudiantes · {summary.ABSENT} fallas sin justificar · {summary.EXCUSED} excusas registradas</p>
          </div>
          <button className="primary" type="button" onClick={saveAttendance} disabled={viewState !== 'data' || !sessionDate || isSubmitting}>
            Guardar asistencia
          </button>
        </div>
        {viewState !== 'data' ? <p className="empty" role={viewState === 'error' ? 'alert' : undefined}>{stateMessage}</p> : (
          <div className="student-list">{students.map((student) => (
            <article className="student-row" key={student.studentId}>
              <div className="student">
                <span className="avatar" aria-hidden="true">{student.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
                <div>
                  <h3>{student.name}</h3>
                  <p>{student.studentId} · {student.course || '10°A'}</p>
                  <div className="reason-line">
                    <input
                      type="text"
                      className="reason-input"
                      aria-label={`Observación o excusa de ${student.name}`}
                      placeholder="Agregar observación o soporte de excusa..."
                      value={student.reason || ''}
                      onChange={(e) => updateReason(student.studentId, e.target.value)}
                    />
                    {student.status === 'EXCUSED' && (
                      <span className={`excuse-badge ${student.excuseApproved ? 'approved' : 'pending'}`}>
                        {student.excuseApproved ? 'Excusa Avalada' : 'Pendiente Aval'}
                      </span>
                    )}
                    {activeRole === 'DIRECTIVO' && student.status === 'EXCUSED' && !student.excuseApproved && (
                      <button type="button" className="approve-btn" onClick={() => handleApproveExcuse(student.studentId)}>
                        Avalar Excusa
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <StatusPicker student={student} onChange={changeStatus} disabled={activeRole === 'ACUDIENTE'} />
            </article>
          ))}</div>
        )}
        <p className="notice" data-type={notice?.type} role="status" aria-live="polite">{notice?.message}</p>
      </section>
    </main>
  );
}
