/**
 * AIPlanner.js
 * World-Class Layout Heuristics and Auto-Furnish Engine for Blueprint3D
 */
(function() {
  'use strict';

  function AIPlanner(blueprint3d) {
    this.blueprint3d = blueprint3d;
    this.model = blueprint3d.model;
    
    // Preset Furniture Sets
    this.presets = {
      'living_room': [
        { name: "Sofa - Grey", url: "models/js/cb-rochelle-gray_baked.js", type: 1, importance: 10, align: 'wall' },
        { name: "Coffee Table - Wood", url: "models/js/ik-stockholmcoffee-brown.js", type: 1, importance: 8, align: 'center_front', relativeTo: "Sofa - Grey" },
        { name: "Media Console - White", url: "models/js/cb-clapboard_baked.js", type: 1, importance: 9, align: 'wall_opposite', relativeTo: "Sofa - Grey" },
        { name: "Floor Lamp", url: "models/js/ore-3legged-white_baked.js", type: 1, importance: 5, align: 'corner' }
      ],
      'bedroom': [
        { name: "Full Bed", url: "models/js/ik_nordli_full.js", type: 1, importance: 10, align: 'wall_center' },
        { name: "Bedside table - White", url: "models/js/cb-archnight-white_baked.js", type: 1, importance: 8, align: 'side', relativeTo: "Full Bed" },
        { name: "Wardrobe - White", url: "models/js/ik-kivine_baked.js", type: 1, importance: 9, align: 'wall' },
        { name: "Mirror", url: "models/js/mirror.json", type: 2, importance: 4, align: 'wall' }
      ],
      'dining_room': [
        { name: "Dining Table", url: "models/js/cb-scholartable_baked.js", type: 1, importance: 10, align: 'room_center' },
        { name: "Chair", url: "models/js/gus-churchchair-whiteoak.js", type: 1, importance: 8, count: 4, align: 'around', relativeTo: "Dining Table" }
      ]
    };

    // Approximate catalog prices (INR) for budget estimation and optimization.
    this.priceCatalog = {
      "Sofa - Grey": 75000,
      "Coffee Table - Wood": 20000,
      "Media Console - White": 33000,
      "Floor Lamp": 10000,
      "Full Bed": 83000,
      "Bedside table - White": 15000,
      "Wardrobe - White": 62000,
      "Mirror": 8000,
      "Dining Table": 58000,
      "Chair": 12000
    };

    this.exchangeRates = {
      USD_TO_INR: 1,
      INR_TO_USD: 1
    };
  }

  AIPlanner.prototype.cmToFt = function(cm) {
    return cm / 30.48;
  };

  AIPlanner.prototype.getPlanY = function(point) {
    if (!point) return 0;
    if (typeof point.z === "number" && isFinite(point.z)) return point.z;
    if (typeof point.y === "number" && isFinite(point.y)) return point.y;
    return 0;
  };

  AIPlanner.prototype.normalizePolygon = function(corners) {
    var poly = [];
    for (var i = 0; i < (corners || []).length; i++) {
      poly.push({ x: corners[i].x, y: this.getPlanY(corners[i]) });
    }
    return poly;
  };

  AIPlanner.prototype.pointInRoom = function(x, z, corners) {
    return BP3D.Core.Utils.pointInPolygon(x, z, this.normalizePolygon(corners || []));
  };

  AIPlanner.prototype.cm2ToFt2 = function(cm2) {
    return cm2 / (30.48 * 30.48);
  };

  AIPlanner.prototype.computeRoomMetrics = function(room) {
    var corners = room.interiorCorners || [];
    var minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    var i;
    for (i = 0; i < corners.length; i++) {
      minX = Math.min(minX, corners[i].x);
      maxX = Math.max(maxX, corners[i].x);
      var planY = this.getPlanY(corners[i]);
      minZ = Math.min(minZ, planY);
      maxZ = Math.max(maxZ, planY);
    }
    var widthCm = Math.max(0, maxX - minX);
    var depthCm = Math.max(0, maxZ - minZ);
    var areaCm2 = room.getAreaCm2 ? room.getAreaCm2() : (widthCm * depthCm);
    return {
      minX: minX,
      maxX: maxX,
      minZ: minZ,
      maxZ: maxZ,
      widthCm: widthCm,
      depthCm: depthCm,
      areaCm2: areaCm2,
      widthFt: this.cmToFt(widthCm),
      depthFt: this.cmToFt(depthCm),
      areaFt2: this.cm2ToFt2(areaCm2)
    };
  };

  AIPlanner.prototype.getSizeProfile = function(metrics) {
    if (metrics.areaFt2 < 90) {
      return { key: "compact", wallOffset: 30, centerOffset: 90, seatRadius: 55, chairCount: 2 };
    }
    if (metrics.areaFt2 < 180) {
      return { key: "standard", wallOffset: 45, centerOffset: 125, seatRadius: 75, chairCount: 4 };
    }
    return { key: "spacious", wallOffset: 60, centerOffset: 150, seatRadius: 95, chairCount: 6 };
  };

  AIPlanner.prototype.buildLayoutSuggestion = function(roomType, metrics, profile, itemsDef) {
    var title = roomType.replace("_", " ");
    var names = [];
    var i;
    for (i = 0; i < itemsDef.length; i++) {
      names.push(itemsDef[i].name + (itemsDef[i].count ? " x" + itemsDef[i].count : ""));
    }
    return {
      title: title,
      summary:
        "AI suggestion for " + title + " (" +
        metrics.widthFt.toFixed(1) + "ft x " + metrics.depthFt.toFixed(1) + "ft, " +
        metrics.areaFt2.toFixed(1) + "ft²)\n" +
        "Profile: " + profile.key + "\n" +
        "Suggested furniture: " + names.join(", ")
    };
  };

  AIPlanner.prototype.getFurniturePrice = function(def) {
    var byName = this.priceCatalog[def.name];
    if (typeof byName === "number" && byName > 0) return byName;
    // fallback by type if no explicit mapping exists
    if (def.type === 2) return 12000; // wall decor
    if (def.type === 7) return 22000; // doors
    return 30000; // generic furniture fallback
  };

  AIPlanner.prototype.estimateCatalogPrice = function(item) {
    if (this.priceCatalog[item.name]) return this.priceCatalog[item.name];
    var byCategory = {
      "Seating": 35000,
      "Bedroom": 43000,
      "Tables": 30000,
      "Storage": 34000,
      "Lighting": 12000,
      "Decor": 7500,
      "Bathroom": 15000,
      "Doors & Windows": 20000,
      "Rugs": 13000,
      "People": 6500,
      "Architecture": 58000
    };
    var base = byCategory[item.category] || 25000;
    var hash = 0;
    for (var i = 0; i < item.name.length; i++) {
      hash = (hash + item.name.charCodeAt(i) * (i + 3)) % 1000;
    }
    return Math.max(40, Math.round(base * (0.8 + (hash % 40) / 100)));
  };

  AIPlanner.prototype.normalizeBudgetToUsd = function(amount, currency) {
    var c = (currency || "INR").toUpperCase();
    if (c === "INR") {
      return amount * this.exchangeRates.INR_TO_USD;
    }
    return amount;
  };

  AIPlanner.prototype.formatMoney = function(amount, currency) {
    return Math.round(amount).toLocaleString("en-IN") + " " + currency;
  };

  AIPlanner.prototype.getCatalogItemsFromUI = function() {
    var items = [];
    var allowedCategories = {
      "Seating": true,
      "Bedroom": true,
      "Tables": true,
      "Storage": true,
      "Lighting": true,
      "Decor": true,
      "Rugs": true,
      "Bathroom": true
    };
    $("#items-wrapper .catalog-item").each(function() {
      var $item = $(this);
      var name = $item.attr("model-name");
      var url = $item.attr("model-url");
      var typeRaw = $item.attr("model-type");
      var typeNum = parseInt(typeRaw, 10);
      var category = $item.closest(".catalog-section").attr("data-category") || "Other";
      if (!name || !url || !isFinite(typeNum)) return;
      if (typeRaw === "texture-floor" || typeRaw === "texture-wall") return;
      if (!allowedCategories[category]) return;
      if (String(url).toLowerCase() === "null" || String(url).toLowerCase() === "undefined") return;
      if (!/\.js(on)?$/i.test(String(url))) return;
      items.push({
        name: name,
        url: url,
        type: typeNum,
        category: category
      });
    });
    return items;
  };

  AIPlanner.prototype.getCategoryPriority = function(roomType) {
    var profiles = {
      living_room: { Seating: 10, Tables: 8, Storage: 6, Lighting: 5, Decor: 4, Bedroom: 2 },
      bedroom: { Bedroom: 10, Storage: 8, Lighting: 5, Decor: 5, Seating: 4, Tables: 4 },
      dining_room: { Tables: 10, Seating: 9, Lighting: 6, Decor: 4, Storage: 3 }
    };
    return profiles[roomType] || { Seating: 7, Tables: 7, Storage: 6, Lighting: 5, Decor: 4, Bedroom: 6 };
  };

  AIPlanner.prototype.selectCatalogItemsWithinBudget = function(catalogItems, budgetUsd, roomType) {
    var priorities = this.getCategoryPriority(roomType);
    var scored = [];
    for (var i = 0; i < catalogItems.length; i++) {
      var item = catalogItems[i];
      var price = this.estimateCatalogPrice(item);
      var importance = priorities[item.category] || 4;
      var score = importance / Math.max(price, 1);
      scored.push({
        item: item,
        price: price,
        importance: importance,
        score: score
      });
    }
    scored.sort(function(a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return b.importance - a.importance;
    });

    var picked = [];
    var spent = 0;
    for (var j = 0; j < scored.length; j++) {
      if (spent + scored[j].price <= budgetUsd) {
        picked.push(scored[j]);
        spent += scored[j].price;
      }
    }
    return { picked: picked, spent: spent };
  };

  AIPlanner.prototype.alignForCategory = function(category) {
    if (category === "Seating" || category === "Storage" || category === "Bedroom") return "wall";
    if (category === "Tables" || category === "Rugs") return "room_center";
    if (category === "Lighting" || category === "Decor") return "corner";
    return "wall";
  };

  AIPlanner.prototype.catalogSelectionToDefs = function(selection) {
    var defs = [];
    for (var i = 0; i < selection.length; i++) {
      defs.push({
        name: selection[i].item.name,
        url: selection[i].item.url,
        type: selection[i].item.type,
        importance: selection[i].importance,
        align: this.alignForCategory(selection[i].item.category),
        count: 1
      });
    }
    return defs;
  };

  AIPlanner.prototype.buildCatalogBudgetSuggestion = function(roomType, budgetInput, currency, budgetUsd, metrics, pickedResult) {
    var lines = [];
    for (var i = 0; i < pickedResult.picked.length; i++) {
      lines.push("- " + pickedResult.picked[i].item.name + " (" + pickedResult.picked[i].item.category + ") - ₹" + pickedResult.picked[i].price);
    }
    var spentInInputCurrency = pickedResult.spent;
    return (
      "AI budget suggestion for " + roomType.replace("_", " ") + " (" +
      metrics.widthFt.toFixed(1) + "ft x " + metrics.depthFt.toFixed(1) + "ft, " +
      metrics.areaFt2.toFixed(1) + "ft²)\n" +
      "Budget entered: " + this.formatMoney(budgetInput, currency) + "\n" +
      "Selected from Add Items catalog: " + pickedResult.picked.length + " item(s)\n" +
      "Estimated spend: " + this.formatMoney(spentInInputCurrency, currency) + "\n\n" +
      "Suggested items:\n" + lines.join("\n")
    );
  };

  AIPlanner.prototype.estimateItemsCost = function(itemsDef) {
    var total = 0;
    var lines = [];
    for (var i = 0; i < itemsDef.length; i++) {
      var def = itemsDef[i];
      var count = def.count || 1;
      var unitPrice = this.getFurniturePrice(def);
      var lineTotal = unitPrice * count;
      total += lineTotal;
      lines.push({
        name: def.name,
        count: count,
        unitPrice: unitPrice,
        total: lineTotal
      });
    }
    return { total: total, lines: lines };
  };

  AIPlanner.prototype.optimizeForBudget = function(itemsDef, budget) {
    var unitItems = [];
    var i, c;
    for (i = 0; i < itemsDef.length; i++) {
      var def = itemsDef[i];
      var count = def.count || 1;
      var unitPrice = this.getFurniturePrice(def);
      var utilityBase = (typeof def.importance === "number" ? def.importance : 5);
      for (c = 0; c < count; c++) {
        unitItems.push({
          def: def,
          unitPrice: unitPrice,
          utility: utilityBase
        });
      }
    }

    var n = unitItems.length;
    var B = Math.max(0, Math.floor(budget));
    var dp = [];
    var keep = [];
    for (i = 0; i <= n; i++) {
      dp[i] = [];
      keep[i] = [];
      for (var b = 0; b <= B; b++) {
        dp[i][b] = 0;
        keep[i][b] = false;
      }
    }

    for (i = 1; i <= n; i++) {
      var price = unitItems[i - 1].unitPrice;
      var utility = unitItems[i - 1].utility;
      for (var budgetNow = 0; budgetNow <= B; budgetNow++) {
        dp[i][budgetNow] = dp[i - 1][budgetNow];
        if (price <= budgetNow) {
          var candidate = dp[i - 1][budgetNow - price] + utility;
          if (candidate > dp[i][budgetNow]) {
            dp[i][budgetNow] = candidate;
            keep[i][budgetNow] = true;
          }
        }
      }
    }

    var selectedUnits = [];
    var rem = B;
    for (i = n; i >= 1; i--) {
      if (keep[i][rem]) {
        selectedUnits.push(unitItems[i - 1]);
        rem -= unitItems[i - 1].unitPrice;
      }
    }

    if (selectedUnits.length === 0) {
      return [];
    }

    var grouped = {};
    for (i = 0; i < selectedUnits.length; i++) {
      var key = selectedUnits[i].def.name + "|" + selectedUnits[i].def.url + "|" + selectedUnits[i].def.type;
      if (!grouped[key]) {
        var copy = {};
        for (var k in selectedUnits[i].def) {
          if (Object.prototype.hasOwnProperty.call(selectedUnits[i].def, k)) {
            copy[k] = selectedUnits[i].def[k];
          }
        }
        copy.count = 0;
        grouped[key] = copy;
      }
      grouped[key].count += 1;
    }

    var result = [];
    for (var groupKey in grouped) {
      if (Object.prototype.hasOwnProperty.call(grouped, groupKey)) {
        result.push(grouped[groupKey]);
      }
    }
    return result;
  };

  AIPlanner.prototype.buildBudgetSuggestion = function(roomType, metrics, profile, itemsDef, budget) {
    var estimate = this.estimateItemsCost(itemsDef);
    var details = [];
    for (var i = 0; i < estimate.lines.length; i++) {
      var line = estimate.lines[i];
      details.push(
        line.name + " x" + line.count + " (₹" + line.unitPrice + " each)"
      );
    }
    return (
      "AI budget suggestion for " + roomType.replace("_", " ") + " (" +
      metrics.widthFt.toFixed(1) + "ft x " + metrics.depthFt.toFixed(1) + "ft, " +
      metrics.areaFt2.toFixed(1) + "ft²)\n" +
      "Profile: " + profile.key + "\n" +
      "Budget: ₹" + Math.floor(budget) + "\n" +
      "Estimated cost: ₹" + estimate.total + "\n" +
      "Items: " + details.join(", ")
    );
  };

  AIPlanner.prototype.scalePresetForRoom = function(itemsDef, profile) {
    var scaled = itemsDef.map(function(def) {
      var copy = {};
      var k;
      for (k in def) {
        if (Object.prototype.hasOwnProperty.call(def, k)) {
          copy[k] = def[k];
        }
      }
      return copy;
    });

    for (var i = 0; i < scaled.length; i++) {
      if (scaled[i].align === "around") {
        scaled[i].count = profile.chairCount;
      }
    }
    return scaled;
  };

  AIPlanner.prototype.tryFindNonOverlappingPosition = function(initialPos, roomCorners, occupied) {
    var ringDistances = [0, 35, 55, 75, 95, 120];
    var angles = [0, Math.PI / 3, 2 * Math.PI / 3, Math.PI, 4 * Math.PI / 3, 5 * Math.PI / 3];
    var i, j;
    var minSeparation = 65;
    function isFarEnough(candidate) {
      for (var k = 0; k < occupied.length; k++) {
        var dx = candidate.x - occupied[k].x;
        var dz = candidate.z - occupied[k].z;
        if (Math.sqrt(dx * dx + dz * dz) < minSeparation) {
          return false;
        }
      }
      return true;
    }

    for (i = 0; i < ringDistances.length; i++) {
      for (j = 0; j < angles.length; j++) {
        var d = ringDistances[i];
        var a = angles[j];
        var candidate = {
          x: initialPos.x + Math.cos(a) * d,
          z: initialPos.z + Math.sin(a) * d
        };
        if (this.pointInRoom(candidate.x, candidate.z, roomCorners) && isFarEnough(candidate)) {
          return candidate;
        }
      }
    }
    return initialPos;
  };

  AIPlanner.prototype.autoFurnish = function(roomType, options) {
    var self = this;
    var opts = options || {};
    if (this.model && this.model.floorplan && this.model.floorplan.update) {
      this.model.floorplan.update();
    }
    var rooms = this.model.floorplan.getRooms();
    if (rooms.length === 0) {
      alert("Please draw a room first!");
      return;
    }

    var room = this.getSelectedRoom() || this.getLargestRoom(rooms) || rooms[0];
    
    if (!roomType) {
      var meta = (this.model.floorplan.getRoomMeta && this.model.floorplan.getRoomMeta(room.getUuid())) || {};
      var t = (meta.type || "").trim().toLowerCase();
      if (t === "living") roomType = "living_room";
      else if (t === "bedroom") roomType = "bedroom";
      else if (t === "dining") roomType = "dining_room";
      else roomType = "living_room"; // default
    }

    var itemsDef = this.presets[roomType];
    if (!itemsDef) return;

    var metrics = this.computeRoomMetrics(room);
    var profile = this.getSizeProfile(metrics);
    itemsDef = this.scalePresetForRoom(itemsDef, profile);
    var suggestion = this.buildLayoutSuggestion(roomType, metrics, profile, itemsDef);

    if (typeof opts.budget === "number" && opts.budget > 0 && opts.useCatalogBudget === true) {
      var catalogItems = this.getCatalogItemsFromUI();
      if (!catalogItems.length) {
        alert("Could not read items from Add Items catalog. Open Add Items once and try again.");
        return;
      }
      var pickedResult = this.selectCatalogItemsWithinBudget(catalogItems, opts.budget, roomType);
      if (!pickedResult.picked.length) {
        alert("Budget is too low for available catalog items. Increase budget and try again.");
        return;
      }
      itemsDef = this.catalogSelectionToDefs(pickedResult.picked);
      suggestion.summary = this.buildCatalogBudgetSuggestion(
        roomType,
        opts.budgetInputOriginal || opts.budget,
        opts.currency || "USD",
        opts.budget,
        metrics,
        pickedResult
      );
    } else if (typeof opts.budget === "number" && opts.budget > 0) {
      itemsDef = this.optimizeForBudget(itemsDef, opts.budget);
      if (!itemsDef || itemsDef.length === 0) {
        alert("Budget is too low for available items. Increase budget and try again.");
        return;
      }
      suggestion.summary = this.buildBudgetSuggestion(roomType, metrics, profile, itemsDef, opts.budget);
    } else {
      var estimate = this.estimateItemsCost(itemsDef);
      suggestion.summary += "\nEstimated cost: ₹" + estimate.total;
    }

    if (!window.confirm(suggestion.summary + "\n\nApply this layout?")) {
      return;
    }

    this.clearRoomItems(room);

    var corners = room.interiorCorners;
    var walls = this.getRoomWalls(room);
    var occupied = [];
    
    // Find the longest wall
    var mainWall = this.findBestWall(walls);
    var oppositeWall = this.getOppositeWall(walls, mainWall);

    itemsDef.forEach(function(def, index) {
      setTimeout(function() {
        var posData;
        var rot = 0;
        var wallOffset = profile.wallOffset;
        var spawnCount = def.count || 1;
        var roomCenter = self.getRoomCenter(room);

        if (def.align === 'wall' || def.align === 'wall_center') {
          posData = self.getPositionOnWall(mainWall, 0.5, wallOffset, corners);
          rot = posData.normalAngle + Math.PI;
        } else if (def.align === 'wall_opposite') {
          posData = self.getPositionOnWall(oppositeWall, 0.5, wallOffset, corners);
          rot = posData.normalAngle + Math.PI;
        } else if (def.align === 'center_front') {
          posData = self.getPositionOnWall(mainWall, 0.5, profile.centerOffset, corners);
          rot = posData.normalAngle;
        } else if (def.align === 'side') {
          var ratio = (index % 2 === 0) ? 0.25 : 0.75;
          posData = self.getPositionOnWall(mainWall, ratio, wallOffset, corners);
          rot = posData.normalAngle + Math.PI;
        } else if (def.align === 'corner') {
          posData = self.getPositionOnWall(mainWall, 0.05, wallOffset + 10, corners);
          rot = posData.normalAngle + Math.PI/4;
        } else if (def.align === 'room_center') {
          posData = { x: roomCenter.x, z: roomCenter.z };
          rot = 0;
        } else {
          posData = { x: roomCenter.x, z: roomCenter.z };
          rot = 0;
        }

        for (var n = 0; n < spawnCount; n++) {
          var candidate = { x: posData.x, z: posData.z };
          var itemRot = rot;

          if (def.align === "around" && spawnCount > 1) {
            var angle = (n / spawnCount) * Math.PI * 2;
            candidate = {
              x: roomCenter.x + Math.cos(angle) * profile.seatRadius,
              z: roomCenter.z + Math.sin(angle) * profile.seatRadius
            };
            itemRot = angle + Math.PI / 2;
          } else if (spawnCount > 1) {
            var sideOffset = (n - (spawnCount - 1) / 2) * 55;
            candidate = {
              x: posData.x + Math.cos(rot + Math.PI / 2) * sideOffset,
              z: posData.z + Math.sin(rot + Math.PI / 2) * sideOffset
            };
          }

          // Safety: ensure inside room
          if (!self.pointInRoom(candidate.x, candidate.z, corners)) {
            candidate = { x: roomCenter.x, z: roomCenter.z };
          }
          var safePos = self.tryFindNonOverlappingPosition(candidate, corners, occupied);
          occupied.push({ x: safePos.x, z: safePos.z });
          self.spawnItem(def, safePos, itemRot);
        }
      }, index * 200);
    });

    if (this.blueprint3d.three && this.blueprint3d.three.needsUpdate) {
      setTimeout(function() {
        self.blueprint3d.three.needsUpdate();
        if (self.blueprint3d.three.centerCamera) {
          self.blueprint3d.three.centerCamera();
        }
      }, itemsDef.length * 220 + 200);
    }
  };

  AIPlanner.prototype.findBestWall = function(walls) {
    // Sort by length, but prioritize walls that aren't too short for a sofa/bed
    var sorted = walls.slice().sort(function(a, b) {
      return b.length - a.length;
    });
    return sorted[0]; // Return longest wall
  };

  AIPlanner.prototype.getRoomWalls = function(room) {
    var walls = [];
    var corners = room.interiorCorners;
    for (var i = 0; i < corners.length; i++) {
      var c1 = corners[i];
      var c2 = corners[(i + 1) % corners.length];
      var dx = c2.x - c1.x;
      var dz = this.getPlanY(c2) - this.getPlanY(c1);
      var c1y = this.getPlanY(c1);
      var c2y = this.getPlanY(c2);
      walls.push({
        p1: { x: c1.x, z: c1y },
        p2: { x: c2.x, z: c2y },
        length: Math.sqrt(dx*dx + dz*dz),
        angle: Math.atan2(dz, dx),
        midpoint: { x: (c1.x + c2.x)/2, z: (c1y + c2y)/2 }
      });
    }
    return walls;
  };

  AIPlanner.prototype.getOppositeWall = function(walls, mainWall) {
    var best = null;
    var maxDist = -1;
    var mainMid = mainWall.midpoint;

    walls.forEach(function(w) {
      // Skip the main wall itself and its immediate neighbors for better results
      if (w === mainWall) return;
      
      // Calculate distance between midpoints
      var d = Math.sqrt(Math.pow(w.midpoint.x - mainMid.x, 2) + Math.pow(w.midpoint.z - mainMid.z, 2));
      
      // We want the wall that is furthest away AND roughly parallel (dot product of normals)
      // For simplicity, furthest distance is usually the best opposite wall
      if (d > maxDist) {
        maxDist = d;
        best = w;
      }
    });
    return best || walls[1];
  };

  AIPlanner.prototype.getPositionOnWall = function(wall, ratio, offset, roomCorners) {
    var dx = wall.p2.x - wall.p1.x;
    var dz = wall.p2.z - wall.p1.z;
    
    // Normal candidates
    var nx1 = -dz / wall.length;
    var nz1 = dx / wall.length;
    
    // Try first normal
    var testX = wall.p1.x + dx * ratio + nx1 * 10;
    var testZ = wall.p1.z + dz * ratio + nz1 * 10;
    
    var nx, nz;
    if (this.pointInRoom(testX, testZ, roomCorners)) {
      nx = nx1; nz = nz1;
    } else {
      nx = -nx1; nz = -nz1; // Flip normal if it points outside
    }
    
    return {
      x: wall.p1.x + dx * ratio + nx * offset,
      z: wall.p1.z + dz * ratio + nz * offset,
      normalAngle: Math.atan2(nz, nx)
    };
  };

  AIPlanner.prototype.spawnItem = function(def, pos, rot) {
    if (!def || !def.url) return;
    var normalizedUrl = String(def.url).trim().toLowerCase();
    if (!normalizedUrl || normalizedUrl === "null" || normalizedUrl === "undefined") {
      console.warn("AIPlanner: skipped invalid model URL for", def.name);
      return;
    }
    var metadata = {
      itemName: def.name,
      resizable: true,
      itemType: def.type,
      modelUrl: def.url
    };
    var scaleVec = new THREE.Vector3(1, 1, 1);
    var posVec = new THREE.Vector3(pos.x, 40, pos.z);
    this.model.scene.addItem(def.type, def.url, metadata, posVec, rot, scaleVec, false);
  };

  AIPlanner.prototype.getSelectedRoom = function() {
    // In Blueprint3D, the "active" room is often determined by the camera position
    // or by a click in the 2D floorplanner.
    // For 3D, we'll check if the camera is inside any room.
    var camPos = this.blueprint3d.three.getCamera().position;
    var rooms = this.model.floorplan.getRooms();
    
    for (var i = 0; i < rooms.length; i++) {
      if (this.pointInRoom(camPos.x, camPos.z, rooms[i].interiorCorners)) {
        return rooms[i];
      }
    }
    return null;
  };

  AIPlanner.prototype.getLargestRoom = function(rooms) {
    if (!rooms || rooms.length === 0) return null;
    var best = rooms[0];
    var bestArea = (best && best.getAreaCm2) ? best.getAreaCm2() : 0;
    for (var i = 1; i < rooms.length; i++) {
      var area = (rooms[i] && rooms[i].getAreaCm2) ? rooms[i].getAreaCm2() : 0;
      if (area > bestArea) {
        best = rooms[i];
        bestArea = area;
      }
    }
    return best;
  };

  AIPlanner.prototype.getRoomCenter = function(room) {
    var sumX = 0, sumZ = 0;
    var corners = room.interiorCorners;
    corners.forEach(function(c) {
      sumX += c.x;
      sumZ += (typeof c.z === "number" ? c.z : c.y);
    });
    return { x: sumX / corners.length, z: sumZ / corners.length };
  };

  AIPlanner.prototype.clearRoomItems = function(room) {
    var sceneItems = this.model.scene.getItems();
    for (var i = sceneItems.length - 1; i >= 0; i--) {
      var it = sceneItems[i];
      // Only remove if it's not the "User (3D)" model
      if (it.metadata.itemName !== "User (3D)" && this.pointInRoom(it.position.x, it.position.z, room.interiorCorners)) {
        it.remove();
      }
    }
  };

  AIPlanner.prototype.placeItemHeuristically = function(def, room, center) {
    var self = this;
    var count = def.count || 1;
    
    // Calculate room dimensions for scaling/spacing
    var corners = room.interiorCorners;
    var minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    var self = this;
    corners.forEach(function(c) {
      minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x);
      var planY = self.getPlanY(c);
      minZ = Math.min(minZ, planY); maxZ = Math.max(maxZ, planY);
    });
    var roomWidth = maxX - minX;
    var roomDepth = maxZ - minZ;

    for (var i = 0; i < count; i++) {
      var pos = { x: center.x, z: center.z };
      var rot = 0;

      // Advanced Heuristic Positioning based on Room Dimensions
      if (def.align === 'wall') {
        pos.z = minZ + 50; // Push to top wall
        pos.x += (i - (count-1)/2) * Math.min(100, roomWidth / (count + 1));
      } else if (def.align === 'wall_center') {
        pos.z = minZ + 80; // Headboard against wall
      } else if (def.align === 'room_center') {
        // Keep at center
      } else if (def.align === 'center_front') {
        pos.z = center.z + 50;
      } else if (def.align === 'wall_opposite') {
        pos.z = maxZ - 50; // Push to bottom wall
        rot = Math.PI;
      } else if (def.align === 'corner') {
        pos.x = minX + 50;
        pos.z = minZ + 50;
      } else if (def.align === 'around') {
        var radius = Math.min(80, roomWidth/4, roomDepth/4);
        var angle = (i / count) * Math.PI * 2;
        pos.x += Math.cos(angle) * radius;
        pos.z += Math.sin(angle) * radius;
        rot = angle + Math.PI/2;
      } else if (def.align === 'side') {
        // Find "relativeTo" item if it exists in the current queue (not implemented yet, using offset)
        pos.x = center.x + (i === 0 ? -80 : 80);
        pos.z = minZ + 80;
      }

      // Ensure item is within room bounds
      pos.x = Math.max(minX + 30, Math.min(maxX - 30, pos.x));
      pos.z = Math.max(minZ + 30, Math.min(maxZ - 30, pos.z));

      var metadata = {
        itemName: def.name,
        resizable: true,
        itemType: def.type,
        modelUrl: def.url
      };

      var scaleVec = new THREE.Vector3(1, 1, 1);
      var posVec = new THREE.Vector3(pos.x, 40, pos.z); // Standard height

      this.model.scene.addItem(def.type, def.url, metadata, posVec, rot, scaleVec, false);
    }
  };

  window.initAIPlanner = function(bp3d) {
    var planner = new AIPlanner(bp3d);

    $(document).off("click.aiPlanner", "#auto-furnish-btn");
    $(document).on("click.aiPlanner", "#auto-furnish-btn", function(e) {
      e.preventDefault();
      try {
        planner.autoFurnish();
      } catch (err) {
        console.error("AI Auto-Furnish failed:", err);
        alert("AI Auto-Furnish failed: " + (err && err.message ? err.message : err));
      }
    });

    // Running Budget Tracker
    function updateRunningTotal() {
      // Small timeout to let item fully initialize/remove
      setTimeout(function() {
        var items = bp3d.model.scene.getItems();
        var total = 0;
        items.forEach(function(item) {
          // Exclude the user representation from budget
          if (item.metadata && item.metadata.itemName === "User (3D)") return;
          var def = {
            name: item.metadata ? item.metadata.itemName : "",
            type: item.metadata ? item.metadata.itemType : 1
          };
          var price = planner.getFurniturePrice(def);
          total += price;
        });
        $("#running-budget-total").text("₹" + Math.round(total).toLocaleString("en-IN"));
      }, 50);
    }

    // Subscribe to item events to recalculate running total
    bp3d.model.scene.itemLoadedCallbacks.add(updateRunningTotal);
    bp3d.model.scene.itemRemovedCallbacks.add(updateRunningTotal);
    
    // Initial calculation
    updateRunningTotal();

    return planner;
  };

})();
