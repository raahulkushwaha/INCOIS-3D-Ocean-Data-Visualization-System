/**
 * INCOIS 3D Ocean Data Visualization - In-Situ Observation Engine
 * Renders 3D Argo Floats, Glider Missions & Saw-tooth Tracks, and Moored OMNI Buoys.
 */

class ObservationsEngine {
  constructor(sceneInstance) {
    this.scene = sceneInstance;
    this.argoMarkers = [];
    this.gliderMeshes = [];
    this.buoyMeshes = [];
    this.pulseRings = [];

    this.showArgo = true;
    this.showGliders = true;
    this.showBuoys = true;

    this.selectedObjectId = null;
  }

  /**
   * Renders 3D Argo Floats with radio beacon pulses and drift trajectories.
   */
  loadArgoFloats(floats) {
    this.clearArgo();

    floats.forEach((f) => {
      const pos = this.scene.latLonToVector3(f.latitude, f.longitude, 0, this.scene.globeRadius + 0.4);

      const floatGroup = new THREE.Group();
      floatGroup.position.copy(pos);
      floatGroup.lookAt(new THREE.Vector3(0, 0, 0)); // Align with globe surface normal

      // 1. Float Body (Cylinder)
      const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.4, 16);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x00f2ff,
        emissive: 0x006688,
        roughness: 0.3,
        metalness: 0.8
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.rotation.x = Math.PI / 2;
      floatGroup.add(body);

      // 2. Flotation Collar
      const collarGeo = new THREE.TorusGeometry(0.5, 0.12, 8, 16);
      const collarMat = new THREE.MeshStandardMaterial({ color: 0xffb800, roughness: 0.4 });
      const collar = new THREE.Mesh(collarGeo, collarMat);
      floatGroup.add(collar);

      // 3. Antenna Needle
      const antGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8);
      const antMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9 });
      const antenna = new THREE.Mesh(antGeo, antMat);
      antenna.position.z = 1.0;
      antenna.rotation.x = Math.PI / 2;
      floatGroup.add(antenna);

      // 4. Pulsing Beacon Ring on Sea Surface
      const ringGeo = new THREE.RingGeometry(0.6, 0.8, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00f2ff,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      floatGroup.add(ring);

      this.pulseRings.push({ mesh: ring, baseScale: 1.0, speed: 0.04 + Math.random() * 0.02 });

      // UserData for Raycast clicking
      floatGroup.userData = {
        type: 'argo',
        id: f.id,
        name: f.name,
        data: f
      };

      this.scene.observationsGroup.add(floatGroup);
      this.argoMarkers.push(floatGroup);
      this.scene.clickableObjects.push(floatGroup);

      // 5. Render Historical Drift Trajectory Ribbon
      if (f.trajectory && f.trajectory.length > 1) {
        const trajPoints = f.trajectory.map(pt =>
          this.scene.latLonToVector3(pt.latitude, pt.longitude, 0, this.scene.globeRadius + 0.2)
        );
        const trajGeo = new THREE.BufferGeometry().setFromPoints(trajPoints);
        const trajMat = new THREE.LineBasicMaterial({
          color: 0x00f2ff,
          transparent: true,
          opacity: 0.45,
          linewidth: 2
        });
        const trajLine = new THREE.Line(trajGeo, trajMat);
        this.scene.observationsGroup.add(trajLine);
        this.argoMarkers.push(trajLine);
      }
    });
  }

  /**
   * Renders 3D Underwater Glider Missions with 3D saw-tooth dive ribbons.
   */
  loadGliders(gliders) {
    this.clearGliders();

    gliders.forEach((g) => {
      if (!g.dive_profile || g.dive_profile.length === 0) return;

      // 1. Render 3D Saw-Tooth Dive Track
      const divePoints = [];
      const colors = [];

      g.dive_profile.forEach((d) => {
        const pt = this.scene.latLonToVector3(d.latitude, d.longitude, d.depth_m, this.scene.globeRadius + 0.3);
        divePoints.push(pt);

        // Color by depth
        const depthNorm = Math.min(1.0, d.depth_m / 1000.0);
        const col = window.colormaps.getColor(depthNorm, 'plasma');
        colors.push(col.normR, col.normG, col.normB);
      });

      const trackGeo = new THREE.BufferGeometry().setFromPoints(divePoints);
      trackGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      const trackMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        linewidth: 3,
        transparent: true,
        opacity: 0.85
      });
      const trackLine = new THREE.Line(trackGeo, trackMat);
      this.scene.observationsGroup.add(trackLine);
      this.gliderMeshes.push(trackLine);

      // 2. Glider Vehicle at current position (last dive)
      const lastDive = g.dive_profile[g.dive_profile.length - 1];
      const gliderPos = this.scene.latLonToVector3(lastDive.latitude, lastDive.longitude, lastDive.depth_m, this.scene.globeRadius + 0.4);

      const gliderGroup = new THREE.Group();
      gliderGroup.position.copy(gliderPos);
      gliderGroup.lookAt(new THREE.Vector3(0, 0, 0));

      // Glider Torpedo Fuselage
      const fuseGeo = new THREE.ConeGeometry(0.4, 1.8, 12);
      const fuseMat = new THREE.MeshStandardMaterial({ color: 0xff4757, metalness: 0.7, roughness: 0.3 });
      const fuse = new THREE.Mesh(fuseGeo, fuseMat);
      fuse.rotation.x = Math.PI / 2;
      gliderGroup.add(fuse);

      // Glider Swept Wings
      const wingGeo = new THREE.BoxGeometry(2.4, 0.06, 0.4);
      const wingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8 });
      const wings = new THREE.Mesh(wingGeo, wingMat);
      gliderGroup.add(wings);

      // Glider Vertical Rudder
      const rudderGeo = new THREE.BoxGeometry(0.06, 0.6, 0.3);
      const rudder = new THREE.Mesh(rudderGeo, wingMat);
      rudder.position.set(0, 0.3, -0.6);
      gliderGroup.add(rudder);

      gliderGroup.userData = {
        type: 'glider',
        id: g.id,
        name: g.name,
        data: g
      };

      this.scene.observationsGroup.add(gliderGroup);
      this.gliderMeshes.push(gliderGroup);
      this.scene.clickableObjects.push(gliderGroup);
    });
  }

  /**
   * Renders Moored OMNI Buoy surface towers with seabed anchor cables.
   */
  loadBuoys(buoys) {
    this.clearBuoys();

    buoys.forEach((b) => {
      const pos = this.scene.latLonToVector3(b.lat, b.lon, 0, this.scene.globeRadius + 0.35);

      const buoyGroup = new THREE.Group();
      buoyGroup.position.copy(pos);
      buoyGroup.lookAt(new THREE.Vector3(0, 0, 0));

      // Buoy Hull (Yellow Disc)
      const hullGeo = new THREE.CylinderGeometry(0.7, 0.5, 0.5, 16);
      const hullMat = new THREE.MeshStandardMaterial({ color: 0xffb800, roughness: 0.4 });
      const hull = new THREE.Mesh(hullGeo, hullMat);
      hull.rotation.x = Math.PI / 2;
      buoyGroup.add(hull);

      // Mast Tower
      const mastGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
      const mastMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const mast = new THREE.Mesh(mastGeo, mastMat);
      mast.position.z = 0.8;
      mast.rotation.x = Math.PI / 2;
      buoyGroup.add(mast);

      // Weather sensor beacon light
      const lightGeo = new THREE.SphereGeometry(0.18, 8, 8);
      const lightMat = new THREE.MeshBasicMaterial({ color: 0x00e599 });
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.z = 1.4;
      buoyGroup.add(light);

      buoyGroup.userData = {
        type: 'buoy',
        id: b.id,
        name: b.name,
        data: b
      };

      this.scene.observationsGroup.add(buoyGroup);
      this.buoyMeshes.push(buoyGroup);
      this.scene.clickableObjects.push(buoyGroup);

      // Mooring Cable extending 500m into deep ocean
      const anchorPos = this.scene.latLonToVector3(b.lat, b.lon, 800, this.scene.globeRadius);
      const cableGeo = new THREE.BufferGeometry().setFromPoints([pos, anchorPos]);
      const cableMat = new THREE.LineDashedMaterial({
        color: 0xffb800,
        dashSize: 0.5,
        gapSize: 0.3,
        opacity: 0.4,
        transparent: true
      });
      const cable = new THREE.Line(cableGeo, cableMat);
      cable.computeLineDistances();
      this.scene.observationsGroup.add(cable);
      this.buoyMeshes.push(cable);
    });
  }

  updateAnimations() {
    // Pulse animation for radio beacons
    const time = performance.now() * 0.003;
    this.pulseRings.forEach((p) => {
      const scale = 1.0 + 0.6 * Math.sin(time * 2.0);
      p.mesh.scale.set(scale, scale, 1);
      p.mesh.material.opacity = 0.85 - 0.5 * (scale - 1.0) / 0.6;
    });
  }

  setArgoVisibility(val) {
    this.showArgo = val;
    this.argoMarkers.forEach(m => m.visible = val);
  }

  setGliderVisibility(val) {
    this.showGliders = val;
    this.gliderMeshes.forEach(m => m.visible = val);
  }

  setBuoyVisibility(val) {
    this.showBuoys = val;
    this.buoyMeshes.forEach(m => m.visible = val);
  }

  clearArgo() {
    this.argoMarkers.forEach(m => this.scene.observationsGroup.remove(m));
    this.argoMarkers = [];
    this.pulseRings = [];
  }

  clearGliders() {
    this.gliderMeshes.forEach(m => this.scene.observationsGroup.remove(m));
    this.gliderMeshes = [];
  }

  clearBuoys() {
    this.buoyMeshes.forEach(m => this.scene.observationsGroup.remove(m));
    this.buoyMeshes = [];
  }
}

window.ObservationsEngine = ObservationsEngine;
