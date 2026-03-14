// Lightweight AR mode manager for Blueprint3D using WebXR.
// Works with the existing Three.js renderer and camera.

(function () {
  'use strict';

  function ARMode(blueprint3d) {
    this.blueprint3d = blueprint3d;
    this.three = blueprint3d.three;
    this.renderer = this.three.getRenderer ? this.three.getRenderer() : this.three.renderer;
    this.camera = this.three.getCamera ? this.three.getCamera() : this.three.camera;
    this.scene = blueprint3d.model && blueprint3d.model.scene
      ? blueprint3d.model.scene.getScene()
      : (this.three.getScene ? this.three.getScene().getScene() : null);

    this.session = null;
    this.refSpace = null;
    this.viewerSpace = null;
    this.hitTestSource = null;
    this.placed = false;
    this.supported = false;

    this._saved = {
      controlsEnabled: this.three.controls && this.three.controls.enabled,
      autoClear: this.renderer.autoClear,
      cameraMatrixAutoUpdate: this.camera.matrixAutoUpdate
    };

    this._onXRFrame = this._onXRFrame.bind(this);
    this._onSessionEnd = this._onSessionEnd.bind(this);
  }

  ARMode.prototype.isActive = function () {
    return !!this.session;
  };

  ARMode.prototype.ensureSupportChecked = function (callback) {
    var self = this;
    if (!('xr' in navigator)) {
      callback(false);
      return;
    }
    if (this._supportChecked) {
      callback(this.supported);
      return;
    }
    navigator.xr.isSessionSupported('immersive-ar').then(function (supported) {
      self._supportChecked = true;
      self.supported = supported;
      callback(supported);
    }).catch(function () {
      self._supportChecked = true;
      self.supported = false;
      callback(false);
    });
  };

  ARMode.prototype.start = function () {
    var self = this;
    if (!navigator.xr || this.session) {
      return;
    }

    var init = {
      requiredFeatures: ['hit-test', 'local-floor']
    };

    navigator.xr.requestSession('immersive-ar', init).then(function (session) {
      self.session = session;
      self.placed = false;

      if (self.three.controls) {
        self._saved.controlsEnabled = self.three.controls.enabled;
        self.three.controls.enabled = false;
      }

      self._saved.autoClear = self.renderer.autoClear;
      self._saved.cameraMatrixAutoUpdate = self.camera.matrixAutoUpdate;
      self.camera.matrixAutoUpdate = false;

      var gl = self.renderer.getContext();
      if (gl.makeXRCompatible) {
        gl.makeXRCompatible().then(function () {
          self._configureSession(session, gl);
        }).catch(function () {
          self.stop();
          alert('AR mode is not available on this device/browser.');
        });
      } else {
        self._configureSession(session, gl);
      }
    }).catch(function () {
      alert('Failed to start AR mode. Your device or browser may not support WebXR immersive AR.');
    });
  };

  ARMode.prototype._configureSession = function (session, gl) {
    var self = this;
    var XRWebGLLayerCtor = window.XRWebGLLayer;
    if (XRWebGLLayerCtor) {
      session.updateRenderState({
        baseLayer: new XRWebGLLayerCtor(session, gl)
      });
    }

    session.addEventListener('end', this._onSessionEnd);

    session.requestReferenceSpace('local-floor').then(function (refSpace) {
      self.refSpace = refSpace;
      return session.requestReferenceSpace('viewer');
    }).then(function (viewerSpace) {
      self.viewerSpace = viewerSpace;
      if (!session.requestHitTestSource) {
        return null;
      }
      return session.requestHitTestSource({ space: viewerSpace });
    }).then(function (source) {
      self.hitTestSource = source;
      session.requestAnimationFrame(self._onXRFrame);
    }).catch(function () {
      self.stop();
      alert('Failed to initialize AR hit testing.');
    });
  };

  ARMode.prototype.stop = function () {
    if (this.session) {
      try {
        this.session.end();
      } catch (e) {
        // ignore
      }
    }
    this._cleanup();
  };

  ARMode.prototype._onSessionEnd = function () {
    this._cleanup();
  };

  ARMode.prototype._cleanup = function () {
    if (this.three.controls && typeof this._saved.controlsEnabled !== 'undefined') {
      this.three.controls.enabled = this._saved.controlsEnabled;
    }

    this.renderer.autoClear = this._saved.autoClear;
    this.camera.matrixAutoUpdate = this._saved.cameraMatrixAutoUpdate;
    this.camera.updateProjectionMatrix();

    this.session = null;
    this.refSpace = null;
    this.viewerSpace = null;
    this.hitTestSource = null;
    this.placed = false;

    if (this.three.updateWindowSize) {
      this.three.updateWindowSize();
    }
  };

  ARMode.prototype._onXRFrame = function (time, frame) {
    var session = frame.session;
    var self = this;

    if (!this.session || this.session !== session) {
      return;
    }

    session.requestAnimationFrame(this._onXRFrame);

    if (!this.refSpace) {
      return;
    }

    var pose = frame.getViewerPose(this.refSpace);
    if (!pose) {
      return;
    }

    var glLayer = session.renderState.baseLayer;
    if (!glLayer) {
      return;
    }

    var gl = this.renderer.getContext();
    gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);

    var view = pose.views[0];
    var viewport = glLayer.getViewport(view);
    if (viewport) {
      this.renderer.setSize(viewport.width, viewport.height, false);
      this.renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);
    }

    if (view.projectionMatrix) {
      this.camera.projectionMatrix.fromArray(view.projectionMatrix);
    }

    if (view.transform && view.transform.matrix) {
      var viewMatrix = new THREE.Matrix4();
      viewMatrix.fromArray(view.transform.matrix);
      var cameraMatrix = new THREE.Matrix4();
      cameraMatrix.getInverse(viewMatrix);
      this.camera.matrix.copy(cameraMatrix);
      this.camera.matrix.decompose(this.camera.position, this.camera.quaternion, this.camera.scale);
      this.camera.updateMatrixWorld(true);
    }

    if (this.hitTestSource && !this.placed && frame.getHitTestResults) {
      var hits = frame.getHitTestResults(this.hitTestSource);
      if (hits && hits.length > 0) {
        var hit = hits[0];
        if (hit.getPose) {
          var hitPose = hit.getPose(this.refSpace);
          if (hitPose && hitPose.transform && this.scene) {
            var t = hitPose.transform;
            var pos = t.position ? t.position : { x: 0, y: 0, z: -1 };
            this.scene.position.set(pos.x, pos.y, pos.z);
            if (t.orientation) {
              this.scene.quaternion.set(t.orientation.x, t.orientation.y, t.orientation.z, t.orientation.w);
            }
            this.placed = true;
          }
        }
      }
    }

    this.renderer.autoClear = true;
    this.renderer.render(this.scene, this.camera);
  };

  window.initBlueprintAR = function (blueprint3d) {
    var arButton = document.getElementById('enter-ar');
    if (!arButton || !blueprint3d) {
      return;
    }

    var mode = new ARMode(blueprint3d);

    mode.ensureSupportChecked(function (supported) {
      if (!supported) {
        arButton.style.display = 'none';
        return;
      }
      arButton.style.display = 'inline-block';
    });

    arButton.addEventListener('click', function (e) {
      e.preventDefault();
      if (mode.isActive()) {
        mode.stop();
        return;
      }
      mode.start();
    });

    return mode;
  };
})();

