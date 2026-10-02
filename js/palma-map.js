/* Palma by Glòria — mapas de las rutas a pie (Leaflet + teselas OpenStreetMap).
   Cada <div class="pg-map" data-route="first|d1|d2"> pinta la ruta, Glòria como inicio/fin y las paradas numeradas.
   Pasar el ratón por una parada de la lista (li[data-stop]) resalta su marcador. */
(function () {
  var R = window.PALMA_ROUTES;
  if (!R || !window.L) return;
  var BROWN = "#534134";

  function pin(n) {
    return L.divIcon({ className: "pg-pin", html: "<span>" + n + "</span>", iconSize: [28, 28], iconAnchor: [14, 14] });
  }
  var home = L.divIcon({ className: "pg-home", html: "<span>GLÒRIA</span>", iconSize: [74, 26], iconAnchor: [37, 13] });

  document.querySelectorAll(".pg-map[data-route]").forEach(function (el) {
    var route = R[el.getAttribute("data-route")];
    if (!route) return;
    var map = L.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
    }).addTo(map);

    var line = L.polyline(route.line, { color: BROWN, weight: 3, opacity: .85, dashArray: "1 7", lineCap: "round" }).addTo(map);
    L.polyline(route.line, { color: BROWN, weight: 2, opacity: .55 }).addTo(map);
    L.marker(R.gloria, { icon: home, zIndexOffset: 1000, title: "Glòria de Sant Jaume" }).addTo(map)
      .bindTooltip("Glòria de Sant Jaume · Carrer de Sant Jaume, 18", { direction: "top", offset: [0, -12] });

    var markers = {};
    route.stops.forEach(function (s) {
      markers[s.n] = L.marker(s.p, { icon: pin(parseInt(s.n, 10)), title: s.name }).addTo(map)
        .bindTooltip(s.name, { direction: "top", offset: [0, -14] });
    });
    map.fitBounds(line.getBounds(), { padding: [26, 26] });
    window.addEventListener("resize", function () { map.invalidateSize(); });

    var list = document.querySelector('[data-route-list="' + el.getAttribute("data-route") + '"]');
    if (!list) return;
    list.querySelectorAll("li[data-stop]").forEach(function (li) {
      var m = markers[li.getAttribute("data-stop")];
      if (!m) return;
      li.addEventListener("mouseenter", function () { m.getElement() && m.getElement().classList.add("on"); m.openTooltip(); });
      li.addEventListener("mouseleave", function () { m.getElement() && m.getElement().classList.remove("on"); m.closeTooltip(); });
    });
  });
})();
