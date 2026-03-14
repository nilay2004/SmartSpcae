
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

  function newPlan() {
    blueprint3d.model.scene.clearItems();
    blueprint3d.model.floorplan.reset();
    setTimeout(function() {
      blueprint3d.model.loadSerialized(window.CUSTOM_LAYOUT);
    }, 100);
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
    for (var tab in tabs) {
      var elem = tabs[tab];
      elem.click(tabClicked(elem));
    }

    $("#update-floorplan").click(floorplanUpdate);
    $("#new").click(newPlan);
    $("#loadFile").change(loadDesign);
    $("#saveFile").click(saveDesign);

    initLeftMenu();

    blueprint3d.three.updateWindowSize();
    handleWindowResize();

    initItems();

    blueprint3d.model.loadSerialized(window.CUSTOM_LAYOUT);
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

    if (newState == scope.states.SHOP) {
      initItems();
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
    $("#add-items").find(".add-item").unbind('mousedown').mousedown(function(e) {
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

  if (window.initBlueprintAR) {
    window.initBlueprintAR(blueprint3d);
  }

  try {
    var presetLayout = '{"floorplan":{"corners":{"c1":{"x":308.8640000000001,"y":0},"c2":{"x":1231.7119999999993,"y":0},"c3":{"x":1231.7119999999993,"y":724},"c4":{"x":308.8640000000001,"y":724},"dba26377-1998-4f5d-970a-f2827d60e390":{"x":1231.7119999999993,"y":161.17067700195304},"eb6606b7-59c3-4589-e332-96287a45e0bc":{"x":825.1519999999997,"y":161.17067700195304},"2292688f-2592-4f38-6e66-89d89bd666f8":{"x":825.1519999999997,"y":0},"1fb0c64c-08a2-77b2-777f-8c7263553194":{"x":825.1519999999997,"y":161.17067700195304},"b115c1c3-6cfb-9723-086f-d22c439443b0":{"x":825.1519999999997,"y":724}},"walls":[{"corner1":"c1","corner2":"2292688f-2592-4f38-6e66-89d89bd666f8","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"c2","corner2":"dba26377-1998-4f5d-970a-f2827d60e390","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"c3","corner2":"b115c1c3-6cfb-9723-086f-d22c439443b0","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"c4","corner2":"c1","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"dba26377-1998-4f5d-970a-f2827d60e390","corner2":"c3","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"dba26377-1998-4f5d-970a-f2827d60e390","corner2":"1fb0c64c-08a2-77b2-777f-8c7263553194","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"1fb0c64c-08a2-77b2-777f-8c7263553194","corner2":"2292688f-2592-4f38-6e66-89d89bd666f8","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"2292688f-2592-4f38-6e66-89d89bd666f8","corner2":"c2","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"1fb0c64c-08a2-77b2-777f-8c7263553194","corner2":"b115c1c3-6cfb-9723-086f-d22c439443b0","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"b115c1c3-6cfb-9723-086f-d22c439443b0","corner2":"c4","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}}],"wallTextures":[],"floorTextures":{},"newFloorTextures":{}},"items":[{"item_name":"World Class Toilet Seat","item_type":1,"model_url":"models/js/toilet-seat.json","xpos":1205.794934474077,"ypos":36,"zpos":56.8006559327377,"rotation":-1.5707963267948966,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":false},{"item_name":"Dresser - White","item_type":1,"model_url":"models/js/we-narrow6white_baked.js","xpos":1200.180072030805,"ypos":35.56,"zpos":454.49185921021154,"rotation":-1.5707963267948966,"scale_x":2.733333333333337,"scale_y":0.9985398840390354,"scale_z":0.9829797444252664,"fixed":false},{"item_name":"Open Door","item_type":7,"model_url":"models/js/open_door.js","xpos":911.299037382791,"ypos":110.800000297771,"zpos":161.67066955566406,"rotation":0,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":false},{"item_name":"Open Door","item_type":7,"model_url":"models/js/open_door.js","xpos":824.6519775390625,"ypos":110.800000297771,"zpos":261.3297291348599,"rotation":-1.5707963267948966,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":false},{"item_name":"Dresser - White","item_type":1,"model_url":"models/js/we-narrow6white_baked.js","xpos":1027.066201986063,"ypos":35.56,"zpos":685.711534802538,"rotation":3.141592653589793,"scale_x":1.866666666666668,"scale_y":0.9985398840390354,"scale_z":0.9829797444252664,"fixed":false},{"item_name":"Full Bed","item_type":1,"model_url":"models/js/ik_nordli_full.js","xpos":683.5751405552651,"ypos":49.53,"zpos":592.9368202227345,"rotation":-1.5707963267948966,"scale_x":1.288142857142857,"scale_y":0.9906,"scale_z":1.0033010033010032,"fixed":false},{"item_name":"Dining Table","item_type":1,"model_url":"models/js/cb-scholartable_baked.js","xpos":398.50064546714765,"ypos":38.078950895925004,"zpos":597.8339958356213,"rotation":0,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":false},{"item_name":"Chair","item_type":1,"model_url":"models/js/gus-churchchair-whiteoak.js","xpos":399.13499833720766,"ypos":39.47743068655714,"zpos":666.1723386115017,"rotation":3.141592653589793,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":false},{"item_name":"Chair","item_type":1,"model_url":"models/js/gus-churchchair-whiteoak.js","xpos":386.17890956535484,"ypos":39.47743068655714,"zpos":513.6034737211673,"rotation":0,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":false},{"item_name":"Wardrobe - White","item_type":1,"model_url":"models/js/ik-kivine_baked.js","xpos":790.413489606724,"ypos":94.999999385175,"zpos":426.0458296139562,"rotation":-1.5707963267948966,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":false},{"item_name":"Sectional - Olive","item_type":1,"model_url":"models/js/we-crosby2piece-greenbaked.json","xpos":590.1683201781508,"ypos":45.72,"zpos":311.1342757475881,"rotation":3.141592653589793,"scale_x":1.0628423615337796,"scale_y":1.0076133080433942,"scale_z":0.9948936625795949,"fixed":false},{"item_name":"Closed Door","item_type":7,"model_url":"models/js/closed-door28x80_baked.js","xpos":406.5222549799156,"ypos":110.80000022010701,"zpos":0.5,"rotation":0,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":false},{"item_name":"Media Console - White","item_type":1,"model_url":"models/js/cb-clapboard_baked.js","xpos":633.6269631607563,"ypos":67.88999754395999,"zpos":34.37400867978181,"rotation":0,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":false},{"item_name":"Ganesha Poster","item_type":2,"model_url":"models/js/ganesha-poster.json","xpos":508.9844266502455,"ypos":182.18482967976246,"zpos":6.253750317500636,"rotation":0,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":false},{"item_name":"Bookshelf","item_type":1,"model_url":"models/js/cb-kendallbookcasewalnut_baked.js","xpos":769.6929618879914,"ypos":92.17650034119151,"zpos":27.90474363290329,"rotation":0,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":false}]}';
    blueprint3d.model.loadSerialized(presetLayout);
    blueprint3d.three.centerCamera();
  } catch (e) {
    console.warn("Failed to load default preset:", e);
  }
});
