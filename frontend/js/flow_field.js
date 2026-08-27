/**
 * INCOIS 3D Ocean Data Visualization - Ocean Current Flow Field Engine
 * Simulates and renders animated 3D particle streamlines driven by (u, v) current velocity vectors.
 */

class FlowFieldEngine {
  constructor(sceneInstance) {
    this.scene = sceneInstance;
    this.maxParticles = 2500;
    this.particleSpeed = 1.2;
    this.visible = true;

    this.particles = [];
    this.particleMesh = null;
    this.uField = null;
    this.vField = null;
    this.lats = null;
    this.lons = null;
    this.currentDepth = 0;

    this.initParticleSystem();
  }

  initParticleSystem() {
    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);

    this.particleData = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particleData.push({
        lat: 0,
        lon: 0,
        age: Math.random() * 100,
        maxAge: 80 + Math.random() * 60,
        speed: 0,
        active: false
      });
      // Initial dummy positions
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      colors[i * 3] = 0.0;
      colors[i * 3 + 1] = 0.95;
      colors[i * 3 + 2] = 1.0;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Custom circle point texture for smooth particles
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 2, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.4, 'rgba(0, 242, 255, 0.8)');
    grad.addColorStop(1, 'rgba(0, 242, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(16, 16, 16, 0, Math.PI * 2);
    ctx.fill();

    const particleTexture = new THREE.CanvasTexture(canvas);

    this.material = new THREE.PointsMaterial({
      size: 4.5,
      map: particleTexture,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particleMesh = new THREE.Points(this.geometry, this.material);
    this.scene.flowGroup.add(this.particleMesh);
  }

  setVectorField(sliceData) {
    if (!sliceData || !sliceData.u_field || !sliceData.v_field) return;

    this.uField = sliceData.u_field;
    this.vField = sliceData.v_field;
    this.lats = sliceData.latitudes;
    this.lons = sliceData.longitudes;
    this.currentDepth = sliceData.actual_depth || 0;

    // Reset particles randomly across valid ocean domain
    for (let i = 0; i < this.maxParticles; i++) {
      this.resetParticle(this.particleData[i]);
    }
  }

  resetParticle(p) {
    if (!this.lats || !this.lons) return;

    const minLat = this.lats[0];
    const maxLat = this.lats[this.lats.length - 1];
    const minLon = this.lons[0];
    const maxLon = this.lons[this.lons.length - 1];

    p.lat = minLat + Math.random() * (maxLat - minLat);
    p.lon = minLon + Math.random() * (maxLon - minLon);
    p.age = 0;
    p.maxAge = 60 + Math.random() * 80;
    p.active = true;
  }

  getVelocityAt(lat, lon) {
    if (!this.uField || !this.vField || !this.lats || !this.lons) return { u: 0, v: 0, speed: 0 };

    const minLat = this.lats[0];
    const maxLat = this.lats[this.lats.length - 1];
    const minLon = this.lons[0];
    const maxLon = this.lons[this.lons.length - 1];

    if (lat < minLat || lat > maxLat || lon < minLon || lon > maxLon) {
      return { u: 0, v: 0, speed: 0, outOfBounds: true };
    }

    const latIdx = Math.round(((lat - minLat) / (maxLat - minLat)) * (this.lats.length - 1));
    const lonIdx = Math.round(((lon - minLon) / (maxLon - minLon)) * (this.lons.length - 1));

    const u = this.uField[latIdx] ? this.uField[latIdx][lonIdx] : null;
    const v = this.vField[latIdx] ? this.vField[latIdx][lonIdx] : null;

    if (u === null || v === null || isNaN(u) || isNaN(v)) {
      return { u: 0, v: 0, speed: 0, land: true };
    }

    const speed = Math.sqrt(u * u + v * v);
    return { u, v, speed };
  }

  updateParticles() {
    if (!this.visible || !this.uField || !this.particleMesh) return;

    const positions = this.geometry.attributes.position.array;
    const colors = this.geometry.attributes.color.array;

    const dt = 0.05 * this.particleSpeed;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particleData[i];

      if (!p.active || p.age >= p.maxAge) {
        this.resetParticle(p);
      }

      const vel = this.getVelocityAt(p.lat, p.lon);

      if (vel.land || vel.outOfBounds || vel.speed < 0.005) {
        this.resetParticle(p);
        continue;
      }

      // Advect particle along velocity vector
      // 1 deg latitude is ~111 km, 1 deg lon is ~111 * cos(lat)
      const latScale = 1.0 / 111000.0;
      const lonScale = 1.0 / (111000.0 * Math.cos(p.lat * Math.PI / 180.0));

      p.lat += vel.v * latScale * 8000.0 * dt;
      p.lon += vel.u * lonScale * 8000.0 * dt;
      p.age++;

      // Compute 3D Cartesian position
      const vec3 = this.scene.latLonToVector3(p.lat, p.lon, this.currentDepth, this.scene.globeRadius + 0.35);

      positions[i * 3] = vec3.x;
      positions[i * 3 + 1] = vec3.y;
      positions[i * 3 + 2] = vec3.z;

      // Dynamic color based on current speed (cyan -> emerald -> amber -> coral)
      const speedNorm = Math.min(1.0, vel.speed / 1.2);
      const color = window.colormaps.getColor(speedNorm, 'turbo');

      // Fade out at start and end of particle life
      const lifeFrac = p.age / p.maxAge;
      const alpha = Math.sin(lifeFrac * Math.PI);

      colors[i * 3] = color.normR * alpha;
      colors[i * 3 + 1] = color.normG * alpha;
      colors[i * 3 + 2] = color.normB * alpha;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  setSpeed(speedVal) {
    this.particleSpeed = parseFloat(speedVal);
  }

  setDensity(count) {
    this.maxParticles = Math.min(parseInt(count), this.particleData.length);
  }

  setVisibility(visible) {
    this.visible = visible;
    if (this.particleMesh) {
      this.particleMesh.visible = visible;
    }
  }
}

window.FlowFieldEngine = FlowFieldEngine;
