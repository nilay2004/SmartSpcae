/**
 * Predefined floor plan layouts: 1RK, 1BHK, 2BHK.
 * Each layout is a serialized design (floorplan + items) loadable via model.loadSerialized().
 */
(function() {
  var T = {
    url: "rooms/textures/wallmap.png",
    stretch: true,
    scale: 0
  };
  function wall(c1, c2) {
    return { corner1: c1, corner2: c2, frontTexture: T, backTexture: T };
  }

  window.PRESET_LAYOUTS = {
    "1rk": (function() {
      // 1 Room + Kitchen: rectangle split by one vertical wall
      // Corners (x,y): a bottom-left, b bottom-right, c top-right, d top-left; e,f on divider
      var corners = {
        "1rk-a": { x: 204, y: -178 },
        "1rk-b": { x: 672, y: -178 },
        "1rk-c": { x: 672, y: 289 },
        "1rk-d": { x: 204, y: 289 },
        "1rk-e": { x: 380, y: -178 },
        "1rk-f": { x: 380, y: 289 }
      };
      var walls = [
        wall("1rk-d", "1rk-a"),
        wall("1rk-a", "1rk-e"),
        wall("1rk-e", "1rk-b"),
        wall("1rk-b", "1rk-c"),
        wall("1rk-c", "1rk-f"),
        wall("1rk-f", "1rk-d")
      ];
      return JSON.stringify({
        floorplan: { corners: corners, walls: walls, wallTextures: [], floorTextures: {}, newFloorTextures: {} },
        items: []
      });
    })(),

    "1bhk": (function() {
      // 1BHK: Kitchen | Hall | Bedroom (3 vertical strips)
      var corners = {
        "1bhk-a": { x: 204, y: -178 },
        "1bhk-b": { x: 672, y: -178 },
        "1bhk-c": { x: 672, y: 289 },
        "1bhk-d": { x: 204, y: 289 },
        "1bhk-e": { x: 358, y: -178 },
        "1bhk-f": { x: 358, y: 289 },
        "1bhk-g": { x: 518, y: -178 },
        "1bhk-h": { x: 518, y: 289 }
      };
      var walls = [
        wall("1bhk-d", "1bhk-a"),
        wall("1bhk-a", "1bhk-e"),
        wall("1bhk-e", "1bhk-g"),
        wall("1bhk-g", "1bhk-b"),
        wall("1bhk-b", "1bhk-c"),
        wall("1bhk-c", "1bhk-h"),
        wall("1bhk-h", "1bhk-f"),
        wall("1bhk-f", "1bhk-d"),
        wall("1bhk-e", "1bhk-f"),
        wall("1bhk-g", "1bhk-h")
      ];
      return JSON.stringify({
        floorplan: { corners: corners, walls: walls, wallTextures: [], floorTextures: {}, newFloorTextures: {} },
        items: []
      });
    })(),

    "2bhk": (function() {
      // 2BHK: 2x2 grid — Bedroom1 | Bedroom2 / Hall | Kitchen. Two vertical dividers, one horizontal between them.
      var corners = {
        "2bhk-a": { x: 204, y: -178 },
        "2bhk-b": { x: 672, y: -178 },
        "2bhk-c": { x: 672, y: 289 },
        "2bhk-d": { x: 204, y: 289 },
        "2bhk-e": { x: 358, y: -178 },
        "2bhk-f": { x: 358, y: 289 },
        "2bhk-g": { x: 526, y: -178 },
        "2bhk-h": { x: 526, y: 289 },
        "2bhk-i": { x: 358, y: 55 },
        "2bhk-j": { x: 526, y: 55 }
      };
      var walls = [
        wall("2bhk-d", "2bhk-a"),
        wall("2bhk-a", "2bhk-e"),
        wall("2bhk-e", "2bhk-g"),
        wall("2bhk-g", "2bhk-b"),
        wall("2bhk-b", "2bhk-c"),
        wall("2bhk-c", "2bhk-h"),
        wall("2bhk-h", "2bhk-f"),
        wall("2bhk-f", "2bhk-d"),
        wall("2bhk-e", "2bhk-i"),
        wall("2bhk-i", "2bhk-f"),
        wall("2bhk-g", "2bhk-j"),
        wall("2bhk-j", "2bhk-h"),
        wall("2bhk-i", "2bhk-j")
      ];
      return JSON.stringify({
        floorplan: { corners: corners, walls: walls, wallTextures: [], floorTextures: {}, newFloorTextures: {} },
        items: []
      });
    })()
  };
})();
