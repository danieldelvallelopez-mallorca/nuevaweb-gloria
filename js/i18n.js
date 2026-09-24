/* =====================================================================
   Glòria de Sant Jaume — idiomas (cliente) + menú móvil.
   No modifica el HTML original: guarda el texto EN y lo sustituye por
   la traducción del idioma elegido. Idiomas: EN · ES · DE · FR · SV.
   Datos de traducción en js/i18n-data.js (window.I18N_DATA).
   ===================================================================== */
(function(){
  var LANGS = {en:"English", es:"Español", de:"Deutsch", fr:"Français", sv:"Svenska"};
  var KEY = "gloria_lang";
  var data = window.I18N_DATA || {};
  var snap = [];
  var snapAttr = [];

  /* ---- menú móvil (se construye ANTES del snapshot para que se traduzca) ---- */
  function buildMobileMenu(){
    var header = document.getElementById("header");
    var nav = document.querySelector(".main-nav");
    if(!header || !nav) return null;
    var menu = document.createElement("div");
    menu.className = "mobile-menu";
    menu.setAttribute("aria-hidden", "true");

    var close = document.createElement("button");
    close.type = "button"; close.className = "mm-close"; close.setAttribute("aria-label","Close"); close.innerHTML = "&times;";
    menu.appendChild(close);

    var links = document.createElement("nav"); links.className = "mm-links";
    nav.querySelectorAll("a").forEach(function(a){
      var c = a.cloneNode(true); c.className = "";
      links.appendChild(c);
    });
    menu.appendChild(links);

    var book = document.createElement("a");
    book.className = "btn btn-ghost-light mm-book";
    book.href = "index.html#book";          // site.js lo cablea al motor de reservas
    book.textContent = "Book";
    book.setAttribute("data-book","");
    menu.appendChild(book);

    var langs = document.createElement("div"); langs.className = "mm-langs";
    Object.keys(LANGS).forEach(function(code){
      var b = document.createElement("a");
      b.href = "#"; b.setAttribute("data-lang", code); b.textContent = code.toUpperCase();
      b.addEventListener("click", function(e){ e.preventDefault(); apply(code); closeMenu(); });
      langs.appendChild(b);
    });
    menu.appendChild(langs);

    header.appendChild(menu);

    var toggle = header.querySelector(".nav-toggle");
    menu.id = "mobile-menu";
    if(toggle){ toggle.setAttribute("aria-controls","mobile-menu"); toggle.setAttribute("aria-expanded","false"); }
    function openMenu(){ menu.classList.add("open"); menu.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden";
      if(toggle) toggle.setAttribute("aria-expanded","true"); close.focus(); }
    function closeMenu(){ if(!menu.classList.contains("open")) return; menu.classList.remove("open"); menu.setAttribute("aria-hidden","true"); document.body.style.overflow="";
      if(toggle){ toggle.setAttribute("aria-expanded","false"); toggle.focus(); } }
    document.addEventListener("keydown", function(e){ if(e.key === "Escape") closeMenu(); });
    if(toggle) toggle.addEventListener("click", function(e){ e.stopPropagation(); menu.classList.contains("open") ? closeMenu() : openMenu(); });
    close.addEventListener("click", closeMenu);
    links.querySelectorAll("a").forEach(function(a){ a.addEventListener("click", closeMenu); });
    window.__gloriaCloseMenu = closeMenu;
    return menu;
  }

  function snapshot(){
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function(n){
        var p = n.parentNode;
        if(!p) return NodeFilter.FILTER_REJECT;
        var tag = p.nodeName.toLowerCase();
        if(tag==="script"||tag==="style"||tag==="noscript") return NodeFilter.FILTER_REJECT;
        if(p.closest && p.closest(".logo, .lang, .mm-langs, [data-noi18n]")) return NodeFilter.FILTER_REJECT;
        if(!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n; while((n = walker.nextNode())) snap.push({node:n, en:n.nodeValue});
    // placeholders y claves estables (en inglés) para la analítica
    document.querySelectorAll("[placeholder]").forEach(function(el){
      if(!el.closest("[data-noi18n]")) snapAttr.push({el:el, attr:"placeholder", en:el.getAttribute("placeholder")});
    });
    document.querySelectorAll(".eyebrow").forEach(function(el){
      if(!el.hasAttribute("data-key")) el.setAttribute("data-key", el.textContent.trim());
    });
  }

  function apply(lang){
    var dict = data[lang] || {};
    snap.forEach(function(it){
      var en = it.en, core = en.trim();
      if(lang==="en"){ if(it.node.nodeValue!==en) it.node.nodeValue = en; return; }
      var t = dict[core];
      it.node.nodeValue = t ? en.replace(core, t) : en;
    });
    snapAttr.forEach(function(it){
      var t = lang === "en" ? null : dict[it.en.trim()];
      it.el.setAttribute(it.attr, t || it.en);
    });
    document.documentElement.lang = lang;
    try{ localStorage.setItem(KEY, lang); }catch(e){}
    var lbl = document.getElementById("langLabel");
    if(lbl) lbl.textContent = lang.toUpperCase();
    document.querySelectorAll(".lang-menu a, .mm-langs a").forEach(function(a){
      a.setAttribute("aria-current", a.getAttribute("data-lang")===lang ? "true" : "false");
    });
    try{ document.dispatchEvent(new CustomEvent("gloria:lang", {detail:lang})); }catch(e){}
  }

  function buildSwitcher(){
    var host = document.querySelector(".lang");
    if(!host) return;
    host.classList.add("lang-switch");
    host.innerHTML = "";
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "lang-btn";
    btn.innerHTML = '<span id="langLabel">EN</span> <span aria-hidden="true">&#9662;</span>';
    var menu = document.createElement("div");
    menu.className = "lang-menu";
    Object.keys(LANGS).forEach(function(code){
      var a = document.createElement("a");
      a.href = "#"; a.setAttribute("data-lang", code); a.textContent = LANGS[code];
      a.addEventListener("click", function(e){ e.preventDefault(); apply(code); menu.classList.remove("open"); });
      menu.appendChild(a);
    });
    btn.addEventListener("click", function(e){ e.stopPropagation(); menu.classList.toggle("open"); });
    document.addEventListener("click", function(){ menu.classList.remove("open"); });
    host.appendChild(btn); host.appendChild(menu);
  }

  function init(){
    buildMobileMenu();
    snapshot();
    buildSwitcher();
    var saved = "en";
    try{ saved = localStorage.getItem(KEY) || "en"; }catch(e){}
    apply(saved);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
