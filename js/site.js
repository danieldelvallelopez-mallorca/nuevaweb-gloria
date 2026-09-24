/* =====================================================================
   Glòria de Sant Jaume — comportamiento común de todas las páginas:
   header sobre hero · motor de reservas (Neobookings) · barra de
   reservas funcional · CTA móvil fijo · medición de clics y recorrido.
   ===================================================================== */
(function(){
  var BOOKING = {
    base: "https://bookings.cabauhotels.com/",
    hotelId: "ltMOyTAWCIHXU0fOduo$:w",
    langs: ["es", "en", "de"],          // idiomas que acepta el motor (fr/sv → en)
    defaultLeadDays: 1,
    defaultNights: 2
  };
  var ELPATIO_URL = "https://www.elpatiodegloria.com";
  var ELPATIO_RESERVE_URL = "https://elpatiodegloria.com/reservas.html";   // reserva de mesa (TheFork)
  var DAY = 86400000;

  function track(name, params){ if(window.gloriaTrack) window.gloriaTrack(name, params || {}); }
  function siteLang(){ return (document.documentElement.lang || "en").slice(0,2); }
  function engineLang(){ var l = siteLang(); return BOOKING.langs.indexOf(l) > -1 ? l : "en"; }

  function iso(d){
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  }
  function parseIso(s){ var p = (s || "").split("-"); return p.length === 3 ? new Date(+p[0], p[1] - 1, +p[2]) : null; }
  function today(){ var d = new Date(); d.setHours(0,0,0,0); return d; }
  function addDays(d, n){ var r = new Date(d.getFullYear(), d.getMonth(), d.getDate()); r.setDate(r.getDate() + n); return r; } // por calendario: seguro en cambios de hora

  function bookingUrl(o){
    o = o || {};
    var arrival = o.arrival || iso(addDays(today(), BOOKING.defaultLeadDays));
    var departure = o.departure || iso(addDays(parseIso(arrival), BOOKING.defaultNights));
    var q = [
      "id=" + encodeURIComponent(BOOKING.hotelId),
      "arrival=" + arrival,
      "departure=" + departure,
      "adults=" + (o.adults || 2),
      "children=" + (o.children || 0),
      "babies=0",
      "view=grid"
    ];
    if(o.promo) q.push("promo=" + encodeURIComponent(o.promo));
    return BOOKING.base + engineLang() + "/step-1?" + q.join("&");
  }

  /* ---------- header: transparente sobre el hero ---------- */
  function initHeader(){
    var header = document.getElementById("header");
    if(!header || !header.classList.contains("on-hero")) return;
    function onScroll(){ header.classList.toggle("on-hero", window.scrollY <= window.innerHeight * 0.7); }
    window.addEventListener("scroll", onScroll, {passive:true});
    onScroll();
  }

  /* ---------- enlaces Book / El Patio ---------- */
  function wireLinks(){
    var url = bookingUrl();
    document.querySelectorAll("a[data-book]").forEach(function(a){
      a.href = url; a.target = "_blank"; a.rel = "noopener";
    });
    document.querySelectorAll("a[data-elpatio]").forEach(function(a){
      a.href = ELPATIO_URL; a.target = "_blank"; a.rel = "noopener";
    });
    document.querySelectorAll("a[data-elpatio-reserve]").forEach(function(a){
      a.href = ELPATIO_RESERVE_URL; a.target = "_blank"; a.rel = "noopener";
    });
  }

  /* ---------- barra de reservas funcional ---------- */
  function initBookingForms(){
    document.querySelectorAll("form[data-booking-form]").forEach(function(form){
      var inEl = form.querySelector('[name="arrival"]');
      var outEl = form.querySelector('[name="departure"]');
      var guests = form.querySelector('[name="guests"]');
      var promo = form.querySelector('[name="promo"]');
      if(!inEl || !outEl) return;

      var t0 = today();
      inEl.min = iso(t0);
      if(!inEl.value) inEl.value = iso(addDays(t0, BOOKING.defaultLeadDays));
      function syncOut(){
        var a = parseIso(inEl.value) || t0;
        outEl.min = iso(addDays(a, 1));
        var d = parseIso(outEl.value);
        if(!d || d <= a) outEl.value = iso(addDays(a, BOOKING.defaultNights));
      }
      syncOut();
      inEl.addEventListener("change", syncOut);

      form.addEventListener("submit", function(e){
        e.preventDefault();
        var g = (guests ? guests.value : "2-0").split("-");
        var o = {
          arrival: inEl.value, departure: outEl.value,
          adults: +g[0] || 2, children: +g[1] || 0,
          promo: promo ? promo.value.trim() : ""
        };
        var a = parseIso(o.arrival), d = parseIso(o.departure);
        track("booking_search", {
          form_location: locationOf(form),
          nights: Math.round((d - a) / DAY),
          lead_time_days: Math.round((a - today()) / DAY),
          adults: o.adults, children: o.children,
          has_promo: o.promo ? "yes" : "no",
          arrival_month: o.arrival.slice(0,7)
        });
        var url = bookingUrl(o);
        var w = window.open(url, "_blank", "noopener");
        if(!w) location.href = url;
      });
    });
  }

  /* ---------- CTA fijo en móvil ---------- */
  function initStickyBook(){
    var bar = document.querySelector(".sticky-book");
    if(!bar) return;
    var hero = document.querySelector(".hero, .page-hero");
    var inView = [];                     // barras de reserva / footer visibles → ocultar CTA
    function update(){
      var pastHero = window.scrollY > (hero ? hero.offsetHeight * 0.6 : 200);
      bar.classList.toggle("show", pastHero && inView.length === 0);
    }
    if("IntersectionObserver" in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          var i = inView.indexOf(en.target);
          if(en.isIntersecting && i < 0) inView.push(en.target);
          if(!en.isIntersecting && i > -1) inView.splice(i, 1);
        });
        update();
      });
      document.querySelectorAll(".booking-bar, .footer").forEach(function(f){ io.observe(f); });
    }
    window.addEventListener("scroll", update, {passive:true});
    update();
  }

  /* ---------- medición: clics, scroll y secciones ---------- */
  function locationOf(el){
    if(el.closest(".mobile-menu")) return "mobile_menu";
    if(el.closest(".sticky-book")) return "sticky_mobile";
    if(el.closest(".site-header")) return "header";
    if(el.closest(".footer")) return "footer";
    var sec = el.closest("section, .wellness-split");
    var eb = sec && sec.querySelector(".eyebrow");
    return eb ? sectionKey(eb) : "body";
  }
  function sectionKey(eb){ return (eb.getAttribute("data-key") || eb.textContent).trim().toLowerCase().replace(/\s+/g, "_").slice(0,40); }

  function initClickTracking(){
    document.addEventListener("click", function(e){
      var a = e.target.closest && e.target.closest("a, button");
      if(!a) return;
      var href = a.getAttribute("href") || "";
      var label = (a.textContent || "").trim().slice(0,60);
      var loc = locationOf(a);
      if(a.hasAttribute("data-book")) return track("book_click", {click_location:loc, link_text:label});
      if(a.hasAttribute("data-elpatio-reserve")) return track("elpatio_reserve_click", {click_location:loc});
      if(a.hasAttribute("data-elpatio") || href.indexOf("elpatiodegloria") > -1) return track("elpatio_click", {click_location:loc});
      if(a.getAttribute("data-track") === "google_reviews") return track("reviews_click", {platform:"google", click_location:loc});
      if(href.indexOf("tel:") === 0) return track("phone_click", {click_location:loc, phone:href.slice(4)});
      if(href.indexOf("mailto:") === 0) return track("email_click", {click_location:loc});
      if(href.indexOf("instagram.com") > -1) return track("social_click", {network:"instagram", click_location:loc});
      if(href.indexOf("cabauhotels.com") > -1) return track("cabau_click", {click_location:loc});
      if(a.closest("form[data-booking-form]")) return;          // ya se mide como booking_search
      if(a.closest(".main-nav, .mm-links")) return track("nav_click", {link_text:label, click_location:loc});
      if(/^https?:/.test(href) && a.hostname !== location.hostname) return track("outbound_click", {link_url:href, click_location:loc});
      if(a.classList.contains("btn") || a.classList.contains("link-arrow")) track("cta_click", {link_text:label, click_location:loc, link_url:href});
    });

    document.addEventListener("gloria:lang", function(e){
      track("language_change", {language:e.detail});
      wireLinks();                       // el motor se abre en el idioma elegido
    });
  }

  function initScrollDepth(){
    var marks = [25, 50, 75, 90], sent = {};
    window.addEventListener("scroll", function(){
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if(h <= 0) return;
      var p = window.scrollY / h * 100;
      marks.forEach(function(m){ if(p >= m && !sent[m]){ sent[m] = 1; track("scroll_depth", {percent:m}); } });
    }, {passive:true});
  }

  function initSectionViews(){
    if(!("IntersectionObserver" in window)) return;
    var seen = {};
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(!en.isIntersecting) return;
        var eb = en.target.querySelector(".eyebrow");
        var key = eb ? sectionKey(eb) : null;
        if(key && !seen[key]){ seen[key] = 1; track("section_view", {section:key}); }
        io.unobserve(en.target);
      });
    }, {threshold:0.4});
    document.querySelectorAll("section, .wellness-split .pane").forEach(function(s){
      var eb = s.querySelector(".eyebrow");
      if(eb && !eb.hasAttribute("data-key")) eb.setAttribute("data-key", eb.textContent.trim()); // clave en EN aunque se traduzca
      io.observe(s);
    });
  }

  /* ---------- vídeo del hero: resolución según pantalla, pausa fuera de vista ---------- */
  function initHeroVideo(){
    var v = document.querySelector("video[data-hero-video]");
    if(!v) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var conn = navigator.connection || {};
    var portrait = window.innerWidth < 900 && window.innerHeight > window.innerWidth;
    if(portrait) v.poster = "img/hero-poster-v.jpg?v=6";
    if(reduce || conn.saveData) return;                    // se queda el póster fijo
    var px = Math.max(screen.width, screen.height) * (window.devicePixelRatio || 1);
    var slow = /(^|-)2g$/.test(conn.effectiveType || "");
    if(portrait){
      // móvil en vertical: vídeo rodado en vertical (sin recortes)
      v.src = "video/hero-v-" + (slow ? 720 : 1080) + ".mp4?v=6";
    }else{
      var size = slow ? 720 : (px >= 2600 && window.innerWidth >= 900) ? 2160 : 1080;
      v.src = "video/hero-" + size + ".mp4?v=3";
    }
    v.muted = true;
    var play = function(){ var p = v.play(); if(p && p.catch) p.catch(function(){}); };
    v.addEventListener("canplay", play, {once:true});
    play();
    if("IntersectionObserver" in window){
      new IntersectionObserver(function(en){ en[0].isIntersecting ? play() : v.pause(); }).observe(v);
    }
  }

  function init(){
    initHeader();
    initHeroVideo();
    wireLinks();
    initBookingForms();
    initStickyBook();
    initSectionViews();
    initClickTracking();
    initScrollDepth();
  }
  window.gloriaBookingUrl = bookingUrl;
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
