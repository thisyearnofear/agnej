/**
 * THREE.OrbitControls - Orbit camera around a target point
 * Minimal implementation compatible with global THREE namespace
 */
(function() {
  'use strict';

  function OrbitControls(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.enabled = true;

    // Target to orbit around
    this.target = new THREE.Vector3(0, 7, 0);

    // Constraints
    this.minDistance = 15;
    this.maxDistance = 60;
    this.minPolarAngle = Math.PI / 6;
    this.maxPolarAngle = Math.PI / 2.2;

    // Damping
    this.enableDamping = true;
    this.dampingFactor = 0.08;

    // Internal state
    var spherical = new THREE.Spherical();
    var sphericalDelta = new THREE.Spherical();
    var scale = 1;
    var rotateStart = new THREE.Vector2();
    var rotateEnd = new THREE.Vector2();
    var rotateDelta = new THREE.Vector2();
    var isMouseDown = false;
    var isTouching = false;
    var touchStartDistance = 0;
    var self = this;

    // Initialize spherical from current camera position
    var offset = new THREE.Vector3().copy(camera.position).sub(this.target);
    spherical.setFromVector3(offset);

    function onPointerDown(event) {
      if (!self.enabled) return;
      if (event.button === 0) {
        isMouseDown = true;
        rotateStart.set(event.clientX, event.clientY);
      }
    }

    function onPointerMove(event) {
      if (!self.enabled || !isMouseDown) return;
      rotateEnd.set(event.clientX, event.clientY);
      rotateDelta.subVectors(rotateEnd, rotateStart);

      sphericalDelta.theta -= 2 * Math.PI * rotateDelta.x / domElement.clientHeight;
      sphericalDelta.phi -= 2 * Math.PI * rotateDelta.y / domElement.clientHeight;

      rotateStart.copy(rotateEnd);
    }

    function onPointerUp() {
      isMouseDown = false;
    }

    function onWheel(event) {
      if (!self.enabled) return;
      event.preventDefault();
      if (event.deltaY > 0) {
        scale *= 1.05;
      } else {
        scale /= 1.05;
      }
    }

    function onTouchStart(event) {
      if (!self.enabled) return;
      if (event.touches.length === 1) {
        isTouching = true;
        rotateStart.set(event.touches[0].clientX, event.touches[0].clientY);
      } else if (event.touches.length === 2) {
        var dx = event.touches[0].clientX - event.touches[1].clientX;
        var dy = event.touches[0].clientY - event.touches[1].clientY;
        touchStartDistance = Math.sqrt(dx * dx + dy * dy);
      }
    }

    function onTouchMove(event) {
      if (!self.enabled) return;
      event.preventDefault();
      if (event.touches.length === 1 && isTouching) {
        rotateEnd.set(event.touches[0].clientX, event.touches[0].clientY);
        rotateDelta.subVectors(rotateEnd, rotateStart);
        sphericalDelta.theta -= 2 * Math.PI * rotateDelta.x / domElement.clientHeight;
        sphericalDelta.phi -= 2 * Math.PI * rotateDelta.y / domElement.clientHeight;
        rotateStart.copy(rotateEnd);
      } else if (event.touches.length === 2) {
        var dx = event.touches[0].clientX - event.touches[1].clientX;
        var dy = event.touches[0].clientY - event.touches[1].clientY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (touchStartDistance > 0) {
          scale *= touchStartDistance / dist;
        }
        touchStartDistance = dist;
      }
    }

    function onTouchEnd() {
      isTouching = false;
      touchStartDistance = 0;
    }

    // Attach listeners
    domElement.addEventListener('mousedown', onPointerDown, false);
    domElement.addEventListener('mousemove', onPointerMove, false);
    domElement.addEventListener('mouseup', onPointerUp, false);
    domElement.addEventListener('mouseleave', onPointerUp, false);
    domElement.addEventListener('wheel', onWheel, { passive: false });
    domElement.addEventListener('touchstart', onTouchStart, { passive: false });
    domElement.addEventListener('touchmove', onTouchMove, { passive: false });
    domElement.addEventListener('touchend', onTouchEnd, false);
    domElement.addEventListener('contextmenu', function(e) { e.preventDefault(); }, false);

    this._listeners = {
      mousedown: onPointerDown,
      mousemove: onPointerMove,
      mouseup: onPointerUp,
      mouseleave: onPointerUp,
      wheel: onWheel,
      touchstart: onTouchStart,
      touchmove: onTouchMove,
      touchend: onTouchEnd,
    };

    this.update = function() {
      var offset = new THREE.Vector3().copy(self.camera.position).sub(self.target);
      spherical.setFromVector3(offset);

      if (self.enableDamping) {
        spherical.theta += sphericalDelta.theta * self.dampingFactor;
        spherical.phi += sphericalDelta.phi * self.dampingFactor;
      } else {
        spherical.theta += sphericalDelta.theta;
        spherical.phi += sphericalDelta.phi;
      }

      // Clamp phi
      spherical.phi = Math.max(self.minPolarAngle, Math.min(self.maxPolarAngle, spherical.phi));
      spherical.makeSafe();

      // Apply zoom
      spherical.radius *= scale;
      spherical.radius = Math.max(self.minDistance, Math.min(self.maxDistance, spherical.radius));

      offset.setFromSpherical(spherical);
      self.camera.position.copy(self.target).add(offset);
      self.camera.lookAt(self.target);

      if (self.enableDamping) {
        sphericalDelta.theta *= (1 - self.dampingFactor);
        sphericalDelta.phi *= (1 - self.dampingFactor);
      } else {
        sphericalDelta.set(0, 0, 0);
      }

      scale = 1;
    };

    this.dispose = function() {
      domElement.removeEventListener('mousedown', self._listeners.mousedown);
      domElement.removeEventListener('mousemove', self._listeners.mousemove);
      domElement.removeEventListener('mouseup', self._listeners.mouseup);
      domElement.removeEventListener('mouseleave', self._listeners.mouseleave);
      domElement.removeEventListener('wheel', self._listeners.wheel);
      domElement.removeEventListener('touchstart', self._listeners.touchstart);
      domElement.removeEventListener('touchmove', self._listeners.touchmove);
      domElement.removeEventListener('touchend', self._listeners.touchend);
    };
  }

  THREE.OrbitControls = OrbitControls;
})();
