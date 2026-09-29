/* =====================================================================
   Solicitudes de mesa (El Patio) y de tratamiento (Spa by Eric).
   No es disponibilidad en tiempo real: el cliente envía una SOLICITUD
   a api/request.php y el equipo la confirma después.
   Se abre con cualquier elemento [data-request="restaurant"|"spa"]
   o con window.gloriaRequest.open("restaurant"|"spa").
   Textos en inglés como clave; traducciones en js/i18n-data.js.
   ===================================================================== */
(function(){
  var ENDPOINT = "api/request.php";
  var MAX_DAYS = 180;
  var CLOSED_DAYS = [2, 3];                    // JS getDay(): martes y miércoles El Patio descansa
  var ROOMS = ["101","102","103","104","105","106","107","201","202","203","204","205","206","207"];
  var PHONE_RE = /^[0-9+()\s.\-]{6,40}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PHONE_LABEL = "+34 971 92 18 91";
  var TREATMENTS = [
    ["sports-60", "Sports massage · 60 min · 120 €"],
    ["relaxing-60", "Relaxing massage · 60 min · 120 €"],
    ["lymphatic-60", "Lymphatic drainage · 60 min · 120 €"],
    ["reflexology-60", "Reflexology & craniosacral · 60 min · 120 €"],
    ["pregnancy-60", "Pregnancy massage · 60 min · 120 €"],
    ["ayurvedic-90", "Ayurvedic massage · 90 min · 250 €"],
    ["lomilomi-90", "Lomi Lomi · 90 min · 250 €"],
    ["inka-90", "Inka energetic massage · 90 min · 220 €"],
    ["facial-kobido-50", "Facial & Kobido · 50 min · 190 €"],
    ["ritual-olive-90", "Ritual · The Power of the Olive Tree · 90 min · 230 €"],
    ["ritual-lavender-90", "Ritual · Lavender Garden · 90 min · 230 €"],
    ["ritual-coconut-90", "Ritual · Organic Coconut · 90 min · 230 €"]
  ];
  var KINDS = {
    restaurant: {eyebrow:"El Patio de Glòria", title:"Request a table", paxLabel:"Guests", paxMax:10, from:19 * 60, to:22 * 60 + 30, step:30},
    spa:        {eyebrow:"Spa by Eric", title:"Request a treatment", paxLabel:"Persons", paxMax:2, from:10 * 60, to:20 * 60, step:60}
  };
  var ERRORS = {
    fields: "Please fill in the required fields.",
    contact: "Please give us a phone number or an email so we can confirm.",
    email: "Please enter a valid email.",
    phone: "Please enter a valid phone number.",
    closed: "El Patio rests on Tuesdays and Wednesdays. Please choose another day.",
    date: "Please choose a date within the next six months.",
    time: "Please choose a time.",
    pax: "Please fill in the required fields.",
    treatment: "Please choose a treatment.",
    room: "Please enter a valid room number, or leave it empty.",
    consent: "Please accept the data protection information to send your request.",
    rate: "Too many requests. Please try again later.",
    generic: "Sorry, we could not send your request. Please try again later or call us on {ph}."
  };

  var overlay = null, dialog = null, trigger = null, sending = false;

  function lang(){ return (document.documentElement.lang || "en").slice(0, 2); }
  function t(s, vars){
    var d = (window.I18N_DATA || {})[lang()] || {};
    var out = d[s] || s;
    for(var k in (vars || {})) out = out.replace("{" + k + "}", vars[k]);
    return out;
  }
  function track(n, p){ if(window.gloriaTrack) window.gloriaTrack(n, p || {}); }
  function el(tag, cls, txt){ var e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; }
  function pad(n){ return (n < 10 ? "0" : "") + n; }
  function iso(d){ return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseIso(s){ var p = (s || "").split("-"); return p.length === 3 ? new Date(+p[0], p[1] - 1, +p[2]) : null; }
  function today(){ var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function addDays(d, n){ var r = new Date(d.getTime()); r.setDate(r.getDate() + n); return r; }
  function hhmm(mins){ return pad(Math.floor(mins / 60)) + ":" + pad(mins % 60); }
  function fmtDate(d){ try{ return d.toLocaleDateString(lang(), {weekday:"long", day:"numeric", month:"long"}); }catch(e){ return iso(d); } }

  /* ---------- controles ---------- */
  var uid = 0;
  function field(labelKey, control, opts){
    opts = opts || {};
    var id = "rq-f" + (++uid);
    var w = el("div", "rq-field" + (opts.cls ? " " + opts.cls : ""));
    var l = el("label"); l.htmlFor = id;
    l.appendChild(document.createTextNode(t(labelKey)));
    if(opts.required) l.appendChild(el("span", "rq-req", " *"));
    if(opts.optional) l.appendChild(el("span", "rq-opt", " · " + t("Optional")));
    control.id = id;
    w.appendChild(l); w.appendChild(control);
    if(opts.hint){
      var h = el("p", "rq-hint", t(opts.hint)); h.id = id + "-h";
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
  function select(name, options, placeholder){
    var s = el("select"); s.name = name;
    if(placeholder){ var p = el("option", null, t(placeholder)); p.value = ""; p.disabled = true; p.selected = true; s.appendChild(p); }
    options.forEach(function(o){ var op = el("option", null, t(o[1])); op.value = o[0]; s.appendChild(op); });
    return s;
  }
  /** Mesa: por defecto las 20:00 (empieza la música) o la primera hora libre. */
  function defaultTime(sel){
    var ok = Array.prototype.filter.call(sel.options, function(o){ return o.value && !o.disabled; });
    var pick = ok.filter(function(o){ return o.value === "20:00"; })[0] || ok[0];
    sel.value = pick ? pick.value : "";
  }
  function firstOpenDay(kind){
    var d = today(), now = new Date();
    if(now.getHours() * 60 + now.getMinutes() >= KINDS[kind].to) d = addDays(d, 1);   // hoy ya no quedan horas
    if(kind === "restaurant") while(CLOSED_DAYS.indexOf(d.getDay()) > -1) d = addDays(d, 1);
    return d;
  }
  /** Horas disponibles del día: si es hoy, solo las que aún no han pasado. */
  function fillTimes(sel, kind, dateStr){
    var k = KINDS[kind], keep = sel.value, now = new Date();
    var isToday = dateStr === iso(today()), nowMins = now.getHours() * 60 + now.getMinutes();
    while(sel.options.length > 1) sel.remove(1);
    for(var m = k.from; m <= k.to; m += k.step){
      var op = el("option", null, hhmm(m)); op.value = hhmm(m);
      if(isToday && m <= nowMins) op.disabled = true;
      sel.appendChild(op);
    }
    var match = Array.prototype.filter.call(sel.options, function(o){ return o.value === keep && !o.disabled; })[0];
    sel.value = match ? keep : "";
  }

  /* ---------- diálogo ---------- */
  function build(kind){
    var k = KINDS[kind];
    overlay = el("div", "rq-overlay"); overlay.setAttribute("data-noi18n", "");
    dialog = el("div", "rq-dialog");
    dialog.setAttribute("role", "dialog"); dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "rq-title"); dialog.setAttribute("aria-describedby", "rq-intro");

    var head = el("div", "rq-head");
    head.appendChild(el("span", "rq-eyebrow", k.eyebrow));
    var h = el("h2", "rq-title", t(k.title)); h.id = "rq-title"; head.appendChild(h);
    var intro = el("p", "rq-intro", t("Send us your request and our team will confirm it shortly. This is not yet a confirmed booking.")); intro.id = "rq-intro";
    head.appendChild(intro);
    var x = el("button", "rq-x"); x.type = "button"; x.setAttribute("aria-label", t("Close")); x.innerHTML = "<span aria-hidden=\"true\">&times;</span>";
    x.addEventListener("click", close);

    var body = el("div", "rq-body");
    var form = el("form", "rq-form"); form.noValidate = true; form.setAttribute("data-kind", kind);
    var t0 = today(), start = firstOpenDay(kind);

    if(kind === "spa") form.appendChild(field("Treatment", select("treatment", TREATMENTS, "Choose a treatment"), {required:true}));

    var date = input("date", "date", {min:iso(t0), max:iso(addDays(t0, MAX_DAYS)), required:""}); date.value = iso(start);
    var time = select("time", [], "Choose…"); time.required = true;
    fillTimes(time, kind, date.value);
    if(kind === "restaurant" && !time.value) defaultTime(time);
    var row = el("div", "rq-row");
    row.appendChild(field("Date", date, {required:true, hint: kind === "restaurant" ? "Tuesday & Wednesday · El Patio rests" : null}));
    row.appendChild(field("Time", time, {required:true}));
    form.appendChild(row);

    var paxOpts = []; for(var i = 1; i <= k.paxMax; i++) paxOpts.push([String(i), String(i)]);
    var pax = select("pax", paxOpts); pax.value = kind === "restaurant" ? "2" : "1";
    var row2 = el("div", "rq-row");
    row2.appendChild(field(k.paxLabel, pax, {required:true, hint: kind === "restaurant" ? "For groups over 10, please contact us" : null}));
    row2.appendChild(field("Room number (if you are staying with us)", input("text", "room", {inputmode:"numeric", maxlength:"3", pattern:"[0-9]{3}", autocomplete:"off"}), {optional:true}));
    form.appendChild(row2);

    form.appendChild(field("Name", input("text", "name", {autocomplete:"name", maxlength:"120", required:""}), {required:true}));
    var row3 = el("div", "rq-row");
    row3.appendChild(field("Phone", input("tel", "phone", {autocomplete:"tel", maxlength:"40", inputmode:"tel"})));
    row3.appendChild(field("Email", input("email", "email", {autocomplete:"email", maxlength:"160"})));
    form.appendChild(row3);
    form.appendChild(el("p", "rq-hint rq-contact-hint", t("Please give us a phone number or an email so we can confirm.")));

    var notes = el("textarea"); notes.name = "notes"; notes.rows = 3; notes.maxLength = 600;
    notes.placeholder = t(kind === "restaurant" ? "Allergies, a special occasion, preferences…" : "Anything we should know before your treatment…");
    form.appendChild(field("Notes", notes, {optional:true}));

    // campo trampa para bots (oculto a personas y lectores de pantalla)
    var hp = el("div", "rq-hp"); hp.setAttribute("aria-hidden", "true");
    hp.appendChild(input("text", "website", {tabindex:"-1", autocomplete:"off"}));
    form.appendChild(hp);

    var check = el("label", "rq-check");
    var cb = input("checkbox", "consent", {value:"1"});
    check.appendChild(cb);
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

    date.addEventListener("change", function(){ fillTimes(time, kind, date.value); checkDate(form, false); });
    form.addEventListener("submit", function(e){ e.preventDefault(); submit(form, kind); });

    body.appendChild(form);
    dialog.appendChild(x); dialog.appendChild(head); dialog.appendChild(body);
    overlay.appendChild(dialog);
    overlay.addEventListener("mousedown", function(e){ if(e.target === overlay) close(); });
    dialog.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);
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

  /** Rellena fecha y personas (p. ej. lo ya elegido en el concierge). */
  function prefill(kind, pre){
    if(!pre) return;
    var form = dialog.querySelector(".rq-form"), E = form.elements;
    if(pre.date && parseIso(pre.date)){ E.date.value = pre.date; fillTimes(E.time, kind, pre.date); if(kind === "restaurant" && !E.time.value) defaultTime(E.time); checkDate(form, true); }
    if(pre.pax && Array.prototype.some.call(E.pax.options, function(o){ return o.value === String(pre.pax); })) E.pax.value = String(pre.pax);
  }

  function open(kind, from, pre){
    if(!KINDS[kind]) return;
    if(overlay) close(true);
    trigger = from || document.activeElement;
    if(window.__gloriaCloseMenu) window.__gloriaCloseMenu();
    build(kind);
    prefill(kind, pre);
    document.documentElement.classList.add("rq-lock");
    requestAnimationFrame(function(){ overlay.classList.add("is-open"); });
    var first = dialog.querySelector("select, input:not([type=hidden])");
    setTimeout(function(){ (window.innerWidth > 700 && first ? first : dialog.querySelector(".rq-x")).focus(); }, 40);
    track("request_open", {kind:kind, page:location.pathname});
  }
  function close(silent){
    if(!overlay) return;
    var o = overlay; overlay = null; dialog = null; sending = false;
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
  function say(form, msg, kind, vars){
    var s = form.querySelector(".rq-status");
    s.textContent = t(msg, vars);
    s.className = "rq-status" + (kind ? " is-" + kind : "");
  }
  /** Devuelve el código de error de la fecha o "" si es válida. */
  function checkDate(form, quiet){
    var kind = form.getAttribute("data-kind"), v = form.elements.date.value, d = parseIso(v), t0 = today();
    var err = !d || isNaN(d) ? "date" : (d < t0 || d > addDays(t0, MAX_DAYS)) ? "date" :
      (kind === "restaurant" && CLOSED_DAYS.indexOf(d.getDay()) > -1) ? "closed" : "";
    mark(form, "date", !!err);
    if(!quiet){ if(err) say(form, ERRORS[err], "err"); else say(form, ""); }
    return err;
  }
  function validate(form, kind){
    var E = form.elements, err = "", first = null;
    function fail(name, code){ mark(form, name, true); if(!err){ err = code; first = E[name]; } }
    ["treatment", "time", "name", "phone", "email", "room"].forEach(function(n){ mark(form, n, false); });
    if(kind === "spa" && !E.treatment.value) fail("treatment", "treatment");
    var dErr = checkDate(form, true); if(dErr) fail("date", dErr);
    if(!E.time.value) fail("time", "time");
    if(!E.name.value.trim()) fail("name", "fields");
    var ph = E.phone.value.trim(), em = E.email.value.trim();
    if(ph && !PHONE_RE.test(ph)) fail("phone", "phone");
    if(em && !EMAIL_RE.test(em)) fail("email", "email");
    if(!ph && !em){ fail("phone", "contact"); mark(form, "email", true); }
    var room = E.room.value.trim();
    if(room && ROOMS.indexOf(room) < 0) fail("room", "room");
    if(!err && !E.consent.checked){ err = "consent"; first = E.consent; }
    return {err:err, first:first};
  }

  function submit(form, kind){
    if(sending) return;
    var v = validate(form, kind);
    if(v.err){ say(form, ERRORS[v.err], "err", {ph:PHONE_LABEL}); if(v.first) v.first.focus(); return; }
    var E = form.elements, btn = form.querySelector(".rq-send");
    var payload = {
      kind:kind, date:E.date.value, time:E.time.value, pax:E.pax.value,
      treatment: kind === "spa" ? E.treatment.value : "",
      name:E.name.value.trim(), phone:E.phone.value.trim(), email:E.email.value.trim(),
      room:E.room.value.trim(), notes:E.notes.value.trim(), lang:lang(), consent:"1", website:E.website.value
    };
    sending = true; btn.disabled = true; form.setAttribute("aria-busy", "true");
    say(form, "Sending…");
    fetch(ENDPOINT, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload), credentials:"same-origin"})
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ return {ok:r.ok, status:r.status, j:j}; }); })
      .then(function(res){
        if(!dialog || !form.isConnected) return;
        if(res.ok && res.j.ok){
          track("request_submit", {kind:kind, pax:+payload.pax, lead_time_days:Math.round((parseIso(payload.date) - today()) / 86400000)});
          success(payload, !!res.j.confirmed);
          return;
        }
        var code = res.status === 429 ? "rate" : (res.j && ERRORS[res.j.error] ? res.j.error : "generic");
        if(code === "fields" && res.status !== 400) code = "generic";
        fail(form, code);
      })
      .catch(function(){ if(dialog && form.isConnected) fail(form, "generic"); });
  }
  function fail(form, code){
    sending = false;
    form.removeAttribute("aria-busy");
    form.querySelector(".rq-send").disabled = false;
    say(form, ERRORS[code] || ERRORS.generic, "err", {ph:PHONE_LABEL});
    track("request_error", {error:code});
  }

  function success(p, mailed){
    sending = false;
    var body = dialog.querySelector(".rq-body");
    var head = dialog.querySelector(".rq-head");
    head.querySelector(".rq-intro").remove();
    dialog.removeAttribute("aria-describedby");
    body.innerHTML = "";
    var panel = el("div", "rq-done");
    panel.appendChild(el("span", "rq-done-mark"));
    var h = el("h3", "rq-done-title", t("Thank you, {n}.", {n:(p.name.split(/\s+/)[0] || "")})); h.tabIndex = -1;
    panel.appendChild(h);
    panel.appendChild(el("p", null, t("We have received your request. This is not yet a confirmation — our team will confirm shortly.")));
    if(mailed) panel.appendChild(el("p", "rq-muted", t("We have also sent a summary to your email.")));

    var dl = el("dl", "rq-summary");
    function row(k, v){ if(!v) return; dl.appendChild(el("dt", null, t(k))); dl.appendChild(el("dd", null, v)); }
    if(p.kind === "spa"){
      var tr = TREATMENTS.filter(function(x){ return x[0] === p.treatment; })[0];
      row("Treatment", tr ? t(tr[1]) : "");
    }
    row("Date", fmtDate(parseIso(p.date)));
    row("Time", p.time);
    row(KINDS[p.kind].paxLabel, p.pax);
    row("Room", p.room);
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
    if(!KINDS[kind]) return;
    e.preventDefault();
    open(kind, a);
  });

  window.gloriaRequest = {open:open, close:close};
})();
