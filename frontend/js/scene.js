/**
 * INCOIS 3D Ocean Data Visualization - Three.js 3D Ocean Scene & Globe
 * Manages 3D globe, bathymetry, graticule grids, camera controls, coordinate conversions, and bookmarks.
 */

class OceanScene {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.globeRadius = 60.0; // Base Earth radius in Three.js units
    this.verticalExaggeration = 5.0;
    this.viewMode = 'globe'; // 'globe' or 'domain_box'

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.globeGroup = new THREE.Group();
    this.dataLayersGroup = new THREE.Group();
    this.observationsGroup = new THREE.Group();
    this.flowGroup = new THREE.Group();
    this.transectGroup = new THREE.Group();

    this.clickableObjects = [];
    this.init();
  }

  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x040814);
    this.scene.fog = new THREE.FogExp2(0x040814, 0.0015);

    // 2. Camera setup
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 3000);
    // Initial camera position focused on Indian Ocean (Lat 10N, Lon 75E)
    this.camera.position.set(50, 45, 130);

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, logarithmicDepthBuffer: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 65;
    this.controls.maxDistance = 600;
    this.controls.target.set(0, 0, 0);

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xd0e6ff, 0.85);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(150, 100, 150);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00f2ff, 0.4);
    dirLight2.position.set(-150, -50, -150);
    this.scene.add(dirLight2);

    // 6. Add Groups to Scene
    this.scene.add(this.globeGroup);
    this.scene.add(this.dataLayersGroup);
    this.scene.add(this.observationsGroup);
    this.scene.add(this.flowGroup);
    this.scene.add(this.transectGroup);

    // 7. Build 3D Globe & Ocean Bathymetry
    this.buildGlobe();
    this.buildGraticuleGrid();
    this.buildCoastlinesAndBoundaries();
    this.buildAtmosphereGlow();

    // 8. Event Listeners
    window.addEventListener('resize', () => this.onWindowResize());
    this.container.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.container.addEventListener('click', (e) => this.onClick(e));

    this.animate();
  }

  buildGlobe() {
    // Inner Earth core & ocean bathymetry base sphere
    const globeGeo = new THREE.SphereGeometry(this.globeRadius, 96, 96);
    
    // Canvas procedural bathymetric texture
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Deep ocean base
    ctx.fillStyle = '#061325';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw continental outlines (procedural high-contrast world map for ocean focus)
    this.drawContinentsOnCanvas(ctx, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const globeMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
      metalness: 0.1,
      bumpScale: 0.05
    });

    this.globeMesh = new THREE.Mesh(globeGeo, globeMat);
    this.globeGroup.add(this.globeMesh);
  }

  drawContinentsOnCanvas(ctx, w, h) {
    // Fill continents with deep slate `#0d1f38` and coastlines `#1a3b68`
    ctx.fillStyle = '#0c1b30';
    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 1.5;

    // Coordinate conversion helper: Lon (-180 to 180) -> X (0 to w), Lat (-90 to 90) -> Y (h to 0)
    const toCanvas = (lat, lon) => {
      const x = ((lon + 180) / 360) * w;
      const y = ((90 - lat) / 180) * h;
      return [x, y];
    };

    // Draw Indian Subcontinent
    ctx.beginPath();
    const indiaPoly = [
      [8.0, 77.5], [8.5, 76.9], [10.0, 75.8], [12.0, 75.0], [15.0, 73.8],
      [19.0, 72.8], [21.0, 72.5], [23.0, 69.0], [24.5, 68.2], [28.0, 70.0],
      [32.0, 75.0], [35.0, 77.0], [32.0, 80.0], [28.0, 84.0], [27.0, 88.5],
      [26.0, 92.0], [24.0, 91.5], [22.0, 89.5], [21.5, 87.0], [19.8, 85.8],
      [17.5, 83.2], [15.8, 80.5], [13.1, 80.3], [10.8, 79.8], [9.3, 79.2],
      [8.0, 77.5]
    ];
    let start = toCanvas(indiaPoly[0][0], indiaPoly[0][1]);
    ctx.moveTo(start[0], start[1]);
    for (let i = 1; i < indiaPoly.length; i++) {
      const pt = toCanvas(indiaPoly[i][0], indiaPoly[i][1]);
      ctx.lineTo(pt[0], pt[1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sri Lanka
    ctx.beginPath();
    const slPoly = [[9.8, 80.2], [8.0, 79.8], [6.0, 80.5], [6.0, 81.8], [8.5, 81.2], [9.8, 80.2]];
    start = toCanvas(slPoly[0][0], slPoly[0][1]);
    ctx.moveTo(start[0], start[1]);
    for (let i = 1; i < slPoly.length; i++) {
      const pt = toCanvas(slPoly[i][0], slPoly[i][1]);
      ctx.lineTo(pt[0], pt[1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Arabian Peninsula
    ctx.beginPath();
    const arabiaPoly = [
      [12.5, 43.5], [15.0, 52.0], [17.0, 55.0], [22.5, 59.8], [26.0, 56.5],
      [25.0, 51.5], [30.0, 48.0], [31.5, 36.0], [27.5, 35.0], [22.0, 39.0],
      [13.0, 43.0]
    ];
    start = toCanvas(arabiaPoly[0][0], arabiaPoly[0][1]);
    ctx.moveTo(start[0], start[1]);
    for (let i = 1; i < arabiaPoly.length; i++) {
      const pt = toCanvas(arabiaPoly[i][0], arabiaPoly[i][1]);
      ctx.lineTo(pt[0], pt[1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // East Africa Coast
    ctx.beginPath();
    const africaPoly = [
      [12.0, 51.0], [10.0, 44.0], [2.0, 45.0], [-5.0, 39.0], [-15.0, 40.5],
      [-25.0, 33.0], [-34.0, 26.0], [-34.0, 18.0], [-15.0, 12.0], [0.0, 9.0],
      [10.0, 14.0], [12.0, 43.0], [12.0, 51.0]
    ];
    start = toCanvas(africaPoly[0][0], africaPoly[0][1]);
    ctx.moveTo(start[0], start[1]);
    for (let i = 1; i < africaPoly.length; i++) {
      const pt = toCanvas(africaPoly[i][0], africaPoly[i][1]);
      ctx.lineTo(pt[0], pt[1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Southeast Asia & Indonesia
    ctx.beginPath();
    const seaPoly = [
      [22.0, 92.0], [16.0, 96.0], [10.0, 98.5], [1.5, 104.0], [-6.0, 106.0],
      [-8.0, 115.0], [-8.5, 125.0], [0.0, 130.0], [6.0, 117.0], [14.0, 108.0],
      [20.0, 106.0], [22.0, 92.0]
    ];
    start = toCanvas(seaPoly[0][0], seaPoly[0][1]);
    ctx.moveTo(start[0], start[1]);
    for (let i = 1; i < seaPoly.length; i++) {
      const pt = toCanvas(seaPoly[i][0], seaPoly[i][1]);
      ctx.lineTo(pt[0], pt[1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Australia outline
    ctx.beginPath();
    const ausPoly = [
      [-12.0, 131.0], [-15.0, 124.0], [-22.0, 114.0], [-32.0, 116.0], [-35.0, 135.0],
      [-38.0, 145.0], [-28.0, 153.0], [-18.0, 146.0], [-11.0, 142.0], [-12.0, 131.0]
    ];
    start = toCanvas(ausPoly[0][0], ausPoly[0][1]);
    ctx.moveTo(start[0], start[1]);
    for (let i = 1; i < ausPoly.length; i++) {
      const pt = toCanvas(ausPoly[i][0], ausPoly[i][1]);
      ctx.lineTo(pt[0], pt[1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  buildGraticuleGrid() {
    // 3D Lat/Lon Graticule lines on the ocean globe
    const r = this.globeRadius + 0.05;
    const graticuleMat = new THREE.LineBasicMaterial({
      color: 0x00f2ff,
      transparent: true,
      opacity: 0.12
    });

    const equatorMat = new THREE.LineBasicMaterial({
      color: 0x00f2ff,
      transparent: true,
      opacity: 0.4,
      linewidth: 2
    });

    // Latitude parallels every 10 deg
    for (let lat = -80; lat <= 80; lat += 10) {
      const phi = (90 - lat) * (Math.PI / 180);
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      const points = [];

      for (let lon = -180; lon <= 180; lon += 5) {
        const theta = (lon + 180) * (Math.PI / 180);
        const x = -r * sinPhi * Math.cos(theta);
        const z = r * sinPhi * Math.sin(theta);
        const y = r * cosPhi;
        points.push(new THREE.Vector3(x, y, z));
      }

      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, lat === 0 ? equatorMat : graticuleMat);
      this.globeGroup.add(line);
    }

    // Longitude meridians every 15 deg
    for (let lon = -180; lon < 180; lon += 15) {
      const theta = (lon + 180) * (Math.PI / 180);
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      const points = [];

      for (let lat = -90; lat <= 90; lat += 5) {
        const phi = (90 - lat) * (Math.PI / 180);
        const x = -r * Math.sin(phi) * cosTheta;
        const z = r * Math.sin(phi) * sinTheta;
        const y = r * Math.cos(phi);
        points.push(new THREE.Vector3(x, y, z));
      }

      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, graticuleMat);
      this.globeGroup.add(line);
    }
  }

  buildCoastlinesAndBoundaries() {
    // INCOIS High-Priority Operational EEZ / Observation Domain Bounding Wire
    // Domain: 55E to 100E, 10S to 25N
    const r = this.globeRadius + 0.12;
    const domainPoints = [];
    const minLat = -10.0, maxLat = 25.0, minLon = 55.0, maxLon = 100.0;

    for (let lon = minLon; lon <= maxLon; lon += 2) domainPoints.push(this.latLonToVector3(maxLat, lon, 0, r));
    for (let lat = maxLat; lat >= minLat; lat -= 2) domainPoints.push(this.latLonToVector3(lat, maxLon, 0, r));
    for (let lon = maxLon; lon >= minLon; lon -= 2) domainPoints.push(this.latLonToVector3(minLat, lon, 0, r));
    for (let lat = minLat; lat <= maxLat; lat += 2) domainPoints.push(this.latLonToVector3(lat, minLon, 0, r));

    const domainGeo = new THREE.BufferGeometry().setFromPoints(domainPoints);
    const domainMat = new THREE.LineBasicMaterial({
      color: 0x00f2ff,
      transparent: true,
      opacity: 0.6,
      linewidth: 2
    });
    const domainLine = new THREE.Line(domainGeo, domainMat);
    this.globeGroup.add(domainLine);
  }

  buildAtmosphereGlow() {
    // Subtle outer atmospheric haze
    const atmosGeo = new THREE.SphereGeometry(this.globeRadius * 1.025, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
          gl_FragColor = vec4(0.0, 0.95, 1.0, 1.0) * intensity * 0.35;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true
    });
    const atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
    this.globeGroup.add(atmosphere);
  }

  /**
   * Converts (latitude, longitude, depth_meters) to 3D Cartesian coordinates (x, y, z)
   */
  latLonToVector3(lat, lon, depthMeters = 0, customRadius = null) {
    // Radial depth offset with vertical exaggeration
    const depthOffset = (depthMeters / 2000.0) * (this.verticalExaggeration * 0.8);
    const r = (customRadius !== null ? customRadius : this.globeRadius) - depthOffset;

    const phi = (90.0 - lat) * (Math.PI / 180.0);
    const theta = (lon + 180.0) * (Math.PI / 180.0);

    const x = -r * Math.sin(phi) * Math.cos(theta);
    const z = r * Math.sin(phi) * Math.sin(theta);
    const y = r * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
  }

  /**
   * Converts 3D Vector3 Cartesian coordinate back to (latitude, longitude)
   */
  vector3ToLatLon(vec) {
    const norm = vec.clone().normalize();
    const lat = 90.0 - Math.acos(norm.y) * (180.0 / Math.PI);
    let lon = Math.atan2(norm.z, -norm.x) * (180.0 / Math.PI) - 180.0;
    if (lon < -180) lon += 360;
    if (lon > 180) lon -= 360;
    return { lat, lon };
  }

  flyToBookmark(bookmarkName) {
    const presets = {
      arabian_sea: { lat: 16.0, lon: 65.0, distance: 95, duration: 1000 },
      bay_of_bengal: { lat: 15.0, lon: 88.0, distance: 95, duration: 1000 },
      somali_jet: { lat: 8.0, lon: 55.0, distance: 90, duration: 1000 },
      equatorial_jet: { lat: 0.0, lon: 80.0, distance: 100, duration: 1000 },
      indian_ocean_overview: { lat: 8.0, lon: 75.0, distance: 155, duration: 1000 },
      global_view: { lat: 10.0, lon: 70.0, distance: 230, duration: 1200 }
    };

    const target = presets[bookmarkName] || presets.indian_ocean_overview;
    const targetPos = this.latLonToVector3(target.lat, target.lon, 0, target.distance);

    this.smoothCameraTween(targetPos, new THREE.Vector3(0, 0, 0), target.duration);
  }

  smoothCameraTween(endPos, endTarget, durationMs = 800) {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = performance.now();

    const updateTween = () => {
      const now = performance.now();
      const elapsed = (now - startTime) / durationMs;
      const t = Math.min(1.0, elapsed);
      // Smooth easeInOutCubic
      const ease = t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

      this.camera.position.lerpVectors(startPos, endPos, ease);
      this.controls.target.lerpVectors(startTarget, endTarget, ease);

      if (t < 1.0) {
        requestAnimationFrame(updateTween);
      }
    };
    updateTween();
  }

  onMouseMove(event) {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast on globe surface for HUD coordinate display
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.globeMesh);

    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;
      const coords = this.vector3ToLatLon(hitPoint);
      if (window.app && window.app.updateHudTelemetry) {
        window.app.updateHudTelemetry(coords.lat, coords.lon);
      }
    }
  }

  onClick(event) {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.clickableObjects, true);

    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && !obj.userData.type && obj.parent) {
        obj = obj.parent;
      }
      if (obj && obj.userData && obj.userData.type) {
        if (window.app && window.app.handleObjectClick) {
          window.app.handleObjectClick(obj.userData);
        }
      }
    }
  }

  onWindowResize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();

    // Pulse effects on observation markers & current particles
    if (window.observationsEngine) {
      window.observationsEngine.updateAnimations();
    }
    if (window.flowFieldEngine) {
      window.flowFieldEngine.updateParticles();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.OceanScene = OceanScene;
