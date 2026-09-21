/* ============================================================
   青清诗集 · 两页共用工具（落地页内联脚本与暗室 main.js 同源）
   断列口径、转义、九卷序、按语键、按语导出——改这里全站生效
   ============================================================ */
(function(){
"use strict";
var C = window.COMMON = {};

/* 九卷序（全站唯一一处，勿在他处复制） */
C.GROUPS = ["山水","月夜","风雪","花木","酒茶","相思","乡关","豪侠","人生"];

/* 竖排断列标点：按此切列，列中无标点 */
C.PUNCT = /[，。？！；：、·—…]/;
C.PUNCT_G = /[，。？！；：、·—…]/g;

/* HTML 转义（含引号：可安全用于属性与内容） */
C.esc = function(s){
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
};

/* 竖排断列：按标点切，各列 span，列中无标点 */
C.vcols = function(text){
  return String(text).split(C.PUNCT).map(function(t){return t.trim();}).filter(Boolean);
};
C.vcolsHTML = function(text){
  return C.vcols(text).map(function(c){return "<span>"+C.esc(c)+"</span>";}).join("");
};
C.vtext = function(s){
  return String(s).replace(C.PUNCT_G,"　").trim();
};

/* 出处：横排「唐 · 李白 · 静夜思」／竖排全角空格连接，空则佚名 */
C.srcH = function(o){
  return [o.dyn,o.author,o.work].filter(Boolean).join(" · ") || "佚名";
};
C.srcV = function(o){
  return C.vtext([o.dyn,o.author,o.work].filter(Boolean).join("　")) || "佚名";
};

/* 按语 localStorage 键（勿改，历史数据依赖） */
C.sayKey = function(id){ return "woyu-saying-"+id; };

/* 按语导出：两页「导出按语」入口共用。
   全部按语汇成一份 txt 下载（含句子与出处），空则提示、不产空文件。 */
C.exportSayings = function(){
  var LINES = window.LINES || [];
  var out = [], n = 0;
  LINES.forEach(function(o){
    var t = null;
    try{ t = localStorage.getItem(C.sayKey(o.id)); }catch(e){}
    if(!t) return;
    n++;
    out.push("「" + o.line + "」\n" + C.srcH(o) + "\n按语：" + t + "\n");
  });
  if(!n){
    alert("这台设备上还没有写过按语。");
    return;
  }
  var head = "青清诗集 · 按语备份（" + new Date().toISOString().slice(0,10) + "，共 " + n + " 条）\n";
  head += "存放建议：移入项目根目录随 git 存档，即是异地副本。\n\n";
  var blob = new Blob(["\ufeff" + head + out.join("\n")], {type:"text/plain;charset=utf-8"});
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "按语备份-" + new Date().toISOString().slice(0,10) + ".txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
};
})();
