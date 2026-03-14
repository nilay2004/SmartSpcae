/*
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

  window.CUSTOM_LAYOUT = (function() {
    var corners = {
      "custom-a": { x: 0, y: 0 },
      "custom-b": { x: 500, y: 0 },
      "custom-c": { x: 500, y: 500 },
      "custom-d": { x: 0, y: 500 }
    };
    var walls = [
      wall("custom-a", "custom-b"),
      wall("custom-b", "custom-c"),
      wall("custom-c", "custom-d"),
      wall("custom-d", "custom-a")
    ];
    return JSON.stringify({
      floorplan: { corners: corners, walls: walls, wallTextures: [], floorTextures: {}, newFloorTextures: {} },
      items: []
    });
  })();
})();
