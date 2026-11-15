(() => {
  "use strict";
  const KAABA = { lat: 21.422487, lon: 39.826206 };
  const $ = (id) => document.getElementById(id);
  const rad = (d) => (d * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;
  const norm = (a) => ((a % 360) + 360) % 360;
  const DIRS = ["N","NE","E","SE","S","SW","W","NW"];

  let heading = null, shown = null, pos = null, qibla = null;

  // ---------- Dial drawing ----------
  function drawDial(svgId, withKaaba) {
    const svg = $(svgId);
    let s = `<g id="${svgId}-g"><circle r="104" fill="#141d33" stroke="#2b3b63" stroke-width="3"/>`;
    for (let i = 0; i < 360; i += 5) {
      const major = i % 30 === 0, a = rad(i);
      const r1 = major ? 88 : 95, r2 = 102;
      s += `<line x1="${Math.sin(a)*r1}" y1="${-Math.cos(a)*r1}" x2="${Math.sin(a)*r2}" y2="${-Math.cos(a)*r2}" stroke="${i%90===0?"#ef4444":"#8a99bd"}" stroke-width="${major?2:1}"/>`;
    }
    [["N",0],["E",90],["S",180],["W",270]].forEach(([t,a]) => {
      s += `<text x="${Math.sin(rad(a))*74}" y="${-Math.cos(rad(a))*74+6}" text-anchor="middle" font-size="18" font-weight="700" fill="${t==="N"?"#ef4444":"#e8eefc"}">${t}</text>`;
    });
    if (withKaaba) s += `<g id="kaaba-mark"><line x1="0" y1="-30" x2="0" y2="-62" stroke="#22c55e" stroke-width="3"/><text y="-64" text-anchor="middle" font-size="22">🕋</text></g>`;
    s += `</g><circle r="4" fill="#38bdf8"/>`;
    svg.innerHTML = s;
  }
  drawDial("dial-compass", false);
  drawDial("dial-qibla", true);

  // ---------- Qibla math ----------
  function bearing(lat1, lon1, lat2, lon2) {
    const p1 = rad(lat1), p2 = rad(lat2), dl = rad(lon2 - lon1);
    const y = Math.sin(dl) * Math.cos(p2);
    const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return norm(deg(Math.atan2(y, x)));
  }
  function distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371, dp = rad(lat2 - lat1), dl = rad(lon2 - lon1);
    const a = Math.sin(dp/2)**2 + Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dl/2)**2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  // ---------- Compass sensor ----------
  let sensorOn = false;
  function onOrientation(e) {
    let h = null;
    if (typeof e.webkitCompassHeading === "number") h = e.webkitCompassHeading;      // iOS
    else if (e.alpha != null && (e.absolute || e.type === "deviceorientationabsolute")) h = norm(360 - e.alpha);
    if (h == null) return;
    heading = h;
  }
  async function enableSensors() {
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== "granted") { setStatus("Sensor permission denied"); return; }
      }
      if (!sensorOn) {
        window.addEventListener("deviceorientationabsolute", onOrientation, true);
        window.addEventListener("deviceorientation", (e) => {
          if (typeof e.webkitCompassHeading === "number") onOrientation(e);
        }, true);
        sensorOn = true;
      }
      $("enable-sensors").style.display = "none";
    } catch (err) { setStatus("Sensor error"); }
  }
  $("enable-sensors").addEventListener("click", enableSensors);

  // Smooth + render loop
  let wasAligned = false;
  function frame() {
    if (heading != null) {
      if (shown == null) shown = heading;
      const d = ((heading - shown + 540) % 360) - 180;
      shown = norm(shown + d * 0.2);
      $("dial-compass-g").setAttribute("transform", `rotate(${-shown})`);
      $("dial-qibla-g").setAttribute("transform", `rotate(${-shown})`);
      $("heading-text").textContent = `${Math.round(shown) % 360}°`;
      $("dir-text").textContent = DIRS[Math.round(shown / 45) % 8];
      if (qibla != null) {
        $("kaaba-mark").setAttribute("transform", `rotate(${qibla})`);
        const diff = Math.abs(((qibla - shown + 540) % 360) - 180);
        const aligned = diff < 3;
        $("tab-qibla").classList.toggle("aligned", aligned);
        if (aligned && !wasAligned && navigator.vibrate) navigator.vibrate(60);
        wasAligned = aligned;
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------- Location ----------
  function setStatus(t) { $("status").textContent = t; }
  async function startLocation() {
    try {
      const G = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Geolocation;
      if (G && G.requestPermissions) await G.requestPermissions();
    } catch (e) {}
    if (!navigator.geolocation) { setStatus("No GPS available"); return; }
    navigator.geolocation.watchPosition(onPos, (err) => {
      setStatus(err.code === 1 ? "Location denied" : "Searching GPS…");
      $("qibla-sub").textContent = err.code === 1 ? "Allow location to find Qibla" : "Searching GPS…";
    }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
  }
  function onPos(p) {
    pos = p;
    const c = p.coords;
    qibla = bearing(c.latitude, c.longitude, KAABA.lat, KAABA.lon);
    const dist = distanceKm(c.latitude, c.longitude, KAABA.lat, KAABA.lon);
    setStatus(`GPS ±${Math.round(c.accuracy)} m`);
    $("qibla-text").textContent = `Qibla ${Math.round(qibla)}°`;
    $("qibla-sub").textContent = `${Math.round(dist).toLocaleString()} km to Kaaba, Makkah`;
    $("g-lat").textContent = c.latitude.toFixed(6);
    $("g-lon").textContent = c.longitude.toFixed(6);
    $("g-alt").textContent = c.altitude != null ? `${c.altitude.toFixed(0)} m` : "n/a";
    $("g-acc").textContent = `±${c.accuracy.toFixed(0)} m`;
    $("g-spd").textContent = c.speed != null ? `${(c.speed * 3.6).toFixed(1)} km/h` : "n/a";
    $("g-hdg").textContent = c.heading != null && !isNaN(c.heading) ? `${c.heading.toFixed(0)}°` : "n/a";
    $("g-dist").textContent = `${Math.round(dist).toLocaleString()} km`;
    $("g-time").textContent = new Date(p.timestamp).toLocaleTimeString();
    updateMap();
  }

  // ---------- Map ----------
  let map, me, line, mapReady = false;
  function initMap() {
    if (mapReady) return;
    mapReady = true;
    map = L.map("map", { zoomControl: true }).setView([KAABA.lat, KAABA.lon], 4);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
    L.circleMarker([KAABA.lat, KAABA.lon], { radius: 9, color: "#166534", fillColor: "#22c55e", fillOpacity: 1 }).addTo(map).bindTooltip("Kaaba, Makkah");
    updateMap(true);
  }
  function updateMap(center) {
    if (!mapReady || !pos) return;
    const ll = [pos.coords.latitude, pos.coords.longitude];
    if (!me) {
      me = L.circleMarker(ll, { radius: 8, color: "#fff", weight: 3, fillColor: "#38bdf8", fillOpacity: 1 }).addTo(map).bindTooltip("You");
      line = L.polyline([ll, [KAABA.lat, KAABA.lon]], { color: "#22c55e", dashArray: "6 8" }).addTo(map);
      map.setView(ll, 12);
    } else {
      me.setLatLng(ll);
      line.setLatLngs([ll, [KAABA.lat, KAABA.lon]]);
      if (center) map.setView(ll, 14);
    }
  }
  $("btn-center").onclick = () => { if (pos && map) map.setView([pos.coords.latitude, pos.coords.longitude], 15); };
  $("btn-kaaba").onclick = () => { if (map) map.setView([KAABA.lat, KAABA.lon], 15); };

  // ---------- GPS actions ----------
  $("btn-copy").onclick = async () => {
    if (!pos) return;
    const t = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
    try { await navigator.clipboard.writeText(t); setStatus("Coordinates copied"); } catch (e) { prompt("Coordinates", t); }
  };
  $("btn-gmaps").onclick = () => {
    if (!pos) return;
    window.open(`https://www.openstreetmap.org/?mlat=${pos.coords.latitude}&mlon=${pos.coords.longitude}#map=17/${pos.coords.latitude}/${pos.coords.longitude}`, "_blank");
  };

  // ---------- Tabs ----------
  document.querySelectorAll("nav button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("nav button, .tab").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    $("tab-" + b.dataset.tab).classList.add("active");
    if (b.dataset.tab === "map") { initMap(); setTimeout(() => map.invalidateSize(), 100); }
    if (b.dataset.tab === "qibla" || b.dataset.tab === "compass") enableSensors();
  }));

  // ---------- Start ----------
  enableSensors();
  startLocation();
})();
