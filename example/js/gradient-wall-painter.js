// ─────────────────────────────────────────────────────────────────────────────
// GRADIENT WALL PAINTER
// Applies gradient colors to walls using canvas-generated blob URL textures
// Works with edge.ts's updateTexture() which uses THREE.TextureLoader + URL
// Hooks into the existing TextureSelector / wallClicked system
// ─────────────────────────────────────────────────────────────────────────────

var GradientWallPainter = function (blueprint3d, sideMenu) {

  var currentTarget  = null;  // current HalfEdge (set by wallClicked)
  var CANVAS_W       = 512;
  var CANVAS_H       = 512;

  // ── Preset gradients ──────────────────────────────────────────────────────
  var PRESETS = [
    { name: "Sunset",      top: "#ff6b6b", bottom: "#ffd93d" },
    { name: "Ocean",       top: "#667eea", bottom: "#764ba2" },
    { name: "Forest",      top: "#134e5e", bottom: "#71b280" },
    { name: "Blush",       top: "#f8cdda", bottom: "#1d2b64" },
    { name: "Warm White",  top: "#fdfcfb", bottom: "#e2d1c3" },
    { name: "Slate",       top: "#e0eafc", bottom: "#cfdef3" },
    { name: "Charcoal",    top: "#485563", bottom: "#29323c" },
    { name: "Peach",       top: "#f7971e", bottom: "#ffd200" },
    { name: "Mint",        top: "#a8edea", bottom: "#fed6e3" },
    { name: "Royal",       top: "#141e30", bottom: "#243b55" }
  ];

  // ── Generate gradient texture as blob URL ─────────────────────────────────
  // Returns a promise that resolves to a blob: URL string
  function generateGradientUrl(topColor, bottomColor, direction) {
    return new Promise(function (resolve) {
      var canvas  = document.createElement("canvas");
      canvas.width  = CANVAS_W;
      canvas.height = CANVAS_H;
      var ctx = canvas.getContext("2d");

      var grad;
      if (direction === "horizontal") {
        grad = ctx.createLinearGradient(0, 0, CANVAS_W, 0);
      } else if (direction === "diagonal") {
        grad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
      } else {
        // default: vertical (top → bottom)
        grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      }

      grad.addColorStop(0, topColor);
      grad.addColorStop(1, bottomColor);

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Convert to blob URL
      canvas.toBlob(function (blob) {
        if (!blob) {
          resolve(null);
          return;
        }
        var url = URL.createObjectURL(blob);
        resolve(url);
      }, "image/png");
    });
  }

  // ── Apply gradient to current wall target ─────────────────────────────────
  function applyGradient() {
    if (!currentTarget) {
      showToast("⚠️ Click a wall first");
      return;
    }

    var topColor    = $("#gwp-color-top").val()    || "#ffffff";
    var bottomColor = $("#gwp-color-bottom").val() || "#cccccc";
    var direction   = $("#gwp-direction").val()    || "vertical";

    // Show loading state
    var $btn = $("#gwp-apply-btn");
    $btn.prop("disabled", true).text("Applying...");

    generateGradientUrl(topColor, bottomColor, direction).then(function (blobUrl) {
      if (!blobUrl) {
        showToast("❌ Failed to generate gradient");
        $btn.prop("disabled", false).text("Apply Gradient");
        return;
      }

      try {
        // Use the same setTexture API as the existing TextureSelector
        // stretch=true so it fills the wall, scale=0 (ignored when stretch=true)
        currentTarget.setTexture(blobUrl, true, 0);

        // Force scene update
        if (blueprint3d.three) {
          blueprint3d.three.setNeedsUpdate();
        }

        showToast("✅ Gradient applied!");
        // Add to recent history
        addToHistory(topColor, bottomColor, direction);
      } catch (e) {
        console.warn("GradientWallPainter: apply failed", e);
        showToast("❌ Could not apply to wall");
      }

      $btn.prop("disabled", false).text("Apply Gradient");
    });
  }

  // ── Apply to ALL walls ────────────────────────────────────────────────────
  function applyToAllWalls() {
    var topColor    = $("#gwp-color-top").val()    || "#ffffff";
    var bottomColor = $("#gwp-color-bottom").val() || "#cccccc";
    var direction   = $("#gwp-direction").val()    || "vertical";

    var $btn = $("#gwp-all-btn");
    $btn.prop("disabled", true).text("Applying...");

    generateGradientUrl(topColor, bottomColor, direction).then(function (blobUrl) {
      if (!blobUrl) {
        $btn.prop("disabled", false).text("Apply to All Walls");
        return;
      }

      try {
        var floorplan = blueprint3d.model.activeFloor.floorplan;
        var walls     = floorplan.getWalls ? floorplan.getWalls() : [];
        var count     = 0;

        walls.forEach(function (wall) {
          try {
            // Apply to front half edge
            if (wall.frontEdge && wall.frontEdge.setTexture) {
              wall.frontEdge.setTexture(blobUrl, true, 0);
              count++;
            }
            // Apply to back half edge
            if (wall.backEdge && wall.backEdge.setTexture) {
              wall.backEdge.setTexture(blobUrl, true, 0);
            }
          } catch (e) {}
        });

        if (blueprint3d.three) blueprint3d.three.setNeedsUpdate();
        showToast("✅ Applied to " + count + " wall(s)");
      } catch (e) {
        console.warn("GradientWallPainter: apply all failed", e);
        showToast("❌ Failed to apply to all walls");
      }

      $btn.prop("disabled", false).text("Apply to All Walls");
    });
  }

  // ── Live preview gradient in swatch ───────────────────────────────────────
  function updatePreview() {
    var top    = $("#gwp-color-top").val()    || "#ffffff";
    var bottom = $("#gwp-color-bottom").val() || "#cccccc";
    var dir    = $("#gwp-direction").val()    || "vertical";

    var cssDir = dir === "horizontal" ? "to right"
               : dir === "diagonal"  ? "135deg"
               : "to bottom";

    $("#gwp-preview").css(
      "background",
      "linear-gradient(" + cssDir + ", " + top + ", " + bottom + ")"
    );
  }

  // ── Load a preset ─────────────────────────────────────────────────────────
  function loadPreset(preset) {
    $("#gwp-color-top").val(preset.top);
    $("#gwp-color-bottom").val(preset.bottom);
    updatePreview();
  }

  // ── History of recent gradients ───────────────────────────────────────────
  var history = [];
  function addToHistory(top, bottom, dir) {
    history.unshift({ top: top, bottom: bottom, dir: dir });
    if (history.length > 6) history.pop();
    renderHistory();
  }

  function renderHistory() {
    var $hist = $("#gwp-history");
    $hist.empty();
    if (history.length === 0) return;
    $hist.append('<div style="font-size:10px; color:#aaa; margin-bottom:4px;">Recent</div>');
    var $row = $('<div style="display:flex; flex-wrap:wrap; gap:4px;"></div>');
    history.forEach(function (h, i) {
      var cssDir = h.dir === "horizontal" ? "to right"
                 : h.dir === "diagonal"  ? "135deg"
                 : "to bottom";
      var $swatch = $(
        '<div class="gwp-hist-swatch" data-index="'+i+'" '+
        'style="width:28px; height:28px; border-radius:4px; cursor:pointer;'+
        'border:1px solid #ddd;'+
        'background:linear-gradient('+cssDir+', '+h.top+', '+h.bottom+');" '+
        'title="'+h.top+' → '+h.bottom+'"></div>'
      );
      $row.append($swatch);
    });
    $hist.append($row);
  }

  // ── Inject panel ──────────────────────────────────────────────────────────
  function injectPanel() {
    // Render preset swatches HTML
    var presetsHtml = PRESETS.map(function (p, i) {
      return '<div class="gwp-preset" data-index="'+i+'" '+
        'style="width:28px; height:28px; border-radius:4px; cursor:pointer;'+
        'border:1px solid #ddd; flex-shrink:0;'+
        'background:linear-gradient(to bottom, '+p.top+', '+p.bottom+');" '+
        'title="'+p.name+'"></div>';
    }).join("");

    var html =
      '<div id="gradient-wall-panel" class="sidebar-section" style="display:none;">'+
        '<div class="panel">'+
          '<div class="panel-heading">'+
            '<span style="margin-right:6px;">🌈</span>'+
            '<span style="font-weight:600;">Gradient Wall Painter</span>'+
          '</div>'+
          '<div class="panel-body" style="padding:10px 12px;">'+

            // Instructions
            '<p class="text-muted" style="font-size:11px; margin:0 0 10px; line-height:1.5;">'+
              'Click a wall in the 3D view, then choose colors and apply.'+
            '</p>'+

            // Wall target indicator
            '<div id="gwp-target" style="padding:6px 10px; background:#f5f5f5;'+
            'border-radius:6px; font-size:11px; color:#888; margin-bottom:10px;">'+
              '🖱️ No wall selected yet'+
            '</div>'+

            // Live preview
            '<div id="gwp-preview" style="height:50px; border-radius:8px; margin-bottom:10px;'+
            'border:1px solid #eee; background:linear-gradient(to bottom, #ffffff, #cccccc);'+
            'transition:background 0.3s;"></div>'+

            // Color pickers row
            '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">'+
              '<div>'+
                '<label style="font-size:10px; color:#888; display:block; margin-bottom:3px;">Top Color</label>'+
                '<input type="color" id="gwp-color-top" value="#ffffff" '+
                'style="width:100%; height:34px; border:1px solid #ddd; border-radius:6px; cursor:pointer; padding:2px;">'+
              '</div>'+
              '<div>'+
                '<label style="font-size:10px; color:#888; display:block; margin-bottom:3px;">Bottom Color</label>'+
                '<input type="color" id="gwp-color-bottom" value="#cccccc" '+
                'style="width:100%; height:34px; border:1px solid #ddd; border-radius:6px; cursor:pointer; padding:2px;">'+
              '</div>'+
            '</div>'+

            // Direction selector
            '<div style="margin-bottom:10px;">'+
              '<label style="font-size:10px; color:#888; display:block; margin-bottom:3px;">Direction</label>'+
              '<select id="gwp-direction" class="form-control input-sm">'+
                '<option value="vertical">↕ Vertical (Top → Bottom)</option>'+
                '<option value="horizontal">↔ Horizontal (Left → Right)</option>'+
                '<option value="diagonal">↗ Diagonal</option>'+
              '</select>'+
            '</div>'+

            // Preset swatches
            '<div style="font-size:10px; color:#888; margin-bottom:5px;">Presets</div>'+
            '<div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:10px;">'+
              presetsHtml+
            '</div>'+

            // Apply buttons
            '<button id="gwp-apply-btn" class="btn btn-primary btn-block btn-sm" '+
            'style="margin-bottom:5px;" disabled>'+
              'Apply Gradient to Wall'+
            '</button>'+
            '<button id="gwp-all-btn" class="btn btn-default btn-block btn-sm" '+
            'style="margin-bottom:8px;" disabled>'+
              'Apply to All Walls'+
            '</button>'+

            // History
            '<div id="gwp-history"></div>'+

          '</div>'+
        '</div>'+
      '</div>';

    // Insert before wallTextures panel
    if ($("#wallTextures").length) {
      $("#wallTextures").before(html);
    } else {
      $(".sidebar").find(".sidebar-section:last").after(html);
    }
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  function showToast(msg) {
    var $t = $("#gwp-toast");
    if ($t.length === 0) {
      $t = $('<div id="gwp-toast" style="'+
        'position:fixed; bottom:120px; left:50%; transform:translateX(-50%);'+
        'background:rgba(0,0,0,0.75); color:#fff; padding:8px 18px;'+
        'border-radius:20px; font-size:13px; z-index:9999;'+
        'pointer-events:none; transition:opacity 0.3s;"></div>');
      $("body").append($t);
    }
    $t.text(msg).css("opacity", 1);
    clearTimeout($t.data("timer"));
    $t.data("timer", setTimeout(function () { $t.css("opacity", 0); }, 2000));
  }

  // ── Event bindings ────────────────────────────────────────────────────────
  function bindEvents() {

    // Wall clicked — set as current target
    blueprint3d.three.wallClicked.add(function (halfEdge) {
      currentTarget = halfEdge;
      $("#gwp-target").html('✅ Wall selected — ready to paint!').css("color", "#27ae60");
      $("#gwp-apply-btn").prop("disabled", false);
      $("#gwp-all-btn").prop("disabled", false);
      // Show gradient panel if in design state
      $("#gradient-wall-panel").show();
    });

    // Nothing clicked — deselect
    blueprint3d.three.nothingClicked.add(function () {
      // Keep target so user can still apply after clicking elsewhere
    });

    // Color change → live preview
    $("#gwp-color-top, #gwp-color-bottom").on("input", updatePreview);
    $("#gwp-direction").on("change", updatePreview);

    // Apply button
    $(document).on("click", "#gwp-apply-btn", applyGradient);

    // Apply all button
    $(document).on("click", "#gwp-all-btn", applyToAllWalls);

    // Preset click
    $(document).on("click", ".gwp-preset", function () {
      var idx    = parseInt($(this).data("index"));
      var preset = PRESETS[idx];
      if (preset) loadPreset(preset);
    });

    // History swatch click
    $(document).on("click", ".gwp-hist-swatch", function () {
      var idx = parseInt($(this).data("index"));
      var h   = history[idx];
      if (h) {
        $("#gwp-color-top").val(h.top);
        $("#gwp-color-bottom").val(h.bottom);
        $("#gwp-direction").val(h.dir);
        updatePreview();
      }
    });

    // Show/hide with sidebar state
    if (sideMenu) {
      sideMenu.stateChangeCallbacks.add(function (state) {
        if (state === sideMenu.states.DEFAULT) {
          $("#gradient-wall-panel").show();
        } else {
          $("#gradient-wall-panel").hide();
        }
      });
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    injectPanel();
    bindEvents();
    updatePreview();
    console.log("GradientWallPainter: initialized with " + PRESETS.length + " presets.");
  }

  init();
};