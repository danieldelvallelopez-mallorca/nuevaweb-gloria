/* =====================================================================
   Glòria Concierge — asistente de reservas de la web.
   · Reserva de habitación → motor Neobookings con fechas y personas.
   · Cena en El Patio → reserva de mesa + música de esa noche.
   · Spa, cómo llegar, contacto (teléfono, email, WhatsApp).
   · Texto libre: si CONFIG.aiEndpoint está definido responde la IA
     (api/concierge.php); si no, o si falla, detecta la intención por palabras.
   ===================================================================== */
(function(){
  var CONFIG = {
    aiEndpoint: "",                 // p. ej. "api/concierge.php" cuando el servidor tenga la clave de IA
    whatsapp: "",                   // número en formato internacional sin "+", p. ej. "34600000000" (lo da IT / Meta)
    phoneRooms: "+34971921891", phoneRoomsLabel: "+34 971 92 18 91",
    phoneHotel: "+34971717997", phoneHotelLabel: "+34 971 71 79 97",
    email: "reservas@gloriasantjaume.com",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Hotel+Gl%C3%B2ria+de+Sant+Jaume+Palma",
    spaMenu: "docs/spa-menu-2026.pdf",
    closedWeekdays: [2, 3]          // JS: 0=domingo · martes y miércoles El Patio descansa
  };

  var T = {
    en:{title:"Glòria Concierge", sub:"Hotel Glòria de Sant Jaume · Palma", open:"Open the concierge", close:"Close",
      hello:"Welcome to Glòria. How may I help you?", nudge:"May I help you book?",
      room:"Book a room", dinner:"Dinner at El Patio", music:"Tonight's music", spa:"Spa & treatments", where:"Getting here", human:"Talk to us",
      arrival:"Arrival", departure:"Departure", guests:"Guests", people:"People", date:"Date", check:"Check availability", continue_:"Continue",
      adults:"adults", adult:"adult", child:"child", children:"children",
      roomIntro:"With pleasure. Choose your dates and I will show you our rooms and the best rate, booking direct with the house.",
      roomReady:"{n} nights · {g}. Here are the rooms available for your dates:", seeRooms:"See rooms & rates →", catalogue:"Our three room categories",
      dinnerIntro:"El Patio serves dinner every evening with live music from 20:00 to 22:00. Which day would you like?",
      closed:"El Patio rests on Tuesdays and Wednesdays. Would another evening suit you?",
      dinnerReady:"{d} · {p}.", playing:"That evening at the piano: {a}.", reserve:"Reserve a table →", orCall:"Or call us: {ph}",
      tonight:"Tonight at El Patio: {a}, from 20:00 to 22:00.", tonightGeneric:"Tonight, as every evening, live music accompanies dinner at El Patio from 20:00 to 22:00.", tonightNone:"Tonight El Patio rests. Next evening with music: {d}, {a}.", calendar:"See the month's calendar →",
      spaText:"Beneath the house, a heated pool in the old cistern, sauna and steam bath. Upstairs, the rooftop pool above Palma. Spa by Eric: massages, facials and complete rituals.",
      spaMenu:"Spa menu (PDF) →", wellness:"Discover Wellness →",
      whereText:"We are at Carrer Sant Jaume, 18, in the old town of Palma — a short walk from the Cathedral, the Born and Jaume III.", maps:"Open in Google Maps →",
      humanText:"Our team will be delighted to help you personally.", call:"Call", write:"Email", whatsapp:"WhatsApp",
      fallback:"I can help you book a room, reserve dinner at El Patio, the spa or how to find us. Or speak with our team directly:",
      placeholder:"Write your question…", send:"Send", thinking:"…", error:"I could not answer that just now. Our team will help you:"},
    es:{title:"Concierge de Glòria", sub:"Hotel Glòria de Sant Jaume · Palma", open:"Abrir el concierge", close:"Cerrar",
      hello:"Le damos la bienvenida a Glòria. ¿En qué puedo ayudarle?", nudge:"¿Le ayudo a reservar?",
      room:"Reservar habitación", dinner:"Cena en El Patio", music:"Música de esta noche", spa:"Spa y tratamientos", where:"Cómo llegar", human:"Hablar con nosotros",
      arrival:"Llegada", departure:"Salida", guests:"Huéspedes", people:"Personas", date:"Fecha", check:"Ver disponibilidad", continue_:"Continuar",
      adults:"adultos", adult:"adulto", child:"niño", children:"niños",
      roomIntro:"Con mucho gusto. Elija sus fechas y le muestro nuestras habitaciones y la mejor tarifa, reservando directamente con la casa.",
      roomReady:"{n} noches · {g}. Estas son las habitaciones disponibles para sus fechas:", seeRooms:"Ver habitaciones y tarifas →", catalogue:"Nuestras tres categorías",
      dinnerIntro:"El Patio sirve cenas cada noche con música en directo de 20:00 a 22:00. ¿Qué día le gustaría?",
      closed:"El Patio descansa los martes y miércoles. ¿Le iría bien otra noche?",
      dinnerReady:"{d} · {p}.", playing:"Esa noche al piano: {a}.", reserve:"Reservar mesa →", orCall:"O llámenos: {ph}",
      tonight:"Esta noche en El Patio: {a}, de 20:00 a 22:00.", tonightGeneric:"Esta noche, como cada noche, la música en directo ameniza las cenas de El Patio de 20:00 a 22:00.", tonightNone:"Esta noche El Patio descansa. Próxima noche con música: {d}, {a}.", calendar:"Ver el calendario del mes →",
      spaText:"Bajo la casa, una piscina climatizada en el antiguo aljibe, sauna y baño de vapor. Arriba, la piscina en la azotea sobre Palma. Spa by Eric: masajes, faciales y rituales completos.",
      spaMenu:"Carta del spa (PDF) →", wellness:"Descubrir Wellness →",
      whereText:"Estamos en Carrer Sant Jaume, 18, en el casco antiguo de Palma, a pocos minutos a pie de la Catedral, el Born y Jaume III.", maps:"Abrir en Google Maps →",
      humanText:"Nuestro equipo estará encantado de atenderle personalmente.", call:"Llamar", write:"Email", whatsapp:"WhatsApp",
      fallback:"Puedo ayudarle a reservar habitación, mesa en El Patio, el spa o cómo llegar. O hable directamente con nuestro equipo:",
      placeholder:"Escriba su pregunta…", send:"Enviar", thinking:"…", error:"Ahora mismo no he podido responder. Nuestro equipo le ayudará:"},
    de:{title:"Glòria Concierge", sub:"Hotel Glòria de Sant Jaume · Palma", open:"Concierge öffnen", close:"Schließen",
      hello:"Willkommen im Glòria. Wie kann ich Ihnen helfen?", nudge:"Darf ich Ihnen bei der Buchung helfen?",
      room:"Zimmer buchen", dinner:"Abendessen im El Patio", music:"Musik heute Abend", spa:"Spa & Behandlungen", where:"Anreise", human:"Mit uns sprechen",
      arrival:"Anreise", departure:"Abreise", guests:"Gäste", people:"Personen", date:"Datum", check:"Verfügbarkeit prüfen", continue_:"Weiter",
      adults:"Erwachsene", adult:"Erwachsener", child:"Kind", children:"Kinder",
      roomIntro:"Sehr gern. Wählen Sie Ihre Daten und ich zeige Ihnen unsere Zimmer und den besten Preis – direkt beim Haus gebucht.",
      roomReady:"{n} Nächte · {g}. Hier die verfügbaren Zimmer für Ihre Daten:", seeRooms:"Zimmer & Preise ansehen →", catalogue:"Unsere drei Zimmerkategorien",
      dinnerIntro:"Das El Patio serviert jeden Abend Dinner mit Live-Musik von 20:00 bis 22:00 Uhr. Welcher Tag passt Ihnen?",
      closed:"Dienstags und mittwochs ruht das El Patio. Passt Ihnen ein anderer Abend?",
      dinnerReady:"{d} · {p}.", playing:"An diesem Abend am Flügel: {a}.", reserve:"Tisch reservieren →", orCall:"Oder rufen Sie uns an: {ph}",
      tonight:"Heute Abend im El Patio: {a}, von 20:00 bis 22:00 Uhr.", tonightGeneric:"Heute Abend begleitet, wie jeden Abend, Live-Musik das Dinner im El Patio von 20:00 bis 22:00 Uhr.", tonightNone:"Heute ruht das El Patio. Nächster Musikabend: {d}, {a}.", calendar:"Monatskalender ansehen →",
      spaText:"Unter dem Haus ein beheiztes Becken in der alten Zisterne, Sauna und Dampfbad. Oben der Rooftop-Pool über Palma. Spa by Eric: Massagen, Gesichtsbehandlungen und Rituale.",
      spaMenu:"Spa-Karte (PDF) →", wellness:"Wellness entdecken →",
      whereText:"Sie finden uns in der Carrer Sant Jaume, 18, in der Altstadt von Palma – wenige Gehminuten von Kathedrale, Born und Jaume III.", maps:"In Google Maps öffnen →",
      humanText:"Unser Team hilft Ihnen gern persönlich.", call:"Anrufen", write:"E-Mail", whatsapp:"WhatsApp",
      fallback:"Ich helfe Ihnen gern bei Zimmer, Tisch im El Patio, Spa oder Anreise. Oder sprechen Sie direkt mit unserem Team:",
      placeholder:"Ihre Frage…", send:"Senden", thinking:"…", error:"Das konnte ich gerade nicht beantworten. Unser Team hilft Ihnen:"},
    fr:{title:"Concierge Glòria", sub:"Hotel Glòria de Sant Jaume · Palma", open:"Ouvrir le concierge", close:"Fermer",
      hello:"Bienvenue à Glòria. Comment puis-je vous aider ?", nudge:"Puis-je vous aider à réserver ?",
      room:"Réserver une chambre", dinner:"Dîner à El Patio", music:"Musique ce soir", spa:"Spa & soins", where:"Venir à l'hôtel", human:"Nous parler",
      arrival:"Arrivée", departure:"Départ", guests:"Personnes", people:"Couverts", date:"Date", check:"Voir les disponibilités", continue_:"Continuer",
      adults:"adultes", adult:"adulte", child:"enfant", children:"enfants",
      roomIntro:"Avec plaisir. Choisissez vos dates et je vous montre nos chambres et le meilleur tarif, en réservant directement auprès de la maison.",
      roomReady:"{n} nuits · {g}. Voici les chambres disponibles à vos dates :", seeRooms:"Voir chambres et tarifs →", catalogue:"Nos trois catégories",
      dinnerIntro:"El Patio sert le dîner chaque soir avec musique live de 20h00 à 22h00. Quel jour souhaitez-vous ?",
      closed:"El Patio se repose le mardi et le mercredi. Un autre soir vous conviendrait-il ?",
      dinnerReady:"{d} · {p}.", playing:"Ce soir-là au piano : {a}.", reserve:"Réserver une table →", orCall:"Ou appelez-nous : {ph}",
      tonight:"Ce soir à El Patio : {a}, de 20h00 à 22h00.", tonightGeneric:"Ce soir, comme chaque soir, la musique live accompagne le dîner à El Patio de 20h00 à 22h00.", tonightNone:"Ce soir El Patio se repose. Prochaine soirée musicale : {d}, {a}.", calendar:"Voir le calendrier du mois →",
      spaText:"Sous la maison, une piscine chauffée dans l'ancienne citerne, sauna et hammam. En haut, la piscine sur le toit au-dessus de Palma. Spa by Eric : massages, soins du visage et rituels.",
      spaMenu:"Carte du spa (PDF) →", wellness:"Découvrir Wellness →",
      whereText:"Nous sommes Carrer Sant Jaume, 18, dans la vieille ville de Palma, à quelques pas de la Cathédrale, du Born et de Jaume III.", maps:"Ouvrir dans Google Maps →",
      humanText:"Notre équipe sera ravie de vous aider personnellement.", call:"Appeler", write:"E-mail", whatsapp:"WhatsApp",
      fallback:"Je peux vous aider pour une chambre, une table à El Patio, le spa ou l'accès. Ou parlez directement à notre équipe :",
      placeholder:"Votre question…", send:"Envoyer", thinking:"…", error:"Je n'ai pas pu répondre pour l'instant. Notre équipe vous aidera :"},
    sv:{title:"Glòria Concierge", sub:"Hotel Glòria de Sant Jaume · Palma", open:"Öppna concierge", close:"Stäng",
      hello:"Välkommen till Glòria. Hur kan jag hjälpa dig?", nudge:"Får jag hjälpa dig att boka?",
      room:"Boka rum", dinner:"Middag på El Patio", music:"Kvällens musik", spa:"Spa & behandlingar", where:"Hitta hit", human:"Prata med oss",
      arrival:"Ankomst", departure:"Avresa", guests:"Gäster", people:"Personer", date:"Datum", check:"Se tillgänglighet", continue_:"Fortsätt",
      adults:"vuxna", adult:"vuxen", child:"barn", children:"barn",
      roomIntro:"Gärna. Välj datum så visar jag våra rum och bästa pris när du bokar direkt hos oss.",
      roomReady:"{n} nätter · {g}. Här är de lediga rummen för dina datum:", seeRooms:"Se rum & priser →", catalogue:"Våra tre rumskategorier",
      dinnerIntro:"El Patio serverar middag varje kväll med livemusik 20:00–22:00. Vilken dag passar?",
      closed:"El Patio vilar på tisdagar och onsdagar. Passar en annan kväll?",
      dinnerReady:"{d} · {p}.", playing:"Den kvällen vid pianot: {a}.", reserve:"Boka bord →", orCall:"Eller ring oss: {ph}",
      tonight:"I kväll på El Patio: {a}, 20:00–22:00.", tonightGeneric:"I kväll, som varje kväll, ackompanjerar livemusik middagen på El Patio 20:00–22:00.", tonightNone:"I kväll vilar El Patio. Nästa musikkväll: {d}, {a}.", calendar:"Se månadens kalender →",
      spaText:"Under huset en uppvärmd pool i den gamla cisternen, bastu och ångbad. Uppe takpoolen över Palma. Spa by Eric: massage, ansiktsbehandlingar och ritualer.",
      spaMenu:"Spameny (PDF) →", wellness:"Upptäck Wellness →",
      whereText:"Vi finns på Carrer Sant Jaume, 18, i Palmas gamla stad – några minuters promenad från katedralen, Born och Jaume III.", maps:"Öppna i Google Maps →",
      humanText:"Vårt team hjälper dig gärna personligen.", call:"Ring", write:"E-post", whatsapp:"WhatsApp",
      fallback:"Jag kan hjälpa till med rum, bord på El Patio, spa eller vägbeskrivning. Eller prata direkt med vårt team:",
      placeholder:"Skriv din fråga…", send:"Skicka", thinking:"…", error:"Jag kunde inte svara just nu. Vårt team hjälper dig:"}
  };

  /* palabras clave por intención (todas las lenguas a la vez) */
  var INTENTS = [
    ["room",   /(room|suite|stay|night|book|habitaci|reserv.*(habit|noche)|alojam|dormir|zimmer|übernacht|buchen|chambre|séjour|nuit|rum|boka rum|övernatt|precio|price|rate|tarifa|preis|prix|pris)/i],
    ["dinner", /(dinner|table|restaurant|eat|cena|cenar|mesa|restaurante|comer|abendessen|tisch|essen|dîner|diner|réserver une table|middag|bord|äta|el patio|breakfast|desayuno|frühstück|petit.?déj|frukost)/i],
    ["music",  /(music|piano|jazz|concert|live|música|musica|musik|musique|musiken|pianista)/i],
    ["spa",    /(spa|pool|massage|masaj|treat|tratam|sauna|steam|vapor|wellness|piscina|behandl|soin|piscine|pool|bastu|facial|kobido|ritual|eric)/i],
    ["where",  /(where|address|location|airport|parking|taxi|get there|dónde|donde|dirección|aeropuerto|aparcamiento|llegar|wo |adresse|flughafen|anreise|où|aéroport|venir|var |adress|flygplats|hitta)/i],
    ["human",  /(human|person|call|phone|whatsapp|email|contact|llamar|teléfono|telefono|hablar|persona|contacto|anrufen|telefon|kontakt|appeler|téléphone|parler|ring|kontakta)/i]
  ];

  var state = {open:false, started:false, busy:false, history:[]};
  var root, panel, list, input, launcher, nudge;

  function lang(){ var l = (document.documentElement.lang || "en").slice(0,2); return T[l] ? l : "en"; }
  function t(k, vars){ var s = (T[lang()][k] || T.en[k] || k); for(var v in (vars || {})) s = s.replace("{" + v + "}", vars[v]); return s; }
  function track(n, p){ if(window.gloriaTrack) window.gloriaTrack(n, p || {}); }
  function el(tag, cls, txt){ var e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; }
  function pad(n){ return (n < 10 ? "0" : "") + n; }
  function iso(d){ return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function addDays(d, n){ var r = new Date(d.getFullYear(), d.getMonth(), d.getDate()); r.setDate(r.getDate() + n); return r; }
  function parseIso(s){ var p = (s || "").split("-"); return p.length === 3 ? new Date(+p[0], p[1] - 1, +p[2]) : null; }
  function today(){ var d = new Date(); d.setHours(0,0,0,0); return d; }
  function fmtDate(d){ try{ return d.toLocaleDateString(document.documentElement.lang || "en", {weekday:"long", day:"numeric", month:"long"}); }catch(e){ return iso(d); } }

  /* ---------- música: qué suena un día concreto ---------- */
  function musicOn(d){
    var m = window.GLORIA_MUSIC;
    if(!m || d.getFullYear() !== m.year || d.getMonth() + 1 !== m.month) return null;
    var e = m.entries[String(d.getDate())];
    return e ? e[0] + (e[1] ? " (" + e[1] + ")" : "") : null;
  }
  function nextMusic(from){
    for(var i = 0; i < 40; i++){ var d = addDays(from, i), a = musicOn(d); if(a) return {d:d, a:a}; }
    return null;
  }
  function loadMusic(cb){
    if(window.GLORIA_MUSIC) return cb();
    var s = document.createElement("script"); s.src = "js/music-data.js"; s.onload = cb; s.onerror = cb; document.head.appendChild(s);
  }

  /* ---------- interfaz ---------- */
  function build(){
    root = el("div", "gc"); root.setAttribute("data-noi18n", "");
    launcher = el("button", "gc-launch"); launcher.type = "button"; launcher.setAttribute("aria-label", t("open"));
    var img = el("img"); img.src = "img/concierge-monogram.jpg"; img.alt = ""; launcher.appendChild(img);
    nudge = el("div", "gc-nudge", t("nudge")); nudge.hidden = true;

    panel = el("div", "gc-panel"); panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", t("title")); panel.hidden = true;
    var head = el("div", "gc-head");
    var hi = el("img", "gc-avatar"); hi.src = "img/concierge-monogram.jpg"; hi.alt = "";
    var ht = el("div", "gc-htext"); ht.appendChild(el("strong", "gc-title")); ht.appendChild(el("span", null, t("sub")));
    var x = el("button", "gc-x", "×"); x.type = "button";
    head.appendChild(hi); head.appendChild(ht); head.appendChild(x);
    list = el("div", "gc-list"); list.setAttribute("aria-live", "polite");
    var form = el("form", "gc-input");
    input = el("input"); input.type = "text"; input.maxLength = 400;
    var send = el("button", "gc-send", "→"); send.type = "submit";
    form.appendChild(input); form.appendChild(send);
    panel.appendChild(head); panel.appendChild(list); panel.appendChild(form);
    root.appendChild(panel); root.appendChild(nudge); root.appendChild(launcher);
    document.body.appendChild(root);

    relabel();
    document.addEventListener("gloria:lang", relabel);
    launcher.addEventListener("click", toggle);
    nudge.addEventListener("click", function(){ toggle(); });
    x.addEventListener("click", toggle);
    document.addEventListener("keydown", function(e){ if(e.key === "Escape" && state.open) toggle(); });
    document.addEventListener("click", function(e){                    // cualquier enlace data-concierge abre el asistente
      var a = e.target.closest && e.target.closest("[data-concierge]");
      if(!a) return; e.preventDefault(); if(!state.open) toggle();
    });
    form.addEventListener("submit", function(e){ e.preventDefault(); var q = input.value.trim(); if(!q || state.busy) return; input.value = ""; ask(q); });

    try{ if(!sessionStorage.getItem("gc_nudged")) setTimeout(showNudge, 9000); }catch(e){ setTimeout(showNudge, 9000); }
  }
  function relabel(){
    launcher.setAttribute("aria-label", t("open"));
    nudge.textContent = t("nudge");
    panel.setAttribute("aria-label", t("title"));
    panel.querySelector(".gc-title").textContent = t("title");
    panel.querySelector(".gc-x").setAttribute("aria-label", t("close"));
    panel.querySelector(".gc-send").setAttribute("aria-label", t("send"));
    input.placeholder = t("placeholder"); input.setAttribute("aria-label", t("placeholder"));
  }
  function showNudge(){
    if(state.open || state.started) return;
    nudge.hidden = false;
    try{ sessionStorage.setItem("gc_nudged", "1"); }catch(e){}
    setTimeout(function(){ nudge.hidden = true; }, 9000);
  }
  function toggle(){
    state.open = !state.open;
    panel.hidden = !state.open; nudge.hidden = true;
    root.classList.toggle("is-open", state.open);
    if(state.open){
      track("concierge_open", {page:location.pathname});
      if(!state.started){ state.started = true; loadMusic(start); }
      setTimeout(function(){ if(window.innerWidth > 700) input.focus(); }, 60);
    }else launcher.focus();
  }

  function scroll(){ list.scrollTop = list.scrollHeight; }
  function bot(text){ var b = el("div", "gc-msg gc-bot", text); list.appendChild(b); scroll(); return b; }
  function me(text){ list.appendChild(el("div", "gc-msg gc-me", text)); scroll(); }
  function links(items){
    var w = el("div", "gc-links");
    items.forEach(function(it){
      var a = el("a", "gc-link" + (it.primary ? " is-primary" : ""), it.label);
      a.href = it.href; if(/^https?:|\.pdf$/.test(it.href)){ a.target = "_blank"; a.rel = "noopener"; }
      a.addEventListener("click", function(){ track("concierge_" + it.ev, {}); });
      w.appendChild(a);
    });
    list.appendChild(w); scroll();
  }
  function chips(){
    var w = el("div", "gc-chips");
    ["room","dinner","music","spa","where","human"].forEach(function(k){
      var c = el("button", "gc-chip", t(k)); c.type = "button";
      c.addEventListener("click", function(){ me(t(k)); run(k); });
      w.appendChild(c);
    });
    list.appendChild(w); scroll();
  }
  function field(labelKey, control){ var l = el("label", "gc-field"); l.appendChild(el("span", null, t(labelKey))); l.appendChild(control); return l; }
  function select(opts, val){ var s = el("select"); opts.forEach(function(o){ var op = el("option", null, o[1]); op.value = o[0]; if(o[0] === val) op.selected = true; s.appendChild(op); }); return s; }
  function dateInput(v, min){ var i = el("input"); i.type = "date"; i.value = v; i.min = min; i.required = true; return i; }
  function guestsText(a, c){ return a + " " + t(a === 1 ? "adult" : "adults") + (c ? ", " + c + " " + t(c === 1 ? "child" : "children") : ""); }

  function start(){ bot(t("hello")); chips(); }

  /* ---------- flujos ---------- */
  function run(intent){
    track("concierge_intent", {intent:intent});
    ({room:flowRoom, dinner:flowDinner, music:flowMusic, spa:flowSpa, where:flowWhere, human:flowHuman}[intent] || flowFallback)();
  }

  function flowRoom(){
    bot(t("roomIntro"));
    var f = el("form", "gc-form"), t0 = today();
    var a = dateInput(iso(addDays(t0, 1)), iso(t0)), d = dateInput(iso(addDays(t0, 3)), iso(addDays(t0, 2)));
    var g = select([["1-0","1 " + t("adult")],["2-0","2 " + t("adults")],["2-1","2 " + t("adults") + " + 1 " + t("child")],["2-2","2 " + t("adults") + " + 2 " + t("children")],["3-0","3 " + t("adults")]], "2-0");
    a.addEventListener("change", function(){ var x = parseIso(a.value); d.min = iso(addDays(x, 1)); if(parseIso(d.value) <= x) d.value = iso(addDays(x, 2)); });
    var row = el("div", "gc-row"); row.appendChild(field("arrival", a)); row.appendChild(field("departure", d));
    f.appendChild(row); f.appendChild(field("guests", g));
    var b = el("button", "gc-btn", t("check")); b.type = "submit"; f.appendChild(b);
    f.addEventListener("submit", function(e){
      e.preventDefault();
      var ga = g.value.split("-"), ad = +ga[0], ch = +ga[1];
      var nights = Math.round((parseIso(d.value) - parseIso(a.value)) / 86400000);
      var url = window.gloriaBookingUrl ? window.gloriaBookingUrl({arrival:a.value, departure:d.value, adults:ad, children:ch}) : "#";
      f.remove();
      me(fmtDate(parseIso(a.value)) + " → " + fmtDate(parseIso(d.value)));
      bot(t("roomReady", {n:nights, g:guestsText(ad, ch)}));
      track("concierge_room_search", {nights:nights, adults:ad, children:ch, lead_time_days:Math.round((parseIso(a.value) - today()) / 86400000)});
      links([{label:t("seeRooms"), href:url, primary:true, ev:"book_click"}, {label:t("catalogue"), href:"rooms.html", ev:"rooms_page"}]);
    });
    list.appendChild(f); scroll();
  }

  function flowDinner(){
    bot(t("dinnerIntro"));
    var f = el("form", "gc-form"), t0 = today();
    var first = t0; while(CONFIG.closedWeekdays.indexOf(first.getDay()) > -1) first = addDays(first, 1);
    var d = dateInput(iso(first), iso(t0));
    var p = select([1,2,3,4,5,6,7,8].map(function(n){ return [String(n), String(n)]; }), "2");
    var row = el("div", "gc-row"); row.appendChild(field("date", d)); row.appendChild(field("people", p));
    f.appendChild(row);
    var b = el("button", "gc-btn", t("continue_")); b.type = "submit"; f.appendChild(b);
    f.addEventListener("submit", function(e){
      e.preventDefault();
      var day = parseIso(d.value);
      if(CONFIG.closedWeekdays.indexOf(day.getDay()) > -1){ bot(t("closed")); return; }
      f.remove();
      me(fmtDate(day) + " · " + p.value);
      var a = musicOn(day);
      bot(t("dinnerReady", {d:fmtDate(day), p:p.value + " " + t("people").toLowerCase()}) + (a ? " " + t("playing", {a:a}) : ""));
      track("concierge_dinner_intent", {people:+p.value, lead_time_days:Math.round((day - today()) / 86400000)});
      var reserve = (window.gloriaLinks && window.gloriaLinks.elpatioReserve) || "https://elpatiodegloria.com/reservas.html";
      links([{label:t("reserve"), href:reserve, primary:true, ev:"dinner_click"}, {label:t("orCall", {ph:CONFIG.phoneRoomsLabel}), href:"tel:" + CONFIG.phoneRooms, ev:"phone_click"}]);
    });
    list.appendChild(f); scroll();
  }

  function flowMusic(){
    var t0 = today(), a = musicOn(t0), closed = CONFIG.closedWeekdays.indexOf(t0.getDay()) > -1;
    if(a && !closed) bot(t("tonight", {a:a}));
    else if(!closed) bot(t("tonightGeneric"));
    else{ var n = nextMusic(addDays(t0, 1)); bot(n ? t("tonightNone", {d:fmtDate(n.d), a:n.a}) : t("closed")); }
    links([{label:t("reserve"), href:(window.gloriaLinks && window.gloriaLinks.elpatioReserve) || "#", primary:true, ev:"dinner_click"}, {label:t("calendar"), href:"el-patio.html#music", ev:"music_calendar"}]);
  }
  function flowSpa(){ bot(t("spaText")); links([{label:t("spaMenu"), href:CONFIG.spaMenu, primary:true, ev:"spa_menu"}, {label:t("wellness"), href:"wellness.html", ev:"wellness_page"}]); }
  function flowWhere(){ bot(t("whereText")); links([{label:t("maps"), href:CONFIG.mapsUrl, primary:true, ev:"maps_click"}]); }
  function contactLinks(){
    var l = [{label:t("call") + " · " + CONFIG.phoneRoomsLabel, href:"tel:" + CONFIG.phoneRooms, ev:"phone_click"}, {label:t("write") + " · " + CONFIG.email, href:"mailto:" + CONFIG.email, ev:"email_click"}];
    if(CONFIG.whatsapp) l.unshift({label:t("whatsapp"), href:"https://wa.me/" + CONFIG.whatsapp, primary:true, ev:"whatsapp_click"});
    links(l);
  }
  function flowHuman(){ bot(t("humanText")); contactLinks(); }
  function flowFallback(){ bot(t("fallback")); contactLinks(); chips(); }

  /* ---------- texto libre: IA si está activa, si no palabras clave ---------- */
  function detect(q){ for(var i = 0; i < INTENTS.length; i++) if(INTENTS[i][1].test(q)) return INTENTS[i][0]; return null; }
  function ask(q){
    me(q);
    state.history.push({role:"user", content:q});
    if(!CONFIG.aiEndpoint){ run(detect(q) || "fallback"); return; }
    state.busy = true;
    var wait = bot(t("thinking")); wait.classList.add("is-typing");
    fetch(CONFIG.aiEndpoint, {method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({lang:lang(), page:location.pathname, today:iso(today()), messages:state.history.slice(-10)})})
      .then(function(r){ if(!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function(res){
        wait.remove();
        if(!res || !res.reply) throw new Error("empty");
        bot(res.reply);
        state.history.push({role:"assistant", content:res.reply});
        track("concierge_ai_reply", {action:res.action || "none"});
        if(res.action && res.action !== "none") run(res.action);
      })
      .catch(function(){ wait.remove(); var i = detect(q); if(i) run(i); else { bot(t("error")); contactLinks(); } })
      .then(function(){ state.busy = false; });
  }

  function init(){ build(); }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
