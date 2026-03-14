/// <reference path="../../lib/three.d.ts" />
/// <reference path="floor.ts" />
/// <reference path="edge.ts" />

module BP3D.Three {
  export class Floorplan {
    private scene: THREE.Scene;
    private floorplan: Model.Floorplan;
    private controls: Three.Controls;
    private floors: Three.Floor[] = [];
    private edges: Three.Edge[] = [];

    constructor(scene: THREE.Scene, floorplan: Model.Floorplan, controls: Three.Controls) {
      this.scene = scene;
      this.floorplan = floorplan;
      this.controls = controls;

      this.floorplan.fireOnUpdatedRooms(() => this.redraw());
    }

    private redraw() {
      // clear scene
      this.floors.forEach((floor) => {
        floor.removeFromScene();
      });

      this.edges.forEach((edge) => {
        edge.remove();
      });
      this.floors = [];
      this.edges = [];

      // draw floors
      this.floorplan.getRooms().forEach((room) => {
        var threeFloor = new Three.Floor(this.scene, room);
        this.floors.push(threeFloor);
        threeFloor.addToScene();
      });

      // draw edges
      this.floorplan.wallEdges().forEach((edge) => {
        var threeEdge = new Three.Edge(
          this.scene, edge, this.controls);
        this.edges.push(threeEdge);
      });
    }
  }
}
