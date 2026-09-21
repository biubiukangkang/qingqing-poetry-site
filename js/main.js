/* ============================================================
   青清诗集 — 暗室灯下
   168 句：一屏一句一画；←→ 或两侧箭头换句；「句目」抽屉跳转；
   点画面，译文/赏析/按语直接浮上墙面（就地直陈）。
   加图零代码：assets/poems/{id}.jpg 放入即自动上画。
   图按需挂载：走到哪句才下载哪张（前后各预取两张），
   避免开场一口气拉全部配图。
   ============================================================ */
(() => {
"use strict";

const $ = s => document.querySelector(s);
const stage = $("#stage");
const drawer = $("#drawer");
const note = $("#note");
const LINES = window.LINES || [];

/* ---------- 工具（esc/vcols/九卷序/按语键：两页共用 js/common.js） ---------- */
const esc = COMMON.esc;
const vcols = COMMON.vcols;   // 断列口径与落地页同源
const imgSrc = L => `assets/poems/${L.id}.jpg`;
const trimWork = w => (w && w.length > 11 ? w.slice(0, 11) + "…" : w);

/* ---------- 建场 ---------- */
let hasPic = [];   // 每句是否有真图（图挂载后置真/假，未挂载为 undefined）
let pendingLand = -1;   // 默认开场落在真画上：正在逐句试落的句号
function build(){
  LINES.forEach((L, i) => {
    const d = document.createElement("div");
    d.className = "scene" + (i === 0 ? " on" : "");
    d.dataset.idx = i;
    d.innerHTML = `
      <div class="wrap">
        <div class="lamp">
          <img class="painting" alt="${esc(L.line)}">
          <div class="empty"></div>
        </div>
        <div class="colophon">
          <div class="line">${vcols(L.line).map(c => `<span>${esc(c)}</span>`).join("")}</div>
          <div class="src">
            <span>${esc(L.author)}</span>
            ${L.work ? `<span>${esc(trimWork(L.work))}</span>` : ""}
          </div>
        </div>
      </div>
      <div class="glow"></div>`;
    d.querySelector(".wrap").addEventListener("click", () => {
      if (String(getSelection())) return;   // 正在划选诗文：不当成开详注
      toggleNote();
    });
    stage.appendChild(d);
  });
}
/* 图按需挂载：只有走到/预取的句才赋 src，其余不产生网络请求 */
function mount(i){
  const scene = stage.children[i];
  if (!scene || scene.dataset.mnt) return;
  scene.dataset.mnt = "1";
  const img = scene.querySelector(".painting");
  const empty = scene.querySelector(".empty");
  const ok = () => {
    hasPic[i] = true;
    if (empty.parentNode) empty.remove();
    markDrawer(i);
    if (pendingLand === i) pendingLand = -1;
  };
  const bad = () => {
    img.style.visibility = "hidden";   // 留住 16:9 占位，画席照常示人
    hasPic[i] = false;
    if (cur === i && pendingLand === i) { pendingLand = i + 1; go(i + 1, true); }
  };
  if (window.IMGS && !window.IMGS[LINES[i].id]) { bad(); return; }   // 清单无图：不发请求，画席示人
  img.addEventListener("load", ok);
  img.addEventListener("error", bad);
  img.src = imgSrc(LINES[i]);
}

/* ---------- 换句 ---------- */
let cur = 0;
function updateHUD(){
  $("#progBar").style.width = ((cur + 1) / LINES.length * 100).toFixed(2) + "%";
  $("#counter").textContent = `${cur + 1} / ${LINES.length}`;
}
function go(n, andCard){
  if (!LINES.length) return;
  n = (n + LINES.length) % LINES.length;
  if (n === cur && !andCard) return;
  closeNote(true);
  stage.children[cur].classList.remove("on");
  cur = n;
  stage.children[cur].classList.add("on");
  mount(cur);
  updateHUD();
  markDrawer(cur);
  preload(cur);
  const q = new URLSearchParams(location.search);
  q.set("n", String(cur + 1));
  try { history.replaceState(null, "", "?" + q.toString()); } catch(e) {}   // file:// 直开时静默放弃
}
function preload(i){
  [-1, 1, 2].forEach(k => mount((i + k + LINES.length) % LINES.length));
}

/* ---------- 句目抽屉 ---------- */
function buildDrawer(){
  const list = $("#drawerList");
  const groups = new Map();
  LINES.forEach((L, i) => {
    const key = L.tags[0] || "其他";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  });
  const names = [...COMMON.GROUPS, "其他"];
  [...groups.keys()].sort((a, b) => names.indexOf(a) - names.indexOf(b)).forEach(g => {
    const h = document.createElement("div");
    h.className = "dgroup";
    h.textContent = `卷 · ${g}（${groups.get(g).length}）`;
    list.appendChild(h);
    for (const i of groups.get(g)) {
      const b = document.createElement("button");
      b.className = "ditem";
      b.dataset.idx = i;
      b.innerHTML = `<span class="no">${String(i + 1).padStart(2, "0")}</span>
        <span class="t">${esc(LINES[i].line)}</span>
        <span class="pic" hidden>有画</span>`;
      b.addEventListener("click", () => { closeDrawer(); setTimeout(() => go(i), 120); });
      list.appendChild(b);
    }
  });
}
function markDrawer(i){
  const list = $("#drawerList");
  list.querySelectorAll(".ditem").forEach(el => {
    const idx = +el.dataset.idx;
    el.classList.toggle("cur", idx === i);
    const pic = el.querySelector(".pic");
    if (pic) pic.hidden = !hasPic[idx];
    if (idx === i) el.scrollIntoView({ block: "nearest" });
  });
}
function openDrawer(){ drawer.classList.add("open"); $("#drawerMask").classList.add("on"); drawer.setAttribute("aria-hidden", "false"); markDrawer(cur); }
function closeDrawer(){ drawer.classList.remove("open"); $("#drawerMask").classList.remove("on"); drawer.setAttribute("aria-hidden", "true"); }

/* ---------- 详注 · 就地直陈（墙上文字） ---------- */
const saying = () => $("#saying");
const getSaying = id => { try { return localStorage.getItem(COMMON.sayKey(id)) || ""; } catch(e){ return ""; } };
const setSaying = (id, v) => { try { v ? localStorage.setItem(COMMON.sayKey(id), v) : localStorage.removeItem(COMMON.sayKey(id)); } catch(e){} };
/* 存取口径与落地页统一：innerText 保换行、NBSP 归一 */
function saveCurSaying(){
  const s = saying();
  if (!s) return;
  setSaying(LINES[cur].id, s.innerText.replace(/\u00A0/g," ").trim());
}

const isOpen = () => document.body.classList.contains("open");

function fillNote(i){
  const L = LINES[i];
  $("#nsrc").textContent = [L.dyn, L.author, L.work].filter(Boolean).join(" · ");
  $("#ntrans").textContent = L.trans || "";
  $("#ntrans").style.display = L.trans ? "" : "none";
  $("#napprec").textContent = L.apprec || "";
  $("#napprec").style.display = L.apprec ? "" : "none";
  $("#ntipText").textContent = "随写随存 · 只记在这台设备上";
  saying().innerText = getSaying(L.id);
}

/* 让位：整组陈设左移，为墙上文字腾出呼吸（窄面板无空间则不动，详注已沉底） */
function shiftAside(){
  const on = stage.children[cur];
  if (!on) return;
  const wrap = on.querySelector(".wrap");
  const colophon = on.querySelector(".colophon");
  const lamp = on.querySelector(".lamp");
  if (matchMedia("(max-width:780px)").matches){
    /* 窄面板：详注沉底成匣，陈设整组上抬让画于匣上（抬不过头，余量盖住就盖住） */
    var dy = Math.ceil(lamp.getBoundingClientRect().bottom - note.getBoundingClientRect().top + 12);
    var headroom = colophon.getBoundingClientRect().top - 10;
    wrap.style.transform = (dy > 0 && headroom > 0) ? "translateY(" + (-Math.min(dy, headroom)) + "px)" : "";
    return;
  }
  wrap.style.transform = "";
  void wrap.offsetWidth;
  const colR = colophon.getBoundingClientRect().right;
  const noteL = note.getBoundingClientRect().left;
  const room = lamp.getBoundingClientRect().left - 36;
  const x = Math.max(0, Math.min(colR - (noteL - 48), room));
  wrap.style.transform = x > 0 ? "translateX(" + (-x).toFixed(1) + "px)" : "";
}

function openNote(){
  fillNote(cur);
  shiftAside();
  document.body.classList.add("open");
  note.setAttribute("aria-hidden", "false");
}
function closeNote(silent){
  if (!isOpen()) return;
  saveCurSaying();
  const on = stage.children[cur];
  if (on) on.querySelector(".wrap").style.transform = "";
  document.body.classList.remove("open");
  note.setAttribute("aria-hidden", "true");
}
function toggleNote(){
  if (drawer.classList.contains("open")) closeDrawer();
  isOpen() ? closeNote() : openNote();
}

/* ---------- 事件 ---------- */
$("#navL").addEventListener("click", () => go(cur - 1));
$("#navR").addEventListener("click", () => go(cur + 1));
$("#btnIndex").addEventListener("click", () => drawer.classList.contains("open") ? closeDrawer() : openDrawer());
$("#drawerClose").addEventListener("click", closeDrawer);
$("#drawerMask").addEventListener("click", closeDrawer);
note.addEventListener("click", e => e.stopPropagation());  // 墙上文字区不触发开关
(() => {  // 按语：随写随存
  const s = saying();
  s.addEventListener("blur", saveCurSaying);
  s.addEventListener("input", () => { if (!s.textContent.trim()) s.innerHTML = ""; });
})();
addEventListener("pagehide", saveCurSaying);   // 开着详注直接关页：兜底存一笔
$("#sayExport").addEventListener("click", () => {   // 按语导出：与落地页入口同源
  saveCurSaying();
  COMMON.exportSayings();
});
addEventListener("keydown", e => {
  if (e.target.closest && e.target.closest("#note")) {   // 按语打字中：仅 Esc 生效
    if (e.key === "Escape") closeNote();
    return;
  }
  if (e.key === "Escape") { closeNote(); closeDrawer(); return; }
  if (drawer.classList.contains("open")) { if (e.key === "ArrowRight" || e.key === "ArrowLeft") closeDrawer(); return; }
  if (e.key === "ArrowRight") go(cur + 1);
  if (e.key === "ArrowLeft") go(cur - 1);
});
let wheelLast = 0;
addEventListener("wheel", e => {
  if (drawer.classList.contains("open")) return;
  if (e.target.closest && e.target.closest("#note")) return;   // 详注内滚动不翻句
  if (Math.abs(e.deltaY) < 30) return;
  const now = Date.now();
  if (now - wheelLast < 750) return;
  wheelLast = now;
  go(cur + (e.deltaY > 0 ? 1 : -1));
}, { passive: true });
addEventListener("resize", () => { layout(); if (isOpen()) shiftAside(); });

/* ---------- 组装 ---------- */
function init(){
  document.title = (window.SITE.title || "青清诗集") + " · 沉浸观赏";
  build();
  buildDrawer();

  const q = new URLSearchParams(location.search);
  let n = parseInt(q.get("n"), 10);
  const explicit = !isNaN(n) && n >= 1 && n <= LINES.length;
  if (!explicit) n = 1;
  pendingLand = (explicit || q.has("card")) ? -1 : 0;
  go(n - 1);
  mount(cur);   // go 对 n===cur（默认开场正是 0===0）会早退，首屏在此兜底
  updateHUD();  // 早退分支不刷 HUD：进度条/计数器在此无条件初始化（句子数以数据为准）
  if (q.has("card")) {
    const i = LINES.findIndex(l => l.id === q.get("card"));
    q.delete("card");   // 一次性消费：重载不再抢跳，?n= 的位置记忆保住
    try { history.replaceState(null, "", q.toString() ? "?" + q.toString() : location.pathname); } catch(e) {}
    if (i >= 0) { go(i, true); openNote(); }
  }
  // 默认开场落在真画上：第 1 句若探测无画，mount 的 error 会逐句前移，
  // 直到落上第一幅真画（用户一旦自己换句即停）
}
document.addEventListener("DOMContentLoaded", init);
})();
