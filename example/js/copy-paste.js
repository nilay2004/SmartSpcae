// ─────────────────────────────────────────────────────────────────────────────
// MULTI-ROOM COPY / PASTE
// Copy all items from current floor, paste to any floor with smart offset
// Also supports copying a single selected item
// Keyboard: Ctrl+C = copy selected, Ctrl+V = paste, Ctrl+A = select all
// ─────────────────────────────────────────────────────────────────────────────

var CopyPaste = function (blueprint3d, sideMenu) {

  var clipboard   = [];     // array of serialized item data
  var copyMode    = "room"; // "room" or "item"
  var selItem     = null;   // currently selected item

  // ── Serialize one item to a plain object ─────────────────────────────────
  function serializeItem(item) {
    try {
      return {
        item_name:  item.metadata.itemName,
        item_type:  item.metadata.itemType,
        model_url:  item.metadata.modelUrl,
        resizable:  item.metadata.resizable || true,
        xpos:       item.position.x,
        ypos:       item.position.y,
        zpos:       item.position.z,
        rotation:   item.rotation.y,
        scale_x:    item.scale.x,
        scale_y:    item.scale.y,
        scale_z:    item.scale.z,
        fixed:      item.fixed || false
      };
    } catch (e) {
      console.warn("CopyPaste: failed to serialize item", e);
      return null;
    }
  }

  // ── Copy all items from active floor ─────────────────────────────────────
  function copyRoom() {
    var floorItems = blueprint3d.model.activeFloor.getItems
      ? blueprint3d.model.activeFloor.getItems()
      : [];

    if (floorItems.length === 0) {
      // Fallback: get all scene items
      floorItems = blueprint3d.model.scene.getItems();
    }

    clipboard = [];
    floorItems.forEach(function (item) {
      var data = serializeItem(item);
      if (data) clipboard.push(data);
    });

    copyMode = "room";
    showToast("📋 Copied " + clipboard.length + " item(s) from room");
    updateButtons();
  }

  // ── Copy single selected item ─────────────────────────────────────────────
  function copyItem() {
    if (!selItem) {
      showToast("⚠️ Select an item first");
      return;
    }
    var data = serializeItem(selItem);
    if (!data) return;
    clipboard = [data];
    copyMode  = "item";
    showToast("📋 Copied: " + data.item_name);
    updateButtons();
  }

  // ── Paste items to active floor ───────────────────────────────────────────
  function paste() {
    if (clipboard.length === 0) {
      showToast("⚠️ Nothing to paste");
      return;
    }

    // Calculate center of clipboard items
    var cx = 0, cz = 0;
    clipboard.forEach(function (d) { cx += d.xpos; cz += d.zpos; });
    cx /= clipboard.length;
    cz /= clipboard.length;

    // Calculate target floor center
    var targetCenter = { x: cx, z: cz };
    try {
      var fp     = blueprint3d.model.activeFloor.floorplan;
      var center = fp.getCenter ? fp.getCenter() : null;
      if (center) {
        targetCenter = { x: center.x, z: center.z };
      }
    } catch (e) {}

    // Offset so items land at target center
    var offsetX = targetCenter.x - cx;
    var offsetZ = targetCenter.z - cz;

    // If copying single item, add small random offset to avoid stacking
    if (copyMode === "item") {
      offsetX += (Math.random() - 0.5) * 40;
      offsetZ += (Math.random() - 0.5) * 40;
    }

    var pasted = 0;
    clipboard.forEach(function (data) {
      try {
        var pos = new THREE.Vector3(
          data.xpos + offsetX,
          data.ypos,
          data.zpos + offsetZ
        );
        var scale = new THREE.Vector3(
          data.scale_x || 1,
          data.scale_y || 1,
          data.scale_z || 1
        );
        var metadata = {
          itemName:  data.item_name,
          itemType:  data.item_type,
          modelUrl:  data.model_url,
          resizable: data.resizable
        };

        blueprint3d.model.scene.addItem(
          data.item_type,
          data.model_url,
          metadata,
          pos,
          data.rotation,
          scale,
          data.fixed,
          blueprint3d.model.activeFloor
        );
        pasted++;
      } catch (e) {
        console.warn("CopyPaste: failed to paste item", data.item_name, e);
      }
    });

    showToast("📌 Pasted " + pasted + " item(s)");

    // Switch to design view
    if (sideMenu && sideMenu.setCurrentState && sideMenu.states) {
      sideMenu.setCurrentState(sideMenu.states.DEFAULT);
    }
  }

  // ── Clear clipboard ───────────────────────────────────────────────────────
  function clearClipboard() {
    clipboard = [];
    updateButtons();
    showToast("🗑️ Clipboard cleared");
  }

  // ── Show copy paste panel in sidebar ─────────────────────────────────────
  function injectPanel() {
    var html =
      '<div id="copy-paste-panel" class="sidebar-section" style="display:none;">'+
        '<div class="panel">'+
          '<div class="panel-heading">'+
            '<span style="margin-right:6px;">📋</span>'+
            '<span style="font-weight:600;">Copy / Paste</span>'+
          '</div>'+
          '<div class="panel-body" style="padding:10px 12px;">'+

            '<p class="text-muted" style="font-size:11px; margin:0 0 10px; line-height:1.5;">'+
              'Copy furniture from one room and paste it into any floor.'+
            '</p>'+

            // Copy room button
            '<button id="cp-copy-room-btn" class="btn btn-default btn-block btn-sm" '+
            'style="margin-bottom:6px; text-align:left;">'+
              '<span class="glyphicon glyphicon-copy" style="margin-right:6px;"></span>'+
              'Copy All Room Items'+
            '</button>'+

            // Copy item button
            '<button id="cp-copy-item-btn" class="btn btn-default btn-block btn-sm" '+
            'style="margin-bottom:6px; text-align:left;">'+
              '<span class="glyphicon glyphicon-screenshot" style="margin-right:6px;"></span>'+
              'Copy Selected Item'+
            '</button>'+

            // Paste button
            '<button id="cp-paste-btn" class="btn btn-primary btn-block btn-sm" '+
            'style="margin-bottom:6px; text-align:left;" disabled>'+
              '<span class="glyphicon glyphicon-paste" style="margin-right:6px;"></span>'+
              'Paste to Current Room'+
            '</button>'+

            // Clipboard status
            '<div id="cp-status" style="font-size:11px; color:#888; margin-top:6px; '+
            'padding:6px 8px; background:#f5f5f5; border-radius:6px; min-height:30px;">'+
              'Clipboard is empty.'+
            '</div>'+

            // Clear button
            '<button id="cp-clear-btn" class="btn btn-default btn-block btn-sm" '+
            'style="margin-top:6px; display:none;">'+
              '<span class="glyphicon glyphicon-trash" style="margin-right:6px;"></span>'+
              'Clear Clipboard'+
            '</button>'+

            // Floor target selector
            '<div style="margin-top:10px;">'+
              '<div style="font-size:11px; font-weight:600; color:#555; margin-bottom:4px;">'+
                'Paste Target Floor:'+
              '</div>'+
              '<select id="cp-floor-select" class="form-control input-sm"></select>'+
            '</div>'+

            '<div class="text-muted" style="font-size:10px; margin-top:8px; line-height:1.5;">'+
              '💡 Tip: Use <kbd>Ctrl+C</kbd> to copy selected item, <kbd>Ctrl+V</kbd> to paste.'+
            '</div>'+

          '</div>'+
        '</div>'+
      '</div>';

    // Insert after context menu
    $("#style-detector-panel").length
      ? $("#style-detector-panel").after(html)
      : $("#context-menu").after(html);

    // Show panel when Design tab is active
    if (sideMenu) {
      sideMenu.stateChangeCallbacks.add(function (state) {
        if (state === sideMenu.states.DEFAULT) {
          $("#copy-paste-panel").show();
          setTimeout(refreshFloorSelect, 100);
        } else {
          $("#copy-paste-panel").hide();
        }
      });
    }

    bindPanelEvents();
  }

  // ── Refresh floor dropdown ────────────────────────────────────────────────
  function refreshFloorSelect() {
  var $sel = $("#cp-floor-select");
  $sel.empty();
  // Guard — floors may not exist yet
  if (!blueprint3d.model || !blueprint3d.model.floors) return;
  blueprint3d.model.floors.forEach(function (floor, i) {
    var isActive = floor === blueprint3d.model.activeFloor;
    $sel.append(
      $("<option>")
        .val(i)
        .text(floor.name + (isActive ? " (current)" : ""))
        .prop("selected", isActive)
    );
  });
}

  // ── Update button and status states ──────────────────────────────────────
  function updateButtons() {
    var hasClip = clipboard.length > 0;
    $("#cp-paste-btn").prop("disabled", !hasClip);
    $("#cp-clear-btn").toggle(hasClip);

    if (hasClip) {
      var icon = copyMode === "room" ? "🏠" : "🪑";
      $("#cp-status").html(
        icon + ' <strong>' + clipboard.length + ' item(s)</strong> in clipboard'+
        ' <span style="color:#aaa;">('+copyMode+' copy)</span>'
      );
    } else {
      $("#cp-status").text("Clipboard is empty.");
    }
  }

  // ── Bind panel button events ──────────────────────────────────────────────
  function bindPanelEvents() {
    $("#cp-copy-room-btn").on("click", function () {
      copyRoom();
      refreshFloorSelect();
    });

    $("#cp-copy-item-btn").on("click", function () {
      copyItem();
    });

    $("#cp-paste-btn").on("click", function () {
      // Switch to floor selected in dropdown before pasting
      var floorIdx = parseInt($("#cp-floor-select").val());
      if (!isNaN(floorIdx) && blueprint3d.model.floors[floorIdx]) {
        blueprint3d.model.setActiveFloor(blueprint3d.model.floors[floorIdx]);
      }
      paste();
      refreshFloorSelect();
    });

    $("#cp-clear-btn").on("click", clearClipboard);
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  function bindKeyboard() {
    $(document).on("keydown", function (e) {
      if ($(e.target).is("input, textarea, select")) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "c" || e.key === "C") {
          if (selItem) {
            e.preventDefault();
            copyItem();
          }
        }
        if (e.key === "v" || e.key === "V") {
          e.preventDefault();
          paste();
        }
        if (e.key === "a" || e.key === "A") {
          // Ctrl+A = copy whole room
          e.preventDefault();
          copyRoom();
        }
      }
    });
  }

  // ── Track selected item ───────────────────────────────────────────────────
  function bindItemEvents() {
    blueprint3d.three.itemSelectedCallbacks.add(function (item) {
      selItem = item;
      // Update copy-item button to show item name
      $("#cp-copy-item-btn").html(
        '<span class="glyphicon glyphicon-screenshot" style="margin-right:6px;"></span>'+
        'Copy: ' + (item.metadata.itemName || "Item")
      );
    });
    blueprint3d.three.itemUnselectedCallbacks.add(function () {
      selItem = null;
      $("#cp-copy-item-btn").html(
        '<span class="glyphicon glyphicon-screenshot" style="margin-right:6px;"></span>'+
        'Copy Selected Item'
      );
    });
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  function showToast(msg) {
    var $t = $("#cp-toast");
    if ($t.length === 0) {
      $t = $('<div id="cp-toast" style="'+
        'position:fixed; bottom:50px; left:50%; transform:translateX(-50%);'+
        'background:rgba(0,0,0,0.75); color:#fff; padding:8px 18px;'+
        'border-radius:20px; font-size:13px; z-index:9999;'+
        'pointer-events:none; transition:opacity 0.3s;"></div>');
      $("body").append($t);
    }
    $t.text(msg).css("opacity", 1);
    clearTimeout($t.data("timer"));
    $t.data("timer", setTimeout(function () { $t.css("opacity", 0); }, 2000));
  }

  // ── Expose public API ─────────────────────────────────────────────────────
  this.copyRoom  = copyRoom;
  this.copyItem  = copyItem;
  this.paste     = paste;
  this.getClipboard = function () { return clipboard; };

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    injectPanel();
    bindKeyboard();
    bindItemEvents();
    updateButtons();
    console.log("CopyPaste: initialized.");
  }

  init();
};