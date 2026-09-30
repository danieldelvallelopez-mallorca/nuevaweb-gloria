/* Glòria Guest (guest.html):
   1) catálogo de servicios y experiencias, leído de data/services.json a través de js/requests.js
      (window.gloriaRequest.catalog): añadir un servicio al JSON lo muestra aquí; "active": false lo oculta.
   2) música de los próximos 7 días en El Patio (window.GLORIA_MUSIC, js/music-data.js, generado por tools/music_month.py).
   Textos fijos en inglés como clave; traducciones en js/i18n-data.js. */
(function(){
  var DAYS = 7;
  var CLOSED = [2, 3];                          // JS getDay(): martes y miércoles El Patio descansa
  var TIME = "20:00 – 22:00";
  var LANGS = ["en", "es", "de", "fr", "sv"];
  /* Iconos de línea (viewBox 32×32) para los nombres de icono del catálogo. */
  var ICONS = {
    fork:     "M10 4v8a3 3 0 0 0 6 0V4M13 4v24M22 28V4c-3 2-4 6-4 10h4",
    cup:      "M6 12h16v7a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7zM22 14h2a3 3 0 0 1 0 6h-2M4 29h22M11 4c-1 2 1 3 0 5M16 4c-1 2 1 3 0 5",
    basket:   "M4 13h24l-3 14H7zM9 13l5-8M23 13l-5-8M11 18v5M16 18v5M21 18v5",
    gift:     "M5 12h22v5H5zM7 17h18v11H7zM16 12v16M16 12c-2-5-8-6-8-2 0 2 4 2 8 2zM16 12c2-5 8-6 8-2 0 2-4 2-8 2z",
    leaf:     "M16 27c-6 0-10-4-10-9 4 0 8 2 10 6 2-4 6-6 10-6 0 5-4 9-10 9zM16 24c-2-3-3-6-3-9 0-3 1.5-6 3-8 1.5 2 3 5 3 8 0 3-1 6-3 9z",
    glass:    "M10 4h12c0 7-2 12-6 12s-6-5-6-12zM16 16v11M11 28h10M10.4 9h11.2",
    ring:     "M24 20a8 8 0 1 1-16 0a8 8 0 1 1 16 0zM12 7l2-3h4l2 3-4 5z",
    plane:    "M4 15l24-9-5 21-7-6-4 5v-7zM12 19l16-13",
    car:      "M5 21v-4l3-7h16l3 7v4zM5 21v4h4v-4M23 21v4h4v-4M8 17h16M9 19.5h1M22 19.5h1",
    mountain: "M3 26l9-14 5 7 4-5 8 12zM12 12l2.5 4",
    clock:    "M28 16a12 12 0 1 1-24 0a12 12 0 1 1 24 0zM16 9v7l5 3",
    key:      "M16 21a5 5 0 1 1-10 0a5 5 0 1 1 10 0zM14.5 17.5L27 5M22 10l3 3M19 13l2.5 2.5",
    sparkle:  "M16 4c1 6 3 9 9 10-6 1-8 4-9 10-1-6-3-9-9-10 6-1 8-4 9-10zM25 22c.4 2 1 3 3 3.5-2 .5-2.6 1.5-3 3.5-.4-2-1-3-3-3.5 2-.5 2.6-1.5 3-3.5z"
  };

  /* NFC/QR de habitación o zona: el botón «Pedir a la habitación» va directo a su carta
     (sin código) y se muestra dónde está el cliente. Desde la web: habitación + código. */
  function applyLocation(){
    var L = window.gloriaLocation;
    var a = document.querySelector(".gx-act-main");
    if(a && L) a.href = L.orderUrl();
    var badge = document.querySelector(".gx-loc");
    if(L && L.id){
      if(!badge){
        badge = el("p", "gx-loc");
        var h = document.querySelector(".gx-title");
        if(h) h.parentNode.insertBefore(badge, h);
      }
      badge.textContent = L.label(t);
    }
  }

  function lang(){ var l = (document.documentElement.lang || "en").slice(0, 2); return LANGS.indexOf(l) > -1 ? l : "en"; }
  function t(s){ var d = (window.I18N_DATA || {})[lang()] || {}; return d[s] || s; }
  function tx(o){ if(o == null) return ""; if(typeof o === "string") return o; return o[lang()] || o.en || o.es || ""; }
  function el(tag, cls, txt){ var e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; }
  function fmt(d, o){ try{ return d.toLocaleDateString(lang(), o); }catch(e){ return d.toDateString(); } }

  function icon(name){
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 32 32"); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("class", "gx-ico");
    var p = document.createElementNS(ns, "path"); p.setAttribute("d", ICONS[name] || ICONS.sparkle);
    svg.appendChild(p);
    return svg;
  }

  /* ---------- 1 · servicios y experiencias ---------- */
  function serviceCard(s){
    var li = el("li", "gx-svc");
    li.appendChild(icon(s.icon));
    li.appendChild(el("h4", "gx-svc-title", tx(s.title)));
    if(s.desc) li.appendChild(el("p", "gx-svc-desc", tx(s.desc)));
    li.appendChild(el("p", "gx-svc-price" + (s.price ? "" : " is-tbc"), s.price ? tx(s.price) : t("We will confirm availability and price.")));
    if(s.link && s.link.url){                   // p. ej. calendario del taller en sabeneida.com
      var lk = el("a", "link-arrow gx-svc-link", tx(s.link.label) + " →");
      lk.href = s.link.url; lk.target = "_blank"; lk.rel = "noopener";
      li.appendChild(lk);
    }
    var b = el("a", "btn btn-ghost gx-svc-btn", t("Request"));
    b.href = "#"; b.setAttribute("role", "button"); b.setAttribute("data-request", s.id);
    b.setAttribute("aria-label", t("Request") + " · " + tx(s.title));
    li.appendChild(b);
    return li;
  }
  function renderServices(){
    var host = document.getElementById("gx-svc-list");
    if(!host) return;
    if(!window.gloriaRequest || !window.gloriaRequest.catalog){ host.setAttribute("aria-busy", "false"); return; }
    window.gloriaRequest.catalog().then(function(cat){
      host.innerHTML = "";
      var seen = {};
      var groups = cat.categories.map(function(c){ return {cat:c, list:cat.services.filter(function(s){ return s.category === c.id; })}; });
      groups.forEach(function(g){ g.list.forEach(function(s){ seen[s.id] = true; }); });
      var orphans = cat.services.filter(function(s){ return !seen[s.id]; });   // servicio con categoría desconocida: al final, sin título
      if(orphans.length) groups.push({cat:null, list:orphans});
      groups.forEach(function(g){
        if(!g.list.length) return;
        var sec = el("section", "gx-svc-group");
        if(g.cat){
          var h = el("h3", "gx-svc-cat");
          h.appendChild(icon(g.cat.icon));
          h.appendChild(el("span", null, tx(g.cat.title)));
          sec.appendChild(h);
        }
        var ul = el("ul", "gx-svc-grid");
        g.list.forEach(function(s){ ul.appendChild(serviceCard(s)); });
        sec.appendChild(ul);
        host.appendChild(sec);
      });
      host.setAttribute("aria-busy", "false");
    }, function(){
      host.innerHTML = "";
      host.appendChild(el("p", "gx-svc-error", t("We could not load the services. Please call us or send us a WhatsApp.")));
      host.setAttribute("aria-busy", "false");
    });
  }

  /* ---------- 2 · música de la semana ---------- */
  /** Artista de un día, o null si el calendario del mes no lo trae. */
  function artistOn(d){
    var m = window.GLORIA_MUSIC;
    if(!m || d.getFullYear() !== m.year || d.getMonth() + 1 !== m.month) return null;
    var e = m.entries && m.entries[String(d.getDate())];
    return e ? {name:e[0], extra:e[1] || ""} : null;
  }

  function renderMusic(){
    var list = document.getElementById("gx-days");
    if(!list) return;
    var time = (window.GLORIA_MUSIC && window.GLORIA_MUSIC.time) || TIME;
    var d0 = new Date(); d0.setHours(0, 0, 0, 0);
    list.innerHTML = "";
    for(var i = 0; i < DAYS; i++){
      var d = new Date(d0.getTime()); d.setDate(d0.getDate() + i);
      if(CLOSED.indexOf(d.getDay()) > -1) continue;
      var a = artistOn(d);
      var li = el("li", "gx-day" + (i === 0 ? " is-tonight" : ""));
      var when = el("span", "gx-d-when");
      when.appendChild(el("span", "gx-d-wd", i === 0 ? t("Tonight") : fmt(d, {weekday:"long"})));
      when.appendChild(el("span", "gx-d-date", fmt(d, {day:"numeric", month:"short"})));
      var art = el("span", "gx-d-art", a ? a.name : t("Live music"));
      if(a && a.extra) art.appendChild(el("small", null, a.extra));
      li.appendChild(when); li.appendChild(art); li.appendChild(el("span", "gx-d-time", time));
      list.appendChild(li);
    }
  }

  function render(){ renderServices(); renderMusic(); }
  function init(){ render(); document.addEventListener("gloria:lang", render); }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  applyLocation();
  document.addEventListener("gloria:lang", applyLocation);
})();
