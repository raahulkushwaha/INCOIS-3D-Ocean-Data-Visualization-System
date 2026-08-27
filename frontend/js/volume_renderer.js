/**
 * INCOIS 3D Ocean Data Visualization - Volumetric & Depth Slice Engine
 * Renders multidimensional model fields as curved spherical slices, multi-layer depth stacks, and 3D isosurfaces.
 */

class VolumeRenderer {
  constructor(sceneInstance) {
    this.scene = sceneInstance;
    this.currentSliceMesh = null;
    this.stackMeshes = [];
    this.isosurfaceMesh = null;
    this.opacity = 0.88;
    this.palette = 'turbo';
    this.isReversed = false;
    this.clampMin = null;
    this.clampMax = null;

    // Cache of current data slice
    this.cachedSliceData = null;
  }

  /**
   * Renders a 2D horizontal depth slice as a 3D spherical mesh on the ocean globe.
   */
  renderSlice(sliceData, variable = 'temperature', depthMeters = 0) {
    this.cachedSliceData = sliceData;

    // Clear previous slice
    if (this.currentSliceMesh) {
      this.scene.dataLayersGroup.remove(this.currentSliceMesh);
      if (this.currentSliceMesh.geometry) this.currentSliceMesh.geometry.dispose();
      if (this.currentSliceMesh.material) this.currentSliceMesh.material.dispose();
      this.currentSliceMesh = null;
    }

    if (!sliceData || !sliceData.grid || !sliceData.latitudes || !sliceData.longitudes) {
      return;
    }

    const lats = sliceData.latitudes;
    const lons = sliceData.longitudes;
    const grid = sliceData.grid; // 2D array [lat_idx][lon_idx]

    const nLat = lats.length;
    const nLon = lons.length;

    // Determine min/max for colormap normalization
    let minVal = Infinity, maxVal = -Infinity;
    for (let i = 0; i < nLat; i++) {
      for (let j = 0; j < nLon; j++) {
        const val = grid[i][j];
        if (val !== null && val !== undefined && !isNaN(val)) {
          if (val < minVal) minVal = val;
          if (val > maxVal) maxVal = val;
        }
      }
    }

    if (this.clampMin !== null) minVal = this.clampMin;
    if (this.clampMax !== null) maxVal = this.clampMax;
    if (maxVal <= minVal) maxVal = minVal + 1.0;

    // Build curved 3D quad grid mesh
    const positions = [];
    const colors = [];
    const indices = [];

    const vertexIndexMap = new Int32Array(nLat * nLon).fill(-1);
    let vertexCount = 0;

    for (let i = 0; i < nLat; i++) {
      const lat = lats[i];
      for (let j = 0; j < nLon; j++) {
        const lon = lons[j];
        const val = grid[i][j];

        if (val === null || val === undefined || isNaN(val)) {
          continue; // Land or missing mask
        }

        // Convert (lat, lon, depth) to 3D Vector3
        const pos = this.scene.latLonToVector3(lat, lon, depthMeters, this.scene.globeRadius + 0.15);
        positions.push(pos.x, pos.y, pos.z);

        // Normalize value and get scientific color
        const norm = (val - minVal) / (maxVal - minVal);
        const rgb = window.colormaps.getColor(norm, this.palette, this.isReversed);
        colors.push(rgb.normR, rgb.normG, rgb.normB);

        vertexIndexMap[i * nLon + j] = vertexCount++;
      }
    }

    // Build triangular faces between adjacent ocean vertices
    for (let i = 0; i < nLat - 1; i++) {
      for (let j = 0; j < nLon - 1; j++) {
        const v00 = vertexIndexMap[i * nLon + j];
        const v10 = vertexIndexMap[(i + 1) * nLon + j];
        const v01 = vertexIndexMap[i * nLon + (j + 1)];
        const v11 = vertexIndexMap[(i + 1) * nLon + (j + 1)];

        if (v00 !== -1 && v10 !== -1 && v01 !== -1 && v11 !== -1) {
          // Quad as two triangles: (v00, v10, v01) and (v01, v10, v11)
          indices.push(v00, v10, v01);
          indices.push(v01, v10, v11);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      transparent: true,
      opacity: this.opacity,
      side: THREE.DoubleSide,
      roughness: 0.5,
      metalness: 0.1
    });

    this.currentSliceMesh = new THREE.Mesh(geometry, material);
    this.currentSliceMesh.userData = {
      type: 'depth_slice',
      variable: variable,
      depth: depthMeters,
      minVal: minVal,
      maxVal: maxVal
    };

    this.scene.dataLayersGroup.add(this.currentSliceMesh);

    // Update colorbar scale UI in app
    if (window.app && window.app.updateColorbarScale) {
      window.app.updateColorbarScale(minVal, maxVal);
    }
  }

  /**
   * Generates a 3D Isosurface at a specified threshold (e.g. 28°C isotherm).
   */
  renderIsosurface(threshold = 28.0) {
    this.clearIsosurface();

    if (!this.cachedSliceData) return;

    // Create 3D wireframe / shell representation of isotherm
    const lats = this.cachedSliceData.latitudes;
    const lons = this.cachedSliceData.longitudes;
    const grid = this.cachedSliceData.grid;

    const points = [];
    for (let i = 0; i < lats.length; i++) {
      for (let j = 0; j < lons.length; j++) {
        const val = grid[i][j];
        if (val !== null && Math.abs(val - threshold) < 0.6) {
          const pos = this.scene.latLonToVector3(lats[i], lons[j], 80, this.scene.globeRadius + 0.3);
          points.push(pos.x, pos.y, pos.z);
        }
      }
    }

    if (points.length === 0) return;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffb800,
      size: 3.5,
      transparent: true,
      opacity: 0.85
    });

    this.isosurfaceMesh = new THREE.Points(geo, mat);
    this.scene.dataLayersGroup.add(this.isosurfaceMesh);
  }

  clearIsosurface() {
    if (this.isosurfaceMesh) {
      this.scene.dataLayersGroup.remove(this.isosurfaceMesh);
      if (this.isosurfaceMesh.geometry) this.isosurfaceMesh.geometry.dispose();
      this.isosurfaceMesh = null;
    }
  }

  setOpacity(val) {
    this.opacity = parseFloat(val);
    if (this.currentSliceMesh && this.currentSliceMesh.material) {
      this.currentSliceMesh.material.opacity = this.opacity;
    }
  }

  setColormap(paletteName, reversed = false) {
    this.palette = paletteName;
    this.isReversed = reversed;
    if (this.cachedSliceData) {
      this.renderSlice(this.cachedSliceData, this.cachedSliceData.variable, this.cachedSliceData.actual_depth);
    }
  }

  setClampRange(min, max) {
    this.clampMin = (min !== null && !isNaN(min)) ? parseFloat(min) : null;
    this.clampMax = (max !== null && !isNaN(max)) ? parseFloat(max) : null;
    if (this.cachedSliceData) {
      this.renderSlice(this.cachedSliceData, this.cachedSliceData.variable, this.cachedSliceData.actual_depth);
    }
  }

  setVisibility(visible) {
    if (this.currentSliceMesh) {
      this.currentSliceMesh.visible = visible;
    }
  }
}

window.VolumeRenderer = VolumeRenderer;
