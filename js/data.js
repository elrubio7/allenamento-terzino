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
   - strada: scaletta, paracadute, coni, panchine di marmo
   ============================================================ */
const DB = {};

DB.BUILD = '1.1.1';

DB.CAPS = { bilanciere: 72, gilet: 24, manubrio: 8 };
DB.PESO_BILANCIERE = 6;          // sia classico che EZ
DB.PIASTRE_LATO = [10, 5, 5, 5, 2, 2, 1, 1, 1, 1]; // dischi disponibili per lato
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
  core_base:  ['ab_roller', 'alzate_ginocchia'],
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
    start: 6, inc: 2, cap: 26, recupero: 60,
    schema: { serie: 3, reps: 8, label: '3×8 per lato' },
    esecuzione: [
      'Bilanciere incastrato nell\'angolo (landmine), impugna l\'estremità con entrambe le mani, braccia tese.',
      'Piedi larghi, ginocchia morbide, bilanciere davanti al petto.',
      'Ruota il busto portando il bilanciere in arco verso un fianco, ruotando anche il piede.',
      'Torna al centro controllando, poi ruota dall\'altro lato.',
      'Le braccia restano tese: la rotazione parte dal core, non dalle spalle.',
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
    start: 10, inc: 2, cap: 32, recupero: 75,
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
  plank_zavorrato: {
    nome: 'Plank con gilet zavorrato', tipoCarico: 'gilet',
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

/* ---------- SEDUTE (slot per tipo) ----------
   Uno slot può essere: { ex: 'id' } esercizio fisso,
   { rot: 'gruppo' } gruppo a rotazione settimanale,
   { core: true } slot core che dipende dalla fase.        */
DB.SEDUTE = {
  forza: {
    nome: 'Forza gambe', icona: '🏋️', luogo: 'garage',
    slots: [
      { ex: 'squat' }, { ex: 'stacco_rumeno' }, { ex: 'hip_thrust' },
      { rot: 'unilaterale' }, { rot: 'adduttori' }, { ex: 'polpacci' },
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
  forza: { ex: 'plank_zavorrato' },
  potenza: { ex: 'hollow_rock' },
};

/* ---------- CORSA ----------
   Lavori per fase. Ogni lavoro ha blocchi (spuntabili) e una progressione:
   - tipo 'serie': aumentano le ripetizioni del blocco chiave
   - tipo 'ritmo': il tempo target scende (in secondi)
   La funzione blocchi(liv) restituisce i blocchi per il livello attuale.
   Il riscaldamento di corsa sta in PREP: qui si parte già caldi.      */
DB.CORSA = {
  velocita: {
    ipertrofia: {
      id: 'vel_base', nome: 'Velocità — base (costruisci il motore)',
      prog: { tipo: 'serie', base: 5, step: 1, max: 10, cosa: 'accelerazioni' },
      blocchi: liv => [
        { titolo: 'Scaletta agilità', dettaglio: '4 schemi × 2 giri (skip, doppio appoggio, laterale, dentro-fuori)', recupero: 45 },
        { titolo: 'Accelerazioni progressive', dettaglio: (5 + liv) + ' × 60 m: parti piano e arriva al 90% negli ultimi 20 m. Recupero 2\' camminando', recupero: 120 },
        { titolo: 'Allunghi', dettaglio: '3 × 80 m al 75-80%, sciolti e ampi. Recupero 90"', recupero: 90 },
      ],
    },
    forza: {
      id: 'vel_forza', nome: 'Velocità — sprint massimali',
      prog: { tipo: 'serie', base: 5, step: 1, max: 10, cosa: 'sprint col paracadute' },
      blocchi: liv => [
        { titolo: 'Scaletta rapida', dettaglio: '3 schemi × 2 giri alla massima frequenza di appoggi', recupero: 45 },
        { titolo: 'Sprint con paracadute', dettaglio: (5 + liv) + ' × 30 m al 100% con paracadute. Recupero 3\' completo (la qualità vale più della quantità)', recupero: 180 },
        { titolo: 'Partenze varie', dettaglio: '4 × 20 m senza paracadute: partenza in piedi, seduto, prono, dopo giro su te stesso', recupero: 120 },
      ],
    },
    potenza: {
      id: 'vel_potenza', nome: 'Velocità — RSA (sprint ripetuti da gara)',
      prog: { tipo: 'serie', base: 6, step: 1, max: 10, cosa: 'sprint per blocco' },
      blocchi: liv => [
        { titolo: 'RSA — blocco 1', dettaglio: (6 + liv) + ' × 40 m al massimo, recupero 20" tra gli sprint (torna camminando veloce)', recupero: 240 },
        { titolo: 'RSA — blocco 2', dettaglio: (6 + liv) + ' × 40 m come sopra, dopo 4\' di recupero dal blocco 1', recupero: 240 },
        { titolo: 'Navette con i coni', dettaglio: '4 × (10+20+10 m) con cambi di senso sui coni. Recupero 90"', recupero: 90 },
      ],
    },
  },
  resistenza: {
    ipertrofia: {
      id: 'res_base', nome: 'Resistenza — ripetute tempo',
      prog: { tipo: 'ritmo', base: 115, step: -2, min: 85, unita: 'per 400 m' },
      blocchi: (liv, ritmo) => [
        { titolo: 'Ripetute 400 m', dettaglio: '5 × 400 m in ' + U.fmtRitmo(ritmo) + ' l\'una. Recupero 90" da fermo o camminando. (Il riscaldamento di corsa lo trovi in PREP: fallo prima, qui si parte già caldi)', recupero: 90 },
        { titolo: 'Defaticamento', dettaglio: '5\' di corsa blanda + camminata', recupero: 0 },
      ],
    },
    forza: {
      id: 'res_forza', nome: 'Resistenza — fartlek (cambi di ritmo)',
      prog: { tipo: 'serie', base: 8, step: 1, max: 14, cosa: 'cambi di ritmo' },
      blocchi: liv => [
        { titolo: 'Fartlek', dettaglio: (8 + liv) + ' × (30" forte al 85-90% / 90" piano). Il tratto forte è deciso ma controllato. Parti già caldo (riscaldamento in PREP)', recupero: 0 },
        { titolo: 'Defaticamento', dettaglio: '5\' blandi', recupero: 0 },
      ],
    },
    potenza: {
      id: 'res_potenza', nome: 'Resistenza — intermittente 15-15',
      prog: { tipo: 'ritmo', base: 58, step: 2, max: 80, unita: 'm ogni 15"', crescente: true },
      blocchi: (liv, dist) => [
        { titolo: '15-15 — blocco 1', dettaglio: '8\' di: 15" di corsa coprendo ' + dist + ' m / 15" fermo o camminando. Usa i coni per misurare la distanza. Parti già caldo (riscaldamento in PREP)', recupero: 180 },
        { titolo: '15-15 — blocco 2', dettaglio: '8\' come sopra, dopo 3\' di recupero', recupero: 0 },
      ],
    },
  },
};

/* Versione pioggia 🌧 (garage): sostituisce la seduta di strada */
DB.CORSA_PIOGGIA = {
  velocita: {
    id: 'vel_pioggia', nome: 'Velocità — versione garage 🌧',
    prog: { tipo: 'serie', base: 10, step: 1, max: 16, cosa: 'sprint in cyclette' },
    blocchi: liv => [
      { titolo: 'Scaletta al coperto', dettaglio: '4 schemi × 2 giri (l\'eccezione consentita: la scaletta entra in garage)', recupero: 45 },
      { titolo: 'Sprint in cyclette', dettaglio: (10 + liv) + ' × 15" alla massima cadenza, resistenza 7-8. Recupero 45" pedalando piano', recupero: 45 },
      { titolo: 'Skip alto sul posto', dettaglio: '3 × 20" alla massima frequenza. Recupero 60"', recupero: 60 },
    ],
  },
  resistenza: {
    id: 'res_pioggia', nome: 'Resistenza — versione garage 🌧',
    prog: { tipo: 'serie', base: 6, step: 1, max: 12, cosa: 'ripetute in cyclette' },
    blocchi: liv => [
      { titolo: 'Cyclette progressiva', dettaglio: '10\' partendo da resistenza 3 e salendo a 5', recupero: 0 },
      { titolo: 'Ripetute in cyclette', dettaglio: (6 + liv) + ' × (1\' forte a resistenza 7 / 2\' piano a resistenza 3)', recupero: 0 },
      { titolo: 'Circuito corpo libero', dettaglio: '2 giri: 15 squat + 10 affondi per gamba + 30" plank, senza pausa tra gli esercizi', recupero: 90 },
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
      'Squat a corpo libero: 2×10 lenti e profondi',
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
        { label: 'B', voci: ['Crunch con gambe alzate × 15', 'Plank con tocco spalla × 10 per lato', 'Russian twist × 12 per lato', 'Dead bug × 10 per lato'] },
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
        { label: 'B', voci: ['Dragon flag negativo sulla panca × 5 (solo discesa, lenta)', 'V-up completi × 12', 'Russian twist con disco da 5 kg × 12 per lato', 'Plank 90"'] },
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
   Solo pre-partita: ricarica, spuntino e acqua, con i grammi in base al peso. */
DB.nutrizione = function (kickoffMin, peso) {
  const p = peso || 70;
  const orario = m => U.pad2(Math.floor(((m % 1440) + 1440) % 1440 / 60)) + ':' + U.pad2(((m % 1440) + 1440) % 1440 % 60);
  return [
    {
      quando: orario(kickoffMin - 180), titolo: 'Ricarica carboidrati (3 ore prima)',
      voci: [
        'Pane bianco ' + Math.round(p * 1.2) + ' g con marmellata ' + Math.round(p * 0.45) + ' g',
        'in alternativa: riso in bianco ' + Math.round(p * 1.0) + ' g con un filo d\'olio',
        'Acqua: 400 ml',
        'Niente fibre, niente fritti, niente latticini interi da qui in poi',
      ],
    },
    {
      quando: orario(kickoffMin - 90), titolo: 'Spuntino (1 ora e mezza prima)',
      voci: [
        '1 banana media (~90 g)',
        '2 fette biscottate con miele ' + Math.round(p * 0.2) + ' g',
        'Acqua: 200 ml',
      ],
    },
    {
      quando: orario(kickoffMin - 60) + ' → ' + orario(kickoffMin - 20), titolo: 'Idratazione a sorsi',
      voci: ['400-500 ml di acqua a piccoli sorsi, non tutta insieme'],
    },
    {
      quando: orario(kickoffMin - 15), titolo: 'Ultimi minuti',
      voci: ['150 ml di acqua', 'Se fa molto caldo: aggiungi un pizzico di sale o mezzo bicchiere di sport drink'],
    },
  ];
};
