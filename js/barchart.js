/* Stacked 100% bar chart (D3) — INTRO barchart1 / barchart2
   Source of truth: data/barras-estaqueadas.csv (counts per year).
   Each segment = category count / year total. */
(function () {
  "use strict";

  const CATEGORIES = [ // bottom → top
    { key: "Zona Sul",       color: "#82c8d5" },
    { key: "Centro",         color: "#255b91" },
    { key: "Zona Norte",     color: "#7ba15a" },
    { key: "Zona Oeste",     color: "#df8200" },
    { key: "RMRJ",           color: "#c63d2c" },
    { key: "Outras cidades", color: "#db95ab" }
  ];
  const COTAS_AFTER = "1993";   // dashed line between 1993 and 2003
  const COTAS_BEFORE = "2003";
  const HIGHLIGHT_YEAR = "1973"; // "86,7%" label in barchart1

  const fmtPct = (v) => (v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";

  let rows = null;
  let mode = 1;
  let host = null;

  function prepare(raw) {
    return raw.map((d) => {
      const counts = CATEGORIES.map((c) => +d[c.key] || 0);
      const total = d3.sum(counts);
      let acc = 0;
      const segs = CATEGORIES.map((c, i) => {
        const share = total ? counts[i] / total : 0;
        const seg = { year: d.Ano, key: c.key, color: c.color, count: counts[i], total, share, y0: acc, y1: acc + share };
        acc += share;
        return seg;
      });
      return { year: d.Ano, total, segs };
    });
  }

  let tip = null;
  function showTip(e, d, rect) {
    if (!tip) return;
    tip.textContent = fmtPct(d.share);
    tip.style.setProperty("--c", d.color);
    const hb = host.getBoundingClientRect();
    const rb = rect.getBoundingClientRect();
    const x = rb.left - hb.left + rb.width / 2;
    const y = Math.max(0, rb.top - hb.top);
    const half = tip.offsetWidth / 2 || 24;
    tip.style.left = Math.min(hb.width - half, Math.max(half, x)) + "px";
    tip.style.top = y + "px";
    tip.classList.toggle("is-inside", y < 34);   // no room above → show inside the bar
    tip.classList.add("is-on");
    d3.select(host).selectAll("rect.seg").classed("is-dim", function () { return this !== rect; });
  }
  function hideTip() {
    if (!tip) return;
    tip.classList.remove("is-on");
    d3.select(host).selectAll("rect.seg").classed("is-dim", false);
  }

  let lastKey = "";
  function render() {
    if (!rows || !host || !host.clientWidth) return;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const W = Math.max(240, host.clientWidth);
    const topPad = mobile ? 34 : 19;     // room for the "cotas" label
    const yearH = 19;
    const axisW = mobile ? 24 : 34, gap = mobile ? 2 : 4;
    // desktop: fill the height of the box the page gives the chart (320 px when it has none)
    const boxH = mobile ? 0 : host.clientHeight;
    // (and keep it from getting taller than ~3/4 of its width, so a narrow chart doesn't turn into a tower)
    const plotH = boxH ? Math.max(220, Math.min(620, Math.round(W * 0.72), Math.floor(boxH - topPad - gap - yearH))) : 320;
    const key = W + "x" + plotH + (mobile ? "m" : "d");
    if (key === lastKey && host.querySelector("svg")) return;   // already drawn at this size
    lastKey = key;
    const H = topPad + plotH + gap + yearH;
    const n = rows.length;
    const bw = (W - axisW - gap * (n + 1)) / n; // n bars + cotas line → n+1 gaps after the axis

    // x position of each bar; the cotas line sits in its own zero-width slot
    const xs = [];
    let x = axisW + gap;
    rows.forEach((r) => {
      xs.push(x);
      x += bw + gap;
      if (r.year === COTAS_AFTER) x += gap;
    });
    const iCotas = rows.findIndex((r) => r.year === COTAS_BEFORE);
    const xCotas = xs[iCotas] - gap - gap / 2 + 2;

    const y = d3.scaleLinear().domain([0, 1]).range([topPad + plotH, topPad]);

    d3.select(host).selectAll("svg").remove();
    hideTip();
    const svg = d3.select(host).append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("role", "img")
      .attr("aria-hidden", "true");

    // axis labels
    svg.append("g").selectAll("text")
      .data([1, .5, 0]).join("text")
      .attr("class", "axis-label")
      .attr("x", axisW).attr("y", (d) => y(d))
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .text((d) => (d * 100) + "%");

    // bars
    const gBars = svg.append("g");
    const col = gBars.selectAll("g.year").data(rows).join("g")
      .attr("class", "year")
      .attr("transform", (d, i) => `translate(${xs[i]},0)`);

    col.selectAll("rect").data((d) => d.segs).join("rect")
      .attr("class", (d) => "seg seg--" + (d.key === "Zona Sul" ? "zs" : "other"))
      .attr("x", 0).attr("width", bw)
      .attr("y", (d) => y(d.y1))
      .attr("height", (d) => Math.max(0, y(d.y0) - y(d.y1)))
      .attr("fill", (d) => d.color)
      .attr("opacity", (d) => (mode === 1 && d.key !== "Zona Sul") ? 0 : 1)
      .on("pointerenter pointermove pointerdown", function (e, d) {
        if (+this.getAttribute("opacity") < 0.5 || d.share === 0) { hideTip(); return; }
        showTip(e, d, this);
      })
      .on("pointerleave", hideTip);

    col.append("text")
      .attr("class", "year-label")
      .attr("x", bw / 2).attr("y", topPad + plotH + gap + 11)
      .attr("text-anchor", "middle")
      .text((d) => d.year);

    // 50% guide (drawn over the bars, like the Figma "plus-lighter" line)
    svg.append("line").attr("class", "guide guide--50")
      .attr("x1", 0).attr("x2", W).attr("y1", y(.5)).attr("y2", y(.5));

    // cotas guide + label
    svg.append("line").attr("class", "guide guide--cotas")
      .attr("x1", xCotas).attr("x2", xCotas).attr("y1", 0).attr("y2", H);
    const lbl = svg.append("text").attr("class", "cotas-label")
      .attr("x", xCotas + 4).attr("y", 12);
    if (mobile) {
      lbl.append("tspan").attr("x", xCotas + 4).attr("dy", 0).text("1°ingresso por");
      lbl.append("tspan").attr("x", xCotas + 4).attr("dy", 14).text("sistema de cotas");
    } else {
      lbl.text("1°ingresso por sistema de cotas");
    }

    // value label (barchart1 only)
    const hi = rows.find((r) => r.year === HIGHLIGHT_YEAR);
    const iHi = rows.indexOf(hi);
    const zs = hi.segs[0];
    svg.append("text").attr("class", "value-label")
      .attr("x", xs[iHi] + bw / 2).attr("y", y(zs.y1) - 6)
      .attr("text-anchor", "middle")
      .attr("opacity", mode === 1 ? 1 : 0)
      .text(fmtPct(zs.share));

    renderTable();
  }

  function renderTable() {
    if (host.querySelector("table")) return;
    const wrap = document.createElement("div");
    wrap.className = "sr-only";
    const t = document.createElement("table");
    wrap.appendChild(t);
    const head = "<caption>Ingressantes da ESDI por região de origem (percentual do total do ano)</caption><tr><th>Ano</th>" +
      CATEGORIES.map((c) => `<th>${c.key}</th>`).join("") + "</tr>";
    const body = rows.map((r) => `<tr><th>${r.year}</th>` + r.segs.map((s) => `<td>${fmtPct(s.share)} (${s.count})</td>`).join("") + "</tr>").join("");
    t.innerHTML = head + body;
    host.appendChild(wrap);
  }

  function setMode(m) {
    mode = m;
    hideTip();
    if (!host || !rows) return;
    const svg = d3.select(host).select("svg");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dur = reduce ? 0 : 650;
    svg.selectAll("rect.seg--other")
      .transition().duration(dur)
      .delay((d) => reduce ? 0 : CATEGORIES.findIndex((c) => c.key === d.key) * 90)
      .attr("opacity", m === 1 ? 0 : 1);
    svg.select(".value-label").transition().duration(dur / 2).attr("opacity", m === 1 ? 1 : 0);
  }

  async function init(el, url) {
    host = el;
    let raw;
    try {
      raw = await d3.csv(url);
    } catch (err) {
      if (!window.TRAJETOS_BARRAS_CSV) throw err;
      raw = d3.csvParse(window.TRAJETOS_BARRAS_CSV);   // file:// fallback
    }
    tip = document.createElement("div");
    tip.className = "bar-tip";
    tip.setAttribute("aria-hidden", "true");
    host.appendChild(tip);
    rows = prepare(raw);
    render();
    let tid;
    window.addEventListener("resize", () => { clearTimeout(tid); tid = setTimeout(render, 120); });
  }

  window.Barchart = { init, setMode, render };
})();
