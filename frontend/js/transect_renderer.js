/**
 * INCOIS 3D Ocean Data Visualization - Vertical Transect Curtain Renderer
 * Renders 3D vertical cross-section curtains (Lat-Depth and Lon-Depth) through the ocean water column.
 */

class TransectRenderer {
  constructor(sceneInstance) {
    this.scene = sceneInstance;
    this.curtainMesh = null;
    this.visible = false;
  }

  renderTransect(transectData, variable = 'temperature') {
    this.clear();

    if (!transectData || !transectData.depths || !transectData.axis_coords) return;

    const depths = transectData.depths;
    const coords = transectData.axis_coords;
    const fixedCoord = transectData.fixed_coordinate;
    const isLatitudinal = transectData.transect_type === 'latitudinal';

    const curtainData = (variable === 'salinity') ? transectData.salinity_curtain : transectData.temperature_curtain;
    if (!curtainData) return;

    const nDepth = depths.length;
    const nCoord = coords.length;

    // Find min/max
    let minVal = Infinity, maxVal = -Infinity;
    for (let d = 0; d < nDepth; d++) {
      for (let c = 0; c < nCoord; c++) {
        const val = curtainData[d][c];
        if (val !== null && val !== undefined && !isNaN(val)) {
          if (val < minVal) minVal = val;
          if (val > maxVal) maxVal = val;
        }
      }
    }
    if (maxVal <= minVal) maxVal = minVal + 1.0;

    const positions = [];
    const colors = [];
    const indices = [];

    const vertexMap = new Int32Array(nDepth * nCoord).fill(-1);
    let vCount = 0;

    for (let d = 0; d < nDepth; d++) {
      const depth_m = depths[d];
      for (let c = 0; c < nCoord; c++) {
        const val = curtainData[d][c];
        if (val === null || val === undefined || isNaN(val)) continue;

        const lat = isLatitudinal ? fixedCoord : coords[c];
        const lon = isLatitudinal ? coords[c] : fixedCoord;

        // Calculate 3D Cartesian vertex at this (lat, lon, depth)
        const pos = this.scene.latLonToVector3(lat, lon, depth_m, this.scene.globeRadius);
        positions.push(pos.x, pos.y, pos.z);

        // Normalize color
        const norm = (val - minVal) / (maxVal - minVal);
        const col = window.colormaps.getColor(norm, 'turbo');
        colors.push(col.normR, col.normG, col.normB);

        vertexMap[d * nCoord + c] = vCount++;
      }
    }

    // Build faces
    for (let d = 0; d < nDepth - 1; d++) {
      for (let c = 0; c < nCoord - 1; c++) {
        const v00 = vertexMap[d * nCoord + c];
        const v10 = vertexMap[(d + 1) * nCoord + c];
        const v01 = vertexMap[d * nCoord + (c + 1)];
        const v11 = vertexMap[(d + 1) * nCoord + (c + 1)];

        if (v00 !== -1 && v10 !== -1 && v01 !== -1 && v11 !== -1) {
          indices.push(v00, v10, v01);
          indices.push(v01, v10, v11);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      roughness: 0.4
    });

    this.curtainMesh = new THREE.Mesh(geo, mat);
    this.scene.transectGroup.add(this.curtainMesh);
    this.visible = true;
  }

  clear() {
    if (this.curtainMesh) {
      this.scene.transectGroup.remove(this.curtainMesh);
      if (this.curtainMesh.geometry) this.curtainMesh.geometry.dispose();
      if (this.curtainMesh.material) this.curtainMesh.material.dispose();
      this.curtainMesh = null;
    }
  }

  setVisibility(val) {
    this.visible = val;
    if (this.curtainMesh) {
      this.curtainMesh.visible = val;
    }
  }
}

window.TransectRenderer = TransectRenderer;
