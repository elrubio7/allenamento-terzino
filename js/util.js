'use strict';
/* ============================================================
   UTIL — date, formattazione, piccoli helper DOM
   Settimana: lunedì = 0 ... domenica = 6
   ============================================================ */
const U = {
  pad2: n => String(n).padStart(2, '0'),

  toISO(d) {
    return d.getFullYear() + '-' + U.pad2(d.getMonth() + 1) + '-' + U.pad2(d.getDate());
  },
  fromISO(s) {
    const p = s.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  },
  todayISO() { return U.toISO(new Date()); },

  addDays(iso, n) {
    const d = U.fromISO(iso);
    d.setDate(d.getDate() + n);
    return U.toISO(d);
  },
  /* 0 = lunedì ... 6 = domenica */
  dayOfWeek(iso) { return (U.fromISO(iso).getDay() + 6) % 7; },
  mondayOf(iso) { return U.addDays(iso, -U.dayOfWeek(iso)); },
  sundayOf(iso) { return U.addDays(U.mondayOf(iso), 6); },
  diffDays(a, b) { return Math.round((U.fromISO(b) - U.fromISO(a)) / 86400000); },

  /* numero progressivo della settimana (epoca: lunedì 2024-01-01) —
     serve alla rotazione automatica degli esercizi, che cambia ogni lunedì */
  weekNumber(iso) {
    const epoch = U.fromISO('2024-01-01');
    const monday = U.fromISO(U.mondayOf(iso));
    return Math.round((monday - epoch) / 604800000);
  },

  GIORNI: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'],
  GIORNI_BREVI: ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'],
  MESI: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
         'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],

  fmtData(iso) {
    const d = U.fromISO(iso);
    return U.GIORNI[U.dayOfWeek(iso)] + ' ' + d.getDate() + ' ' + U.MESI[d.getMonth()];
  },
  fmtDataBreve(iso) {
    const d = U.fromISO(iso);
    return d.getDate() + '/' + U.pad2(d.getMonth() + 1);
  },

  fmtKg(n) {
    const v = Math.round(n * 10) / 10;
    return String(v).replace('.', ',') + ' kg';
  },
  fmtMMSS(sec) {
    sec = Math.max(0, Math.round(sec));
    return Math.floor(sec / 60) + ':' + U.pad2(sec % 60);
  },
  /* "1'52\"" per i ritmi di corsa */
  fmtRitmo(sec) {
    sec = Math.round(sec);
    return Math.floor(sec / 60) + "'" + U.pad2(sec % 60) + '"';
  },

  /* metri → passi camminati (un passo normale ≈ 0,80 m): serve a piazzare i coni
     senza metro. Es. U.passi(20) → "25 passi" */
  passi(m) { return Math.round(m / 0.8) + ' passi'; },

  esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  $(sel, root) { return (root || document).querySelector(sel); },
  $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); },
};
