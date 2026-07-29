'use strict';
/* ============================================================
   DATI — database statico: esercizi, sedute, fasi, corsa,
   riscaldamenti, stretching, six pack, test, nutrizione.
   Tutto tarato sull'attrezzatura reale:
   - bilanciere 6 kg + dischi (2×10, 6×5, 4×2, 8×1) → max 72 kg, sempre pari
   - bilanciere EZ 6 kg
   - 2 manubri max 8 kg l'uno
   - kettlebell 12 e 4 kg
   - gilet zavorrato: 20 inserti da 1,2 kg → max 24 kg
   - power tower (trazioni, dip, alzate ginocchia), panca regolabile,
     landmine artigianale, ab roller, glute band, foam roller, cyclette (res. 1-8)
   - gym ball (fitball): leg curl femorali, stir the pot, core
   - strada: scaletta, paracadute, coni, panchine di marmo
   - salite brevi: una dolce da ~25 m a piedi (sprint), una ripida da ~40 m in macchina (balzi e ripetute)
   ============================================================ */
const DB = {};

DB.BUILD = '1.11.0';

/* durata tipica delle sedute in minuti (per il calcolo del carico RPE×minuti) */
DB.DURATE = { forza: 60, alta: 60, velocita: 50, resistenza: 45, attivazione: 25, recupero: 30 };

DB.CAPS = { bilanciere: 72, gilet: 24, manubrio: 8 };
DB.PESO_BILANCIERE = 6;          // sia classico che EZ
DB.PIASTRE_LATO = [10, 5, 5, 5, 2, 2, 1, 1, 1, 1]; // dischi disponibili per lato (metà dotazione)
DB.PIASTRE_TOTALI = [10, 10, 5, 5, 5, 5, 5, 5, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1]; // tutti i dischi (landmine: un lato solo)
DB.INSERTO_GILET = 1.2;

/* ---------- FASI (macrociclo) ----------
   Comandano schema/esecuzione delle grandi alzate, il core e la corsa.
   Avanzano ogni 3 sedute di forza gambe completate.               */
DB.FASI = {
  ipertrofia: {
    nome: 'Ipertrofia', colore: '#38bdf8', icona: '🧱',
    descr: 'Costruisci muscolo: schema base, esecuzione controllata.',
    schemaBig: { serie: 4, reps: 8, label: '4×8' },
    moltiplicatore: 1.0,
    recuperoBig: 90,
    esecuzioneBig: 'Esecuzione controllata: 2 secondi in discesa, 1 in salita.',
  },
  forza: {
    nome: 'Forza', colore: '#f59e0b', icona: '⚙️',
    descr: 'Più carico, meno ripetizioni: 5×4 con recuperi lunghi.',
    schemaBig: { serie: 5, reps: 4, label: '5×4' },
    moltiplicatore: 1.1,
    recuperoBig: 180,
    esecuzioneBig: 'Discesa controllata, salita decisa. Tecnica prima di tutto.',
  },
  potenza: {
    nome: 'Potenza', colore: '#ef4444', icona: '🚀',
    descr: 'Carico ridotto, massima velocità: 5×3 esplosive.',
    schemaBig: { serie: 5, reps: 3, label: '5×3' },
    moltiplicatore: 0.8,
    recuperoBig: 150,
    esecuzioneBig: 'ESPLOSIVO: spingi alla massima velocità possibile, ferma la serie se rallenti.',
  },
};
DB.ORDINE_FASI = ['ipertrofia', 'forza', 'potenza'];
DB.SEDUTE_PER_FASE = 3; // sedute di forza gambe per avanzare di fase

/* ---------- ROTAZIONI settimanali (cambiano ogni lunedì) ---------- */
DB.ROTAZIONI = {
  panca:      ['panca_piana', 'panca_inclinata'],
  rematore:   ['rematore_piedi', 'rematore_appoggio'],
  spalle:     ['military_press', 'landmine_press'],
  braccia:    ['curl_ez', 'french_press'],
  unilaterale:['bulgaro', 'step_up'],
  adduttori:  ['copenhagen', 'landmine_rotation'],
  femorali:   ['nordic_curl', 'gymball_leg_curl'],
  kettlebell: ['kb_swing', 'kb_stacco_monogamba'],
  core_base:  ['ab_roller', 'alzate_ginocchia'],
  core_forza: ['plank_zavorrato', 'gymball_stir'],
  trazioni:   ['trazioni_prona', 'trazioni_supina', 'trazioni_neutra'],
};

/* ---------- ESERCIZI ----------
   tipoCarico: 'bilanciere' | 'gilet' | 'manubrio' | 'corpo' (a livelli) | 'band'
   big: true → schema e carico comandati dalla fase
   landmine: true → bilanciere nell'angolo, si carica UNA sola estremità
   start: carico di partenza (volutamente basso)
   inc: incremento a progressione, cap: tetto per-esercizio            */
DB.ESERCIZI = {
  /* ===== FORZA GAMBE (garage) ===== */
  squat: {
    nome: 'Squat con bilanciere', tipoCarico: 'bilanciere', big: true,
    start: 20, inc: 2, cap: 72, recupero: 90,
    esecuzione: [
      'Bilanciere sui trapezi (non sul collo), piedi larghezza spalle, punte leggermente in fuori.',
      'Petto alto e core stretto: inspira e scendi spingendo indietro le anche.',
      'Scendi finché le cosce sono almeno parallele al pavimento, ginocchia in linea con le punte.',
      'Risali spingendo il pavimento con tutto il piede, espira in alto.',
      'La schiena resta neutra per tutto il movimento: se si arrotonda, riduci il carico.',
    ],
  },
  stacco_rumeno: {
    nome: 'Stacco rumeno', tipoCarico: 'bilanciere', big: true,
    start: 20, inc: 2, cap: 72, recupero: 90,
    esecuzione: [
      'Bilanciere davanti alle cosce, presa poco più larga delle spalle, ginocchia appena piegate.',
      'Spingi le anche indietro facendo scivolare il bilanciere lungo le gambe.',
      'Scendi finché senti tirare i femorali (circa metà tibia), schiena sempre neutra.',
      'Risali contraendo glutei e femorali, spingendo le anche in avanti.',
      'Il bilanciere resta sempre a contatto con le gambe.',
    ],
  },
  hip_thrust: {
    nome: 'Hip thrust su panca', tipoCarico: 'bilanciere', big: true,
    start: 20, inc: 2, cap: 72, recupero: 90,
    esecuzione: [
      'Schiena appoggiata al bordo della panca (sotto le scapole), bilanciere sulle anche (usa un asciugamano come cuscino).',
      'Piedi a terra larghezza anche, talloni vicini ai glutei.',
      'Spingi con i talloni e porta le anche in alto fino alla linea spalle-ginocchia.',
      'In alto stringi forte i glutei per 1 secondo, mento verso il petto.',
      'Scendi controllato senza appoggiare del tutto i glutei a terra.',
    ],
  },
  bulgaro: {
    nome: 'Affondo bulgaro', tipoCarico: 'gilet', rotazione: 'unilaterale',
    start: 0, inc: 1.2, cap: 24, recupero: 75,
    schema: { serie: 3, reps: 8, label: '3×8 per gamba' },
    esecuzione: [
      'Collo del piede posteriore appoggiato sulla panca, piede avanti a circa un passo.',
      'Scendi in verticale piegando il ginocchio davanti, busto leggermente inclinato avanti.',
      'Il ginocchio davanti resta in linea con la punta del piede.',
      'Risali spingendo con il tallone della gamba avanti.',
      'Completa tutte le ripetizioni con una gamba, poi cambia.',
    ],
  },
  step_up: {
    nome: 'Step-up su panca', tipoCarico: 'gilet', rotazione: 'unilaterale',
    start: 0, inc: 1.2, cap: 24, recupero: 75,
    schema: { serie: 3, reps: 10, label: '3×10 per gamba' },
    esecuzione: [
      'Un piede intero sopra la panca, l\'altro a terra.',
      'Sali spingendo SOLO con la gamba sopra la panca, senza slancio con quella sotto.',
      'In alto estendi completamente l\'anca, resta un attimo in equilibrio.',
      'Scendi lentamente controllando la discesa.',
      'Tutte le ripetizioni con una gamba, poi cambia.',
    ],
  },
  copenhagen: {
    nome: 'Copenhagen plank', tipoCarico: 'corpo', rotazione: 'adduttori',
    recupero: 60,
    livelli: [
      { label: '3×15" per lato — ginocchio sulla panca', schema: { serie: 3, reps: 1, label: '3×15" per lato' } },
      { label: '3×25" per lato — ginocchio sulla panca', schema: { serie: 3, reps: 1, label: '3×25" per lato' } },
      { label: '3×15" per lato — piede sulla panca', schema: { serie: 3, reps: 1, label: '3×15" per lato' } },
      { label: '3×25" per lato — piede sulla panca', schema: { serie: 3, reps: 1, label: '3×25" per lato' } },
      { label: '3×35" per lato — piede sulla panca', schema: { serie: 3, reps: 1, label: '3×35" per lato' } },
      { label: '3×45" per lato — piede sulla panca', schema: { serie: 3, reps: 1, label: '3×45" per lato' } },
      { label: '3×30" per lato — piede sulla panca, gamba sotto che si alza e scende', schema: { serie: 3, reps: 1, label: '3×30" dinamico' } },
    ],
    esecuzione: [
      'Sdraiato su un fianco, gamba superiore appoggiata sulla panca (ginocchio o piede a seconda del livello).',
      'Avambraccio a terra sotto la spalla, solleva il bacino: il corpo forma una linea retta.',
      'Tieni la posizione contraendo l\'interno coscia della gamba appoggiata.',
      'Fondamentale per un terzino: protegge gli adduttori dagli infortuni.',
    ],
  },
  landmine_rotation: {
    nome: 'Landmine rotation', tipoCarico: 'bilanciere', landmine: true, rotazione: 'adduttori',
    start: 6, inc: 1, cap: 26, recupero: 60,
    schema: { serie: 3, reps: 8, label: '3×8 per lato' },
    esecuzione: [
      'Bilanciere incastrato nell\'angolo (landmine), impugna l\'estremità con entrambe le mani, braccia tese.',
      'Piedi larghi, ginocchia morbide, bilanciere davanti al petto.',
      'Ruota il busto portando il bilanciere in arco verso un fianco, ruotando anche il piede.',
      'Torna al centro controllando, poi ruota dall\'altro lato.',
      'Le braccia restano tese: la rotazione parte dal core, non dalle spalle.',
    ],
  },
  nordic_curl: {
    nome: 'Nordic curl (eccentrico)', tipoCarico: 'corpo', rotazione: 'femorali',
    recupero: 90,
    livelli: [
      { label: '3×4 solo discesa, più lenta che puoi', schema: { serie: 3, reps: 4, label: '3×4 negativi' } },
      { label: '3×5 solo discesa', schema: { serie: 3, reps: 5, label: '3×5 negativi' } },
      { label: '3×6 solo discesa', schema: { serie: 3, reps: 6, label: '3×6 negativi' } },
      { label: '3×8 solo discesa', schema: { serie: 3, reps: 8, label: '3×8 negativi' } },
      { label: '3×5 discesa lenta + risalita aiutandoti con le mani', schema: { serie: 3, reps: 5, label: '3×5 con risalita' } },
      { label: '3×8 discesa lenta + risalita con le mani', schema: { serie: 3, reps: 8, label: '3×8 con risalita' } },
    ],
    esecuzione: [
      'In ginocchio su un tappetino, caviglie bloccate sotto la base della power tower (o falle tenere a qualcuno).',
      'Corpo in linea retta dalle ginocchia alla testa, mani pronte davanti al petto.',
      'Scendi in avanti PIÙ LENTAMENTE CHE PUOI, frenando con i femorali.',
      'Quando non tieni più, attutisci con le mani a terra come in un piegamento.',
      'Torna su aiutandoti con una spinta delle braccia e riparti.',
    ],
  },
  kb_swing: {
    nome: 'Kettlebell swing', tipoCarico: 'corpo', rotazione: 'kettlebell',
    recupero: 75,
    livelli: [
      { label: '3×10 con il kettlebell da 12 kg', schema: { serie: 3, reps: 10, label: '3×10 @ 12 kg' } },
      { label: '3×12 @ 12 kg', schema: { serie: 3, reps: 12, label: '3×12 @ 12 kg' } },
      { label: '3×15 @ 12 kg', schema: { serie: 3, reps: 15, label: '3×15 @ 12 kg' } },
      { label: '4×12 @ 12 kg', schema: { serie: 4, reps: 12, label: '4×12 @ 12 kg' } },
      { label: '4×15 @ 12 kg', schema: { serie: 4, reps: 15, label: '4×15 @ 12 kg' } },
      { label: '5×15 @ 12 kg', schema: { serie: 5, reps: 15, label: '5×15 @ 12 kg' } },
    ],
    esecuzione: [
      'Kettlebell a terra davanti a te, piedi poco più larghi delle spalle.',
      'Anche indietro (come lo stacco rumeno), afferra il kettlebell e falla oscillare tra le gambe.',
      'Spara le anche in avanti con forza: è quella spinta che fa volare il kettlebell all\'altezza del petto.',
      'Le braccia sono solo corde: non tirano, accompagnano.',
      'In alto: corpo in linea, glutei strettissimi. Poi lascia tornare il kettlebell tra le gambe e riparti.',
    ],
  },
  kb_stacco_monogamba: {
    nome: 'Stacco a una gamba con kettlebell', tipoCarico: 'corpo', rotazione: 'kettlebell',
    recupero: 60,
    livelli: [
      { label: '3×8 per gamba con il kettlebell da 4 kg', schema: { serie: 3, reps: 8, label: '3×8 @ 4 kg' } },
      { label: '3×10 per gamba @ 4 kg', schema: { serie: 3, reps: 10, label: '3×10 @ 4 kg' } },
      { label: '3×6 per gamba @ 12 kg', schema: { serie: 3, reps: 6, label: '3×6 @ 12 kg' } },
      { label: '3×8 per gamba @ 12 kg', schema: { serie: 3, reps: 8, label: '3×8 @ 12 kg' } },
      { label: '3×10 per gamba @ 12 kg', schema: { serie: 3, reps: 10, label: '3×10 @ 12 kg' } },
      { label: '3×10 per gamba @ 12 kg con discesa lenta di 3"', schema: { serie: 3, reps: 10, label: '3×10 lento @ 12 kg' } },
    ],
    esecuzione: [
      'In piedi su una gamba, kettlebell nella mano opposta alla gamba d\'appoggio.',
      'Ginocchio d\'appoggio morbido: inclinati in avanti spingendo l\'anca indietro.',
      'La gamba libera si distende dietro di te, in linea col busto: corpo a "T".',
      'Scendi finché senti tirare il femorale, poi risali stringendo il gluteo.',
      'Bacino sempre parallelo al pavimento: l\'anca della gamba libera non si apre.',
    ],
  },
  polpacci: {
    nome: 'Calf raise con bilanciere', tipoCarico: 'bilanciere',
    start: 20, inc: 2, cap: 72, recupero: 60,
    schema: { serie: 3, reps: 12, label: '3×12' },
    esecuzione: [
      'Bilanciere sulle spalle come nello squat, piedi larghezza anche.',
      'Sali sulle punte più in alto che puoi, fermati 1 secondo.',
      'Scendi lentamente (2-3 secondi) fino a terra.',
      'Per più escursione, avampiedi su un disco da 10 con i talloni nel vuoto.',
    ],
  },

  /* ===== PARTE ALTA E CORE (garage) ===== */
  panca_piana: {
    nome: 'Panca piana', tipoCarico: 'bilanciere', big: true, rotazione: 'panca',
    start: 20, inc: 2, cap: 72, recupero: 90,
    esecuzione: [
      'Sdraiato sulla panca piana, piedi ben piantati a terra, scapole strette sotto di te.',
      'Presa poco più larga delle spalle, bilanciere sopra il petto.',
      'Scendi controllato fino a sfiorare il petto all\'altezza dei capezzoli.',
      'Spingi verso l\'alto e leggermente indietro, gomiti a circa 45° dal busto.',
      'Senza rack di sicurezza: resta sempre a un carico che gestisci con margine.',
    ],
  },
  panca_inclinata: {
    nome: 'Panca inclinata', tipoCarico: 'bilanciere', big: true, rotazione: 'panca',
    start: 16, inc: 2, cap: 72, recupero: 90,
    esecuzione: [
      'Panca inclinata a 30-45°, piedi a terra, scapole strette.',
      'Il bilanciere scende verso la parte alta del petto, appena sotto le clavicole.',
      'Gomiti a 45° rispetto al busto, polsi dritti.',
      'Spingi verso l\'alto sulla verticale delle spalle.',
      'Carico più basso rispetto alla piana: è normale.',
    ],
  },
  trazioni_prona: {
    nome: 'Trazioni presa prona', tipoCarico: 'gilet', rotazione: 'trazioni',
    start: 0, inc: 1.2, cap: 24, recupero: 90,
    schema: { serie: 4, reps: 6, label: '4×6' },
    esecuzione: [
      'Alla power tower, presa prona (palmi in avanti) poco più larga delle spalle.',
      'Parti da braccia distese, attiva le scapole (spingile in basso) prima di tirare.',
      'Tira portando il petto verso la sbarra, gomiti verso il basso.',
      'Mento sopra la sbarra, poi scendi controllato fino a braccia distese.',
      'Se non arrivi a 6: aiutati con un piede su una sedia solo nelle ultime ripetizioni.',
    ],
  },
  trazioni_supina: {
    nome: 'Trazioni presa supina', tipoCarico: 'gilet', rotazione: 'trazioni',
    start: 0, inc: 1.2, cap: 24, recupero: 90,
    schema: { serie: 4, reps: 6, label: '4×6' },
    esecuzione: [
      'Presa supina (palmi verso di te), larghezza spalle o poco meno.',
      'Parti da braccia distese, spalle attive.',
      'Tira con dorso e bicipiti fino a superare la sbarra con il mento.',
      'Discesa lenta e completa: è metà dell\'esercizio.',
    ],
  },
  trazioni_neutra: {
    nome: 'Trazioni presa neutra', tipoCarico: 'gilet', rotazione: 'trazioni',
    start: 0, inc: 1.2, cap: 24, recupero: 90,
    schema: { serie: 4, reps: 6, label: '4×6' },
    esecuzione: [
      'Usa le maniglie parallele della power tower (palmi uno verso l\'altro).',
      'È la presa più naturale per le spalle: sfruttala per lavorare pulito.',
      'Tira il petto verso le maniglie, gomiti stretti al corpo.',
      'Scendi controllato fino a braccia completamente distese.',
    ],
  },
  dip: {
    nome: 'Dip alle parallele', tipoCarico: 'gilet',
    start: 0, inc: 1.2, cap: 24, recupero: 90,
    schema: { serie: 3, reps: 8, label: '3×8' },
    esecuzione: [
      'Alle parallele della power tower, braccia distese, spalle basse (lontane dalle orecchie).',
      'Scendi piegando i gomiti fino a circa 90°, busto leggermente inclinato avanti.',
      'Spingi verso l\'alto fino a braccia distese, senza sbloccare le spalle.',
      'Se senti fastidio alle spalle, riduci la profondità della discesa.',
    ],
  },
  rematore_piedi: {
    nome: 'Rematore in piedi con bilanciere', tipoCarico: 'bilanciere', rotazione: 'rematore',
    start: 20, inc: 2, cap: 72, recupero: 90,
    schema: { serie: 4, reps: 8, label: '4×8' },
    esecuzione: [
      'In piedi, busto inclinato avanti a circa 45°, ginocchia morbide, schiena neutra.',
      'Bilanciere a braccia distese sotto le spalle, presa prona.',
      'Tira il bilanciere verso l\'ombelico portando i gomiti indietro.',
      'Stringi le scapole in alto, poi scendi controllato.',
      'Il busto resta fermo: se ondeggi, il carico è troppo.',
    ],
  },
  rematore_appoggio: {
    nome: 'Rematore con manubrio in appoggio', tipoCarico: 'manubrio', rotazione: 'rematore',
    start: 6, inc: 1, cap: 8, recupero: 75,
    schema: { serie: 4, reps: 10, label: '4×10 per lato' },
    esecuzione: [
      'Ginocchio e mano sinistri appoggiati sulla panca, piede destro a terra, schiena parallela al pavimento.',
      'Manubrio nella mano destra, braccio disteso.',
      'Tira il manubrio verso il fianco, gomito che sale verso il soffitto.',
      'Scendi lento e completo. Poi cambia lato.',
      'Al tetto degli 8 kg la progressione passa alle ripetizioni.',
    ],
  },
  military_press: {
    nome: 'Military press', tipoCarico: 'bilanciere', rotazione: 'spalle',
    start: 10, inc: 2, cap: 72, recupero: 90,
    schema: { serie: 4, reps: 8, label: '4×8' },
    esecuzione: [
      'In piedi, bilanciere appoggiato sulle clavicole, presa poco più larga delle spalle.',
      'Core e glutei stretti: niente inarcamento della schiena.',
      'Spingi il bilanciere sopra la testa, spostando leggermente il capo indietro al passaggio.',
      'In alto il bilanciere è sulla verticale delle orecchie, braccia distese.',
      'Scendi controllato fino alle clavicole.',
    ],
  },
  landmine_press: {
    nome: 'Landmine press', tipoCarico: 'bilanciere', landmine: true, rotazione: 'spalle',
    start: 10, inc: 1, cap: 32, recupero: 75,
    schema: { serie: 4, reps: 8, label: '4×8 per lato' },
    esecuzione: [
      'Bilanciere nell\'angolo landmine, estremità impugnata con una mano all\'altezza della spalla.',
      'In piedi o in mezzo inginocchio (più stabile), core stretto.',
      'Spingi in avanti-alto seguendo l\'inclinazione del bilanciere.',
      'Braccio disteso in alto, poi torna controllato alla spalla.',
      'Più amico delle spalle rispetto alla spinta verticale pura.',
    ],
  },
  curl_ez: {
    nome: 'Curl con bilanciere EZ', tipoCarico: 'bilanciere', rotazione: 'braccia',
    start: 10, inc: 2, cap: 72, recupero: 60,
    schema: { serie: 3, reps: 10, label: '3×10' },
    esecuzione: [
      'In piedi, presa sulle impugnature angolate dell\'EZ, gomiti attaccati ai fianchi.',
      'Porta il bilanciere verso le spalle piegando SOLO i gomiti.',
      'Niente slancio con la schiena: se ondeggi, riduci il carico.',
      'Scendi lentamente fino a braccia distese.',
    ],
  },
  french_press: {
    nome: 'French press con EZ', tipoCarico: 'bilanciere', rotazione: 'braccia',
    start: 10, inc: 2, cap: 72, recupero: 60,
    schema: { serie: 3, reps: 10, label: '3×10' },
    esecuzione: [
      'Sdraiato sulla panca piana, bilanciere EZ sopra la fronte, braccia verticali.',
      'Piega solo i gomiti portando il bilanciere verso la fronte.',
      'I gomiti restano fermi e paralleli: non si aprono.',
      'Distendi le braccia contraendo i tricipiti.',
    ],
  },

  /* ----- core: cambia con la fase ----- */
  ab_roller: {
    nome: 'Ab roller', tipoCarico: 'corpo', rotazione: 'core_base',
    recupero: 60,
    livelli: [
      { label: '3×6 in ginocchio, rollata corta', schema: { serie: 3, reps: 6, label: '3×6' } },
      { label: '3×8 in ginocchio', schema: { serie: 3, reps: 8, label: '3×8' } },
      { label: '3×10 in ginocchio', schema: { serie: 3, reps: 10, label: '3×10' } },
      { label: '3×12 in ginocchio, rollata completa', schema: { serie: 3, reps: 12, label: '3×12' } },
      { label: '3×6 rollata lenta (3" andata, 3" ritorno)', schema: { serie: 3, reps: 6, label: '3×6 lente' } },
      { label: '3×10 rollata lenta con pausa di 2" in fondo', schema: { serie: 3, reps: 10, label: '3×10 con pausa' } },
      { label: '3×5 in piedi contro il muro (il muro ti ferma)', schema: { serie: 3, reps: 5, label: '3×5 in piedi' } },
      { label: '3×8 in piedi contro il muro', schema: { serie: 3, reps: 8, label: '3×8 in piedi' } },
    ],
    esecuzione: [
      'In ginocchio, mani sulle impugnature del roller, spalle sopra le mani.',
      'Contrai gli addominali e rotola in avanti mantenendo la schiena neutra.',
      'Fermati PRIMA che la schiena si inarchi: quello è il tuo limite di oggi.',
      'Torna indietro tirando con gli addominali, non con le braccia.',
    ],
  },
  alzate_ginocchia: {
    nome: 'Alzate di ginocchia in sospensione', tipoCarico: 'corpo', rotazione: 'core_base',
    recupero: 60,
    livelli: [
      { label: '3×8 ginocchia al petto', schema: { serie: 3, reps: 8, label: '3×8' } },
      { label: '3×10 ginocchia al petto', schema: { serie: 3, reps: 10, label: '3×10' } },
      { label: '3×12 ginocchia al petto', schema: { serie: 3, reps: 12, label: '3×12' } },
      { label: '3×8 gambe tese a squadra', schema: { serie: 3, reps: 8, label: '3×8 tese' } },
      { label: '3×10 gambe tese a squadra', schema: { serie: 3, reps: 10, label: '3×10 tese' } },
      { label: '3×12 gambe tese a squadra', schema: { serie: 3, reps: 12, label: '3×12 tese' } },
      { label: '3×6 toes-to-bar (punte dei piedi alla sbarra)', schema: { serie: 3, reps: 6, label: '3×6 T2B' } },
      { label: '3×10 toes-to-bar', schema: { serie: 3, reps: 10, label: '3×10 T2B' } },
    ],
    esecuzione: [
      'Appeso alla sbarra o sugli appoggi per gomiti della power tower.',
      'Porta le ginocchia al petto arrotondando leggermente la zona lombare a fine movimento.',
      'Scendi LENTO: niente oscillazioni, il corpo resta fermo.',
      'Se oscilli, fermati un attimo tra una ripetizione e l\'altra.',
    ],
  },
  gymball_leg_curl: {
    nome: 'Leg curl con gym ball', tipoCarico: 'corpo', rotazione: 'femorali',
    recupero: 75,
    livelli: [
      { label: '3×8 a due gambe', schema: { serie: 3, reps: 8, label: '3×8' } },
      { label: '3×10 a due gambe', schema: { serie: 3, reps: 10, label: '3×10' } },
      { label: '3×12 a due gambe', schema: { serie: 3, reps: 12, label: '3×12' } },
      { label: '3×6 a una gamba', schema: { serie: 3, reps: 6, label: '3×6 monogamba' } },
      { label: '3×8 a una gamba', schema: { serie: 3, reps: 8, label: '3×8 monogamba' } },
      { label: '3×10 a una gamba', schema: { serie: 3, reps: 10, label: '3×10 monogamba' } },
    ],
    esecuzione: [
      'Sdraiato a pancia in su, talloni e polpacci sopra la gym ball, braccia a terra larghe per l\'equilibrio.',
      'Alza il bacino: corpo in linea retta dalle spalle ai piedi (ponte). Questa è la posizione di partenza.',
      'Piega le ginocchia e porta la palla verso i glutei, SENZA far scendere il bacino.',
      'Distendi le gambe riportando la palla lontano, sempre col bacino alto.',
      'Nella versione a una gamba, l\'altra resta sollevata a mezz\'aria.',
    ],
  },
  gymball_stir: {
    nome: 'Stir the pot su gym ball', tipoCarico: 'corpo', rotazione: 'core_forza',
    recupero: 60,
    livelli: [
      { label: '3×6 cerchi per senso, piccoli', schema: { serie: 3, reps: 6, label: '3×6 per senso' } },
      { label: '3×8 cerchi per senso', schema: { serie: 3, reps: 8, label: '3×8 per senso' } },
      { label: '3×10 cerchi per senso', schema: { serie: 3, reps: 10, label: '3×10 per senso' } },
      { label: '3×8 cerchi larghi per senso', schema: { serie: 3, reps: 8, label: '3×8 larghi' } },
      { label: '3×10 cerchi larghi per senso', schema: { serie: 3, reps: 10, label: '3×10 larghi' } },
    ],
    esecuzione: [
      'Avambracci appoggiati sulla gym ball, piedi a terra larghezza anche, corpo in plank.',
      'Disegna cerchi con i gomiti, come per "mescolare la pentola".',
      'Il corpo resta IMMOBILE: si muovono solo le braccia, il bacino non ondeggia.',
      'Fai i cerchi in un senso, poi nell\'altro: quello è una ripetizione.',
      'Cerchi più larghi = esercizio più duro.',
    ],
  },
  plank_zavorrato: {
    nome: 'Plank con gilet zavorrato', tipoCarico: 'gilet', rotazione: 'core_forza',
    start: 0, inc: 1.2, cap: 24, recupero: 60,
    schema: { serie: 3, reps: 1, label: '3×40 secondi' },
    esecuzione: [
      'Indossa il gilet, avambracci a terra, gomiti sotto le spalle.',
      'Corpo in linea retta: glutei contratti, ombelico verso la colonna.',
      'Respira normalmente, non trattenere il fiato.',
      'Se il bacino scende o la schiena si inarca, la serie è finita.',
    ],
  },
  hollow_rock: {
    nome: 'Hollow rock', tipoCarico: 'corpo',
    recupero: 60,
    livelli: [
      { label: '3×15" hollow hold (posizione statica)', schema: { serie: 3, reps: 1, label: '3×15"' } },
      { label: '3×25" hollow hold', schema: { serie: 3, reps: 1, label: '3×25"' } },
      { label: '3×10 hollow rock (dondolii)', schema: { serie: 3, reps: 10, label: '3×10' } },
      { label: '3×15 hollow rock', schema: { serie: 3, reps: 15, label: '3×15' } },
      { label: '3×20 hollow rock', schema: { serie: 3, reps: 20, label: '3×20' } },
      { label: '3×25 hollow rock', schema: { serie: 3, reps: 25, label: '3×25' } },
      { label: '3×15 hollow rock con disco da 2 kg tra le mani', schema: { serie: 3, reps: 15, label: '3×15 +2 kg' } },
    ],
    esecuzione: [
      'Sdraiato a pancia in su, braccia oltre la testa, gambe tese sollevate.',
      'Zona lombare SEMPRE incollata al pavimento: è la regola numero uno.',
      'Nella versione rock, dondola avanti-indietro mantenendo la forma a banana.',
      'Se la lombare si stacca, alza di più gambe e braccia.',
    ],
  },

  /* ===== ATTIVAZIONE (giorno pre-partita, garage) ===== */
  monster_walk: {
    nome: 'Monster walk con banda', tipoCarico: 'band', recupero: 45,
    schema: { serie: 3, reps: 10, label: '3×10 passi per direzione' },
    esecuzione: [
      'Glute band sopra le ginocchia (o alle caviglie per più intensità).',
      'Mezzo squat, schiena dritta, mani avanti.',
      'Cammina lateralmente a piccoli passi mantenendo tensione sulla banda.',
      '10 passi a destra, 10 a sinistra: i glutei devono bruciare leggermente.',
    ],
  },
  pallof_press: {
    nome: 'Pallof press con banda', tipoCarico: 'band', recupero: 45,
    schema: { serie: 2, reps: 8, label: '2×8 per lato' },
    esecuzione: [
      'Banda ancorata alla power tower all\'altezza del petto, tu di fianco.',
      'Impugna la banda con due mani al petto, fai un passo per metterla in tensione.',
      'Distendi le braccia in avanti resistendo alla rotazione.',
      'Tieni 2 secondi, torna al petto. Il busto non deve ruotare mai.',
    ],
  },
  squat_esplosivi: {
    nome: 'Squat esplosivi a corpo libero', tipoCarico: 'corpo', recupero: 60,
    schema: { serie: 3, reps: 5, label: '3×5' },
    esecuzione: [
      'Squat a corpo libero: scendi controllato fino al parallelo.',
      'Risali alla MASSIMA velocità, come per saltare (ma i piedi restano a terra).',
      'Fermati un secondo tra una ripetizione e l\'altra: ogni rep è esplosiva.',
      'Serve a “svegliare” il sistema nervoso, non ad affaticare.',
    ],
  },
  affondi_dinamici: {
    nome: 'Affondi dinamici alternati', tipoCarico: 'corpo', recupero: 45,
    schema: { serie: 2, reps: 8, label: '2×8 per gamba' },
    esecuzione: [
      'In piedi, fai un passo avanti deciso e scendi in affondo.',
      'Il ginocchio dietro sfiora il pavimento, quello davanti sopra la caviglia.',
      'Spingi con la gamba avanti per tornare in piedi, alterna le gambe.',
      'Movimento fluido e ritmico, busto sempre verticale.',
    ],
  },
  balzi_bassi: {
    nome: 'Balzi bassi sul posto', tipoCarico: 'corpo', recupero: 60,
    schema: { serie: 3, reps: 6, label: '3×6' },
    esecuzione: [
      'Piedi larghezza anche, piccolo contromovimento e balzo verticale basso (20-30 cm).',
      'Atterra morbido sull\'avampiede e rimbalza subito: contatto a terra minimo.',
      'Caviglie e polpacci reattivi come molle.',
      'Bassa fatica, alta qualità: è attivazione, non allenamento.',
    ],
  },

  /* ===== RECUPERO (garage) ===== */
  cyclette_recupero: {
    nome: 'Cyclette rigenerante', tipoCarico: 'corpo', recupero: 0,
    schema: { serie: 1, reps: 1, label: '20 minuti, resistenza 2-3' },
    esecuzione: [
      'Pedala 20 minuti a resistenza 2-3, ritmo tranquillo.',
      'Devi riuscire a parlare senza affanno per tutto il tempo.',
      'Serve a far circolare il sangue nelle gambe e smaltire la partita.',
    ],
  },
  foam_roller_seq: {
    nome: 'Foam roller completo', tipoCarico: 'corpo', recupero: 0,
    schema: { serie: 1, reps: 1, label: '10 minuti' },
    esecuzione: [
      'Rulla lentamente ogni zona per 60-90 secondi: polpacci, femorali, quadricipiti, adduttori, glutei, dorso.',
      'Quando trovi un punto dolente, fermati sopra 20-30 secondi respirando.',
      'Evita di rullare direttamente la zona lombare e le articolazioni.',
    ],
  },
};

/* ---------- DETTAGLI ESERCIZI ----------
   Per ogni esercizio: A COSA SERVE in campo (perche) e gli
   ERRORI più comuni da evitare (errori). Mostrati in "Come si esegue". */
DB.DETTAGLI = {
  squat: {
    perche: 'La base di tutto: gambe forti per contrasti, scatti e salti. È l\'esercizio che alza il tetto di tutto il resto.',
    errori: 'Talloni che si staccano, ginocchia che crollano in dentro, schiena che si arrotonda in fondo.',
  },
  stacco_rumeno: {
    perche: 'Femorali e glutei forti = sprint più potente e meno stiramenti, l\'infortunio più comune del calciatore.',
    errori: 'Piegare troppo le ginocchia (diventa uno squat) o arrotondare la schiena per scendere di più.',
  },
  hip_thrust: {
    perche: 'I glutei sono il motore dello sprint: più spinta d\'anca = più accelerazione nei primi 10 metri.',
    errori: 'Spingere inarcando la lombare invece che coi glutei; testa buttata all\'indietro.',
  },
  bulgaro: {
    perche: 'Forza su una gamba sola, come in campo: ogni scatto, salto e contrasto parte da un appoggio singolo.',
    errori: 'Ginocchio davanti che balla o crolla in dentro; darsi la spinta con la gamba appoggiata dietro.',
  },
  step_up: {
    perche: 'Spinta monopodalica pura: replica la falcata e costruisce ginocchia solide.',
    errori: 'Darsi lo slancio con la gamba a terra: deve lavorare solo quella sopra la panca.',
  },
  copenhagen: {
    perche: 'Gli adduttori sono il punto debole del terzino (cross, contrasti, cambi di direzione): questo li blinda.',
    errori: 'Bacino che scende a metà serie: meglio fermarsi che tenere una posizione storta.',
  },
  landmine_rotation: {
    perche: 'Il core che ruota con forza: cross più potenti, tiri più forti, contrasti più solidi.',
    errori: 'Ruotare con le braccia che si piegano: il movimento parte dai fianchi, le braccia restano tese.',
  },
  nordic_curl: {
    perche: 'L\'esercizio anti-stiramento per eccellenza: negli studi dimezza gli infortuni ai femorali. Per chi sprinta è oro puro.',
    errori: 'Piegarsi sulle anche (il corpo deve restare in linea) e scendere veloci: tutta la magia è nella lentezza.',
  },
  gymball_leg_curl: {
    perche: 'Femorali che si allungano e si accorciano sotto controllo, come nella corsa: forza e prevenzione insieme, il complemento perfetto del nordic.',
    errori: 'Bacino che crolla mentre la palla si avvicina ai glutei; puntare le braccia per barare sull\'equilibrio.',
  },
  gymball_stir: {
    perche: 'Il plank che prende vita: il core impara a restare fermo mentre tutto si muove — esattamente ciò che serve nei contrasti e nei cambi di direzione.',
    errori: 'Fianchi che ondeggiano seguendo i cerchi; sedere che sale a capanna.',
  },
  kb_swing: {
    perche: 'Potenza pura della catena posteriore: l\'esplosione d\'anca che ti stacca dall\'avversario sul primo passo.',
    errori: 'Accosciarsi come in uno squat o tirare su il kettlebell con le braccia: è l\'anca che spara, non le spalle.',
  },
  kb_stacco_monogamba: {
    perche: 'Equilibrio e femorali su una gamba sola: prevenzione infortuni da manuale per un terzino.',
    errori: 'Anca della gamba libera che si apre verso l\'alto; schiena che si arrotonda.',
  },
  polpacci: {
    perche: 'Polpacci elastici = appoggi reattivi, caviglie protette e meno fatica nei finali di partita.',
    errori: 'Rimbalzare veloce senza controllo: la discesa lenta è metà del lavoro.',
  },
  panca_piana: {
    perche: 'Parte alta solida per reggere i duelli spalla a spalla e proteggere palla.',
    errori: 'Gomiti larghissimi a 90° (spalle a rischio) e bilanciere che rimbalza sul petto.',
  },
  panca_inclinata: {
    perche: 'Petto alto e spalle: l\'angolo di spinta più simile a quello dei contrasti in piedi.',
    errori: 'Inarcare la schiena per spingere di più; polsi piegati all\'indietro.',
  },
  trazioni_prona: {
    perche: 'Schiena forte = postura solida, equilibrio nei contrasti e spalle sane. La presa prona lavora di più il dorso largo.',
    errori: 'Mezze ripetizioni senza distendere le braccia; oscillare con le gambe per aiutarsi.',
  },
  trazioni_supina: {
    perche: 'Dorso più bicipiti: la variante che ti fa fare più ripetizioni e costruisce la trazione totale.',
    errori: 'Partire a scatti coi gomiti; scendere a peso morto senza controllo.',
  },
  trazioni_neutra: {
    perche: 'La presa più naturale per le spalle: trazione forte a rischio zero.',
    errori: 'Incassare la testa nelle spalle: parti sempre attivando le scapole.',
  },
  dip: {
    perche: 'Spinta totale di petto, spalle e tricipiti: la forza per schermare palla col corpo.',
    errori: 'Scendere oltre il controllo con le spalle che salgono verso le orecchie.',
  },
  rematore_piedi: {
    perche: 'Dorso e presa: bilancia tutte le spinte e tiene le spalle in salute per tutta la stagione.',
    errori: 'Ondeggiare col busto per tirare su il bilanciere: se succede, il carico è troppo.',
  },
  rematore_appoggio: {
    perche: 'Lavoro dorsale a un braccio, stabile e sicuro per la schiena: qualità senza compromessi.',
    errori: 'Ruotare il busto per portare più su il manubrio.',
  },
  military_press: {
    perche: 'Spalle forti per i duelli aerei e un corpo bilanciato sopra gambe potenti.',
    errori: 'Inarcare la lombare mentre spingi: glutei e pancia sempre strettissimi.',
  },
  landmine_press: {
    perche: 'Spinta sopra la testa più amica delle spalle, con lavoro anti-rotazione del core in omaggio.',
    errori: 'Spingere solo di braccio perdendo la linea spalla-anca.',
  },
  curl_ez: {
    perche: 'Bicipiti e avambracci: la presa e le braccia che servono per contrastare e tenere lontano l\'avversario.',
    errori: 'Dondolare la schiena per sollevare: i gomiti restano incollati ai fianchi.',
  },
  french_press: {
    perche: 'Tricipiti forti completano ogni spinta: panca, dip e braccio teso nei duelli.',
    errori: 'Gomiti che si aprono verso l\'esterno durante la discesa.',
  },
  ab_roller: {
    perche: 'Core anti-estensione: schiena blindata nei contrasti e forza che passa pulita tra gambe e busto.',
    errori: 'Lasciare che la lombare si inarchi in fondo alla rollata: fermati prima.',
  },
  alzate_ginocchia: {
    perche: 'Addome basso e flessori dell\'anca: i muscoli che alzano il ginocchio a ogni falcata di sprint.',
    errori: 'Dondolarsi a pendolo per prendere lo slancio.',
  },
  plank_zavorrato: {
    perche: 'Core che regge sotto carico: la stabilità che non ti fa piegare quando ti vengono addosso.',
    errori: 'Bacino che scende (o che sale a capanna) quando arriva la fatica.',
  },
  hollow_rock: {
    perche: 'Il core da atleta: la posizione che trasmette forza in sprint, salti e calci.',
    errori: 'Lombare che si stacca da terra: se succede, alza di più gambe e braccia.',
  },
  monster_walk: {
    perche: 'Accende i glutei prima della gara: anche protette e spinta laterale pronta.',
    errori: 'Passi troppo lunghi che fanno perdere la tensione della banda.',
  },
  pallof_press: {
    perche: 'Anti-rotazione: il core impara a restare solido quando ti strattonano la maglia.',
    errori: 'Lasciare che il busto ruoti verso l\'ancoraggio della banda.',
  },
  squat_esplosivi: {
    perche: 'Sveglia il sistema nervoso per domani: gambe reattive senza accumulare fatica.',
    errori: 'Farne troppi o troppo lenti: è attivazione, non allenamento.',
  },
  affondi_dinamici: {
    perche: 'Mobilità e attivazione insieme: anche pronte per allunghi e cambi di direzione.',
    errori: 'Busto che crolla in avanti; passo troppo corto.',
  },
  balzi_bassi: {
    perche: 'Caviglie reattive come molle: il primo contatto col terreno domani sarà già acceso.',
    errori: 'Atterrare di tallone o fare pause tra un balzo e l\'altro.',
  },
  cyclette_recupero: {
    perche: 'Gambe che girano senza impatti: il sangue circola e porta via la fatica della partita.',
    errori: 'Pedalare troppo forte: se non riesci a parlare, stai andando troppo.',
  },
  foam_roller_seq: {
    perche: 'Scioglie i muscoli induriti dalla partita e accelera il recupero per la settimana.',
    errori: 'Rullare veloce come una lima: serve lentezza, peso e respiro.',
  },
};

/* ---------- SEDUTE (slot per tipo) ----------
   Uno slot può essere: { ex: 'id' } esercizio fisso,
   { rot: 'gruppo' } gruppo a rotazione settimanale,
   { core: true } slot core che dipende dalla fase.        */
DB.SEDUTE = {
  forza: {
    nome: 'Forza gambe', icona: '🏋️', luogo: 'garage',
    slots: [
      { ex: 'squat' }, { ex: 'stacco_rumeno' }, { ex: 'hip_thrust' },
      { rot: 'unilaterale' }, { rot: 'adduttori' }, { rot: 'femorali' },
      { rot: 'kettlebell' }, { ex: 'polpacci' },
    ],
  },
  alta: {
    nome: 'Parte alta e core', icona: '💪', luogo: 'garage',
    slots: [
      { rot: 'panca' }, { rot: 'trazioni' }, { ex: 'dip' },
      { rot: 'rematore' }, { rot: 'spalle' }, { rot: 'braccia' },
      { core: true },
    ],
  },
  velocita:   { nome: 'Velocità', icona: '⚡', luogo: 'strada' },
  resistenza: { nome: 'Resistenza', icona: '🏃', luogo: 'strada' },
  attivazione: {
    nome: 'Attivazione pre-gara', icona: '🔥', luogo: 'garage',
    slots: [
      { ex: 'monster_walk' }, { ex: 'pallof_press' },
      { ex: 'affondi_dinamici' }, { ex: 'squat_esplosivi' }, { ex: 'balzi_bassi' },
    ],
  },
  recupero: {
    nome: 'Recupero', icona: '🌿', luogo: 'garage',
    slots: [{ ex: 'cyclette_recupero' }, { ex: 'foam_roller_seq' }],
  },
  partita: { nome: 'Partita', icona: '⚽', luogo: 'campo' },
};

/* core che cambia con la fase */
DB.CORE_PER_FASE = {
  ipertrofia: { rot: 'core_base' },
  forza: { rot: 'core_forza' },
  potenza: { ex: 'hollow_rock' },
};

/* ---------- CORSA ----------
   Lavori per fase. Ogni blocco ha le sue SERIE spuntabili (come i pesi):
   a ogni spunta parte da solo il recupero del blocco.
   Progressione: 'serie' = più ripetizioni; 'ritmo' = tempo target che scende.
   Il riscaldamento vive nel box Riscaldamento della seduta: qui solo lavoro. */
DB.CORSA = {
  velocita: {
    ipertrofia: {
      id: 'vel_base', nome: 'Velocità — base (costruisci il motore)',
      prog: { tipo: 'serie', base: 5, step: 1, max: 10, cosa: 'accelerazioni' },
      blocchi: liv => [
        { titolo: 'Scaletta agilità', serie: 2, dettaglio: 'Un giro dei 4 schemi a serie sulla scaletta (circa 5 m): skip, doppio appoggio, laterale, dentro-fuori', recupero: 45,
          come: [
            'Stendi la scaletta su un tratto piano e asciutto.',
            'Schema 1 — SKIP: un appoggio per riquadro, ginocchia alte, braccia che pompano.',
            'Schema 2 — DOPPIO APPOGGIO: due appoggi rapidi per riquadro (dx-sx), busto alto.',
            'Schema 3 — LATERALE: avanzi di fianco, due appoggi per riquadro, poi torna con l\'altro fianco.',
            'Schema 4 — DENTRO-FUORI: piedi dentro il riquadro poi fuori larghi, avanzando.',
            'Guarda avanti, non i piedi. Prima la precisione, poi la velocità.',
          ] },
        { titolo: 'Slalom tra i coni', serie: 4, dettaglio: '6 coni a zig-zag su 20 m: slalom a buona velocità con appoggi corti, ritorno camminando. I cambi di direzione sono il pane del terzino', recupero: 60,
          come: [
            'Sistema 6 coni in linea, uno ogni 3-4 metri (20 m totali), sfalsati di un metro a destra e a sinistra a zig-zag.',
            'Parti al 70-80%: curva stretta attorno a ogni cono, NON larga.',
            'Al cambio di direzione: passi corti e rapidi, baricentro basso, spingi col piede esterno.',
            'Il busto anticipa la direzione nuova, le braccia aiutano la sterzata.',
            'Torna camminando al via: la qualità di ogni slalom vale più della velocità media.',
          ] },
        { titolo: 'Accelerazioni progressive', serie: 5 + liv, dettaglio: '60 m l\'una: parti piano e arriva al 90% negli ultimi 20 m', recupero: 120,
          come: [
            'Misura 60 m: due coni distanti 75 passi normali (o usa i lampioni come riferimento).',
            'Primi 20 m: corsa facile, ampia e rilassata.',
            'Secondi 20 m: aumenta gradualmente spinta e frequenza.',
            'Ultimi 20 m: al 90%, spalle basse e viso rilassato (se digrigni i denti sei troppo teso).',
            'Non è uno sprint secco: è imparare ad accelerare con tecnica pulita.',
          ] },
        { titolo: 'Allunghi', serie: 3, dettaglio: '80 m al 75-80%, sciolti e ampi', recupero: 90,
          come: [
            'Circa 100 passi normali di distanza, su tratto piano.',
            'Corri "grande": falcata ampia, ginocchia che salgono, braccia sciolte.',
            'Il ritmo è controllato: devi sentirti elegante, non affaticato.',
          ] },
      ],
    },
    forza: {
      id: 'vel_forza', nome: 'Velocità — sprint massimali',
      prog: { tipo: 'serie', base: 5, step: 1, max: 10, cosa: 'sprint col paracadute' },
      blocchi: liv => [
        { titolo: 'Scaletta rapida', serie: 2, dettaglio: 'Un giro dei 3 schemi a serie sulla scaletta (circa 5 m), alla massima frequenza di appoggi', recupero: 45,
          come: [
            'Skip, doppio appoggio e laterale: stavolta alla MASSIMA frequenza di piedi.',
            'Contatti a terra brevissimi, come su carboni ardenti.',
            'Se sbagli un riquadro non fermarti: la fluidità conta più della precisione oggi.',
          ] },
        { titolo: 'Sprint con paracadute', serie: 5 + liv, dettaglio: '30 m al 100% con paracadute. La qualità vale più della quantità: recupero completo', recupero: 180,
          come: [
            'Allaccia la cintura del paracadute in vita, paracadute dietro di te a terra.',
            'Misura 30 m con due coni (circa 38 passi normali).',
            'Partenza in leggero affondo: spingi forte i primi 10 m con il busto inclinato avanti.',
            'Il paracadute si apre da solo e ti frena: tu continua a spingere al massimo fino al cono.',
            'Recupero COMPLETO (3\'): lo sprint massimale funziona solo se sei fresco. Se rallenti vistosamente, fermati.',
          ] },
        { titolo: 'Partenze varie', serie: 4, dettaglio: '20 m senza paracadute: partenza in piedi, seduto, prono, dopo giro su te stesso', recupero: 120,
          come: [
            'Togli il paracadute: ora sei "leggero" e veloce (è l\'effetto contrasto).',
            'Serie 1: partenza in piedi normale. Serie 2: da seduto a terra. Serie 3: sdraiato a pancia in giù. Serie 4: giro su te stesso e via.',
            'Simulano le partenze sporche della partita: reattività da qualsiasi posizione.',
          ] },
      ],
    },
    potenza: {
      id: 'vel_potenza', nome: 'Velocità — RSA (sprint ripetuti da gara)',
      prog: { tipo: 'serie', base: 6, step: 1, max: 10, cosa: 'sprint per blocco' },
      blocchi: liv => [
        { titolo: 'RSA — blocco 1', serie: 6 + liv, dettaglio: '40 m al massimo, poi torna camminando veloce: hai solo 20" tra gli sprint', recupero: 20,
          come: [
            'Due coni a 40 m (circa 50 passi normali).',
            'Sprint al massimo fino al cono, poi girati e torna camminando VELOCE verso il via.',
            'Spunta la serie e riparti quando la pillola suona: 20" passano subito, è voluto.',
            'È l\'allenamento più simile alla partita: sprint ripetuti con recupero incompleto.',
            'Obiettivo: che l\'ultimo sprint sia veloce quasi quanto il primo.',
          ] },
        { titolo: 'RSA — blocco 2', serie: 6 + liv, dettaglio: '40 m come il blocco 1, dopo 4\' di recupero completo', recupero: 20,
          come: [
            'Prima di iniziare: 4\' di recupero vero (cammina, bevi un sorso).',
            'Poi identico al blocco 1: stessi 40 m, stessi 20" tra gli sprint.',
          ] },
        { titolo: 'Navette con i coni', serie: 4, dettaglio: '10+20+10 m con cambi di senso sui coni', recupero: 90,
          come: [
            'Tre coni in linea: A (via), B a 10 m, C a 30 m da A.',
            'Sprint A→B, tocca terra vicino al cono, inverti e vai B→C (20 m), inverti, chiudi C→B (10 m).',
            'Nel cambio di senso: frena con passi corti, scendi col baricentro, riparti basso.',
            'Sono i cambi di direzione violenti dei recuperi difensivi.',
          ] },
      ],
    },
  },
  resistenza: {
    ipertrofia: {
      id: 'res_base', nome: 'Resistenza — ripetute tempo',
      prog: { tipo: 'ritmo', base: 115, step: -2, min: 85, unita: 'per 400 m' },
      blocchi: (liv, ritmo) => [
        { titolo: 'Ripetute 400 m', serie: 5, dettaglio: '400 m in ' + U.fmtRitmo(ritmo) + ' l\'uno: spunta a ogni ripetuta, il timer ti dà i 90" di recupero', recupero: 90,
          come: [
            'Misura i 400 m una volta sola col contachilometri del telefono (Google Maps o un\'app di corsa) e segnati i punti di inizio e fine: da lì in poi li riusi sempre.',
            'Parti col cronometro dell\'app (scheda TIMER) o del telefono: il tempo target è quello scritto sopra.',
            'Ritmo COSTANTE: non partire a razzo per poi morire. Sbagli di poco? Va bene: entro 3-4 secondi dal target.',
            'Spunta la ripetuta, il timer ti dà i 90": respira con le mani sopra la testa e riparti.',
            'Quando completi tutte le ripetute al ritmo giusto, la prossima volta il target scende di 2 secondi.',
          ] },
        { titolo: 'Defaticamento', serie: 1, dettaglio: '5\' di corsa blanda (circa 800-900 m) + camminata', recupero: 0,
          come: ['Corsa lentissima, quasi camminata: il cuore scende gradualmente e le gambe si sciolgono.'] },
      ],
    },
    forza: {
      id: 'res_forza', nome: 'Resistenza — fartlek (cambi di ritmo)',
      prog: { tipo: 'serie', base: 8, step: 1, max: 14, cosa: 'cambi di ritmo' },
      blocchi: liv => [
        { titolo: 'Fartlek', serie: 8 + liv, dettaglio: '30" forte al 85-90% (circa 130-150 m), poi 90" piano: spunta a ogni tratto forte', recupero: 90,
          come: [
            'Scegli un percorso dove puoi correre libero, senza incroci.',
            'Tratto FORTE: 30" all\'85-90% — un ritmo che potresti tenere per 2-3 minuti al massimo. Usa i lampioni o gli alberi come traguardi.',
            'Spunta la serie: il timer ti dà 90" di corsa PIANO (non camminare: trotto leggero).',
            'È il ritmo-partita: strappi e rifiati, strappi e rifiati.',
            'L\'ultimo tratto forte deve assomigliare al primo: se crolli, il ritmo dei tratti forti era troppo alto.',
          ] },
        { titolo: 'Defaticamento', serie: 1, dettaglio: '5\' blandi (circa 800-900 m) + camminata', recupero: 0,
          come: ['Trotto leggerissimo e camminata finale.'] },
      ],
    },
    potenza: {
      id: 'res_potenza', nome: 'Resistenza — intermittente 15-15',
      prog: { tipo: 'ritmo', base: 58, step: 2, max: 80, unita: 'm ogni 15"', crescente: true },
      blocchi: (liv, dist) => [
        { titolo: '15-15 — blocco 1', serie: 1, dettaglio: '8\' di: 15" di corsa coprendo ' + dist + ' m / 15" fermo o camminando. Usa i coni per misurare la distanza', recupero: 180,
          come: [
            'Metti due coni a ESATTAMENTE ' + dist + ' m (misura col contachilometri del telefono o contando i passi: un passo lungo ≈ 1 metro).',
            'Al via: 15" per arrivare al cono opposto. Poi 15" FERMO o camminando. Poi riparti verso l\'altro cono.',
            'Avanti così per 8 minuti: usa il timer dell\'app in modalità cronometro, o un audio 15-15 dal telefono.',
            'Arrivi al cono in anticipo? Bene. Non ci arrivi per 2-3 volte di fila? La distanza è troppa: accorcia di 2 m.',
            'Quando completi il blocco, la prossima volta la distanza sale di 2 m: stai correndo più veloce a parità di fatica.',
          ] },
        { titolo: '15-15 — blocco 2', serie: 1, dettaglio: '8\' sugli stessi ' + dist + ' m del blocco 1, dopo 3\' di recupero', recupero: 0,
          come: ['3\' di recupero camminando, poi identico al blocco 1: stessi coni, stesso ritmo.'] },
      ],
    },
  },
};

/* Versione SALITA 🏔 — si attiva col tasto sulla seduta di strada.
   Sono due salite BREVI, e fanno due lavori diversi:
   - velocità  → la dolce da ~25 m raggiungibile a piedi: accelerazione pura
   - resistenza → la ripida da ~40 m (in macchina): forza e ripetute che bruciano */
DB.CORSA_SALITA = {
  velocita: {
    id: 'vel_salita', nome: 'Velocità — sprint in salita 🏔',
    prog: { tipo: 'serie', base: 6, step: 1, max: 12, cosa: 'sprint in salita' },
    blocchi: liv => [
      { titolo: 'Progressivi in salita', serie: 2, dettaglio: '25 m al 70-80% per scaldare le caviglie e prendere le misure', recupero: 90,
        come: [
          'Non sono sprint: servono a entrare nel gesto e a sentire la pendenza.',
          'Busto inclinato avanti, ginocchia che salgono, passo corto e frequente.',
          'Torna giù camminando con calma (25 m in discesa).',
        ] },
      { titolo: 'Sprint in salita', serie: 6 + liv, dettaglio: '25 m al MASSIMO, partenza da fermo. Si torna giù sempre camminando', recupero: 120,
        come: [
          '25 metri sono 4-5 secondi: è esattamente l\'accelerazione che ti serve in campo.',
          'Partenza da fermo in leggero affondo, busto ben inclinato avanti.',
          'Primi appoggi corti e potenti, il piede atterra SOTTO di te: spingi indietro, non allungare avanti.',
          'La pendenza dolce è perfetta: in salita non riesci a "strappare" i femorali, per questo è lo sprint più sicuro che esista.',
          'Torna giù SEMPRE camminando: correre in discesa è l\'unico vero rischio di questo lavoro.',
          'Se rallenti vistosamente rispetto ai primi, chiudi lì: conta la qualità, non il numero.',
        ] },
      { titolo: 'Allunghi in piano', serie: 3, dettaglio: '80 m all\'80% sul piatto, sciolti e ampi', recupero: 90,
        come: [
          '80 m sono circa 100 passi normali: usa due riferimenti fissi sulla strada.',
          'È l\'effetto contrasto: dopo la salita ti senti leggero e la falcata torna lunga.',
          'Non sono sprint: devi sentirti elegante, non affaticato.',
        ] },
    ],
  },
  resistenza: {
    id: 'res_salita', nome: 'Resistenza — salita ripida 🏔',
    prog: { tipo: 'serie', base: 6, step: 1, max: 12, cosa: 'ripetute in salita ripida' },
    blocchi: liv => [
      { titolo: 'Progressivi in salita', serie: 2, dettaglio: '40 m al 70% per entrare nel gesto e scaldare', recupero: 90,
        come: [
          'Due salite tranquille per abituare caviglie e polpacci alla pendenza forte.',
          'Torna giù camminando.',
        ] },
      { titolo: 'Balzi in salita', serie: 4, dettaglio: '20 m di balzi ampi alternando le gambe (mezza salita)', recupero: 120,
        come: [
          'Non è corsa: sono balzi lunghi, un piede alla volta, come se volassi tra un appoggio e l\'altro.',
          'Braccia che accompagnano forte, atterri sull\'avampiede e riparti subito.',
          'Su 20 m ti verranno circa 10-14 balzi: contali, e cerca di farne SEMPRE MENO per coprire gli stessi metri.',
          'È il costruttore di potenza numero uno: la salita ripida ti obbliga a spingere.',
          'Torna giù camminando con calma: qui il recupero conta.',
        ] },
      { titolo: 'Ripetute in salita ripida', serie: 6 + liv, dettaglio: '40 m forte (85-90%), recupero corto: scendi camminando e riparti', recupero: 60,
        come: [
          '40 m su pendenza forte sono 8-10 secondi di spinta dura: sentirai bruciare, è previsto.',
          'Ritmo tosto ma COSTANTE: l\'ultima ripetuta deve somigliare alla prima.',
          'Il recupero è corto apposta (1 minuto, il tempo di scendere): è così che si allena la gamba che non molla al 90°.',
          'Braccia che spingono, passo corto e frequente, sguardo avanti — mai ai piedi.',
          'Se crolli a metà serie, la volta dopo parti più controllato: meglio 8 ripetute uguali che 4 forti e 4 morte.',
        ] },
      { titolo: 'Defaticamento in piano', serie: 1, dettaglio: '8 minuti di corsa blandissima sul piatto (circa 1,3-1,5 km) + camminata', recupero: 0,
        come: ['Corsa lentissima per sciogliere le gambe dopo tutto il lavoro in salita.'] },
    ],
  },
};

/* Versione pioggia 🌧 (garage): sostituisce la seduta di strada.
   Il riscaldamento da garage sta in DB.RISCALDAMENTI.pioggia. */
DB.CORSA_PIOGGIA = {
  velocita: {
    id: 'vel_pioggia', nome: 'Velocità — versione garage 🌧',
    prog: { tipo: 'serie', base: 10, step: 1, max: 16, cosa: 'sprint in cyclette' },
    blocchi: liv => [
      { titolo: 'Scaletta al coperto', serie: 2, dettaglio: 'Un giro dei 4 schemi a serie (l\'eccezione consentita: la scaletta entra in garage)', recupero: 45,
        come: [
          'Stendi la scaletta sul pavimento del garage, spazio libero attorno.',
          'Stessi 4 schemi della strada: skip, doppio appoggio, laterale, dentro-fuori.',
          'A piedi scalzi o con suole pulite: il pavimento non deve essere scivoloso.',
        ] },
      { titolo: 'Sprint in cyclette', serie: 10 + liv, dettaglio: '15" alla massima cadenza, resistenza 7-8, poi il timer ti dà i 45" pedalando piano', recupero: 45,
        come: [
          'Imposta la resistenza a 7 (o 8 se ti senti forte).',
          'Al via: 15" pedalando alla MASSIMA cadenza possibile, in piedi sui pedali se serve.',
          'Spunta la serie: il timer ti dà 45" — scendi a resistenza 2-3 e pedala piano.',
          'Rimetti la resistenza a 7 negli ultimi 5" di recupero, così riparti subito.',
        ] },
      { titolo: 'Skip alto sul posto', serie: 3, dettaglio: '20" alla massima frequenza', recupero: 60,
        come: [
          'Sul posto: ginocchia che salgono all\'altezza delle anche, alla massima frequenza.',
          'Braccia che pompano come in uno sprint vero, appoggi brevissimi sull\'avampiede.',
        ] },
    ],
  },
  resistenza: {
    id: 'res_pioggia', nome: 'Resistenza — versione garage 🌧',
    prog: { tipo: 'serie', base: 6, step: 1, max: 12, cosa: 'ripetute in cyclette' },
    blocchi: liv => [
      { titolo: 'Ripetute in cyclette', serie: 6 + liv, dettaglio: '1\' forte a resistenza 7: spunta a ogni ripetuta, il timer ti dà i 2\' piano a resistenza 3', recupero: 120,
        come: [
          'Resistenza 7: pedala 1 minuto a ritmo FORTE, gambe che bruciano ma cadenza costante.',
          'Spunta la serie: il timer ti dà 2\' — resistenza 3, pedalata leggera per recuperare.',
          'Il ritmo forte deve restare uguale dalla prima all\'ultima ripetuta.',
        ] },
      { titolo: 'Circuito corpo libero', serie: 2, dettaglio: 'Un giro a serie: 15 squat + 10 affondi per gamba + 30" plank, senza pausa dentro il giro', recupero: 90,
        come: [
          '15 squat a corpo libero profondi e controllati.',
          'Subito dopo: 10 affondi per gamba alternati sul posto.',
          'Subito dopo: 30" di plank sui gomiti.',
          'Fine del giro: spunta la serie e riposa i 90" del timer.',
        ] },
    ],
  },
};

/* ---------- PREP: riscaldamenti, mobilità, stretching ---------- */
DB.RISCALDAMENTI = {
  forza: {
    nome: 'Riscaldamento per forza gambe',
    voci: [
      'Cyclette 5\' a resistenza 3-4, ritmo medio',
      'Cerchi con le anche e con le caviglie: 10 per senso',
      'Goblet squat col kettlebell da 4 kg al petto: 2×10 lenti e profondi',
      'Monster walk con banda: 10 passi per direzione',
      'Affondi dinamici: 8 per gamba',
      'Serie di avvicinamento: prima serie di squat solo col bilanciere (6 kg)',
    ],
  },
  alta: {
    nome: 'Riscaldamento per parte alta e core',
    voci: [
      'Cyclette 3-4\' leggeri per alzare la temperatura',
      'Cerchi con le braccia: 10 avanti e 10 indietro',
      'Rotazioni del busto a braccia larghe: 10 per lato',
      'Piegamenti a terra: 2×8 lenti',
      'Sospensione passiva alla sbarra: 2×20"',
      'Prima serie di panca solo col bilanciere (6 kg)',
    ],
  },
  velocita: {
    nome: 'Riscaldamento per velocità (fondamentale: non tagliarlo mai)',
    voci: [
      'Corsa blanda 8\' aumentando piano il ritmo',
      'Mobilità dinamica: slanci gamba avanti-dietro e laterali, 10 per gamba',
      'Skip basso 2×20 m, skip alto 2×20 m, calciata 2×20 m',
      'Affondi camminati 10 per gamba',
      'Progressivi: 3×60 m aumentando fino all\'80%',
      'Solo dopo tutto questo si sprinta al 100%',
    ],
  },
  resistenza: {
    nome: 'Riscaldamento per resistenza',
    voci: [
      'Corsa facile 8-10\' aumentando piano il ritmo (È il riscaldamento del giorno: la seduta parte già calda)',
      'Mobilità dinamica di anche e caviglie: 10 movimenti per articolazione',
      'Skip basso e calciata: 2×15 m ciascuno',
      '2 allunghi da 60 m progressivi',
    ],
  },
  attivazione: {
    nome: 'Riscaldamento per attivazione',
    voci: [
      'Cyclette 5\' molto leggeri (resistenza 2-3)',
      'Mobilità dinamica generale: anche, caviglie, busto',
      'La seduta stessa è già leggera: il riscaldamento è solo per entrare in temperatura',
    ],
  },
  recupero: {
    nome: 'Prima del recupero',
    voci: [
      'Nessun riscaldamento necessario: la seduta è tutta a bassa intensità',
      'Inizia direttamente con la cyclette dolce',
    ],
  },
  pioggia: {
    nome: 'Riscaldamento giorno di pioggia (garage)',
    voci: [
      'Cyclette 8\' partendo da resistenza 3 e salendo a 5',
      'Mobilità dinamica di anche e caviglie: 10 movimenti per articolazione',
      'Skip basso sul posto: 2×20"',
      'Squat a corpo libero: 2×10',
    ],
  },
};

DB.MOBILITA = {
  nome: 'Mobilità posturale (per stare dritto)',
  descr: 'Blocco fisso, 10-12 minuti. Falla 3-4 volte a settimana, anche nei giorni di riposo.',
  voci: [
    'Foam roller sul dorso (zona toracica): 90" rullando lentamente',
    'Estensioni toraciche sul foam roller: 10, mani dietro la testa',
    'Cat-camel (gatto-cammello) a quattro zampe: 10 lente',
    'Apertura toracica a terra su un fianco (braccio che ruota): 8 per lato',
    'Allungamento flessori dell\'anca in mezzo inginocchio: 45" per lato',
    'Chin tuck (mento indietro, nuca alta): 10 tenendo 3" l\'uno',
    'Squat profondo mantenuto con talloni a terra: 60" respirando',
  ],
};

DB.STRETCHING = {
  forza: {
    nome: 'Stretching dopo forza gambe',
    voci: [
      'Quadricipiti in piedi (tallone al gluteo): 40" per gamba',
      'Femorali seduto (gamba tesa): 40" per gamba',
      'Glutei a terra (caviglia sul ginocchio): 40" per lato',
      'Adduttori a farfalla: 60"',
      'Polpacci al muro: 40" per gamba',
    ],
  },
  alta: {
    nome: 'Stretching dopo parte alta',
    voci: [
      'Petto sullo stipite della porta: 40" per lato',
      'Dorsali appeso mezzo passivo alla sbarra: 2×20"',
      'Tricipiti (gomito dietro la testa): 30" per lato',
      'Collo: inclinazioni dolci, 20" per lato',
      'Avambracci: estensione del polso, 20" per lato',
    ],
  },
  velocita: {
    nome: 'Stretching dopo velocità',
    voci: [
      'Femorali in piedi (gamba sul rialzo o sulla panchina): 40" per gamba',
      'Flessori dell\'anca in affondo: 40" per lato',
      'Polpacci al muro (gamba tesa e piegata): 30"+30" per gamba',
      'Adduttori in squat laterale: 30" per lato',
      'Piriforme sdraiato (ginocchio al petto opposto): 30" per lato',
    ],
  },
  resistenza: {
    nome: 'Stretching dopo resistenza',
    voci: [
      'Polpacci al muro: 40" per gamba',
      'Femorali seduto: 40" per gamba',
      'Quadricipiti in piedi: 30" per gamba',
      'Flessori dell\'anca: 30" per lato',
      'Fascia laterale (incrocia le gambe e inclinati): 30" per lato',
    ],
  },
  attivazione: {
    nome: 'Dopo l\'attivazione (leggero)',
    voci: [
      'Solo scioltezza dolce: 20" per gruppo muscolare, senza forzare',
      'Domani si gioca: niente allungamenti intensi oggi',
    ],
  },
  recupero: {
    nome: 'Stretching dolce da recupero',
    voci: [
      'Tutte le posizioni tenute 60", respirando profondamente',
      'Femorali, quadricipiti, polpacci, glutei, adduttori',
      'Posizione del bambino (child pose): 90" finale',
    ],
  },
};

/* ---------- SIX PACK — addominali d'acciaio ----------
   Scheda dedicata. 8 livelli: gli esercizi CAMBIANO a ogni livello
   e ogni livello ha due circuiti (A e B) che si alternano a ogni
   completamento, così non fai mai due volte di fila lo stesso lavoro.
   3 circuiti completati → sali di livello.                       */
DB.SIXPACK = {
  nome: 'Six Pack',
  descr: 'Circuito extra da fare 2-3 volte a settimana a fine seduta (mai prima di velocità o partita). Gli esercizi cambiano a ogni livello e i circuiti A/B si alternano da soli. Completa 3 circuiti per salire di livello.',
  completamentiPerLivello: 3,
  livelli: [
    {
      nome: 'Fondamenta', giri: 2,
      circuiti: [
        { label: 'A', voci: ['Crunch a terra × 15', 'Plank sui gomiti 30"', 'Side plank 20" per lato', 'Dead bug × 8 per lato (lombare sempre a terra)'] },
        { label: 'B', voci: ['Crunch inverso × 12', 'Plank sui gomiti 30"', 'Bird dog × 8 per lato (lento)', 'Hollow hold 10"'] },
      ],
    },
    {
      nome: 'Solido', giri: 3,
      circuiti: [
        { label: 'A', voci: ['Crunch a terra × 20', 'Plank sui gomiti 45"', 'Side plank 30" per lato', 'Mountain climber lento × 10 per gamba'] },
        { label: 'B', voci: ['Crunch sulla gym ball × 15 (schiena appoggiata sulla palla)', 'Plank con tocco spalla × 10 per lato', 'Russian twist × 12 per lato', 'Dead bug × 10 per lato'] },
      ],
    },
    {
      nome: 'Costante', giri: 3,
      circuiti: [
        { label: 'A', voci: ['Alzate di ginocchia alla power tower × 10', 'Plank 60"', 'Side plank con anca su e giù × 8 per lato', 'Hollow hold 20"'] },
        { label: 'B', voci: ['Ab roller in ginocchio × 8', 'V-up parziali × 10', 'Flutter kick 20" (lombare a terra)', 'Side plank 40" per lato'] },
      ],
    },
    {
      nome: 'Forte', giri: 3,
      circuiti: [
        { label: 'A', voci: ['Ab roller in ginocchio × 10', 'Plank con gilet (6 kg) 45"', 'Alzate di ginocchia × 12', 'Hollow rock × 12'] },
        { label: 'B', voci: ['Alzate gambe tese alla sbarra × 8', 'Side plank con gilet (6 kg) 20" per lato', 'Sit-up con disco da 5 kg al petto × 12', 'Mountain climber veloce × 15 per gamba'] },
      ],
    },
    {
      nome: 'Avanzato', giri: 4,
      circuiti: [
        { label: 'A', voci: ['Ab roller rollata completa × 12', 'Plank con gilet (12 kg) 45"', 'Alzate gambe tese × 10', 'Hollow rock × 15'] },
        { label: 'B', voci: ['Dragon flag negativo sulla panca × 5 (solo discesa, lenta)', 'V-up completi × 12', 'Russian twist con disco da 5 kg × 12 per lato', 'Plank con avambracci sulla gym ball 60"'] },
      ],
    },
    {
      nome: 'Acciaio', giri: 4,
      circuiti: [
        { label: 'A', voci: ['Dragon flag negativo × 8', 'Ab roller rollata completa × 15', 'Toes-to-bar × 8', 'Side plank con gilet (12 kg) 30" per lato'] },
        { label: 'B', voci: ['Alzate gambe tese lente (3" su, 3" giù) × 10', 'Plank con gilet (18 kg) 40"', 'Hollow rock con disco da 2 kg × 12', 'Windshield wiper a terra × 10 per lato'] },
      ],
    },
    {
      nome: 'Élite', giri: 4,
      circuiti: [
        { label: 'A', voci: ['Toes-to-bar × 10', 'Dragon flag (salita e discesa) × 5', 'Ab roller con pausa di 2" in fondo × 12', 'Hollow hold 40"'] },
        { label: 'B', voci: ['Windshield wiper appeso (ginocchia piegate) × 8 per lato', 'Plank con gilet (24 kg) 40"', 'V-up con disco da 2 kg × 12', 'Side plank con gamba che si alza × 10 per lato'] },
      ],
    },
    {
      nome: 'Titanio', giri: 5,
      circuiti: [
        { label: 'A', voci: ['Dragon flag completo × 8', 'Toes-to-bar × 12', 'Ab roller in piedi contro il muro × 6', 'Hollow rock × 20'] },
        { label: 'B', voci: ['Windshield wiper appeso (gambe più tese possibile) × 6 per lato', 'Plank con gilet (24 kg) 60"', 'Toes-to-bar lenti × 8', 'Side plank con gilet (12 kg) 40" per lato'] },
      ],
    },
  ],
};

/* ---------- TEST FISICI ----------
   Proposti ogni ~42 giorni. I test brevi entrano nel giorno velocità,
   Cooper e Yo-Yo nei giorni resistenza, ad almeno 10 giorni l'uno dall'altro. */
DB.TEST_INTERVALLO = 42;   // giorni tra un ciclo di test e l'altro
DB.TEST_PRIMO = 7;         // il primo ciclo (baseline) arriva dopo una settimana
DB.TEST_DISTANZA_MASSIMALI = 10; // giorni minimi tra Cooper e Yo-Yo

DB.TEST = {
  brevi: {
    nome: 'Test brevi (giorno velocità)', icona: '⏱️',
    dove: 'velocita',
    descr: 'Riscaldati come per una seduta di velocità completa. Misura sul tratto di strada piano, con i coni a segnare le distanze.',
    campi: [
      { id: 'sprint10', label: 'Sprint 10 m', unita: 's', migliora: 'giu', step: 0.01, hint: '2-3 prove, segna la migliore' },
      { id: 'sprint30', label: 'Sprint 30 m', unita: 's', migliora: 'giu', step: 0.01, hint: '2 prove con recupero completo' },
      { id: 'salto_lungo', label: 'Salto in lungo da fermo', unita: 'cm', migliora: 'su', step: 1, hint: 'piedi pari, misura al tallone' },
      { id: 'hop_sx', label: 'Salto monopodalico SINISTRO', unita: 'cm', migliora: 'su', step: 1, hint: 'parti e atterra sulla stessa gamba' },
      { id: 'hop_dx', label: 'Salto monopodalico DESTRO', unita: 'cm', migliora: 'su', step: 1, hint: 'parti e atterra sulla stessa gamba' },
    ],
  },
  cooper: {
    nome: 'Test di Cooper', icona: '🫁',
    dove: 'resistenza',
    descr: 'Corri per 12 minuti esatti coprendo più strada possibile. Usa un percorso misurato (o il contachilometri del telefono). Ritmo costante, non partire troppo forte.',
    campi: [
      { id: 'cooper_m', label: 'Distanza in 12 minuti', unita: 'm', migliora: 'su', step: 10, hint: 'obiettivo da calciatore: 2800+ m' },
    ],
  },
  yoyo: {
    nome: 'Yo-Yo intermittent (livello 1)', icona: '🔁',
    dove: 'resistenza',
    descr: 'Navette 2×20 m a velocità crescente con 10" di recupero attivo tra le navette. Segui un audio del test Yo-Yo IR1 dal telefono. Ti fermi quando non tieni più il ritmo per due volte.',
    campi: [
      { id: 'yoyo_m', label: 'Metri totali percorsi', unita: 'm', migliora: 'su', step: 40, hint: 'il tuo riferimento: 1200+ m è un buon livello' },
    ],
  },
};

/* ---------- NUTRIZIONE PRE-GARA ----------
   SOLO spuntini e acqua, con i grammi in base al peso.
   Colazione, pranzo e cena restano affare dell'atleta: l'app non ci mette bocca. */
DB.nutrizione = function (kickoffMin, peso) {
  const p = peso || 70;
  const orario = m => U.pad2(Math.floor(((m % 1440) + 1440) % 1440 / 60)) + ':' + U.pad2(((m % 1440) + 1440) % 1440 % 60);
  const fette = Math.max(3, Math.round(p / 14));
  return [
    {
      quando: orario(kickoffMin - 150), titolo: 'Spuntino',
      voci: [
        fette + ' fette biscottate con ' + Math.round(p * 0.3) + ' g di miele (o marmellata)',
        '1 banana media',
        'Acqua: 400 ml',
        'Da qui in poi: niente fibre, niente fritti, niente latticini interi',
      ],
    },
    {
      quando: orario(kickoffMin - 60), titolo: 'Spuntino leggero',
      voci: [
        '2 fette biscottate con ' + Math.round(p * 0.15) + ' g di miele, oppure mezza banana',
        'Acqua: 200 ml',
      ],
    },
    {
      quando: orario(kickoffMin - 45) + ' → ' + orario(kickoffMin - 20), titolo: 'Acqua a sorsi',
      voci: ['300-400 ml a piccoli sorsi, mai tutta insieme'],
    },
    {
      quando: orario(kickoffMin - 10), titolo: 'Ultimi sorsi',
      voci: ['150 ml di acqua', 'Se fa molto caldo: un pizzico di sale o mezzo bicchiere di sport drink'],
    },
  ];
};
