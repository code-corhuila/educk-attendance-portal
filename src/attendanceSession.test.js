import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAttendanceSessionPayload,
  calculateAttendanceSummary,
  getAttendanceViewState,
  getTodayISODate,
  updateStudentStatus
} from './attendanceSession.js';

const students = [
  { studentId: '1', name: 'Ana', status: 'PRESENT' },
  { studentId: '2', name: 'Luis', status: 'ABSENT' },
  { studentId: '3', name: 'Sofía', status: 'EXCUSED', reason: 'Medical' }
];

test('updates one status without mutating the source array', () => {
  const updated = updateStudentStatus(students, '2', 'LATE');
  assert.equal(updated[1].status, 'LATE');
  assert.equal(students[1].status, 'ABSENT');
});

test('rejects a status outside the official API enum', () => {
  assert.throws(() => updateStudentStatus(students, '1', 'JUSTIFIED'), /Unsupported/);
});

test('calculates totals for all official statuses', () => {
  assert.deepEqual(calculateAttendanceSummary(students), {
    PRESENT: 1, ABSENT: 1, LATE: 0, EXCUSED: 1, total: 3
  });
});

test('resolves loading, error, empty and data states', () => {
  assert.equal(getAttendanceViewState({ isLoading: true }), 'loading');
  assert.equal(getAttendanceViewState({ error: new Error('offline') }), 'error');
  assert.equal(getAttendanceViewState({ students: [] }), 'empty');
  assert.equal(getAttendanceViewState({ students }), 'data');
});

test('formats a local date as YYYY-MM-DD', () => {
  assert.equal(getTodayISODate(new Date('2026-09-25T12:00:00Z')), '2026-09-25');
});

test('builds the documented session payload without presentation fields', () => {
  const payload = buildAttendanceSessionPayload({ subjectId: 'subject', sessionDate: '2026-09-25', period: 'Period 1', students });
  assert.deepEqual(payload.records[2], { studentId: '3', status: 'EXCUSED', reason: 'Medical' });
  assert.equal('name' in payload.records[0], false);
});
