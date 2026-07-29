'use strict';
/* ============================================================
   MOTORE — progressione automatica, fasi, rotazioni,
   generazione della settimana, swap/pioggia/imprevisti, test.
   ============================================================ */
const E = {};

/* ---------- arrotondamenti legati all'attrezzatura ---------- */
E.caricoValido = function (tipoCarico, kg, landmine) {
  if (tipoCarico === 'bilanciere') {
    /* bilanciere normale: i dischi vanno in coppia → numeri pari.
       landmine: si carica UNA sola estremità → va bene qualsiasi kg intero. */
    const v = landmine ? Math.round(kg) : Math.round(kg / 2) * 2;
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

/* quali dischi mettere per fare `kg`, pescando dalla dotazione reale */
E.dischiPer = function (kg, inventario) {
  let resto = Math.round(kg * 10) / 10;
  const usati = [];
  for (const p of inventario) {
    if (p <= resto + 0.001) { usati.push(p); resto = Math.round((resto - p) * 10) / 10; }
    if (resto <= 0) break;
  }
  return usati;
};

/* Come si carica il bilanciere/gilet: restituisce le righe già pronte da leggere.
   { testo, dischi, etichetta, avviso }                                        */
E.dettaglioCarico = function (ex, kg) {
  const vuoto = { testo: '', dischi: null, etichetta: null, avviso: null };

  if (ex.tipoCarico === 'bilanciere') {
    const suiDischi = Math.round((kg - DB.PESO_BILANCIERE) * 10) / 10;
    if (ex.landmine) {
      /* landmine: bilanciere incastrato nell'angolo, si carica solo l'estremità che impugni */
      if (suiDischi <= 0) {
        return { testo: 'solo il bilanciere (6 kg)', dischi: null, etichetta: null,
                 avviso: 'landmine: si carica una sola estremità' };
      }
      return {
        testo: 'bilanciere 6 kg + ' + U.fmtKg(suiDischi) + ' di dischi',
        dischi: E.dischiPer(suiDischi, DB.PIASTRE_TOTALI).join(' + '),
        etichetta: 'tutti su UNA sola estremità',
        avviso: 'landmine: si carica una sola estremità',
      };
    }
    const perLato = Math.round(suiDischi / 2 * 10) / 10;
    if (perLato <= 0) return { testo: 'solo il bilanciere (6 kg)', dischi: null, etichetta: null, avviso: null };
    return {
      testo: 'bilanciere 6 kg + ' + U.fmtKg(perLato) + ' per lato',
      dischi: E.dischiPer(perLato, DB.PIASTRE_LATO).join(' + '),
      etichetta: 'su OGNI lato',
      avviso: null,
    };
  }

  if (ex.tipoCarico === 'gilet') {
    const ins = Math.round(kg / DB.INSERTO_GILET);
    if (ins <= 0) return { testo: 'a corpo libero (gilet non ancora necessario)', dischi: null, etichetta: null, avviso: null };
    return {
      testo: 'gilet zavorrato',
      dischi: ins + (ins === 1 ? ' inserto' : ' inserti') + ' da 1,2 kg',
      etichetta: 'da infilare nel gilet',
      avviso: null,
    };
  }

  if (ex.tipoCarico === 'manubrio') {
    return { testo: 'un manubrio da ' + U.fmtKg(kg), dischi: null, etichetta: null, avviso: null };
  }
  return vuoto;
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

/* ---------- prontezza (check mattutino) ---------- */
E.setProntezza = function (iso, punti) {
  const livello = punti >= 10 ? 'verde' : (punti >= 7 ? 'giallo' : 'rosso');
  S.data.prontezza[iso] = { punti, livello };
  S.save();
  return livello;
};
E.prontezzaDi = function (iso) { return S.data.prontezza[iso] || null; };

/* ---------- carico di allenamento (RPE × minuti) ---------- */
E.setRPE = function (dataIso, rpe) {
  const entry = S.data.storico.find(s => s.data === dataIso);
  if (entry) { entry.rpe = rpe; S.save(); }
};
E.caricoSeduta = function (s) {
  if (!s.rpe) return 0;
  /* 0 minuti = panchina: carico zero, non 90' fantasma */
  const minuti = s.tipo === 'partita' ? (s.minuti != null ? s.minuti : 90) : (DB.DURATE[s.tipo] || 45);
  return s.rpe * minuti;
};
E.caricoFinestra = function (finoIso, giorni) {
  let tot = 0;
  for (const s of S.data.storico) {
    const d = U.diffDays(s.data, finoIso);
    if (d >= 0 && d < giorni) tot += E.caricoSeduta(s);
  }
  return tot;
};
/* guardiano del carico: settimana corrente vs media delle ultime 4 */
E.allarmeCarico = function () {
  const oggi = U.todayISO();
  const acuto = E.caricoFinestra(oggi, 7);
  const cronico = E.caricoFinestra(oggi, 28) / 4;
  if (cronico < 400) return null; /* servono almeno un paio di settimane di dati */
  const rapporto = acuto / cronico;
  if (rapporto > 1.4) return { livello: 'alto', msg: '⚠ Stai caricando il ' + Math.round((rapporto - 1) * 100) + '% più della tua media mensile: rischio infortuni alto. Alleggerisci la settimana.' };
  if (rapporto > 1.25) return { livello: 'medio', msg: 'Carico in salita rapida (+' + Math.round((rapporto - 1) * 100) + '% sulla media): ascolta le sensazioni, niente strappi.' };
  return null;
};

/* ---------- pagella di una settimana ---------- */
E.pagella = function (set) {
  if (!set) return null;
  let fatte = 0, saltate = 0, tot = 0, partiteGiocate = 0;
  for (const iso of Object.keys(set.giorni)) {
    const g = set.giorni[iso];
    if (g.tipo === 'partita') { if (g.stato === 'fatta') partiteGiocate++; continue; }
    tot++;
    if (g.stato === 'fatta') fatte++;
    else if (g.stato === 'saltata') saltate++;
  }
  const fine = U.sundayOf(set.inizio);
  let carico = 0;
  for (const s of S.data.storico) {
    if (s.data >= set.inizio && s.data <= fine) carico += E.caricoSeduta(s);
  }
  return { inizio: set.inizio, tipo: set.tipo, fatte, saltate, tot, partiteGiocate, carico };
};

/* ---------- statistiche di costanza ---------- */
E.statistiche = function () {
  const oggi = U.todayISO();
  const sedute = S.data.storico.filter(s => s.tipo !== 'partita');
  const ultimi28 = sedute.filter(s => U.diffDays(s.data, oggi) >= 0 && U.diffDays(s.data, oggi) < 28).length;
  /* settimane consecutive con almeno 3 sedute (a ritroso dalla settimana scorsa) */
  let streak = 0;
  let lun = U.mondayOf(oggi);
  const inSettimana = l => sedute.filter(s => s.data >= l && s.data <= U.addDays(l, 6)).length;
  if (inSettimana(lun) >= 3) streak++;
  lun = U.addDays(lun, -7);
  while (inSettimana(lun) >= 3) { streak++; lun = U.addDays(lun, -7); }
  return { totali: sedute.length, ultimi28, streak };
};

/* ---------- fasi ---------- */
E.faseEffettiva = function () {
  const set = S.data.settimana;
  if (set && set.tipo === 'costruzione') return { chiave: 'ipertrofia', congelata: true };
  if (set && set.tipo === 'scarico') return { chiave: 'ipertrofia', congelata: true, scarico: true };
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

  let schema, carico = null, caricoBase = null, dettaglio = null, livelloLabel = null;
  if (ex.livelli) {
    const liv = Math.min(st.livello || 0, ex.livelli.length - 1);
    schema = ex.livelli[liv].schema;
    livelloLabel = ex.livelli[liv].label;
  } else if (ex.big) {
    schema = fase.schemaBig;
    caricoBase = st.carico;
    carico = E.caricoValido(ex.tipoCarico, st.carico * fase.moltiplicatore, ex.landmine);
    if (ex.cap != null && carico > ex.cap) carico = ex.cap;
    dettaglio = E.dettaglioCarico(ex, carico);
  } else {
    schema = ex.schema;
    if (ex.tipoCarico !== 'corpo' && ex.tipoCarico !== 'band') {
      carico = E.caricoValido(ex.tipoCarico, st.carico, ex.landmine);
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
    fase: eff.chiave,
    faseNome: eff.scarico ? 'Scarico' : (eff.congelata ? 'Base (costruzione)' : DB.FASI[eff.chiave].nome),
    faseColore: eff.scarico ? '#8b95a7' : DB.FASI[eff.chiave].colore,
    spunte: g.spunte || {}, risultato: g.risultato || null,
    kickoff: g.kickoff || null,
    esercizi: [], blocchi: null, corsaId: null, corsaNome: null, progressioneCorsa: null,
  };
  vm.scarico = !!eff.scarico;
  const pront = E.prontezzaDi(iso);
  vm.prontezza = pront ? pront.livello : null;

  if (g.tipo === 'partita') { vm.partita = true; vm.minuti = g.minuti || null; return vm; }

  if (g.tipo === 'velocita' || g.tipo === 'resistenza') {
    const lavoro = g.pioggia ? DB.CORSA_PIOGGIA[g.tipo]
      : (g.salita ? DB.CORSA_SALITA[g.tipo] : DB.CORSA[g.tipo][eff.chiave]);
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
    else if (g.salita) { vm.salita = true; vm.nome = meta.nome + ' 🏔'; }
    /* giornata test: il test SOSTITUISCE il lavoro normale (niente blocchi, niente progressione) */
    if (g.test || g.testFatto) { vm.soloTest = true; vm.blocchi = []; }
    return vm;
  }

  vm.esercizi = meta.slots.map(sl => E.risolviSlot(sl, iso, eff.chiave));

  /* scarico (−15%) e giornata gialla/rossa (−10%): carichi ridotti, progressione ferma */
  let riduzione = 1;
  if (vm.scarico) riduzione *= 0.85;
  if (vm.prontezza === 'giallo' || vm.prontezza === 'rosso') riduzione *= 0.9;
  if (riduzione < 1) {
    for (const e of vm.esercizi) {
      if (e.carico != null && e.carico > 0) {
        const def = DB.ESERCIZI[e.exId];
        e.carico = E.caricoValido(e.tipoCarico, e.carico * riduzione, def.landmine);
        if (def.cap != null && e.carico > def.cap) e.carico = def.cap;
        e.dettaglio = E.dettaglioCarico(def, e.carico);
      }
    }
  }
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
    S.data.riepilogo = E.pagella(set); /* la pagella per la scelta della prossima */
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
    /* Ogni seduta si prende il giorno che le sta meglio rispetto alla partita.
       Il riposo è ciò che avanza alla fine, mai il ripiego di un posto non trovato. */
    const distGara = iso => Math.min(...partite.map(p => Math.abs(U.diffDays(iso, p))));
    const daCollocare = partite.length >= 2
      ? ['alta', 'velocita', 'forza', 'resistenza']   /* settimana fitta: prima le cose sicure */
      : ['forza', 'velocita', 'resistenza', 'alta'];

    for (const t of daCollocare) {
      let scelto = null, migliorPunteggio = -Infinity;
      for (const iso of liberi()) {
        const d = distGara(iso);
        let punti;
        if (t === 'forza') {
          punti = 50 + d * 10;                        /* il più lontano possibile dalla gara */
        } else if (t === 'velocita') {
          const primaDellaGara = partite.some(p => U.diffDays(iso, p) > 0);
          punti = 60 - Math.abs(d - 2) * 5 + (primaDellaGara ? 5 : 0);  /* ideale: 2 giorni prima */
        } else if (t === 'resistenza') {
          punti = 40 + d * 3;
        } else {
          punti = 30 + (d <= 1 ? 5 : 0);              /* parte alta: sta bene ovunque, anche vicino */
        }
        if (t !== 'alta' && d < 2) punti -= 1000;     /* gambe mai attaccate alla partita */
        /* garage e strada si alternano: niente due giorni di strada di fila */
        if (DB.SEDUTE[t].luogo === 'strada') {
          for (const vicino of [U.addDays(iso, -1), U.addDays(iso, 1)]) {
            const a = assegna[vicino];
            if (a && DB.SEDUTE[a].luogo === 'strada') punti -= 8;
          }
        }
        if (punti > migliorPunteggio) { migliorPunteggio = punti; scelto = iso; }
      }
      /* se resta solo un giorno attaccato alla gara, quella seduta si salta */
      if (scelto && migliorPunteggio > 0) assegna[scelto] = t;
    }
    /* quel che avanza è riposo vero: di norma uno solo */
    for (const iso of liberi()) assegna[iso] = 'recupero';
  }

  const giorni = {};
  for (const iso of giorniISO) {
    giorni[iso] = {
      tipo: assegna[iso] || 'recupero',
      stato: iso < oggi ? 'passato' : 'da_fare',
      pioggia: false, salita: false, test: null, spunte: {}, risultato: null, kickoff: null,
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
  if (tipo === 'scarico') S.data.ultimoScarico = lun;
  if (comeProssima) S.data.prossima = set;
  else { S.data.settimana = set; E.assegnaTestInSettimana(); }
  S.save();
};

/* ---------- imprevisti ---------- */
E.swap = function (a, b) {
  const gg = S.data.settimana.giorni;
  if (!gg[a] || !gg[b]) return false;
  if (gg[a].tipo === 'partita' || gg[b].tipo === 'partita') return false;
  const campi = ['tipo', 'pioggia', 'salita', 'test', 'testFatto', 'spunte', 'kickoff'];
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
  if (g && (g.tipo === 'velocita' || g.tipo === 'resistenza')) {
    g.pioggia = !!val;
    if (val) g.salita = false;   /* se piove, la salita salta */
    S.save();
  }
};

/* 🏔 salita: corta e a piedi nei giorni di velocità, lunga (in macchina) nei giorni di resistenza */
E.setSalita = function (iso, val) {
  const g = S.data.settimana.giorni[iso];
  if (g && (g.tipo === 'velocita' || g.tipo === 'resistenza')) {
    g.salita = !!val;
    if (val) g.pioggia = false;
    S.save();
  }
};

/* promemoria: la salita lunga rende se la fai ogni 2-3 settimane, non di più */
E.consigliaSalitaLunga = function (iso) {
  const g = S.data.settimana && S.data.settimana.giorni[iso];
  if (!g || g.tipo !== 'resistenza' || g.stato !== 'da_fare' || g.salita || g.pioggia) return false;
  const ultima = S.data.ultimaSalitaLunga;
  if (!ultima) return S.data.storico.length >= 6;   /* non alle primissime sedute */
  return U.diffDays(ultima, iso) >= 18;
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

  /* giornata gialla/rossa o settimana di scarico: si mantiene, non si progredisce */
  const mantenere = vm.scarico || vm.prontezza === 'giallo' || vm.prontezza === 'rosso';
  if (mantenere && g.tipo !== 'recupero' && g.tipo !== 'attivazione') {
    migliorie.push({
      nome: vm.scarico ? 'SCARICO' : 'PRONTEZZA',
      testo: vm.scarico
        ? 'Settimana di scarico: seduta registrata senza aumenti. Stai ricaricando le batterie, è lavoro anche questo.'
        : 'Giornata ' + vm.prontezza + ': carichi ridotti e nessun aumento oggi. Allenarsi ascoltandosi è da professionisti.',
    });
  }

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
    if (tutte && mantenere) {
      /* giornata gialla o scarico: la seduta vale, la progressione aspetta */
    } else if (tutte) {
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
      } else if (mantenere) {
        /* giornata gialla o scarico: nessun aumento oggi */
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
          let prossimo = E.caricoValido(def.tipoCarico, st.carico + def.inc, def.landmine);
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
  /* salita lunga fatta: riparte il conto per il promemoria */
  if (vm.corsaId === 'res_salita') S.data.ultimaSalitaLunga = iso;

  g.stato = 'fatta';
  g.risultato = migliorie;

  S.data.storico.unshift({
    data: iso, completata: oggi, tipo: vm.tipo,
    nome: vm.nome, fase: vm.faseNome, dettagli,   /* il nome porta già 🌧 o 🏔 */
  });

  /* avanzamento di fase: ogni 3 sedute di forza gambe piene
     (mai in costruzione, scarico o giornate gialle) */
  if (vm.tipo === 'forza' && set.tipo !== 'costruzione' && !mantenere) {
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

E.segnaPartitaGiocata = function (iso, minuti, rpe) {
  const g = S.data.settimana.giorni[iso];
  g.stato = 'fatta';
  g.minuti = minuti != null ? minuti : null;   /* 0 (panchina) è un valore valido */
  S.data.ultimaPartita = iso;
  S.data.storico.unshift({
    data: iso, completata: U.todayISO(), tipo: 'partita',
    nome: 'Partita ⚽' + (minuti != null ? ' — ' + minuti + '\'' : ''),
    fase: '', dettagli: [], minuti: minuti != null ? minuti : null, rpe: rpe || null,
  });
  S.save();
};

/* consiglio per il giorno dopo la partita, in base a minuti e durezza */
E.consiglioPostPartita = function () {
  const p = S.data.storico.find(s => s.tipo === 'partita');
  if (!p || U.diffDays(p.data, U.todayISO()) !== 1 || p.minuti == null) return null;
  if (p.minuti === 0) {
    return 'Ieri non sei entrato: gambe fresche. Se te la senti, oggi puoi trasformare il recupero in una seduta vera (usa 🔀 sposta).';
  }
  if (p.minuti >= 75 && (p.rpe || 0) >= 7) {
    return 'Ieri ' + p.minuti + '\' tosti (fatica ' + p.rpe + '/10): recupero extra oggi — aggiungi 10\' di cyclette dolce e il giro completo di foam roller.';
  }
  if (p.minuti <= 30) {
    return 'Ieri hai giocato solo ' + p.minuti + '\': gambe fresche. Se te la senti, oggi puoi trasformare il recupero in una seduta vera (usa 🔀 sposta).';
  }
  return null;
};

/* ---------- scarico: consigliato ogni ~4 settimane o dopo giorni no ---------- */
E.serveScarico = function () {
  const oggi = U.todayISO();
  const riferimento = S.data.ultimoScarico || S.data.creato;
  if (U.diffDays(riferimento, oggi) >= 28) return true;
  /* oppure: 3+ check gialli/rossi negli ultimi 7 giorni */
  let no = 0;
  for (const [iso, p] of Object.entries(S.data.prontezza)) {
    if (U.diffDays(iso, oggi) >= 0 && U.diffDays(iso, oggi) < 7 && p.livello !== 'verde') no++;
  }
  return no >= 3;
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
