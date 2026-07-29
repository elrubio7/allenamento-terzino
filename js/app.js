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
      /* updateViaCache 'none': il controllo versione parte sempre dal server */
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});

      /* quando la versione nuova prende il comando, l'app si ricarica da sola */
      navigator.serviceWorker.addEventListener('controllerchange', ricaricaUnaVolta);

      /* si controlla in tutti i modi in cui un telefono può tornare sull'app:
         all'avvio, quando torna in primo piano, e ogni mezz'ora se resta aperta */
      setTimeout(function () { cercaAggiornamenti(false); }, 3000);
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden) cercaAggiornamenti(false);
      });
      window.addEventListener('focus', function () { cercaAggiornamenti(false); });
      window.addEventListener('pageshow', function (e) { if (e.persisted) cercaAggiornamenti(false); });
      setInterval(function () { cercaAggiornamenti(false); }, 1800000);
    }
  }

  /* ---------- aggiornamento dell'app ---------- */
  let ricaricato = false;
  function ricaricaUnaVolta() {
    if (ricaricato) return;
    ricaricato = true;
    location.reload();
  }

  /* se una versione nuova è pronta (o si sta installando), la si fa partire subito */
  function attivaSePronto(reg) {
    if (reg.waiting) { reg.waiting.postMessage('aggiorna-subito'); return true; }
    if (reg.installing) {
      const sw = reg.installing;
      sw.addEventListener('statechange', function () {
        if (sw.state === 'installed' && reg.waiting) reg.waiting.postMessage('aggiorna-subito');
      });
      return true;
    }
    return false;
  }

  function cercaAggiornamenti(manuale) {
    if (!('serviceWorker' in navigator)) {
      if (manuale) UI.toast('Aggiornamento automatico non disponibile su questo browser.');
      return;
    }
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) { if (manuale) location.reload(); return; }
      if (attivaSePronto(reg)) {
        if (manuale) UI.toast('Versione nuova trovata: aggiorno…');
        return;
      }
      if (manuale) UI.toast('Controllo in corso…');
      let trovata = false;
      const suTrovata = function () { trovata = true; attivaSePronto(reg); };
      reg.addEventListener('updatefound', suTrovata);
      reg.update().then(function () {
        setTimeout(function () {
          reg.removeEventListener('updatefound', suTrovata);
          if (!trovata && manuale) UI.toast('Sei già all\'ultima versione (build ' + DB.BUILD + ').');
        }, 2500);
      }).catch(function () {
        reg.removeEventListener('updatefound', suTrovata);
        if (manuale) UI.toast('Nessuna connessione: riprova quando sei online.');
      });
    });
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
          if (S.data.settimana && S.data.settimana.tipo === 'scarico' && S.data.ultimoScarico === S.data.settimana.inizio) {
            S.data.ultimoScarico = null;   /* scarico annullato: torna consigliabile */
          }
          S.data._correzione = S.data.settimana;
          S.data.settimana = null;
          S.save();
          UI.render();
        }
        break;
      case 'correggi-prossima':
        /* se lo scarico scelto viene annullato, torna consigliabile subito */
        if (S.data.prossima && S.data.prossima.tipo === 'scarico' && S.data.ultimoScarico === S.data.prossima.inizio) {
          S.data.ultimoScarico = null;
        }
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
        if (UI.guida && UI.guida.iso === iso) UI.guidaAvanzaSeCompleto();
        UI.renderSeduta();
        break;
      }

      /* seduta guidata */
      case 'guida-avvia': UI.guida = { iso, passo: 0 }; UI.renderSeduta(); break;
      case 'guida-avanti':
        if (UI.guida) {
          UI.guida.passo++;
          UI.guidaAvanzaSeCompleto();  /* salta i passi già completati prima di entrare */
          UI.renderSeduta();
        }
        break;
      case 'guida-esci': UI.guida = null; UI.renderSeduta(); break;
      case 'carico-piu':
      case 'carico-meno': {
        const id = el.dataset.ex;
        const def = DB.ESERCIZI[id];
        const st = E.statoEx(id);
        const delta = (a === 'carico-piu' ? 1 : -1) * def.inc;
        let nuovo = E.caricoValido(def.tipoCarico, st.carico + delta, def.landmine);
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
      case 'salita': {
        const g = S.data.settimana.giorni[iso];
        const acceso = !g.salita;
        E.setSalita(iso, acceso);
        g.spunte = {};
        S.save();
        UI.renderSeduta();
        if (acceso) {
          UI.toast(g.tipo === 'velocita'
            ? '🏔 Sprint in salita: lo sprint più sicuro che c\'è. Si torna giù sempre camminando.'
            : '🏔 Salita lunga: ritmo tosto ma costante, la discesa è il recupero.');
        }
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
        g.test = null;   /* il test tornerà nel prossimo giorno adatto */
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

      /* obiettivi stagionali */
      case 'obiettivo-aggiungi': {
        const met = (U.$('#ob-metrica') || {}).value;
        const target = parseFloat((U.$('#ob-target') || {}).value);
        const scad = (U.$('#ob-data') || {}).value;
        if (!met || isNaN(target) || !scad) { UI.toast('Scegli la misura, il traguardo e la data.'); break; }
        const iniz = UI.METRICHE[met].val();
        S.data.obiettivi.push({ metrica: met, target, scadenza: scad, iniziale: iniz != null ? iniz : null, creato: U.todayISO() });
        S.save();
        UI.render();
        UI.toast('Obiettivo fissato. Ora si insegue. 🎯');
        break;
      }
      case 'obiettivo-elimina':
        S.data.obiettivi.splice(Number(el.dataset.idx), 1);
        S.save();
        UI.render();
        break;

      /* immagine della settimana */
      case 'esporta-settimana': UI.esportaSettimana(); break;

      /* aggiornamento dell'app */
      case 'aggiorna-app': cercaAggiornamenti(true); break;

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
