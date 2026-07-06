# ⚽ Terzino — Preparazione Atletica

App di sola preparazione atletica per un terzino sinistro che si allena in **garage** e su **strada**.
Gira interamente nel browser: **niente account, niente internet** dopo il primo caricamento (è una PWA installabile).

## Come provarla sul PC

Doppio clic su **`AVVIA-APP.bat`**: parte un piccolo server locale e si apre il browser da solo su `http://localhost:8765`. Lascia aperta la finestra nera mentre usi l'app.

## Come metterla sul telefono (Android)

L'app è pubblicata con GitHub Pages: apri l'indirizzo del sito dal telefono (Chrome), poi menu ⋮ → **"Aggiungi a schermata Home"** → si installa con la sua icona e funziona anche offline.

## Le regole che l'app rispetta

- **La settimana si costruisce intorno alla partita**: forza lontano dalla gara, velocità vicino, attivazione il giorno prima, recupero il giorno dopo.
- Ogni domenica si sceglie la settimana successiva: **1 partita, 2 partite o costruzione**.
- **Garage e strada mai lo stesso giorno.** Eccezioni volute: la scaletta al coperto e la cyclette col tasto 🌧.
- **Progressione automatica prudente**: grandi alzate +2 kg, gilet +1,2 kg, ritmi di corsa che scendono. Dopo 3 aumenti di fila, una seduta di consolidamento.
- **Tetti reali**: 72 kg sul bilanciere (numeri sempre pari), 24 kg sul gilet (con il conto degli inserti), tetti per-esercizio dove serve (es. landmine).
- **Fasi**: Ipertrofia → Forza → Potenza, avanzano ogni 3 sedute di forza gambe e muovono anche la corsa.
- **Rotazioni**: gli esercizi "gemelli" cambiano variante ogni lunedì (cerchietto arancione ↻ per cambiarli a mano).
- **Six Pack**: scheda dedicata, 8 livelli con circuiti A/B che si alternano.

## I dati

Vivono **solo nel browser** (localStorage). Nella scheda **DATI**:
- **Esporta backup** ogni tanto (file `.json`): è la tua assicurazione.
- **Importa backup** per ripristinare tutto.
- Azzeramento totale e numero di build.

## Struttura del codice

```
index.html            pagina unica
css/styles.css        stile (tema scuro atletico, mobile-first)
js/util.js            date e helper
js/data.js            database: esercizi, sedute, fasi, corsa, six pack, test, nutrizione
js/state.js           salvataggio, backup, azzeramento
js/engine.js          motore: progressione, settimana, fasi, rotazioni, test
js/timer.js           timer, beep, pillola di recupero
js/charts.js          grafici SVG (senza librerie)
js/ui.js              tutte le schermate
js/app.js             avvio ed eventi
sw.js                 service worker (offline)
manifest.webmanifest  installazione come app
```
