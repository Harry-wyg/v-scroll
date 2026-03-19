import CSS from "$/v-scroll.js";

const PAD = 3, MIN_H = 16;

const SHEET = new CSSStyleSheet();
SHEET.replaceSync(CSS);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, SHEET];

const mkEl = (tag, part) => {
  const e = document.createElement(tag);
  e.setAttribute("part", part);
  return e;
};

const buildDom = (shadow) => {
  const wrap = mkEl("div", "wrap"),
    track = mkEl("i", "track"),
    bar = mkEl("b", "bar");
  wrap.innerHTML = "<slot></slot>";
  track.append(bar);
  shadow.append(wrap, track);
  return { wrap, track, bar, slot: wrap.querySelector("slot") };
};

const calcH = (vh, sh) => Math.max(MIN_H, (vh - PAD * 2) * vh / sh);

const calcY = (st, sh, vh, bh) => {
  const ms = sh - vh;
  return PAD + (ms > 0 ? st / ms : 0) * (vh - PAD * 2 - bh);
};

const calcSt = (by, sh, vh, bh) => {
  const th = vh - PAD * 2 - bh;
  return th > 0 ? (by - PAD) / th * (sh - vh) : 0;
};

const init = (host) => {
  const shadow = host.attachShadow({ mode: "open" });
  host._dom = buildDom(shadow);
};

const setup = (host) => {
  const { wrap, track, bar, slot } = host._dom;
  let bh = 0, drag = false, sy = 0, stop = 0;

  const refresh = () => {
    const { clientHeight: vh, scrollHeight: sh, scrollTop: st } = wrap;
    if (sh <= vh) { track.hidden = true; return; }
    track.hidden = false;
    bh = calcH(vh, sh);
    bar.style.height = bh + "px";
    bar.style.top = calcY(st, sh, vh, bh) + "px";
  };

  const onScroll = () => {
    const { clientHeight: vh, scrollHeight: sh, scrollTop: st } = wrap;
    if (sh <= vh) return;
    bh = calcH(vh, sh);
    bar.style.top = calcY(st, sh, vh, bh) + "px";
  };

  const onDown = (e) => {
    e.preventDefault();
    drag = true;
    sy = e.clientY;
    stop = parseFloat(bar.style.top) || 0;
    bar.setPointerCapture(e.pointerId);
    host.toggleAttribute("data-drag", true);
  };

  const onMove = (e) => {
    if (!drag) return;
    const { clientHeight: vh, scrollHeight: sh } = wrap,
      ny = Math.max(PAD, Math.min(vh - PAD - bh, stop + e.clientY - sy));
    bar.style.top = ny + "px";
    wrap.scrollTop = calcSt(ny, sh, vh, bh);
  };

  const onEnd = () => {
    drag = false;
    host.removeAttribute("data-drag");
    host.removeAttribute("data-hover");
  };

  const onEnter = () => { if (!drag) host.toggleAttribute("data-hover", true); };
  const onLeave = () => { if (!drag) host.removeAttribute("data-hover"); };

  wrap.addEventListener("scroll", onScroll, { passive: true });
  bar.addEventListener("pointerenter", onEnter);
  bar.addEventListener("pointerleave", onLeave);
  bar.addEventListener("pointerdown", onDown);
  bar.addEventListener("pointermove", onMove);
  bar.addEventListener("lostpointercapture", onEnd);

  const sro = new ResizeObserver(refresh),
    cro = new ResizeObserver(refresh);
  sro.observe(wrap);

  const watchSlot = () => {
    cro.disconnect();
    for (const n of slot.assignedElements()) cro.observe(n);
    refresh();
  };
  slot.addEventListener("slotchange", watchSlot);
  watchSlot();

  host._cleanup = () => {
    sro.disconnect();
    cro.disconnect();
    wrap.removeEventListener("scroll", onScroll);
    bar.removeEventListener("pointerenter", onEnter);
    bar.removeEventListener("pointerleave", onLeave);
    bar.removeEventListener("pointerdown", onDown);
    bar.removeEventListener("pointermove", onMove);
    bar.removeEventListener("lostpointercapture", onEnd);
    slot.removeEventListener("slotchange", watchSlot);
  };
};

const teardown = (host) => {
  host._cleanup?.();
  host._cleanup = null;
};

customElements.define("v-scroll", class extends HTMLElement {
  constructor() { super(); init(this); }
  connectedCallback() { setup(this); }
  disconnectedCallback() { teardown(this); }
});
