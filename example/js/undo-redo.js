// ─────────────────────────────────────────────────────────────────────────────
// UNDO / REDO SYSTEM
// Uses model.exportSerialized() / loadSerialized() as state snapshots
// Keyboard: Ctrl+Z = undo, Ctrl+Y / Ctrl+Shift+Z = redo
// ─────────────────────────────────────────────────────────────────────────────

var UndoRedo = function (blueprint3d, sideMenu) {

  var MAX_HISTORY = 30;       // max states to keep in memory
  var history = [];           // array of serialized JSON strings
  var currentIndex = -1;      // current position in history
  var isRestoring = false;    // flag to prevent recording during restore
  var saveTimeout = null;     // debounce timer

  // ── Save current state to undo stack ─────────────────────────────────────
  function saveState() {
    if (isRestoring) return;
    
    try {
      var state = blueprint3d.model.exportSerialized();
      
      // Don't save if state hasn't changed from the current state
      if (currentIndex >= 0 && history[currentIndex] === state) return;
      
      // If we made a change while not at the end of history (i.e. after an undo),
      // discard all forward history.
      if (currentIndex < history.length - 1) {
        history = history.slice(0, currentIndex + 1);
      }
      
      history.push(state);
      
      if (history.length > MAX_HISTORY) {
        history.shift(); // remove oldest
      } else {
        currentIndex++;
      }
      
      updateButtons();
    } catch (e) {
      console.warn("UndoRedo: failed to save state", e);
    }
  }

  // Debounced saveState for rapid events
  function requestSaveState() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveState, 250);
  }

  // ── Undo ──────────────────────────────────────────────────────────────────
  function undo() {
    if (currentIndex <= 0) return;
    
    // Check if current scene matches the current history state.
    // If we made unsaved changes, we might want to save them first, 
    // but typically user expects to go back to previous saved state.
    
    try {
      currentIndex--;
      var prevState = history[currentIndex];
      restoreState(prevState);
      showToast("↩ Undone");
    } catch (e) {
      console.warn("UndoRedo: undo failed", e);
      currentIndex++; // revert index on failure
    }
  }

  // ── Redo ──────────────────────────────────────────────────────────────────
  function redo() {
    if (currentIndex >= history.length - 1) return;
    
    try {
      currentIndex++;
      var nextState = history[currentIndex];
      restoreState(nextState);
      showToast("↪ Redone");
    } catch (e) {
      console.warn("UndoRedo: redo failed", e);
      currentIndex--; // revert index on failure
    }
  }

  // ── Restore a serialized state ────────────────────────────────────────────
  function restoreState(stateJson) {
    isRestoring = true;
    try {
      // Deselect any selected item first
      if (blueprint3d.three && blueprint3d.three.getController()) {
        blueprint3d.three.getController().setSelectedObject(null);
      }
      blueprint3d.model.loadSerialized(stateJson);

      // Refresh UI panels
      if (window.floorsPanel && typeof window.floorsPanel.updateFloorsList === "function") {
        window.floorsPanel.updateFloorsList();
      }
      if (blueprint3d.three) {
        blueprint3d.three.setNeedsUpdate();
      }
      updateButtons();
    } catch (e) {
      console.warn("UndoRedo: restore failed", e);
    } finally {
      // Allow a short delay for items to load before enabling saveState again
      setTimeout(function() {
        isRestoring = false;
      }, 500);
    }
  }

  // ── Update button states ──────────────────────────────────────────────────
  function updateButtons() {
    var $undoBtn = $("#undo-btn");
    var $redoBtn = $("#redo-btn");
    $undoBtn.prop("disabled", currentIndex <= 0);
    $redoBtn.prop("disabled", currentIndex >= history.length - 1);
    
    var undoCount = currentIndex;
    var redoCount = history.length - 1 - currentIndex;
    
    $undoBtn.attr("title", "Undo (" + Math.max(0, undoCount) + " steps) Ctrl+Z");
    $redoBtn.attr("title", "Redo (" + Math.max(0, redoCount) + " steps) Ctrl+Y");
  }

  // ── Toast notification ────────────────────────────────────────────────────
  function showToast(msg) {
    var $t = $("#ur-toast");
    if ($t.length === 0) {
      $t = $('<div id="ur-toast" style="'+
        'position:fixed; bottom:80px; left:50%; transform:translateX(-50%);'+
        'background:rgba(0,0,0,0.75); color:#fff; padding:8px 18px;'+
        'border-radius:20px; font-size:13px; z-index:9999;'+
        'pointer-events:none; transition:opacity 0.3s;"></div>');
      $("body").append($t);
    }
    $t.text(msg).css("opacity", 1);
    clearTimeout($t.data("timer"));
    $t.data("timer", setTimeout(function () {
      $t.css("opacity", 0);
    }, 1500));
  }

  // ── Inject undo/redo buttons into top bar ─────────────────────────────────
  function injectButtons() {
    // Check if they already exist
    if ($("#undo-btn").length > 0) return;
    
    var btnHtml =
      '<div class="btn-group" style="margin-left:6px;" id="undo-redo-btns">'+
        '<button id="undo-btn" class="btn btn-default btn-sm" disabled title="Undo Ctrl+Z">'+
          '<span class="glyphicon glyphicon-arrow-left"></span>'+
        '</button>'+
        '<button id="redo-btn" class="btn btn-default btn-sm" disabled title="Redo Ctrl+Y">'+
          '<span class="glyphicon glyphicon-arrow-right"></span>'+
        '</button>'+
      '</div>';

    // Insert after the existing top-bar action buttons
    $(".top-bar-actions").append(btnHtml);

    $("#undo-btn").on("click", function (e) {
      e.preventDefault();
      undo();
    });
    $("#redo-btn").on("click", function (e) {
      e.preventDefault();
      redo();
    });
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  function bindKeyboard() {
    $(document).off("keydown.undoredo").on("keydown.undoredo", function (e) {
      // Ignore if typing in an input
      if ($(e.target).is("input, textarea, select")) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" || e.key === "Z") {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        }
        if (e.key === "y" || e.key === "Y") {
          e.preventDefault();
          redo();
        }
      }
    });
  }

  // ── Hook into scene events ────────────────────────────────────────────────
  function bindSceneEvents() {
    // Save state when item is loaded (added)
    blueprint3d.model.scene.itemLoadedCallbacks.add(requestSaveState);

    // Save state when item is removed
    blueprint3d.model.scene.itemRemovedCallbacks.add(requestSaveState);

    // Save state when item is moved/resized (controller mouseup)
    $("#viewer").off("mouseup.undoredo").on("mouseup.undoredo", requestSaveState);
    
    // Save state when floorplan is modified (rooms updated)
    blueprint3d.model.floorplan.fireOnUpdatedRooms(requestSaveState);
  }

  // ── Expose API ────────────────────────────────────────────────────────────
  this.saveState  = requestSaveState;
  this.undo       = undo;
  this.redo       = redo;

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    injectButtons();
    bindKeyboard();
    bindSceneEvents();
    // Save initial state
    setTimeout(requestSaveState, 500);
    console.log("UndoRedo: initialized. Max history:", MAX_HISTORY);
  }

  init();
};