/// <reference path="../../lib/three.d.ts" />
/// <reference path="../core/utils.ts" />
/// <reference path="../items/item.ts" />

module BP3D.Three {
  /**
   * Drawings on "top" of the scene. e.g. rotate arrows
   */
  export class HUD {
    private scene: THREE.Scene;
    private selectedItem: Items.Item = null;
    private rotating = false;
    private mouseover = false;
    private tolerance = 10;
    private height = 5;
    private distance = 20;
    private color = "#ffffff";
    private hoverColor = "#f1c40f";
    private activeObject: THREE.Object3D = null;
    private three: any;

    constructor(three: any) {
      this.three = three;
      this.scene = new THREE.Scene();
      this.init();
    }

    public getScene() {
      return this.scene;
    }

    public getObject() {
      return this.activeObject;
    }

    private init() {
      this.three.itemSelectedCallbacks.add((item: Items.Item) => this.itemSelected(item));
      this.three.itemUnselectedCallbacks.add(() => this.itemUnselected());
    }

    private resetSelectedItem() {
      this.selectedItem = null;
      if (this.activeObject) {
        this.scene.remove(this.activeObject);
        this.activeObject = null;
      }
    }

    private itemSelected(item: Items.Item) {
      if (this.selectedItem != item) {
        this.resetSelectedItem();
        if (item.allowRotate && !item.fixed) {
          this.selectedItem = item;
          this.activeObject = this.makeObject(this.selectedItem);
          this.scene.add(this.activeObject);
        }
      }
    }

    private itemUnselected() {
      this.resetSelectedItem();
    }

    public setRotating(isRotating: boolean) {
      this.rotating = isRotating;
      this.setColor();
    }

    public setMouseover(isMousedOver: boolean) {
      this.mouseover = isMousedOver;
      this.setColor();
    }

    private setColor() {
      if (this.activeObject) {
        this.activeObject.children.forEach((obj: any) => {
          obj.material.color.set(this.getColor());
        });
      }
      this.three.needsUpdate();
    }

    private getColor() {
      return (this.mouseover || this.rotating) ? this.hoverColor : this.color;
    }

    public update() {
      if (this.activeObject && this.selectedItem) {
        this.activeObject.rotation.y = this.selectedItem.rotation.y;
        this.activeObject.position.x = this.selectedItem.position.x;
        this.activeObject.position.z = this.selectedItem.position.z;
      }
    }

    private makeLineGeometry(item: Items.Item) {
      var geometry = new THREE.Geometry();

      geometry.vertices.push(
        new THREE.Vector3(0, 0, 0),
        this.rotateVector(item)
      );

      return geometry;
    }

    private rotateVector(item: Items.Item) {
      var vec = new THREE.Vector3(0, 0,
        Math.max(item.halfSize.x, item.halfSize.z) + 1.4 + this.distance);
      return vec;
    }

    private makeLineMaterial(rotating: boolean) {
      var mat = new THREE.LineBasicMaterial({
        color: this.getColor(),
        linewidth: 3
      });
      return mat;
    }

    private makeCone(item: Items.Item) {
      var coneGeo = new THREE.CylinderGeometry(5, 0, 10);
      var coneMat = new THREE.MeshBasicMaterial({
        color: this.getColor()
      });
      var cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.copy(this.rotateVector(item));

      cone.rotation.x = -Math.PI / 2.0;

      return cone;
    }

    private makeSphere(item: Items.Item) {
      var geometry = new THREE.SphereGeometry(4, 16, 16);
      var material = new THREE.MeshBasicMaterial({
        color: this.getColor()
      });
      var sphere = new THREE.Mesh(geometry, material);
      return sphere;
    }

    private makeObject(item: Items.Item) {
      var object = new THREE.Object3D();
      var line = new THREE.Line(
        this.makeLineGeometry(item),
        this.makeLineMaterial(this.rotating),
        THREE.LinePieces);

      var cone = this.makeCone(item);
      var sphere = this.makeSphere(item);

      object.add(line);
      object.add(cone);
      object.add(sphere);

      object.rotation.y = item.rotation.y;
      object.position.x = item.position.x;
      object.position.z = item.position.z;
      object.position.y = this.height;

      return object;
    }
  }
}
