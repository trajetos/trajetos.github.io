/* Trajetos dos estudantes sobre um mapa real (MapLibre GL + OpenFreeMap) — COSMOS, NOVA IGUAÇU e RIO BONITO.
   Um único "player": cada trajeto (ROUTES) traz seus dados, título, chips, relatos, resumo e legenda.
   Dados: data/<trajeto>-trajeto.js (gerados pelos scripts em data/<trajeto>/gerar-trajeto.py).
   Opções por trajeto além do básico: chipAtMobile, centerOn (ponto no meio da janela, desktop), zoneOffset
   (lado da linha colorida), flip (nomes à esquerda do tracinho), tick (altura única dos bairros, padrão 64 px), noResumo.
   Nomes: o lado (direita/esquerda) é fixo — à esquerda quando o trecho sobe quase vertical à direita, quando um rótulo
   grande vem logo depois, ou por ROUTE.flip; nunca muda com zoom/arraste. O zoom out para no enquadramento da fala.
   Codificação visual = a do Figma: ônibus tracejado, metrô hachurado, linha paralela colorida por região,
   tracinhos verticais com o nome do bairro, baldeação, início e fim.
   Cada fala move a câmera; o cartão de relato, os chips e o áudio (só Cosmos, por enquanto) seguem.
   data-show: i = início (fala 1), b = baldeação (fala 2), f = final (fala 3), r = resumo
   (versão anterior, com o desenho fixo do Figma: js/cosmos-figma.js)

   CELULAR — o que já vale para todo trajeto novo (ex.: Rio Bonito):
   · sem botão de som; resumo com a legenda logo acima do cartão, o trajeto acima dela e traços mais grossos;
   · nome de bairro seguido de perto (< 1,6 km) por um rótulo grande vai para a esquerda do tracinho;
   · resumo: o rótulo de início desce para baixo do pino (CSS ".place--left > span", ajuste por rota se a âncora mudar).
   O que cada trajeto novo precisa acertar: frames.mobile curtos no gerador (≈ 5–6 km por passo = zoom suficiente
   para os nomes não se encostarem), padMobile (espaço p/ rótulos e chips) e, se preciso, chipAtMobile
   (chips ao lado do ponto em vez de embaixo). Conferir sempre em 375 × 812. */
(function () {
  "use strict";

  const A = "assets/cosmos/";
  const R = A + "resumo/";
  const NI = "assets/novaiguacu/";
  const RB = "assets/riobonito/";
  const AU = "assets/audio/";
  const STEPS = ["inicio", "baldeacao", "final", "resumo"];
  const CODE = { inicio: "i", baldeacao: "b", final: "f", resumo: "r" };
  const INTERACTIVE = { baldeacao: true, final: true };
  const COLOR = { zo: "#df8200", zn: "#7ba15a", ce: "#255b91", rm: "#c63d2c", dark: "#060922" };
  // px — colour line runs parallel to the route; -12 = on the LEFT of travel (Cosmos, Nova Iguaçu).
  // A route may flip it (ROUTE.zoneOffset): Rio Bonito runs westwards and the Figma draws the colour line above it.
  let ZONE_OFFSET = -12;

  /* ---------- tiny DOM helper ---------- */
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === "style") e.style.cssText = attrs.style;
      else if (k === "class") e.className = attrs.class;
      else if (k === "html") e.innerHTML = attrs.html;
      else e.setAttribute(k, attrs[k]);
    }
    kids.flat().forEach((c) => c != null && e.append(c));
    return e;
  }

  /* chip pieces shared by the routes */
  const chipTime = (icon, t) => h("span", { class: "chip chip--time" }, h("img", { src: A + icon, alt: "" }), h("span", {}, t));
  const chipBus = () => h("span", { class: "chip" }, h("span", {}, "ônibus"), h("img", { src: A + "linha-tracejada-chip.svg", alt: "", style: "width:49.16px;height:1.25px;" }));
  const chipMetro = () => h("span", { class: "chip" }, h("span", {}, "metrô"), h("img", { src: A + "linha-metro-chip.svg", alt: "", style: "width:27.75px;height:5px;" }));
  const chipMoney = (v, icon) => h("span", { class: "chip" }, h("img", { src: A + (icon || "icon-attach-money.svg"), alt: "" }), h("span", {}, v));
  const chipBald = () => h("span", { class: "chip" },
    h("span", { class: "chip__bald", "aria-hidden": "true" }, h("img", { class: "o", src: A + "baldeacao-1.svg", alt: "" }), h("img", { class: "i", src: A + "baldeacao-2.svg", alt: "" })),
    h("span", {}, "baldeação"));
  const chipBarca = () => h("span", { class: "chip" }, h("span", {}, "barca"), h("span", { class: "chip__dots", "aria-hidden": "true" }));

  /* ============================== ROTAS ============================== */
  const ROUTES = {
    /* ---------------- Cosmos (zona oeste) → ESDI ---------------- */
    cosmos: {
      data: () => window.TRAJETO_COSMOS,
      hash: "#cosmos",
      title: A + "titulo-cosmos.png",
      homeLabel: "Cosmos, zona oeste → ESDI — voltar ao início do trajeto",
      mapLabel: "Mapa do trajeto de Cosmos, na Zona Oeste, até a ESDI, na Lapa: ônibus pela Zona Oeste até Coelho Neto, baldeação para o metrô pela Zona Norte até o Centro. Nas falas 2 e 3, arraste para explorar.",
      sound: true,
      falaVol: { inicio: 0.733, baldeacao: 0.75, final: 0.708 },   // all falas evened out to −20 LUFS (K-weighted)
      falas: { inicio: AU + "cosmos-fala-1.mp4", baldeacao: AU + "cosmos-fala-2.mp4", final: AU + "cosmos-fala-3.mp4" },
      chips: {
        inicio: () => [chipTime("icon-bedtime.svg", "05:00"), chipBus(), chipMoney("+R$4,70")],
        baldeacao: () => [
          h("p", { class: "chip-title" }, "[BALDEAÇÃO]"),
          chipTime("icon-wb-twilight.svg", "06:30"),
          h("span", { class: "chip chip--tight" },
            h("img", { src: A + "icon-directions-bus.svg", alt: "" }), h("span", {}, "ônibus"),
            h("img", { src: A + "icon-compare-arrows.svg", alt: "" }),
            h("img", { src: A + "icon-directions-subway.svg", alt: "" }), h("span", {}, "metrô")),
          chipMoney("+R$4,80", "icon-attach-money-2.svg")
        ],
        final: () => [
          chipMetro(),
          h("span", { class: "chip chip--time chip--two" }, h("img", { src: A + "icon-clear-day.svg", alt: "" }),
            h("span", { class: "t" }, h("span", { class: "late" }, h("span", { class: "sr-only" }, "horário previsto "), "08:00"), h("span", { class: "real" }, h("span", { class: "sr-only" }, "chegada "), "08:20")))
        ]
      },
      // where each chip group hangs, relative to its point (px, same offsets as the Figma "passo 1/2/3")
      chipAt: { inicio: [(P) => P.cosmos, [74, -34]], baldeacao: [(P) => P.baldeacao, [84, -70]], final: [(P) => P.esdi, [74, -61]] },
      relatos: {
        inicio: '<p>Quando eu saio de casa tá tudo escuro ainda… <b>Parece que eu perco boa parte da minha vida no transporte público</b>.</p><p>Porque, poxa, eu levo 2h30 pra ir e 2h30 pra voltar, <mark>são 5h que eu tô fora de casa, só em pé, no ônibus ou no metrô.</mark></p>',
        baldeacao: '<p>Quando eu consigo pegar um ônibus e um metrô, dá R$ 9,50 na ida e R$ 9,50 na volta, <mark>são quase R$ 20 por dia.</mark></p><p>Às vezes eu vinha andando da Central até a faculdade pra economizar passagem. Porque até cair a bolsa, que é retroativa, a gente ficou um mês sem receber...</p>',
        final: '<p>Metrô lotado, ônibus lotado, 1h30 naquele tranco dentro do ônibus pra eu chegar aqui e a pessoa me dar meia-falta... E ainda, né, me dá descrédito por isso.</p><p><mark>Perguntar se eu tô vindo do céu, essas coisas do tipo, sabe?</mark></p>'
      },
      resumo: {
        lead: "Saindo de Cosmos, ao todo, são atravessados <b>28 bairros</b> até a universidade",
        facts: "<p>Em 1 dia, mais de <mark>60 km são percorridos</mark></p><p>Em 1 semana, são <mark>25 horas</mark> no transporte público</p><p>Em 1 mês, são <mark>380 reais</mark> gastos com passagem</p>",
        alt: "Esquema do trajeto de Cosmos, na zona oeste, até a ESDI, na Lapa: ônibus pela zona oeste até Coelho Neto, onde há baldeação para o metrô, que segue pela zona norte até o centro."
      },
      legend: [["zo", "amarela", "da <b>zona oeste</b>"], ["zn", "verde", "da <b>zona norte</b>"], ["ce", "azul", "do <b>centro</b>"]],
      // extra room the camera keeps for chips / labels (desktop), per step
      pad: { inicio: { right: 230, bottom: 150 }, baldeacao: { right: 230, bottom: 70 }, final: { right: 230, bottom: 110 }, resumo: { left: 120, right: 60 } },
      padMobile: { inicio: { left: 120, right: 170 }, baldeacao: { left: 24, right: 245, top: 60 }, final: { left: 24, right: 205 }, resumo: { left: 34, right: 64, bottom: 44 } },
      rot: { zo: "rotate(-8.99deg) skewX(-1.87deg)", zn: "rotate(2deg)", ce: "rotate(-2deg)" },
      // fixed sides (chosen once so that no name touches another in any step, desktop or phone) — never change at runtime
      flip: [["campo grande", 8.68], ["santíssimo", 14.96], ["vila kennedy", 18.92], ["bangu", 21.52], ["padre miguel", 23.31], ["realengo", 25.05], ["magalhães bastos", 27.58],
             ["inhaúma", 43.35], ["del castilho", 45.16], ["maracanã", 52.18]],
      breaks: {
        "vila militar": "vila\nmilitar", "magalhães bastos": "magalhães\nbastos", "padre miguel": "padre\nmiguel",
        "vila kennedy": "vila\nkennedy", "vicente de carvalho": "vicente de\ncarvalho", "tomás coelho": "tomás\ncoelho",
        "engenho da rainha": "eng. da\nrainha", "del castilho": "del\ncastilho", "maria da graça": "maria da\ngraça",
        "praça da bandeira": "pça da\nbandeira", "coelho neto": "coelho\nneto"
      },
      markers: markersCosmos
    },

    /* ---------------- Nova Iguaçu (RMRJ) → ESDI ---------------- */
    novaiguacu: {
      data: () => window.TRAJETO_NOVAIGUACU,
      hash: "#nova-iguacu",
      title: NI + "titulo-nova-iguacu-novo.png?v=2",
      homeLabel: "Nova Iguaçu → ESDI — voltar ao início do trajeto",
      mapLabel: "Mapa do trajeto do centro de Nova Iguaçu até a ESDI, na Lapa: dois ônibus pela Baixada Fluminense (Mesquita, São João de Meriti) e pela Zona Norte até o Centro, onde há baldeação para o metrô. Nas falas 2 e 3, arraste para explorar.",
      sound: true,
      soundButton: false,                 // áudio toca, mas sem o botão de som no cartão
      falaVol: { inicio: 1, baldeacao: 0.871, final: 1 },         // all falas evened out to −20 LUFS (K-weighted); fala 3 is −20.6 already, so full volume
      falas: { inicio: AU + "novaiguacu-fala-1.m4a", baldeacao: AU + "novaiguacu-fala-2-remast.m4a", final: AU + "novaiguacu-fala-3.m4a?v=2" },
      chips: {
        inicio: () => [chipTime("icon-bedtime.svg", "05:20"), chipBus(), chipBald(), chipMoney("+R$9,40")],
        baldeacao: () => [chipTime("icon-clear-day.svg", "07:20")],
        final: () => [chipTime("icon-clear-day.svg", "08:00"), chipBald(), chipMetro(), chipMoney("+R$5,00")]
      },
      // Figma: passo 1 — chips under "centro, NOVA IGUAÇU", left of the pin · passo 2 — beside "pavuna" · passo 3 — under "ESDI"
      chipAt: { inicio: [(P) => P.inicio, [-145, 14]], baldeacao: [(P) => P.pavuna, [105, -155]], final: [(P) => P.esdi, [84, -62]] },
      // passo 3: chips BESIDE ESDI (right of its label), desktop and phones
      chipAtMobile: { inicio: [-118, 18], final: [70, -64] },
      // desktop · passo 3: ESDI (lapa) in the middle of the window
      centerOn: { final: (P) => P.esdi },
      relatos: {
        inicio: '<p>O segundo ônibus, que é o que leva mais tempo, <mark>a estrutura dele é péssima.</mark></p><p>Tem vezes de quebrar no meio da Brasil e eu ter que ficar lá parada esperando outro, fora que é que tem muito assalto, então, assim, é horrível.</p><p>Durante o trajeto <mark>sinto muito desgosto, muito medo...</mark></p>',
        baldeacao: '<p>O que mais me atrapalha é na questão de trabalho pós-aula.</p><p>Muitos trabalhos eu tinha que fazer meio correndo até 15h pra ficar um horário tranquilo pra eu voltar pra casa <mark>e aí acaba tendo um impacto negativo no meu desempenho acadêmico.</mark></p>',
        final: '<p>O auxílio moradia ia facilitar muito...</p><p>Um dos meus maiores planos desde que eu entrei era <b>me mudar pra poder ficar mais perto da faculdade.</b></p><p>Eu já uso os auxílios alimentação e transporte que não dá pra passagem e aí eu ia poder economizar com passagem, poder investir em moradia e <mark>isso ia melhorar muito mais minha rotina.</mark></p>'
      },
      resumo: {
        lead: "Saindo de Nova Iguaçu, ao todo, são atravessados <b>30 bairros</b> até a universidade",
        facts: "<p>Em 1 dia, mais de <mark>75 km são percorridos</mark></p><p>Em 1 semana, são <mark>25 horas</mark> no transporte público</p><p>Em 1 mês, são <mark>420 reais</mark> gastos com passagem</p>",
        alt: "Esquema do trajeto de Nova Iguaçu, na RMRJ, até a ESDI, na Lapa: ônibus por Mesquita e São João de Meriti e pela zona norte até o centro, onde há baldeação para o metrô."
      },
      legend: [["rm", "vermelha", "da <b>RMRJ</b>"], ["zn", "verde", "da <b>zona norte</b>"], ["ce", "azul", "do <b>centro</b>"]],
      pad: { inicio: { left: 160, right: 0, bottom: 170 }, baldeacao: { right: 140, bottom: 70, top: 40 }, final: { bottom: 70, top: 10 }, resumo: { left: 130, right: 60, top: 50 } },
      padMobile: { inicio: { left: 150, right: 100, top: 40, bottom: 70 }, baldeacao: { left: 24, right: 130, top: 90 }, final: { left: 24, right: 200, top: 70, bottom: 40 }, resumo: { left: 30, right: 64, top: 70 } },
      rot: { rm: "rotate(-9deg)", zn: "rotate(-5deg)", ce: "rotate(-5deg)" },
      // fixed sides (chosen once so that no name touches another in any step, desktop or phone) — never change at runtime
      flip: [["vila rosali", 9.27], ["parada de lucas", 18.02], ["cordovil", 19.19], ["brás de pina", 20.3]],
      right: [["BHN", 5.86], ["coelho da rocha", 7.31]],
      breaks: {
        "coelho da rocha": "coelho\nda rocha", "agostinho porto": "agostinho\nporto", "vila rosali": "vila\nrosali",
        "jardim meriti": "jardim\nmeriti", "parque colúmbia": "parque\ncolúmbia", "parada de lucas": "parada de\nlucas",
        "brás de pina": "brás de\npina", "penha circular": "penha\ncircular"
      },
      markers: markersNovaIguacu
    },

    /* ---------------- Rio Bonito (RMRJ) → ESDI ---------------- */
    riobonito: {
      data: () => window.TRAJETO_RIOBONITO,
      hash: "#rio-bonito",
      title: RB + "titulo-rio-bonito.png?v=2",
      homeLabel: "Rio Bonito → ESDI — voltar ao início do trajeto",
      mapLabel: "Mapa do trajeto do centro de Rio Bonito até a ESDI, na Lapa: ônibus por Tanguá, Itaboraí, São Gonçalo e Niterói, baldeação para a barca até o centro do Rio de Janeiro. Nas falas 2 e 3, arraste para explorar.",
      sound: true,
      falaVol: { inicio: 0.848, baldeacao: 0.859, final: 0.936 },  // all falas evened out to −20 LUFS (K-weighted)
      falas: { inicio: AU + "riobonito-fala-1.m4a", baldeacao: AU + "riobonito-fala-2.m4a", final: AU + "riobonito-fala-3.m4a" },
      zoneOffset: 12,                     // linha vermelha ACIMA da rota (o trajeto corre para oeste)
      chips: {
        inicio: () => [chipTime("icon-bedtime.svg", "05:30"), chipBus()],
        baldeacao: () => [chipTime("icon-wb-twilight.svg", "06:15")],
        final: () => [h("p", { class: "chip-title" }, "[BALDEAÇÃO]"), chipTime("icon-clear-day.svg", "07:30"), chipBarca(), chipMoney("+R$4,70", "icon-attach-money-2.svg")]
      },
      // Figma: passo 1 — right of the start pin · passo 2 — left of the "gebara" bar · passo 3 — right of the baldeação
      chipAt: { inicio: [(P) => P.inicio, [46, -34]], baldeacao: [(P) => P.gebara, [-114, -28]], final: [(P) => P.baldeacao, [45, -12]] },
      chipAtMobile: { inicio: [46, -34], baldeacao: [-108, -24], final: [-118, 30] },
      relatos: {
        inicio: '<p>Qualquer coisa me atrasa 40 minutos e aí eu demorava muito, saia de casa, pegava o primeiro ônibus, <mark>ia correndo até a barca, pra chegar aqui 20 minutos atrasada e levar falta...</mark></p><p>Eu ficava muito chateada, vinha correndo da Praça XV até aqui, chegava esbaforida...</p>',
        baldeacao: '<p>Tem muita coisa que eu já deixei de vir aqui tipo festa, palestra…</p><p>No primeiro Pavão eu não fiquei em quase nenhuma oficina porque 18h era meu limite mesmo se eu quisesse pagar a passagem <mark>meu último ônibus é 19h30/20h</mark></p>',
        final: '<p>São 10 matérias, com 10 trabalhos, com 4 ou 5 horas de deslocamento diário.</p><p><mark>A conta simplesmente não fecha.</mark></p><p>Se eu tivesse a oportunidade de pegar tipo 3 matérias a menos já me ajudaria muito, seria bem mais tranquilo</p>'
      },
      resumo: {
        lead: "Saindo de Rio Bonito, ao todo, são atravessados <b>32 bairros</b> até a universidade",
        facts: "<p>Em 1 dia, mais de <mark>140 km são percorridos</mark></p><p>Em 1 semana, são <mark>25 horas</mark> no transporte público</p><p>Em 1 mês, são <mark>180 reais</mark> gastos com passagem</p>",
        alt: "Esquema do trajeto de Rio Bonito, na RMRJ, até a ESDI, na Lapa: ônibus por Tanguá, Itaboraí, São Gonçalo e Niterói, onde há baldeação para a barca até o centro do Rio de Janeiro."
      },
      legend: [["rm", "vermelha", "da <b>RMRJ</b>"], ["ce", "azul", "do <b>centro</b>"]],
      pad: { inicio: { right: 330, bottom: 120 }, baldeacao: { left: 200, right: 80, bottom: 120 }, final: { left: 160, right: 200, bottom: 200 } },
      padMobile: { inicio: { left: 24, right: 190, top: 60 }, baldeacao: { left: 140, right: 24, top: 60 }, final: { left: 85, right: 30, top: 60, bottom: 110 } },
      // fixed sides (chosen once so that no name touches another in any step, desktop or phone) — never change at runtime
      flip: [["centro", 59.96], ["santo expedito", 29.59], ["retiro são joaquim", 30.89], ["vila gabriela", 33.21],
             ["manilha", 34.77], ["aldeia da prata", 35.92], ["neves", 55.08]],
      right: [["ampliação", 26.55]],
      rot: { rm: "rotate(-6deg)", ce: "rotate(-6deg)" },
      breaks: {
        "outeiro das pedras": "outeiro das\npedras", "santo expedito": "santo\nexpedito", "retiro são joaquim": "retiro são\njoaquim",
        "vila gabriela": "vila\ngabriela", "aldeia da prata": "aldeia\nda prata", "santa luzia": "santa\nluzia",
        "jardim santa catarina": "jardim santa\ncatarina", "recanto das acácias": "recanto das\nacácias", "porto da rosa": "porto\nda rosa",
        "boa vista": "boa\nvista", "porto da pedra": "porto\nda pedra", "porto novo": "porto\nnovo", "porto velho": "porto\nvelho"
      },
      markers: markersRioBonito
    }
  };

  let routeId = "cosmos";
  let ROUTE = ROUTES.cosmos;
  let D = null;                // current route data

  /* ---------- relatos ---------- */
  const VOL = () => h("button", { class: "card__vol" + (Sound.muted ? " is-muted" : ""), type: "button", "data-nav": "sound",
    "aria-pressed": String(Sound.muted), "aria-label": Sound.muted ? "ligar o som" : "desligar o som" },
    h("img", { src: A + "icon-volume.svg", alt: "" }));
  const Q1 = () => h("img", { class: "card__q1", src: A + "aspas-abre.svg", alt: "" });
  const Q2 = () => h("img", { class: "card__q2", src: A + "aspas-fecha.svg", alt: "" });
  const STACK_MOBILE_TOP = { 1: [518], 2: [486, 500], 3: [502, 512, 522], r: [503] };

  /* ---------- áudio: fala de cada passo (ROUTE.falas) + o mesmo fundo de transporte em loop em todos os trajetos ---------- */
  const Sound = (function () {
    // o arquivo de fundo já vem mixado (−26 LUFS): toca a 100% e abaixa enquanto uma fala toca
    // falas are at −20 LUFS; duck 0.30 → fundo ≈ −36 LUFS under the voice (~16 dB below it)
    const FUNDO_SRC = "assets/audio/fundo-transito.m4a?v=2";   // 72 s cut from background_traffic_audio.mp3, end crossfaded into the start → seamless loop
    const FUNDO_VOL = 1, FUNDO_DUCK = 0.3, FALA_VOL = 1;
    const FADE_IN = 2500;                                   // ms — fundo entra aos poucos ao abrir cada trajeto
    const mk = (src, loop) => { const a = new Audio(src); a.preload = "auto"; a.loop = !!loop; a.volume = 0; return a; };
    let fundo = null, falas = {}, current = null, muted = false, active = false, wanted = null, pending = false;
    const fades = new WeakMap(), cache = new Map();   // one Audio per file, reused when coming back to a route

    function fade(a, to, ms) {
      cancelAnimationFrame(fades.get(a));
      const from = a.volume, t0 = performance.now();
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / ms);
        a.volume = Math.min(1, Math.max(0, from + (to - from) * k));
        if (k < 1) fades.set(a, requestAnimationFrame(tick));
        else if (to === 0) a.pause();
      };
      fades.set(a, requestAnimationFrame(tick));
    }

    /* fundo em loop pela Web Audio: emenda sem nenhum clique/silêncio (o <audio loop> deixa um buraco a cada volta)
       e o volume (duck) funciona também no iPhone, que ignora audio.volume. Sem Web Audio → cai no <audio loop>. */
    function mkFundo(src) {
      const AC = window.AudioContext || window.webkitAudioContext;
      let bytes = null, ctx = null, gain = null, buf = null, node = null, decoding = null, el = null;
      let want = false, level = 0, sleepT = 0;
      // baixa o arquivo cedo (sem tocar nada), pra já estar pronto quando um trajeto abrir
      const prefetch = () => { if (!bytes && AC) bytes = fetch(src).then((r) => { if (!r.ok) throw 0; return r.arrayBuffer(); }).catch(() => null); };
      function fallback() { if (!el) { el = mk(src, true); el.volume = level; } return el; }
      function decode() {
        if (decoding) return decoding;
        prefetch();
        decoding = (bytes || Promise.resolve(null)).then((b) => b && new Promise((ok, no) => ctx.decodeAudioData(b, ok, no)))
          .then((b) => { buf = b || null; }).catch(() => { buf = null; });
        return decoding;
      }
      function ensureCtx() {
        if (ctx || !AC) return !!ctx;
        try {
          if (navigator.audioSession) navigator.audioSession.type = "playback";   // iOS: toca mesmo com o modo silencioso, como as falas
          ctx = new AC(); gain = ctx.createGain(); gain.gain.value = level; gain.connect(ctx.destination);
        } catch (e) { ctx = null; }
        return !!ctx;
      }
      function startNode() {
        if (!want || node || !buf) return;
        node = ctx.createBufferSource(); node.buffer = buf; node.loop = true; node.connect(gain);
        // entra devagar ao abrir o trajeto (rampa no relógio do áudio: começa junto com o som, mesmo se o arquivo demorar)
        const g = gain.gain, now = ctx.currentTime;
        g.cancelScheduledValues(now); g.setValueAtTime(0, now); g.linearRampToValueAtTime(level, now + FADE_IN / 1000);
        node.start(now);
      }
      function play() {
        want = true; clearTimeout(sleepT);
        if (el || !ensureCtx()) { tryPlay(fallback()); return; }
        // resume() tem que sair de dentro do clique (iOS); se o navegador ainda não deixar, espera o 1º toque
        const r = ctx.resume(); if (r && r.catch) r.catch(() => {});
        setTimeout(() => { if (want && ctx.state !== "running") waitForGesture(); }, 400);
        decode().then(() => { if (buf) startNode(); else if (want) { ctx.close(); ctx = null; tryPlay(fallback()); } });
      }
      function pause() { clearTimeout(sleepT); if (el) el.pause(); else if (ctx) ctx.suspend(); }
      function fadeTo(to, ms) {
        level = to; clearTimeout(sleepT);
        if (el) { fade(el, to, el.volume === 0 && to > 0 ? Math.max(ms, FADE_IN) : ms); return; }
        if (!ctx || !node) return;                          // ainda não começou: startNode faz o fade in até `level`
        const g = gain.gain, now = ctx.currentTime;
        g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(to, now + ms / 1000);
        if (to === 0) sleepT = setTimeout(pause, ms + 50);    // mudo: dorme o contexto pra não gastar bateria
      }
      function stop() {
        want = false; level = 0; clearTimeout(sleepT);
        if (el) { cancelAnimationFrame(fades.get(el)); el.pause(); el.currentTime = 0; el.volume = 0; }
        if (node) { try { node.stop(); } catch (e) {} node.disconnect(); node = null; }
        if (ctx) { gain.gain.cancelScheduledValues(0); gain.gain.value = 0; ctx.suspend(); }
      }
      const paused = () => el ? el.paused : !(ctx && node && ctx.state === "running");
      const volume = () => el ? el.volume : gain ? gain.gain.value : 0;
      return { prefetch, play, pause, fadeTo, stop, paused, volume };
    }
    function tryPlay(a) {
      const p = a.play();
      if (p && p.catch) p.catch(() => waitForGesture());
    }
    // autoplay bloqueado (ex.: abriu #cosmos direto): toca no primeiro toque/tecla
    function waitForGesture() {
      if (pending) return;
      pending = true;
      const go = () => { pending = false; ["pointerdown", "keydown"].forEach((e) => window.removeEventListener(e, go, true)); if (active) set(wanted, true); };
      ["pointerdown", "keydown"].forEach((e) => window.addEventListener(e, go, true));
    }
    function init() {
      fundo = mkFundo(FUNDO_SRC);
      (window.requestIdleCallback || ((f) => setTimeout(f, 3000)))(() => fundo.prefetch());
      document.addEventListener("visibilitychange", () => {
        if (!active) return;
        if (document.hidden) { fundo.pause(); current && current.pause(); }
        else if (!muted) { fundo.play(); current && !current.ended && current.currentTime > 0 && tryPlay(current); }
      });
    }
    // fundo toca em todos os passos, do início ao resumo; só abaixa enquanto há fala
    function set(step, force) {
      wanted = step;
      if (!active || muted) return;
      const next = falas[step] || null;
      if (current && current !== next) { const c = current; fade(c, 0, 250); setTimeout(() => { if (c !== current) c.currentTime = 0; }, 260); }
      fundo.play();
      fundo.fadeTo(next ? FUNDO_DUCK : FUNDO_VOL, 700);
      if (next && (next !== current || force)) {
        cancelAnimationFrame(fades.get(next));
        next.currentTime = 0;
        next.volume = FALA_VOL * (next._vol || 1);
        tryPlay(next);
      }
      current = next;
    }
    // the falas of the route being opened ({ inicio, baldeacao, final } → file)
    function load(paths, vols) {
      falas = {};
      for (const k in paths || {}) {
        let a = cache.get(paths[k]);
        if (!a) {
          a = mk(paths[k]);
          a.addEventListener("ended", () => { if (current === a && !muted) fundo.fadeTo(FUNDO_VOL, 600); });
          cache.set(paths[k], a);
        }
        a._vol = (vols && vols[k]) || 1;          // per-fala volume (ROUTE.falaVol), to even out recordings
        falas[k] = a;
      }
    }
    function start(step) { active = true; set(step, true); }
    /* while the loading screen is up: the traffic background already fades in, and the first fala is "unlocked"
       inside the click (play + pause, silent) so it can start on its own when the screen goes away (iOS) */
    function warm(step) {
      active = true; wanted = step;
      if (muted) return;
      fundo.play();
      fundo.fadeTo(FUNDO_VOL, 700);
      const a = falas[step];
      if (a) { a.volume = 0; const p = a.play(); if (p && p.then) p.then(() => { if (current !== a) { a.pause(); a.currentTime = 0; } }).catch(() => {}); }
    }
    function stop() {
      active = false;
      if (fundo) fundo.stop();
      [...cache.values()].forEach((a) => { cancelAnimationFrame(fades.get(a)); a.pause(); a.currentTime = 0; a.volume = 0; });
      current = null;
    }
    function toggleMute() {
      muted = !muted;
      if (muted) { fundo.fadeTo(0, 250); Object.values(falas).forEach((a) => fade(a, 0, 250)); }
      else { current = null; set(wanted, true); }
      return muted;
    }
    const state = () => ({ muted, active, fundo: fundo && { paused: fundo.paused(), vol: +fundo.volume().toFixed(2) },
      falas: Object.fromEntries(Object.entries(falas).map(([k, a]) => [k, { paused: a.paused, t: +a.currentTime.toFixed(1) }])) });
    return { init, load, start, warm, stop, set, toggleMute, state, get muted() { return muted; } };
  })();

  /* ---------- dica sutil "arraste" (falas 2 e 3) — some ao primeiro arrasto ---------- */
  const Hint = (function () {
    let el = null, timer = 0, dragged = false;
    // desktop: fixed to the window (bottom centre). phone: the relato card fills the bottom of the screen,
    // so the hint goes back into the scaled canvas, right above the card.
    function place() {
      const host = root.classList.contains("is-mobile") ? canvas : root;
      if (el.parentNode !== host) host.append(el);
    }
    function build(parent) {
      el = h("div", { class: "drag-hint", "aria-hidden": "true" });
      el.innerHTML =
        '<svg viewBox="0 0 44 16" width="44" height="16" aria-hidden="true">' +
        '<path d="M6 3 1 8l5 5M38 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle class="dot" cx="22" cy="8" r="3.2" fill="currentColor"/></svg>' +
        "<span>arraste para descobrir mais</span>";
      parent.append(el);
    }
    function hide() { if (el) el.classList.remove("is-on"); clearTimeout(timer); }
    function update(step) {
      if (!el) return;
      hide();
      if (dragged || !INTERACTIVE[step]) return;
      timer = setTimeout(() => {
        place();
        el.classList.add("is-on");
        timer = setTimeout(hide, 7000);
      }, 1700);
    }
    function used() { dragged = true; hide(); }
    return { build, update, hide, used };
  })();

  /* ============================== MAPA ============================== */
  let mapRef = null;          // the current MapLibre map (markers helpers below use it)
  // alt = [lngLat, offset] used in the resumo, where the route is drawn simplified (Nova Iguaçu)
  let placed = [];
  function marker(el, lngLat, anchor, offset, alt) {
    const m = new maplibregl.Marker({ element: el, anchor: anchor || "center", offset: offset || [0, 0] }).setLngLat(lngLat).addTo(mapRef);
    if (alt && alt[0]) placed.push({ m, pos: [lngLat, offset || [0, 0]], alt: [alt[0], alt[1] || offset || [0, 0]] });
    return m;
  }
  let resumoPos = false;
  function placeForResumo(on) {
    if (on === resumoPos) return;
    resumoPos = on;
    placed.forEach((p) => { const [ll, off] = on ? p.alt : p.pos; p.m.setLngLat(ll).setOffset(off); });
  }
  const altTick = (s) => s.lngLatR ? [s.lngLatR, offsetAlong(s.normalR, -ZONE_OFFSET)] : null;
  const altPt = (pt, off) => pt.lngLatR ? [pt.lngLatR, off] : null;
  const offsetAlong = (normal, px) => [normal[0] * px, normal[1] * px];

  /* station ticks (thin coloured tick + rotated italic name). Every bairro has the SAME height on every route —
     the height itself says "bairro" (municipality bars are taller). The side of each name is fixed here, once:
     it never changes with the zoom, the drag or the step. */
  const TICK_H = 64;
  function tickHeights() {
    const tall = new Map();
    D.stations.forEach((s) => tall.set(s, ROUTE.tick || TICK_H));
    return tall;
  }
  // screen direction of travel from the station's left normal: t = (-n.y, n.x)
  const steepUpRight = (n) => { const tx = -n[1], ty = n[0]; return Math.abs(ty) > 1.2 * Math.abs(tx) && tx * ty < 0; };
  function stationTick(s, tall, rot) {
    // name on the LEFT of its tick when: a big place label follows closely, the route is forced (ROUTE.flip),
    // or the line climbs almost vertically to the right (a name on the right would sit on the route itself)
    const i = D.stations.indexOf(s), nx = D.stations[i + 1];
    const listed = (list) => !!(list && list.some((f) => Array.isArray(f) ? f[0] === s.name && Math.abs(f[1] - s.km) < 0.3 : f === s.name));
    const left = !listed(ROUTE.right) && (!!(nx && nx.place && nx.km - s.km < 1.6) || listed(ROUTE.flip) || steepUpRight(s.normal));
    const el = h("div", { class: "st st--" + s.zone + (left ? " st--flip" : ""), "data-show": s.show + " r", "data-side": left ? "l" : "r", "data-km": s.km, style: `--tall:${tall}px` },
      h("span", { class: "st__tk" }),
      h("span", { class: "st__lb", style: `transform:${rot || ROUTE.rot[s.zone]}` }, ROUTE.breaks[s.name] || s.name));    el.title = s.name;
    // touch (resumo): tap a tick to read its name — the mouse uses :hover
    el.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" || step !== "resumo") return;
      e.stopPropagation();
      const on = !el.classList.contains("is-peek");
      document.querySelectorAll("#cosmos .st.is-peek").forEach((x) => x.classList.remove("is-peek"));
      el.classList.toggle("is-peek", on);
    });
    marker(el, s.lngLat, "bottom", offsetAlong(s.normal, -ZONE_OFFSET), altTick(s));
  }
  // start / end pins sit between the route and its colour line, covering both
  const pinOff = (n) => offsetAlong(n, -ZONE_OFFSET / 2);
  const pinAlt = (pt) => pt.lngLatR ? [pt.lngLatR, pinOff(pt.normalR)] : null;
  // chips hang from a point; phones may use their own offset (ROUTE.chipAtMobile[step] = [dx, dy])
  let chipMarkers = [];
  const chipOffset = (k) => (isMobile() && ROUTE.chipAtMobile && ROUTE.chipAtMobile[k]) || ROUTE.chipAt[k][1];
  function addChips(step) {
    chipMarkers = [];
    Object.keys(ROUTE.chipAt).forEach((k) => {
      const [pt] = ROUTE.chipAt[k];
      const g = h("div", { class: "chip-group" + (k === step ? " is-on" : ""), "data-for": k }, ROUTE.chips[k]());
      chipMarkers.push([k, marker(h("div", { class: "chip-anchor" }, g), pt(D.points).lngLat, "top-left", chipOffset(k))]);   // wrapper: MapLibre owns its transform
    });
  }
  const updateChipOffsets = () => chipMarkers.forEach(([k, m]) => m.setOffset(chipOffset(k)));
  function esdiEnd(P) {
    marker(h("div", { class: "pin pin--end", "data-show": "f r" }, h("img", { src: A + "final-esdi.svg", alt: "" })), P.esdi.lngLat, "center", pinOff(P.esdi.normal), pinAlt(P.esdi));
    marker(h("div", { class: "esdi-lb", "data-show": "f r" }, h("b", {}, "ESDI"), h("i", {}, "lapa")), P.esdi.lngLat, "left", [26, 8], altPt(P.esdi, [26, 8]));
  }
  function transfer(lngLat, show, cls, alt) {
    marker(h("div", { class: "bald2" + (cls ? " " + cls : ""), "data-show": show },
      h("img", { class: "o", src: A + "baldeacao-1.svg", alt: "" }), h("img", { class: "i", src: A + "baldeacao-2.svg", alt: "" })),
      lngLat, "center", null, alt);
  }

  /* Cosmos: start / transfer (Coelho Neto) / end + big place labels */
  function markersCosmos(step) {
    const P = D.points;
    const tall = tickHeights();
    D.stations.forEach((s) => {
      if (s.name === "cidade nova") return;                 // drawn as a big place label below
      stationTick(s, tall.get(s), s.name === "guadalupe" ? "rotate(-10.09deg) skewX(-3.76deg)" : null);
    });
    // cidade nova, CENTRO (big label on a tick) — final
    const cn = D.stations.find((s) => s.name === "cidade nova");
    marker(h("div", { class: "st st--ce st--place", "data-show": "f r", style: "--tall:84px" },
      h("span", { class: "st__tk" }),
      h("span", { class: "place place--up" }, h("span", { class: "n" }, "cidade nova,"), h("span", { class: "z", style: "color:var(--azul-medio)" }, "CENTRO"))),
      cn.lngLat, "bottom", offsetAlong(cn.normal, -ZONE_OFFSET));
    // coelho neto, ZONA NORTE (big label above the transfer) — baldeação
    marker(h("div", { class: "st st--zn st--place", "data-show": "b r", style: "--tall:84px" },
      h("span", { class: "st__tk" }),
      h("span", { class: "place place--up" }, h("span", { class: "n" }, "coelho neto,"), h("span", { class: "z", style: "color:var(--verde)" }, "ZONA NORTE"))),
      P.baldeacao.lngLat, "bottom", [0, 0]);
    transfer(P.baldeacao.lngLat, "b f r", "bald2--b");
    // start: cosmos, ZONA OESTE
    marker(h("div", { class: "pin", "data-show": "i b f r" }, h("img", { src: A + "inicio-cosmos.svg", alt: "" })), P.cosmos.lngLat, "center", pinOff(P.cosmos.normal));
    marker(h("div", { class: "place place--left", "data-show": "i b f r" }, h("span", { class: "n" }, "cosmos,"), h("span", { class: "z", style: "color:var(--amarelo-label)" }, "ZONA OESTE")),
      P.cosmos.lngLat, "right", [-34, 18]);
    esdiEnd(P);
    addChips(step);
  }

  /* Nova Iguaçu: start (centro, NOVA IGUAÇU) / 2 transfers / end; municipality boundaries as thick bars */
  function markersNovaIguacu(step) {
    const P = D.points;
    const tall = tickHeights();
    const ZC = { rm: "var(--vermelho)", zn: "var(--verde)", ce: "var(--azul-medio)" };
    D.stations.forEach((s) => {
      const pl = s.place;
      if (!pl) { stationTick(s, tall.get(s)); return; }
      if (pl.style === "bar") {
        // thick bar + "bairro / MUNICÍPIO / região" (Figma: mesquita, são joão de meriti, pavuna)
        const i = D.stations.indexOf(s);
        const nextBar = D.stations.slice(i + 1).find((x) => x.place && x.place.style === "bar");
        const left = nextBar && nextBar.km - s.km < 3;     // resumo: write this one on the left of its bar
        marker(h("div", { class: "st st--" + s.zone + " st--bar" + (left ? " st--bar-l" : ""), "data-show": s.show + " r", style: "--tall:118px" },
          h("span", { class: "st__tk" }),
          h("span", { class: "place place--bar" },
            h("span", { class: "n" }, s.name), h("span", { class: "z", style: `color:${ZC[s.zone]}` }, pl.city),
            h("span", { class: "r", style: `color:${ZC[s.zone]}` }, pl.region))),
          s.lngLat, "bottom", offsetAlong(s.normal, -ZONE_OFFSET), altTick(s));
      } else {
        // "santo cristo, CENTRO" — thin tick with the big label on top
        marker(h("div", { class: "st st--" + s.zone + " st--place", "data-show": s.show + " r", style: "--tall:96px" },
          h("span", { class: "st__tk" }),
          h("span", { class: "place place--up" }, h("span", { class: "n" }, s.name + ","), h("span", { class: "z", style: `color:${ZC[s.zone]}` }, pl.city))),
          s.lngLat, "bottom", offsetAlong(s.normal, -ZONE_OFFSET), altTick(s));
      }
    });
    transfer(P.baldeacoes[0].lngLat, P.baldeacoes[0].show, "bald2--i", altPt(P.baldeacoes[0]));
    transfer(P.baldeacoes[1].lngLat, P.baldeacoes[1].show, "bald2--f", altPt(P.baldeacoes[1]));
    // start: centro, NOVA IGUAÇU, RMRJ (left of the pin)
    marker(h("div", { class: "pin pin--ni", "data-show": "i b f r" }, h("img", { src: NI + "inicio-nova-iguacu.svg", alt: "" })), P.inicio.lngLat, "center", pinOff(P.inicio.normal), pinAlt(P.inicio));
    marker(h("div", { class: "place place--left place--ni", "data-show": "i b f r" },
      h("span", { class: "n" }, "centro,"), h("span", { class: "z", style: "color:var(--vermelho)" }, "NOVA IGUAÇU"),
      h("span", { class: "r", style: "color:var(--vermelho)" }, "RMRJ")),
      P.inicio.lngLat, "bottom-right", [-36, 6], altPt(P.inicio, [-36, 6]));
    esdiEnd(P);
    addChips(step);
  }

  /* Rio Bonito: start (centro, RIO BONITO) / municipality bars (Tanguá, Itaboraí, São Gonçalo, Niterói) /
     baldeação at the barca terminal / "centro, RIO DE JANEIRO" (thick blue bar) / ESDI with its name on the LEFT */
  function markersRioBonito(step) {
    const P = D.points;
    const tall = tickHeights();
    const ZC = { rm: "var(--vermelho)", ce: "var(--azul-medio)" };
    D.stations.forEach((s) => {
      const pl = s.place;
      if (!pl) { stationTick(s, tall.get(s)); return; }
      const base = [s.lngLat, "bottom", offsetAlong(s.normal, -ZONE_OFFSET)];
      if (pl.style === "bar") {
        marker(h("div", { class: "st st--" + s.zone + " st--bar", "data-show": s.show, style: "--tall:118px" },
          h("span", { class: "st__tk" }),
          h("span", { class: "place place--bar" },
            h("span", { class: "n" }, s.name), h("span", { class: "z", style: `color:${ZC[s.zone]}` }, pl.city),
            h("span", { class: "r", style: `color:${ZC[s.zone]}` }, pl.region))), ...base);
      } else {
        // "centro, RIO DE JANEIRO": thick blue bar with the big label on top (Figma passo 3)
        marker(h("div", { class: "st st--" + s.zone + " st--bar st--place", "data-show": s.show, style: "--tall:118px" },
          h("span", { class: "st__tk" }),
          h("span", { class: "place place--up" }, h("span", { class: "n" }, s.name + ","), h("span", { class: "z", style: `color:${ZC[s.zone]}` }, pl.city))), ...base);
      }
    });
    transfer(P.baldeacao.lngLat, P.baldeacao.show, "bald2--f");
    // start: centro, RIO BONITO, RMRJ (above the pin, as in the Figma)
    marker(h("div", { class: "pin pin--ni", "data-show": "i b f" }, h("img", { src: NI + "inicio-nova-iguacu.svg", alt: "" })), P.inicio.lngLat, "center", pinOff(P.inicio.normal));
    marker(h("div", { class: "place place--ni", "data-show": "i b f" },
      h("span", { class: "n" }, "centro,"), h("span", { class: "z", style: "color:var(--vermelho)" }, "RIO BONITO"),
      h("span", { class: "r", style: "color:var(--vermelho)" }, "RMRJ")),
      P.inicio.lngLat, "bottom-left", [-20, -36]);
    // end: ESDI / lapa on the LEFT of the pin (the route arrives from the right)
    marker(h("div", { class: "pin pin--end", "data-show": "f" }, h("img", { src: A + "final-esdi.svg", alt: "" })), P.esdi.lngLat, "center", pinOff(P.esdi.normal));
    marker(h("div", { class: "esdi-lb esdi-lb--left", "data-show": "f" }, h("b", {}, "ESDI"), h("i", {}, "lapa")), P.esdi.lngLat, "right", [-26, 8]);
    addChips(step);
  }

  const MapView = (function () {
    let map = null, ready = false, failed = false, queued = null, watchdog = 0, readyPoll = 0;
    let zoneSegs = [], FRAME = {}, FRAME_MOBILE = {};
    const LINE_W = { zone: 2.5, bus: 2.5, metro: 6.5, barca: 4.5 };
    const LINE_W_THICK = { zone: 2, bus: 2, metro: 5, barca: 3.5 };   // phone resumo: thinner than the steps (route drawn small)
    const LINE_W_MOBILE = { zone: 2, bus: 2, metro: 5, barca: 3.6 };  // phone, passos 1–3: ~80% of the desktop strokes

    function bboxOf(coords) {
      let w = 180, s = 90, e = -180, n = -90;
      coords.forEach(([x, y]) => { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); });
      return [[w, s], [e, n]];
    }

    /* base map: grey "paper" — same mood as the FUNDO image (light roads, pale water, no labels) */
    function style() {
      return {
        version: 8,
        sources: { omt: { type: "vector", url: "https://tiles.openfreemap.org/planet" } },
        layers: [
          { id: "bg", type: "background", paint: { "background-color": "#e7e6e4" } },
          { id: "park", type: "fill", source: "omt", "source-layer": "park", paint: { "fill-color": "#e1e0dd", "fill-opacity": 0.7 } },
          { id: "landcover", type: "fill", source: "omt", "source-layer": "landcover", filter: ["in", ["get", "class"], ["literal", ["wood", "grass", "scrub"]]], paint: { "fill-color": "#e2e1de", "fill-opacity": 0.6 } },
          { id: "water", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": "#f3f3f2" } },
          // streets: only the main network, thin and faint (minor streets / buildings / rail removed — less noise)
          { id: "roads-mid", type: "line", source: "omt", "source-layer": "transportation", minzoom: 12.5,
            filter: ["in", ["get", "class"], ["literal", ["secondary"]]],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#f3f3f2", "line-opacity": 0.5, "line-width": ["interpolate", ["linear"], ["zoom"], 12.5, 0.6, 15, 2] } },
          { id: "roads-major", type: "line", source: "omt", "source-layer": "transportation",
            filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary"]]],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#f4f4f3", "line-opacity": 0.7, "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.6, 12, 1.6, 15, 3.5] } }
        ]
      };
    }

    /* Parallel colour line. MapLibre's own "line-offset" renders some stretches as a hairline at certain zooms,
       so the parallel line is computed here instead: offset by a fixed number of SCREEN pixels at the current
       zoom (mitred joins, bevelled when the turn is sharp) and recomputed whenever the zoom changes. */
    const feature = (coords) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } });
    const merc = (c) => maplibregl.MercatorCoordinate.fromLngLat({ lng: c[0], lat: c[1] });
    function offsetLine(pts, d) {            // pts in mercator units (y grows downward, like the screen); d > 0 = left
      const n = pts.length, out = [];
      const nrm = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1; return [dy / L, -dx / L]; };
      for (let i = 0; i < n; i++) {
        const p = pts[i];
        const n1 = i > 0 ? nrm(pts[i - 1], p) : null, n2 = i < n - 1 ? nrm(p, pts[i + 1]) : null;
        if (!n1 || !n2) { const k = n1 || n2; out.push([p.x + k[0] * d, p.y + k[1] * d]); continue; }
        let mx = n1[0] + n2[0], my = n1[1] + n2[1];
        const ml = Math.hypot(mx, my);
        const cos = ml / 2;                          // cos of half the turn angle
        if (ml < 1e-6 || cos < 0.5) {                // sharp turn → bevel
          out.push([p.x + n1[0] * d, p.y + n1[1] * d], [p.x + n2[0] * d, p.y + n2[1] * d]);
        } else {
          mx /= ml; my /= ml;
          const len = d / cos;
          out.push([p.x + mx * len, p.y + my * len]);
        }
      }
      return out.map(([x, y]) => { const ll = new maplibregl.MercatorCoordinate(x, y).toLngLat(); return [ll.lng, ll.lat]; });
    }
    let offsetZoom = null, offsetQueued = false;
    function updateOffsets() {
      offsetQueued = false;
      if (!map) return;
      const z = map.getZoom();
      if (offsetZoom !== null && Math.abs(z - offsetZoom) < 0.01) return;
      offsetZoom = z;
      const d = -ZONE_OFFSET / (512 * Math.pow(2, z));    // px → mercator units
      const outs = zoneSegs.map((s) => offsetLine(s.merc, d));
      // where one colour line ends and the next begins (red → blue…), meet at one mitred corner — no gap
      zoneSegs.forEach((a, i) => zoneSegs.forEach((b, k) => {
        if (i === k || a.merc.length < 2 || b.merc.length < 2) return;
        const ja = a.merc[a.merc.length - 1], jb = b.merc[0];
        if (Math.abs(ja.x - jb.x) > 1e-12 || Math.abs(ja.y - jb.y) > 1e-12) return;
        const c3 = offsetLine([a.merc[a.merc.length - 2], ja, b.merc[1]], d);
        const join = c3.length === 3 ? c3[1] : [(c3[1][0] + c3[2][0]) / 2, (c3[1][1] + c3[2][1]) / 2];
        outs[i][outs[i].length - 1] = join; outs[k][0] = join;
      }));
      zoneSegs.forEach((s, i) => { const src = map.getSource(s.id); if (src) src.setData(feature(outs[i])); });
    }
    const queueOffsets = () => { if (!offsetQueued) { offsetQueued = true; requestAnimationFrame(updateOffsets); } };

    /* halftone texture ON THE MAP ONLY: a tiny WebGL layer drawn right above the streets and below the route.
       The dots are computed in SCREEN pixels (3 px grid, like the Figma "TEXTURA HALFTONE"), so they never scale
       with the zoom; nothing to download, one full-screen quad per frame. If WebGL refuses it, the map just has no texture. */
    function addHalftone() {
      if (map.getLayer("halftone")) return;
      let prog = null, buf = null, uRatio = null, aPos = -1, mref = null;
      map.addLayer({
        id: "halftone", type: "custom", renderingMode: "2d",
        onAdd(m, gl) {
          mref = m;
          const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
          prog = gl.createProgram();
          gl.attachShader(prog, sh(gl.VERTEX_SHADER, "attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }"));
          gl.attachShader(prog, sh(gl.FRAGMENT_SHADER,
            "precision mediump float; uniform float r;" +
            // grid turned 15° (classic halftone screen angle), like the intro background's halftone
            "void main(){ vec2 q = mat2(0.9659, 0.2588, -0.2588, 0.9659) * gl_FragCoord.xy;" +
            " vec2 p = mod(q, 3.0 * r) - 1.5 * r;" +
            " float a = (1.0 - smoothstep(0.75 * r, 1.1 * r, length(p))) * 0.06;" +   // intensidade do halftone (era 0.09)
            " gl_FragColor = vec4(vec3(0.0235, 0.0353, 0.1333) * a, a); }"));   // #060922, premultiplied
          gl.linkProgram(prog);
          if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { prog = null; return; }
          aPos = gl.getAttribLocation(prog, "a");
          uRatio = gl.getUniformLocation(prog, "r");
          buf = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buf);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        },
        render(gl) {
          if (!prog) return;
          gl.useProgram(prog);
          gl.uniform1f(uRatio, (mref && mref.getPixelRatio && mref.getPixelRatio()) || window.devicePixelRatio || 1);   // canvas px per CSS px
          gl.bindBuffer(gl.ARRAY_BUFFER, buf);
          gl.enableVertexAttribArray(aPos);
          gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
          gl.disable(gl.DEPTH_TEST); gl.disable(gl.STENCIL_TEST);
          gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
      });
    }
    function addRoute() {
      addHalftone();
      D.segments.forEach((s) => map.addSource(s.id, { type: "geojson", data: feature(s.coords), tolerance: 0 }));
      const t = { duration: 600, delay: 0 };
      // order: colour lines (back), metro, bus (front)
      zoneSegs.forEach((s) => map.addLayer({
        id: s.id, type: "line", source: s.id,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": COLOR[s.zone], "line-width": 2.5, "line-opacity": 0, "line-opacity-transition": t }
      }));
      offsetZoom = null;
      updateOffsets();
      map.on("zoom", queueOffsets);
      D.segments.filter((s) => s.kind === "metro").forEach((s) => map.addLayer({ id: s.id, type: "line", source: s.id,
        layout: { "line-join": "round" },
        paint: { "line-color": COLOR.dark, "line-width": 6.5, "line-dasharray": [0.36, 0.36], "line-opacity": 0, "line-opacity-transition": t } }));
      // barca: round dots (Figma "barca ●●●●●")
      D.segments.filter((s) => s.kind === "barca").forEach((s) => map.addLayer({ id: s.id, type: "line", source: s.id,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": COLOR.dark, "line-width": 4.5, "line-dasharray": [0, 2.2], "line-opacity": 0, "line-opacity-transition": t } }));
      D.segments.filter((s) => s.kind === "bus").forEach((s) => map.addLayer({ id: s.id, type: "line", source: s.id,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": COLOR.dark, "line-width": 2.5, "line-dasharray": [4.8, 4.8], "line-opacity": 0, "line-opacity-transition": t } }));
    }

    function init(container, onUserMove) {
      if (!window.maplibregl) { fail(container); return; }
      ready = false; failed = false; queued = null;
      // what the camera frames in each step (sub-lines computed by the generator, by distance along the route)
      FRAME = Object.assign({ resumo: D.resumoLine || D.line }, D.frames.desktop);
      FRAME_MOBILE = Object.assign({ resumo: D.resumoLine || D.line }, D.frames.mobile);
      placed = []; resumoPos = false;
      zoneSegs = D.segments.filter((s) => s.kind === "zone");
      zoneSegs.forEach((s) => { s.merc = s.merc || s.coords.map(merc); });
      const all = bboxOf(D.line);
      const pad = 2.5;   // generous: the camera must be able to shift the route away from the card (and centre it zoomed out on phones)
      try {
        map = new maplibregl.Map({
          container, style: style(), bounds: all, fitBoundsOptions: { padding: 60 },
          maxBounds: [[all[0][0] - pad, all[0][1] - pad], [all[1][0] + pad, all[1][1] + pad]],
          minZoom: 7, maxZoom: 15.5, attributionControl: false,   // minZoom: low enough for the whole route to fit a phone in the resumo
          dragRotate: false, pitchWithRotate: false, touchPitch: false, renderWorldCopies: false, fadeDuration: 0
        });
      } catch (err) { fail(container); return; }
      mapRef = map;
      const me = map;
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      // credits (required by OpenStreetMap / OpenFreeMap) start closed: only the (i), the text opens on click
      // (MapLibre opens it by itself once the map loads → keep it closed until the visitor clicks the (i) once)
      const attrib = container.querySelector(".maplibregl-ctrl-attrib");
      if (attrib) {
        let touched = false;
        // (only touch the element when it really is open — any write would re-trigger the observer)
        const close = () => {
          if (touched) return;
          if (attrib.classList.contains("maplibregl-compact-show")) attrib.classList.remove("maplibregl-compact-show");
          if (attrib.hasAttribute("open")) attrib.removeAttribute("open");
        };
        attrib.addEventListener("pointerdown", () => { touched = true; }, true);
        attrib.addEventListener("keydown", () => { touched = true; }, true);
        new MutationObserver(close).observe(attrib, { attributes: true, attributeFilter: ["class", "open"] });
        close();
      }
      map.touchZoomRotate.disableRotation();
      map.keyboard.disableRotation();
      map.on("error", (e) => console.warn("mapa:", e && e.error && e.error.message));
      // draw the route as soon as the style is parsed (don't wait for every tile, like "load" does)
      const onReady = () => {
        if (me !== map || ready || !map.isStyleLoaded()) return;
        addRoute(); ROUTE.markers(step); ready = true;
        if (queued) { const q = queued; queued = null; show(q.step, q.padding, true, q.after); }
      };
      map.on("style.load", onReady);
      map.on("styledata", onReady);
      map.on("load", onReady);
      map.on("data", onReady);
      // safety net: the style can end up loaded with no further event (seen in background tabs) → keep checking
      clearInterval(readyPoll);
      readyPoll = setInterval(() => { if (me !== map || ready) { clearInterval(readyPoll); return; } onReady(); }, 300);
      // watchdog: if the style never finishes (seen after many reloads in one tab), load it again once
      clearTimeout(watchdog);
      watchdog = setTimeout(() => { if (me === map && !ready && !map.isStyleLoaded()) { try { map.setStyle(style()); } catch (_) { /* ignore */ } } }, 8000);
      ["dragstart", "zoomstart"].forEach((ev) => map.on(ev, (e) => { if (e.originalEvent) onUserMove(); }));
    }
    function destroy(container) {
      clearTimeout(watchdog); clearInterval(readyPoll);
      if (map) { try { map.remove(); } catch (_) { /* ignore */ } }
      map = null; mapRef = null; ready = false; queued = null;
      container.classList.remove("is-failed");
      container.innerHTML = "";
    }
    function fail(container) {
      failed = true;
      container.classList.add("is-failed");
      container.append(h("p", { class: "map-fail" }, "Não foi possível carregar o mapa neste navegador."));
    }

    function setInteractive(on) {
      ["dragPan", "scrollZoom", "touchZoomRotate", "doubleClickZoom", "keyboard", "boxZoom"].forEach((k) => on ? map[k].enable() : map[k].disable());
      if (on) { map.touchZoomRotate.disableRotation(); map.keyboard.disableRotation(); }
    }

    /** frame the step; padding = screen area hidden by the card / chips */
    function show(step, padding, instant, after) {
      if (failed || !map) return;
      if (!ready) { queued = { step, padding, after }; return; }
      const code = CODE[step];
      D.segments.forEach((s) => map.setPaintProperty(s.id, "line-opacity", s.show.includes(code) ? 1 : 0));
      placeForResumo(step === "resumo");
      setInteractive(!!INTERACTIVE[step]);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const frames = mobile ? FRAME_MOBILE : FRAME;
      // phone resumo: the whole route is drawn small → thicker strokes keep it readable (every route)
      const thick = mobile && step === "resumo";
      D.segments.forEach((s) => map.setPaintProperty(s.id, "line-width", (thick ? LINE_W_THICK : mobile ? LINE_W_MOBILE : LINE_W)[s.kind]));
      // zoom-out limit: free while the camera frames the step, then at most ~1 level out from that framing
      map.setMinZoom(MIN_ZOOM);
      const token = ++showToken;
      map.once("moveend", () => {
        if (token !== showToken || !map) return;
        if (INTERACTIVE[step]) map.setMinZoom(Math.max(MIN_ZOOM, map.getZoom() - ZOOM_OUT_MAX));
        if (after) after();
      });
      const maxZoom = step === "resumo" ? 12.2 : 13.4, duration = (instant || reduce) ? 0 : 1800;
      const center = padding.center;            // optional: a point the camera puts in the middle of the window
      const pad = Object.assign({}, padding); delete pad.center;
      if (center) {
        // zoom so the stretch fits between the card and the middle of the window, then put the point in the
        // horizontal middle of the window (vertically: middle of the free band between menu and bottom)
        const cw = map.getContainer().clientWidth, ch = map.getContainer().clientHeight;
        // (the start of the stretch may run above the card, up to the title — as in the Figma)
        const cam = map.cameraForBounds(bboxOf(frames[step]), { padding: Object.assign({}, pad, { left: Math.min(pad.left, 180), right: cw / 2 }), maxZoom });
        const dy = (pad.top + (ch - pad.bottom)) / 2 - ch / 2;
        map.easeTo({ center, zoom: cam ? cam.zoom : map.getZoom(), offset: [0, dy], duration, essential: true });
      } else {
        map.fitBounds(bboxOf(frames[step]), { padding: pad, maxZoom, duration, essential: true });
      }
    }
    let showToken = 0;
    const MIN_ZOOM = 7, ZOOM_OUT_MAX = 0.5;   // zooming out further would crowd the names

    function resize() { if (map) map.resize(); }
    return { init, destroy, show, resize, get map() { return map; }, get ready() { return ready || failed; } };
  })();

  /* ============================== controller ============================== */
  let root, canvas, relatosEl, mapEl, titleEl, homeEl, legendEl;
  let step = "inicio";
  let layout = "desktop";
  let scale = 1;
  let onExit = () => {};

  function isMobile() { return window.matchMedia("(max-width: 767px)").matches; }

  function fit(instant) {
    layout = isMobile() ? "mobile" : "desktop";
    root.classList.toggle("is-mobile", layout === "mobile");
    const vw = window.innerWidth, vh = window.innerHeight;
    if (layout === "mobile") {
      scale = vw / 375;
      canvas.style.left = "0px";
      root.style.setProperty("--canvas-h", 893 * scale + "px");
    } else {
      scale = Math.min(vw / 1200, vh / 720);
      canvas.style.left = (vw - 1200 * scale) / 2 + "px";
    }
    canvas.style.top = "0px";
    canvas.style.transform = `scale(${scale})`;
    root.style.setProperty("--s", scale);
    renderCards();
    placeRelatos();
    updateChipOffsets();
    MapView.resize();
    frame(instant);
  }

  /* desktop: relato card anchored to the WINDOW — 80 px from the left, 90 px below the menu + title */
  const CARD_LEFT = 80, CARD_GAP_Y = 90;
  // menu bar height comes from the CSS (--menu-h); the title hangs 63.57 px below it
  const menuH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--menu-h")) || 56;
  const titleBottom = () => menuH() + 63.57;
  const CARD_INSET_L = 331.507 * 0.05, CARD_INSET_T = 413.028 * 0.05;
  function placeRelatos() {
    if (layout === "mobile") { relatosEl.style.left = relatosEl.style.top = ""; return; }
    const left = parseFloat(canvas.style.left) || 0;
    // the top card grows with its text (desktop), so measure the stack as drawn
    const cardH = (relatosEl.offsetHeight - 2 * CARD_INSET_T) * scale;
    const topPx = Math.max(menuH() + 24, Math.min(titleBottom() + CARD_GAP_Y, window.innerHeight - cardH - 24));
    relatosEl.style.left = ((CARD_LEFT - left) / scale - CARD_INSET_L) + "px";
    relatosEl.style.top = (topPx / scale - CARD_INSET_T) + "px";
  }

  /** screen area the map must keep the route out of (card, menu, chips) */
  function mapPadding() {
    const vw = window.innerWidth, vh = window.innerHeight;
    if (layout === "mobile") {
      const p = ROUTE.padMobile[step] || {};
      const n = step === "resumo" ? "r" : STEPS.indexOf(step) + 1;
      const cardTop = Math.min(vh, STACK_MOBILE_TOP[n][0] * scale);
      // resumo: the legend sits right above the card → the route stays above the legend
      const legendTop = step === "resumo" && legendEl ? Math.min(cardTop, legendEl.getBoundingClientRect().top + root.scrollTop) : cardTop;
      const bottom = (step === "resumo" ? vh - legendTop + 18 : vh - cardTop + 30) + (p.bottom || 0);
      return { top: menuH() + 16 + (p.top || 30), left: p.left || 24, right: p.right || 30, bottom: Math.max(40, bottom) };
    }
    const p = ROUTE.pad[step] || {};
    const card = relatosEl.getBoundingClientRect();
    // resumo: keep the route above the legend (its top moves with the window size)
    const legendTop = step === "resumo" && legendEl ? legendEl.getBoundingClientRect().top : vh;
    return {
      top: titleBottom() + 46 + (p.top || 0),
      left: Math.min(vw * 0.5, card.right + 60 + (p.left || 0)),
      right: 60 + (p.right || 0),
      bottom: Math.max(p.bottom || 70, vh - legendTop + 36)
    };
  }
  /* once a step has framed the map: set the zoom-out limit to that framing (no extra camera move, and the names
     never move — each one keeps the side fixed when it was drawn, see stationTick) */
  function settle() {
    const map = MapView.map;
    if (!map || step === "resumo") return;
    // zoom-out limit = the step's framing (zooming out further would crowd the names; zooming in stays free)
    if (INTERACTIVE[step]) map.setMinZoom(Math.max(7, map.getZoom() - 0.01));
  }
  function frame(instant) {
    placeResumo();
    if (step === "resumo") return;          // the resumo is a drawing on a neutral background (the map fades out)
    const pad = mapPadding();
    // desktop: a step may ask for a point in the middle of the window (ROUTE.centerOn[step] = (points) => point)
    const c = layout === "desktop" && ROUTE.centerOn && ROUTE.centerOn[step];
    if (c && D) pad.center = c(D.points).lngLat;
    MapView.show(step, pad, instant, () => { fitCheck(pad); settle(); });
  }
  /* phone resumo (every route): once the camera stops, measure what is really drawn (ticks, names, pins) and,
     if anything crosses the legend, the menu or the screen sides, frame again with that much more room */
  let fitChecked = false;
  function fitCheck(pad) {
    if (layout !== "mobile" || step !== "resumo") { fitChecked = false; return; }
    if (fitChecked) { fitChecked = false; return; }          // one correction pass per framing
    const vw = window.innerWidth;
    const lim = { top: menuH() + 6, left: 4, right: vw - 4, bottom: legendEl ? legendEl.getBoundingClientRect().top - 8 : window.innerHeight };
    let t = Infinity, l = Infinity, r = -Infinity, b = -Infinity;
    mapEl.querySelectorAll('.maplibregl-marker[data-show~="r"]').forEach((m) => {
      [m, ...m.querySelectorAll("*")].forEach((e) => {
        const q = e.getBoundingClientRect();
        if ((!q.width && !q.height) || getComputedStyle(e).opacity === "0") return;   // hidden names don't count
        t = Math.min(t, q.top); l = Math.min(l, q.left); r = Math.max(r, q.right); b = Math.max(b, q.bottom);
      });
    });
    if (t === Infinity) return;
    const over = { top: lim.top - t, left: lim.left - l, right: r - lim.right, bottom: b - lim.bottom };
    if (Object.values(over).every((v) => v <= 1)) return;
    const p2 = {};
    Object.keys(pad).forEach((k) => { p2[k] = pad[k] + Math.max(0, over[k]) + (over[k] > 1 ? 6 : 0); });
    fitChecked = true;
    MapView.show(step, p2, false, () => fitCheck(p2));
  }

  function navButtons(prevDisabled) {
    const prev = h("button", { class: "card__btn", type: "button", "data-nav": "prev", "aria-label": "anterior" }, "<");
    const next = h("button", { class: "card__btn", type: "button", "data-nav": "next", "aria-label": "próximo" }, ">");
    if (prevDisabled) prev.disabled = true;
    return h("div", { class: "card__nav" }, prev, next);
  }

  /* RESUMO: a simplified drawing of the route (Figma, see data/resumo/gerar-resumo.py) instead of the map.
     Phone: drawing as in the Figma, from under the menu down to the card. Desktop: drawing centred in the room right
     of the card, at the Figma's height, over the intro map texture (+ dots) as in the Figma. */
  let diagramEl = null;
  function resumoBox() { return (window.RESUMO_DIAGRAMAS || {})[routeId] || {}; }
  function placeResumo() {
    if (!diagramEl) {
      diagramEl = h("img", { class: "resumo-diagram", alt: "" });
      canvas.append(diagramEl);
      root.insertBefore(h("div", { class: "resumo-bg", "aria-hidden": "true" }), canvas);   // neutral + light halftone
    }
    const box = (resumoBox()[layout] || {}).box;
    const on = step === "resumo" && !!box;
    diagramEl.hidden = !on;
    if (!on) return;
    const src = "assets/resumo/" + routeId + "-" + layout + ".svg?v=3";
    if (!diagramEl.src.endsWith(src)) diagramEl.src = src;
    diagramEl.alt = ROUTE.resumo.alt || "";
    let [x, y, w, hgt] = box;
    if (layout === "desktop") {
      // centre it in the room between the card and the window's right edge (canvas units)
      const left = parseFloat(canvas.style.left) || 0;
      const cardR = (relatosEl.getBoundingClientRect().right - left) / scale;
      const winR = (window.innerWidth - left) / scale;
      const room = winR - cardR;
      x = cardR + Math.max(10, (room - w) / 2);
    }
    Object.assign(diagramEl.style, { left: x + "px", top: y + "px", width: w + "px", height: hgt + "px" });
  }

  function renderCards() {
    relatosEl.innerHTML = "";
    const mobile = layout === "mobile";
    if (step === "resumo") {
      const card = h("div", { class: "card card--resumo", "data-pos": "r", "data-top": "" },
        h("p", { class: "lead", html: ROUTE.resumo.lead }),
        h("div", { class: "facts", html: ROUTE.resumo.facts }),
        h("div", { class: "actions" },
          h("button", { class: "btn-replay", type: "button", "data-nav": "replay", "aria-label": "refazer o trajeto" }, "⟳"),
          h("button", { class: "btn-next-route", type: "button", "data-nav": "exit" }, "próximo trajeto →")));
      if (mobile) {
        // the card starts right under the drawing (Figma: 427 Cosmos · 503 Nova Iguaçu · 464 Rio Bonito)
        const b = (resumoBox().mobile || {}).box, top = b ? b[1] + b[3] : STACK_MOBILE_TOP.r[0];
        card.style.top = top + "px"; card.style.minHeight = Math.max(0, 893 - top) + "px";
      }
      relatosEl.append(card);
      sizeMobileCanvas();
      return;
    }
    const n = STEPS.indexOf(step) + 1;
    for (let i = 1; i <= n; i++) {
      const top = i === n;
      const card = h("div", { class: "card", "data-pos": String(i) });
      if (top) card.setAttribute("data-top", "");
      if (mobile) { card.style.top = STACK_MOBILE_TOP[n][i - 1] + "px"; card.style.minHeight = (893 - STACK_MOBILE_TOP[n][i - 1]) + "px"; }
      if (top) {
        card.append(h("div", { class: "card__content" },
          ROUTE.sound && ROUTE.soundButton ? VOL() : null,     // no sound button unless a route asks (none does)
          h("div", { class: "card__body" }, Q1(), h("div", { class: "card__text", html: ROUTE.relatos[step] }), Q2(), navButtons(step === "inicio"))));
        card.setAttribute("role", "group");
        card.setAttribute("aria-label", "relato");
      } else {
        card.setAttribute("aria-hidden", "true");
      }
      relatosEl.append(card);
    }
    sizeMobileCanvas();
  }

  /* phone: the card grows with its text (long falas never cut the < > buttons) and the page scrolls that much more */
  function sizeMobileCanvas() {
    if (layout !== "mobile") { canvas.style.height = ""; relatosEl.style.height = ""; return; }
    let h = 893;
    relatosEl.querySelectorAll(".card").forEach((c) => { h = Math.max(h, c.offsetTop + c.offsetHeight); });
    canvas.style.height = h + "px";
    relatosEl.style.height = h + "px";
    root.style.setProperty("--canvas-h", h * scale + "px");
  }

  function go(next) {
    if (!STEPS.includes(next)) return;
    if (next === "resumo" && ROUTE.noResumo) return;
    step = next;
    root.dataset.step = step;
    document.querySelectorAll("#cosmos .st.is-peek").forEach((x) => x.classList.remove("is-peek"));
    document.querySelectorAll("#cosmos .chip-group").forEach((g) => g.classList.toggle("is-on", g.dataset.for === step));
    renderCards();
    placeRelatos();
    frame(false);
    if (ROUTE.sound) Sound.set(step);
    Hint.update(step);
  }

  function onNav(e) {
    const b = e.target.closest("[data-nav]");
    if (!b || b.disabled) return;
    const i = STEPS.indexOf(step);
    const kind = b.dataset.nav;
    if (kind === "sound") {
      const m = Sound.toggleMute();
      b.classList.toggle("is-muted", m);
      b.setAttribute("aria-pressed", String(m));
      b.setAttribute("aria-label", m ? "ligar o som" : "desligar o som");
      return;
    }
    if (kind === "next" && ROUTE.noResumo && STEPS[i + 1] === "resumo") { onExit(); return; }   // no resumo yet: back to the route choice
    if (kind === "next") go(STEPS[i + 1]);
    else if (kind === "prev") go(STEPS[i - 1]);
    else if (kind === "replay") go("inicio");
    else if (kind === "exit") onExit();
    if (kind !== "exit") { const f = relatosEl.querySelector('[data-nav="next"], [data-nav="replay"]'); f && f.focus({ preventScroll: true }); }
  }

  /* legend (resumo): transport keys from the Figma + one colour line per region of this route */
  function buildLegend() {
    if (legendEl) legendEl.remove();
    const L = h("div", { class: "legend", "aria-label": "legenda" });
    const at = (x, y) => `left:${(x - 282.88).toFixed(2)}px;top:${(y - 324.8).toFixed(2)}px;`;
    L.append(
      h("p", { class: "lg", style: at(352.37, 324.8) }, "ônibus"),
      h("p", { class: "lg", style: at(352.37, 355.68) }, "metrô"),
      h("p", { class: "lg", style: at(352.37, 394.29) }, "baldeação"),
      h("img", { src: R + "legenda-onibus.svg", alt: "", style: at(281, 331.5) + "width:55.4px;height:1.94px;" }),
      h("img", { src: R + "legenda-metro.svg", alt: "", style: at(282.88, 360.84) + "width:51.5px;height:5.14px;" }),
      h("img", { src: R + "legenda-baldeacao-1.svg", alt: "", style: at(288, 381.42) + "width:41.18px;height:41.18px;" }),
      h("img", { src: R + "legenda-baldeacao-2.svg", alt: "", style: at(300.92, 394.29) + "width:15.94px;height:15.94px;mix-blend-mode:multiply;" })
    );
    // same slots as the Figma: two stacked in the middle column, one in the right column
    const SLOTS = [[452.94, 324.64, 465.52, 339, 155.7], [452.94, 378.27, 464.64, 392.6, 153.13], [638.24, 324.64, 649.94, 339, 134.26]];
    ROUTE.legend.forEach(([zone, word, where], i) => {
      const [bx, by, tx, ty, w] = SLOTS[i];
      L.append(
        h("span", { class: "lg-bar", style: at(bx, by) + `background:${COLOR[zone]};` }),
        h("p", { class: "lg", style: at(tx, ty) + `width:${w}px;white-space:normal;`, html: `linha <b style="color:${COLOR[zone]}">${word}</b> = <u>bairros</u> ${where}` }));
    });
    canvas.append(L);
    legendEl = L;
  }

  function init(opts) {
    root = document.getElementById("cosmos");
    canvas = document.getElementById("cosmos-canvas");
    relatosEl = document.getElementById("relatos");
    mapEl = document.getElementById("cosmos-map");
    titleEl = root.querySelector(".cosmos__title");
    homeEl = root.querySelector(".cosmos__home");
    onExit = opts.onExit || onExit;
    Hint.build(root);   // fixed to the window (bottom centre), outside the scaled canvas
    relatosEl.addEventListener("click", onNav);
    // a tap anywhere else closes the name opened by a tap on a tick
    document.addEventListener("pointerdown", () => document.querySelectorAll("#cosmos .st.is-peek").forEach((x) => x.classList.remove("is-peek")));
    Sound.init();
    let tid;
    window.addEventListener("resize", () => { if (root.hidden) return; clearTimeout(tid); tid = setTimeout(() => fit(true), 80); });
  }

  /* LOADING SCREEN before each route: a short pause that sets the scene — the route's title, a bus line drawing
     itself from the start to the ESDI, "preparando o trajeto" and the headphones reminder. The map loads behind it;
     it stays at least MIN ms (so it never just flashes) and at most MAX ms (slow connection: the map keeps loading). */
  const Loader = (function () {
    const MIN = 2000, MAX = 4500, OUT = 550;
    let el = null, tid = 0, token = 0;
    function build() {
      el = h("div", { class: "loader", role: "status", "aria-live": "polite", hidden: "" },
        h("div", { class: "loader__in" },
          h("img", { class: "loader__title", alt: "" }),
          h("div", { class: "loader__line", "aria-hidden": "true", html:
            '<svg viewBox="0 0 260 40" width="260" height="40">' +
            '<path class="ln-zone" d="M12 27 L70 15 L118 22 L170 9 L214 17 L246 13" />' +
            '<path class="ln-bus" d="M12 33 L71 21 L119 28 L171 15 L215 23 L246 19" />' +
            '<circle class="pin-a" cx="12" cy="30" r="5.5" /><circle class="pin-b" cx="247" cy="16" r="5" /></svg>' }),
          h("p", { class: "loader__txt" }, "preparando o trajeto", h("span", { class: "loader__dots" }, h("i"), h("i"), h("i"))),
          h("p", { class: "pill loader__pill" }, "*use fones de ouvido para melhor experiência")));
      document.body.append(el);
    }
    function show(title, color, label, flip, ready, done) {
      if (!el) build();
      const my = ++token;
      clearTimeout(tid);
      el.querySelector(".loader__title").src = title;
      el.querySelector(".loader__title").alt = label;
      el.style.setProperty("--c", color);
      el.classList.toggle("is-flip", !!flip);         // the route runs west (Rio Bonito): the line goes right → left
      el.classList.remove("is-out");
      el.hidden = false;
      void el.offsetWidth;                         // restart the drawing animation
      el.classList.add("is-on");
      const t0 = performance.now();
      const check = () => {
        if (my !== token) return;
        const t = performance.now() - t0;
        if ((t >= MIN && ready()) || t >= MAX) {
          el.classList.add("is-out");
          tid = setTimeout(() => { if (my !== token) return; el.hidden = true; el.classList.remove("is-on", "is-out"); }, OUT);
          done();
        } else tid = setTimeout(check, 120);
      };
      tid = setTimeout(check, 120);
    }
    function cancel() { token++; clearTimeout(tid); if (el) { el.hidden = true; el.classList.remove("is-on", "is-out"); } }
    return { show, cancel };
  })();

  let mapRoute = null;
  /** open a route ("cosmos" | "novaiguacu" | "riobonito") at its first step; opts.loader = with the loading screen */
  function open(id, opts) {
    const next = ROUTES[id] ? id : "cosmos";
    routeId = next;
    ROUTE = ROUTES[next];
    D = ROUTE.data();
    ZONE_OFFSET = ROUTE.zoneOffset || -12;
    root.hidden = false;
    root.dataset.route = routeId;
    step = "inicio";
    root.dataset.step = step;
    titleEl.src = ROUTE.title;
    homeEl.setAttribute("aria-label", ROUTE.homeLabel);
    homeEl.setAttribute("href", ROUTE.hash);
    mapEl.setAttribute("aria-label", ROUTE.mapLabel);
    buildLegend();
    if (mapRoute !== routeId) {
      MapView.destroy(mapEl);
      mapRoute = routeId;
      MapView.init(mapEl, () => Hint.used());
    }
    fit(true);
    document.querySelectorAll("#cosmos .chip-group").forEach((g) => g.classList.toggle("is-on", g.dataset.for === step));
    Sound.stop();
    Loader.cancel();
    const begin = () => {
      if (ROUTE.sound) Sound.start(step);
      Hint.update(step);
      const f = relatosEl.querySelector('[data-nav="next"]');
      f && f.focus({ preventScroll: true });
    };
    if (ROUTE.sound) Sound.load(ROUTE.falas, ROUTE.falaVol);
    if (opts && opts.loader) {
      if (ROUTE.sound) Sound.warm(step);
      Loader.show(ROUTE.title, COLOR[(ROUTE.legend[0] || [])[0]] || COLOR.dark, ROUTE.homeLabel.split(" — ")[0], (ROUTE.zoneOffset || 0) > 0, () => MapView.ready, begin);
    } else begin();
  }
  function close() { root.hidden = true; Loader.cancel(); Sound.stop(); Hint.hide(); }

  window.Cosmos = {
    init, open, close, go, routes: Object.keys(ROUTES),
    hashOf: (id) => (ROUTES[id] || ROUTES.cosmos).hash,
    routeOfHash: (hash) => Object.keys(ROUTES).find((k) => ROUTES[k].hash === hash) || null,
    get route() { return routeId; }, get step() { return step; }, get audio() { return Sound.state(); }, get map() { return MapView.map; }
  };
})();
