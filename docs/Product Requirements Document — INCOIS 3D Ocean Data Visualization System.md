# Product Requirements Document (PRD)

## INCOIS 3D Ocean Data Visualization System

**Document Version:** 1.0  
**Date:** August 2026  
**Product Type:** Web-based Scientific Visualization Platform  
**Primary Organization:** Indian National Centre for Ocean Information Services (INCOIS)  
**Target Users:** Operational oceanographers, forecasters, researchers, analysts, educators, policymakers, and the public

---

# 1. Executive Summary

The INCOIS 3D Ocean Data Visualization System is a browser-native, interactive 3D platform designed to integrate and visualize **ocean model outputs and in-situ observations** within a single environment.

The platform will allow users to explore three-dimensional ocean variables such as **temperature, salinity, current velocity, chlorophyll, and other biogeochemical parameters**, while simultaneously displaying observations from **Argo floats, underwater gliders, CTDs, BGC sensors, and future observation platforms**.

The system will transform complex multidimensional ocean datasets into an intuitive visual interface featuring:

- 3D volumetric visualization
- Depth slices
- Isosurfaces
- Current-vector visualization
- Time animation
- Interactive observation markers
- Depth-vs-variable profile charts
- Dynamic colorbars
- Variable and layer controls
- Model-versus-observation comparison
- Multi-format data ingestion
- Extensible sensor and model plugins

The primary objective is to reduce the time required for oceanographers to move from **raw data → visual interpretation → operational insight**.

A secondary objective is to provide an accessible science-communication interface through which students, educators, policymakers, and the general public can explore ocean conditions visually.

---

# 2. Background & Problem Statement

India has a vast Exclusive Economic Zone (EEZ) and coastline requiring continuous monitoring of ocean conditions.

INCOIS generates and archives large volumes of oceanographic information, including:

- Temperature fields
- Salinity fields
- Current vectors
- Chlorophyll
- Biogeochemical variables
- Numerical ocean model outputs
- Argo observations
- Glider observations
- CTD measurements
- BGC observations

These datasets commonly exist as **NetCDF, ASCII, and delimited text files**, containing multiple spatial dimensions, depth levels, and time steps.

Despite the availability of rich data, users often need to work with multiple visualization and analysis tools.

### Current problems

1. Model outputs and observations are often viewed separately.
2. Existing visualization tools may be desktop-oriented.
3. Many systems primarily provide 2D geographic views.
4. Depth-resolved 3D exploration is difficult.
5. Model predictions cannot be easily compared with observations.
6. Changing variables, depth levels, and time steps requires multiple workflows.
7. Adding new datasets can require significant engineering work.
8. Non-specialists have difficulty understanding multidimensional ocean data.

This creates unnecessary friction for operational oceanographers and limits the speed at which information can be interpreted.

---

# 3. Product Vision

> **Create a single interactive 3D window into the ocean where model predictions and real-world observations can be explored together across space, depth, and time.**

The system should make multidimensional ocean data as intuitive to explore as modern 3D weather visualization systems.

---

# 4. Goals

## 4.1 Primary Goals

### G1 — Unified visualization

Provide one platform for simultaneously visualizing:

- Ocean model fields
- Argo profiles
- Glider profiles
- CTD observations
- BGC observations
- Future observation sources

### G2 — 3D exploration

Enable users to understand ocean phenomena across:

- Latitude
- Longitude
- Depth
- Time

### G3 — Rapid operational analysis

Reduce the number of tools and manual steps required to investigate an oceanographic event.

### G4 — Model-observation comparison

Allow users to visually compare model predictions against actual observations.

### G5 — Extensibility

Make it possible to introduce new:

- Variables
- Sensors
- Models
- Data formats
- Derived products

without redesigning the entire application.

### G6 — Public outreach

Provide a simplified exploration mode for:

- Students
- Teachers
- Science communicators
- Policymakers
- General audiences

---

# 5. Non-Goals

The first release will **not** attempt to:

- Replace INCOIS numerical ocean models.
- Perform full-scale scientific simulation.
- Become a complete oceanographic data-processing suite.
- Automatically make operational decisions without human validation.
- Replace established data repositories.
- Provide unrestricted editing of source datasets.

The system is primarily a **visualization, exploration, and comparison platform**.

---

# 6. Target Users

## 6.1 Operational Oceanographer

Needs rapid access to current ocean conditions and model predictions.

**Primary needs:**

- Time animation
- Depth navigation
- Model fields
- Observation overlays
- Quick comparison

---

## 6.2 Ocean Forecaster

Uses model and observation data to understand evolving ocean conditions.

**Primary needs:**

- Near-real-time data
- Spatial analysis
- Vertical structure
- Current visualization
- Anomaly identification

---

## 6.3 Researcher

Performs detailed analysis of historical and model datasets.

**Primary needs:**

- Dataset selection
- Variable control
- Custom color scales
- Profile inspection
- Time navigation
- Export capability

---

## 6.4 Data Scientist / Developer

Integrates new datasets and derived products.

**Primary needs:**

- APIs
- Standardized data interfaces
- Metadata
- Modular ingestion
- Plugin architecture

---

## 6.5 Student / Educator

Explores ocean science without requiring specialist knowledge.

**Primary needs:**

- Simple controls
- Visual explanations
- Preset scenarios
- Interactive 3D exploration

---

## 6.6 Policymaker / General Public

Needs a simplified understanding of marine conditions.

**Primary needs:**

- High-level visualization
- Simple legends
- Explanations
- Location-based exploration
- Storytelling mode

---

# 7. Key User Stories

## US-01 — Explore ocean temperature

> As an oceanographer, I want to visualize the 3D temperature field so that I can understand its spatial and vertical distribution.

## US-02 — Navigate depth

> As a user, I want to move through different depth levels so that I can examine ocean conditions at specific depths.

## US-03 — Inspect Argo observations

> As an oceanographer, I want to click an Argo float and view its temperature/salinity profile so that I can compare observations with the surrounding model field.

## US-04 — Compare model and observation

> As a forecaster, I want to display observations over the model field so that I can identify areas where the model and real-world measurements differ.

## US-05 — Animate time

> As a user, I want to animate model data through time so that I can observe how an ocean phenomenon evolves.

## US-06 — Change visualization scale

> As a researcher, I want to customize the color range and scale so that I can emphasize subtle variations in the dataset.

## US-07 — Add new data

> As a system administrator, I want to add new datasets without modifying the visualization engine.

## US-08 — Explore ocean science

> As a student, I want to interact with a simplified 3D ocean visualization so that I can understand concepts such as temperature gradients and ocean currents.

---

# 8. Product Scope

The platform consists of six major layers:

```text
┌──────────────────────────────────────────┐
│             USER INTERFACE               │
│  Dashboard • Controls • Charts • Tools   │
├──────────────────────────────────────────┤
│          3D VISUALIZATION ENGINE         │
│ WebGL • Three.js/Cesium • GPU Rendering  │
├──────────────────────────────────────────┤
│          DATA API / SERVICE LAYER        │
│ REST • OPeNDAP • OGC Services            │
├──────────────────────────────────────────┤
│             DATA PROCESSING              │
│ NetCDF • ASCII • Metadata • Conversion   │
├──────────────────────────────────────────┤
│              DATA SOURCES                │
│ Models • Argo • Glider • CTD • BGC       │
└──────────────────────────────────────────┘
```

---

# 9. Functional Requirements

## FR-01 — Interactive 3D Ocean Globe

The system shall provide an interactive 3D representation of the ocean domain.

### Requirements

- Rotate the globe/ocean domain.
- Zoom in/out.
- Pan.
- Reset camera.
- Select geographic locations.
- Display latitude/longitude information.
- Display depth information.
- Support configurable vertical exaggeration.

### Priority

**P0 — Critical**

---

# 10. FR-02 — Ocean Model Visualization

The system shall render multidimensional ocean model fields.

### Supported initial variables

- Temperature
- Salinity
- Eastward current velocity
- Northward current velocity
- Vertical velocity
- Chlorophyll

The architecture shall allow additional variables.

### Visualization modes

1. Surface map
2. Horizontal depth slice
3. Vertical slice
4. 3D volume
5. Isosurface
6. Vector field
7. Particle/streamline visualization

### Priority

**P0**

---

# 11. FR-03 — Depth Slice Navigation

Users shall be able to select a depth.

Example:

```text
Depth
Surface
  ↓
10 m
25 m
50 m
100 m
250 m
500 m
1000 m
```

The depth control shall support:

- Slider
- Numeric input
- Preset depths
- Dataset-specific available depths

### Priority

**P0**

---

# 12. FR-04 — 3D Volume Rendering

The platform shall support volumetric visualization of ocean variables.

Example:

```text
        Ocean Surface
────────────────────────
       Temperature
      █████████████
     ███████████████
    █████████████████
   ███████████████████
────────────────────────
          Depth
```

Users shall be able to:

- Change opacity.
- Adjust intensity.
- Toggle volume rendering.
- Change depth range.
- Enable/disable clipping.

### Priority

**P1**

---

# 13. FR-05 — Isosurface Visualization

Users shall be able to generate surfaces representing a selected variable threshold.

Example:

```text
Temperature = 28°C

        ╭────────────╮
      ╭─╯            ╰─╮
     ╱    Isosurface    ╲
    ╱                    ╲
```

Controls:

- Variable
- Threshold
- Opacity
- Visibility

### Priority

**P1**

---

# 14. FR-06 — Ocean Current Visualization

Current fields shall be visualized using:

- Arrows
- Vector glyphs
- Streamlines
- Animated particles

Users shall be able to control:

- Vector density
- Vector scale
- Particle speed
- Particle count
- Depth
- Time

### Priority

**P0**

---

# 15. FR-07 — Time Animation

The platform shall provide a temporal navigation system.

```text
◀ | ▶     2026-08-27 12:00
━━━━━━━━━━━━━━●━━━━━━━━
             Time
```

Controls:

- Play
- Pause
- Previous timestep
- Next timestep
- Timeline
- Playback speed
- Start/end time
- Loop

### Priority

**P0**

---

# 16. FR-08 — Argo Float Visualization

Argo floats shall appear as geographically accurate markers.

Each marker shall contain:

- Float ID
- Latitude
- Longitude
- Observation time
- Available variables
- Profile count

Clicking a float shall open its profile panel.

### Profile visualization

```text
Depth
 ↓

0m    ●
50m   ●
100m  ●
200m  ●
500m  ●
1000m ●
       └──────── Temperature
```

The profile panel shall support:

- Temperature vs depth
- Salinity vs depth
- Chlorophyll vs depth
- Timestamp selection
- Profile navigation

### Priority

**P0**

---

# 17. FR-09 — Glider Visualization

The platform shall support underwater glider tracks.

The track shall show:

- Geographic trajectory
- Time
- Depth
- Temperature
- Salinity
- Chlorophyll
- Other available variables

Users shall be able to click a track segment to inspect measurements.

### Priority

**P0**

---

# 18. FR-10 — Additional Observation Sources

The architecture shall support future integration of:

- CTD
- BGC floats
- Moorings
- HF Radar
- ADCP
- Drifters
- Ship observations
- Satellite-derived products

These shall be implemented through modular data adapters.

### Priority

**P1**

---

# 19. FR-11 — Dynamic Variable Selector

Users shall be able to choose the variable being visualized.

Example:

```text
VARIABLE

● Temperature
○ Salinity
○ Chlorophyll
○ Current Speed
○ Current Direction
○ Vertical Velocity
```

Variable metadata shall include:

- Name
- Unit
- Description
- Minimum
- Maximum
- Valid range
- Available depths
- Available times

---

# 20. FR-12 — Custom Colorbar

The user shall be able to customize visualization ranges.

### Controls

- Minimum
- Maximum
- Color palette
- Number of levels
- Linear scale
- Logarithmic scale
- Reverse palette

Example:

```text
Temperature (°C)

30 ┃████
28 ┃████
26 ┃████
24 ┃████
22 ┃████
20 ┃████
```

Predefined scientific palettes may include:

- Viridis
- Plasma
- Inferno
- Cool-Warm
- Ocean
- Thermal

---

# 21. FR-13 — Layer Management

Users shall be able to independently control visualization layers.

Example:

```text
LAYERS

☑ Temperature
☑ Currents
☑ Argo
☑ Gliders
☐ Chlorophyll
☐ Isosurface
```

Each layer should support:

- Visibility
- Opacity
- Ordering
- Configuration
- Removal

---

# 22. FR-14 — Model vs Observation Comparison

This is one of the system's most important analytical features.

Users should be able to select:

```text
Model:
Temperature

Observation:
Argo Temperature

Comparison:
Model - Observation
```

The system may display:

- Side-by-side profiles
- Overlay profiles
- Difference profile
- Difference map
- Bias statistics

Example:

```text
Temperature

Model       ───────
Observation ──────

Depth ↓
```

### Priority

**P0 for MVP comparison**

---

# 23. FR-15 — Data Ingestion

The backend shall support:

### Primary formats

- NetCDF
- ASCII
- CSV
- Delimited text

### NetCDF processing

The ingestion system should use an xarray-compatible processing layer.

The system should identify:

- Dimensions
- Coordinates
- Variables
- Units
- Attributes
- Time axis
- Depth axis
- Missing values

---

# 24. FR-16 — Standardized Data Model

Internally, datasets should be represented using a common metadata structure.

Example:

```json
{
  "dataset": "Ocean Model",
  "variable": "temperature",
  "unit": "degC",
  "dimensions": ["time", "depth", "lat", "lon"],
  "time": "...",
  "depth": "...",
  "latitude": "...",
  "longitude": "..."
}
```

This abstraction prevents the frontend from becoming dependent on individual file formats.

---

# 25. FR-17 — OGC / Open Standards

The platform should support relevant open standards wherever practical.

### Target standards

- CF Conventions
- OGC WMS
- OGC WCS
- OPeNDAP
- NetCDF

This will improve interoperability with existing scientific infrastructure.

---

# 26. FR-18 — Dataset Management

Authorized users shall be able to:

- Register datasets.
- Update datasets.
- Enable/disable datasets.
- View dataset metadata.
- Define dataset geographic extent.
- Define temporal extent.
- Define supported variables.

---

# 27. FR-19 — Search & Discovery

Users shall be able to search datasets using:

- Dataset name
- Variable
- Date
- Geographic region
- Depth
- Observation platform

Example:

```text
Search:
"Temperature"
Region:
Arabian Sea
Time:
August 2026
Platform:
Argo
```

---

# 28. FR-20 — Export

The system should support exporting:

- Screenshots
- Profile charts
- Selected observations
- Metadata
- Processed subsets

Future versions may support:

- CSV
- NetCDF
- GeoJSON
- Image export
- Animation/video

---

# 29. FR-21 — Bookmarks / Saved Views

Users should be able to save visualization states.

A saved view could contain:

```text
Dataset
Variable
Depth
Time
Camera position
Colorbar
Visible layers
Opacity
```

This allows users to reproduce an analysis.

---

# 30. FR-22 — Public Outreach Mode

A simplified mode shall be available for non-specialist users.

### Features

- Simplified controls
- Explanatory tooltips
- Preset visualizations
- Guided exploration
- Ocean science descriptions
- Story-based visualization

Example presets:

**"How does ocean temperature change with depth?"**

**"How do ocean currents move?"**

**"What does an Argo float measure?"**

**"Explore the Arabian Sea."**

---

# 31. FR-23 — Responsive Interface

The platform shall primarily target:

- Desktop
- Large monitors
- Operational control-room displays

Tablet support should be considered.

Mobile devices are not the primary target for advanced 3D analysis.

---

# 32. User Interface

## Main Dashboard

```text
┌─────────────────────────────────────────────────────────┐
│ INCOIS Ocean Explorer             Search    Settings    │
├───────────────┬─────────────────────────┬───────────────┤
│ DATASETS      │                         │ VARIABLES     │
│               │                         │               │
│ ☑ Model       │                         │ Temperature   │
│ ☑ Argo        │        3D OCEAN         │ Salinity     │
│ ☑ Glider      │                         │ Currents     │
│ ☐ CTD         │                         │ Chlorophyll  │
│               │                         │               │
├───────────────┤                         ├───────────────┤
│ DEPTH         │                         │ COLORBAR      │
│               │                         │               │
│ 100 m ───●    │                         │ Min ─ Max     │
│               │                         │ Palette       │
├───────────────┴─────────────────────────┴───────────────┤
│ Time: 27 Aug 2026   ◀   ▶   ━━━━━━━━━●━━━━━━           │
└─────────────────────────────────────────────────────────┘
```

---

# 33. Information Architecture

```text
Application
│
├── Dashboard
│
├── Ocean Explorer
│   ├── 3D View
│   ├── Depth View
│   ├── Time View
│   └── Current View
│
├── Observations
│   ├── Argo
│   ├── Gliders
│   ├── CTD
│   └── BGC
│
├── Datasets
│   ├── Model
│   ├── Observation
│   └── Derived Products
│
├── Analysis
│   ├── Model vs Observation
│   ├── Profiles
│   └── Differences
│
└── Outreach
    ├── Guided Exploration
    └── Educational Visualizations
```

---

# 34. Proposed Technical Architecture

## Frontend

Recommended stack:

- React
- TypeScript
- Three.js
- WebGL
- Plotly.js or Apache ECharts
- Zustand/Redux for state management

Three.js is recommended for the primary 3D scientific visualization layer.

CesiumJS can be evaluated if globe/geospatial capabilities become a major requirement.

---

## Backend

Recommended:

- Python
- FastAPI
- xarray
- NumPy
- Dask
- NetCDF4
- Zarr where appropriate

Backend responsibilities:

- Dataset discovery
- Data ingestion
- Metadata extraction
- Spatial/temporal subsetting
- Data transformation
- API delivery
- Authentication
- Caching

---

# 35. High-Level Architecture

```text
                    ┌─────────────────┐
                    │     Browser     │
                    │ React + WebGL   │
                    └────────┬────────┘
                             │
                         HTTPS/API
                             │
                    ┌────────▼────────┐
                    │    API Gateway  │
                    │    FastAPI      │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼─────┐ ┌──────▼──────┐ ┌────▼─────┐
       │ Data Query │ │ Metadata    │ │ Auth     │
       │ Service    │ │ Service     │ │ Service  │
       └──────┬─────┘ └─────────────┘ └──────────┘
              │
       ┌──────▼───────────┐
       │ Data Processing   │
       │ xarray / Dask     │
       └──────┬───────────┘
              │
    ┌─────────┼──────────────┐
    │         │              │
┌───▼───┐ ┌──▼────┐ ┌────────▼─────┐
│NetCDF │ │ Argo  │ │ Glider/CTD   │
│Model  │ │       │ │ BGC/etc.     │
└───────┘ └───────┘ └──────────────┘
```

---

# 36. Data Flow

```text
Raw Dataset
     ↓
Dataset Discovery
     ↓
Metadata Extraction
     ↓
Validation
     ↓
Normalization
     ↓
Spatial/Temporal Indexing
     ↓
API / OPeNDAP
     ↓
Client Query
     ↓
Data Subset
     ↓
GPU Visualization
```

The system should avoid sending entire multi-dimensional datasets to the browser.

Instead:

> **Query only the data required for the current viewport, depth, variable, and timestep.**

This is critical for performance.

---

# 37. API Design

Example endpoints:

```text
GET /api/datasets

GET /api/datasets/{id}

GET /api/datasets/{id}/variables

GET /api/datasets/{id}/times

GET /api/datasets/{id}/depths

GET /api/data

GET /api/observations/argo

GET /api/observations/gliders

GET /api/profile/{platform}/{id}

GET /api/comparison
```

Example data query:

```text
/api/data?
dataset=model01
&variable=temperature
&time=2026-08-27T12:00
&depth=100
&bbox=60,5,90,25
```

---

# 38. Data Processing Strategy

For large datasets, the backend should perform:

### Spatial subsetting

Return only the geographic region currently visible.

### Temporal subsetting

Return only requested time steps.

### Depth subsetting

Return only requested depth levels.

### Resolution reduction

For zoomed-out views, use lower-resolution data.

For zoomed-in views, provide higher-resolution data.

This provides a progressive-detail visualization architecture.

---

# 39. Performance Requirements

The visualization engine should target:

| Metric | Target |
|---|---:|
| Initial application load | < 5 seconds |
| UI interaction response | < 100 ms |
| Standard API request | < 2 seconds |
| Depth change | < 1 second where cached |
| Time-step change | < 2 seconds |
| Visualization FPS | ≥ 30 FPS |
| Target desktop | Modern Chrome/Edge/Firefox |
| Concurrent users | Scalable based on deployment |

Actual performance targets shall be validated using representative INCOIS datasets.

---

# 40. Scalability

The architecture should support:

- Multiple simultaneous users
- Large NetCDF datasets
- Historical datasets
- Real-time observation ingestion
- Distributed processing

Potential technologies:

- Dask
- Zarr
- Object storage
- Redis caching
- CDN for static assets
- GPU acceleration

---

# 41. Security

The system shall implement:

- HTTPS
- Role-based access control
- Secure authentication
- API authorization
- Input validation
- Dataset access controls
- Audit logging for administrative operations

Potential roles:

```text
Administrator
     │
     ├── Dataset management
     ├── User management
     └── System configuration

Forecaster
     │
     ├── Advanced visualization
     ├── Analysis
     └── Export

Researcher
     │
     ├── Dataset exploration
     ├── Profiles
     └── Analysis

Public
     │
     └── Outreach mode
```

---

# 42. Extensibility Architecture

The platform shall use adapters/plugins.

```text
Data Adapter Interface
        │
        ├── NetCDF Adapter
        ├── Argo Adapter
        ├── Glider Adapter
        ├── CTD Adapter
        ├── Mooring Adapter
        ├── HF Radar Adapter
        └── ADCP Adapter
```

Similarly, visualization modules may be modular:

```text
Visualization Interface
        │
        ├── VolumeRenderer
        ├── DepthSlice
        ├── Isosurface
        ├── VectorField
        ├── Streamlines
        ├── ParticleFlow
        └── ProfileChart
```

This allows new capabilities to be added without rewriting the core platform.

---

# 43. MVP Definition

The first production-ready MVP should focus on the highest-value capabilities.

## MVP Features

### Must Have

- [x] Browser-based application
- [x] Interactive 3D ocean view
- [x] NetCDF ingestion
- [x] Temperature visualization
- [x] Salinity visualization
- [x] Current vectors
- [x] Depth slider
- [x] Time slider
- [x] Dynamic colorbar
- [x] Argo markers
- [x] Argo profile chart
- [x] Glider markers/tracks
- [x] Glider profile chart
- [x] Basic model-observation comparison
- [x] Dataset metadata
- [x] REST API

### Should Have

- [ ] Volume rendering
- [ ] Isosurfaces
- [ ] Animated current particles
- [ ] CTD integration
- [ ] Saved views
- [ ] Screenshot export

### Could Have

- [ ] ML-derived products
- [ ] Advanced anomaly detection
- [ ] Story mode
- [ ] Educational presets
- [ ] Video export

---

# 44. MVP User Journey

```text
Open Platform
      ↓
Select Dataset
      ↓
Select Variable
      ↓
Choose Time
      ↓
Choose Depth
      ↓
Explore 3D Field
      ↓
Enable Argo/Glider
      ↓
Click Observation
      ↓
View Profile
      ↓
Compare Model vs Observation
      ↓
Adjust Colorbar
      ↓
Export / Save View
```

---

# 45. Acceptance Criteria

## 45.1 Model Visualization

Given a valid NetCDF dataset:

- The system identifies available variables.
- The user can select a variable.
- The selected field appears in the 3D environment.
- Depth can be changed.
- Time can be changed.
- The colorbar updates appropriately.

---

## 45.2 Argo

Given an Argo dataset:

- Float positions appear at correct coordinates.
- Users can select a float.
- Float metadata is displayed.
- A depth profile is displayed.
- Profile timestamps can be changed.

---

## 45.3 Glider

Given a glider dataset:

- The trajectory appears geographically correctly.
- Users can select a track.
- Depth-dependent measurements can be inspected.

---

## 45.4 Comparison

When both model and observation data are available:

- The user can select the same variable.
- Model and observation profiles can be overlaid.
- Differences can be calculated where compatible.
- Units and timestamps are displayed.

---

# 46. Error Handling

The system shall gracefully handle:

- Missing values
- Corrupt datasets
- Unsupported variables
- Invalid coordinates
- Missing depth levels
- Missing timestamps
- Network failures
- API failures
- Large dataset requests

Example:

```text
Unable to load selected dataset.

Reason:
Requested depth level is unavailable.

Available depths:
0m, 10m, 25m, 50m, 100m
```

---

# 47. Observability & Monitoring

Administrators should be able to monitor:

- API latency
- Dataset processing failures
- Request volume
- Active users
- Data ingestion status
- GPU/client performance where measurable
- Storage usage

---

# 48. Analytics

For internal system improvement, collect non-sensitive operational metrics such as:

- Most-used variables
- Most-used depth ranges
- Most-used datasets
- Visualization modes
- Average session duration
- API performance
- Error rates

Analytics should avoid collecting unnecessary personal information.

---

# 49. Accessibility

The interface should provide:

- Keyboard-accessible controls
- Clear labels
- High-contrast UI options
- Units beside scientific variables
- Descriptive tooltips
- Alternative 2D/profile representations where appropriate

3D visualization should always have an accompanying numerical/profile representation where feasible.

---

# 50. Science Communication Requirements

The outreach mode should translate technical variables into understandable concepts.

Example:

```text
Temperature
───────────

What is it?
The temperature of seawater at different
locations and depths.

Why does it matter?
Temperature influences ocean circulation,
marine ecosystems and weather processes.
```

The system should allow INCOIS to create curated visualization stories.

---

# 51. Example Outreach Experiences

## Experience 1 — Explore the Ocean

User rotates a 3D representation of India's surrounding ocean.

## Experience 2 — Dive Through the Ocean

A depth slider moves from:

```text
Surface
   ↓
50m
   ↓
100m
   ↓
500m
   ↓
1000m
```

The visualization updates in real time.

## Experience 3 — Follow an Argo Float

The user selects an Argo float and observes its movement and changing profiles.

## Experience 4 — See Ocean Currents

Animated particles demonstrate current direction and velocity.

---

# 52. Success Metrics

## Operational

- Reduction in time required to inspect model/observation relationships.
- Number of datasets accessible through one interface.
- Number of supported observation platforms.
- Average visualization response time.

## Technical

- API latency
- Rendering FPS
- Error rate
- Data ingestion success rate
- Concurrent user capacity

## Adoption

- Daily active users
- Sessions per user
- Frequently used visualization modes
- Number of saved analyses/views

## Outreach

- Number of educational sessions
- Public users
- Guided visualization interactions
- Institutional demonstrations

---

# 53. Product Roadmap

## Phase 1 — Foundation

**Duration:** 4–6 weeks

- Architecture
- Backend
- Dataset abstraction
- NetCDF ingestion
- Basic 3D globe
- API

---

## Phase 2 — Core Visualization

**Duration:** 4–6 weeks

- Temperature
- Salinity
- Depth slices
- Current vectors
- Colorbars
- Time animation

---

## Phase 3 — Observation Integration

**Duration:** 3–5 weeks

- Argo
- Glider
- Profile charts
- Model-observation comparison

---

## Phase 4 — Advanced 3D

**Duration:** 4–6 weeks

- Volume rendering
- Isosurfaces
- Streamlines
- Particle animation
- GPU optimization

---

## Phase 5 — Operationalization

**Duration:** 3–5 weeks

- Authentication
- Monitoring
- Caching
- Performance optimization
- Deployment
- Documentation

---

## Phase 6 — Outreach

**Duration:** 2–4 weeks

- Educational mode
- Guided experiences
- Storytelling
- Simplified UI
- Public deployment configuration

---

# 54. Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Very large NetCDF files | High | Spatial/temporal subsetting |
| Browser GPU limitations | High | Progressive rendering |
| Slow network | High | Compression + caching |
| Different dataset schemas | High | Common data model |
| Missing observations | Medium | Clear missing-data states |
| Coordinate inconsistencies | High | Validation pipeline |
| Too many particles/vectors | Medium | Adaptive density |
| Complex UI | Medium | Expert + outreach modes |
| Dataset ingestion failures | High | Validation + logging |

---

# 55. Key Technical Decisions

### Decision 1

Use **React + TypeScript** for the application interface.

### Decision 2

Use **Three.js/WebGL** as the primary 3D rendering engine.

### Decision 3

Use **Python + FastAPI + xarray** for scientific data processing.

### Decision 4

Use a standardized internal dataset abstraction rather than coupling the frontend to NetCDF structures.

### Decision 5

Use server-side spatial, temporal, and depth subsetting.

### Decision 6

Design observation sources as modular adapters.

### Decision 7

Support CF/OGC-compatible data wherever possible.

---

# 56. Definition of Done — MVP

The MVP will be considered complete when:

1. A valid INCOIS NetCDF dataset can be loaded.
2. Users can select temperature and salinity.
3. Users can navigate depth.
4. Users can navigate time.
5. Ocean currents can be visualized.
6. Argo observations appear geographically correctly.
7. Argo profiles can be inspected.
8. Glider observations can be displayed.
9. Glider profiles/tracks can be inspected.
10. Model and observations can be compared.
11. Color scales can be customized.
12. The application runs entirely through a modern web browser.
13. No desktop scientific visualization software is required.
14. New datasets can be integrated through the ingestion architecture.
15. The application remains responsive on representative operational datasets.

---

# 57. Future Opportunities

Once the core platform is established, it can evolve into a broader **Ocean Digital Twin / Ocean Intelligence Platform**.

Potential future capabilities include:

- Real-time ocean monitoring
- AI-based anomaly detection
- Forecast uncertainty visualization
- Data assimilation visualization
- Automated model validation
- Ocean hazard detection
- Search-and-rescue support
- Fisheries intelligence
- Marine pollution tracking
- Extreme-event monitoring
- Satellite-data fusion
- Digital twin simulations
- Natural-language ocean data querying
- AI-assisted scientific analysis

A future interface could allow a user to ask:

> "Show me the temperature anomaly in the Arabian Sea between 50 and 200 meters during the last 7 days."

The system could automatically identify the appropriate dataset, query the required subset, render it, and provide the corresponding visualization.

---

# 58. Final Product Concept

The proposed platform should ultimately function as a unified **3D Ocean Observatory**.

```text
                   INCOIS OCEAN DATA
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
     MODELS           OBSERVATIONS        DERIVED
       │                  │               PRODUCTS
       │                  │                  │
 Temperature           Argo                AI
 Salinity              Glider              Anomaly
 Currents              CTD                 Forecast
 Chlorophyll           BGC                 Products
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                          ▼
              ┌──────────────────────┐
              │   OCEAN EXPLORER     │
              │                      │
              │  3D + Space + Depth  │
              │  + Time + Data       │
              └──────────┬───────────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
          FORECASTING  RESEARCH   OUTREACH
```

The central product principle is:

> **One ocean, one interface, all dimensions, all observations.**

By combining model outputs, real-world observations, interactive 3D visualization, temporal animation, and extensible data services, the system can significantly improve how complex ocean information is explored and communicated.

For INCOIS, the platform can serve both as an **operational analytical tool** and as a **public-facing gateway to ocean science**, connecting advanced numerical oceanography with practical decision-making and public understanding.