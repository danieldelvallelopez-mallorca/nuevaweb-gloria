/* Glòria Guest (guest.html): música de los próximos 7 días en El Patio.
   Lee window.GLORIA_MUSIC (js/music-data.js, generado por tools/music_month.py).
   Textos en inglés como clave; traducciones en js/i18n-data.js. */
(function(){
  var DAYS = 7;
  var CLOSED = [2, 3];                          // JS getDay(): martes y miércoles El Patio descansa
  var TIME = "20:00 – 22:00";

  function lang(){ return (document.documentElement.lang || "en").slice(0, 2); }
  function t(s){ var d = (window.I18N_DATA || {})[lang()] || {}; return d[s] || s; }
  function el(tag, cls, txt){ var e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; }
  function fmt(d, o){ try{ return d.toLocaleDateString(lang(), o); }catch(e){ return d.toDateString(); } }

  /** Artista de un día, o null si el calendario del mes no lo trae. */
  function artistOn(d){
    var m = window.GLORIA_MUSIC;
    if(!m || d.getFullYear() !== m.year || d.getMonth() + 1 !== m.month) return null;
    var e = m.entries && m.entries[String(d.getDate())];
    return e ? {name:e[0], extra:e[1] || ""} : null;
  }

  function render(){
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

  function init(){ render(); document.addEventListener("gloria:lang", render); }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
