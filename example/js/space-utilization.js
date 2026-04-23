// ─────────────────────────────────────────────────────────────────────────────
// SPACE UTILIZATION METER
// Shows % of floor space occupied by furniture per room
// Uses room.getAreaCm2() and item halfSize (width × depth footprint)
// Updates live as items are added / removed / moved
// ─────────────────────────────────────────────────────────────────────────────

var SpaceUtilization = function (blueprint3d, sideMenu) {

  var IDEAL_MIN = 30; // % — below this is "sparse"
  var IDEAL_MAX = 60; // % — above this is "crowded"

  // ── Calculate total footprint area of all items on active floor ───────────
  function getItemsFootprintCm2() {
    var total = 0;
    try {
      var items = blueprint3d.model.scene.getItems();
      items.forEach(function (item) {
        try {
          var w = item.getWidth  ? item.getWidth()  : (item.halfSize ? item.halfSize.x * 2 : 0);
          var d = item.getDepth  ? item.getDepth()  : (item.halfSize ? item.halfSize.z * 2 : 0);
          if (w > 0 && d > 0) {
            total += w * d;
          }
        } catch (e) {}
      });
    } catch (e) {}
    return total;
  }

  // ── Get total floor area across all rooms ─────────────────────────────────
  function getTotalFloorAreaCm2() {
    var total = 0;
    try {
      var floorplan = blueprint3d.model.activeFloor ? blueprint3d.model.activeFloor.floorplan : blueprint3d.model.floorplan;
      var rooms = floorplan.getRooms ? floorplan.getRooms() : [];
      rooms.forEach(function (room) {
        try {
          total += room.getAreaCm2();
        } catch (e) {}
      });
    } catch (e) {}
    return total;
  }

  // ── Get per-room breakdown ────────────────────────────────────────────────
  function getRoomBreakdown() {
    var rooms = [];
    try {
      var floorplan = blueprint3d.model.activeFloor ? blueprint3d.model.activeFloor.floorplan : blueprint3d.model.floorplan;
      var allRooms  = floorplan.getRooms ? floorplan.getRooms() : [];
      allRooms.forEach(function (room) {
        try {
          var areaCm2 = room.getAreaCm2();
          var areaFt2 = areaCm2 / (30.48 * 30.48);
          rooms.push({
            room:    room,
            areaCm2: areaCm2,
            areaFt2: areaFt2
          });
        } catch (e) {}
      });
    } catch (e) {}
    return rooms;
  }

  // ── Get color based on utilization % ─────────────────────────────────────
  function getUtilColor(pct) {
    if (pct < IDEAL_MIN) return "#3498db";   // blue  — sparse
    if (pct <= IDEAL_MAX) return "#27ae60";  // green — ideal
    if (pct <= 80)        return "#e67e22";  // orange — getting crowded
    return "#e74c3c";                         // red — overcrowded
  }

  // ── Get status label ──────────────────────────────────────────────────────
  function getStatusLabel(pct) {
    if (pct === 0)        return { text: "Empty Room",   icon: "🏠" };
    if (pct < IDEAL_MIN)  return { text: "Sparse",       icon: "🔵" };
    if (pct <= IDEAL_MAX) return { text: "Ideal",        icon: "✅" };
    if (pct <= 80)        return { text: "Busy",         icon: "🟠" };
    return                       { text: "Overcrowded",  icon: "🔴" };
  }

  // ── Render the utilization panel ──────────────────────────────────────────
  function render() {
    var $body = $("#su-body");
    if ($body.length === 0) return;
    $body.empty();

    var footprintCm2 = getItemsFootprintCm2();
    var floorCm2     = getTotalFloorAreaCm2();

    if (floorCm2 === 0) {
      $body.html(
        '<p class="text-muted" style="font-size:12px; margin:0;">'+
        'Draw a floor plan first to see space utilization.</p>'
      );
      return;
    }

    var pct    = Math.min(100, Math.round((footprintCm2 / floorCm2) * 100));
    var color  = getUtilColor(pct);
    var status = getStatusLabel(pct);

    // ── Overall meter ───────────────────────────────────────────────────────
    var footprintFt2 = (footprintCm2 / (30.48 * 30.48)).toFixed(1);
    var floorFt2     = (floorCm2     / (30.48 * 30.48)).toFixed(1);

    $body.append(
      // Big percentage display
      '<div style="text-align:center; margin-bottom:12px;">'+
        '<div style="font-size:36px; font-weight:700; color:'+color+';">'+pct+'%</div>'+
        '<div style="font-size:12px; color:#888; margin-top:2px;">'+
          status.icon+' '+status.text+
        '</div>'+
      '</div>'+

      // Progress bar
      '<div style="background:#eee; border-radius:8px; height:12px; margin-bottom:8px; overflow:hidden;">'+
        '<div style="background:'+color+'; width:'+pct+'%; height:12px; border-radius:8px;'+
        'transition:width 0.6s ease; position:relative;">'+
          // Ideal range markers
          '<div style="position:absolute; left:'+IDEAL_MIN+'%; top:0; width:1px; height:100%; background:rgba(255,255,255,0.5);"></div>'+
          '<div style="position:absolute; left:'+IDEAL_MAX+'%; top:0; width:1px; height:100%; background:rgba(255,255,255,0.5);"></div>'+
        '</div>'+
      '</div>'+

      // Scale labels
      '<div style="display:flex; justify-content:space-between; font-size:10px; color:#bbb; margin-bottom:10px;">'+
        '<span>0%</span>'+
        '<span style="color:#27ae60;">Ideal (30–60%)</span>'+
        '<span>100%</span>'+
      '</div>'+

      // Stats row
      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:10px;">'+
        '<div style="background:#f8f8f8; border-radius:6px; padding:8px; text-align:center;">'+
          '<div style="font-size:14px; font-weight:700; color:#333;">'+footprintFt2+'</div>'+
          '<div style="font-size:10px; color:#888;">ft² furniture</div>'+
        '</div>'+
        '<div style="background:#f8f8f8; border-radius:6px; padding:8px; text-align:center;">'+
          '<div style="font-size:14px; font-weight:700; color:#333;">'+floorFt2+'</div>'+
          '<div style="font-size:10px; color:#888;">ft² total floor</div>'+
        '</div>'+
      '</div>'
    );

    // ── Per-room breakdown ──────────────────────────────────────────────────
    var rooms = getRoomBreakdown();
    if (rooms.length > 0) {
      $body.append(
        '<div style="font-size:11px; font-weight:600; color:#555; margin-bottom:6px;">'+
        'Room Breakdown</div>'
      );

      rooms.forEach(function (r, i) {
        var rFt2  = r.areaFt2.toFixed(1);
        var rName = "Room " + (i + 1);

        // Try to get room name from metadata
        try {
          var floorplan = blueprint3d.model.activeFloor ? blueprint3d.model.activeFloor.floorplan : blueprint3d.model.floorplan;
          if (floorplan.getRoomMeta) {
            var meta = floorplan.getRoomMeta(r.room.getUuid());
            if (meta && meta.name) rName = meta.name;
            if (meta && meta.type) rName = meta.type + (meta.name ? " ("+meta.name+")" : "");
          }
        } catch (e) {}

        $body.append(
          '<div style="display:flex; align-items:center; justify-content:space-between;'+
          'padding:5px 8px; background:#f5f5f5; border-radius:6px; margin-bottom:4px;">'+
            '<span style="font-size:11px; color:#444;">'+rName+'</span>'+
            '<span style="font-size:11px; color:#888;">'+rFt2+' ft²</span>'+
          '</div>'
        );
      });
    }

    // ── Tips based on utilization ───────────────────────────────────────────
    var tip = "";
    if (pct === 0) {
      tip = "💡 Start adding furniture to see utilization.";
    } else if (pct < IDEAL_MIN) {
      tip = "💡 Room feels sparse. Consider adding more furniture.";
    } else if (pct <= IDEAL_MAX) {
      tip = "✅ Great balance! Room has good flow and comfort.";
    } else if (pct <= 80) {
      tip = "⚠️ Getting crowded. Consider removing some items.";
    } else {
      tip = "🚨 Too crowded! Movement will be restricted.";
    }

    $body.append(
      '<div style="margin-top:8px; padding:8px; background:'+color+'15;'+
      'border-left:3px solid '+color+'; border-radius:4px; font-size:11px; color:#555; line-height:1.5;">'+
        tip+
      '</div>'
    );

    // Refresh button
    $body.append(
      '<button id="su-refresh-btn" class="btn btn-default btn-block btn-sm" style="margin-top:10px;">'+
      '🔄 Refresh</button>'
    );
  }

  // ── Inject panel into sidebar ─────────────────────────────────────────────
  function injectPanel() {
    var html =
      '<div id="space-util-panel" class="sidebar-section" style="display:none;">'+
        '<div class="panel">'+
          '<div class="panel-heading" style="display:flex; align-items:center;">'+
            '<span style="margin-right:6px;">📊</span>'+
            '<span style="flex:1; font-weight:600;">Space Utilization</span>'+
            '<span id="su-badge" style="font-size:11px; font-weight:700; padding:2px 8px;'+
            'border-radius:10px; background:#eee; color:#555;">–</span>'+
          '</div>'+
          '<div class="panel-body" style="padding:10px 12px;" id="su-body">'+
            '<p class="text-muted" style="font-size:12px; margin:0;">Loading...</p>'+
          '</div>'+
        '</div>'+
      '</div>';

    // Insert after copy-paste panel or context menu
    if ($("#copy-paste-panel").length) {
      $("#copy-paste-panel").after(html);
    } else {
      $("#context-menu").after(html);
    }
  }

  // ── Update badge in panel heading ─────────────────────────────────────────
  function updateBadge() {
    var footprintCm2 = getItemsFootprintCm2();
    var floorCm2     = getTotalFloorAreaCm2();
    if (floorCm2 === 0) {
      $("#su-badge").text("–").css({ background: "#eee", color: "#888" });
      return;
    }
    var pct   = Math.min(100, Math.round((footprintCm2 / floorCm2) * 100));
    var color = getUtilColor(pct);
    $("#su-badge").text(pct + "%").css({ background: color + "22", color: color });
  }

  // ── Show/hide based on sidebar state ─────────────────────────────────────
  function bindStateChange() {
    if (!sideMenu) return;
    sideMenu.stateChangeCallbacks.add(function (state) {
      if (state === sideMenu.states.DEFAULT) {
        $("#space-util-panel").show();
        setTimeout(function () { render(); updateBadge(); }, 200);
      } else {
        $("#space-util-panel").hide();
      }
    });
  }

  // ── Auto-update on item events ────────────────────────────────────────────
  function bindItemEvents() {
    blueprint3d.model.scene.itemLoadedCallbacks.add(function () {
      setTimeout(function () { render(); updateBadge(); }, 300);
    });
    blueprint3d.model.scene.itemRemovedCallbacks.add(function () {
      setTimeout(function () { render(); updateBadge(); }, 300);
    });
    // Update on mouse up (item moved/resized)
    $("#viewer").on("mouseup.spaceutilization", function () {
      setTimeout(function () { render(); updateBadge(); }, 400);
    });
    // Refresh button
    $(document).on("click", "#su-refresh-btn", function () {
      render();
      updateBadge();
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    injectPanel();
    bindStateChange();
    bindItemEvents();
    console.log("SpaceUtilization: initialized.");
  }

  init();
};