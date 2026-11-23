/* trajetos — navegação da INTRO (clique) e abertura do COSMOS */
(function () {
  "use strict";

  const SCREENS = ["cover", "default", "question", "barchart1", "barchart2", "map", "selection"];
  const intro = document.getElementById("intro");
  const prevBtn = intro.querySelector(".nav-arrow--prev");
  const nextBtn = intro.querySelector(".nav-arrow--next");
  let index = 0;

  function show(i) {
    index = Math.max(0, Math.min(SCREENS.length - 1, i));
    const name = SCREENS[index];
    intro.dataset.screen = name;
    intro.classList.remove("show-scroll-hint");       // only openIntro() (back from a route) turns it on

    // prev is hidden on the first inner screen (as in the design), next on the last
    const noPrev = index <= 1;
    const noNext = index >= SCREENS.length - 1;
    prevBtn.setAttribute("aria-hidden", String(noPrev));
    prevBtn.tabIndex = noPrev ? -1 : 0;
    nextBtn.setAttribute("aria-hidden", String(noNext));
    nextBtn.tabIndex = noNext ? -1 : 0;

    // chart screens: arcs (state 1 = 1963 circle, state 2 = all years); stacked bars only via the toggle button
    if (name === "barchart1" || name === "barchart2") {
      setChartView("arcs");
      window.Arcos.setState(name === "barchart1" ? 1 : 2);
    } else {
      window.Arcos.stop();
      setChartView("arcs");
    }
    window.scrollTo(0, 0);
    fitSelection();
  }

  /* mobile · route selection: size the three cards so they all fit, centred, in the space under the text */
  const routesEl = intro.querySelector(".routes");
  function fitSelection() {
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    if (!mobile || intro.dataset.screen !== "selection") {
      routesEl.style.removeProperty("--card-img-h");
      routesEl.style.removeProperty("min-height");
      return;
    }
    routesEl.style.removeProperty("--card-img-h");
    routesEl.style.removeProperty("min-height");
    const top = routesEl.getBoundingClientRect().top + window.scrollY;
    const avail = window.innerHeight - top - 20;                // down to the bottom of the screen
    // cards always keep their natural size (legibility): on short phones the page scrolls instead of shrinking them
    const h = routesEl.clientWidth * 262 / 572;
    routesEl.style.setProperty("--card-img-h", h.toFixed(1) + "px");
    routesEl.style.minHeight = Math.max(0, avail).toFixed(0) + "px";   // lets the column centre the cards in it
    lastVP = window.innerWidth + "x" + window.innerHeight;
  }
  let fitTid, lastVP = "";
  const refit = () => {
    if (intro.dataset.screen !== "selection") return;
    const vp = window.innerWidth + "x" + window.innerHeight;
    if (vp === lastVP) return;
    lastVP = vp;
    clearTimeout(fitTid);
    fitTid = setTimeout(fitSelection, 60);          // after the new layout has settled
  };
  // window "resize" can fire before the new size is applied, so also watch the viewport itself
  window.addEventListener("resize", refit);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", refit);
  if (window.ResizeObserver) new ResizeObserver(refit).observe(document.documentElement);
  setInterval(refit, 500);                            // cheap safety net (no-op unless the size changed)

  const chartTabs = intro.querySelectorAll(".chart-tab");
  function setChartView(view) {
    intro.dataset.chart = view;
    const bars = view === "bars";
    chartTabs.forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.view === view)));
    if (bars) {
      window.Arcos.stop();
      window.Barchart.render();               // size to the now-visible container
      window.Barchart.setMode(2);             // full stack, every catalogued year
    }
  }

  /* SOBRE: its own page (#sobre) over everything else */
  const sobre = document.getElementById("sobre");
  function openSobre(push) {
    window.Cosmos.close();
    window.Arcos.stop();
    intro.hidden = true;
    sobre.hidden = false;
    window.scrollTo(0, 0);
    if (push && location.hash !== "#sobre") history.pushState(null, "", "#sobre");
    animateSobre();
  }

  /* entrance: blocks slide up + fade in; those on screen staggered, the rest when scrolled into view */
  const sobreBlocks = Array.from(sobre.querySelectorAll(".sobre__body > .acc, .sobre__cta"));   // chapters (accordions) + CTA
  let sobreIO = null;
  function animateSobre() {
    if (sobreIO) sobreIO.disconnect();
    sobre.classList.remove("is-anim");
    sobreBlocks.forEach((b) => { b.classList.remove("is-in"); b.style.removeProperty("--d"); });
    if (!("IntersectionObserver" in window)) return;
    sobre.classList.add("is-anim");
    void sobre.offsetHeight;                          // start from the hidden state
    let n = 0;
    const vh = window.innerHeight;
    setTimeout(() => sobreBlocks.forEach((b) => {
      if (b.getBoundingClientRect().top < vh) { b.style.setProperty("--d", (0.1 + n++ * 0.09).toFixed(2) + "s"); b.classList.add("is-in"); }
    }), 30);
    sobreIO = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      sobreIO.unobserve(e.target);
    }), { rootMargin: "0px 0px -8% 0px" });
    sobreBlocks.forEach((b) => { if (b.getBoundingClientRect().top >= vh) sobreIO.observe(b); });
  }

  /* intro entrance after a menu click (capa / histórias): CSS keyed on .page-in, removed once played so the
     carousel arrows don't replay it */
  let pageTid;
  function pageIn() {
    intro.classList.remove("page-in");
    void intro.offsetWidth;                           // restart the animations
    intro.classList.add("page-in");
    clearTimeout(pageTid);
    pageTid = setTimeout(() => intro.classList.remove("page-in"), 1600);
  }

  function openIntro(at) {
    const fromRoute = !document.getElementById("cosmos").hidden;   // coming back from a student route
    window.Cosmos.close();
    sobre.hidden = true;
    intro.hidden = false;
    show(SCREENS.indexOf(at));
    if (location.hash) history.replaceState(null, "", location.pathname);
    if (fromRoute && at === "selection") showScrollHint();
  }

  /* "role para baixo": on the route choice, after coming back from a route — the closing text is below the fold.
     Same timing as the routes' drag hint: shows up after a moment, leaves after 7 s, at the first scroll, or when
     the screen changes. */
  let hintShow = 0, hintHide = 0;
  function showScrollHint() {
    clearTimeout(hintShow); clearTimeout(hintHide);
    const off = () => {
      clearTimeout(hintShow); clearTimeout(hintHide);
      intro.classList.remove("show-scroll-hint");
      window.removeEventListener("scroll", onScroll);
    };
    const onScroll = () => { if (window.scrollY > 24) off(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    hintShow = setTimeout(() => {
      if (intro.hidden || intro.dataset.screen !== "selection" || window.scrollY > 24) return off();
      intro.classList.add("show-scroll-hint");
      hintHide = setTimeout(off, 7000);
    }, 1200);
  }

  /* closing band (route choice, below the fold): its blocks fade in one after the other as it scrolls into view,
     and fade out again when it leaves, so it plays every time */
  const endEl = intro.querySelector(".selection-end");
  const endBlocks = Array.from(endEl.querySelectorAll(".reveal"));
  endBlocks.forEach((b, i) => b.style.setProperty("--d", (i * 0.12).toFixed(2) + "s"));
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => endBlocks.forEach((b) => b.classList.toggle("is-in", e.isIntersecting)),
      { threshold: 0.25 }).observe(endEl);
  } else endBlocks.forEach((b) => b.classList.add("is-in"));

  /* share the site: the phone's own share sheet when there is one, otherwise copy the link */
  const shareMsg = intro.querySelector(".share__msg");
  let shareTid;
  async function share() {
    const url = location.origin + location.pathname;
    const data = { title: "Trajetos", text: "Trajetos: o impacto do deslocamento na experiência universitária de estudantes da ESDI/UERJ", url };
    // phones/tablets: native share sheet; computers: copy the link (their share dialogs are less familiar)
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try { await navigator.share(data); } catch (err) { /* closed by the user */ }
      return;
    }
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch (err) { /* no clipboard access */ }
    shareMsg.textContent = ok ? "link copiado!" : url;
    clearTimeout(shareTid);
    shareTid = setTimeout(() => { shareMsg.textContent = ""; }, 3000);
  }

  /* open a student route (COSMOS player): "cosmos" | "novaiguacu" | "riobonito" — always behind a short loading
     screen (title + a line drawing itself), which then fades away. (`animate` kept for the callers; unused.) */
  function openCosmos(animate, route) {
    sobre.hidden = true;
    window.Cosmos.open(route || "cosmos", { loader: true });
    intro.hidden = true;
    const hash = window.Cosmos.hashOf(window.Cosmos.route);
    if (location.hash !== hash) history.pushState(null, "", hash);
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-action]");
    if (!t) return;
    const a = t.dataset.action;
    if (a === "start") show(1);
    else if (a === "next") show(index + 1);
    else if (a === "prev") show(index - 1);
    else if (a === "open-cosmos") { e.preventDefault(); openCosmos(true, t.dataset.route); }
    // menu (and the "trajetos" title): every destination opens like a new page — menu fades, content slides up
    else if (a === "go-selection") { e.preventDefault(); openIntro("selection"); pageIn(); }
    else if (a === "go-sobre") { e.preventDefault(); openSobre(true); }
    else if (a === "go-intro") { e.preventDefault(); openIntro("cover"); pageIn(); }   // início / título → capa
    else if (a === "share") share();
    else if (a === "go-explore") { e.preventDefault(); openIntro("default"); pageIn(); } // sobre → intro, skipping the cover
    else if (a === "chart-view") {
      const view = t.dataset.view;
      if (view === intro.dataset.chart) return;
      setChartView(view);
      if (view === "arcs") window.Arcos.setState(2, false);   // back to the circular chart (all years)
    }
    else if (a === "go-default") { e.preventDefault(); show(1); }                 // título trajetos → intro-default
    else if (a === "cosmos-start") { e.preventDefault(); window.Cosmos.go("inicio"); } // título cosmos → cosmos-início
  });

  document.addEventListener("keydown", (e) => {
    if (intro.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest("input, textarea")) return;
    if (e.key === "ArrowRight" && index > 0 && index < SCREENS.length - 1) show(index + 1);
    else if (e.key === "ArrowLeft" && index > 1) show(index - 1);
  });

  window.addEventListener("popstate", () => {
    const r = window.Cosmos.routeOfHash(location.hash);
    if (r) openCosmos(false, r);
    else if (location.hash === "#sobre") openSobre(false);
    else openIntro("selection");
  });

  window.Cosmos.init({ onExit: () => openIntro("selection") });
  window.Arcos.init(document.getElementById("arcs"));
  window.Barchart.init(document.getElementById("barchart"), "data/barras-estaqueadas.csv")
    .then(() => { if (intro.dataset.chart === "bars") setChartView("bars"); })
    .catch((err) => console.error("Falha ao carregar o CSV do gráfico:", err));

  const startRoute = window.Cosmos.routeOfHash(location.hash);
  if (startRoute) openCosmos(false, startRoute);
  else if (location.hash === "#sobre") { show(1); openSobre(false); }
  else { show(0); pageIn(); }                         // first load / reload: the cover opens with the same entrance
})();
