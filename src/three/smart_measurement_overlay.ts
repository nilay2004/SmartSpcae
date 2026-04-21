/// <reference path="../../lib/three.d.ts" />
/// <reference path="../core/utils.ts" />
/// <reference path="../items/item.ts" />

module BP3D.Three {

  // ─── Constants ──────────────────────────────────────────────────────────────
  /** Height above floor (in scene units) at which rays are cast. */
  const RAY_Y = 60;

  /** Thickness of the dimension line. WebGL ignores linewidth > 1 on most
   *  drivers, so we use a flat box instead of a line for the shaft. */
  const LINE_COLOR  = 0x2ecc71;  // emerald green
  const CAP_COLOR   = 0x2ecc71;
  const LABEL_BG    = "rgba(15, 15, 30, 0.82)";
  const LABEL_FG    = "#ffffff";
  const LABEL_ACCENT= "#2ecc71";

  // Small perpendicular tick-cap half-length (scene units)
  const CAP_HALF = 6;

  // Label canvas pixel dimensions
  const CANVAS_W = 140;
  const CANVAS_H = 44;

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Create a flat, thin box acting as a "line" between two 3-D points.
   * WebGL implementations silently cap gl.lineWidth to 1 on most hardware,
   * so we use a scaled box mesh instead.
   */
  function makeThinBoxLine(
    start: THREE.Vector3,
    end:   THREE.Vector3,
    color: number,
    thickness: number = 1.2
  ): THREE.Mesh {
    const dir = end.clone().sub(start);
    const length = dir.length();
    const geo = new THREE.BoxGeometry(length, thickness, thickness);
    const mat = new THREE.MeshBasicMaterial({ color, depthTest: false });
    const mesh = new THREE.Mesh(geo, mat);

    // Position at midpoint and orient toward `end`
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.lookAt(end);

    // lookAt points Z toward target — rotate so the box's X axis is along
    // the segment (BoxGeometry length is along X by default).
    mesh.rotateY(Math.PI / 2);
    return mesh;
  }

  /**
   * Create a short perpendicular tick-cap (end marker) at position `pt`
   * perpendicular to `dir` in the XZ plane.
   */
  function makeCap(
    pt:    THREE.Vector3,
    dir:   THREE.Vector3,
    color: number
  ): THREE.Mesh {
    // Perpendicular in XZ plane
    const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar(CAP_HALF);
    const start = pt.clone().sub(perp);
    const end   = pt.clone().add(perp);
    return makeThinBoxLine(start, end, color, 1.2);
  }

  /**
   * Render a styled canvas label and return a THREE.Sprite.
   * The sprite is sized so that 1 scene-unit == 1 canvas pixel / scale.
   */
  function makeLabel(text: string, scale: number = 0.5): THREE.Sprite {
    const canvas  = document.createElement("canvas");
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;

    const ctx = canvas.getContext("2d")!;

    // ── Background pill ────────────────────────────────────────────────────
    const r = CANVAS_H / 2;
    ctx.fillStyle = LABEL_BG;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(CANVAS_W - r, 0);
    ctx.arcTo(CANVAS_W, 0, CANVAS_W, r, r);
    ctx.lineTo(CANVAS_W, CANVAS_H - r);
    ctx.arcTo(CANVAS_W, CANVAS_H, CANVAS_W - r, CANVAS_H, r);
    ctx.lineTo(r, CANVAS_H);
    ctx.arcTo(0, CANVAS_H, 0, CANVAS_H - r, r);
    ctx.lineTo(0, r);
    ctx.arcTo(0, 0, r, 0, r);
    ctx.closePath();
    ctx.fill();

    // ── Accent border ──────────────────────────────────────────────────────
    ctx.strokeStyle = LABEL_ACCENT;
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // ── Measurement text ───────────────────────────────────────────────────
    ctx.font         = "bold 20px 'Arial', sans-serif";
    ctx.fillStyle    = LABEL_FG;
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2);

    const texture          = new THREE.Texture(canvas);
    texture.needsUpdate    = true;

    // THREE r69: SpriteMaterial does not accept `useScreenCoordinates`.
    const spriteMat = new THREE.SpriteMaterial({
      map:         texture,
      transparent: true,
      depthTest:   false
    });

    const sprite = new THREE.Sprite(spriteMat);
    // Scale sprite so it reads well in the scene.
    // CANVAS_W / CANVAS_H preserves aspect ratio.
    sprite.scale.set(CANVAS_W * scale, CANVAS_H * scale, 1);

    return sprite;
  }

  // ─── Disposable bundle ────────────────────────────────────────────────────

  interface MeasurementGroup {
    objects: THREE.Object3D[];
  }

  // ──────────────────────────────────────────────────────────────────────────────
  /**
   * SmartMeasurementOverlay
   *
   * Calculates and visualises the distance between the selected furniture
   * item's bounding-box faces and the nearest wall planes in each of the
   * four cardinal directions (±X, ±Z).
   *
   * Integration:
   *   – Constructed by HUD; objects are added directly to the HUD scene.
   *   – `update(item)` must be called whenever the item moves / changes.
   *   – `clear()` removes all objects and disposes GPU resources.
   */
  export class SmartMeasurementOverlay {

    /** Parent scene provided by HUD (the HUD's own THREE.Scene). */
    private hudScene: THREE.Scene;

    /** Currently tracked item. */
    private item: Items.Item | null = null;

    /** All Three.js objects currently belonging to this overlay. */
    private objects: THREE.Object3D[] = [];

    // ── Constructor ───────────────────────────────────────────────────────
    constructor(private three: any, hudScene: THREE.Scene) {
      this.hudScene = hudScene;
    }

    // ── Public API ────────────────────────────────────────────────────────

    /**
     * Update overlay for the given item.
     * Pass `null` to hide the overlay.
     */
    public update(item: Items.Item | null): void {
      this.item = item;
      this.clear();

      if (!item) return;

      this.calculateAndDraw();
    }

    /** Remove all overlay objects and free GPU resources. */
    public clear(): void {
      this.objects.forEach(obj => {
        this.hudScene.remove(obj);
        SmartMeasurementOverlay.disposeObject(obj);
      });
      this.objects = [];
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private calculateAndDraw(): void {
      if (!this.item) return;

      const floorplan = this.getFloorplan();
      if (!floorplan) return;

      const wallPlanes = floorplan.wallEdgePlanes();
      if (!wallPlanes || wallPlanes.length === 0) return;

      const pos      = this.item.position;
      const halfSize = this.item.halfSize;

      // ── Four cardinal direction rays ──────────────────────────────────
      // Each entry: [world-space ray direction, item-face offset in that dir]
      const directions: Array<{ dir: THREE.Vector3; faceOffset: number }> = [
        { dir: new THREE.Vector3( 1, 0,  0), faceOffset:  halfSize.x },
        { dir: new THREE.Vector3(-1, 0,  0), faceOffset:  halfSize.x },
        { dir: new THREE.Vector3( 0, 0,  1), faceOffset:  halfSize.z },
        { dir: new THREE.Vector3( 0, 0, -1), faceOffset:  halfSize.z },
      ];

      // Cast at multiple heights to maximise chance of hitting a wall plane
      const rayHeights = [RAY_Y * 0.25, RAY_Y * 0.5, RAY_Y];

      directions.forEach(({ dir, faceOffset }) => {
        let hitDistance: number | null = null;

        for (const yOff of rayHeights) {
          const origin = new THREE.Vector3(pos.x, yOff, pos.z);
          const raycaster = new THREE.Raycaster(origin, dir.clone().normalize());
          const hits = raycaster.intersectObjects(wallPlanes, false);
          if (hits.length > 0) {
            hitDistance = hits[0].distance;
            break;
          }
        }

        if (hitDistance === null) return;

        // Distance from item bounding-box face to wall
        const gap = hitDistance - faceOffset;
        if (gap <= 0) return; // item is intersecting the wall — skip

        // Line start = item face, line end = wall surface
        const facePoint = pos.clone().add(dir.clone().multiplyScalar(faceOffset));
        const wallPoint = pos.clone().add(dir.clone().multiplyScalar(hitDistance));
        facePoint.y = RAY_Y;
        wallPoint.y = RAY_Y;

        this.drawMeasurement(facePoint, wallPoint, dir, gap);
      });
    }

    /**
     * Draw one dimension line: shaft + two end caps + centred label.
     */
    private drawMeasurement(
      start:    THREE.Vector3,
      end:      THREE.Vector3,
      dir:      THREE.Vector3,
      distance: number
    ): void {
      // ── Shaft ──────────────────────────────────────────────────────────
      const shaft = makeThinBoxLine(start, end, LINE_COLOR, 1.4);
      this.add(shaft);

      // ── End caps (small perpendicular ticks) ──────────────────────────
      this.add(makeCap(start, dir, CAP_COLOR));
      this.add(makeCap(end,   dir, CAP_COLOR));

      // ── Label ─────────────────────────────────────────────────────────
      const labelText = SmartMeasurementOverlay.formatDistance(distance);
      const label     = makeLabel(labelText);
      const mid       = start.clone().add(end).multiplyScalar(0.5);
      mid.y += 20; // float above the dimension line
      label.position.copy(mid);
      this.add(label);
    }

    /** Register an object with the overlay (adds to hudScene & tracking list). */
    private add(obj: THREE.Object3D): void {
      this.hudScene.add(obj);
      this.objects.push(obj);
    }

    /** Safe access to the floorplan through the `three` main instance. */
    private getFloorplan(): any {
      try {
        return this.three.getModel().activeFloor.floorplan;
      } catch (_) {
        return null;
      }
    }

    // ── Static utilities ──────────────────────────────────────────────────

    /**
     * Convert raw scene units to a human-readable metre string.
     *
     * Blueprint3D stores coordinates in centimetres by default
     * (verified via corner/wall coordinates in the example floorplan).
     * Divide by 100 to convert cm → m.
     */
    private static formatDistance(units: number): string {
      const metres = units / 100;
      if (metres < 1) {
        return (metres * 100).toFixed(0) + " cm";
      }
      return metres.toFixed(2) + " m";
    }

    /** Dispose geometry, material and texture of a single object. */
    private static disposeObject(obj: THREE.Object3D): void {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        const mat: any = mesh.material;
        if (mat.map) mat.map.dispose();
        mat.dispose();
      }
    }
  }
}
