/* =====================================================================
   Glòria de Sant Jaume — consentimiento de cookies + analítica.
   RGPD / LOPDGDD / LSSI (guía AEPD 2023): nada de analítica hasta que
   el usuario acepta; "Rechazar" al mismo nivel que "Aceptar".
   Analítica: Google Analytics 4 (flujo, rutas, conversiones) +
   Microsoft Clarity (mapas de calor, clics, grabaciones de sesión).
   >>> Pegar aquí los IDs cuando existan las cuentas: <<<
   ===================================================================== */
(function(){
  var CONFIG = {
    GA4_ID: "",          // p.ej. "G-XXXXXXXXXX"  (analytics.google.com)
    CLARITY_ID: "",      // p.ej. "abcd1234ef"    (clarity.microsoft.com)
    LINKER_DOMAINS: ["bookings.cabauhotels.com", "elpatiodegloria.com", "hotelgloria.es"],
    COOKIE_PAGE: "cookies.html"
  };
  var KEY = "gloria_consent";
  var VERSION = 1;
  var MAX_AGE_MS = 365 * 24 * 3600 * 1000; // re-preguntar a los 12 meses

  var TXT = {
    en:{title:"Your privacy", body:"We use our own and third-party cookies to understand how our website is used and to improve your experience. Analytics cookies are only activated if you accept them.", more:"Cookie Policy", accept:"Accept all", reject:"Reject", settings:"Settings", save:"Save choices", nec:"Necessary", necD:"Required for the site to work (language, your cookie choice). Always active.", ana:"Analytics", anaD:"Google Analytics and Microsoft Clarity: visits, navigation paths, clicks and anonymous heatmaps.", on:"Always on"},
    es:{title:"Tu privacidad", body:"Utilizamos cookies propias y de terceros para entender cómo se usa nuestra web y mejorar tu experiencia. Las cookies analíticas solo se activan si las aceptas.", more:"Política de cookies", accept:"Aceptar todas", reject:"Rechazar", settings:"Configurar", save:"Guardar selección", nec:"Necesarias", necD:"Imprescindibles para que la web funcione (idioma, tu elección de cookies). Siempre activas.", ana:"Analíticas", anaD:"Google Analytics y Microsoft Clarity: visitas, recorridos de navegación, clics y mapas de calor anónimos.", on:"Siempre activas"},
    de:{title:"Ihre Privatsphäre", body:"Wir verwenden eigene Cookies und Cookies von Drittanbietern, um die Nutzung unserer Website zu verstehen und Ihr Erlebnis zu verbessern. Analyse-Cookies werden nur mit Ihrer Zustimmung aktiviert.", more:"Cookie-Richtlinie", accept:"Alle akzeptieren", reject:"Ablehnen", settings:"Einstellungen", save:"Auswahl speichern", nec:"Notwendig", necD:"Für die Funktion der Website erforderlich (Sprache, Ihre Cookie-Auswahl). Immer aktiv.", ana:"Analyse", anaD:"Google Analytics und Microsoft Clarity: Besuche, Navigationspfade, Klicks und anonyme Heatmaps.", on:"Immer aktiv"},
    fr:{title:"Votre confidentialité", body:"Nous utilisons des cookies propres et tiers pour comprendre l'utilisation de notre site et améliorer votre expérience. Les cookies analytiques ne sont activés qu'avec votre accord.", more:"Politique de cookies", accept:"Tout accepter", reject:"Refuser", settings:"Paramètres", save:"Enregistrer mes choix", nec:"Nécessaires", necD:"Indispensables au fonctionnement du site (langue, votre choix de cookies). Toujours actifs.", ana:"Analytiques", anaD:"Google Analytics et Microsoft Clarity : visites, parcours de navigation, clics et cartes de chaleur anonymes.", on:"Toujours actifs"},
    sv:{title:"Din integritet", body:"Vi använder egna cookies och tredjepartscookies för att förstå hur vår webbplats används och förbättra din upplevelse. Analyscookies aktiveras bara om du godkänner dem.", more:"Cookiepolicy", accept:"Godkänn alla", reject:"Avvisa", settings:"Inställningar", save:"Spara val", nec:"Nödvändiga", necD:"Krävs för att webbplatsen ska fungera (språk, ditt cookieval). Alltid aktiva.", ana:"Analys", anaD:"Google Analytics och Microsoft Clarity: besök, navigeringsvägar, klick och anonyma värmekartor.", on:"Alltid aktiva"}
  };

  function lang(){ var l = (document.documentElement.lang || "en").slice(0,2); return TXT[l] ? l : "en"; }
  function t(k){ return TXT[lang()][k]; }

  function read(){
    try{
      var c = JSON.parse(localStorage.getItem(KEY) || "null");
      if(!c || c.v !== VERSION || (Date.now() - c.ts) > MAX_AGE_MS) return null;
      return c;
    }catch(e){ return null; }
  }
  function write(analytics){
    var c = {v:VERSION, analytics:!!analytics, ts:Date.now()};
    try{ localStorage.setItem(KEY, JSON.stringify(c)); }catch(e){}
    return c;
  }

  /* ---------------- analítica ---------------- */
  var loaded = false, queue = [];
  function loadScript(src){ var s = document.createElement("script"); s.async = true; s.src = src; document.head.appendChild(s); }

  function loadAnalytics(){
    if(loaded) return;
    loaded = true;
    if(CONFIG.GA4_ID){
      window.dataLayer = window.dataLayer || [];
      window.gtag = function(){ window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", CONFIG.GA4_ID, {
        linker:{domains:CONFIG.LINKER_DOMAINS, decorate_forms:true},
        page_title: document.title,
        site_language: lang()
      });
      loadScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CONFIG.GA4_ID));
    }
    if(CONFIG.CLARITY_ID){
      window.clarity = window.clarity || function(){ (window.clarity.q = window.clarity.q || []).push(arguments); };
      loadScript("https://www.clarity.ms/tag/" + encodeURIComponent(CONFIG.CLARITY_ID));
      window.clarity("consent");
      window.clarity("set", "lang", lang());
    }
    queue.forEach(function(e){ send(e[0], e[1]); });
    queue = [];
  }

  function clearAnalyticsCookies(){
    var names = ["_ga","_gid","_gat","_clck","_clsk","CLID","ANONCHK","MR","MUID","SM"];
    document.cookie.split(";").forEach(function(c){
      var n = c.split("=")[0].trim();
      if(names.indexOf(n) > -1 || n.indexOf("_ga_") === 0){
        var host = location.hostname, parts = host.split(".");
        var domains = ["", host, "." + parts.slice(-2).join(".")];
        domains.forEach(function(d){
          document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + (d ? "; domain=" + d : "");
        });
      }
    });
    if(CONFIG.GA4_ID) window["ga-disable-" + CONFIG.GA4_ID] = true;
  }

  function send(name, params){
    if(window.gtag && CONFIG.GA4_ID) window.gtag("event", name, params || {});
    if(window.clarity && CONFIG.CLARITY_ID) window.clarity("event", name);
  }

  /* API pública para site.js: gloriaTrack("book_click", {...}) */
  window.gloriaTrack = function(name, params){
    var c = read();
    if(!c || !c.analytics) return;          // sin consentimiento, no se registra nada
    if(!loaded){ queue.push([name, params]); return; }
    send(name, params);
  };

  /* ---------------- banner / panel ---------------- */
  var root = null;

  function build(){
    if(root) root.remove();
    root = document.createElement("div");
    root.className = "cc-root";
    root.setAttribute("data-noi18n", "");
    root.innerHTML =
      '<div class="cc-card" role="dialog" aria-modal="false" aria-labelledby="cc-title">' +
        '<p class="cc-eyebrow" id="cc-title"></p>' +
        '<p class="cc-body"></p>' +
        '<div class="cc-prefs" hidden>' +
          '<div class="cc-row"><div><strong class="cc-nec"></strong><p class="cc-necD"></p></div><span class="cc-always"></span></div>' +
          '<label class="cc-row"><div><strong class="cc-ana"></strong><p class="cc-anaD"></p></div><input type="checkbox" class="cc-switch" name="analytics"></label>' +
        '</div>' +
        '<div class="cc-actions">' +
          '<button type="button" class="cc-btn cc-reject"></button>' +
          '<button type="button" class="cc-btn cc-settings"></button>' +
          '<button type="button" class="cc-btn cc-save" hidden></button>' +
          '<button type="button" class="cc-btn cc-primary cc-accept"></button>' +
        '</div>' +
        '<a class="cc-more" href="' + CONFIG.COOKIE_PAGE + '"></a>' +
      '</div>';
    document.body.appendChild(root);
    fill();

    var prefs = root.querySelector(".cc-prefs");
    var sw = root.querySelector(".cc-switch");
    var c = read(); sw.checked = !!(c && c.analytics);

    root.querySelector(".cc-accept").addEventListener("click", function(){ decide(true); });
    root.querySelector(".cc-reject").addEventListener("click", function(){ decide(false); });
    root.querySelector(".cc-save").addEventListener("click", function(){ decide(sw.checked); });
    root.querySelector(".cc-settings").addEventListener("click", function(){
      prefs.hidden = false;
      this.hidden = true;
      root.querySelector(".cc-save").hidden = false;
    });
    requestAnimationFrame(function(){ root.classList.add("cc-in"); });
  }

  function fill(){
    if(!root) return;
    var map = {"#cc-title":"title",".cc-body":"body",".cc-nec":"nec",".cc-necD":"necD",".cc-ana":"ana",".cc-anaD":"anaD",
      ".cc-always":"on",".cc-reject":"reject",".cc-settings":"settings",".cc-save":"save",".cc-accept":"accept",".cc-more":"more"};
    Object.keys(map).forEach(function(sel){ var el = root.querySelector(sel); if(el) el.textContent = t(map[sel]); });
  }

  function close(){ if(!root) return; var r = root; r.classList.remove("cc-in"); setTimeout(function(){ r.remove(); }, 300); root = null; }

  function decide(analytics){
    var prev = read();
    write(analytics);
    close();
    if(analytics){ loadAnalytics(); window.gloriaTrack("cookie_consent", {analytics:"granted"}); }
    else{
      clearAnalyticsCookies();
      if(prev && prev.analytics && loaded) location.reload(); // descargar scripts ya activos
    }
  }

  function openSettings(){
    build();
    root.querySelector(".cc-settings").click();
  }

  function init(){
    var c = read();
    if(c && c.analytics) loadAnalytics();
    if(!c) build();
    document.addEventListener("click", function(e){
      var b = e.target.closest && e.target.closest("[data-cookie-settings]");
      if(b){ e.preventDefault(); openSettings(); }
    });
    document.addEventListener("gloria:lang", function(){
      fill();
      if(window.clarity && CONFIG.CLARITY_ID) window.clarity("set", "lang", lang());
    });
  }

  window.gloriaConsent = {open:openSettings, get:read};
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
