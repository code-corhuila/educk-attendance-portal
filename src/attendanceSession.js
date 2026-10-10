export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

export function getTodayISODate(date = new Date()) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
}

export function updateStudentStatus(students, studentId, status) {
  if (!ATTENDANCE_STATUSES.includes(status)) throw new Error(`Unsupported attendance status: ${status}`);
  return students.map((student) => student.studentId === studentId ? { ...student, status } : student);
}

export function calculateAttendanceSummary(students) {
  const summary = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, total: students.length };
  students.forEach(({ status }) => { if (status in summary) summary[status] += 1; });
  return summary;
}

export function getAttendanceViewState({ isLoading = false, error = null, students = [] }) {
  if (isLoading) return 'loading';
  if (error) return 'error';
  return students.length ? 'data' : 'empty';
}

/**
 * Creates the POST /api/v1/attendance body for the real backend API.
 * The API accepts subjectId, sessionDate, period and records; student names are
 * presentation data and are excluded.
 */
export function buildAttendanceSessionPayload({ subjectId, sessionDate, period, students }) {
  return {
    subjectId, sessionDate, period,
    records: students.map(({ studentId, status, reason }) => ({
      studentId, status, ...(reason ? { reason } : {})
    }))
  };
}
