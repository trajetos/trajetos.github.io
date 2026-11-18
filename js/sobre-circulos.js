/* SOBRE · _a construção do gráfico circular
   Um círculo por ano, raio = distância média ponderada (mesma escala para todos).
   Dados: window.DISTANCIA (data/distancia/distancia.js, gerado por analisar.py). */
(function () {
  "use strict";
  const D = window.DISTANCIA;
  const host = document.querySelector("#sobre-circulos svg");
  if (!D || !host || !window.d3) return;

  const YEARS = ["1963", "1983", "2003", "2014", "2024"];
  const nf = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const data = YEARS.map((y) => ({ year: y, mean: D.anos[y].indicadores.media_ponderada, lim: !!D.anos[y].indicadores.limitacao }));

  const W = 640, H = 220, RMAX = 60, cy = 74, step = W / data.length;
  const k = RMAX / d3.max(data, (d) => d.mean);
  const s = d3.select(host).attr("viewBox", `0 0 ${W} ${H}`);

  data.forEach((d, i) => {
    const x = step * (i + 0.5), r = d.mean * k;
    const g = s.append("g").attr("class", d.lim ? "is-lim" : null);
    g.append("circle").attr("class", "c-ring").attr("cx", x).attr("cy", cy).attr("r", r);
    g.append("line").attr("class", "c-radius").attr("x1", x).attr("y1", cy).attr("x2", x + r).attr("y2", cy);
    g.append("circle").attr("class", "c-hub").attr("cx", x).attr("cy", cy).attr("r", 2.5);
    g.append("text").attr("class", "c-yr").attr("x", x).attr("y", cy + RMAX + 36).attr("text-anchor", "middle").text(d.year + (d.lim ? "*" : ""));
    g.append("text").attr("class", "c-val").attr("x", x).attr("y", cy + RMAX + 56).attr("text-anchor", "middle").text(`raio ${nf(d.mean)} km`);
  });
})();
