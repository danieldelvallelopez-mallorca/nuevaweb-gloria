/* Trabaja con nosotros: valida el formulario y lo envía a api/careers.php (CV adjunto). */
(function(){
  var form = document.getElementById("careers-form");
  if(!form) return;
  var status = form.querySelector(".cf-status");
  var btn = form.querySelector('button[type="submit"]');
  var MAX = 5 * 1024 * 1024;
  var OK_EXT = /\.(pdf|docx?)$/i;

  // mensajes traducidos con los mismos datos que el resto de la web (js/i18n-data.js)
  function t(s){
    var d = (window.I18N_DATA || {})[document.documentElement.lang] || {};
    return d[s] || s;
  }
  function say(msg, kind){
    status.textContent = t(msg);
    status.className = "cf-status" + (kind ? " is-" + kind : "");
  }
  function mark(el, bad){
    var f = el.closest(".cf-field");
    if(f) f.classList.toggle("is-invalid", bad);
  }

  form.addEventListener("submit", function(e){
    e.preventDefault();
    var bad = false;
    ["name", "email", "hotel", "area"].forEach(function(n){
      var el = form.elements[n];
      var wrong = !el.value.trim() || (n === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
      mark(el, wrong); bad = bad || wrong;
    });
    var cv = form.elements.cv, file = cv.files && cv.files[0];
    var cvWrong = !file || !OK_EXT.test(file.name) || file.size > MAX;
    mark(cv, cvWrong);
    if(bad){ say("Please fill in the required fields.", "err"); return; }
    if(cvWrong){ say("Please attach your CV as a PDF or Word file of up to 5 MB.", "err"); return; }
    if(!form.elements.consent.checked){ say("Please accept the data protection information to send your CV.", "err"); return; }

    btn.disabled = true;
    say("Sending…");
    var fd = new FormData(form);
    fd.append("lang", document.documentElement.lang || "en");   // idioma del email de confirmación
    fetch(form.action, { method: "POST", body: fd, credentials: "same-origin" })
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ return { ok: r.ok, j: j }; }); })
      .then(function(res){
        if(res.ok && res.j.ok){
          form.classList.add("is-sent");
          say("Thank you. We have received your application and will be in touch if there is a suitable opening.", "ok");
          if(window.gloriaTrack) window.gloriaTrack("careers_submit", { area: form.elements.area.value });
        } else {
          btn.disabled = false;
          say(res.j.error === "file" ? "Please attach your CV as a PDF or Word file of up to 5 MB." :
              res.j.error === "rate" ? "Too many attempts. Please try again later." :
              "Sorry, we could not send your application. Please try again later.", "err");
        }
      })
      .catch(function(){ btn.disabled = false; say("Sorry, we could not send your application. Please try again later.", "err"); });
  });
})();
