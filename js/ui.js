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

    const nomiTipo = { una: '1 partita', due: '2 partite', costruzione: 'Costruzione' };
    let html = '<div class="settimana-testata">' +
      '<span class="settimana-tipo">🔒 Settimana: <strong>' + nomiTipo[set.tipo] + '</strong></span>' +
      '<button class="link" data-action="correggi">ho sbagliato, correggi</button></div>';

    let iso = da;
    while (iso <= fine) {
      html += UI.cardGiorno(iso, set.giorni[iso]);
      iso = U.addDays(iso, 1);
    }

    /* domenica: si decide la settimana che inizia domani */
    if (E.serveProssima()) {
      html += '<div class="prossima-box">' + UI.pannelloScelta(true) + '</div>';
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
    let html = '<div class="pannello">' +
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
    if (sel.tipo === 'una') {
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
    if (sel.tipo === 'una') {
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
    U.$('#overlay').classList.remove('aperto');
    UI.render();
  },

  renderSeduta() {
    const iso = UI.sedutaAperta;
    if (!iso) return;
    const vm = E.risolviSeduta(iso);
    if (!vm) { UI.chiudiSeduta(); return; }
    const box = U.$('#overlay-contenuto');

    let html = '<div class="seduta-testata">' +
      '<button class="btn-indietro" data-action="chiudi-seduta">‹</button>' +
      '<div><h2>' + vm.icona + ' ' + U.esc(vm.nome) + '</h2>' +
      '<p class="seduta-sub">' + U.fmtData(iso) +
      ' · <span class="chip chip-luogo">' + (vm.luogo === 'garage' ? '🏠 garage' : vm.luogo === 'strada' ? '🛣️ strada' : '🏟️ campo') + '</span>' +
      (vm.partita ? '' : ' · <span class="chip" style="border-color:' + vm.faseColore + '">' + U.esc(vm.faseNome) + '</span>') +
      '</p></div></div>';

    if (vm.partita) { box.innerHTML = html + UI.bloccoPartita(iso, vm); return; }

    /* azioni: pioggia (solo strada), sposta, oggi non posso */
    if (vm.stato === 'da_fare') {
      html += '<div class="seduta-azioni">';
      if (vm.tipo === 'velocita' || vm.tipo === 'resistenza') {
        html += '<button class="btn-azione ' + (vm.pioggia ? 'attivo' : '') + '" data-action="pioggia">🌧 ' + (vm.pioggia ? 'torna in strada' : 'piove: versione garage') + '</button>';
      }
      html += '<button class="btn-azione" data-action="swap-apri">🔀 sposta</button>' +
        '<button class="btn-azione" data-action="non-posso">🚫 oggi non posso</button></div>';
      if (UI.swapInCorso) html += UI.swapScelta(iso);
    }

    if (vm.stato === 'fatta') {
      html += '<div class="seduta-congelata"><h3>✓ Seduta completata</h3>' +
        (vm.risultato && vm.risultato.length
          ? '<p>Cosa è migliorato:</p><ul>' + vm.risultato.map(m => '<li><strong>' + U.esc(m.nome) + '</strong>: ' + U.esc(m.testo) + '</li>').join('') + '</ul>'
          : '<p>Registrata nello storico.</p>') + '</div>';
    }
    if (vm.stato === 'saltata') html += '<div class="seduta-congelata"><h3>Seduta saltata</h3><p>Si riparte dalla prossima.</p></div>';

    /* test del giorno (il modulo si compila solo finché la seduta è da fare) */
    if (vm.test && vm.stato === 'da_fare') {
      html += UI.bloccoTest(iso, vm.test);
    } else if (vm.testFatto) {
      html += '<div class="seduta-congelata"><h3>' + DB.TEST[vm.testFatto].icona + ' Test salvato ✓</h3>' +
        '<p>' + U.esc(DB.TEST[vm.testFatto].nome) + ': risultati registrati, li trovi in PROGRESSI.</p></div>';
    }

    /* riscaldamento (unico: nei giorni di pioggia c'è la versione da garage) */
    const risc = vm.pioggia ? DB.RISCALDAMENTI.pioggia : DB.RISCALDAMENTI[vm.tipo];
    if (risc) {
      html += '<details class="dettagli-box"><summary>🔥 ' + U.esc(risc.nome) + '</summary><ul>' +
        risc.voci.map(v => '<li>' + U.esc(v) + '</li>').join('') + '</ul></details>';
    }

    const bloccata = vm.stato !== 'da_fare';

    if (vm.blocchi) {
      /* seduta di corsa (nei giorni test i blocchi normali non ci sono: conta il test) */
      if (!vm.soloTest) html += '<p class="corsa-nome">' + U.esc(vm.corsaNome) + (vm.consolidamento ? ' <span class="chip chip-consolida">mantenimento</span>' : '') + '</p>';
      vm.blocchi.forEach((b, i) => {
        /* come per i pesi: un tasto per ogni ripetuta, il recupero parte alla spunta */
        const nSerie = b.serie || 1;
        const sp = vm.spunte[i] || [];
        let serieHtml = '<div class="serie-riga">';
        for (let s = 0; s < nSerie; s++) {
          const fatta = !!sp[s];
          serieHtml += '<button class="serie-btn ' + (fatta ? 'fatta' : '') + '" ' + (bloccata ? 'disabled' : '') +
            ' data-action="spunta" data-slot="' + i + '" data-serie="' + s + '" data-rec="' + (b.recupero || 0) + '">' +
            (fatta ? '✓' : (nSerie === 1 ? 'fatto' : (s + 1))) + '</button>';
        }
        serieHtml += '</div>';
        html += '<div class="card-esercizio">' +
          '<div class="es-testata"><strong>' + U.esc(b.titolo) + '</strong>' +
          (nSerie > 1 ? '<span class="chip">' + nSerie + ' serie</span>' : '') + '</div>' +
          '<p class="es-dettaglio">' + U.esc(b.dettaglio) + '</p>' +
          serieHtml +
          (b.recupero ? '<div class="es-piede"><span>recupero ' + U.fmtMMSS(b.recupero) + '</span></div>' : '') +
          '</div>';
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

  cardEsercizio(iso, ex, slot, spunte, bloccata) {
    let badges = '';
    if (ex.gruppo) {
      badges += bloccata
        ? '<span class="badge-rotazione statico">↻</span>'
        : '<button class="badge-rotazione" title="Questo esercizio ruota ogni lunedì. Tocca per cambiare subito variante." data-action="ruota" data-gruppo="' + ex.gruppo + '" data-slot="' + slot + '">↻</button>';
    }
    if (ex.consolidamento) badges += '<span class="chip chip-consolida">mantenimento</span>';
    if (ex.fastidio) badges += '<span class="chip chip-fastidio">⚠ progressione in pausa</span>';

    let carico = '';
    if (ex.carico != null) {
      /* tasti − / + per correggere il carico a mano (rispettano dischi pari, inserti e tetti) */
      const editor = bloccata
        ? '<strong>' + U.fmtKg(ex.carico) + '</strong>'
        : '<span class="carico-edit">' +
          '<button class="btn-carico" data-action="carico-meno" data-ex="' + ex.exId + '" title="Abbassa il carico">−</button>' +
          '<strong>' + U.fmtKg(ex.carico) + '</strong>' +
          '<button class="btn-carico" data-action="carico-piu" data-ex="' + ex.exId + '" title="Alza il carico">+</button></span>';
      carico = '<div class="es-carico">' + editor +
        (ex.big && ex.caricoBase !== ex.carico ? ' <small>(base ' + U.fmtKg(ex.caricoBase) + ')</small>' : '') +
        (ex.dettaglio ? '<br><small>' + U.esc(ex.dettaglio) + '</small>' : '') + '</div>';
    } else if (ex.livelloLabel) {
      carico = '<div class="es-carico"><small>' + U.esc(ex.livelloLabel) + '</small></div>';
    } else if (ex.dettaglio) {
      carico = '<div class="es-carico"><small>' + U.esc(ex.dettaglio) + '</small></div>';
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
      '<div class="es-riga"><span class="es-schema">' + U.esc(ex.schemaLabel) + '</span>' + carico + '</div>' +
      '<details class="es-esecuzione"><summary>Come si esegue</summary>' +
      (ex.perche ? '<p class="es-perche">🎯 A cosa serve: ' + U.esc(ex.perche) + '</p>' : '') +
      '<ul>' + ex.esecuzione.map(v => '<li>' + U.esc(v) + '</li>').join('') + eseFase + '</ul>' +
      (ex.errori ? '<p class="es-errori">⚠️ Errori da evitare: ' + U.esc(ex.errori) + '</p>' : '') +
      '</details>' +
      serie +
      '<div class="es-piede"><span>recupero ' + U.fmtMMSS(ex.recupero || 0) + '</span>' +
      '<button class="btn-mini ' + (ex.fastidio ? 'attivo' : '') + '" data-action="fastidio" data-ex="' + ex.exId + '">' +
      (ex.fastidio ? '✓ fastidio segnalato' : '⚠ ho un fastidio') + '</button></div></div>';
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
    let html = '<div class="card-partita"><h3>⚽ Giorno della partita</h3>' +
      '<p>Inserisci l\'orario del calcio d\'inizio: l\'app calcola a ritroso cosa mangiare e bere.</p>' +
      '<div class="kickoff-riga"><label>Calcio d\'inizio</label>' +
      '<input type="time" id="kickoff" value="' + (vm.kickoff || '') + '"></div>';

    if (vm.kickoff) {
      const parti = vm.kickoff.split(':').map(Number);
      const righe = DB.nutrizione(parti[0] * 60 + parti[1], S.data.peso);
      html += '<div class="nutrizione">';
      for (const r of righe) {
        html += '<div class="nutri-riga"><div class="nutri-ora">' + U.esc(r.quando) + '</div>' +
          '<div><strong>' + U.esc(r.titolo) + '</strong><ul>' +
          r.voci.map(v => '<li>' + U.esc(v) + '</li>').join('') + '</ul></div></div>';
      }
      html += '<p class="nota-nutri">Grammature calcolate sul tuo peso (' + S.data.peso + ' kg — lo cambi nella scheda DATI). Solo pre-gara: i pasti principali restano i tuoi.</p></div>';
    }

    if (g.stato === 'fatta') html += '<div class="seduta-congelata"><h3>✓ Partita giocata</h3><p>Domani: recupero.</p></div>';
    else html += '<button class="btn-primario" data-action="partita-giocata">Partita giocata ✓</button>';
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
    T.stopRest();
    UI.renderSeduta();
    UI.renderHeader();
  },

  /* ============================================================
     PREP
     ============================================================ */
  prepTipo: 'forza',
  vistaPrep() {
    const tipi = [['forza', '🏋️'], ['alta', '💪'], ['velocita', '⚡'], ['resistenza', '🏃'], ['attivazione', '🔥'], ['recupero', '🌿']];
    let html = '<h2 class="titolo-tab">Riscaldamento e mobilità</h2><p class="sub-tab">Che seduta stai per fare?</p><div class="chips-riga">';
    for (const coppia of tipi) {
      html += '<button class="chip-btn ' + (UI.prepTipo === coppia[0] ? 'attivo' : '') + '" data-action="prep-tipo" data-tipo="' + coppia[0] + '">' + coppia[1] + ' ' + U.esc(DB.SEDUTE[coppia[0]].nome) + '</button>';
    }
    html += '</div>';

    const r = DB.RISCALDAMENTI[UI.prepTipo];
    html += '<div class="card-prep"><h3>🔥 ' + U.esc(r.nome) + '</h3><ol>' + r.voci.map(v => '<li>' + U.esc(v) + '</li>').join('') + '</ol></div>';

    html += '<div class="card-prep evidenza"><h3>🧍 ' + U.esc(DB.MOBILITA.nome) + '</h3><p>' + U.esc(DB.MOBILITA.descr) + '</p><ol>' +
      DB.MOBILITA.voci.map(v => '<li>' + U.esc(v) + '</li>').join('') + '</ol></div>';

    const st = DB.STRETCHING[UI.prepTipo];
    html += '<div class="card-prep"><h3>🧘 ' + U.esc(st.nome) + '</h3><ol>' + st.voci.map(v => '<li>' + U.esc(v) + '</li>').join('') + '</ol></div>';
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
      '</div>' +
      '<div class="timer-controlli">' +
      '<button id="timer-startpause" class="btn-primario btn-timer" data-action="timer-startpause">VIA</button>' +
      '<button class="btn-azione" data-action="timer-reset">Azzera</button></div>' +
      '<p class="nota-timer">Tre beep: uno all\'avvio, tre negli ultimi secondi, uno lungo alla fine.<br>Il recupero tra le serie parte comunque da solo quando spunti una serie.</p>';
  },

  /* ============================================================
     PROGRESSI
     ============================================================ */
  progressiEx: 'squat',
  vistaProgressi() {
    let html = '<h2 class="titolo-tab">Progressi</h2>';

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
      '<div class="card-prep"><h3>ℹ️ Versione</h3><p>Build <strong>' + DB.BUILD + '</strong> · dati creati il ' + U.fmtData(S.data.creato) + '<br>' +
      'Sedute nello storico: ' + S.data.storico.length + '</p></div>';
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
    UI.toast('Backup esportato: salvalo in un posto sicuro (Drive, mail a te stesso...).');
  },
};
