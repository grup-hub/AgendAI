const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const ASSETS = path.join(__dirname, "mobile", "assets");

// Cores - azul com toques roxo (unissex e moderno)
const COLOR_DARK = "#1E3A8A";   // blue-900 (header, badge)
const COLOR_MID = "#7C3AED";    // violet-600 (pontos destacados)
const COLOR_LIGHT = "#C4B5FD";  // violet-300 (pegs)
const COLOR_BG1 = "#2563EB";    // blue-600 (gradient start)
const COLOR_BG2 = "#7C3AED";    // violet-600 (gradient end)

function q(v) { return '"' + v + '"'; }
function attr(k, v) { return " " + k + "=" + q(v); }
function tag(name, attrs, children) {
  var a = Object.keys(attrs).map(function(k) { return attr(k, attrs[k]); }).join("");
  if (children === undefined) return "<" + name + a + "/>";
  return "<" + name + a + ">" + (children || "") + "</" + name + ">";
}

function buildIconSVG(size, radius, isAdaptive) {
  var s = size, r = radius, sc = s / 1024;

  // Para adaptive icon, escalar tudo para caber na safe zone (66% central)
  // O Android corta ~17% de cada lado com máscara circular
  var asc = isAdaptive ? 0.75 : 1.0; // fator de escala para adaptive
  var offsetY = 0;

  // Calendar dimensions
  var calW = Math.round(540 * sc * asc), calH = Math.round(480 * sc * asc);
  // No adaptive, centralizar só o calendário (sem texto); no normal, manter layout com texto
  var calX = Math.round((s - calW) / 2);
  var calY = isAdaptive ? Math.round((s - calH) / 2 + 30 * sc) : Math.round(180 * sc);
  var calR = Math.round(40 * sc * asc), hdrH = Math.round(110 * sc * asc);

  // Pegs
  var pegW = Math.round(26 * sc * asc), pegH = Math.round(64 * sc * asc), pegR = Math.round(13 * sc * asc);
  var peg1X = Math.round(calX + 130 * sc * asc), peg2X = Math.round(calX + calW - 130 * sc * asc - pegW);
  var pegY = Math.round(calY - pegH / 2);

  // Grid of dots - 4 cols x 3 rows (como dias do mes)
  var bodyTop = calY + hdrH, bodyH = calH - hdrH;
  var gridPadX = Math.round(50 * sc * asc), gridPadY = Math.round(36 * sc * asc);
  var cols = 4, rows = 3;
  var cellW = (calW - gridPadX * 2) / cols;
  var cellH = (bodyH - gridPadY * 2) / rows;
  var dotR = Math.round(18 * sc * asc);

  var dots = "";
  for (var row = 0; row < rows; row++) {
    for (var col = 0; col < cols; col++) {
      var cx = Math.round(calX + gridPadX + cellW * col + cellW / 2);
      var cy = Math.round(bodyTop + gridPadY + cellH * row + cellH / 2);
      var fill;
      // Highlight some dots (simulating days with events)
      if ((row === 0 && col === 1) || (row === 1 && col === 2) || (row === 2 && col === 0)) {
        fill = "#2563EB"; // highlighted days - azul
      } else {
        fill = "rgba(37,99,235,0.22)"; // normal days - azul claro
      }
      dots += tag("circle", { cx: cx, cy: cy, r: dotR, fill: fill });
    }
  }

  // Header month text lines
  var hl1 = tag("rect", {
    x: Math.round(calX + 65 * sc * asc), y: Math.round(calY + 36 * sc * asc),
    width: Math.round(160 * sc * asc), height: Math.round(18 * sc * asc),
    rx: Math.round(9 * sc * asc), fill: "rgba(255,255,255,0.7)"
  });
  var hl2 = tag("rect", {
    x: Math.round(calX + 65 * sc * asc), y: Math.round(calY + 66 * sc * asc),
    width: Math.round(100 * sc * asc), height: Math.round(14 * sc * asc),
    rx: Math.round(7 * sc * asc), fill: "rgba(255,255,255,0.4)"
  });

  // AI badge removed

  // App name text
  var textY = Math.round(calY + calH + 70 * sc * asc);
  var textSz = Math.round(110 * sc * asc);
  var nameText = tag("text", {
    x: Math.round(s / 2), y: textY, "text-anchor": "middle",
    "font-family": "Arial Black,Arial,sans-serif", "font-weight": "900",
    "font-size": textSz, fill: "white", opacity: "0.95"
  }, "AgendAI");

  // Background
  var bgAttrs = radius > 0
    ? { width: s, height: s, rx: r, ry: r, fill: "url(#bg)" }
    : { width: s, height: s, fill: "url(#bg)" };

  // Gradient
  var grad = tag("linearGradient", { id: "bg", x1: "0", y1: "0", x2: "0.8", y2: "1" },
    tag("stop", { offset: "0%", "stop-color": COLOR_BG1 }) +
    tag("stop", { offset: "100%", "stop-color": COLOR_BG2 }));
  var defs = tag("defs", {}, grad);

  var bgRect = tag("rect", bgAttrs);

  // Calendar body
  var calBody = tag("rect", {
    x: calX, y: calY, width: calW, height: calH,
    rx: calR, ry: calR, fill: "white", opacity: "0.97"
  });

  // Calendar header clip
  var clipInner = tag("rect", { x: calX, y: calY, width: calW, height: calH, rx: calR, ry: calR });
  var clipDef = tag("clipPath", { id: "calClip" }, clipInner);
  var hdrBar = tag("rect", {
    x: calX, y: calY, width: calW, height: hdrH,
    fill: COLOR_DARK, "clip-path": "url(#calClip)"
  });

  // Pegs
  var p1 = tag("rect", { x: peg1X, y: pegY, width: pegW, height: pegH, rx: pegR, ry: pegR, fill: COLOR_LIGHT });
  var p2 = tag("rect", { x: peg2X, y: pegY, width: pegW, height: pegH, rx: pegR, ry: pegR, fill: COLOR_LIGHT });

  // Subtle checkmark on one highlighted dot (row 0, col 1)
  var checkCx = Math.round(calX + gridPadX + cellW * 1 + cellW / 2);
  var checkCy = Math.round(bodyTop + gridPadY + cellH * 0 + cellH / 2);
  var checkMark = tag("path", {
    d: "M" + Math.round(checkCx - 8 * sc * asc) + "," + checkCy +
      " L" + Math.round(checkCx - 2 * sc * asc) + "," + Math.round(checkCy + 6 * sc * asc) +
      " L" + Math.round(checkCx + 9 * sc * asc) + "," + Math.round(checkCy - 6 * sc * asc),
    stroke: "white", "stroke-width": Math.round(4 * sc * asc), fill: "none",
    "stroke-linecap": "round", "stroke-linejoin": "round"
  });

  var inner = defs + bgRect + calBody + tag("defs", {}, clipDef) + hdrBar + hl1 + hl2 + p1 + p2 + dots + checkMark + nameText;

  return '<?xml version=' + q("1.0") + ' encoding=' + q("UTF-8") + '?>' +
    tag("svg", { width: s, height: s, viewBox: "0 0 " + s + " " + s, xmlns: "http://www.w3.org/2000/svg" }, inner);
}

function buildFaviconSVG(size) {
  var s = size, r = Math.round(s * 0.18);

  // Grid 3x2 dots
  var dots = "";
  for (var col = 0; col < 3; col++) {
    for (var row = 0; row < 2; row++) {
      var highlighted = (row === 0 && col === 1);
      dots += tag("circle", {
        cx: Math.round(s * (0.28 + col * 0.22)),
        cy: Math.round(s * (0.56 + row * 0.17)),
        r: Math.round(s * 0.05),
        fill: highlighted ? COLOR_MID : COLOR_DARK,
        opacity: highlighted ? "1" : "0.4"
      });
    }
  }

  var grad = tag("linearGradient", { id: "bg", x1: "0", y1: "0", x2: "0.8", y2: "1" },
    tag("stop", { offset: "0%", "stop-color": COLOR_BG1 }) +
    tag("stop", { offset: "100%", "stop-color": COLOR_BG2 }));
  var defs = tag("defs", {}, grad);
  var bg = tag("rect", { width: s, height: s, rx: r, ry: r, fill: "url(#bg)" });
  var body = tag("rect", {
    x: Math.round(s * 0.14), y: Math.round(s * 0.22),
    width: Math.round(s * 0.72), height: Math.round(s * 0.62),
    rx: Math.round(s * 0.08), fill: "white", opacity: "0.95"
  });
  var clipInner = tag("rect", {
    x: Math.round(s * 0.14), y: Math.round(s * 0.22),
    width: Math.round(s * 0.72), height: Math.round(s * 0.62),
    rx: Math.round(s * 0.08)
  });
  var clipDef = tag("clipPath", { id: "cc" }, clipInner);
  var hdr = tag("rect", {
    x: Math.round(s * 0.14), y: Math.round(s * 0.22),
    width: Math.round(s * 0.72), height: Math.round(s * 0.20),
    fill: COLOR_DARK, "clip-path": "url(#cc)"
  });
  var peg1 = tag("rect", {
    x: Math.round(s * 0.28), y: Math.round(s * 0.14),
    width: Math.round(s * 0.07), height: Math.round(s * 0.14),
    rx: Math.round(s * 0.035), fill: COLOR_LIGHT
  });
  var peg2 = tag("rect", {
    x: Math.round(s * 0.65), y: Math.round(s * 0.14),
    width: Math.round(s * 0.07), height: Math.round(s * 0.14),
    rx: Math.round(s * 0.035), fill: COLOR_LIGHT
  });
  var aiTxt = tag("text", {
    x: Math.round(s * 0.5), y: Math.round(s * 0.94),
    "text-anchor": "middle", "font-family": "Arial Black,Arial,sans-serif",
    "font-weight": "900", "font-size": Math.round(s * 0.18), fill: "white"
  }, "AI");

  var inner = defs + bg + body + tag("defs", {}, clipDef) + hdr + peg1 + peg2 + dots + aiTxt;
  return '<?xml version=' + q("1.0") + ' encoding=' + q("UTF-8") + '?>' +
    tag("svg", { width: s, height: s, viewBox: "0 0 " + s + " " + s, xmlns: "http://www.w3.org/2000/svg" }, inner);
}

async function generate() {
  var tasks = [
    { name: "icon.png", svg: buildIconSVG(1024, 180, false), width: 1024, height: 1024 },
    { name: "adaptive-icon.png", svg: buildIconSVG(1024, 0, false), width: 1024, height: 1024 },
    { name: "splash-icon.png", svg: buildIconSVG(1024, 180, false), width: 1024, height: 1024 },
    { name: "favicon.png", svg: buildFaviconSVG(64), width: 64, height: 64 }
  ];
  for (var i = 0; i < tasks.length; i++) {
    var task = tasks[i];
    var svgBuf = Buffer.from(task.svg, "utf8");
    var outPath = path.join(ASSETS, task.name);
    await sharp(svgBuf, { density: 144 }).resize(task.width, task.height).png({ compressionLevel: 9 }).toFile(outPath);
    var stat = fs.statSync(outPath);
    console.log("[OK] " + task.name + "  (" + stat.size + " bytes)");
  }
}

console.log("Generating AgendAI icons (teal theme)...");
generate().then(function() { console.log("Done."); }).catch(function(err) { console.error("FAILED:", err); process.exit(1); });
