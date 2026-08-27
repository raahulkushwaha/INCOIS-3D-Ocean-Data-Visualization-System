# INCOIS 3D Ocean Data Visualization System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![Three.js](https://img.shields.io/badge/Frontend-Three.js%20%2F%20WebGL-black.svg)](https://threejs.org)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://python.org)
[![xarray](https://img.shields.io/badge/Scientific-xarray%20%2F%20netCDF4-orange.svg)](https://xarray.pydata.org)

An interactive 3D oceanographic visualization and analytical comparison platform for the **Indian National Centre for Ocean Information Services (INCOIS)**.

The system integrates multi-dimensional numerical ocean model fields (ROMS/NEMO/MOM) with autonomous in-situ observational networks (Argo profiling floats, underwater gliders, moored OMNI buoys) within an interactive 3D WebGL environment.

---

## 🌊 Key Features

- **Interactive 3D WebGL Ocean Globe**: Bathymetric relief, graticule grid ($5^\circ$ lat/lon), coastlines, live coordinate raycaster, vertical exaggeration controls ($1\times$ to $30\times$), and camera bookmarks (*Arabian Sea*, *Bay of Bengal*, *Somali Jet*, *Equatorial Jet*).
- **Multi-Dimensional Ocean Model Fields**: Sub-second rendering of Temperature, Salinity, Current Speed, Chlorophyll-a, and $(u, v)$ velocity fields across 14 depth levels ($0\text{m}$ to $2000\text{m}$) from CF-compliant NetCDF datasets.
- **Animated 3D Current Streamlines**: Particle physics advection driven by $(u, v)$ velocity vectors with kinetic speed coloring.
- **In-Situ Observation Platform Integration**:
  - **Argo Floats**: 3D float geometries with pulsating radio beacons, drift trajectories, battery/cycle status, and full CTD casts.
  - **Underwater Gliders**: 3D glider vehicle models with saw-tooth dive transects ($0-1000\text{m}$).
  - **Moored OMNI Buoys**: Surface telemetry towers with deep seabed mooring cables.
- **Model vs Observation Analytical Comparison Engine (FR-14)**:
  - 4D spatial/temporal collocation between 3D model grid and in-situ Argo/Glider profiles.
  - Dual-curve depth profile chart with difference shading ($\Delta = \text{Model} - \text{Obs}$).
  - Statistical validation scorecard: **RMSE**, **Bias**, **MAE**, and **Pearson $r$**.
  - Profile export as CSV or high-resolution PNG.
- **Scientific Colorbar Engine**: Perceptually uniform palettes (*Turbo*, *Viridis*, *Plasma*, *Inferno*, *Haline*, *Thermal*, *Cool-Warm*, *Jet*) with dynamic range clamping.
- **Public Outreach & Guided Story Mode (FR-22)**: Interactive guided tours covering *Depth Layers & Thermocline*, *Argo Float 10-Day Cycle*, *Monsoon Somali Currents*, and *Bay of Bengal Barrier Layer*.
- **FastAPI Scientific Backend**: Endpoints for spatial/temporal subsetting, vertical transects, and custom NetCDF/CSV dataset ingestion.

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- Modern Web Browser (Chrome, Firefox, Edge, Safari)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/<your-username>/incois-3d-ocean.git
cd incois-3d-ocean

# Install dependencies
pip install fastapi uvicorn xarray netCDF4 numpy scipy pandas cftime python-multipart aiofiles
```

### 3. Run Application
```bash
chmod +x run.sh
./run.sh
```

Open your browser and navigate to:
👉 **`http://localhost:8000`**

---

## 🧪 Running Automated Tests

```bash
pip install pytest httpx
python3 -m pytest tests/test_backend.py -v
```

---

## 📂 Project Structure

```
.
├── backend/
│   ├── app.py                      # FastAPI REST application & static file server
│   ├── data_engine.py              # xarray & NetCDF processor, CF metadata, subsetting
│   ├── comparison_service.py       # 4D Collocation & RMSE/Bias/MAE statistics engine
│   ├── sample_data/                # CF-compliant NetCDF & in-situ datasets
│   └── adapters/                   # Extensible NetCDF and CSV ingestion adapters
├── frontend/
│   ├── index.html                  # Responsive modern oceanographic command center
│   ├── css/
│   │   ├── main.css                # Cyber-oceanic glassmorphic design system
│   │   └── components.css          # Control panels, sliders, cards, colorbars, modals
│   └── js/
│       ├── app.js                  # Main coordinator & state orchestrator
│       ├── scene.js                # Three.js 3D globe, bathymetry, graticule, raycasting
│       ├── volume_renderer.js      # 3D Depth slices, multi-curtains, isosurfaces
│       ├── flow_field.js           # Animated 3D particle streamline physics
│       ├── observations.js         # 3D Argo, Glider tracks, and Moored Buoys
│       ├── transect_renderer.js    # 3D Vertical cross-section curtain slice
│       ├── charts.js               # Dual depth profile chart & difference metrics
│       ├── colormaps.js            # Scientific color scales
│       ├── outreach.js             # Guided educational tours & story engine
│       └── api.js                  # REST API client with caching
├── docs/                           # PRD & oceanographic terminology reference
├── tests/
│   └── test_backend.py             # Pytest automated test suite
├── .gitignore                      # Git ignore rules for publishing
├── README.md                       # Documentation
└── run.sh                          # One-click startup script
```
