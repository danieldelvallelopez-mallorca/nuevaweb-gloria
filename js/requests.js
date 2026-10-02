/* =====================================================================
   Solicitudes de servicios (mesa, spa, traslados, sorpresas, check-out tardío…).
   No es disponibilidad en tiempo real: el cliente envía una SOLICITUD
   a api/request.php y el equipo la confirma después.
   El catálogo (única fuente de verdad, también para el PHP) está en
   data/services.json: el formulario se construye a partir de la definición
   de cada servicio (fecha, días cerrados, antelación, hora, personas,
   campos extra, habitación obligatoria si stayOnly).
   Se abre con cualquier elemento [data-request="<id de servicio>"]
   (p. ej. "restaurant" | "spa") o con window.gloriaRequest.open(id, trigger, prefill).
   Textos fijos en inglés como clave; traducciones en js/i18n-data.js.
   ===================================================================== */
(function(){
  var ENDPOINT = "api/request.php";
  var CATALOG_URL = "data/services.json";
  var LANGS = ["en", "es", "de", "fr", "sv"];
  var MAX_DAYS = 180;
  var SEARCH_DAYS = 21;                          // días que se miran para proponer la primera fecha libre
  var SELECT_NUMBER_SPAN = 30;                   // campos numéricos con rango pequeño → desplegable
  var ROOMS = ["101","102","103","104","105","106","107","201","202","203","204","205","206","207"];
  var ZONES = ["rooftop-1","rooftop-2","rooftop-3","spa","bar"];

  /* Ubicación del cliente: cada NFC/QR del hotel abre guest.html?room=<habitación o zona>.
     Se recuerda durante la visita (sessionStorage) y, si es una habitación, 4 días en el móvil
     (localStorage) para que la «app» instalada en la pantalla de inicio la siga sabiendo.
     Cada nuevo escaneo de NFC/QR la sustituye. */
  var LOC_DAYS = 4;
  var LOC = (function(){
    function ok(x){ return !!x && (ROOMS.indexOf(x) > -1 || ZONES.indexOf(x) > -1); }
    var v = null;
    try{ v = new URLSearchParams(location.search).get("room"); }catch(e){}
    v = v ? String(v).toLowerCase().trim() : null;
    if(ok(v)){
      try{ sessionStorage.setItem("gloria_loc", v); }catch(e){}
      try{ if(ROOMS.indexOf(v) > -1) localStorage.setItem("gloria_room", JSON.stringify({r:v, t:Date.now()})); }catch(e){}
      return v;
    }
    try{ var s = sessionStorage.getItem("gloria_loc"); if(ok(s)) return s; }catch(e){}
    try{
      var saved = JSON.parse(localStorage.getItem("gloria_room") || "null");
      if(saved && ok(saved.r) && Date.now() - saved.t < LOC_DAYS * 864e5) return saved.r;
    }catch(e){}
    return null;
  })();
  window.gloriaLocation = {
    id: LOC,
    isRoom: !!LOC && ROOMS.indexOf(LOC) > -1,
    label: function(tfn){
      if(!LOC) return "";
      if(ROOMS.indexOf(LOC) > -1) return (tfn ? tfn("Room") : "Room") + " " + LOC;
      return LOC.split("-").map(function(w){ return w.charAt(0).toUpperCase() + w.slice(1); }).join(" ");
    },
    orderUrl: function(){
      return "https://hotelgloriapedidos.es/" + (LOC ? "?room=" + encodeURIComponent(LOC) : "?acceso=1");
    }
  };
  var PHONE_RE = /^[0-9+() .\/\-]{6,40}$/;       // mismas reglas que api/request.php y la tabla `requests`
  var EMAIL_RE = /^[^\s@?&=<>"']+@[^\s@?&=<>"']+\.[^\s@?&=<>"']+$/;
  var PHONE_LABEL = "+34 971 71 79 97";
  var ERRORS = {
    fields: "Please fill in the required fields.",
    contact: "Please give us a phone number or an email so we can confirm.",
    email: "Please enter a valid email.",
    phone: "Please enter a valid phone number.",
    date: "Please choose a date within the next six months.",
    time: "Please choose a time.",
    noslots: "There are no times left for this day. Please choose another day.",
    lead: "Please request this at least {h} hours in advance.",
    pax: "Please fill in the required fields.",
    treatment: "Please choose a treatment.",
    room: "Please enter a valid room number, or leave it empty.",
    roomReq: "Please enter your room number.",
    consent: "Please accept the data protection information to send your request.",
    rate: "Too many requests. Please try again later.",
    generic: "Sorry, we could not send your request. Please try again later or call us on {ph}."
  };

  var overlay = null, dialog = null, trigger = null, sending = false, current = null, openSeq = 0;
  var catalogP = null;

  function lang(){ var l = (document.documentElement.lang || "en").slice(0, 2); return LANGS.indexOf(l) > -1 ? l : "en"; }
  function t(s, vars){
    var d = (window.I18N_DATA || {})[lang()] || {};
    var out = d[s] || s;
    for(var k in (vars || {})) out = out.replace("{" + k + "}", vars[k]);
    return out;
  }
  /** Texto del catálogo en el idioma de la página (objeto {es,en,de,fr,sv} o cadena). */
  function tx(o){
    if(o == null) return "";
    if(typeof o === "string") return o;
    return o[lang()] || o.en || o.es || "";
  }
  function track(n, p){ if(window.gloriaTrack) window.gloriaTrack(n, p || {}); }
  function el(tag, cls, txt){ var e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; }
  function pad(n){ return (n < 10 ? "0" : "") + n; }
  function iso(d){ return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseIso(s){ var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return p ? new Date(+p[1], p[2] - 1, +p[3]) : null; }
  function today(){ var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function addDays(d, n){ var r = new Date(d.getTime()); r.setDate(r.getDate() + n); return r; }
  function hhmm(mins){ return pad(Math.floor(mins / 60)) + ":" + pad(mins % 60); }
  function mins(s){ var m = /^(\d{2}):(\d{2})$/.exec(s || ""); return m ? +m[1] * 60 + +m[2] : null; }
  function fmtDate(d){ try{ return d.toLocaleDateString(lang(), {weekday:"long", day:"numeric", month:"long"}); }catch(e){ return iso(d); } }

  /* ---------- catálogo (data/services.json, se descarga una vez) ---------- */
  function normalize(c){
    var services = (c && c.services || []).filter(function(s){ return s && s.id && s.active !== false; });
    var byId = {}, cats = {};
    services.forEach(function(s){ byId[s.id] = s; });
    (c && c.categories || []).forEach(function(k){ cats[k.id] = k; });
    return {categories:(c && c.categories) || [], services:services, byId:byId, cats:cats};
  }
  function catalog(){
    if(!catalogP){
      catalogP = fetch(CATALOG_URL, {cache:"no-cache", credentials:"same-origin"})
        .then(function(r){ if(!r.ok) throw new Error("catalog http " + r.status); return r.json(); })
        .then(normalize)
        .catch(function(e){ catalogP = null; throw e; });
    }
    return catalogP;
  }

  /* ---------- reglas de fecha y hora de un servicio ---------- */
  function closedDays(svc){ return ((svc.date && svc.date.closedWeekdays) || []).map(function(n){ return n % 7; }); }   // ISO 1=lun…7=dom → JS getDay()
  function slots(svc){
    var out = [], tm = svc.time; if(!tm) return out;
    var a = mins(tm.from), b = mins(tm.to), step = +tm.step || 30;
    if(a == null || b == null) return out;
    for(var m = a; m <= b; m += step) out.push(m);
    return out;
  }
  function earliest(svc){ return Date.now() + (+svc.leadHours || 0) * 3600000; }
  /** ¿Se puede pedir el servicio para ese día y esos minutos (o, sin hora, para ese día)? */
  function momentOk(svc, day, m){
    if(m == null){ return addDays(day, 1).getTime() > earliest(svc); }          // sin hora: basta con que quede parte del día
    var at = new Date(day.getTime()); at.setHours(0, m, 0, 0);
    return at.getTime() > Date.now() && at.getTime() >= earliest(svc);
  }
  function inRange(d){ var t0 = today(); return d >= t0 && d <= addDays(t0, MAX_DAYS); }
  /** Código de error del día ("" si vale). */
  function dayError(svc, d){
    if(!d || isNaN(d) || !inRange(d)) return "date";
    if(closedDays(svc).indexOf(d.getDay()) > -1) return "closed";
    if(!svc.time) return momentOk(svc, d, null) ? "" : "lead";
    var any = slots(svc).some(function(m){ return momentOk(svc, d, m); });
    return any ? "" : (+svc.leadHours ? "lead" : "noslots");
  }
  function firstOpenDay(svc){
    var t0 = today();
    for(var i = 0; i <= SEARCH_DAYS; i++){ var d = addDays(t0, i); if(!dayError(svc, d)) return d; }
    return t0;
  }
  /** Horas del día: se desactivan las que ya han pasado o no respetan la antelación. */
  function fillTimes(sel, svc, dateStr){
    var keep = sel.value, day = parseIso(dateStr);
    while(sel.options.length > 1) sel.remove(1);
    slots(svc).forEach(function(m){
      var op = el("option", null, hhmm(m)); op.value = hhmm(m);
      if(!day || !momentOk(svc, day, m)) op.disabled = true;
      sel.appendChild(op);
    });
    var match = Array.prototype.filter.call(sel.options, function(o){ return o.value === keep && !o.disabled; })[0];
    sel.value = match ? keep : "";
  }
  /** Mesa: por defecto las 20:00 (empieza la música) o la primera hora libre. El resto: sin hora por defecto. */
  function defaultTime(sel, svc){
    if(svc.id !== "restaurant" || sel.value) return;
    var ok = Array.prototype.filter.call(sel.options, function(o){ return o.value && !o.disabled; });
    var pick = ok.filter(function(o){ return o.value === "20:00"; })[0] || ok[0];
    sel.value = pick ? pick.value : "";
  }
  function errorText(code, svc){
    if(code === "closed"){
      if(svc && svc.id === "restaurant") return t("El Patio rests on Tuesdays and Wednesdays. Please choose another day.");
      if(svc && svc.date && svc.date.closedNote) return tx(svc.date.closedNote).replace(/\.?$/, ". ") + t("Please choose another day.");
      return t("This day is not available. Please choose another day.");
    }
    if(code === "lead") return t(ERRORS.lead, {h:(svc && +svc.leadHours) || 0});
    return t(ERRORS[code] || ERRORS.generic, {ph:PHONE_LABEL});
  }

  /* ---------- controles ---------- */
  var uid = 0;
  function field(label, control, opts){
    opts = opts || {};
    var id = "rq-f" + (++uid);
    var w = el("div", "rq-field" + (opts.cls ? " " + opts.cls : ""));
    var l = el("label"); l.htmlFor = id;
    l.appendChild(document.createTextNode(label));
    if(opts.required) l.appendChild(el("span", "rq-req", " *"));
    if(opts.optional) l.appendChild(el("span", "rq-opt", " · " + t("Optional")));
    control.id = id;
    w.appendChild(l); w.appendChild(control);
    if(opts.hint){
      var h = el("p", "rq-hint", opts.hint); h.id = id + "-h";
      control.setAttribute("aria-describedby", h.id);
      w.appendChild(h);
    }
    return w;
  }
  function input(type, name, attrs){
    var i = el("input"); i.type = type; i.name = name;
    for(var k in (attrs || {})) i.setAttribute(k, attrs[k]);
    return i;
  }
  /** options: [[valor, texto]]; placeholder: texto ya traducido (opción vacía). */
  function select(name, options, placeholder, disabledPlaceholder){
    var s = el("select"); s.name = name;
    if(placeholder != null){ var p = el("option", null, placeholder); p.value = ""; if(disabledPlaceholder){ p.disabled = true; } p.selected = true; s.appendChild(p); }
    options.forEach(function(o){ var op = el("option", null, o[1]); op.value = o[0]; s.appendChild(op); });
    return s;
  }
  function range(a, b){ var r = []; for(var i = a; i <= b; i++) r.push([String(i), String(i)]); return r; }
  function rows(form, items){
    for(var i = 0; i < items.length; i += 2){
      var r = el("div", "rq-row");
      r.appendChild(items[i]);
      if(items[i + 1]) r.appendChild(items[i + 1]); else r.classList.add("rq-row-1");
      form.appendChild(r);
    }
  }
  /** Campo extra del catálogo: select (opciones), text (máx. caracteres) o number (entero en rango). */
  function extraControl(f){
    var name = "x-" + f.name, req = !!f.required;
    if(f.type === "select"){
      var opts = (f.options || []).map(function(o){ return [o.value, tx(o.label)]; });
      var s = select(name, opts, f.name === "treatment" ? t("Choose a treatment") : t("Choose…"), req);
      if(req) s.required = true;
      return s;
    }
    if(f.type === "number"){
      var lo = +f.min || 0, hi = f.max != null ? +f.max : lo + 20;
      if(hi - lo <= SELECT_NUMBER_SPAN){
        var n = select(name, range(lo, hi), req ? t("Choose…") : "—", req);
        if(req) n.required = true;
        return n;
      }
      return input("number", name, {min:String(lo), max:String(hi), step:"1", inputmode:"numeric"});
    }
    var a = {maxlength:String(+f.max || 120), autocomplete:"off"};
    if(req) a.required = "";
    return input("text", name, a);
  }

  /* ---------- diálogo ---------- */
  function shell(eyebrow, title){
    overlay = el("div", "rq-overlay"); overlay.setAttribute("data-noi18n", "");
    dialog = el("div", "rq-dialog");
    dialog.setAttribute("role", "dialog"); dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "rq-title"); dialog.setAttribute("aria-describedby", "rq-intro");
    var head = el("div", "rq-head");
    if(eyebrow) head.appendChild(el("span", "rq-eyebrow", eyebrow));
    var h = el("h2", "rq-title", title); h.id = "rq-title"; head.appendChild(h);
    var x = el("button", "rq-x"); x.type = "button"; x.setAttribute("aria-label", t("Close")); x.innerHTML = "<span aria-hidden=\"true\">&times;</span>";
    x.addEventListener("click", close);
    var body = el("div", "rq-body");
    dialog.appendChild(x); dialog.appendChild(head); dialog.appendChild(body);
    overlay.appendChild(dialog);
    overlay.addEventListener("mousedown", function(e){ if(e.target === overlay) close(); });
    dialog.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);
    return {head:head, body:body};
  }

  function build(svc, cat){
    var parts = shell(cat ? tx(cat.title) : "", tx(svc.title));
    var head = parts.head;
    head.appendChild(el("p", "rq-price", svc.price ? tx(svc.price) : t("We will confirm availability and price.")));
    var intro = el("p", "rq-intro", t("Send us your request and our team will confirm it shortly. This is not yet a confirmed booking.")); intro.id = "rq-intro";
    head.appendChild(intro);

    var form = el("form", "rq-form"); form.noValidate = true; form.setAttribute("data-kind", svc.id);
    var fields = svc.fields || [];
    var t0 = today(), start = firstOpenDay(svc);

    // 1 · desplegables del servicio (tratamiento, trayecto, ocasión…) arriba, a todo el ancho
    fields.filter(function(f){ return f.type === "select"; }).forEach(function(f){
      form.appendChild(field(tx(f.label), extraControl(f), {required:!!f.required, optional:!f.required}));
    });

    // 2 · fecha, hora, personas, campos cortos y habitación, de dos en dos
    var small = [];
    var date = input("date", "date", {min:iso(t0), max:iso(addDays(t0, MAX_DAYS)), required:""}); date.value = iso(start);
    var closedNote = svc.date && svc.date.closedNote ? tx(svc.date.closedNote) : null;
    small.push(field(t("Date"), date, {required:true, hint:closedNote}));
    var time = null;
    if(svc.time){
      time = select("time", [], t("Choose…"), true); time.required = true;
      fillTimes(time, svc, date.value);
      defaultTime(time, svc);
      small.push(field(svc.time.label ? tx(svc.time.label) : t("Time"), time, {required:true}));
    }
    if(svc.pax){
      var pmin = Math.max(1, +svc.pax.min || 1), pmax = Math.max(pmin, +svc.pax.max || pmin);
      var pax = select("pax", range(pmin, pmax));
      pax.value = String(svc.id === "restaurant" && pmax >= 2 ? Math.max(2, pmin) : pmin);
      small.push(field(svc.pax.label ? tx(svc.pax.label) : t("Guests"), pax,
        {required:true, hint: svc.id === "restaurant" ? t("For groups over 10, please contact us") : null}));
    }
    fields.filter(function(f){ return f.type !== "select"; }).forEach(function(f){
      small.push(field(tx(f.label), extraControl(f), {required:!!f.required, optional:!f.required}));
    });
    var roomAttrs = {inputmode:"numeric", maxlength:"3", pattern:"[0-9]{3}", autocomplete:"off"};
    if(svc.stayOnly) roomAttrs.required = "";
    // desde el NFC de una habitación la habitación ya se sabe: se rellena y se bloquea
    if(window.gloriaLocation.isRoom){ roomAttrs.value = LOC; roomAttrs.readonly = ""; }
    small.push(field(t(svc.stayOnly ? "Room number" : "Room number (if you are staying with us)"), input("text", "room", roomAttrs),
      svc.stayOnly ? {required:true} : {optional:true}));
    rows(form, small);

    // 3 · contacto, notas, consentimiento
    // desde el NFC de una habitación ya sabemos a dónde ir: nombre y contacto opcionales
    var known = window.gloriaLocation.isRoom;
    form.appendChild(field(t("Name"), input("text", "name", known ? {autocomplete:"name", maxlength:"120"} : {autocomplete:"name", maxlength:"120", required:""}),
      known ? {optional:true} : {required:true}));
    rows(form, [
      field(t("Phone"), input("tel", "phone", {autocomplete:"tel", maxlength:"40", inputmode:"tel"})),
      field(t("Email"), input("email", "email", {autocomplete:"email", maxlength:"160"}))
    ]);
    if(!known) form.appendChild(el("p", "rq-hint rq-contact-hint", t("Please give us a phone number or an email so we can confirm.")));

    var notes = el("textarea"); notes.name = "notes"; notes.rows = 3; notes.maxLength = 600;
    notes.placeholder = t(svc.id === "restaurant" ? "Allergies, a special occasion, preferences…" :
      svc.id === "spa" ? "Anything we should know before your treatment…" : "Anything we should know…");
    form.appendChild(field(t("Notes"), notes, {optional:true}));

    // campo trampa para bots (oculto a personas y lectores de pantalla)
    var hp = el("div", "rq-hp"); hp.setAttribute("aria-hidden", "true");
    hp.appendChild(input("text", "website", {tabindex:"-1", autocomplete:"off"}));
    form.appendChild(hp);

    var check = el("label", "rq-check");
    check.appendChild(input("checkbox", "consent", {value:"1"}));
    var ct = el("span", null, t("I accept the processing of my data to manage this request.") + " ");
    var pl = el("a", null, t("Privacy Policy")); pl.href = "privacy.html"; pl.target = "_blank"; pl.rel = "noopener";
    ct.appendChild(pl);
    check.appendChild(ct);
    form.appendChild(check);

    var actions = el("div", "rq-actions");
    var send = el("button", "btn btn-green rq-send", t("Send request")); send.type = "submit";
    var status = el("p", "rq-status"); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    actions.appendChild(send); actions.appendChild(status);
    form.appendChild(actions);

    date.addEventListener("change", function(){
      if(time){ fillTimes(time, svc, date.value); defaultTime(time, svc); }
      checkDate(form, false);
    });
    form.addEventListener("submit", function(e){ e.preventDefault(); submit(form); });
    parts.body.appendChild(form);
  }

  /** Aviso si el catálogo no se ha podido cargar (sin conexión, error del servidor…). */
  function buildUnavailable(){
    var parts = shell("", t("Guest services"));
    var p = el("p", "rq-intro", errorText("generic")); p.id = "rq-intro";
    parts.head.appendChild(p);
    var done = el("button", "btn btn-green rq-close", t("Close")); done.type = "button";
    done.addEventListener("click", close);
    parts.body.appendChild(done);
  }

  function focusables(){
    return Array.prototype.filter.call(
      dialog.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]):not([tabindex='-1']), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"),
      function(n){ return n.offsetParent !== null || n === document.activeElement; });
  }
  function onKey(e){
    if(e.key === "Escape"){ e.stopPropagation(); close(); return; }
    if(e.key !== "Tab") return;
    var f = focusables(); if(!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }

  /** Rellena fecha, hora y personas (p. ej. lo ya elegido en el concierge). */
  function prefill(svc, pre){
    if(!pre) return;
    var form = dialog.querySelector(".rq-form"), E = form.elements;
    if(pre.date && parseIso(pre.date)){
      E.date.value = pre.date;
      if(E.time){ fillTimes(E.time, svc, pre.date); defaultTime(E.time, svc); }
      checkDate(form, true);
    }
    if(pre.time && E.time && Array.prototype.some.call(E.time.options, function(o){ return o.value === pre.time && !o.disabled; })) E.time.value = pre.time;
    if(pre.pax && E.pax && Array.prototype.some.call(E.pax.options, function(o){ return o.value === String(pre.pax); })) E.pax.value = String(pre.pax);
  }

  function show(){
    document.documentElement.classList.add("rq-lock");
    requestAnimationFrame(function(){ if(overlay) overlay.classList.add("is-open"); });
    var first = dialog.querySelector("select, input:not([type=hidden])");
    setTimeout(function(){ if(!dialog) return; (window.innerWidth > 700 && first ? first : dialog.querySelector(".rq-x")).focus(); }, 40);
  }

  function open(kind, from, pre){
    var seq = ++openSeq;
    var who = from || document.activeElement;
    if(window.__gloriaCloseMenu) window.__gloriaCloseMenu();
    return catalog().then(function(cat){
      if(seq !== openSeq) return;                                  // se abrió otro mientras cargaba
      var svc = cat.byId[kind];
      if(!svc) return;
      if(overlay) close(true);
      trigger = who; current = svc;
      build(svc, cat.cats[svc.category]);
      prefill(svc, pre);
      show();
      track("request_open", {kind:kind, page:location.pathname});
    }, function(){
      if(seq !== openSeq) return;
      if(overlay) close(true);
      trigger = who; current = null;
      buildUnavailable();
      show();
      track("request_error", {error:"catalog"});
    });
  }
  function close(silent){
    if(!overlay) return;
    var o = overlay; overlay = null; dialog = null; sending = false; current = null;
    o.remove();
    document.documentElement.classList.remove("rq-lock");
    if(silent !== true && trigger && trigger.focus && document.contains(trigger)) trigger.focus();
    trigger = null;
  }

  /* ---------- validación y envío ---------- */
  function mark(form, name, bad){
    var c = form.elements[name]; if(!c) return;
    var f = c.closest(".rq-field"); if(f) f.classList.toggle("is-invalid", bad);
    if(bad) c.setAttribute("aria-invalid", "true"); else c.removeAttribute("aria-invalid");
  }
  function say(form, text, kind){
    var s = form.querySelector(".rq-status");
    s.textContent = text;
    s.className = "rq-status" + (kind ? " is-" + kind : "");
  }
  /** Devuelve el código de error de la fecha o "" si es válida. */
  function checkDate(form, quiet){
    var err = dayError(current, parseIso(form.elements.date.value));
    mark(form, "date", !!err);
    if(!quiet) say(form, err ? errorText(err, current) : "", err ? "err" : "");
    return err;
  }
  function validate(form){
    var svc = current, E = form.elements, err = "", first = null;
    function fail(name, code){ mark(form, name, true); if(!err){ err = code; first = E[name]; } }
    Array.prototype.forEach.call(E, function(c){ if(c.name) mark(form, c.name, false); });
    (svc.fields || []).forEach(function(f){
      var c = E["x-" + f.name]; if(!c) return;
      var v = c.value.trim();
      if(f.required && v === "") fail(c.name, f.name === "treatment" ? "treatment" : "fields");
      else if(f.type === "number" && v !== "" && (!/^-?\d+$/.test(v) || +v < +f.min || +v > +f.max)) fail(c.name, "fields");
    });
    var dErr = checkDate(form, true); if(dErr) fail("date", dErr);
    if(E.time && !E.time.value) fail("time", "time");
    var known = window.gloriaLocation.isRoom;
    if(!known && !E.name.value.trim()) fail("name", "fields");
    var ph = E.phone.value.trim(), em = E.email.value.trim();
    if(ph && !PHONE_RE.test(ph)) fail("phone", "phone");
    if(em && !EMAIL_RE.test(em)) fail("email", "email");
    if(!known && !ph && !em){ fail("phone", "contact"); mark(form, "email", true); }
    var room = E.room.value.trim();
    if(svc.stayOnly && !room) fail("room", "roomReq");
    else if(room && ROOMS.indexOf(room) < 0) fail("room", svc.stayOnly ? "roomReq" : "room");
    if(!err && !E.consent.checked){ err = "consent"; first = E.consent; }
    return {err:err, first:first};
  }

  function payloadOf(form, svc){
    var E = form.elements, extra = {};
    (svc.fields || []).forEach(function(f){ var c = E["x-" + f.name]; if(c && c.value.trim() !== "") extra[f.name] = c.value.trim(); });
    return {
      kind:svc.id, date:E.date.value, time:E.time ? E.time.value : "", pax:E.pax ? E.pax.value : "1", fields:extra,
      name:E.name.value.trim(), phone:E.phone.value.trim(), email:E.email.value.trim(),
      room:E.room.value.trim(), spot:(LOC && ROOMS.indexOf(LOC) < 0) ? LOC : "",
      notes:E.notes.value.trim(), lang:lang(), consent:"1", website:E.website.value
    };
  }

  function submit(form){
    if(sending || !current) return;
    var svc = current;
    var v = validate(form);
    if(v.err){ say(form, errorText(v.err, svc), "err"); if(v.first) v.first.focus(); return; }
    var btn = form.querySelector(".rq-send"), payload = payloadOf(form, svc);
    sending = true; btn.disabled = true; form.setAttribute("aria-busy", "true");
    say(form, t("Sending…"));
    fetch(ENDPOINT, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload), credentials:"same-origin"})
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ return {ok:r.ok, status:r.status, j:j}; }); })
      .then(function(res){
        if(!dialog || !form.isConnected) return;
        if(res.ok && res.j.ok){
          track("request_submit", {kind:svc.id, pax:+payload.pax, lead_time_days:Math.round((parseIso(payload.date) - today()) / 86400000)});
          success(payload, svc, !!res.j.confirmed);
          return;
        }
        var e = res.j && res.j.error;
        var code = res.status === 429 ? "rate" : (e && (ERRORS[e] || e === "closed") ? e : "generic");
        if(code === "fields" && res.status !== 400) code = "generic";
        failed(form, svc, code);
      })
      .catch(function(){ if(dialog && form.isConnected) failed(form, svc, "generic"); });
  }
  function failed(form, svc, code){
    sending = false;
    form.removeAttribute("aria-busy");
    form.querySelector(".rq-send").disabled = false;
    say(form, errorText(code, svc), "err");
    track("request_error", {error:code});
  }

  function success(p, svc, mailed){
    sending = false;
    var body = dialog.querySelector(".rq-body");
    var head = dialog.querySelector(".rq-head");
    var intro = head.querySelector(".rq-intro"); if(intro) intro.remove();
    dialog.removeAttribute("aria-describedby");
    body.innerHTML = "";
    var panel = el("div", "rq-done");
    panel.appendChild(el("span", "rq-done-mark"));
    var h = el("h3", "rq-done-title", t("Thank you, {n}.", {n:(p.name.split(/\s+/)[0] || "")})); h.tabIndex = -1;
    panel.appendChild(h);
    panel.appendChild(el("p", null, t("We have received your request. This is not yet a confirmation — our team will confirm shortly.")));
    if(mailed) panel.appendChild(el("p", "rq-muted", t("We have also sent a summary to your email.")));

    var dl = el("dl", "rq-summary");
    function row(k, v){ if(!v) return; dl.appendChild(el("dt", null, k)); dl.appendChild(el("dd", null, v)); }
    row(t("Service"), tx(svc.title));
    row(t("Date"), fmtDate(parseIso(p.date)));
    if(svc.time) row(svc.time.label ? tx(svc.time.label) : t("Time"), p.time);
    if(svc.pax) row(svc.pax.label ? tx(svc.pax.label) : t("Guests"), p.pax);
    (svc.fields || []).forEach(function(f){
      var v = p.fields[f.name]; if(v == null) return;
      if(f.type === "select"){ var o = (f.options || []).filter(function(x){ return x.value === v; })[0]; v = o ? tx(o.label) : v; }
      row(tx(f.label), v);
    });
    row(t("Room"), p.room);
    panel.appendChild(dl);

    var done = el("button", "btn btn-green rq-close", t("Done")); done.type = "button";
    done.addEventListener("click", close);
    panel.appendChild(done);
    body.appendChild(panel);
    h.focus();
  }

  document.addEventListener("click", function(e){
    var a = e.target.closest && e.target.closest("[data-request]");
    if(!a) return;
    var kind = a.getAttribute("data-request");
    if(!/^[a-z0-9-]{1,40}$/.test(kind || "")) return;
    e.preventDefault();
    open(kind, a);
  });

  window.gloriaRequest = {open:open, close:close, catalog:catalog, lang:lang, tx:tx};
})();
