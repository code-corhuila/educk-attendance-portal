import React, { useState } from 'react';

export default function App() {
  const [students, setStudents] = useState([
    { id: 's-1', name: 'Carlos Pérez', status: 'PRESENT' },
    { id: 's-2', name: 'Ana Gómez', status: 'ABSENT' },
    { id: 's-3', name: 'Luis Ramos', status: 'PRESENT' }
  ]);

  const updateStatus = (id, newStatus) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 650, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <h2 style={{ color: '#b45309' }}>EduTrack — Pase de Lista Rápido</h2>
      <p style={{ color: '#666', fontSize: 13 }}>Portal Asistencia y Orden Causal (HU-005) | Puerto 3003</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
        {students.map(s => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, border: '1px solid #e5e7eb', borderRadius: 6 }}>
            <span style={{ fontWeight: 'bold' }}>{s.name}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {['PRESENT', 'ABSENT', 'LATE'].map(st => (
                <button
                  key={st}
                  onClick={() => updateStatus(s.id, st)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 4,
                    border: 'none',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    background: s.status === st ? (st === 'PRESENT' ? '#10b981' : st === 'ABSENT' ? '#ef4444' : '#f59e0b') : '#e5e7eb',
                    color: s.status === st ? '#fff' : '#374151'
                  }}
                >
                  {st === 'PRESENT' ? 'Presente' : st === 'ABSENT' ? 'Ausente' : 'Tarde'}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button style={{ marginTop: 20, width: '100%', padding: 12, background: '#b45309', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>
        Guardar Asistencia Diaria
      </button>
    </div>
  );
}
