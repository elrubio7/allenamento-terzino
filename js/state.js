'use strict';
/* ============================================================
   STATO — persistenza in localStorage, export/import, azzeramento.
   I dati vivono SOLO nel browser: il backup è responsabilità
   della scheda DATI.
   ============================================================ */
const S = {
  KEY: 'terzino_stato_v1',
  data: null,

  default() {
    return {
      v: 1,
      creato: U.todayISO(),
      peso: 70,                 // kg, usato dalla nutrizione pre-gara
      settimana: null,          // la settimana corrente (vedi engine.generaSettimana)
      prossima: null,           // la settimana scelta in anticipo la domenica
      ultimaPartita: null,      // ISO dell'ultima partita giocata (per il recupero del lunedì)
      esercizi: {},             // id → { carico|livello, streak, consolidamento, fastidio, extraRep, storia:[] }
      corsa: {},                // idLavoro → { livello, streak, consolidamento }
      fase: { nome: 'ipertrofia', contatore: 0, cicli: 0 },
      rotOffset: {},            // gruppo → offset manuale (il tocco sul cerchietto ↻)
      storico: [],              // sedute completate
      test: { cicloInizio: null, pendenti: [], risultati: {} },
      sixpack: { livello: 1, completamenti: 0, storia: [] },
      prontezza: {},            // dataISO → { punti, livello }  (check mattutino)
      note: {},                 // exId → nota tecnica personale
      ultimoBackup: null,       // data dell'ultimo export (per il promemoria)
      ultimoScarico: null,      // lunedì dell'ultima settimana di scarico
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(S.KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.v === 1) { S.data = Object.assign(S.default(), d); return; }
      }
    } catch (e) { /* dato corrotto: si riparte puliti */ }
    S.data = S.default();
    S.save();
  },

  save() {
    try { localStorage.setItem(S.KEY, JSON.stringify(S.data)); }
    catch (e) { console.error('Salvataggio fallito', e); }
  },

  /* --- backup --- */
  exportJSON() {
    return JSON.stringify({ app: 'allenamento-terzino', build: DB.BUILD, esportato: U.todayISO(), stato: S.data }, null, 2);
  },

  importJSON(text) {
    let obj;
    try { obj = JSON.parse(text); }
    catch (e) { return { ok: false, msg: 'File non valido: non è un backup dell\'app.' }; }
    const stato = obj && obj.app === 'allenamento-terzino' ? obj.stato : (obj && obj.v === 1 ? obj : null);
    if (!stato || stato.v !== 1) return { ok: false, msg: 'File non riconosciuto: serve un backup esportato da questa app.' };
    S.data = Object.assign(S.default(), stato);
    S.save();
    return { ok: true, msg: 'Backup importato! ' + (S.data.storico.length) + ' sedute nello storico.' };
  },

  reset() {
    S.data = S.default();
    S.save();
  },
};
