/**
 * INCOIS 3D Ocean Data Visualization System - Main Application Orchestrator
 * Connects 3D WebGL scenes, data engines, timeline animation, and user interface.
 */

class IncoisApp {
  constructor() {
    this.currentVariable = 'temperature';
    this.currentDepth = 0;
    this.currentTimeIdx = 0;
    this.maxTimeSteps = 5;
    this.isPlaying = false;
    this.playInterval = null;
    this.playSpeedMs = 1200;

    this.selectedObservation = null;
    this.selectedArgoId = '2902145';
    this.datasetMetadata = null;

    this.init();
  }

  async init() {
    console.log("[INCOIS App] Initializing 3D Ocean Observatory...");

    // 1. Initialize 3D Scene
    window.oceanScene = new OceanScene('viewport-3d');
    window.volumeRenderer = new VolumeRenderer(window.oceanScene);
    window.flowFieldEngine = new FlowFieldEngine(window.oceanScene);
    window.observationsEngine = new ObservationsEngine(window.oceanScene);
    window.transectRenderer = new TransectRenderer(window.oceanScene);
    window.profileChartEngine = new ProfileChartEngine('profile-chart-canvas');

    // 2. Bind DOM Event Handlers
    this.bindEvents();

    // 3. Load Initial Metadata & Observations
    try {
      this.datasetMetadata = await window.apiClient.getDatasetMetadata();
      await this.loadInitialData();
    } catch (err) {
      console.error("[INCOIS App] Error loading initial data:", err);
    }
  }

  async loadInitialData() {
    // 1. Fetch In-Situ Observations
    const [argoRes, gliderRes, buoyRes] = await Promise.all([
      window.apiClient.getArgoFloats(),
      window.apiClient.getGliders(),
      window.apiClient.getBuoys()
    ]);

    if (argoRes && argoRes.floats) {
      window.observationsEngine.loadArgoFloats(argoRes.floats);
    }
    if (gliderRes && gliderRes.gliders) {
      window.observationsEngine.loadGliders(gliderRes.gliders);
    }
    if (buoyRes && buoyRes.buoys) {
      window.observationsEngine.loadBuoys(buoyRes.buoys);
    }

    // 2. Fetch and render initial 3D ocean model slice
    await this.updateOceanSlice();

    // 3. Load initial comparison with first Argo float
    await this.loadComparison(this.selectedArgoId);

    // 4. Initial Colorbar rendering
    window.colormaps.renderColorbarToCanvas(
      document.getElementById('colorbar-canvas'),
      window.volumeRenderer.palette,
      window.volumeRenderer.isReversed
    );
  }

  async updateOceanSlice() {
    try {
      const sliceData = await window.apiClient.getSliceData(
        this.currentVariable,
        this.currentDepth,
        this.currentTimeIdx
      );

      // Render 3D depth slice
      window.volumeRenderer.renderSlice(sliceData, this.currentVariable, this.currentDepth);

      // Update Current Vector Flow Field
      window.flowFieldEngine.setVectorField(sliceData);

      // Update Timestamp HUD
      if (sliceData.timestamp) {
        const dt = new Date(sliceData.timestamp);
        const formatted = dt.toUTCString().replace("GMT", "UTC");
        const tsElem = document.getElementById('timeline-timestamp-val');
        if (tsElem) tsElem.textContent = formatted;
      }
    } catch (err) {
      console.error("[INCOIS App] Failed to update ocean slice:", err);
    }
  }

  async loadComparison(floatId) {
    this.selectedArgoId = floatId;
    try {
      const comp = await window.apiClient.getComparison(
        floatId,
        this.currentVariable,
        this.currentTimeIdx
      );

      // Render Comparison Profile Chart
      window.profileChartEngine.renderComparisonChart(comp);

      // Update Observation Telemetry Card in Right Panel
      this.updateObservationCard(comp);
    } catch (err) {
      console.error("[INCOIS App] Failed to load comparison:", err);
    }
  }

  updateObservationCard(comp) {
    const card = document.getElementById('obs-detail-card');
    if (!card) return;

    const stats = comp.statistics || {};
    const coords = comp.coordinates || {};

    card.innerHTML = `
      <div class="obs-header">
        <div class="obs-title">${comp.platform_name}</div>
        <span class="obs-badge">Active Profiler</span>
      </div>
      <div class="obs-meta-grid">
        <div class="obs-meta-item">
          <span class="obs-meta-k">WMO ID</span>
          <span class="obs-meta-v">${comp.platform_id}</span>
        </div>
        <div class="obs-meta-item">
          <span class="obs-meta-k">Region</span>
          <span class="obs-meta-v">${comp.region}</span>
        </div>
        <div class="obs-meta-item">
          <span class="obs-meta-k">Coordinates</span>
          <span class="obs-meta-v">${coords.latitude?.toFixed(2)}°N, ${coords.longitude?.toFixed(2)}°E</span>
        </div>
        <div class="obs-meta-item">
          <span class="obs-meta-k">Collocated Dist</span>
          <span class="obs-meta-v">${comp.collocated_model_grid?.grid_distance_km} km</span>
        </div>
      </div>
      <div class="stat-box">
        <div class="stat-item">
          <span class="stat-label">RMSE</span>
          <span class="stat-value">${stats.rmse} ${comp.unit}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Bias</span>
          <span class="stat-value">${stats.bias > 0 ? '+' : ''}${stats.bias} ${comp.unit}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">MAE</span>
          <span class="stat-value">${stats.mae} ${comp.unit}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Pearson r</span>
          <span class="stat-value">${stats.pearson_r}</span>
        </div>
      </div>
    `;
  }

  handleObjectClick(userData) {
    if (userData.type === 'argo') {
      this.loadComparison(userData.id);
      const pos = window.oceanScene.latLonToVector3(userData.data.latitude, userData.data.longitude, 0, 95);
      window.oceanScene.smoothCameraTween(pos, new THREE.Vector3(0, 0, 0), 800);
    } else if (userData.type === 'glider') {
      const g = userData.data;
      const card = document.getElementById('obs-detail-card');
      if (card) {
        card.innerHTML = `
          <div class="obs-header">
            <div class="obs-title">${g.name}</div>
            <span class="obs-badge" style="color:#ff4757; border-color:#ff4757;">Active AUV</span>
          </div>
          <div class="obs-meta-grid">
            <div class="obs-meta-item">
              <span class="obs-meta-k">Mission</span>
              <span class="obs-meta-v">${g.mission}</span>
            </div>
            <div class="obs-meta-item">
              <span class="obs-meta-k">Status</span>
              <span class="obs-meta-v">${g.status} (${g.speed_knots} kts)</span>
            </div>
            <div class="obs-meta-item">
              <span class="obs-meta-k">Battery</span>
              <span class="obs-meta-v">${g.battery_percent}%</span>
            </div>
            <div class="obs-meta-item">
              <span class="obs-meta-k">Sensors</span>
              <span class="obs-meta-v">${g.sensors ? g.sensors.length : 3} payloads</span>
            </div>
          </div>
        `;
      }
    }
  }

  updateHudTelemetry(lat, lon) {
    const latEl = document.getElementById('telemetry-lat');
    const lonEl = document.getElementById('telemetry-lon');
    const depthEl = document.getElementById('telemetry-depth');

    if (latEl) latEl.textContent = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
    if (lonEl) lonEl.textContent = `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;
    if (depthEl) depthEl.textContent = `${this.currentDepth} m`;
  }

  updateColorbarScale(min, max) {
    const minEl = document.getElementById('colorbar-min');
    const maxEl = document.getElementById('colorbar-max');
    const clampMinInput = document.getElementById('clamp-min-input');
    const clampMaxInput = document.getElementById('clamp-max-input');

    const unit = (this.currentVariable === 'temperature') ? '°C' :
                 (this.currentVariable === 'salinity') ? 'PSU' :
                 (this.currentVariable === 'chlorophyll') ? 'mg/m³' : 'm/s';

    if (minEl) minEl.textContent = `${min.toFixed(1)} ${unit}`;
    if (maxEl) maxEl.textContent = `${max.toFixed(1)} ${unit}`;
    if (clampMinInput && !document.activeElement.isSameNode(clampMinInput)) clampMinInput.value = min.toFixed(1);
    if (clampMaxInput && !document.activeElement.isSameNode(clampMaxInput)) clampMaxInput.value = max.toFixed(1);
  }

  setVariable(varName) {
    this.currentVariable = varName;
    document.querySelectorAll('.var-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.var === varName);
    });
    this.updateOceanSlice();
    if (this.selectedArgoId) {
      this.loadComparison(this.selectedArgoId);
    }
  }

  setDepth(depthMeters) {
    this.currentDepth = parseFloat(depthMeters);
    const display = document.getElementById('depth-val-display');
    const slider = document.getElementById('depth-slider');
    if (display) display.textContent = `${this.currentDepth} m`;
    if (slider) slider.value = this.currentDepth;

    document.querySelectorAll('.depth-btn').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.depth) === this.currentDepth);
    });

    this.updateOceanSlice();
  }

  setTimeStep(idx) {
    this.currentTimeIdx = Math.max(0, Math.min(idx, this.maxTimeSteps - 1));
    const slider = document.getElementById('timeline-slider');
    if (slider) slider.value = this.currentTimeIdx;
    this.updateOceanSlice();
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    const playBtn = document.getElementById('btn-play-pause');
    if (playBtn) playBtn.innerHTML = this.isPlaying ? '❚❚' : '▶';

    if (this.isPlaying) {
      this.playInterval = setInterval(() => {
        let nextIdx = (this.currentTimeIdx + 1) % this.maxTimeSteps;
        this.setTimeStep(nextIdx);
      }, this.playSpeedMs);
    } else {
      if (this.playInterval) clearInterval(this.playInterval);
    }
  }

  setPlaybackSpeed(speedMultiplier) {
    document.querySelectorAll('.speed-chip').forEach(c => {
      c.classList.toggle('active', parseFloat(c.dataset.speed) === speedMultiplier);
    });
    this.playSpeedMs = 1200 / speedMultiplier;
    if (this.isPlaying) {
      this.togglePlay();
      this.togglePlay();
    }
  }

  exportScreenshot() {
    if (!window.oceanScene || !window.oceanScene.renderer) return;
    window.oceanScene.renderer.render(window.oceanScene.scene, window.oceanScene.camera);
    const dataUrl = window.oceanScene.renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = `INCOIS_3D_Ocean_${Date.now()}.png`;
    a.href = dataUrl;
    a.click();
  }

  bindEvents() {
    // Variable Selection Pills
    document.querySelectorAll('.var-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.setVariable(pill.dataset.var);
      });
    });

    // Depth Slider & Preset Buttons
    const depthSlider = document.getElementById('depth-slider');
    if (depthSlider) {
      depthSlider.addEventListener('input', (e) => {
        this.setDepth(e.target.value);
      });
    }

    document.querySelectorAll('.depth-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setDepth(btn.dataset.depth);
      });
    });

    // Timeline Slider & Controls
    const timeSlider = document.getElementById('timeline-slider');
    if (timeSlider) {
      timeSlider.addEventListener('input', (e) => {
        this.setTimeStep(parseInt(e.target.value));
      });
    }

    const playBtn = document.getElementById('btn-play-pause');
    if (playBtn) playBtn.addEventListener('click', () => this.togglePlay());

    const prevStepBtn = document.getElementById('btn-step-prev');
    if (prevStepBtn) prevStepBtn.addEventListener('click', () => this.setTimeStep(this.currentTimeIdx - 1));

    const nextStepBtn = document.getElementById('btn-step-next');
    if (nextStepBtn) nextStepBtn.addEventListener('click', () => this.setTimeStep(this.currentTimeIdx + 1));

    document.querySelectorAll('.speed-chip').forEach(c => {
      c.addEventListener('click', () => this.setPlaybackSpeed(parseFloat(c.dataset.speed)));
    });

    // Colorbar Palette Selector
    const paletteSel = document.getElementById('palette-selector');
    if (paletteSel) {
      paletteSel.addEventListener('change', (e) => {
        window.volumeRenderer.setColormap(e.target.value, false);
        window.colormaps.renderColorbarToCanvas(
          document.getElementById('colorbar-canvas'),
          e.target.value,
          false
        );
      });
    }

    // Clamp Inputs
    const clampMinInput = document.getElementById('clamp-min-input');
    const clampMaxInput = document.getElementById('clamp-max-input');
    const applyClamp = () => {
      window.volumeRenderer.setClampRange(clampMinInput.value, clampMaxInput.value);
    };
    if (clampMinInput) clampMinInput.addEventListener('change', applyClamp);
    if (clampMaxInput) clampMaxInput.addEventListener('change', applyClamp);

    // Layer Toggles
    const toggleLayer = (id, callback) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', (e) => callback(e.target.checked));
    };

    toggleLayer('layer-model-toggle', (v) => window.volumeRenderer.setVisibility(v));
    toggleLayer('layer-flow-toggle', (v) => window.flowFieldEngine.setVisibility(v));
    toggleLayer('layer-argo-toggle', (v) => window.observationsEngine.setArgoVisibility(v));
    toggleLayer('layer-glider-toggle', (v) => window.observationsEngine.setGliderVisibility(v));
    toggleLayer('layer-buoy-toggle', (v) => window.observationsEngine.setBuoyVisibility(v));

    // 3D Vertical Transect Layer Toggle
    toggleLayer('layer-transect-toggle', async (v) => {
      if (v) {
        const transect = await window.apiClient.getTransect('latitudinal', 15.0, this.currentTimeIdx);
        window.transectRenderer.renderTransect(transect, this.currentVariable);
      } else {
        window.transectRenderer.clear();
      }
    });

    // 3D Isosurface Toggle
    toggleLayer('layer-isosurface-toggle', (v) => {
      if (v) {
        const thresh = (this.currentVariable === 'temperature') ? 28.0 : 35.5;
        window.volumeRenderer.renderIsosurface(thresh);
      } else {
        window.volumeRenderer.clearIsosurface();
      }
    });

    // Opacity Sliders
    const modelOpacity = document.getElementById('layer-model-opacity');
    if (modelOpacity) {
      modelOpacity.addEventListener('input', (e) => window.volumeRenderer.setOpacity(e.target.value));
    }

    // Vertical Exaggeration Slider
    const vertExag = document.getElementById('vertical-exag-slider');
    if (vertExag) {
      vertExag.addEventListener('input', (e) => {
        window.oceanScene.verticalExaggeration = parseFloat(e.target.value);
        this.updateOceanSlice();
      });
    }

    // Bookmarks
    document.querySelectorAll('.bookmark-chip').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.bookmark-chip').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        window.oceanScene.flyToBookmark(b.dataset.bookmark);
      });
    });

    // Outreach Tour Buttons
    document.querySelectorAll('.outreach-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        window.outreachStoryEngine.startTour(btn.dataset.tour);
      });
    });

    const outreachNext = document.getElementById('outreach-next-btn');
    if (outreachNext) outreachNext.addEventListener('click', () => window.outreachStoryEngine.nextStep());

    const outreachPrev = document.getElementById('outreach-prev-btn');
    if (outreachPrev) outreachPrev.addEventListener('click', () => window.outreachStoryEngine.prevStep());

    const outreachClose = document.getElementById('outreach-modal-close');
    if (outreachClose) outreachClose.addEventListener('click', () => window.outreachStoryEngine.closeModal());

    // Export Buttons
    const btnScreenshot = document.getElementById('btn-export-screenshot');
    if (btnScreenshot) btnScreenshot.addEventListener('click', () => this.exportScreenshot());

    const btnExportChart = document.getElementById('btn-export-chart-png');
    if (btnExportChart) btnExportChart.addEventListener('click', () => window.profileChartEngine.exportAsPNG());

    const btnExportCsv = document.getElementById('btn-export-chart-csv');
    if (btnExportCsv) btnExportCsv.addEventListener('click', () => window.profileChartEngine.exportAsCSV());

    // Upload Dataset Modal
    const btnOpenUpload = document.getElementById('btn-open-upload');
    const uploadModal = document.getElementById('upload-modal');
    const uploadClose = document.getElementById('upload-modal-close');
    const uploadForm = document.getElementById('upload-form');

    if (btnOpenUpload && uploadModal) btnOpenUpload.addEventListener('click', () => uploadModal.classList.add('open'));
    if (uploadClose && uploadModal) uploadClose.addEventListener('click', () => uploadModal.classList.remove('open'));

    if (uploadForm) {
      uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('upload-file-input');
        if (!fileInput || !fileInput.files[0]) return;

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        try {
          const res = await window.apiClient.uploadDataset(formData);
          alert(res.message || "Dataset uploaded successfully!");
          if (uploadModal) uploadModal.classList.remove('open');
        } catch (err) {
          alert("Error uploading dataset: " + err.message);
        }
      });
    }
  }
}

// Instantiate application on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new IncoisApp();
});
