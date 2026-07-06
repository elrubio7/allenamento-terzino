'use strict';
/* ============================================================
   APP — avvio, delega degli eventi, service worker.
   ============================================================ */
(function () {

  function boot() {
    S.load();
    E.tick();
    UI.render();

    /* service worker per l'uso offline (non su file://) */
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  /* la PWA può restare aperta per giorni: al cambio di data si riallinea da sola
     (scadenza settimana, promozione della prossima, giorni passati, test) */
  let giornoCorrente = U.todayISO();
  function controllaGiorno() {
    if (U.todayISO() === giornoCorrente) return;
    giornoCorrente = U.todayISO();
    E.tick();
    if (UI.sedutaAperta) UI.chiudiSeduta();
    else UI.render();
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) controllaGiorno();
  });
  setInterval(controllaGiorno, 60000);

  /* ---------- click delegati ---------- */
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const a = el.dataset.action;
    const iso = UI.sedutaAperta;

    switch (a) {
      /* navigazione */
      case 'tab': UI.setTab(el.dataset.tab); break;

      /* settimana */
      case 'scegli-tipo': {
        /* conserva i giorni scelti finora prima di ridisegnare */
        const s1 = U.$('#giorno1'), s2 = U.$('#giorno2');
        if (s1) UI.scelta.g1 = Number(s1.value);
        if (s2) UI.scelta.g2 = Number(s2.value);
        UI.scelta.tipo = el.dataset.tipo;
        UI.render();
        break;
      }
      case 'conferma-settimana': UI.confermaScelta(); break;
      case 'correggi':
        if (confirm('Vuoi rifare la scelta della settimana? Le sedute già completate restano com\'erano, il resto viene rigenerato.')) {
          /* si conserva la vecchia settimana: i giorni già fatti non tornano ripetibili */
          S.data._correzione = S.data.settimana;
          S.data.settimana = null;
          S.save();
          UI.render();
        }
        break;
      case 'correggi-prossima':
        S.data.prossima = null;
        S.save();
        UI.render();
        break;
      case 'apri': UI.apriSeduta(el.dataset.iso); break;
      case 'chiudi-seduta': UI.chiudiSeduta(); break;

      /* seduta */
      case 'spunta': {
        const slot = Number(el.dataset.slot), serie = Number(el.dataset.serie);
        const g = S.data.settimana.giorni[iso];
        const era = !!(g.spunte && g.spunte[slot] && g.spunte[slot][serie]);
        E.setSpunta(iso, slot, serie, !era);
        if (!era) {
          const rec = Number(el.dataset.rec) || 0;
          if (rec > 0) T.startRest(rec, 'Recupero');
        }
        UI.renderSeduta();
        break;
      }
      case 'avvia-recupero': T.startRest(Number(el.dataset.sec) || 60, 'Recupero'); break;
      case 'carico-piu':
      case 'carico-meno': {
        const id = el.dataset.ex;
        const def = DB.ESERCIZI[id];
        const st = E.statoEx(id);
        const delta = (a === 'carico-piu' ? 1 : -1) * def.inc;
        let nuovo = E.caricoValido(def.tipoCarico, st.carico + delta);
        if (def.cap != null && nuovo > def.cap) nuovo = def.cap;
        st.carico = nuovo;
        S.save();
        UI.renderSeduta();
        break;
      }
      case 'fastidio': {
        const st = E.statoEx(el.dataset.ex);
        E.setFastidio(el.dataset.ex, !st.fastidio);
        UI.renderSeduta();
        break;
      }
      case 'ruota': {
        E.toggleRotazione(el.dataset.gruppo);
        const g = S.data.settimana.giorni[iso];
        if (g && g.spunte) { g.spunte[Number(el.dataset.slot)] = []; S.save(); }
        UI.renderSeduta();
        UI.toast('Variante cambiata. Tornerà a ruotare da sola ogni lunedì.');
        break;
      }
      case 'pioggia': {
        const g = S.data.settimana.giorni[iso];
        E.setPioggia(iso, !g.pioggia);
        g.spunte = {};
        S.save();
        UI.renderSeduta();
        break;
      }
      case 'swap-apri': UI.swapInCorso = !UI.swapInCorso; UI.renderSeduta(); break;
      case 'swap-con':
        if (E.swap(iso, el.dataset.iso)) {
          UI.toast('Giorni scambiati.');
          UI.chiudiSeduta();
        }
        break;
      case 'non-posso':
        if (confirm('Oggi non puoi allenarti? L\'app riorganizza la settimana.')) {
          const r = E.oggiNonPosso(iso);
          UI.toast(r.msg);
          UI.chiudiSeduta();
        }
        break;
      case 'completa': UI.completaSeduta(); break;
      case 'partita-giocata': {
        const min = parseInt((U.$('#minuti-partita') || {}).value, 10);
        const rpe = parseInt((U.$('#rpe-partita') || {}).value, 10);
        E.segnaPartitaGiocata(iso, isNaN(min) ? null : min, isNaN(rpe) ? null : rpe);
        UI.renderSeduta();
        UI.toast('Partita registrata' + (min ? ' (' + min + '\')' : '') + '. Domani si recupera.');
        break;
      }
      case 'salva-test': UI.salvaTest(iso, el.dataset.test); break;

      /* prontezza mattutina */
      case 'prontezza':
        UI.prontezzaSel[el.dataset.q] = Number(el.dataset.v);
        UI.render();
        break;
      case 'prontezza-ok': UI.confermaProntezza(); break;
      case 'diventa-recupero': {
        const g = S.data.settimana.giorni[iso];
        g.tipo = 'recupero'; g.spunte = {}; g.pioggia = false;
        S.save();
        UI.renderSeduta();
        UI.toast('Fatto: oggi recupero. Il corpo ringrazia, i numeri torneranno.');
        break;
      }

      /* fatica di fine seduta (RPE) */
      case 'rpe':
        E.setRPE(iso, Number(el.dataset.val));
        UI.renderSeduta();
        UI.toast('Fatica registrata: alimenta il guardiano del carico settimanale.');
        break;

      /* nota tecnica personale */
      case 'nota': {
        const id = el.dataset.ex;
        const attuale = S.data.note[id] || '';
        const nuova = prompt('La tua nota tecnica per: ' + el.dataset.nome + '\n(lascia vuoto per cancellarla)', attuale);
        if (nuova !== null) {
          if (nuova.trim()) S.data.note[id] = nuova.trim();
          else delete S.data.note[id];
          S.save();
          UI.renderSeduta();
        }
        break;
      }

      /* prep / six pack */
      case 'prep-tipo': UI.prepTipo = el.dataset.tipo; UI.render(); break;
      case 'sixpack-fatto': UI.sixpackFatto(); break;

      /* timer */
      case 'timer-modo': T.setModo(el.dataset.modo); break;
      case 'timer-preset': T.setDurata(Number(el.dataset.sec)); break;
      case 'timer-aggiusta': T.aggiustaDurata(Number(el.dataset.delta)); break;
      case 'timer-startpause': T.tabStartPause(); break;
      case 'timer-reset': T.tabReset(); break;
      case 'pillola-salta': T.skipRest(); break;

      /* dati */
      case 'esporta': UI.esporta(); break;
      case 'azzera':
        if (confirm('Sicuro? Verrà cancellato TUTTO: carichi, storico, test, settimana.') &&
            confirm('Ultima conferma: azzerare davvero tutti i dati?')) {
          S.reset();
          UI.setTab('settimana');
          UI.toast('Tutto azzerato. Si riparte da capo.');
        }
        break;
    }
  });

  /* ---------- input delegati ---------- */
  document.addEventListener('change', function (e) {
    const t = e.target;
    if (t.id === 'kickoff' && UI.sedutaAperta) {
      E.setKickoff(UI.sedutaAperta, t.value);
      UI.renderSeduta();
    }
    if (t.id === 'peso-input') {
      const v = parseInt(t.value, 10);
      if (v >= 40 && v <= 120) { S.data.peso = v; S.save(); UI.toast('Peso aggiornato: ' + v + ' kg.'); }
    }
    if (t.id === 'progressi-ex') {
      UI.progressiEx = t.value;
      UI.render();
    }
    if (t.id === 'importa-file' && t.files && t.files[0]) {
      const reader = new FileReader();
      reader.onload = function () {
        const r = S.importJSON(String(reader.result));
        UI.toast(r.msg);
        if (r.ok) { E.tick(); UI.setTab('settimana'); }
      };
      reader.readAsText(t.files[0]);
      t.value = '';
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
