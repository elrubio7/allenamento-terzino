'use strict';
/* ============================================================
   GRAFICI — linee SVG fatte a mano (niente librerie esterne:
   l'app deve funzionare senza internet).
   punti: [{x: '2026-07-04', y: 42}, ...]
   ============================================================ */
const C = {
  linea(punti, opzioni) {
    const o = Object.assign({ w: 340, h: 160, unita: '', colore: '#22c55e', migliora: 'su' }, opzioni || {});
    if (!punti.length) return '<p class="vuoto">Ancora nessun dato: completa le sedute e i numeri arrivano.</p>';

    const pad = { t: 14, r: 14, b: 26, l: 40 };
    const W = o.w, H = o.h;
    const xs = punti.map(p => U.fromISO(p.x).getTime());
    const ys = punti.map(p => p.y);
    let minX = Math.min(...xs), maxX = Math.max(...xs);
    let minY = Math.min(...ys), maxY = Math.max(...ys);
    if (minX === maxX) { minX -= 86400000; maxX += 86400000; }
    const margine = Math.max((maxY - minY) * 0.15, maxY * 0.05, 1);
    minY = Math.max(0, minY - margine); maxY += margine;

    const px = t => pad.l + (t - minX) / (maxX - minX) * (W - pad.l - pad.r);
    const py = v => H - pad.b - (v - minY) / (maxY - minY) * (H - pad.t - pad.b);

    const path = punti.map((p, i) => (i ? 'L' : 'M') + px(U.fromISO(p.x).getTime()).toFixed(1) + ',' + py(p.y).toFixed(1)).join(' ');
    const dots = punti.map(p =>
      '<circle cx="' + px(U.fromISO(p.x).getTime()).toFixed(1) + '" cy="' + py(p.y).toFixed(1) + '" r="3.5" fill="' + o.colore + '"/>').join('');

    const fmtY = v => (Math.round(v * 10) / 10) + (o.unita ? ' ' + o.unita : '');
    const primo = punti[0], ultimo = punti[punti.length - 1];
    const delta = Math.round((ultimo.y - primo.y) * 100) / 100;
    const buono = o.migliora === 'giu' ? delta < 0 : delta > 0;
    const deltaTxt = punti.length > 1
      ? '<span class="' + (buono ? 'delta-buono' : (delta === 0 ? '' : 'delta-neutro')) + '">' + (delta > 0 ? '+' : '') + delta + (o.unita ? ' ' + o.unita : '') + ' dall\'inizio</span>'
      : '';

    return '' +
      '<div class="grafico-header"><strong>' + fmtY(ultimo.y) + '</strong> ' + deltaTxt + '</div>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="grafico" preserveAspectRatio="xMidYMid meet">' +
      '<line x1="' + pad.l + '" y1="' + (H - pad.b) + '" x2="' + (W - pad.r) + '" y2="' + (H - pad.b) + '" stroke="#334155" stroke-width="1"/>' +
      '<line x1="' + pad.l + '" y1="' + pad.t + '" x2="' + pad.l + '" y2="' + (H - pad.b) + '" stroke="#334155" stroke-width="1"/>' +
      '<text x="' + (pad.l - 6) + '" y="' + (py(maxY - margine) + 4) + '" text-anchor="end" class="grafico-label">' + fmtY(maxY - margine) + '</text>' +
      '<text x="' + (pad.l - 6) + '" y="' + (py(minY + (minY > 0 ? margine : 0)) + 4) + '" text-anchor="end" class="grafico-label">' + fmtY(minY + (minY > 0 ? margine : 0)) + '</text>' +
      '<text x="' + pad.l + '" y="' + (H - 8) + '" class="grafico-label">' + U.fmtDataBreve(primo.x) + '</text>' +
      '<text x="' + (W - pad.r) + '" y="' + (H - 8) + '" text-anchor="end" class="grafico-label">' + U.fmtDataBreve(ultimo.x) + '</text>' +
      '<path d="' + path + '" fill="none" stroke="' + o.colore + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
      dots +
      '</svg>';
  },
};
