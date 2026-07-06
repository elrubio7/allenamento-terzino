'use strict';
/* ============================================================
   MOTORE — progressione automatica, fasi, rotazioni,
   generazione della settimana, swap/pioggia/imprevisti, test.
   ============================================================ */
const E = {};

/* ---------- arrotondamenti legati all'attrezzatura ---------- */
E.caricoValido = function (tipoCarico, kg) {
  if (tipoCarico === 'bilanciere') {
    let v = Math.round(kg / 2) * 2;                    // sempre pari (dischi in coppia)
    return Math.min(DB.CAPS.bilanciere, Math.max(DB.PESO_BILANCIERE, v));
  }
  if (tipoCarico === 'gilet') {
    let v = Math.round(kg / DB.INSERTO_GILET) * DB.INSERTO_GILET;
    v = Math.round(v * 10) / 10;
    return Math.min(DB.CAPS.gilet, Math.max(0, v));
  }
  if (tipoCarico === 'manubrio') {
    return Math.min(DB.CAPS.manubrio, Math.max(1, Math.round(kg)));
  }
  return kg;
};

/* dischi per lato del bilanciere, es. 34 kg → "10+2+2 per lato" */
E.piastreLato = function (kg) {
  let resto = Math.round((kg - DB.PESO_BILANCIERE) / 2);
  if (resto <= 0) return 'solo bilanciere';
  const usati = [];
  for (const p of DB.PIASTRE_LATO) {
    if (p <= resto) { usati.push(p); resto -= p; }
    if (resto === 0) break;
  }
  return 'dischi per lato: ' + usati.join('+');
};

/* landmine: il bilanciere è incastrato nell'angolo, si carica UNA sola estremità */
E.piastreLandmine = function (kg) {
  let resto = Math.round(kg - DB.PESO_BILANCIERE);
  if (resto <= 0) return 'solo bilanciere';
  const usati = [];
  for (const p of DB.PIASTRE_LATO) {
    if (p <= resto) { usati.push(p); resto -= p; }
    if (resto === 0) break;
  }
  return 'dischi sull\'estremità: ' + usati.join('+');
};

E.dettaglioCarico = function (ex, kg) {
  if (ex.tipoCarico === 'bilanciere') return ex.landmine ? E.piastreLandmine(kg) : E.piastreLato(kg);
  if (ex.tipoCarico === 'gilet') {
    const ins = Math.round(kg / DB.INSERTO_GILET);
    return ins <= 0 ? 'a corpo libero (gilet non ancora necessario)' : 'gilet con ' + ins + (ins === 1 ? ' inserto' : ' inserti') + ' da 1,2 kg';
  }
  if (ex.tipoCarico === 'manubrio') return 'per manubrio';
  return '';
};

/* ---------- stato per esercizio / lavoro di corsa ---------- */
E.statoEx = function (id) {
  const ex = DB.ESERCIZI[id];
  if (!S.data.esercizi[id]) {
    S.data.esercizi[id] = {
      carico: ex.livelli ? null : (ex.start != null ? ex.start : 0),
      livello: ex.livelli ? 0 : null,
      streak: 0, consolidamento: false, fastidio: false, extraRep: 0,
      storia: [],
    };
  }
  return S.data.esercizi[id];
};

E.statoCorsa = function (id) {
  if (!S.data.corsa[id]) S.data.corsa[id] = { livello: 0, streak: 0, consolidamento: false, storia: [] };
  return S.data.corsa[id];
};

/* livello massimo di un lavoro di corsa in base alla sua progressione */
E.livMaxCorsa = function (prog) {
  if (prog.tipo === 'serie') return Math.round((prog.max - prog.base) / prog.step);
  if (prog.crescente) return Math.round((prog.max - prog.base) / prog.step);
  return Math.round((prog.base - prog.min) / Math.abs(prog.step));
};
E.valoreRitmo = function (prog, liv) {
  return prog.base + prog.step * liv;
};

/* ---------- fasi ---------- */
E.faseEffettiva = function () {
  const set = S.data.settimana;
  if (set && set.tipo === 'costruzione') return { chiave: 'ipertrofia', congelata: true };
  return { chiave: S.data.fase.nome, congelata: false };
};
E.infoFase = function () {
  const eff = E.faseEffettiva();
  const f = DB.FASI[eff.chiave];
  return {
    chiave: eff.chiave, nome: f.nome, colore: f.colore, icona: f.icona, descr: f.descr,
    congelata: eff.congelata,
    mancanti: DB.SEDUTE_PER_FASE - S.data.fase.contatore,
  };
};

/* ---------- rotazione settimanale (cambia ogni lunedì) ---------- */
E.varianteRotazione = function (gruppo, iso) {
  const lista = DB.ROTAZIONI[gruppo];
  const off = S.data.rotOffset[gruppo] || 0;
  const idx = ((U.weekNumber(iso) + off) % lista.length + lista.length) % lista.length;
  return lista[idx];
};
E.toggleRotazione = function (gruppo) {
  S.data.rotOffset[gruppo] = (S.data.rotOffset[gruppo] || 0) + 1;
  S.save();
};

/* ---------- risoluzione di uno slot in esercizio "vivo" ---------- */
E.risolviSlot = function (slot, iso, faseChiave) {
  let s = slot;
  if (s.core) s = DB.CORE_PER_FASE[faseChiave];
  let exId, gruppo = null;
  if (s.rot) { gruppo = s.rot; exId = E.varianteRotazione(s.rot, iso); }
  else exId = s.ex;

  const ex = DB.ESERCIZI[exId];
  const st = E.statoEx(exId);
  const fase = DB.FASI[faseChiave];

  let schema, carico = null, caricoBase = null, dettaglio = '', livelloLabel = null;
  if (ex.livelli) {
    const liv = Math.min(st.livello || 0, ex.livelli.length - 1);
    schema = ex.livelli[liv].schema;
    livelloLabel = ex.livelli[liv].label;
  } else if (ex.big) {
    schema = fase.schemaBig;
    caricoBase = st.carico;
    carico = E.caricoValido(ex.tipoCarico, st.carico * fase.moltiplicatore);
    if (ex.cap != null && carico > ex.cap) carico = ex.cap;
    dettaglio = E.dettaglioCarico(ex, carico);
  } else {
    schema = ex.schema;
    if (ex.tipoCarico !== 'corpo' && ex.tipoCarico !== 'band') {
      carico = E.caricoValido(ex.tipoCarico, st.carico);
      if (ex.cap != null && carico > ex.cap) carico = ex.cap;
      dettaglio = E.dettaglioCarico(ex, carico);
    }
  }
  const reps = schema.reps + (st.extraRep || 0);
  /* al tetto attrezzatura: +ripetizioni; per gli esercizi a tempo (reps=1) si allunga la tenuta */
  let repsLabel = schema.label;
  if (st.extraRep) {
    repsLabel = schema.reps > 1
      ? schema.label.replace(/\d+(?=[^\d]*$)/, String(reps)) + ' (tetto: +ripetizioni)'
      : schema.label + ' — tetto attrezzatura: +' + (st.extraRep * 5) + '" di tenuta a serie';
  }

  const extra = DB.DETTAGLI[exId] || {};
  return {
    exId, gruppo, nome: ex.nome, big: !!ex.big,
    tipoCarico: ex.tipoCarico,
    serie: schema.serie, reps, schemaLabel: repsLabel,
    carico, caricoBase, dettaglio, livelloLabel,
    recupero: ex.big ? fase.recuperoBig : ex.recupero,
    esecuzione: ex.esecuzione,
    esecuzioneFase: ex.big ? fase.esecuzioneBig : null,
    perche: extra.perche || null, errori: extra.errori || null,
    fastidio: st.fastidio, consolidamento: st.consolidamento,
  };
};

/* ---------- risoluzione della seduta di un giorno ---------- */
E.risolviSeduta = function (iso) {
  const set = S.data.settimana;
  if (!set || !set.giorni[iso]) return null;
  const g = set.giorni[iso];
  const eff = E.faseEffettiva();
  const meta = DB.SEDUTE[g.tipo];

  const vm = {
    iso, tipo: g.tipo, stato: g.stato, pioggia: !!g.pioggia,
    test: g.test || null, testFatto: g.testFatto || null,
    nome: meta.nome, icona: meta.icona, luogo: meta.luogo,
    fase: eff.chiave, faseNome: eff.congelata ? 'Base (costruzione)' : DB.FASI[eff.chiave].nome,
    faseColore: DB.FASI[eff.chiave].colore,
    spunte: g.spunte || {}, risultato: g.risultato || null,
    kickoff: g.kickoff || null,
    esercizi: [], blocchi: null, corsaId: null, corsaNome: null, progressioneCorsa: null,
  };

  if (g.tipo === 'partita') { vm.partita = true; return vm; }

  if (g.tipo === 'velocita' || g.tipo === 'resistenza') {
    const lavoro = g.pioggia ? DB.CORSA_PIOGGIA[g.tipo] : DB.CORSA[g.tipo][eff.chiave];
    const st = E.statoCorsa(lavoro.id);
    const livMax = E.livMaxCorsa(lavoro.prog);
    const liv = Math.min(st.livello, livMax);
    let ritmo = null;
    if (lavoro.prog.tipo === 'ritmo') ritmo = E.valoreRitmo(lavoro.prog, liv);
    vm.corsaId = lavoro.id;
    vm.corsaNome = lavoro.nome;
    vm.blocchi = lavoro.blocchi(liv, ritmo);
    vm.consolidamento = st.consolidamento;
    vm.progressioneCorsa = { liv, livMax, prog: lavoro.prog, ritmo };
    if (g.pioggia) { vm.luogo = 'garage'; vm.nome = meta.nome + ' 🌧'; }
    /* giornata test: il test SOSTITUISCE il lavoro normale (niente blocchi, niente progressione) */
    if (g.test || g.testFatto) { vm.soloTest = true; vm.blocchi = []; }
    return vm;
  }

  vm.esercizi = meta.slots.map(sl => E.risolviSlot(sl, iso, eff.chiave));
  return vm;
};

/* ============================================================
   SETTIMANA — generazione intorno alla partita
   ============================================================ */
E.PRIORITA = { partita: 100, attivazione: 80, forza: 60, velocita: 55, resistenza: 50, alta: 45, recupero: 10 };

E.serveScelta = function () {
  const set = S.data.settimana;
  if (!set) return true;
  return U.todayISO() > U.sundayOf(set.inizio);
};

/* la domenica si decide la settimana DOPO (se non è già stata scelta) */
E.serveProssima = function () {
  const oggi = U.todayISO();
  return U.dayOfWeek(oggi) === 6 && !E.serveScelta() && !S.data.prossima;
};

/* archivia la settimana scaduta (ricorda l'ultima partita per il lunedì di
   recupero) e promuove la settimana scelta la domenica */
E.tick = function () {
  const oggi = U.todayISO();
  /* memorizza l'ultima partita programmata già passata (serve al lunedì di recupero) */
  const ricordaPartite = sett => {
    const giocate = (sett.partite || []).filter(p => p <= oggi);
    if (giocate.length) {
      const ultima = giocate[giocate.length - 1];
      if (!S.data.ultimaPartita || ultima > S.data.ultimaPartita) S.data.ultimaPartita = ultima;
    }
  };

  const set = S.data.settimana;
  if (set && oggi > U.sundayOf(set.inizio)) {
    ricordaPartite(set);
    S.data.settimana = null;
    S.save();
  }
  const pross = S.data.prossima;
  if (pross) {
    if (!S.data.settimana && oggi >= pross.inizio && oggi <= U.sundayOf(pross.inizio)) {
      /* segna come passati i giorni eventualmente già trascorsi */
      for (const iso of Object.keys(pross.giorni)) {
        if (iso < oggi && pross.giorni[iso].stato === 'da_fare') pross.giorni[iso].stato = 'passato';
      }
      S.data.settimana = pross;
      S.data.prossima = null;
      S.save();
    } else if (oggi > U.sundayOf(pross.inizio)) {
      ricordaPartite(pross);
      S.data.prossima = null;
      S.save();
    }
  }
  /* i giorni della settimana corrente ormai trascorsi diventano 'passato'
     (libera anche i test rimasti assegnati a giorni non più raggiungibili) */
  const corrente = S.data.settimana;
  if (corrente) {
    let cambiato = false;
    for (const iso of Object.keys(corrente.giorni)) {
      if (iso < oggi && corrente.giorni[iso].stato === 'da_fare') {
        corrente.giorni[iso].stato = 'passato';
        cambiato = true;
      }
    }
    if (cambiato) S.save();
  }
  E.aggiornaTest();
  E.assegnaTestInSettimana();
};

E.generaSettimana = function (tipo, partite, lun, comeProssima) {
  const oggi = U.todayISO();
  if (!lun) lun = U.mondayOf(oggi);
  const giorniISO = [];
  for (let i = 0; i < 7; i++) giorniISO.push(U.addDays(lun, i));
  const dentro = iso => giorniISO.indexOf(iso) !== -1;

  partite = (tipo === 'costruzione') ? [] : (partite || []).filter(dentro).sort();
  const assegna = {};

  /* partite, attivazione il giorno prima, recupero il giorno dopo */
  for (const p of partite) assegna[p] = 'partita';
  for (const p of partite) {
    const prev = U.addDays(p, -1), next = U.addDays(p, 1);
    if (dentro(prev) && !assegna[prev]) assegna[prev] = 'attivazione';
    if (dentro(next) && !assegna[next]) assegna[next] = 'recupero';
  }
  /* recupero il lunedì se ieri (domenica scorsa) c'era partita */
  const ieri = U.addDays(lun, -1);
  const partitaIeri = S.data.ultimaPartita === ieri ||
    (S.data.settimana && (S.data.settimana.partite || []).indexOf(ieri) !== -1);
  if (partitaIeri && !assegna[lun]) {
    assegna[lun] = 'recupero';
  }

  const liberi = () => giorniISO.filter(iso => !assegna[iso]);

  if (tipo === 'costruzione') {
    /* settimana per mettere su lavoro: due sedute di forza, due di strada lunga */
    const coda = ['forza', 'resistenza', 'alta', 'velocita', 'forza', 'resistenza', 'recupero'];
    let i = 0;
    for (const iso of liberi()) assegna[iso] = coda[Math.min(i++, coda.length - 1)];
  } else if (partite.length) {
    const prossima = partite[0];
    /* velocità 2 giorni prima della partita (o 3 se occupato) */
    for (const delta of [-2, -3]) {
      const v = U.addDays(prossima, delta);
      if (dentro(v) && !assegna[v]) { assegna[v] = 'velocita'; break; }
    }
    /* forza gambe: il giorno libero più lontano da tutte le partite (minimo 3 giorni) */
    let migliore = null, distMigliore = -1;
    for (const iso of liberi()) {
      const dist = Math.min(...partite.map(p => Math.abs(U.diffDays(iso, p))));
      if (dist > distMigliore) { distMigliore = dist; migliore = iso; }
    }
    if (migliore && distMigliore >= 3) assegna[migliore] = 'forza';
    /* giorni rimasti: alterna garage/strada; una resistenza e una parte alta, poi recupero */
    let altaFatta = false, resFatta = false;
    for (const iso of liberi()) {
      const prima = assegna[U.addDays(iso, -1)];
      const luogoPrima = prima ? DB.SEDUTE[prima].luogo : null;
      if (!resFatta && luogoPrima !== 'strada') { assegna[iso] = 'resistenza'; resFatta = true; }
      else if (!altaFatta) { assegna[iso] = 'alta'; altaFatta = true; }
      else if (!resFatta) { assegna[iso] = 'resistenza'; resFatta = true; }
      else assegna[iso] = 'recupero';
    }
  }

  const giorni = {};
  for (const iso of giorniISO) {
    giorni[iso] = {
      tipo: assegna[iso] || 'recupero',
      stato: iso < oggi ? 'passato' : 'da_fare',
      pioggia: false, test: null, spunte: {}, risultato: null, kickoff: null,
    };
  }

  /* "ho sbagliato, correggi": i giorni già completati o saltati restano com'erano
     (niente doppia progressione completando due volte lo stesso giorno) */
  const corr = S.data._correzione;
  if (!comeProssima && corr && corr.inizio === lun) {
    for (const iso of giorniISO) {
      const vecchio = corr.giorni[iso];
      if (vecchio && (vecchio.stato === 'fatta' || vecchio.stato === 'saltata')) giorni[iso] = vecchio;
    }
  }
  delete S.data._correzione;

  const set = { inizio: lun, tipo, partite, giorni, creata: oggi };
  if (comeProssima) S.data.prossima = set;
  else { S.data.settimana = set; E.assegnaTestInSettimana(); }
  S.save();
};

/* ---------- imprevisti ---------- */
E.swap = function (a, b) {
  const gg = S.data.settimana.giorni;
  if (!gg[a] || !gg[b]) return false;
  if (gg[a].tipo === 'partita' || gg[b].tipo === 'partita') return false;
  const campi = ['tipo', 'pioggia', 'test', 'testFatto', 'spunte', 'kickoff'];
  for (const c of campi) { const t = gg[a][c]; gg[a][c] = gg[b][c]; gg[b][c] = t; }
  S.save();
  return true;
};

E.oggiNonPosso = function (iso) {
  const gg = S.data.settimana.giorni;
  const g = gg[iso];
  const nomeOriginale = DB.SEDUTE[g.tipo].nome;
  const fine = U.sundayOf(S.data.settimana.inizio);
  let cursore = U.addDays(iso, 1);
  while (cursore <= fine) {
    const c = gg[cursore];
    /* mai riorganizzare oltre la partita: attivazione e recupero restano ai loro posti */
    if (c && c.tipo === 'partita') break;
    if (c && c.stato === 'da_fare' && E.PRIORITA[c.tipo] < E.PRIORITA[g.tipo]) {
      E.swap(iso, cursore);
      return { ok: true, msg: 'Fatto: oggi ' + DB.SEDUTE[gg[iso].tipo].nome + ', ' + nomeOriginale + ' spostata a ' + U.fmtData(cursore) + '.' };
    }
    cursore = U.addDays(cursore, 1);
  }
  g.stato = 'saltata';
  S.save();
  return { ok: true, msg: 'Nessun giorno adatto prima della partita: la seduta è segnata come saltata. Capita — si riparte dalla prossima.' };
};

E.setPioggia = function (iso, val) {
  const g = S.data.settimana.giorni[iso];
  if (g && (g.tipo === 'velocita' || g.tipo === 'resistenza')) { g.pioggia = !!val; S.save(); }
};

E.setSpunta = function (iso, slot, serie, val) {
  const g = S.data.settimana.giorni[iso];
  if (!g.spunte) g.spunte = {};
  if (!g.spunte[slot]) g.spunte[slot] = [];
  g.spunte[slot][serie] = !!val;
  S.save();
};

E.setFastidio = function (exId, val) {
  E.statoEx(exId).fastidio = !!val;
  S.save();
};

E.setKickoff = function (iso, hhmm) {
  const g = S.data.settimana.giorni[iso];
  if (g) { g.kickoff = hhmm || null; S.save(); }
};

/* ============================================================
   COMPLETAMENTO SEDUTA → progressione automatica
   ============================================================ */
E.completaSeduta = function (iso) {
  const set = S.data.settimana;
  const g = set.giorni[iso];
  const vm = E.risolviSeduta(iso);
  const oggi = U.todayISO();
  const migliorie = [];
  const dettagli = [];

  const serieComplete = (slotIdx, tot) => {
    const sp = (g.spunte && g.spunte[slotIdx]) || [];
    let n = 0;
    for (let i = 0; i < tot; i++) if (sp[i]) n++;
    return { fatte: n, complete: n >= tot };
  };

  if (vm.soloTest) {
    /* --- giornata test: il test sostituisce il lavoro, nessuna progressione di corsa --- */
    const tId = g.testFatto || g.test;
    dettagli.push({ nome: 'Giornata test: ' + (tId ? DB.TEST[tId].nome : 'test fisici'), schema: '', carico: null, complete: !!g.testFatto });
    if (!g.testFatto) migliorie.push({ nome: 'Test', testo: 'Test non salvato: verrà riproposto nel prossimo giorno utile.' });
  } else if (vm.blocchi) {
    /* --- seduta di corsa --- */
    const st = E.statoCorsa(vm.corsaId);
    const tot = vm.blocchi.length;
    let tutte = true;
    vm.blocchi.forEach((b, i) => { if (!serieComplete(i, b.serie || 1).complete) tutte = false; });
    dettagli.push({ nome: vm.corsaNome, schema: tot + ' blocchi', carico: null, complete: tutte });
    if (tutte) {
      if (st.consolidamento) {
        st.consolidamento = false;
        migliorie.push({ nome: vm.corsaNome, testo: 'Consolidamento fatto: dalla prossima si riparte a salire.' });
      } else {
        const livMax = E.livMaxCorsa(vm.progressioneCorsa.prog);
        if (st.livello < livMax) {
          st.livello++;
          const p = vm.progressioneCorsa.prog;
          if (p.tipo === 'ritmo') {
            const nuovo = E.valoreRitmo(p, st.livello);
            migliorie.push({ nome: vm.corsaNome, testo: p.crescente ? 'Distanza su: ' + nuovo + ' ' + p.unita : 'Ritmo giù: ' + U.fmtRitmo(nuovo) + ' ' + p.unita });
          } else {
            migliorie.push({ nome: vm.corsaNome, testo: p.cosa + ': ' + (p.base + p.step * st.livello) + ' (+1)' });
          }
          st.streak++;
          if (st.streak >= 3) { st.streak = 0; st.consolidamento = true; migliorie.push({ nome: vm.corsaNome, testo: 'Tre progressi di fila 💪 — la prossima è di consolidamento.' }); }
        } else {
          migliorie.push({ nome: vm.corsaNome, testo: 'Sei al massimo della progressione per questa fase.' });
        }
      }
    } else st.streak = 0;
    st.storia.push({ data: oggi, livello: st.livello });
  } else {
    /* --- seduta in garage --- */
    vm.esercizi.forEach((ex, i) => {
      const st = E.statoEx(ex.exId);
      const { complete, fatte } = serieComplete(i, ex.serie);
      dettagli.push({ nome: ex.nome, schema: ex.schemaLabel, carico: ex.carico, complete, fatte, serie: ex.serie, fastidio: st.fastidio });

      if (st.fastidio) {
        migliorie.push({ nome: ex.nome, testo: 'Progressione in pausa (fastidio segnalato). Guarisci prima, i numeri poi.' });
      } else if (!complete) {
        st.streak = 0;
      } else if (st.consolidamento) {
        st.consolidamento = false;
        migliorie.push({ nome: ex.nome, testo: 'Consolidamento fatto: dalla prossima si torna a salire.' });
      } else {
        const def = DB.ESERCIZI[ex.exId];
        let progredito = false;
        if (def.livelli) {
          if ((st.livello || 0) < def.livelli.length - 1) {
            st.livello = (st.livello || 0) + 1;
            migliorie.push({ nome: ex.nome, testo: 'Nuovo livello: ' + def.livelli[st.livello].label });
            progredito = true;
          }
        } else if (def.tipoCarico === 'band' || def.tipoCarico === 'corpo') {
          /* attivazione/recupero: nessuna progressione */
        } else {
          let prossimo = E.caricoValido(def.tipoCarico, st.carico + def.inc);
          if (def.cap != null && prossimo > def.cap) prossimo = st.carico; // tetto per-esercizio
          if (prossimo > st.carico) {
            migliorie.push({ nome: ex.nome, testo: U.fmtKg(st.carico) + ' → ' + U.fmtKg(prossimo) });
            st.carico = prossimo;
            progredito = true;
          } else if ((st.extraRep || 0) < 4) {
            st.extraRep = (st.extraRep || 0) + 1;
            const aTempo = def.schema && def.schema.reps === 1;
            migliorie.push({ nome: ex.nome, testo: aTempo ? 'Tetto attrezzatura raggiunto: +5" di tenuta a serie.' : 'Tetto attrezzatura raggiunto: +1 ripetizione per serie.' });
            progredito = true;
          }
        }
        if (progredito) {
          st.streak++;
          if (st.streak >= 3) { st.streak = 0; st.consolidamento = true; migliorie.push({ nome: ex.nome, testo: 'Tre aumenti di fila 💪 — la prossima è di mantenimento.' }); }
        }
      }
      if (ex.carico != null || DB.ESERCIZI[ex.exId].livelli) {
        st.storia.push({ data: oggi, carico: st.carico, livello: st.livello });
      }
    });
  }

  /* test rimasto non salvato: lo si toglie dal giorno, tornerà nel prossimo giorno utile */
  if (g.test) g.test = null;

  g.stato = 'fatta';
  g.risultato = migliorie;

  S.data.storico.unshift({
    data: iso, completata: oggi, tipo: vm.tipo,
    nome: vm.nome + (vm.pioggia ? ' 🌧' : ''), fase: vm.faseNome, dettagli,
  });

  /* avanzamento di fase: ogni 3 sedute di forza gambe (mai in costruzione) */
  if (vm.tipo === 'forza' && set.tipo !== 'costruzione') {
    S.data.fase.contatore++;
    if (S.data.fase.contatore >= DB.SEDUTE_PER_FASE) {
      S.data.fase.contatore = 0;
      const idx = DB.ORDINE_FASI.indexOf(S.data.fase.nome);
      S.data.fase.nome = DB.ORDINE_FASI[(idx + 1) % DB.ORDINE_FASI.length];
      if (S.data.fase.nome === 'ipertrofia') S.data.fase.cicli++;
      migliorie.push({ nome: 'FASE', testo: 'Cambio di fase! Da oggi sei in ' + DB.FASI[S.data.fase.nome].nome + ': ' + DB.FASI[S.data.fase.nome].descr });
    }
  }

  S.save();
  return migliorie;
};

E.segnaPartitaGiocata = function (iso) {
  const g = S.data.settimana.giorni[iso];
  g.stato = 'fatta';
  S.data.ultimaPartita = iso;
  S.data.storico.unshift({ data: iso, completata: U.todayISO(), tipo: 'partita', nome: 'Partita ⚽', fase: '', dettagli: [] });
  S.save();
};

/* ============================================================
   TEST FISICI — ogni ~42 giorni (il primo ciclo dopo 7)
   ============================================================ */
E.aggiornaTest = function () {
  const t = S.data.test;
  if (!t.cicloInizio) t.cicloInizio = S.data.creato;
  const maiFatti = Object.keys(t.risultati).length === 0;
  const intervallo = maiFatti ? DB.TEST_PRIMO : DB.TEST_INTERVALLO;
  if (t.pendenti.length === 0 && U.diffDays(t.cicloInizio, U.todayISO()) >= intervallo) {
    t.pendenti = ['brevi', 'cooper', 'yoyo'];
    S.save();
  }
};

E.ultimoTest = function (testId) {
  const r = S.data.test.risultati[testId];
  return r && r.length ? r[r.length - 1] : null;
};

/* assegna i test pendenti ai giorni giusti della settimana corrente */
E.assegnaTestInSettimana = function () {
  const set = S.data.settimana;
  if (!set) return;
  const t = S.data.test;
  if (!t.pendenti.length) return;
  const oggi = U.todayISO();
  const giorniOrdinati = Object.keys(set.giorni).sort();

  const giaAssegnato = id => giorniOrdinati.some(iso => set.giorni[iso].test === id && set.giorni[iso].stato === 'da_fare');

  for (const iso of giorniOrdinati) {
    const g = set.giorni[iso];
    if (g.stato !== 'da_fare' || iso < oggi || g.test) continue;
    if (t.pendenti.includes('brevi') && g.tipo === 'velocita' && !giaAssegnato('brevi')) { g.test = 'brevi'; continue; }
    if (t.pendenti.includes('cooper') && g.tipo === 'resistenza' && !giaAssegnato('cooper') && !giaAssegnato('yoyo')) { g.test = 'cooper'; continue; }
    if (t.pendenti.includes('yoyo') && g.tipo === 'resistenza' && !giaAssegnato('cooper') && !giaAssegnato('yoyo')) {
      const cooper = E.ultimoTest('cooper');
      /* lo Yo-Yo aspetta che il Cooper sia fatto da almeno 10 giorni (non si falsino a vicenda) */
      if (!t.pendenti.includes('cooper') && cooper && U.diffDays(cooper.data, iso) >= DB.TEST_DISTANZA_MASSIMALI) {
        g.test = 'yoyo';
      }
    }
  }
  S.save();
};

E.registraTest = function (iso, testId, valori) {
  const t = S.data.test;
  if (!t.pendenti.includes(testId)) return; /* già registrato: niente doppioni da schede vecchie */
  if (!t.risultati[testId]) t.risultati[testId] = [];
  t.risultati[testId].push({ data: iso, valori });
  t.pendenti = t.pendenti.filter(x => x !== testId);
  if (t.pendenti.length === 0) t.cicloInizio = U.todayISO();
  const g = S.data.settimana && S.data.settimana.giorni[iso];
  if (g) { g.test = null; g.testFatto = testId; }
  S.save();
};

E.asimmetria = function (sx, dx) {
  if (!sx || !dx) return null;
  const mx = Math.max(sx, dx);
  return Math.round(Math.abs(sx - dx) / mx * 1000) / 10;
};

/* ---------- dati per i grafici ---------- */
E.serieCarico = function (exId) {
  const st = S.data.esercizi[exId];
  if (!st || !st.storia.length) return [];
  return st.storia.filter(p => p.carico != null).map(p => ({ x: p.data, y: p.carico }));
};
E.serieTest = function (testId, campoId) {
  const r = S.data.test.risultati[testId] || [];
  return r.map(e => ({ x: e.data, y: e.valori[campoId] })).filter(p => p.y != null);
};
