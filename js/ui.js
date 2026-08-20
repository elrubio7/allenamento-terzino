'use strict';
/* ============================================================
   UI — rendering delle schede e della seduta.
   Gli eventi sono gestiti per delega in app.js tramite data-action.
   ============================================================ */
const UI = {
  tab: 'settimana',
  sedutaAperta: null,          // ISO del giorno aperto nell'overlay
  swapInCorso: false,
  scelta: { tipo: null, g1: 6, g2: 2 },   // pannello settimana (indici: 0=lun..6=dom)

  /* ---------- helpers ---------- */
  toast(msg) {
    const t = U.$('#toast');
    t.textContent = msg;
    t.classList.add('visibile');
    clearTimeout(UI._toastId);
    UI._toastId = setTimeout(() => t.classList.remove('visibile'), 3500);
  },

  setTab(tab) {
    UI.tab = tab;
    U.$$('.nav-btn').forEach(b => b.classList.toggle('attivo', b.dataset.tab === tab));
    UI.render();
  },

  render() {
    const box = U.$('#contenuto');
    if (UI.tab === 'settimana') box.innerHTML = UI.vistaSettimana();
    else if (UI.tab === 'prep') box.innerHTML = UI.vistaPrep();
    else if (UI.tab === 'sixpack') box.innerHTML = UI.vistaSixpack();
    else if (UI.tab === 'timer') { box.innerHTML = UI.vistaTimer(); T.render(); }
    else if (UI.tab === 'progressi') box.innerHTML = UI.vistaProgressi();
    else if (UI.tab === 'storico') box.innerHTML = UI.vistaStorico();
    else if (UI.tab === 'dati') box.innerHTML = UI.vistaDati();
    UI.renderHeader();
  },

  renderHeader() {
    const f = E.infoFase();
    U.$('#fase-badge').innerHTML = f.icona + ' ' + U.esc(f.nome) +
      (f.congelata ? '' : ' <small>(' + f.mancanti + ' sedute forza al cambio)</small>');
    U.$('#fase-badge').style.borderColor = f.colore;
    /* il colore della fase tinge l'app */
    document.documentElement.style.setProperty('--fase', f.colore);
  },

  /* ============================================================
     SETTIMANA
     ============================================================ */
  vistaSettimana() {
    if (E.serveScelta()) return UI.pannelloScelta();
    const set = S.data.settimana;
    const oggi = U.todayISO();
    const da = oggi > set.inizio ? oggi : set.inizio;
    const fine = U.sundayOf(set.inizio);

    const nomiTipo = { una: '1 partita', due: '2 partite', costruzione: 'Costruzione', scarico: 'Scarico' };

    /* hero: conto alla rovescia alla partita */
    const prossimePartite = (set.partite || []).filter(p => p >= oggi);
    let titolone;
    if (prossimePartite.length) {
      const d = U.diffDays(oggi, prossimePartite[0]);
      titolone = d === 0 ? 'OGGI SI GIOCA ⚽' : (d === 1 ? 'PARTITA DOMANI' : 'PARTITA TRA ' + d + ' GIORNI');
    } else if (set.tipo === 'costruzione') titolone = 'SI COSTRUISCE 🧱';
    else if (set.tipo === 'scarico') titolone = 'SI RICARICA 🪫';
    else titolone = 'SETTIMANA IN CORSO';

    let html = '<div class="hero">' +
      '<div class="hero-riga"><span class="hero-eyebrow">🔒 ' + nomiTipo[set.tipo] + '</span>' +
      '<button class="link" data-action="correggi">ho sbagliato, correggi</button></div>' +
      '<div class="hero-titolo">' + titolone + '</div></div>';

    /* guardiano del carico */
    const allarme = E.allarmeCarico();
    if (allarme) html += '<div class="banner banner-' + (allarme.livello === 'alto' ? 'rosso' : 'giallo') + '">' + U.esc(allarme.msg) + '</div>';

    /* consiglio post-partita */
    const consiglio = E.consiglioPostPartita();
    if (consiglio) html += '<div class="banner banner-info">⚽ ' + U.esc(consiglio) + '</div>';

    /* promemoria backup */
    if (S.data.storico.length >= 5) {
      const gg = S.data.ultimoBackup ? U.diffDays(S.data.ultimoBackup, oggi) : null;
      if (gg === null || gg > 14) {
        html += '<div class="banner banner-giallo">💾 ' + (gg === null ? 'Non hai ancora mai esportato un backup' : 'Ultimo backup: ' + gg + ' giorni fa') +
          ' — i tuoi progressi vivono solo su questo telefono. <button class="link" data-action="tab" data-tab="dati">Vai a DATI</button></div>';
      }
    }

    /* check di prontezza mattutino */
    const gOggi = set.giorni[oggi];
    if (gOggi && gOggi.stato === 'da_fare' && gOggi.tipo !== 'partita' && gOggi.tipo !== 'recupero' && !E.prontezzaDi(oggi)) {
      html += UI.cardProntezza();
    }

    let iso = da;
    while (iso <= fine) {
      html += UI.cardGiorno(iso, set.giorni[iso]);
      iso = U.addDays(iso, 1);
    }

    html += '<button class="btn-azione btn-esporta-sett" data-action="esporta-settimana">📤 Salva la settimana come immagine</button>';

    /* domenica: si decide la settimana che inizia domani */
    if (E.serveProssima()) {
      html += '<div class="prossima-box">' + UI.cardPagella(E.pagella(set), 'Questa settimana finora') + UI.pannelloScelta(true) + '</div>';
    } else if (S.data.prossima) {
      html += '<div class="settimana-testata prossima-fissata">' +
        '<span class="settimana-tipo">🔒 Prossima settimana: <strong>' + nomiTipo[S.data.prossima.tipo] + '</strong> (da domani)</span>' +
        '<button class="link" data-action="correggi-prossima">correggi</button></div>';
    } else {
      html += '<p class="nota-settimana">La settimana si ferma a domenica: la prossima si decide domenica, come sempre.</p>';
    }
    return html;
  },

  cardGiorno(iso, g) {
    const meta = DB.SEDUTE[g.tipo];
    const oggi = iso === U.todayISO();
    const luogo = g.pioggia ? 'garage' : meta.luogo;
    let stato = '';
    if (g.stato === 'fatta') stato = '<span class="chip chip-fatta">✓ fatta</span>';
    else if (g.stato === 'saltata') stato = '<span class="chip chip-saltata">saltata</span>';
    let extra = '';
    if (g.test) extra += '<span class="chip chip-test">' + DB.TEST[g.test].icona + ' ' + U.esc(DB.TEST[g.test].nome) + '</span>';
    if (g.pioggia) extra += '<span class="chip chip-pioggia">🌧 versione garage</span>';
    if (g.caldo) extra += '<span class="chip chip-caldo">🔥 ritmi da caldo</span>';
    if (g.salita) extra += '<span class="chip chip-salita">🏔 ' + (g.tipo === 'velocita' ? 'sprint in salita' : 'salita ripida') + '</span>';
    let risultato = '';
    if (g.stato === 'fatta' && g.risultato && g.risultato.length) {
      risultato = '<div class="card-migliorie">' +
        g.risultato.slice(0, 3).map(m => '↑ ' + U.esc(m.nome) + ': ' + U.esc(m.testo)).join('<br>') +
        (g.risultato.length > 3 ? '<br>…' : '') + '</div>';
    }
    return '<div class="card-giorno tipo-' + g.tipo + ' ' + (oggi ? 'oggi' : '') + ' stato-' + g.stato + '" data-action="apri" data-iso="' + iso + '">' +
      '<div class="card-data">' + U.GIORNI_BREVI[U.dayOfWeek(iso)] + '<br><span>' + U.fmtDataBreve(iso) + '</span>' + (oggi ? '<em>OGGI</em>' : '') + '</div>' +
      '<div class="card-corpo"><div class="card-titolo">' + meta.icona + ' ' + U.esc(meta.nome) + '</div>' +
      '<div class="card-chips"><span class="chip chip-luogo">' + (luogo === 'garage' ? '🏠 garage' : luogo === 'strada' ? '🛣️ strada' : '🏟️ campo') + '</span>' + stato + extra + '</div>' +
      risultato + '</div><div class="card-freccia">›</div></div>';
  },

  pannelloScelta(perProssima) {
    const sel = UI.scelta;
    const opzioni = [
      { id: 'una', icona: '⚽', nome: '1 partita', descr: 'La settimana classica: forza lontano dalla gara, velocità vicino, attivazione il giorno prima.' },
      { id: 'due', icona: '⚽⚽', nome: '2 partite', descr: 'Settimana congestionata: si gestisce, non si costruisce. Recuperi e attivazioni.' },
      { id: 'costruzione', icona: '🧱', nome: 'Costruzione', descr: 'Nessuna partita: si mette su lavoro. Due sedute di forza, tanta strada. Scade da sola lunedì.' },
    ];
    /* scarico consigliato: ogni ~4 settimane di spinta o dopo troppi check gialli */
    if (E.serveScarico()) {
      opzioni.push({ id: 'scarico', icona: '🪫', nome: 'Scarico (consigliato)', descr: 'Spingi da più di 4 settimane o il corpo manda segnali: carichi ridotti del 15%, progressione in pausa. Si ricarica per ripartire più forti.' });
    }
    let html = '';
    /* la pagella della settimana appena chiusa, per scegliere meglio */
    if (!perProssima && S.data.riepilogo && U.diffDays(S.data.riepilogo.inizio, U.todayISO()) <= 13) {
      html += UI.cardPagella(S.data.riepilogo, 'La settimana scorsa');
    }
    html += '<div class="pannello">' +
      (perProssima
        ? '<h2>Domenica: che settimana sarà la prossima?</h2><p class="pannello-sub">Vale per la settimana che inizia domani, lunedì ' + U.fmtDataBreve(U.addDays(U.mondayOf(U.todayISO()), 7)) + '.</p>'
        : '<h2>Che settimana sarà?</h2><p class="pannello-sub">Si decide una volta, poi la settimana corre sul suo binario fino a domenica.</p>');
    for (const o of opzioni) {
      html += '<div class="opzione ' + (sel.tipo === o.id ? 'selezionata' : '') + '" data-action="scegli-tipo" data-tipo="' + o.id + '">' +
        '<span class="opzione-icona">' + o.icona + '</span><div><strong>' + o.nome + '</strong><p>' + o.descr + '</p></div></div>';
    }
    const giorniSel = (id, val) => {
      let s = '<select id="' + id + '" class="select-giorno">';
      U.GIORNI.forEach((gg, i) => { s += '<option value="' + i + '" ' + (i === val ? 'selected' : '') + '>' + gg + '</option>'; });
      return s + '</select>';
    };
    if (sel.tipo === 'una' || sel.tipo === 'scarico') {
      html += '<div class="pannello-giorni"><label>Giorno della partita</label>' + giorniSel('giorno1', sel.g1) + '</div>';
    } else if (sel.tipo === 'due') {
      html += '<div class="pannello-giorni"><label>Prima partita</label>' + giorniSel('giorno2', sel.g2) +
        '<label>Seconda partita</label>' + giorniSel('giorno1', sel.g1) + '</div>';
    }
    html += '<button class="btn-primario" data-action="conferma-settimana" ' + (sel.tipo ? '' : 'disabled') + '>Conferma la settimana</button></div>';
    return html;
  },

  confermaScelta() {
    const sel = UI.scelta;
    if (!sel.tipo) return;
    /* se la settimana corrente è ancora in corso, la scelta vale per la prossima */
    const perProssima = !E.serveScelta();
    const lun = perProssima
      ? U.addDays(U.mondayOf(U.todayISO()), 7)
      : U.mondayOf(U.todayISO());
    let partite = [];
    if (sel.tipo === 'una' || sel.tipo === 'scarico') {
      const s1 = U.$('#giorno1'); if (s1) sel.g1 = Number(s1.value);
      partite = [U.addDays(lun, sel.g1)];
    } else if (sel.tipo === 'due') {
      const s1 = U.$('#giorno1'), s2 = U.$('#giorno2');
      if (s1) sel.g1 = Number(s1.value);
      if (s2) sel.g2 = Number(s2.value);
      if (sel.g1 === sel.g2) { UI.toast('Le due partite non possono essere lo stesso giorno.'); return; }
      partite = [U.addDays(lun, Math.min(sel.g1, sel.g2)), U.addDays(lun, Math.max(sel.g1, sel.g2))];
    }
    E.generaSettimana(sel.tipo, partite, lun, perProssima);
    UI.scelta.tipo = null;
    UI.render();
    UI.toast(perProssima ? 'Prossima settimana pronta: parte da sola domani. 🔒' : 'Settimana pronta. Si comincia! 💪');
  },

  /* pagella di una settimana (per la scelta della domenica) */
  cardPagella(p, titolo) {
    if (!p || (p.fatte === 0 && p.saltate === 0 && p.partiteGiocate === 0)) return '';
    const perc = p.tot ? Math.round(p.fatte / p.tot * 100) : 0;
    let giudizio;
    if (perc >= 85) giudizio = 'Settimana da professionista. 💪';
    else if (perc >= 60) giudizio = 'Buona settimana: si può fare ancora meglio.';
    else giudizio = 'Settimana difficile: capita. Quella nuova è un\'altra storia.';
    return '<div class="card-prep pagella"><h3>📋 ' + U.esc(titolo) + '</h3><div class="stat-riga">' +
      '<div class="stat"><strong>' + p.fatte + '/' + p.tot + '</strong><span>sedute fatte</span></div>' +
      '<div class="stat"><strong>' + p.saltate + '</strong><span>saltate</span></div>' +
      '<div class="stat"><strong>' + (p.carico || '—') + '</strong><span>carico</span></div>' +
      '</div><p class="nota-sixpack">' + (p.partiteGiocate ? '⚽ ' + p.partiteGiocate + (p.partiteGiocate === 1 ? ' partita giocata · ' : ' partite giocate · ') : '') + giudizio + '</p></div>';
  },

  /* ============================================================
     PRONTEZZA — check mattutino (30 secondi)
     ============================================================ */
  prontezzaSel: {},
  cardProntezza() {
    const sel = UI.prontezzaSel;
    const domande = [['sonno', '😴 Come hai dormito?'], ['muscoli', '💪 Dolori muscolari?'], ['energia', '⚡ Quanta energia hai?'], ['umore', '🙂 Umore?']];
    const opzioni = [[1, 'Male'], [2, 'Così così'], [3, 'Bene']];
    let html = '<div class="card-prontezza"><h3>Come stai stamattina?</h3>' +
      '<p class="sub-prontezza">30 secondi: la seduta di oggi si adatta a come sta il tuo corpo.</p>';
    for (const [id, label] of domande) {
      html += '<div class="prontezza-riga"><span>' + label + '</span><div class="prontezza-opzioni">';
      for (const [v, txt] of opzioni) {
        html += '<button class="chip-btn ' + (sel[id] === v ? 'attivo' : '') + '" data-action="prontezza" data-q="' + id + '" data-v="' + v + '">' + txt + '</button>';
      }
      html += '</div></div>';
    }
    const pronte = Object.keys(sel).length === 4;
    html += '<button class="btn-primario" data-action="prontezza-ok" ' + (pronte ? '' : 'disabled') + '>Fatto ✓</button></div>';
    return html;
  },

  confermaProntezza() {
    const sel = UI.prontezzaSel;
    if (Object.keys(sel).length < 4) return;
    const punti = sel.sonno + sel.muscoli + sel.energia + sel.umore;
    const livello = E.setProntezza(U.todayISO(), punti);
    UI.prontezzaSel = {};
    UI.render();
    if (livello === 'verde') UI.toast('🟢 Semaforo verde: si spinge come da programma!');
    else if (livello === 'giallo') UI.toast('🟡 Giornata gialla: carichi ridotti del 10% e niente aumenti oggi. Qualità, non eroismi.');
    else UI.toast('🔴 Giornata rossa: il corpo chiede tregua. Apri la seduta: puoi trasformarla in recupero con un tocco.');
  },

  /* ============================================================
     SEDUTA (overlay)
     ============================================================ */
  apriSeduta(iso) {
    UI.sedutaAperta = iso;
    UI.swapInCorso = false;
    UI.renderSeduta();
    U.$('#overlay').classList.add('aperto');
  },
  chiudiSeduta() {
    UI.sedutaAperta = null;
    UI.guida = null;
    U.$('#overlay').classList.remove('aperto');
    UI.render();
  },

  /* ============================================================
     SEDUTA GUIDATA — un passo alla volta, senza toccare menu
     ============================================================ */
  guida: null,   // { iso, passo }

  /* il riscaldamento giusto per la seduta: garage se piove, sulla salita
     stessa quando si va alla ripida (lì non c'è piano), altrimenti quello del tipo */
  riscaldamentoDi(vm) {
    if (vm.pioggia) return DB.RISCALDAMENTI.pioggia;
    if (vm.salita && vm.tipo === 'resistenza') return DB.RISCALDAMENTI.salita_ripida;
    return DB.RISCALDAMENTI[vm.tipo];
  },

  passiGuida(vm) {
    const passi = [{ tipo: 'riscaldamento' }];
    if (vm.blocchi) vm.blocchi.forEach((b, i) => passi.push({ tipo: 'blocco', i }));
    else vm.esercizi.forEach((e, i) => passi.push({ tipo: 'esercizio', i }));
    passi.push({ tipo: 'fine' });
    return passi;
  },

  vistaGuida(vm) {
    const iso = vm.iso;
    const passi = UI.passiGuida(vm);
    UI.guida.passo = Math.max(0, Math.min(UI.guida.passo, passi.length - 1));
    const p = UI.guida.passo;
    const passo = passi[p];

    let html = '<div class="guida-testata">' +
      '<button class="btn-azione" data-action="guida-esci">‹ esci</button>' +
      '<div class="guida-progresso">PASSO ' + (p + 1) + '/' + passi.length + '<br><small>' + vm.icona + ' ' + U.esc(vm.nome) + '</small></div>' +
      '<button class="btn-azione" data-action="guida-avanti" ' + (p >= passi.length - 1 ? 'disabled' : '') + '>salta ›</button></div>' +
      '<div class="guida-barra"><div class="guida-barra-fill" style="width:' + Math.round(p / (passi.length - 1) * 100) + '%"></div></div>';

    if (passo.tipo === 'riscaldamento') {
      const risc = UI.riscaldamentoDi(vm);
      html += '<div class="card-prep"><h3>🔥 ' + U.esc(risc.nome) + '</h3><ol>' +
        risc.voci.map(v => '<li>' + U.esc(v) + '</li>').join('') + '</ol></div>' +
        '<button class="btn-primario" data-action="guida-avanti">Riscaldamento fatto ›</button>';
    } else if (passo.tipo === 'esercizio') {
      html += UI.cardEsercizio(iso, vm.esercizi[passo.i], passo.i, vm.spunte[passo.i] || [], false) +
        '<p class="guida-nota">Spunta tutte le serie: si passa avanti da soli. Il recupero parte a ogni spunta.</p>';
    } else if (passo.tipo === 'blocco') {
      html += UI.cardBlocco(vm.blocchi[passo.i], passo.i, vm.spunte[passo.i] || [], false) +
        '<p class="guida-nota">Spunta tutte le serie: si passa avanti da soli.</p>';
    } else {
      const str = DB.STRETCHING[vm.tipo];
      html += '<div class="card-prep"><h3>🧘 ' + U.esc(str.nome) + '</h3><ol>' +
        str.voci.map(v => '<li>' + U.esc(v) + '</li>').join('') + '</ol></div>' +
        '<button class="btn-primario" data-action="completa">Seduta completata ✓</button>';
    }
    return html;
  },

  guidaAvanzaSeCompleto() {
    if (!UI.guida) return;
    const vm = E.risolviSeduta(UI.guida.iso);
    if (!vm) return;
    const passi = UI.passiGuida(vm);
    /* scavalca in un colpo tutti i passi già completati */
    let avanzato = true;
    while (avanzato && UI.guida.passo < passi.length - 1) {
      avanzato = false;
      const passo = passi[UI.guida.passo];
      let n = null, sp = [];
      if (passo.tipo === 'esercizio') { n = vm.esercizi[passo.i].serie; sp = vm.spunte[passo.i] || []; }
      if (passo.tipo === 'blocco') { n = vm.blocchi[passo.i].serie || 1; sp = vm.spunte[passo.i] || []; }
      if (n == null) return;
      let completo = true;
      for (let s = 0; s < n; s++) if (!sp[s]) completo = false;
      if (completo) { UI.guida.passo++; avanzato = true; }
    }
  },

  renderSeduta() {
    const iso = UI.sedutaAperta;
    if (!iso) return;
    const vm = E.risolviSeduta(iso);
    if (!vm) { UI.chiudiSeduta(); return; }
    const box = U.$('#overlay-contenuto');

    /* modalità guidata attiva */
    if (UI.guida && UI.guida.iso === iso && vm.stato === 'da_fare') {
      box.innerHTML = UI.vistaGuida(vm);
      return;
    }

    let html = '<div class="seduta-testata">' +
      '<button class="btn-indietro" data-action="chiudi-seduta">‹</button>' +
      '<div><h2>' + vm.icona + ' ' + U.esc(vm.nome) + '</h2>' +
      '<p class="seduta-sub">' + U.fmtData(iso) +
      ' · <span class="chip chip-luogo">' + (vm.luogo === 'garage' ? '🏠 garage' : vm.luogo === 'strada' ? '🛣️ strada' : '🏟️ campo') + '</span>' +
      (vm.md ? ' · <span class="chip chip-md" title="Giorni dalla partita, come nei club professionistici">' + vm.md + '</span>' : '') +
      (vm.partita ? '' : ' · <span class="chip" style="border-color:' + vm.faseColore + '">' + U.esc(vm.faseNome) + '</span>') +
      '</p></div></div>';

    if (vm.partita) { box.innerHTML = html + UI.bloccoPartita(iso, vm); return; }

    /* azioni: pioggia (solo strada), sposta, oggi non posso */
    if (vm.stato === 'da_fare') {
      html += '<div class="seduta-azioni">';
      if (vm.tipo === 'velocita' || vm.tipo === 'resistenza') {
        html += '<button class="btn-azione ' + (vm.pioggia ? 'attivo' : '') + '" data-action="pioggia">🌧 ' + (vm.pioggia ? 'torna in strada' : 'piove: versione garage') + '</button>' +
          '<button class="btn-azione ' + (vm.caldo ? 'attivo' : '') + '" data-action="caldo">🔥 ' + (vm.caldo ? 'torna ai ritmi normali' : 'fa caldo') + '</button>';
      }
      html += '<button class="btn-azione" data-action="swap-apri">🔀 sposta</button>' +
        '<button class="btn-azione" data-action="non-posso">🚫 oggi non posso</button></div>';
      if (UI.swapInCorso) html += UI.swapScelta(iso);
      /* giornata in salita: la mette l'app, qui si spiega perché */
      if (vm.salita) {
        html += '<div class="banner banner-salita">' + (vm.tipo === 'velocita'
          ? '🏔 <strong>Oggi si sprinta in salita</strong> — la dolce da 25 m, quella a piedi. In questa fase si costruisce lì: stessa spinta al massimo, femorali al sicuro.'
          : '🏔 <strong>Oggi salita ripida</strong> — i 40 m, quindi serve la macchina. <strong>È una seduta a sé</strong>: arrivi, ti scaldi sulla salita stessa (il riscaldamento qui sotto è fatto apposta, senza tratti piani), lavori e torni. Mai attaccata a un altro allenamento.') +
          '<button class="link" data-action="salita-no">non ci riesco: fammela in piano</button></div>';
      }
      if (!vm.soloTest) html += '<button class="btn-primario btn-guida" data-action="guida-avvia">▶ Inizia seduta guidata</button>';
    }

    /* banner scarico / prontezza (testo diverso per garage e corsa) */
    if (vm.stato === 'da_fare' && vm.tipo !== 'recupero' && vm.tipo !== 'attivazione') {
      const eCorsa = !!vm.blocchi;
      if (vm.scarico) {
        html += '<div class="banner banner-info">🪫 Settimana di scarico: progressione in pausa. ' +
          (eCorsa ? 'Taglia 1-2 serie dal lavoro e tieni ritmi comodi: si ricarica.' : 'Carichi ridotti del 15%. Muoviti bene, esci fresco.') + '</div>';
      }
      if (vm.prontezza === 'giallo') {
        html += '<div class="banner banner-giallo">🟡 Giornata gialla: oggi nessun aumento. ' +
          (eCorsa ? 'Taglia 1-2 serie e non cercare il ritmo migliore: qualità, non eroismi.' : 'Carichi già ridotti del 10%. Se un esercizio pesa troppo, taglia una serie senza rimorsi.') + '</div>';
      } else if (vm.prontezza === 'rosso') {
        html += '<div class="banner banner-rosso">🔴 Giornata rossa: il corpo chiede tregua. Il consiglio vero è non forzare.' +
          '<button class="btn-azione" data-action="diventa-recupero">🌿 Trasforma in recupero</button></div>';
      }
    }

    if (vm.stato === 'fatta') {
      html += '<div class="seduta-congelata"><h3>✓ Seduta completata</h3>' +
        (vm.risultato && vm.risultato.length
          ? '<p>Cosa è migliorato:</p><ul>' + vm.risultato.map(m => '<li><strong>' + U.esc(m.nome) + '</strong>: ' + U.esc(m.testo) + '</li>').join('') + '</ul>'
          : '<p>Registrata nello storico.</p>') +
        UI.bloccoRPE(iso) + '</div>';
    }
    if (vm.stato === 'saltata') html += '<div class="seduta-congelata"><h3>Seduta saltata</h3><p>Si riparte dalla prossima.</p></div>';

    /* test del giorno (il modulo si compila solo finché la seduta è da fare) */
    if (vm.test && vm.stato === 'da_fare') {
      html += UI.bloccoTest(iso, vm.test);
    } else if (vm.testFatto) {
      html += '<div class="seduta-congelata"><h3>' + DB.TEST[vm.testFatto].icona + ' Test salvato ✓</h3>' +
        '<p>' + U.esc(DB.TEST[vm.testFatto].nome) + ': risultati registrati, li trovi in PROGRESSI.</p></div>';
    }

    /* giornata calda: obiettivi già ricalibrati + piano di idratazione */
    if (vm.caldo) {
      html += '<details class="dettagli-box box-caldo" open><summary>🔥 ' + U.esc(DB.CALDO.nome) + '</summary><ul>' +
        DB.CALDO.voci.map(v => '<li>' + U.esc(v) + '</li>').join('') + '</ul></details>';
    }

    /* riscaldamento (unico: cambia con pioggia e con la salita ripida) */
    const risc = UI.riscaldamentoDi(vm);
    if (risc) {
      html += '<details class="dettagli-box"><summary>🔥 ' + U.esc(risc.nome) + '</summary><ul>' +
        risc.voci.map(v => '<li>' + U.esc(v) + '</li>').join('') + '</ul></details>';
    }

    const bloccata = vm.stato !== 'da_fare';

    if (vm.blocchi) {
      /* seduta di corsa (nei giorni test i blocchi normali non ci sono: conta il test) */
      if (!vm.soloTest) html += '<p class="corsa-nome">' + U.esc(vm.corsaNome) + (vm.consolidamento ? ' <span class="chip chip-consolida">mantenimento</span>' : '') + '</p>';
      vm.blocchi.forEach((b, i) => {
        html += UI.cardBlocco(b, i, vm.spunte[i] || [], bloccata);
      });
    } else {
      vm.esercizi.forEach((ex, i) => {
        html += UI.cardEsercizio(iso, ex, i, vm.spunte[i] || [], bloccata);
      });
    }

    /* stretching di chiusura */
    const str = DB.STRETCHING[vm.tipo];
    if (str) {
      html += '<details class="dettagli-box"><summary>🧘 ' + U.esc(str.nome) + '</summary><ul>' +
        str.voci.map(v => '<li>' + U.esc(v) + '</li>').join('') + '</ul></details>';
    }

    if (!bloccata) html += '<button class="btn-primario" data-action="completa">Seduta completata ✓</button>';

    box.innerHTML = html;
  },

  /* voto di fatica a fine seduta: alimenta il guardiano del carico */
  bloccoRPE(iso) {
    const voce = S.data.storico.find(s => s.data === iso && s.tipo !== 'partita');
    if (!voce) return '';
    if (voce.rpe) return '<p class="rpe-fatta">Fatica registrata: <strong>' + voce.rpe + '/10</strong></p>';
    let html = '<div class="rpe-box"><p>Quanto è stata dura? (1 = passeggiata, 10 = al limite)</p><div class="rpe-riga">';
    for (let v = 1; v <= 10; v++) {
      html += '<button class="rpe-btn" data-action="rpe" data-val="' + v + '">' + v + '</button>';
    }
    return html + '</div></div>';
  },

  /* blocco di corsa: un tasto per ogni ripetuta, il recupero parte alla spunta */
  cardBlocco(b, i, sp, bloccata) {
    const nSerie = b.serie || 1;
    let serieHtml = '<div class="serie-riga">';
    for (let s = 0; s < nSerie; s++) {
      const fatta = !!sp[s];
      serieHtml += '<button class="serie-btn ' + (fatta ? 'fatta' : '') + '" ' + (bloccata ? 'disabled' : '') +
        ' data-action="spunta" data-slot="' + i + '" data-serie="' + s + '" data-rec="' + (b.recupero || 0) + '">' +
        (fatta ? '✓' : (nSerie === 1 ? 'fatto' : (s + 1))) + '</button>';
    }
    serieHtml += '</div>';
    return '<div class="card-esercizio">' +
      '<div class="es-testata"><strong>' + U.esc(b.titolo) + '</strong>' +
      (nSerie > 1 ? '<span class="chip">' + nSerie + ' serie</span>' : '') + '</div>' +
      '<p class="es-dettaglio">' + U.esc(b.dettaglio) + '</p>' +
      (b.come ? '<details class="es-esecuzione"><summary>Come si fa</summary><ul>' +
        b.come.map(v => '<li>' + U.esc(v) + '</li>').join('') + '</ul></details>' : '') +
      serieHtml +
      (b.recupero ? '<div class="es-piede"><span>recupero ' + U.fmtMMSS(b.recupero) + '</span></div>' : '') +
      '</div>';
  },

  cardEsercizio(iso, ex, slot, spunte, bloccata) {
    let badges = '';
    if (ex.gruppo) {
      badges += bloccata
        ? '<span class="badge-rotazione statico">↻</span>'
        : '<button class="badge-rotazione" title="Questo esercizio ruota ogni lunedì. Tocca per cambiare subito variante." data-action="ruota" data-gruppo="' + ex.gruppo + '" data-slot="' + slot + '">↻</button>';
    }
    if (ex.consolidamento) badges += '<span class="chip chip-consolida">mantenimento</span>';
    if (ex.fastidio) badges += '<span class="chip chip-fastidio">⚠ progressione in pausa</span>';

    /* il carico si legge a colpo d'occhio: totale grande, poi come si carica davvero */
    let inline = '', boxCarico = '';
    if (ex.carico != null) {
      const d = ex.dettaglio || {};
      const editor = bloccata
        ? '<strong>' + U.fmtKg(ex.carico) + '</strong>'
        : '<button class="btn-carico" data-action="carico-meno" data-ex="' + ex.exId + '" title="Abbassa il carico">−</button>' +
          '<strong>' + U.fmtKg(ex.carico) + '</strong>' +
          '<button class="btn-carico" data-action="carico-piu" data-ex="' + ex.exId + '" title="Alza il carico">+</button>';
      boxCarico = '<div class="carico-box' + (d.avviso ? ' landmine' : '') + '">' +
        '<div class="carico-riga">' + editor +
        (ex.big && ex.caricoBase !== ex.carico ? '<span class="carico-base">base ' + U.fmtKg(ex.caricoBase) + '</span>' : '') +
        '</div>' +
        (d.testo ? '<div class="carico-come">' + U.esc(d.testo) + '</div>' : '') +
        (d.dischi ? '<div class="carico-dischi"><span class="carico-etichetta">' + U.esc(d.etichetta || '') + '</span>' +
          '<span class="carico-lista">' + U.esc(d.dischi) + '</span></div>' : '') +
        (d.avviso ? '<div class="carico-avviso">⚠ ' + U.esc(d.avviso) + '</div>' : '') +
        '</div>';
    } else if (ex.livelloLabel) {
      inline = '<span class="es-livello">' + U.esc(ex.livelloLabel) + '</span>';
    }

    let serie = '<div class="serie-riga">';
    for (let s = 0; s < ex.serie; s++) {
      const fatta = !!spunte[s];
      serie += '<button class="serie-btn ' + (fatta ? 'fatta' : '') + '" ' + (bloccata ? 'disabled' : '') +
        ' data-action="spunta" data-slot="' + slot + '" data-serie="' + s + '" data-rec="' + (ex.recupero || 0) + '">' +
        (fatta ? '✓' : (s + 1)) + '</button>';
    }
    serie += '</div>';

    const eseFase = ex.esecuzioneFase ? '<li class="ese-fase">' + U.esc(ex.esecuzioneFase) + '</li>' : '';

    return '<div class="card-esercizio">' +
      '<div class="es-testata"><strong>' + U.esc(ex.nome) + '</strong>' + badges + '</div>' +
      '<div class="es-riga"><span class="es-schema">' + U.esc(ex.schemaLabel) + '</span>' + inline + '</div>' +
      boxCarico +
      '<details class="es-esecuzione"><summary>Come si esegue</summary>' +
      (ex.perche ? '<p class="es-perche">🎯 A cosa serve: ' + U.esc(ex.perche) + '</p>' : '') +
      '<ul>' + ex.esecuzione.map(v => '<li>' + U.esc(v) + '</li>').join('') + eseFase + '</ul>' +
      (ex.errori ? '<p class="es-errori">⚠️ Errori da evitare: ' + U.esc(ex.errori) + '</p>' : '') +
      '</details>' +
      serie +
      (S.data.note[ex.exId] ? '<p class="es-nota">📝 ' + U.esc(S.data.note[ex.exId]) + '</p>' : '') +
      '<div class="es-piede"><span>recupero ' + U.fmtMMSS(ex.recupero || 0) + '</span><span class="es-piede-btn">' +
      '<button class="btn-mini" data-action="nota" data-ex="' + ex.exId + '" data-nome="' + U.esc(ex.nome) + '">📝 nota</button>' +
      '<button class="btn-mini ' + (ex.fastidio ? 'attivo' : '') + '" data-action="fastidio" data-ex="' + ex.exId + '">' +
      (ex.fastidio ? '✓ fastidio segnalato' : '⚠ ho un fastidio') + '</button></span></div></div>';
  },

  swapScelta(iso) {
    const set = S.data.settimana;
    const oggi = U.todayISO();
    const fine = U.sundayOf(set.inizio);
    let html = '<div class="swap-box"><p>Scambia con quale giorno?</p>';
    let c = oggi > set.inizio ? oggi : set.inizio;
    let trovati = 0;
    while (c <= fine) {
      const g = set.giorni[c];
      if (c !== iso && g.stato === 'da_fare' && g.tipo !== 'partita') {
        html += '<button class="btn-azione" data-action="swap-con" data-iso="' + c + '">' +
          U.GIORNI_BREVI[U.dayOfWeek(c)] + ' — ' + DB.SEDUTE[g.tipo].icona + ' ' + U.esc(DB.SEDUTE[g.tipo].nome) + '</button>';
        trovati++;
      }
      c = U.addDays(c, 1);
    }
    if (!trovati) html += '<p class="vuoto">Nessun giorno disponibile per lo scambio.</p>';
    return html + '</div>';
  },

  bloccoPartita(iso, vm) {
    const g = S.data.settimana.giorni[iso];
    let html = '<details class="dettagli-box box-riscaldamento" open><summary>🔥 ' + U.esc(DB.RISCALDAMENTI.partita.nome) + '</summary><ol>' +
      DB.RISCALDAMENTI.partita.voci.map(v => '<li>' + U.esc(v) + '</li>').join('') + '</ol></details>' +
      '<div class="card-partita"><h3>⚽ Giorno della partita</h3>' +
      '<p>Inserisci l\'orario del calcio d\'inizio: l\'app calcola a ritroso spuntini e acqua.</p>' +
      '<div class="kickoff-riga"><label for="kickoff">Calcio d\'inizio</label>' +
      '<input type="time" id="kickoff" step="300" value="' + (vm.kickoff || '') + '"></div>';

    if (vm.kickoff) {
      const parti = vm.kickoff.split(':').map(Number);
      const righe = DB.nutrizione(parti[0] * 60 + parti[1], S.data.peso);
      html += '<div class="nutrizione">';
      for (const r of righe) {
        html += '<div class="nutri-riga"><div class="nutri-ora">' + U.esc(r.quando) + '</div>' +
          '<div><strong>' + U.esc(r.titolo) + '</strong><ul>' +
          r.voci.map(v => '<li>' + U.esc(v) + '</li>').join('') + '</ul></div></div>';
      }
      html += '<p class="nota-nutri">Grammature calcolate sul tuo peso (' + S.data.peso + ' kg — lo cambi nella scheda DATI).<br>Qui trovi <strong>solo spuntini e acqua</strong>: colazione, pranzo e cena restano i tuoi.</p></div>';
    }

    if (g.stato === 'fatta') {
      html += '<div class="seduta-congelata"><h3>✓ Partita giocata' + (g.minuti ? ' — ' + g.minuti + '\'' : '') + '</h3><p>Domani: recupero' + (g.minuti >= 75 ? ' con i fiocchi' : '') + '.</p></div>' +
        '<details class="dettagli-box box-recupero" open><summary>🧊 ' + U.esc(DB.RECUPERO_POST.nome) + '</summary><ul>' +
        DB.RECUPERO_POST.voci.map(v => '<li>' + U.esc(v) + '</li>').join('') + '</ul></details>';
    } else {
      const optMin = [90, 105, 120, 75, 60, 45, 30, 15, 0].map(m => '<option value="' + m + '">' + m + ' minuti</option>').join('');
      let optRpe = '';
      for (let v = 1; v <= 10; v++) optRpe += '<option value="' + v + '" ' + (v === 7 ? 'selected' : '') + '>' + v + '</option>';
      html += '<div class="partita-dati"><p>A fine partita, prima di segnare "giocata":</p>' +
        '<div class="kickoff-riga"><label>Minuti giocati</label><select id="minuti-partita" class="select-giorno select-corto">' + optMin + '</select></div>' +
        '<div class="kickoff-riga"><label>Quanto è stata dura? (1-10)</label><select id="rpe-partita" class="select-giorno select-corto">' + optRpe + '</select></div></div>' +
        '<button class="btn-primario" data-action="partita-giocata">Partita giocata ✓</button>';
    }
    return html + '</div>';
  },

  bloccoTest(iso, testId) {
    const t = DB.TEST[testId];
    const ultimo = E.ultimoTest(testId);
    let html = '<div class="card-test"><h3>' + t.icona + ' ' + U.esc(t.nome) + '</h3>' +
      '<p>' + U.esc(t.descr) + '</p><p class="nota-test">Oggi il test sostituisce il lavoro principale della seduta.</p>';
    for (const c of t.campi) {
      const prec = ultimo && ultimo.valori[c.id] != null ? ' <small>(scorso: ' + ultimo.valori[c.id] + ' ' + c.unita + ')</small>' : '';
      html += '<div class="test-campo"><label>' + U.esc(c.label) + ' <small>' + U.esc(c.hint) + '</small>' + prec + '</label>' +
        '<div class="test-input"><input type="number" step="' + c.step + '" min="0" inputmode="decimal" id="test-' + c.id + '"><span>' + c.unita + '</span></div></div>';
    }
    html += '<button class="btn-primario" data-action="salva-test" data-test="' + testId + '">Salva i risultati del test</button></div>';
    return html;
  },

  salvaTest(iso, testId) {
    const t = DB.TEST[testId];
    const valori = {};
    for (const c of t.campi) {
      const v = parseFloat(U.$('#test-' + c.id).value);
      if (isNaN(v) || v <= 0) { UI.toast('Compila tutti i campi del test prima di salvare.'); return; }
      valori[c.id] = v;
    }
    E.registraTest(iso, testId, valori);
    if (testId === 'brevi') {
      const asim = E.asimmetria(valori.hop_sx, valori.hop_dx);
      if (asim != null) {
        UI.toast(asim > 10
          ? 'Test salvati. Asimmetria gambe: ' + asim + '% — sopra il 10%: occhio, lavora sulla gamba più debole.'
          : 'Test salvati. Asimmetria gambe: ' + asim + '% — nella norma. 👍');
      }
    } else UI.toast('Test salvato! Lo ritrovi in PROGRESSI.');
    UI.renderSeduta();
  },

  completaSeduta() {
    const iso = UI.sedutaAperta;
    const vm = E.risolviSeduta(iso);
    if (!vm) { UI.chiudiSeduta(); return; }
    const g = S.data.settimana.giorni[iso];
    let incomplete = false;
    const tot = vm.blocchi ? vm.blocchi.length : vm.esercizi.length;
    for (let i = 0; i < tot; i++) {
      const serie = vm.blocchi ? (vm.blocchi[i].serie || 1) : vm.esercizi[i].serie;
      const sp = (g.spunte && g.spunte[i]) || [];
      for (let s2 = 0; s2 < serie; s2++) if (!sp[s2]) { incomplete = true; break; }
      if (incomplete) break;
    }
    if (g.test) {
      if (!confirm('C\'è ancora il test da salvare per oggi. Completare comunque la seduta senza test? (Il test verrà riproposto)')) return;
    }
    if (incomplete && !confirm('Alcune serie non sono spuntate: quegli esercizi non progrediranno. Completare comunque?')) return;
    E.completaSeduta(iso);
    UI.guida = null;
    T.stopRest();
    UI.renderSeduta();
    UI.renderHeader();
  },

  /* ============================================================
     PREP
     ============================================================ */
  prepTipo: 'forza',
  vistaPrep() {
    const tipi = [['partita', '⚽'], ['forza', '🏋️'], ['alta', '💪'], ['velocita', '⚡'], ['resistenza', '🏃'], ['attivazione', '🔥'], ['recupero', '🌿']];
    let html = '<h2 class="titolo-tab">Riscaldamento e mobilità</h2><p class="sub-tab">Che seduta stai per fare?</p><div class="chips-riga">';
    for (const coppia of tipi) {
      html += '<button class="chip-btn ' + (UI.prepTipo === coppia[0] ? 'attivo' : '') + '" data-action="prep-tipo" data-tipo="' + coppia[0] + '">' + coppia[1] + ' ' + U.esc(DB.SEDUTE[coppia[0]].nome) + '</button>';
    }
    html += '</div>';

    const r = DB.RISCALDAMENTI[UI.prepTipo];
    html += '<div class="card-prep"><h3>🔥 ' + U.esc(r.nome) + '</h3><ol>' + r.voci.map(v => '<li>' + U.esc(v) + '</li>').join('') + '</ol></div>';

    html += '<div class="card-prep evidenza"><h3>🧍 ' + U.esc(DB.MOBILITA.nome) + '</h3><p>' + U.esc(DB.MOBILITA.descr) + '</p><ol>' +
      DB.MOBILITA.voci.map(v => '<li>' + U.esc(v) + '</li>').join('') + '</ol></div>';

    /* come misurare le distanze senza metro */
    html += '<details class="card-prep misure"><summary><strong>📏 ' + U.esc(DB.MISURE.nome) + '</strong></summary>' +
      '<p>' + U.esc(DB.MISURE.descr) + '</p><ul>' +
      DB.MISURE.voci.map(v => '<li>' + U.esc(v) + '</li>').join('') + '</ul></details>';

    /* il profilo del ruolo: i numeri che spiegano perché il programma è così */
    html += '<details class="card-prep ruolo"><summary><strong>⚽ ' + U.esc(DB.RUOLO.nome) + '</strong></summary>' +
      '<p>' + U.esc(DB.RUOLO.descr) + '</p><ul>' +
      DB.RUOLO.voci.map(v => '<li>' + U.esc(v).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') + '</li>').join('') +
      '</ul></details>';

    const st = DB.STRETCHING[UI.prepTipo];
    if (st) html += '<div class="card-prep"><h3>🧘 ' + U.esc(st.nome) + '</h3><ol>' + st.voci.map(v => '<li>' + U.esc(v) + '</li>').join('') + '</ol></div>';
    return html;
  },

  /* ============================================================
     SIX PACK — scheda dedicata
     ============================================================ */
  vistaSixpack() {
    const sp = S.data.sixpack;
    const nLiv = DB.SIXPACK.livelli.length;
    const livIdx = Math.min(sp.livello - 1, nLiv - 1);
    const liv = DB.SIXPACK.livelli[livIdx];
    const circIdx = sp.storia.length % liv.circuiti.length;
    const circ = liv.circuiti[circIdx];
    const alMassimo = sp.livello >= nLiv;
    const mancano = DB.SIXPACK.completamentiPerLivello - sp.completamenti;

    let barra = '<div class="sixpack-barra">';
    for (let i = 0; i < nLiv; i++) {
      barra += '<div class="sixpack-tacca ' + (i < sp.livello ? 'piena' : '') + '"></div>';
    }
    barra += '</div>';

    return '<div class="sixpack-hero"><h2 class="titolo-tab">Six Pack</h2>' +
      '<p class="sub-tab">Addominali d\'acciaio, un livello alla volta.</p>' +
      barra +
      '<div class="sixpack-stato">Livello <strong>' + sp.livello + '/' + nLiv + ' — ' + U.esc(liv.nome) + '</strong></div></div>' +

      '<div class="card-prep sixpack"><div class="sixpack-testata">' +
      '<h3>Circuito ' + circ.label + '</h3><span class="chip">' + liv.giri + ' giri · riposo 60" tra i giri</span></div>' +
      '<ol>' + circ.voci.map(v => '<li>' + U.esc(v) + '</li>').join('') + '</ol>' +
      '<p class="nota-sixpack">' + (alMassimo
        ? 'Livello massimo raggiunto: ora si difende il titolo. 🏆'
        : 'Ancora <strong>' + mancano + '</strong> circuiti e passi al livello ' + (sp.livello + 1) + ' (' + U.esc(DB.SIXPACK.livelli[livIdx + 1].nome) + '): esercizi nuovi, più duri.') + '</p>' +
      '<p class="nota-sixpack">I circuiti A e B si alternano da soli a ogni completamento.</p>' +
      '<button class="btn-primario" data-action="sixpack-fatto">Circuito completato ✓</button></div>' +

      '<div class="card-prep"><h3>Come funziona</h3><p>' + U.esc(DB.SIXPACK.descr) + '</p>' +
      '<p class="nota-sixpack">Circuiti completati in totale: <strong>' + sp.storia.length + '</strong></p></div>';
  },

  sixpackFatto() {
    const sp = S.data.sixpack;
    sp.completamenti++;
    sp.storia.push({ data: U.todayISO(), livello: sp.livello });
    if (sp.completamenti >= DB.SIXPACK.completamentiPerLivello && sp.livello < DB.SIXPACK.livelli.length) {
      sp.livello++;
      sp.completamenti = 0;
      UI.toast('LIVELLO ' + sp.livello + ' SBLOCCATO! 🔓 ' + DB.SIXPACK.livelli[sp.livello - 1].nome + ': esercizi nuovi.');
    } else {
      UI.toast('Circuito registrato. 💪');
    }
    S.save();
    UI.render();
  },

  /* ============================================================
     TIMER
     ============================================================ */
  vistaTimer() {
    return '<h2 class="titolo-tab">Timer</h2>' +
      '<div class="timer-modi">' +
      '<button class="timer-modo attivo" data-action="timer-modo" data-modo="giu">⏳ Conto alla rovescia</button>' +
      '<button class="timer-modo" data-action="timer-modo" data-modo="su">⏱ Cronometro</button></div>' +
      '<div id="timer-display" class="timer-display">' + U.fmtMMSS(T.tab.durata) + '</div>' +
      '<div id="timer-presets" class="timer-presets">' +
      [30, 60, 90, 120, 180, 240].map(s =>
        '<button class="timer-preset ' + (T.tab.durata === s ? 'attivo' : '') + '" data-action="timer-preset" data-sec="' + s + '">' + U.fmtMMSS(s) + '</button>').join('') +
      '<div class="timer-aggiusta">' +
      [[-60, '−1\''], [-15, '−15"'], [15, '+15"'], [60, '+1\'']].map(c =>
        '<button class="btn-azione" data-action="timer-aggiusta" data-delta="' + c[0] + '">' + c[1] + '</button>').join('') +
      '</div></div>' +
      '<div class="timer-controlli">' +
      '<button id="timer-startpause" class="btn-primario btn-timer" data-action="timer-startpause">VIA</button>' +
      '<button class="btn-azione" data-action="timer-reset">Azzera</button></div>' +
      '<p class="nota-timer">Tre beep: uno all\'avvio, tre negli ultimi secondi, uno lungo alla fine.<br>Il recupero tra le serie parte comunque da solo quando spunti una serie.</p>';
  },

  /* ============================================================
     PROGRESSI
     ============================================================ */
  /* metriche disponibili per gli obiettivi stagionali */
  METRICHE: {
    squat: { label: 'Squat (kg)', val: () => (S.data.esercizi.squat || {}).carico || null },
    stacco_rumeno: { label: 'Stacco rumeno (kg)', val: () => (S.data.esercizi.stacco_rumeno || {}).carico || null },
    hip_thrust: { label: 'Hip thrust (kg)', val: () => (S.data.esercizi.hip_thrust || {}).carico || null },
    panca_piana: { label: 'Panca piana (kg)', val: () => (S.data.esercizi.panca_piana || {}).carico || null },
    cooper: { label: 'Cooper (m)', val: () => { const u = E.ultimoTest('cooper'); return u ? u.valori.cooper_m : null; } },
    yoyo: { label: 'Yo-Yo (m)', val: () => { const u = E.ultimoTest('yoyo'); return u ? u.valori.yoyo_m : null; } },
    sprint30: { label: 'Sprint 30 m (s)', giu: true, val: () => { const u = E.ultimoTest('brevi'); return u ? u.valori.sprint30 : null; } },
    salto_lungo: { label: 'Salto in lungo (cm)', val: () => { const u = E.ultimoTest('brevi'); return u ? u.valori.salto_lungo : null; } },
  },

  cardObiettivi() {
    const oggi = U.todayISO();
    let righe = '';
    S.data.obiettivi.forEach((o, idx) => {
      const m = UI.METRICHE[o.metrica];
      if (!m) return;
      const att = m.val();
      if (o.iniziale == null && att != null) { o.iniziale = att; S.save(); }
      let perc = 0;
      if (att != null && o.iniziale != null && o.target !== o.iniziale) {
        perc = Math.round((att - o.iniziale) / (o.target - o.iniziale) * 100);
      }
      perc = Math.max(0, Math.min(100, perc));
      const giorni = U.diffDays(oggi, o.scadenza);
      righe += '<div class="obiettivo"><div class="obiettivo-testa"><strong>' + m.label + ' → ' + o.target + '</strong>' +
        '<button class="btn-mini" data-action="obiettivo-elimina" data-idx="' + idx + '">🗑</button></div>' +
        '<div class="barra"><div class="barra-fill" style="width:' + perc + '%"></div></div>' +
        '<small>' + (att != null ? 'ora: ' + att : 'in attesa del primo dato') + ' · ' + perc + '%' +
        (giorni >= 0 ? ' · ' + giorni + ' giorni rimasti' : ' · <span class="scaduto">scaduto</span>') + '</small></div>';
    });
    const opzioni = Object.entries(UI.METRICHE).map(([id, m]) => '<option value="' + id + '">' + m.label + '</option>').join('');
    return '<div class="card-prep"><h3>🎯 Obiettivi stagionali</h3>' +
      (righe || '<p class="vuoto">Fissa un traguardo misurabile: la barra ti dice se sei in linea.</p>') +
      '<div class="obiettivo-form">' +
      '<select id="ob-metrica" class="select-giorno">' + opzioni + '</select>' +
      '<div class="obiettivo-form-riga"><input type="number" id="ob-target" class="select-giorno" placeholder="traguardo" step="any">' +
      '<input type="date" id="ob-data" class="select-giorno" value="' + U.addDays(oggi, 90) + '"></div>' +
      '<button class="btn-azione" data-action="obiettivo-aggiungi">+ Aggiungi obiettivo</button></div></div>';
  },

  progressiEx: 'squat',
  vistaProgressi() {
    let html = '<h2 class="titolo-tab">Progressi</h2>';
    html += UI.cardObiettivi();

    /* costanza e carico: la variabile che decide tutto */
    const st = E.statistiche();
    const oggi = U.todayISO();
    const acuto = E.caricoFinestra(oggi, 7);
    const cronico = Math.round(E.caricoFinestra(oggi, 28) / 4);
    html += '<div class="card-prep"><h3>🔥 Costanza</h3><div class="stat-riga">' +
      '<div class="stat"><strong>' + st.totali + '</strong><span>sedute totali</span></div>' +
      '<div class="stat"><strong>' + st.ultimi28 + '</strong><span>ultimi 28 giorni</span></div>' +
      '<div class="stat"><strong>' + st.streak + '</strong><span>settimane di fila (3+ sedute)</span></div>' +
      '</div>' +
      (cronico > 0 ? '<p class="nota-sixpack">Carico ultimi 7 giorni: <strong>' + acuto + '</strong> · media settimanale del mese: <strong>' + cronico + '</strong> (RPE × minuti — vota la fatica a fine seduta per tenerlo aggiornato)</p>' : '<p class="nota-sixpack">Vota la fatica (1-10) a fine seduta: l\'app calcola il carico settimanale e ti avvisa se stai accelerando troppo.</p>');

    /* carico esterno: i metri veri, come lo misurano i club col GPS */
    const m7 = E.metriFinestra(oggi, 7);
    const barra = (valore, min, max) => {
      const perc = Math.max(0, Math.min(100, Math.round(valore / max * 100)));
      const stato = valore < min ? 'sotto' : (valore > max ? 'sopra' : 'dentro');
      return '<div class="carico-metri stato-' + stato + '">' +
        '<div class="carico-metri-testa"><strong>' + valore + ' m</strong><small>obiettivo ' + min + '-' + max + ' m</small></div>' +
        '<div class="barra"><div class="barra-fill" style="width:' + perc + '%"></div></div></div>';
    };
    html += '<div class="card-prep"><h3>📍 Carico esterno (ultimi 7 giorni)</h3>' +
      '<p>I metri che i club misurano col GPS, partita compresa. Gli obiettivi sono tarati sulle richieste di un terzino: in fase Ipertrofia è normale stare sotto (lì si costruisce), in Forza e Potenza si sale.</p>' +
      '<h4 class="titolo-grafico">Metri ad alta intensità</h4>' + barra(m7.alta, DB.CARICO_TARGET.alta[0], DB.CARICO_TARGET.alta[1]) +
      '<h4 class="titolo-grafico">Metri di sprint</h4>' + barra(m7.sprint, DB.CARICO_TARGET.sprint[0], DB.CARICO_TARGET.sprint[1]) +
      '<p class="nota-sixpack">' +
      (m7.alta === 0 && m7.sprint === 0
        ? 'Completa le sedute di strada e la partita: i metri si contano da soli.'
        : (m7.alta < DB.CARICO_TARGET.alta[0]
            ? 'Sei sotto il volume di riferimento: se ti senti bene, non saltare le sedute di strada.'
            : (m7.alta > DB.CARICO_TARGET.alta[1]
                ? 'Sei sopra il riferimento: settimana intensa, occhio alle sensazioni.'
                : 'Sei nella finestra giusta: è il volume che regge la partita senza logorarti.'))) +
      '</p></div>';

    /* grafico del carico settimanale (ultime 8 settimane) */
    const puntiCarico = [];
    let caricoDati = false;
    for (let i = 7; i >= 0; i--) {
      const lun = U.addDays(U.mondayOf(oggi), -7 * i);
      let tot = 0;
      for (const s of S.data.storico) {
        if (s.data >= lun && s.data <= U.addDays(lun, 6)) tot += E.caricoSeduta(s);
      }
      if (tot > 0) caricoDati = true;
      puntiCarico.push({ x: lun, y: tot });
    }
    if (caricoDati) {
      html += '<h4 class="titolo-grafico">Carico settimanale (RPE × minuti)</h4>' + C.linea(puntiCarico, { colore: '#ff7a26' });
    }

    /* storia della prontezza: quando il corpo si lamenta */
    const puntiPront = Object.entries(S.data.prontezza)
      .map(p => ({ x: p[0], y: p[1].punti }))
      .sort((a, b) => (a.x < b.x ? -1 : 1));
    if (puntiPront.length >= 2) {
      html += '<h4 class="titolo-grafico">Prontezza mattutina (10+ verde · 7-9 giallo · 6- rosso)</h4>' +
        C.linea(puntiPront, { unita: 'pt', colore: '#2fe06f' }) +
        '<p class="nota-sixpack">Se i punti scendono quando il carico sale, il corpo ti sta parlando: è il momento di uno scarico.</p>';
    }
    html += '</div>';

    /* carichi */
    const conStoria = Object.keys(DB.ESERCIZI).filter(id => {
      const st = S.data.esercizi[id];
      return st && st.storia && st.storia.length;
    });
    html += '<div class="card-prep"><h3>🏋️ Carichi nel tempo</h3>';
    if (conStoria.length) {
      if (!conStoria.includes(UI.progressiEx)) UI.progressiEx = conStoria[0];
      html += '<select id="progressi-ex" class="select-giorno">' +
        conStoria.map(id => '<option value="' + id + '" ' + (id === UI.progressiEx ? 'selected' : '') + '>' + U.esc(DB.ESERCIZI[id].nome) + '</option>').join('') + '</select>';
      const def = DB.ESERCIZI[UI.progressiEx];
      let punti, unita = 'kg';
      if (def.livelli) {
        const st = S.data.esercizi[UI.progressiEx];
        punti = st.storia.map(p => ({ x: p.data, y: (p.livello || 0) + 1 }));
        unita = 'liv.';
      } else {
        punti = E.serieCarico(UI.progressiEx);
      }
      html += C.linea(punti, { unita });
    } else {
      html += '<p class="vuoto">Completa le prime sedute e qui vedrai i carichi salire.</p>';
    }
    html += '</div>';

    /* test */
    html += '<div class="card-prep"><h3>⏱️ Test fisici</h3>';
    const grafici = [
      ['brevi', 'sprint10', 'Sprint 10 m', 's', 'giu'],
      ['brevi', 'sprint30', 'Sprint 30 m', 's', 'giu'],
      ['brevi', 'salto_lungo', 'Salto in lungo', 'cm', 'su'],
      ['cooper', 'cooper_m', 'Cooper 12\'', 'm', 'su'],
      ['yoyo', 'yoyo_m', 'Yo-Yo IR1', 'm', 'su'],
    ];
    let almenoUno = false;
    for (const riga of grafici) {
      const punti = E.serieTest(riga[0], riga[1]);
      if (!punti.length) continue;
      almenoUno = true;
      html += '<h4 class="titolo-grafico">' + riga[2] + '</h4>' + C.linea(punti, { unita: riga[3], migliora: riga[4], colore: '#38bdf8' });
    }
    const brevi = S.data.test.risultati.brevi;
    if (brevi && brevi.length) {
      const u = brevi[brevi.length - 1];
      const asim = E.asimmetria(u.valori.hop_sx, u.valori.hop_dx);
      if (asim != null) {
        html += '<div class="asimmetria ' + (asim > 10 ? 'alta' : '') + '">Asimmetria salto monopodalico: <strong>' + asim + '%</strong> ' +
          (asim > 10 ? '— sopra il 10%: dai priorità alla gamba più debole nei lavori unilaterali.' : '— nella norma (soglia di attenzione: 10%).') + '</div>';
      }
    }
    if (!almenoUno) html += '<p class="vuoto">I test arrivano da soli quando è ora (circa ogni 6 settimane): l\'app li inserisce nel giorno giusto.</p>';
    html += '</div>';
    return html;
  },

  /* ============================================================
     STORICO
     ============================================================ */
  vistaStorico() {
    let html = '<h2 class="titolo-tab">Storico sedute</h2>';
    if (!S.data.storico.length) return html + '<p class="vuoto">Ancora nessuna seduta completata. La prima è la più importante.</p>';
    for (const s of S.data.storico.slice(0, 100)) {
      const meta = DB.SEDUTE[s.tipo] || { icona: '⚽' };
      html += '<details class="storico-riga"><summary><span>' + meta.icona + ' <strong>' + U.esc(s.nome) + '</strong></span>' +
        '<span class="storico-data">' + U.fmtData(s.data) + (s.fase ? ' · ' + U.esc(s.fase) : '') + '</span></summary>';
      if (s.dettagli && s.dettagli.length) {
        html += '<ul>' + s.dettagli.map(d =>
          '<li>' + U.esc(d.nome) + ' — ' + U.esc(d.schema || '') +
          (d.carico != null ? ' @ ' + U.fmtKg(d.carico) : '') +
          (d.complete ? ' ✓' : ' (incompleta)') +
          (d.fastidio ? ' ⚠' : '') + '</li>').join('') + '</ul>';
      } else html += '<p class="vuoto">Nessun dettaglio.</p>';
      html += '</details>';
    }
    return html;
  },

  /* ============================================================
     DATI
     ============================================================ */
  vistaDati() {
    return '<h2 class="titolo-tab">Dati e sicurezza</h2>' +
      '<div class="card-prep"><h3>⚖️ Il tuo peso</h3><p>Serve solo per le grammature della nutrizione pre-gara.</p>' +
      '<div class="test-input"><input type="number" id="peso-input" min="40" max="120" step="1" value="' + S.data.peso + '"><span>kg</span></div></div>' +
      '<div class="card-prep"><h3>💾 Backup</h3>' +
      '<p>I dati vivono SOLO in questo browser. Esporta un backup ogni tanto: se il telefono si rompe o il browser viene pulito, i tuoi numeri si salvano così.</p>' +
      '<button class="btn-primario" data-action="esporta">Esporta backup</button>' +
      '<label class="btn-azione btn-file">Importa backup<input type="file" id="importa-file" accept=".json,application/json" hidden></label></div>' +
      '<div class="card-prep pericolo"><h3>🗑 Azzeramento totale</h3>' +
      '<p>Cancella TUTTO: carichi, storico, test, settimana. Non si torna indietro.</p>' +
      '<button class="btn-azione btn-pericolo" data-action="azzera">Azzera tutto</button></div>' +
      '<div class="card-prep"><h3>🔄 Versione dell\'app</h3>' +
      '<div class="build-grande">build ' + DB.BUILD + '</div>' +
      '<p>Di norma l\'app si aggiorna da sola quando la riapri con internet. Se sospetti di avere una versione vecchia, forzala da qui.</p>' +
      '<button class="btn-primario" data-action="aggiorna-app">Cerca aggiornamenti</button>' +
      '<p class="nota-sixpack">Nessun dato viene toccato: carichi, storico e progressi restano al loro posto.</p></div>' +
      '<div class="card-prep"><h3>ℹ️ Dettagli</h3><p>Dati creati il ' + U.fmtData(S.data.creato) + '<br>' +
      'Sedute nello storico: ' + S.data.storico.length + '</p></div>';
  },

  /* la settimana come immagine da salvare o condividere */
  esportaSettimana() {
    const set = S.data.settimana;
    if (!set) { UI.toast('Nessuna settimana attiva da esportare.'); return; }
    const nomiTipo = { una: '1 PARTITA', due: '2 PARTITE', costruzione: 'COSTRUZIONE', scarico: 'SCARICO' };
    const colori = { forza: '#ff7a26', alta: '#a78bfa', velocita: '#ffc226', resistenza: '#3fc6f5', attivazione: '#ff4d5e', recupero: '#2dd4bf', partita: '#2fe06f' };
    const giorni = Object.keys(set.giorni).sort();
    const W = 720, RH = 66, TOP = 116;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = TOP + RH * giorni.length + 34;
    const ctx = cv.getContext('2d');

    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#f2f5f9';
    ctx.font = 'italic 900 34px Segoe UI, Arial';
    ctx.fillText('⚽ TERZINO', 28, 52);
    ctx.fillStyle = '#8b95a7';
    ctx.font = '700 16px Segoe UI, Arial';
    ctx.fillText('SETTIMANA ' + U.fmtDataBreve(set.inizio) + ' – ' + U.fmtDataBreve(U.sundayOf(set.inizio)) + '  ·  ' + (nomiTipo[set.tipo] || ''), 28, 84);

    giorni.forEach((iso, i) => {
      const g = set.giorni[iso];
      const y = TOP + i * RH;
      ctx.fillStyle = '#13161c';
      ctx.fillRect(24, y, W - 48, RH - 10);
      ctx.fillStyle = colori[g.tipo] || '#8b95a7';
      ctx.fillRect(24, y, 6, RH - 10);
      ctx.fillStyle = '#f2f5f9';
      ctx.font = '900 18px Segoe UI, Arial';
      ctx.fillText(U.GIORNI_BREVI[U.dayOfWeek(iso)] + ' ' + U.fmtDataBreve(iso), 48, y + 26);
      ctx.font = '600 17px Segoe UI, Arial';
      ctx.fillText(DB.SEDUTE[g.tipo].icona + ' ' + DB.SEDUTE[g.tipo].nome + (g.pioggia ? ' 🌧' : ''), 48, y + 48);
      ctx.font = '700 20px Segoe UI, Arial';
      ctx.fillStyle = g.stato === 'fatta' ? '#2fe06f' : (g.stato === 'saltata' ? '#ff4d5e' : '#8b95a7');
      ctx.fillText(g.stato === 'fatta' ? '✓ FATTA' : (g.stato === 'saltata' ? 'SALTATA' : ''), W - 150, y + 38);
    });

    cv.toBlob(function (blob) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'terzino-settimana-' + set.inizio + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, 'image/png');
    UI.toast('Immagine della settimana salvata. 📤');
  },

  esporta() {
    const blob = new Blob([S.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'allenamento-backup-' + U.todayISO() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    S.data.ultimoBackup = U.todayISO();
    S.save();
    UI.toast('Backup esportato: salvalo in un posto sicuro (Drive, mail a te stesso...).');
  },
};
