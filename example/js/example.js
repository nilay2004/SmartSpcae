
/*
 * Camera Buttons
 */

var CameraButtons = function(blueprint3d) {

  var orbitControls = blueprint3d.three.controls;
  var three = blueprint3d.three;

  var panSpeed = 30;
  var directions = {
    UP: 1,
    DOWN: 2,
    LEFT: 3,
    RIGHT: 4
  }

  function init() {
    // Camera controls
    $("#zoom-in").click(zoomIn);
    $("#zoom-out").click(zoomOut);  
    $("#zoom-in").dblclick(preventDefault);
    $("#zoom-out").dblclick(preventDefault);

    $("#reset-view").click(three.centerCamera)

    $("#move-left").click(function(){
      pan(directions.LEFT)
    })
    $("#move-right").click(function(){
      pan(directions.RIGHT)
    })
    $("#move-up").click(function(){
      pan(directions.UP)
    })
    $("#move-down").click(function(){
      pan(directions.DOWN)
    })

    $("#move-left").dblclick(preventDefault);
    $("#move-right").dblclick(preventDefault);
    $("#move-up").dblclick(preventDefault);
    $("#move-down").dblclick(preventDefault);
  }

  function preventDefault(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function pan(direction) {
    switch (direction) {
      case directions.UP:
        orbitControls.panXY(0, panSpeed);
        break;
      case directions.DOWN:
        orbitControls.panXY(0, -panSpeed);
        break;
      case directions.LEFT:
        orbitControls.panXY(panSpeed, 0);
        break;
      case directions.RIGHT:
        orbitControls.panXY(-panSpeed, 0);
        break;
    }
  }

  function zoomIn(e) {
    e.preventDefault();
    orbitControls.dollyIn(1.1);
    orbitControls.update();
  }

  function zoomOut(e) {
    e.preventDefault;
    orbitControls.dollyOut(1.1);
    orbitControls.update();
  }

  init();
}

/*
 * Context menu for selected item
 */ 

var ContextMenu = function(blueprint3d) {

  var scope = this;
  var selectedItem;
  var three = blueprint3d.three;

  function init() {
    $("#context-menu-delete").click(function(event) {
        selectedItem.remove();
    });

    three.itemSelectedCallbacks.add(itemSelected);
    three.itemUnselectedCallbacks.add(itemUnselected);

    initResize();

    $("#fixed").click(function() {
        var checked = $(this).prop('checked');
        selectedItem.setFixed(checked);
    });
  }

  function cmToIn(cm) {
    return cm / 2.54;
  }

  function inToCm(inches) {
    return inches * 2.54;
  }

  function itemSelected(item) {
    selectedItem = item;

    $("#context-menu-name").text(item.metadata.itemName);

    $("#item-width").val(cmToIn(selectedItem.getWidth()).toFixed(0));
    $("#item-height").val(cmToIn(selectedItem.getHeight()).toFixed(0));
    $("#item-depth").val(cmToIn(selectedItem.getDepth()).toFixed(0));

    $("#context-menu").show();

    $("#fixed").prop('checked', item.fixed);
  }

  function resize() {
    selectedItem.resize(
      inToCm($("#item-height").val()),
      inToCm($("#item-width").val()),
      inToCm($("#item-depth").val())
    );
  }

  function initResize() {
    $("#item-height").change(resize);
    $("#item-width").change(resize);
    $("#item-depth").change(resize);
  }

  function itemUnselected() {
    selectedItem = null;
    $("#context-menu").hide();
  }

  init();
}

/*
 * Loading modal for items
 */

var ModalEffects = function(blueprint3d) {

  var scope = this;
  var blueprint3d = blueprint3d;
  var itemsLoading = 0;

  this.setActiveItem = function(active) {
    itemSelected = active;
    update();
  }

  function update() {
    if (itemsLoading > 0) {
      $("#loading-modal").show();
    } else {
      $("#loading-modal").hide();
    }
  }

  function init() {
    blueprint3d.model.scene.itemLoadingCallbacks.add(function() {
      itemsLoading += 1;
      update();
    });

     blueprint3d.model.scene.itemLoadedCallbacks.add(function() {
      itemsLoading -= 1;
      update();
    });   

    update();
  }

  init();
}

/*
 * Side menu
 */

var SideMenu = function(blueprint3d, floorplanControls, modalEffects) {
  var blueprint3d = blueprint3d;
  var floorplanControls = floorplanControls;
  var modalEffects = modalEffects;

  var ACTIVE_CLASS = "active";

  var tabs = {
    "FLOORPLAN" : $("#floorplan_tab"),
    "SHOP" : $("#items_tab"),
    "DESIGN" : $("#design_tab")
  }

  var scope = this;
  this.stateChangeCallbacks = $.Callbacks();

  this.states = {
    "DEFAULT" : {
      "div" : $("#viewer"),
      "tab" : tabs.DESIGN
    },
    "FLOORPLAN" : {
      "div" : $("#floorplanner"),
      "tab" : tabs.FLOORPLAN
    },
    "SHOP" : {
      "div" : $("#add-items"),
      "tab" : tabs.SHOP
    }
  }

  // sidebar state
  var currentState = scope.states.FLOORPLAN;

  function init() {
    for (var tab in tabs) {
      var elem = tabs[tab];
      elem.click(tabClicked(elem));
    }

    $("#update-floorplan").click(floorplanUpdate);

    initLeftMenu();

    blueprint3d.three.updateWindowSize();
    handleWindowResize();

    initItems();

    setCurrentState(scope.states.DEFAULT);
  }

  function floorplanUpdate() {
    setCurrentState(scope.states.DEFAULT);
  }

  function tabClicked(tab) {
    return function() {
      // Stop three from spinning
      blueprint3d.three.stopSpin();

      // Selected a new tab
      for (var key in scope.states) {
        var state = scope.states[key];
        if (state.tab == tab) {
          setCurrentState(state);
          break;
        }
      }
    }
  }
  
  function setCurrentState(newState) {

    if (currentState == newState) {
      return;
    }

    // show the right tab as active
    if (currentState.tab !== newState.tab) {
      if (currentState.tab != null) {
        currentState.tab.removeClass(ACTIVE_CLASS);          
      }
      if (newState.tab != null) {
        newState.tab.addClass(ACTIVE_CLASS);
      }
    }

    // set item unselected
    blueprint3d.three.getController().setSelectedObject(null);

    // show and hide the right divs
    currentState.div.hide()
    newState.div.show()

    // show layouts panel only when Design (3D) tab is active
    if (newState === scope.states.DEFAULT) {
      $("#layouts-panel").show().css({ visibility: "visible", display: "block" });
      // Scroll layout panel into view within sidebar; refresh slider width
      setTimeout(function() {
        var el = document.getElementById("layouts-panel");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        if (window.layoutSlider && window.layoutSlider.refresh) window.layoutSlider.refresh();
      }, 80);
    } else {
      $("#layouts-panel").hide();
    }

    // custom actions
    if (newState == scope.states.FLOORPLAN) {
      floorplanControls.updateFloorplanView();
      floorplanControls.handleWindowResize();
    } 

    if (currentState == scope.states.FLOORPLAN) {
      blueprint3d.model.floorplan.update();
    }

    if (newState == scope.states.DEFAULT) {
      blueprint3d.three.updateWindowSize();
    }
 
    // set new state
    handleWindowResize();    
    currentState = newState;

    scope.stateChangeCallbacks.fire(newState);
  }

  function initLeftMenu() {
    $( window ).resize( handleWindowResize );
    handleWindowResize();

    // Initialize layout slider (pass setCurrentState function)
    initLayoutSlider(blueprint3d, function(state) {
      setCurrentState(state);
    }, scope.states);
  }
  
  // Expose setCurrentState for external use
  this.setCurrentState = setCurrentState;

  function handleWindowResize() {
    $(".sidebar").height(window.innerHeight);
    $("#add-items").height(window.innerHeight);

  };

  // TODO: this doesn't really belong here
  function initItems() {
    $("#add-items").find(".add-item").mousedown(function(e) {
      var modelUrl = $(this).attr("model-url");
      var itemType = parseInt($(this).attr("model-type"));
      var metadata = {
        itemName: $(this).attr("model-name"),
        resizable: true,
        modelUrl: modelUrl,
        itemType: itemType
      }

      blueprint3d.model.scene.addItem(itemType, modelUrl, metadata);
      setCurrentState(scope.states.DEFAULT);
    });
  }

  init();

}

/*
 * Change floor and wall textures
 */

var TextureSelector = function (blueprint3d, sideMenu) {

  var scope = this;
  var three = blueprint3d.three;
  var isAdmin = isAdmin;

  var currentTarget = null;

  function initTextureSelectors() {
    $(".texture-select-thumbnail").click(function(e) {
      var textureUrl = $(this).attr("texture-url");
      var textureStretch = ($(this).attr("texture-stretch") == "true");
      var textureScale = parseInt($(this).attr("texture-scale"));
      currentTarget.setTexture(textureUrl, textureStretch, textureScale);

      e.preventDefault();
    });
  }

  function init() {
    three.wallClicked.add(wallClicked);
    three.floorClicked.add(floorClicked);
    three.itemSelectedCallbacks.add(reset);
    three.nothingClicked.add(reset);
    sideMenu.stateChangeCallbacks.add(reset);
    initTextureSelectors();
  }

  function wallClicked(halfEdge) {
    currentTarget = halfEdge;
    $("#floorTexturesDiv").hide();  
    $("#wallTextures").show();  
  }

  function floorClicked(room) {
    currentTarget = room;
    $("#wallTextures").hide();  
    $("#floorTexturesDiv").show();  
  }

  function reset() {
    $("#wallTextures").hide();  
    $("#floorTexturesDiv").hide();  
  }

  init();
}

/*
 * Floorplanner controls
 */

var ViewerFloorplanner = function(blueprint3d) {

  var canvasWrapper = '#floorplanner';

  // buttons
  var move = '#move';
  var remove = '#delete';
  var draw = '#draw';

  var activeStlye = 'btn-primary disabled';

  this.floorplanner = blueprint3d.floorplanner;

  var scope = this;

  function init() {

    $( window ).resize( scope.handleWindowResize );
    scope.handleWindowResize();

    // mode buttons
    scope.floorplanner.modeResetCallbacks.add(function(mode) {
      $(draw).removeClass(activeStlye);
      $(remove).removeClass(activeStlye);
      $(move).removeClass(activeStlye);
      if (mode == BP3D.Floorplanner.floorplannerModes.MOVE) {
          $(move).addClass(activeStlye);
      } else if (mode == BP3D.Floorplanner.floorplannerModes.DRAW) {
          $(draw).addClass(activeStlye);
      } else if (mode == BP3D.Floorplanner.floorplannerModes.DELETE) {
          $(remove).addClass(activeStlye);
      }

      if (mode == BP3D.Floorplanner.floorplannerModes.DRAW) {
        $("#draw-walls-hint").show();
        scope.handleWindowResize();
      } else {
        $("#draw-walls-hint").hide();
      }
    });

    $(move).click(function(){
      scope.floorplanner.setMode(BP3D.Floorplanner.floorplannerModes.MOVE);
    });

    $(draw).click(function(){
      scope.floorplanner.setMode(BP3D.Floorplanner.floorplannerModes.DRAW);
    });

    $(remove).click(function(){
      scope.floorplanner.setMode(BP3D.Floorplanner.floorplannerModes.DELETE);
    });
  }

  this.updateFloorplanView = function() {
    scope.floorplanner.reset();
  }

  this.handleWindowResize = function() {
    $(canvasWrapper).height(window.innerHeight - $(canvasWrapper).offset().top);
    scope.floorplanner.resizeView();
  };

  init();
}; 

var mainControls = function(blueprint3d) {
  var blueprint3d = blueprint3d;

  function newDesign() {
    blueprint3d.model.loadSerialized('{"floorplan":{"corners":{"f90da5e3-9e0e-eba7-173d-eb0b071e838e":{"x":204.85099999999989,"y":289.052},"da026c08-d76a-a944-8e7b-096b752da9ed":{"x":672.2109999999999,"y":289.052},"4e3d65cb-54c0-0681-28bf-bddcc7bdb571":{"x":672.2109999999999,"y":-178.308},"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2":{"x":204.85099999999989,"y":-178.308}},"walls":[{"corner1":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","corner2":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","corner2":"da026c08-d76a-a944-8e7b-096b752da9ed","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"da026c08-d76a-a944-8e7b-096b752da9ed","corner2":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","corner2":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}}],"wallTextures":[],"floorTextures":{},"newFloorTextures":{}},"items":[]}');
  }

  function loadDesign() {
    files = $("#loadFile").get(0).files;
    var reader  = new FileReader();
    reader.onload = function(event) {
        var data = event.target.result;
        blueprint3d.model.loadSerialized(data);
    }
    reader.readAsText(files[0]);
  }

  function saveDesign() {
    var data = blueprint3d.model.exportSerialized();
    var a = window.document.createElement('a');
    var blob = new Blob([data], {type : 'text'});
    a.href = window.URL.createObjectURL(blob);
    a.download = 'design.blueprint3d';
    document.body.appendChild(a)
    a.click();
    document.body.removeChild(a)
  }

  function init() {
    $("#new").click(newDesign);
    $("#loadFile").change(loadDesign);
    $("#saveFile").click(saveDesign);
  }

  init();
}

/*
 * Layout Slider
 */

var LayoutSlider = function(blueprint3d, setStateFn, states) {
  var currentSlide = 0;
  var layouts = [
    {
      key: "1rk",
      title: "1RK",
      subtitle: "1 Room + Kitchen",
      description: "Perfect for studio apartments with an open kitchen area."
    },
    {
      key: "1bhk",
      title: "1BHK",
      subtitle: "1 Bedroom, Hall, Kitchen",
      description: "Ideal for small families with separate bedroom and living space."
    },
    {
      key: "2bhk",
      title: "2BHK",
      subtitle: "2 Bedrooms, Hall, Kitchen",
      description: "Spacious layout with two bedrooms and a common hall area."
    }
  ];

  function init() {
    var slider = $("#layout-slider");
    var dotsContainer = $(".layout-slider-dots");
    
    // Create slides
    layouts.forEach(function(layout, index) {
      // Create slide
      var slide = $('<div class="layout-slide" data-layout="' + layout.key + '" data-index="' + index + '"></div>');
      var preview = $('<div class="layout-preview"></div>');
      var canvas = $('<canvas width="200" height="150"></canvas>');
      preview.append(canvas);
      
      var title = $('<div class="layout-slide-title">' + layout.title + '</div>');
      var subtitle = $('<div class="layout-slide-subtitle">' + layout.subtitle + '</div>');
      
      slide.append(preview);
      slide.append(title);
      slide.append(subtitle);
      slider.append(slide);
      
      // Draw preview
      drawLayoutPreview(canvas[0], layout.key);
      
      // Create dot
      var dot = $('<button class="layout-slider-dot" data-index="' + index + '"></button>');
      dotsContainer.append(dot);
    });
    
    // Set first slide as active
    showSlide(0);
    
    // Navigation handlers
    $(".layout-slider-prev").on("click", function() {
      prevSlide();
    });
    
    $(".layout-slider-next").on("click", function() {
      nextSlide();
    });
    
    // Dot navigation
    $(document).on("click", ".layout-slider-dot", function() {
      var index = parseInt($(this).data("index"));
      showSlide(index);
    });
    
    // Slide click to load
    $(document).on("click", ".layout-slide", function() {
      var index = parseInt($(this).data("index"));
      showSlide(index);
    });
    
    // Load button
    $(".layout-load-btn").on("click", function() {
      loadCurrentLayout();
    });
  }
  
  function drawLayoutPreview(canvas, layoutKey) {
    var ctx = canvas.getContext("2d");
    var width = canvas.width;
    var height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, width, height);
    
    // Get layout data
    var json = window.PRESET_LAYOUTS && window.PRESET_LAYOUTS[layoutKey];
    if (!json) return;
    
    try {
      var data = JSON.parse(json);
      var corners = data.floorplan.corners;
      var walls = data.floorplan.walls;
      
      if (!corners || !walls) return;
      
      // Calculate bounds
      var minX = Infinity, maxX = -Infinity;
      var minY = Infinity, maxY = -Infinity;
      for (var id in corners) {
        var c = corners[id];
        if (c && typeof c.x === 'number' && typeof c.y === 'number') {
          minX = Math.min(minX, c.x);
          maxX = Math.max(maxX, c.x);
          minY = Math.min(minY, c.y);
          maxY = Math.max(maxY, c.y);
        }
      }
      
      if (minX === Infinity) return; // No valid corners
      
      var rangeX = maxX - minX;
      var rangeY = maxY - minY;
      if (rangeX === 0 || rangeY === 0) return;
      
      var padding = 15;
      var scale = Math.min((width - padding * 2) / rangeX, (height - padding * 2) / rangeY);
      var offsetX = (width - rangeX * scale) / 2;
      var offsetY = (height - rangeY * scale) / 2;
      
      // Draw walls
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2.5;
      walls.forEach(function(wall) {
        var c1 = corners[wall.corner1];
        var c2 = corners[wall.corner2];
        if (c1 && c2 && typeof c1.x === 'number' && typeof c2.x === 'number') {
          var x1 = offsetX + (c1.x - minX) * scale;
          var y1 = offsetY + (c1.y - minY) * scale;
          var x2 = offsetX + (c2.x - minX) * scale;
          var y2 = offsetY + (c2.y - minY) * scale;
          
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      });
      
      // Draw corners (small dots)
      ctx.fillStyle = "#428bca";
      for (var id in corners) {
        var c = corners[id];
        if (c && typeof c.x === 'number') {
          var x = offsetX + (c.x - minX) * scale;
          var y = offsetY + (c.y - minY) * scale;
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } catch (e) {
      console.error("Error drawing layout preview:", e);
    }
  }
  
  function showSlide(index) {
    if (index < 0 || index >= layouts.length) return;
    
    currentSlide = index;
    var layout = layouts[index];
    
    // Update slider position (use 200 if wrapper not yet visible)
    var slider = $("#layout-slider");
    var slideWidth = slider.parent().width() || 200;
    slider.css("transform", "translateX(-" + (index * slideWidth) + "px)");
    
    // Update active states
    $(".layout-slide").removeClass("active");
    $(".layout-slide[data-index='" + index + "']").addClass("active");
    
    $(".layout-slider-dot").removeClass("active");
    $(".layout-slider-dot[data-index='" + index + "']").addClass("active");
    
    // Update info
    $(".layout-title").text(layout.title + " - " + layout.subtitle);
    $(".layout-description").text(layout.description);
    $(".layout-load-btn").data("layout", layout.key);
  }
  
  function nextSlide() {
    var next = (currentSlide + 1) % layouts.length;
    showSlide(next);
  }
  
  function prevSlide() {
    var prev = (currentSlide - 1 + layouts.length) % layouts.length;
    showSlide(prev);
  }
  
  function loadCurrentLayout() {
    var layout = layouts[currentSlide];
    var json = window.PRESET_LAYOUTS && window.PRESET_LAYOUTS[layout.key];
    if (json) {
      blueprint3d.three.getController().setSelectedObject(null);
      blueprint3d.model.loadSerialized(json);
      // Switch to Design view if not already there
      if (setStateFn && states) {
        setStateFn(states.DEFAULT);
      }
      blueprint3d.three.centerCamera();
    }
  }
  
  init();
  
  return {
    showSlide: showSlide,
    loadCurrentLayout: loadCurrentLayout,
    refresh: function() { showSlide(currentSlide); }
  };
}

function initLayoutSlider(blueprint3d, setStateFn, states) {
  if (!$("#layouts-panel").length) return;
  if (!window.PRESET_LAYOUTS) {
    console.warn("Layouts: PRESET_LAYOUTS not loaded. Ensure layouts.js is loaded.");
    $("#layout-slider").closest(".panel-body").append(
      '<p class="text-warning small">Layout presets failed to load. Check console.</p>'
    );
    return;
  }
  try {
    window.layoutSlider = new LayoutSlider(blueprint3d, setStateFn, states);
  } catch (e) {
    console.error("Layout slider init error:", e);
  }
}

/*
 * Initialize!
 */

$(document).ready(function() {

  // main setup
  var opts = {
    floorplannerElement: 'floorplanner-canvas',
    threeElement: '#viewer',
    threeCanvasElement: 'three-canvas',
    textureDir: "models/textures/",
    widget: false
  }
  var blueprint3d = new BP3D.Blueprint3d(opts);

  var modalEffects = new ModalEffects(blueprint3d);
  var viewerFloorplanner = new ViewerFloorplanner(blueprint3d);
  var contextMenu = new ContextMenu(blueprint3d);
  var sideMenu = new SideMenu(blueprint3d, viewerFloorplanner, modalEffects);
  var textureSelector = new TextureSelector(blueprint3d, sideMenu);        
  var cameraButtons = new CameraButtons(blueprint3d);
  mainControls(blueprint3d);
  

  // This serialization format needs work
  // Load a simple rectangle room
  blueprint3d.model.loadSerialized('{"floorplan":{"corners":{"f90da5e3-9e0e-eba7-173d-eb0b071e838e":{"x":204.85099999999989,"y":289.052},"da026c08-d76a-a944-8e7b-096b752da9ed":{"x":672.2109999999999,"y":289.052},"4e3d65cb-54c0-0681-28bf-bddcc7bdb571":{"x":672.2109999999999,"y":-178.308},"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2":{"x":204.85099999999989,"y":-178.308}},"walls":[{"corner1":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","corner2":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","corner2":"da026c08-d76a-a944-8e7b-096b752da9ed","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"da026c08-d76a-a944-8e7b-096b752da9ed","corner2":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","corner2":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}}],"wallTextures":[],"floorTextures":{},"newFloorTextures":{}},"items":[]}');
});
