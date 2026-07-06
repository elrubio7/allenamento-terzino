'use strict';
/* ============================================================
   TIMER — scheda Timer (conto alla rovescia + cronometro)
   e pillola di recupero tra le serie (parte da sola).
   Beep con WebAudio: avvio, ultimi 3 secondi, fine.
   ============================================================ */
const T = {
  ctx: null,

  audio() {
    if (!T.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) T.ctx = new AC();
    }
    if (T.ctx && T.ctx.state === 'suspended') T.ctx.resume();
    return T.ctx;
  },

  beep(freq, durata, volume) {
    const ctx = T.audio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume || 0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durata);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durata);
  },
  beepAvvio() { T.beep(660, 0.15); },
  beepTic()   { T.beep(880, 0.12); },
  beepFine()  { T.beep(523, 0.25); setTimeout(() => T.beep(784, 0.45), 220); },

  /* ---------- pillola di recupero (tra le serie) ---------- */
  rest: { attivo: false, fine: 0, tot: 0, id: null },

  startRest(sec, label) {
    if (!sec || sec <= 0) return;
    T.audio();
    clearInterval(T.rest.id);
    T.rest.attivo = true;
    T.rest.tot = sec;
    T.rest.fine = Date.now() + sec * 1000;
    T.rest.label = label || 'Recupero';
    T.rest.ultimoTic = 4;
    T.beepAvvio();
    T.rest.id = setInterval(T.tickRest, 200);
    T.tickRest();
  },

  tickRest() {
    const resto = Math.ceil((T.rest.fine - Date.now()) / 1000);
    if (resto <= 0) {
      T.stopRest();
      T.beepFine();
      return;
    }
    if (resto <= 3 && resto < T.rest.ultimoTic) { T.rest.ultimoTic = resto; T.beepTic(); }
    const pill = U.$('#pillola');
    if (pill) {
      pill.classList.add('visibile');
      U.$('#pillola-tempo').textContent = U.fmtMMSS(resto);
      U.$('#pillola-label').textContent = T.rest.label;
      const perc = Math.max(0, (T.rest.fine - Date.now()) / 1000 / T.rest.tot * 100);
      U.$('#pillola-barra').style.width = perc + '%';
    }
  },

  stopRest() {
    clearInterval(T.rest.id);
    T.rest.attivo = false;
    const pill = U.$('#pillola');
    if (pill) pill.classList.remove('visibile');
  },

  skipRest() { T.stopRest(); },

  /* ---------- scheda TIMER ---------- */
  tab: {
    modo: 'giu',        // 'giu' = conto alla rovescia, 'su' = cronometro
    durata: 90,         // secondi impostati per il conto alla rovescia
    inCorsa: false,
    fine: 0,            // per 'giu': timestamp fine
    inizio: 0,          // per 'su': timestamp inizio
    accumulato: 0,      // per pausa del cronometro
    id: null,
    ultimoTic: 4,
  },

  setModo(m) {
    T.tabReset();
    T.tab.modo = m;
    T.render();
  },
  setDurata(sec) {
    if (T.tab.inCorsa) return;      /* col timer in corsa i preset non si toccano */
    T.tab.durata = sec;
    T.tab.accumulato = 0;           /* il preset scelto riparte pulito, anche dopo una pausa */
    T.render();
  },
  /* conto alla rovescia personalizzato: ±15" / ±1' */
  aggiustaDurata(delta) {
    if (T.tab.inCorsa) return;
    T.tab.durata = Math.min(5940, Math.max(5, T.tab.durata + delta));
    T.tab.accumulato = 0;
    T.render();
  },

  tabStartPause() {
    const t = T.tab;
    T.audio();
    if (t.inCorsa) {
      /* pausa */
      clearInterval(t.id);
      t.inCorsa = false;
      if (t.modo === 'giu') t.accumulato = Math.max(0, (t.fine - Date.now()) / 1000);
      else t.accumulato += (Date.now() - t.inizio) / 1000;
    } else {
      t.inCorsa = true;
      if (t.modo === 'giu') {
        const resto = t.accumulato > 0 ? t.accumulato : t.durata;
        t.fine = Date.now() + resto * 1000;
        t.ultimoTic = 4;
        if (t.accumulato <= 0) T.beepAvvio();
      } else {
        t.inizio = Date.now();
      }
      t.id = setInterval(T.tabTick, 100);
    }
    T.render();
  },

  tabReset() {
    clearInterval(T.tab.id);
    T.tab.inCorsa = false;
    T.tab.accumulato = 0;
    T.render();
  },

  tabTick() {
    const t = T.tab;
    if (t.modo === 'giu') {
      const resto = (t.fine - Date.now()) / 1000;
      if (resto <= 0) {
        clearInterval(t.id);
        t.inCorsa = false;
        t.accumulato = 0;
        T.beepFine();
        T.render();
        return;
      }
      const sec = Math.ceil(resto);
      if (sec <= 3 && sec < t.ultimoTic) { t.ultimoTic = sec; T.beepTic(); }
    }
    T.render();
  },

  valoreDisplay() {
    const t = T.tab;
    if (t.modo === 'giu') {
      if (t.inCorsa) return Math.ceil((t.fine - Date.now()) / 1000);
      return t.accumulato > 0 ? Math.ceil(t.accumulato) : t.durata;
    }
    const v = t.inCorsa ? t.accumulato + (Date.now() - t.inizio) / 1000 : t.accumulato;
    return Math.floor(v);
  },

  render() {
    const disp = U.$('#timer-display');
    if (!disp) return;
    disp.textContent = U.fmtMMSS(T.valoreDisplay());
    U.$('#timer-startpause').textContent = T.tab.inCorsa ? 'PAUSA' : 'VIA';
    U.$$('.timer-modo').forEach(b => b.classList.toggle('attivo', b.dataset.modo === T.tab.modo));
    U.$$('.timer-preset').forEach(b => b.classList.toggle('attivo', Number(b.dataset.sec) === T.tab.durata));
    U.$('#timer-presets').style.display = T.tab.modo === 'giu' ? '' : 'none';
  },
};
