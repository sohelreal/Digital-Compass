// Copies src/ and Leaflet into www/ (no bundler needed)
const fs = require("fs");
const path = require("path");
fs.rmSync("www", { recursive: true, force: true });
fs.cpSync("src", "www", { recursive: true });
const lf = path.join("node_modules", "leaflet", "dist");
fs.mkdirSync("www/lib", { recursive: true });
fs.copyFileSync(path.join(lf, "leaflet.js"), "www/lib/leaflet.js");
fs.copyFileSync(path.join(lf, "leaflet.css"), "www/lib/leaflet.css");
fs.cpSync(path.join(lf, "images"), "www/lib/images", { recursive: true });
console.log("Built www/");
