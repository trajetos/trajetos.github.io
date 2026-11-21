/* Arcos — distância média ponderada (km bairro × ESDI) por ano. INTRO, telas de gráfico.
   Portado de distancia-arcos.html / js/distancia-arcos.js (só o gráfico principal; os bastidores ficam no sandbox).
   Estado 1: só 1963, como um círculo (mesmo comprimento do arco em que vai se transformar).
   Estado 2: o círculo de 1963 se abre no arco; as demais turmas partem juntas e avançam até a ESDI
             na MESMA velocidade (km por segundo) — quem mora mais longe, em média, chega depois.
   Arcos: ângulo = média (escala comum: 1 volta = KM_TURN km); cores = parcela de estudantes por região.
   Dados: window.DISTANCIA (data/distancia/distancia.js, gerado por data/distancia/analisar.py). */
(function () {
  "use strict";

  const YEARS = ["1963", "1983", "2003", "2014", "2024"];
  const M = "media_ponderada";
  const nf = (v, d = 1) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const polar = (cx, cy, r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)]; // 0 = topo, horário
  const BOTTOM = Math.PI;   // ESDI: ponto de chegada, embaixo
  const KM_TURN = 18;       // uma volta completa = 18 km
  const SEC_PER_KM = 0.4;   // velocidade comum a todos os arcos
  const INTRO_MS = 700;     // pontos de partida aparecem antes de o percurso começar
  const MORPH_MS = 1100;    // círculo de 1963 → arco
  const REGIONS = [ // cores das barras estaqueadas; ordem da ESDI para a ponta do arco
    { key: "Centro", color: "#255b91" },
    { key: "Zona Sul", color: "#82c8d5" },
    { key: "Zona Norte", color: "#7ba15a" },
    { key: "Zona Oeste", color: "#df8200" },
    { key: "RMRJ", color: "#c63d2c" },
    { key: "Outras cidades", color: "#db95ab" },
  ];

  let api = null;

  function init(fig) {
    const D = window.DISTANCIA;
    if (!D || !window.d3) { console.warn("arcos: dados de distância ou D3 indisponíveis"); return; }
    const arcGen = d3.arc();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const data = YEARS.map((y) => ({ year: y, ...D.anos[y].indicadores }));
    const label = (d) => d.year + (d.limitacao ? "*" : "");
    const maxKm = d3.max(data, (d) => d[M]);

    const cx = 320, cy = 285, R0 = 130, GAPR = 31, TH = 10;   // drawing space 640 × 600 (cropped by the viewBox)
    const ANG_PER_KM = 2 * Math.PI / KM_TURN;
    // crop the drawing to what is actually used (outer arc ± stroke, year labels, ESDI bar) so the chart reads larger
    const s = d3.select(fig.querySelector("svg")).attr("viewBox", "52 18 536 544");

    const segsOf = (y, mean) => {
      const tot = d3.sum(D.anos[y].bairros, (b) => b.alunos);
      let acc = 0;
      return REGIONS.map((rg) => {
        const n = d3.sum(D.anos[y].bairros.filter((b) => b.classificacao === rg.key), (b) => b.alunos);
        const seg = { ...rg, n, tot, pct: 100 * n / tot, u0: acc * mean, u1: (acc + n / tot) * mean };
        acc += n / tot;
        return seg;
      }).filter((sg) => sg.n > 0);
    };
    const tracks = data.map((d, i) => ({ ...d, r: R0 + i * GAPR, segs: segsOf(d.year, d[M]) }));
    const first = tracks[0], others = tracks.slice(1);
    const rOut = tracks[tracks.length - 1].r;
    const L0 = first.r * first[M] * ANG_PER_KM, RC = L0 / (2 * Math.PI);

    // (no colour legend here: the text above already pairs each colour with its region)

    // tooltip (mesmo estilo de .bar-tip das barras estaqueadas): % da turma + contagem absoluta
    const tip = fig.appendChild(Object.assign(document.createElement("div"), { className: "bar-tip", role: "status" }));
    function showTip(evt, sg) {
      tip.classList.remove("is-note");
      tip.innerHTML = `${nf(sg.pct)}% <small>${sg.key} · ${sg.n} de ${sg.tot} estudantes em ${sg.year}` +
        `${sg.lim ? `<br>tracejado: só ${sg.tot} registros preservados — ler com cautela` : ""}</small>`;
      tip.style.setProperty("--c", sg.color);
      const fb = fig.getBoundingClientRect();
      tip.style.left = (evt.clientX - fb.left) + "px";
      tip.style.top = (evt.clientY - fb.top) + "px";
      tip.classList.add("is-on");
      gArcs.selectAll(".seg").classed("is-dim", (d) => d !== sg);
    }
    function hideTip() {
      tip.classList.remove("is-on");
      gArcs.selectAll(".seg").classed("is-dim", false);
    }
    // ano com dados parciais (2003): o rótulo "2003*" explica por que o arco é tracejado
    const limNote = (tk) => `Por que tracejado? <small>Em ${tk.year}, apenas ${tk.segs[0].tot} registros de estudantes ` +
      `foram preservados no arquivo histórico. Por isso, o arco aparece tracejado e deve ser lido com cautela.</small>`;
    function showNote(tk) {
      if (+tk.label.attr("opacity") === 0) return;   // rótulo ainda escondido (percurso em andamento)
      tip.innerHTML = limNote(tk);
      tip.style.setProperty("--c", "var(--azul)");
      const fb = fig.getBoundingClientRect(), lb = tk.label.node().getBoundingClientRect();
      tip.style.left = (lb.left + lb.width / 2 - fb.left) + "px";
      tip.style.top = (lb.top - fb.top) + "px";
      tip.classList.add("is-on", "is-note");
      gArcs.selectAll(".seg").classed("is-dim", (d) => !d.lim);
    }
    function hideNote() { tip.classList.remove("is-note"); hideTip(); }

    const gArcs = s.append("g"), gBar = s.append("g"), gDots = s.append("g"), gText = s.append("g");
    tracks.forEach((tk) => {
      const lim = tk.limitacao ? " lim" : "";
      tk.segs.forEach((sg) => {
        sg.year = label(tk); sg.lim = !!tk.limitacao;
        sg.path = gArcs.append("path").attr("class", "seg" + lim).attr("fill", sg.color).attr("transform", `translate(${cx},${cy})`)
          .datum(sg).on("pointerenter pointermove", showTip).on("pointerleave", hideTip);
      });
      tk.start = gDots.append("circle").attr("class", "start").attr("r", TH * 0.55);
      tk.label = gText.append("text").attr("class", "val").attr("x", cx + 14).attr("y", cy + tk.r + 6)
        .html(`<tspan class="yr">${label(tk)}</tspan><tspan x="${cx + 70}">${nf(tk[M])} km</tspan>`);
      if (tk.limitacao) {
        tk.label.classed("has-note", true).attr("tabindex", 0).attr("role", "button")
          .attr("aria-label", `${tk.year}: por que o arco é tracejado?`)
          .on("pointerenter focus", () => showNote(tk)).on("pointerleave blur", hideNote);
      }
    });

    // ESDI: barra de chegada + rótulo em recorte vermelho
    const bar = gBar.append("rect").attr("class", "bar").attr("x", cx - 4).attr("width", 8).attr("rx", 2.5);
    const tag = gText.append("g");
    tag.append("image").attr("href", "assets/intro/recorte-vermelho.png").attr("preserveAspectRatio", "none")
      .attr("x", -30).attr("y", -17).attr("width", 60).attr("height", 26);
    tag.append("text").attr("class", "esdi").attr("y", 2).attr("text-anchor", "middle").text("ESDI");
    const clock = gText.append("text").attr("class", "clock").attr("x", cx).attr("y", cy + 4).attr("text-anchor", "middle");
    const solo = gText.append("g").attr("class", "solo");
    solo.append("text").attr("class", "yr solo-yr").attr("x", cx).attr("y", cy - 2).attr("text-anchor", "middle").text(label(first));
    solo.append("text").attr("class", "val").attr("x", cx).attr("y", cy + 18).attr("text-anchor", "middle").text(`${nf(first[M])} km`);

    function drawTrack(tk, r, angPerKm, front, visible = true) {
      tk.segs.forEach((sg) => {
        const lo = Math.max(sg.u0, front), hi = sg.u1;
        sg.path.attr("d", visible && hi > lo ? arcGen({ innerRadius: r - TH / 2, outerRadius: r + TH / 2,
          startAngle: BOTTOM + lo * angPerKm, endAngle: BOTTOM + hi * angPerKm }) : null);
      });
      const [sx, sy] = polar(cx, cy, r, BOTTOM + tk[M] * angPerKm);
      tk.start.attr("cx", sx).attr("cy", sy);
    }
    function drawRace(km, list) {
      list.forEach((tk) => {
        const p = Math.min(km, tk[M]);
        drawTrack(tk, tk.r, ANG_PER_KM, tk[M] - p, p > 0);
        tk.label.attr("opacity", km >= tk[M] ? 1 : 0);
      });
      clock.text(km > 0 && km < d3.max(list, (d) => d[M]) ? `${nf(km)} km percorridos` : "");
    }
    function drawMorph(e) {
      const r = RC + (R0 - RC) * e;
      drawTrack(first, r, L0 / r / first[M], 0);
      first.start.attr("opacity", e);
      bar.attr("y", cy + r - 12).attr("height", 24 + (rOut - R0) * e);
      tag.attr("transform", `translate(${cx},${cy + RC + 34 + (R0 - 34 - RC - 34) * e})`);
      solo.attr("opacity", 1 - Math.min(1, e * 2.5));
    }

    let timer = null, state = 0;
    const stop = () => { if (timer) timer.stop(); timer = null; s.selectAll("*").interrupt(); };
    function hideOthers() {
      others.forEach((tk) => { drawTrack(tk, tk.r, ANG_PER_KM, tk[M], false); tk.start.attr("opacity", 0); tk.label.attr("opacity", 0); });
      first.label.attr("opacity", 0);
      clock.text("");
    }
    function race(list) {
      if (reduced) { list.forEach((tk) => tk.start.attr("opacity", 1)); drawRace(maxKm, list); return; }
      drawRace(0, list);
      list.forEach((tk) => tk.start.attr("opacity", 0).transition().duration(INTRO_MS * 0.6).attr("opacity", 1));
      const end = d3.max(list, (d) => d[M]);
      timer = d3.timer((ms) => {
        const km = Math.max(0, ms - INTRO_MS) / 1000 / SEC_PER_KM;
        drawRace(km, list);
        if (km >= end) { timer.stop(); timer = null; }
      });
    }
    function morph(from, to, done) {
      if (reduced) { drawMorph(to); done && done(); return; }
      timer = d3.timer((ms) => {
        const k = Math.min(1, ms / MORPH_MS), e = d3.easeCubicInOut(k);
        drawMorph(from + (to - from) * e);
        if (k >= 1) { timer.stop(); timer = null; done && done(); }
      });
    }

    /** n = 1 (círculo de 1963) | 2 (todas as turmas) */
    function setState(n, animate = true) {
      if (n === state && animate) return;
      const from = state;
      stop();
      state = n;
      fig.dataset.state = String(n);
      hideTip();
      hideOthers();
      if (n === 1) {
        animate && from === 2 ? morph(1, 0) : drawMorph(0);
      } else {
        const after = () => { first.label.attr("opacity", 1); race(others); };
        animate ? morph(0, 1, after) : (drawMorph(1), after());
      }
    }
    // repetir: todas as turmas, inclusive 1963, refazem o percurso juntas
    function replay() {
      if (state !== 2) return;
      stop(); drawMorph(1); first.start.attr("opacity", 0);
      race(tracks);
    }
    const btn = fig.querySelector(".replay");
    if (btn) btn.addEventListener("click", replay);

    setState(1, false);
    api = { setState, replay, stop, get state() { return state; } };
  }

  window.Arcos = {
    init,
    setState: (n, animate) => api && api.setState(n, animate),
    stop: () => api && api.stop(),
    get state() { return api ? api.state : 0; }
  };
})();
