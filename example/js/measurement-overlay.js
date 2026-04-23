// ─────────────────────────────────────────────────────────────────────────────
// SMART MEASUREMENT OVERLAY
// Shows real-time distances between selected item and nearby walls/items
// Renders measurement lines + labels on a canvas overlay on top of 3D view
// ─────────────────────────────────────────────────────────────────────────────

var MeasurementOverlay = function (blueprint3d) {

  var canvas     = null;   // overlay canvas
  var ctx        = null;
  var enabled    = false;
  var selItem    = null;   // currently selected item
  var animFrame  = null;

  var LABEL_FONT    = "bold 12px Arial";
  var LABEL_BG      = "rgba(0,0,0,0.65)";
  var LABEL_COLOR   = "#ffffff";
  var LINE_COLOR    = "#00d4ff";
  var LINE_DASH     = [6, 3];
  var DOT_COLOR     = "#ff4444";
  var SNAP_DIST     = 600; // cm — only show measurements within this distance

  // ── Create overlay canvas ─────────────────────────────────────────────────
  function createCanvas() {
    canvas = document.createElement("canvas");
    canvas.id = "measurement-canvas";
    canvas.style.cssText =
      "position:absolute; top:0; left:0; width:100%; height:100%;"+
      "pointer-events:none; z-index:100;";
    document.getElementById("viewer").appendChild(canvas);
    ctx = canvas.getContext("2d");
    resizeCanvas();
    $(window).on("resize.measurement", resizeCanvas);
  }

  function resizeCanvas() {
    if (!canvas) return;
    var $viewer = $("#viewer");
    canvas.width  = $viewer.innerWidth();
    canvas.height = $viewer.innerHeight();
  }

  // ── Project 3D point to 2D canvas coords ─────────────────────────────────
  function project3D(vec3) {
    return blueprint3d.three.projectVector(vec3, true);
  }

  // ── Get all wall positions from active floorplan ──────────────────────────
  function getWallSegments() {
    var segments = [];
    try {
      var floorplan = blueprint3d.model.activeFloor.floorplan;
      var walls = floorplan.getWalls ? floorplan.getWalls() : [];
      walls.forEach(function (wall) {
        var s = wall.getStart ? wall.getStart() : null;
        var e = wall.getEnd   ? wall.getEnd()   : null;
        if (s && e) {
          segments.push({
            start: new THREE.Vector3(s.x, 0, s.y),
            end:   new THREE.Vector3(e.x, 0, e.y)
          });
        }
      });
    } catch (ex) {
      // floorplan not ready
    }
    return segments;
  }

  // ── Distance from point to line segment ──────────────────────────────────
  function pointToSegmentDist(px, pz, ax, az, bx, bz) {
    var dx = bx - ax, dz = bz - az;
    var lenSq = dx * dx + dz * dz;
    if (lenSq === 0) return Math.hypot(px - ax, pz - az);
    var t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lenSq));
    var cx = ax + t * dx, cz = az + t * dz;
    return { dist: Math.hypot(px - cx, pz - cz), cx: cx, cz: cz };
  }

  // ── Format cm to readable string ─────────────────────────────────────────
  function fmtDist(cm) {
    if (cm >= 100) {
      return (cm / 100).toFixed(2) + " m";
    }
    return Math.round(cm) + " cm";
  }

  // ── Draw a measurement line + label ──────────────────────────────────────
  function drawMeasure(p1, p2, label, color) {
    if (!ctx || !p1 || !p2) return;
    color = color || LINE_COLOR;

    ctx.save();
    ctx.setLineDash(LINE_DASH);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // End dots
    [p1, p2].forEach(function (p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = DOT_COLOR;
      ctx.fill();
    });

    // Label at midpoint
    var mx = (p1.x + p2.x) / 2;
    var my = (p1.y + p2.y) / 2;

    ctx.font      = LABEL_FONT;
    var tw        = ctx.measureText(label).width;
    var pad       = 5;
    var bw        = tw + pad * 2;
    var bh        = 18;

    // Background pill
    ctx.fillStyle = LABEL_BG;
    ctx.beginPath();
    ctx.roundRect
      ? ctx.roundRect(mx - bw / 2, my - bh / 2, bw, bh, 6)
      : ctx.rect(mx - bw / 2, my - bh / 2, bw, bh);
    ctx.fill();

    // Text
    ctx.fillStyle    = LABEL_COLOR;
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, mx, my);
    ctx.restore();
  }

  // ── Draw item bounding box outline ────────────────────────────────────────
  function drawItemOutline(item) {
    try {
      var corners = item.getCorners();
      if (!corners || corners.length < 4) return;
      var pts = corners.map(function (c) {
        return project3D(new THREE.Vector3(c.x, item.position.y, c.y));
      });
      ctx.save();
      ctx.strokeStyle = "#ffcc00";
      ctx.lineWidth   = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    } catch (e) {}
  }

  // ── Main draw loop ────────────────────────────────────────────────────────
  function draw() {
    if (!enabled || !ctx || !selItem) {
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var pos   = selItem.position;
    var halfW = selItem.halfSize ? selItem.halfSize.x : 30;
    var halfD = selItem.halfSize ? selItem.halfSize.z : 30;

    // Item center projected
    var itemCenter2D = project3D(pos);

    // Draw item outline
    drawItemOutline(selItem);

    // ── Measure to walls ────────────────────────────────────────────────
    var walls = getWallSegments();
    walls.forEach(function (wall) {
      var result = pointToSegmentDist(
        pos.x, pos.z,
        wall.start.x, wall.start.z,
        wall.end.x,   wall.end.z
      );
      if (!result || result.dist > SNAP_DIST) return;

      var closestPt = new THREE.Vector3(result.cx, pos.y, result.cz);
      var wallPt2D  = project3D(closestPt);

      drawMeasure(itemCenter2D, wallPt2D, fmtDist(result.dist), LINE_COLOR);
    });

    // ── Measure to other nearby items ───────────────────────────────────
    var allItems = blueprint3d.model.scene.getItems();
    allItems.forEach(function (other) {
      if (other === selItem) return;
      var dx   = other.position.x - pos.x;
      var dz   = other.position.z - pos.z;
      var dist = Math.hypot(dx, dz);
      if (dist > SNAP_DIST) return;

      var otherPt2D = project3D(other.position);
      drawMeasure(itemCenter2D, otherPt2D, fmtDist(dist), "#ff9900");
    });

    // ── Item own dimensions ─────────────────────────────────────────────
    if (selItem.halfSize) {
      var wCm  = selItem.getWidth  ? selItem.getWidth()  : halfW * 2;
      var dCm  = selItem.getDepth  ? selItem.getDepth()  : halfD * 2;
      var hCm  = selItem.getHeight ? selItem.getHeight() : 100;

      // Width line
      var wL = project3D(new THREE.Vector3(pos.x - halfW, pos.y, pos.z));
      var wR = project3D(new THREE.Vector3(pos.x + halfW, pos.y, pos.z));
      drawMeasure(wL, wR, "W: " + fmtDist(wCm), "#aaffaa");

      // Depth line
      var dF = project3D(new THREE.Vector3(pos.x, pos.y, pos.z - halfD));
      var dB = project3D(new THREE.Vector3(pos.x, pos.y, pos.z + halfD));
      drawMeasure(dF, dB, "D: " + fmtDist(dCm), "#aaffaa");

      // Height label
      ctx.save();
      ctx.font      = LABEL_FONT;
      ctx.fillStyle = "#aaffaa";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("H: " + fmtDist(hCm), itemCenter2D.x + 40, itemCenter2D.y - 30);
      ctx.restore();
    }
  }

  // ── Animation loop ────────────────────────────────────────────────────────
  function loop() {
    draw();
    animFrame = requestAnimationFrame(loop);
  }

  // ── Toggle measurement overlay ────────────────────────────────────────────
  function toggle() {
    enabled = !enabled;
    $("#measure-toggle-btn").toggleClass("active btn-info btn-default");
    $("#measure-toggle-btn").find("span.label-text")
      .text(enabled ? "Measuring ON" : "Measure");
    if (!enabled && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    // Request update
    if (blueprint3d.three) {
       blueprint3d.three.setNeedsUpdate();
    }
  }

  // ── Inject toggle button ──────────────────────────────────────────────────
  function injectButton() {
    var btn =
      '<button id="measure-toggle-btn" class="btn btn-default btn-sm" '+
      'title="Toggle measurement overlay" style="margin-left:6px;">'+
        '<span class="glyphicon glyphicon-resize-full"></span>'+
        ' <span class="label-text">Measure</span>'+
      '</button>';
    $(".top-bar-actions").append(btn);
    $("#measure-toggle-btn").on("click", toggle);
  }

  // ── Bind item selection events ────────────────────────────────────────────
  function bindEvents() {
    blueprint3d.three.itemSelectedCallbacks.add(function (item) {
      selItem = item;
      if (enabled) draw();
    });
    blueprint3d.three.itemUnselectedCallbacks.add(function () {
      selItem = null;
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    createCanvas();
    injectButton();
    bindEvents();
    loop();
    console.log("MeasurementOverlay: initialized.");
  }

  init();
};