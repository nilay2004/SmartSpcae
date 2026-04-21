/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../../lib/three.d.ts" />
/// <reference path="controller.ts" />
/// <reference path="floorplan.ts" />
/// <reference path="lights.ts" />
/// <reference path="skybox.ts" />
/// <reference path="controls.ts" />
/// <reference path="hud.ts" />
/// <reference path="smart_measurement_overlay.ts" />

module BP3D.Three {
  export class Main {
    public element: JQuery;
    public controls: Three.Controls = null;
    public heightMargin: number = null;
    public widthMargin: number = null;
    public elementHeight: number = null;
    public elementWidth: number = null;
    public itemSelectedCallbacks = $.Callbacks();
    public itemUnselectedCallbacks = $.Callbacks();
    public wallClicked = $.Callbacks();
    public floorClicked = $.Callbacks();
    public nothingClicked = $.Callbacks();

    private model: Model.Model;
    private scene: Model.Scene;
    private canvasElement: any;
    private options: any;
    private domElement: HTMLElement = null;
    private camera: THREE.PerspectiveCamera = null;
    private renderer: THREE.WebGLRenderer = null;
    private controller: Three.Controller = null;
    private floorplan: Three.Floorplan = null;
    private hud: Three.HUD = null;
    public lights: any = null;
    private skybox: any = null;
    private needsUpdate = false;
    private lastRender = Date.now();
    private mouseOver = false;
    private hasClicked = false;

    constructor(model: Model.Model, element: any, canvasElement: any, opts: any) {
      this.model = model;
      this.scene = model.scene;
      this.element = $(element);
      this.canvasElement = canvasElement;

      this.options = {
        resize: true,
        pushHref: false,
        spin: true,
        spinSpeed: .00002,
        clickPan: true,
        canMoveFixedItems: false
      };

      // override with manually set options
      for (var opt in this.options) {
        if (this.options.hasOwnProperty(opt) && opts.hasOwnProperty(opt)) {
          this.options[opt] = opts[opt];
        }
      }

      this.init();
    }

    private init() {
      THREE.ImageUtils.crossOrigin = "";

      this.domElement = this.element.get(0); // Container

      // ── Camera ────────────────────────────────────────────────────────────
      this.camera = new THREE.PerspectiveCamera(45, 1, 1, 20000);

      // ── Renderer with improved quality settings ───────────────────────────
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,                  // smooth edges
        preserveDrawingBuffer: true,      // required for .toDataURL()
        alpha: false,
        precision: "highp"               // use high precision shaders
      });

      // Pixel ratio — use device pixel ratio for sharp rendering on retina screens
      // capped at 2 to avoid performance issues on high-dpi displays
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      this.renderer.autoClear = false;

      // ── Shadow quality improvements ───────────────────────────────────────
      this.renderer.shadowMapEnabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // soft, realistic shadows

      // ── Gamma correction for accurate colors ──────────────────────────────
      // This makes colors look more realistic (not washed out)
      this.renderer.gammaInput = true;
      this.renderer.gammaOutput = true;
      this.renderer.gammaFactor = 2.2;   // standard gamma value

      // ── Tone mapping for better contrast and realism ──────────────────────
      // ACESFilmic gives cinematic look — if not available in this Three.js
      // version it will just be ignored gracefully
      try {
        if ((THREE as any).ACESFilmicToneMapping !== undefined) {
          (this.renderer as any).toneMapping = (THREE as any).ACESFilmicToneMapping;
          (this.renderer as any).toneMappingExposure = 1.1;
        } else if ((THREE as any).ReinhardToneMapping !== undefined) {
          // Fallback: Reinhard tone mapping (available in older Three.js)
          (this.renderer as any).toneMapping = (THREE as any).ReinhardToneMapping;
          (this.renderer as any).toneMappingExposure = 1.0;
        }
      } catch (e) {
        // tone mapping not supported in this version, skip silently
      }

      this.skybox = new (Three.Skybox as any)(this.scene);

      this.controls = new Three.Controls(this.camera, this.domElement);

      this.hud = new Three.HUD(this);

      this.controller = new Three.Controller(
        this, this.model, this.camera, this.element, this.controls, this.hud);

      this.domElement.appendChild(this.renderer.domElement);

      // ── Renderer canvas style improvements ────────────────────────────────
      // Ensure crisp rendering on all devices
      this.renderer.domElement.style.imageRendering = "auto";

      // handle window resizing
      this.updateWindowSize();
      if (this.options.resize) {
        $(window).resize(() => this.updateWindowSize());
      }

      // setup camera nicely
      this.centerCamera();
      this.model.activeFloor.floorplan.fireOnUpdatedRooms(() => this.centerCamera());

      this.lights = new (Three.Lights as any)(this.scene, this.model.activeFloor.floorplan);

      this.floorplan = new Three.Floorplan(this.scene.getScene(),
        this.model, this.controls);

      // Listen to active floor changes
      this.model.activeFloorChangedCallbacks.add(() => {
        (this.lights as any).updateFloorplan(this.model.activeFloor.floorplan);
        this.floorplan.redraw();
      });

      this.animate();

      this.element.mouseenter(() => {
        this.mouseOver = true;
      }).mouseleave(() => {
        this.mouseOver = false;
      }).click(() => {
        this.hasClicked = true;
      });
    }

    private spin() {
      if (this.options.spin && !this.mouseOver && !this.hasClicked) {
        var theta = 2 * Math.PI * this.options.spinSpeed * (Date.now() - this.lastRender);
        this.controls.rotateLeft(theta);
        this.controls.update()
      }
    }

    public dataUrl() {
      var dataUrl = this.renderer.domElement.toDataURL("image/png");
      return dataUrl;
    }

    // ── High quality render export ─────────────────────────────────────────
    // scale: 1 = normal, 2 = 2x resolution, 4 = 4x resolution
    public renderToDataUrl(scale?: number): string {
      scale = scale || 2;
      scale = Math.max(1, Math.min(4, scale));

      var origWidth  = this.elementWidth;
      var origHeight = this.elementHeight;

      // Render at higher resolution
      this.renderer.setSize(origWidth * scale, origHeight * scale);
      this.renderer.setPixelRatio(1);

      this.renderer.clear();
      this.renderer.render(this.scene.getScene(), this.camera);
      this.renderer.clearDepth();
      this.renderer.render(this.hud.getScene(), this.camera);

      var dataUrl = this.renderer.domElement.toDataURL("image/png");

      // Restore original size
      this.renderer.setSize(origWidth, origHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.needsUpdate = true;

      return dataUrl;
    }

    public stopSpin() {
      this.hasClicked = true;
    }

    public getOptions() {
      return this.options;
    }

    public getModel() {
      return this.model;
    }

    public getScene() {
      return this.scene;
    }

    public getController() {
      return this.controller;
    }

    public getCamera() {
      return this.camera;
    }

    public getRenderer() {
      return this.renderer;
    }

    public setNeedsUpdate() {
      this.needsUpdate = true;
    }

    // Expose needsUpdate as callable function for external use
    public needsUpdate_fn() {
      this.needsUpdate = true;
    }

    private shouldRender() {
      if (this.controls.needsUpdate || this.controller.needsUpdate || this.needsUpdate || this.model.scene.needsUpdate) {
        this.controls.needsUpdate = false;
        this.controller.needsUpdate = false;
        this.needsUpdate = false;
        this.model.scene.needsUpdate = false;
        return true;
      } else {
        return false;
      }
    }

    private render() {
      this.spin();
      if (this.shouldRender()) {
        this.renderer.clear();
        this.renderer.render(this.scene.getScene(), this.camera);
        this.renderer.clearDepth();
        this.renderer.render(this.hud.getScene(), this.camera);
      }
      this.lastRender = Date.now();
    }

    private animate() {
      var delay = 50;
      setTimeout(() => {
        requestAnimationFrame(() => this.animate());
      }, delay);
      this.render();
    }

    public rotatePressed() {
      // rotatePressed method not available on Controller; do nothing
    }

    public rotateReleased() {
      // rotateReleased method not available on Controller; do nothing
    }

    public setCursorStyle(cursorStyle: string) {
      this.domElement.style.cursor = cursorStyle;
    }

    public updateWindowSize() {
      this.heightMargin = this.element.offset().top;
      this.widthMargin = this.element.offset().left;

      this.elementWidth = this.element.innerWidth();
      if (this.options.resize) {
        this.elementHeight = window.innerHeight - this.heightMargin;
      } else {
        this.elementHeight = this.element.innerHeight();
      }

      this.camera.aspect = this.elementWidth / this.elementHeight;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(this.elementWidth, this.elementHeight);

      // Re-apply pixel ratio on resize
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      this.needsUpdate = true;
    }

    public centerCamera() {
      var yOffset = 150.0;

      var pan = this.model.activeFloor.floorplan.getCenter();
      pan.y = yOffset;

      this.controls.target = pan;

      var distance = this.model.activeFloor.floorplan.getSize().z * 1.5;

      var offset = pan.clone().add(
        new THREE.Vector3(0, distance, distance));
      this.camera.position.copy(offset);

      this.controls.update();
    }

    // projects the object's center point into x,y screen coords
    public projectVector(vec3: THREE.Vector3, ignoreMargin?: boolean) {
      ignoreMargin = ignoreMargin || false;

      var widthHalf = this.elementWidth / 2;
      var heightHalf = this.elementHeight / 2;

      var vector = new THREE.Vector3();
      vector.copy(vec3);
      vector.project(this.camera);

      var vec2 = new THREE.Vector2();

      vec2.x = (vector.x * widthHalf) + widthHalf;
      vec2.y = - (vector.y * heightHalf) + heightHalf;

      if (!ignoreMargin) {
        vec2.x += this.widthMargin;
        vec2.y += this.heightMargin;
      }

      return vec2;
    }
  }
}