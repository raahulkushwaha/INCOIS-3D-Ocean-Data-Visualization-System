"""
INCOIS 3D Ocean Data Engine
Handles NetCDF/xarray scientific dataset generation, metadata parsing,
spatial/temporal/depth subsetting, and standardized data models.
"""

import os
import json
import math
import numpy as np
import xarray as xr
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

DATA_DIR = os.path.join(os.path.dirname(__file__), "sample_data")
os.makedirs(DATA_DIR, exist_ok=True)

MODEL_NC_PATH = os.path.join(DATA_DIR, "incois_indianocean_model.nc")
ARGO_JSON_PATH = os.path.join(DATA_DIR, "argo_observations.json")
GLIDER_JSON_PATH = os.path.join(DATA_DIR, "glider_missions.json")
BUOY_JSON_PATH = os.path.join(DATA_DIR, "moored_buoys.json")


def generate_synthetic_ocean_datasets():
    """
    Generates a realistic CF-compliant NetCDF ocean model dataset for the Indian Ocean
    (Arabian Sea, Bay of Bengal, and Equatorial Indian Ocean) along with in-situ
    Argo float profiles, Glider tracks, and Moored OMNI Buoy telemetry.
    """
    if os.path.exists(MODEL_NC_PATH) and os.path.exists(ARGO_JSON_PATH):
        return

    print("[DataEngine] Generating realistic Indian Ocean NetCDF model dataset...")

    # Define Spatial & Depth & Temporal Grid
    # Indian Ocean domain: Lat -10 to 25 deg N, Lon 55 to 100 deg E
    lats = np.linspace(-10.0, 25.0, 71)   # 0.5 deg resolution
    lons = np.linspace(55.0, 100.0, 91)  # 0.5 deg resolution
    depths = np.array([0, 10, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000], dtype=float)
    
    # 5 Forecast time steps (August 2026 monsoon cycle)
    base_time = datetime(2026, 8, 27, 0, 0)
    times = [base_time + timedelta(hours=6 * i) for i in range(5)]

    n_time = len(times)
    n_depth = len(depths)
    n_lat = len(lats)
    n_lon = len(lons)

    # 4D coordinate meshgrids
    LON, LAT = np.meshgrid(lons, lats)
    
    # Land mask for Indian subcontinent and Arabian peninsula
    # Approximate land mask: Lat > 8 & Lon 68-88 (India), Lat > 12 & Lon < 60 (Arabia), Lat > 20 (North continent)
    def is_ocean(lat, lon):
        # Peninsular India triangle
        if 8.0 <= lat <= 24.0 and 68.0 <= lon <= 88.0:
            if lat > 8.0 + 0.8 * (lon - 77.0)**2 / 10.0:
                return False
        # Northwest Asia / Iran / Arabia
        if lat >= 22.0 and lon <= 66.0:
            return False
        # Myanmar / Southeast Asia
        if lat >= 15.0 and lon >= 94.0:
            return False
        # North of 25 is land
        if lat >= 25.0:
            return False
        return True

    ocean_mask = np.zeros((n_lat, n_lon), dtype=bool)
    for i in range(n_lat):
        for j in range(n_lon):
            ocean_mask[i, j] = is_ocean(lats[i], lons[j])

    # Preallocate 4D arrays: (time, depth, lat, lon)
    temp_4d = np.zeros((n_time, n_depth, n_lat, n_lon), dtype=np.float32)
    salt_4d = np.zeros((n_time, n_depth, n_lat, n_lon), dtype=np.float32)
    u_4d = np.zeros((n_time, n_depth, n_lat, n_lon), dtype=np.float32)
    v_4d = np.zeros((n_time, n_depth, n_lat, n_lon), dtype=np.float32)
    w_4d = np.zeros((n_time, n_depth, n_lat, n_lon), dtype=np.float32)
    chla_4d = np.zeros((n_time, n_depth, n_lat, n_lon), dtype=np.float32)

    for t_idx in range(n_time):
        t_phase = t_idx * 0.15
        for d_idx, z in enumerate(depths):
            # Vertical stratification parameters
            # Thermocline depth around 70-120m, deep ocean drops to ~2.5 deg C
            # Surface temperature ~28-30.5 deg C
            z_decay = np.exp(-z / 250.0)
            thermocline_factor = 1.0 / (1.0 + np.exp((z - 90.0) / 30.0))

            for i in range(n_lat):
                lat_val = lats[i]
                for j in range(n_lon):
                    lon_val = lons[j]

                    if not ocean_mask[i, j]:
                        temp_4d[t_idx, d_idx, i, j] = np.nan
                        salt_4d[t_idx, d_idx, i, j] = np.nan
                        u_4d[t_idx, d_idx, i, j] = np.nan
                        v_4d[t_idx, d_idx, i, j] = np.nan
                        w_4d[t_idx, d_idx, i, j] = np.nan
                        chla_4d[t_idx, d_idx, i, j] = np.nan
                        continue

                    # Realistic Oceanographic features:
                    # 1. Arabian Sea Upwelling along Oman and SW India (cooler surface, higher chlorophyll)
                    upwelling_sw_india = np.exp(-((lat_val - 10.0)**2 / 12.0 + (lon_val - 74.0)**2 / 8.0))
                    upwelling_oman = np.exp(-((lat_val - 17.0)**2 / 15.0 + (lon_val - 57.0)**2 / 10.0))
                    
                    # 2. Bay of Bengal Freshwater Tongue (Low Salinity ~31-33 PSU due to Ganges/Brahmaputra runoff)
                    bob_freshwater = np.exp(-((lat_val - 18.0)**2 / 25.0 + (lon_val - 88.0)**2 / 30.0)) * (1.0 if z < 50 else np.exp(-(z - 50)/50.0))
                    
                    # 3. Arabian Sea High Salinity Water (ASHSW ~36.5 PSU due to excess evaporation)
                    as_high_salt = np.exp(-((lat_val - 18.0)**2 / 40.0 + (lon_val - 64.0)**2 / 40.0))

                    # 4. Temperature calculation
                    # Tropical warm pool in Eastern Indian Ocean (~29.5°C), cool upwelling zones (~25°C)
                    sst = 28.5 + 1.2 * np.sin((lon_val - 60.0) * math.pi / 40.0) \
                          - 3.5 * upwelling_sw_india - 4.2 * upwelling_oman \
                          + 0.4 * np.sin(t_phase + lat_val * 0.1)
                    
                    deep_t = 2.8 + 1.5 * np.exp(-z / 1000.0)
                    t_val = deep_t + (sst - deep_t) * thermocline_factor * z_decay
                    temp_4d[t_idx, d_idx, i, j] = round(float(t_val), 2)

                    # 5. Salinity calculation
                    # Bay of Bengal is ~31.5-33.5 PSU, Arabian Sea is ~35.5-36.8 PSU, Deep ocean ~34.8 PSU
                    surf_salt = 35.0 + 1.6 * as_high_salt - 3.8 * bob_freshwater + 0.1 * np.cos(t_phase)
                    deep_salt = 34.75 + 0.15 * np.sin(lat_val * 0.1)
                    s_val = deep_salt + (surf_salt - deep_salt) * np.exp(-z / 300.0)
                    salt_4d[t_idx, d_idx, i, j] = round(float(s_val), 2)

                    # 6. Ocean Currents (Summer Monsoon SW flow, Somali Current jet, East India Coastal Current)
                    # Somali jet along East Africa heading NE, Equatorial Jet heading East
                    somali_jet = np.exp(-((lat_val - 8.0)**2 / 30.0 + (lon_val - 54.0)**2 / 15.0))
                    sw_monsoon_current = np.exp(-((lat_val - 5.0)**2 / 20.0))
                    
                    u_surf = 0.35 * sw_monsoon_current + 0.6 * somali_jet + 0.15 * np.sin(lat_val * 0.3 + t_phase)
                    v_surf = 0.45 * somali_jet - 0.2 * np.cos(lon_val * 0.2 + t_phase)
                    
                    # Current decays rapidly below thermocline
                    current_decay = np.exp(-z / 180.0)
                    u_4d[t_idx, d_idx, i, j] = round(float(u_surf * current_decay), 3)
                    v_4d[t_idx, d_idx, i, j] = round(float(v_surf * current_decay), 3)
                    w_4d[t_idx, d_idx, i, j] = round(float((upwelling_sw_india + upwelling_oman) * 0.005 * current_decay), 5)

                    # 7. Chlorophyll-a (High at surface in upwelling & river plumes, peak near nutricline 40-70m)
                    chla_surf = 0.15 + 2.8 * upwelling_sw_india + 3.2 * upwelling_oman + 1.2 * bob_freshwater
                    subsurface_max = np.exp(-((z - 55.0)**2 / 500.0))
                    chla_val = (chla_surf * 0.7 + 1.4 * subsurface_max) * np.exp(-z / 150.0)
                    chla_4d[t_idx, d_idx, i, j] = round(float(chla_val), 3)

    # Construct xarray Dataset with CF metadata
    ds = xr.Dataset(
        data_vars={
            "temperature": (["time", "depth", "latitude", "longitude"], temp_4d, {
                "long_name": "Potential Temperature",
                "units": "degC",
                "standard_name": "sea_water_potential_temperature",
                "valid_min": 0.0,
                "valid_max": 35.0,
            }),
            "salinity": (["time", "depth", "latitude", "longitude"], salt_4d, {
                "long_name": "Practical Salinity",
                "units": "PSU",
                "standard_name": "sea_water_salinity",
                "valid_min": 25.0,
                "valid_max": 40.0,
            }),
            "u_velocity": (["time", "depth", "latitude", "longitude"], u_4d, {
                "long_name": "Eastward Current Velocity",
                "units": "m/s",
                "standard_name": "eastward_sea_water_velocity",
                "valid_min": -2.5,
                "valid_max": 2.5,
            }),
            "v_velocity": (["time", "depth", "latitude", "longitude"], v_4d, {
                "long_name": "Northward Current Velocity",
                "units": "m/s",
                "standard_name": "northward_sea_water_velocity",
                "valid_min": -2.5,
                "valid_max": 2.5,
            }),
            "w_velocity": (["time", "depth", "latitude", "longitude"], w_4d, {
                "long_name": "Vertical Current Velocity",
                "units": "m/s",
                "standard_name": "upward_sea_water_velocity",
            }),
            "chlorophyll": (["time", "depth", "latitude", "longitude"], chla_4d, {
                "long_name": "Chlorophyll-a Concentration",
                "units": "mg/m^3",
                "standard_name": "mass_concentration_of_chlorophyll_a_in_sea_water",
                "valid_min": 0.0,
                "valid_max": 10.0,
            }),
        },
        coords={
            "time": [t.isoformat() for t in times],
            "depth": ("depth", depths, {
                "long_name": "Depth below sea surface",
                "units": "m",
                "positive": "down",
                "axis": "Z",
            }),
            "latitude": ("latitude", lats, {
                "long_name": "Latitude",
                "units": "degrees_north",
                "axis": "Y",
            }),
            "longitude": ("longitude", lons, {
                "long_name": "Longitude",
                "units": "degrees_east",
                "axis": "X",
            }),
        },
        attrs={
            "title": "INCOIS Indian Ocean High-Resolution ROMS Model Output",
            "institution": "Indian National Centre for Ocean Information Services (INCOIS)",
            "source": "ROMS 3.9 Coupled Hydrodynamic-Biogeochemical Model",
            "conventions": "CF-1.8",
            "creation_date": datetime.now().isoformat(),
            "region": "Tropical Indian Ocean (Arabian Sea, Bay of Bengal, Equatorial)",
        }
    )

    ds.to_netcdf(MODEL_NC_PATH)
    print(f"[DataEngine] Successfully saved NetCDF model dataset to {MODEL_NC_PATH}")

    # Generate Argo Float Profiles
    generate_argo_dataset(times, depths)

    # Generate Underwater Glider Missions
    generate_glider_dataset(times)

    # Generate Moored OMNI Buoy Telemetry
    generate_buoy_dataset(times)


def generate_argo_dataset(times, depths):
    """Generates realistic in-situ Argo float profiles in the Indian Ocean."""
    floats_config = [
        {"id": "2902145", "name": "INCOIS Argo #2902145", "lat": 14.8, "lon": 69.2, "region": "Central Arabian Sea", "cycle": 142, "battery": 88, "status": "Active Profiling"},
        {"id": "2903341", "name": "INCOIS Argo #2903341", "lat": 9.4, "lon": 74.6, "region": "SW Coast of India Upwelling", "cycle": 98, "battery": 76, "status": "Active Profiling"},
        {"id": "6903241", "name": "INCOIS Argo #6903241", "lat": 16.5, "lon": 87.8, "region": "Central Bay of Bengal", "cycle": 210, "battery": 64, "status": "Active Profiling"},
        {"id": "2902890", "name": "INCOIS Argo #2902890", "lat": 4.2, "lon": 81.5, "region": "Sri Lanka Dome / Equatorial Jet", "cycle": 167, "battery": 91, "status": "Active Profiling"},
        {"id": "2901998", "name": "INCOIS BGC Argo #2901998", "lat": 19.2, "lon": 65.4, "region": "Northern Arabian Sea (OMZ)", "cycle": 84, "battery": 82, "status": "BGC Profiling Active"},
        {"id": "6901850", "name": "INCOIS Argo #6901850", "lat": 12.1, "lon": 91.4, "region": "Andaman Sea Basin", "cycle": 115, "battery": 73, "status": "Active Profiling"},
        {"id": "2903112", "name": "INCOIS Argo #2903112", "lat": -4.5, "lon": 72.0, "region": "Chagos-Laccadive Ridge", "cycle": 189, "battery": 68, "status": "Active Profiling"},
        {"id": "2902774", "name": "INCOIS Argo #2902774", "lat": 7.0, "lon": 60.5, "region": "Western Equatorial Indian Ocean", "cycle": 133, "battery": 94, "status": "Active Profiling"},
    ]

    argo_data = []
    
    for f in floats_config:
        # Generate 10 historic drift cycles
        trajectory = []
        cur_lat = f["lat"]
        cur_lon = f["lon"]
        
        for cyc in range(f["cycle"] - 10, f["cycle"] + 1):
            drift_time = datetime(2026, 8, 27, 0, 0) - timedelta(days=(f["cycle"] - cyc) * 10)
            c_lat = cur_lat - (f["cycle"] - cyc) * 0.12 + 0.05 * math.sin(cyc)
            c_lon = cur_lon - (f["cycle"] - cyc) * 0.18 + 0.06 * math.cos(cyc)
            trajectory.append({
                "cycle": cyc,
                "timestamp": drift_time.isoformat(),
                "latitude": round(c_lat, 4),
                "longitude": round(c_lon, 4),
            })

        # High-resolution vertical profile (0 to 2000m with 40 measurement points)
        prof_depths = np.array([0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 125, 150, 175, 200, 250, 300, 400, 500, 600, 750, 900, 1000, 1200, 1400, 1600, 1800, 2000], dtype=float)
        
        # Real in-situ measurement with slight sensor noise & realistic ocean features
        sst_base = 29.2 if "Bay of Bengal" in f["region"] else (26.8 if "Upwelling" in f["region"] else 28.6)
        sal_base = 32.4 if "Bay of Bengal" in f["region"] else (36.4 if "Arabian Sea" in f["region"] else 35.1)

        t_prof = []
        s_prof = []
        o2_prof = []
        chla_prof = []

        for z in prof_depths:
            # Thermocline decay
            t_val = 2.6 + (sst_base - 2.6) / (1.0 + np.exp((z - 85.0) / 28.0)) * np.exp(-z / 500.0)
            # Add slight realistic observation deviation (mesoscale eddy effect)
            t_obs = t_val + np.random.normal(0, 0.12)
            t_prof.append(round(float(t_obs), 2))

            # Salinity profile
            s_val = 34.8 + (sal_base - 34.8) * np.exp(-z / 250.0) + (0.4 if z > 150 and "Arabian" in f["region"] else 0.0)
            s_obs = s_val + np.random.normal(0, 0.04)
            s_prof.append(round(float(s_obs), 2))

            # Dissolved Oxygen (OMZ minimum in Arabian Sea around 150-500m)
            o2_surf = 210.0
            o2_val = 18.0 if ("Arabian" in f["region"] and 100 <= z <= 600) else (40.0 + (o2_surf - 40.0) * np.exp(-z / 200.0) + (z/2000.0)*50.0)
            o2_prof.append(round(float(o2_val + np.random.normal(0, 2.0)), 1))

            # Chlorophyll
            chla = (2.2 if "Upwelling" in f["region"] else 0.4) * np.exp(-((z - 45.0)**2) / 600.0)
            chla_prof.append(round(float(max(0.01, chla + np.random.normal(0, 0.02))), 3))

        argo_data.append({
            "id": f["id"],
            "name": f["name"],
            "latitude": f["lat"],
            "longitude": f["lon"],
            "region": f["region"],
            "cycle": f["cycle"],
            "status": f["status"],
            "battery_percent": f["battery"],
            "transmission_time": "2026-08-27T06:30:00Z",
            "trajectory": trajectory,
            "profile": {
                "depths": prof_depths.tolist(),
                "temperature": t_prof,
                "salinity": s_prof,
                "oxygen": o2_prof,
                "chlorophyll": chla_prof,
            }
        })

    with open(ARGO_JSON_PATH, "w") as fp:
        json.dump(argo_data, fp, indent=2)
    print(f"[DataEngine] Saved {len(argo_data)} Argo float profiles to {ARGO_JSON_PATH}")


def generate_glider_dataset(times):
    """Generates underwater glider missions with high-resolution saw-tooth transects."""
    gliders = [
        {
            "id": "SG-601",
            "name": "INCOIS Ocean Glider SG-601",
            "mission": "Bay of Bengal Monsoon Barrier Layer Transect",
            "speed_knots": 0.55,
            "battery_percent": 82,
            "status": "Active Diving",
            "start_time": "2026-08-20T00:00:00Z",
            "end_time": "2026-09-10T00:00:00Z",
            "sensors": ["Seabird CTD SBE-41", "WetLabs ECO Chlorophyll/Turbidity", "Aanderaa Oxygen Optode"],
            "waypoints": [
                {"lat": 12.0, "lon": 82.0, "name": "Station Alpha"},
                {"lat": 14.5, "lon": 85.0, "name": "Station Bravo"},
                {"lat": 17.0, "lon": 88.5, "name": "Station Charlie (Freshwater Tongue)"}
            ],
            "dive_profile": []
        },
        {
            "id": "SG-504",
            "name": "INCOIS Ocean Glider SG-504",
            "mission": "Arabian Sea Oxygen Minimum Zone Survey",
            "speed_knots": 0.60,
            "battery_percent": 71,
            "status": "Active Diving",
            "start_time": "2026-08-18T00:00:00Z",
            "end_time": "2026-09-05T00:00:00Z",
            "sensors": ["Seabird CTD SBE-41", "Oxygen Optode 4330F", "PAR Photosynthetically Active Radiation"],
            "waypoints": [
                {"lat": 15.0, "lon": 68.0, "name": "OMZ Station 1"},
                {"lat": 17.5, "lon": 66.0, "name": "OMZ Station 2"},
                {"lat": 19.5, "lon": 64.0, "name": "OMZ Station 3"}
            ],
            "dive_profile": []
        }
    ]

    for g in gliders:
        # Generate 3D saw-tooth dive segments (0 to 1000m dives)
        wps = g["waypoints"]
        dives = []
        n_segments = 25
        
        for seg in range(n_segments):
            frac = seg / (n_segments - 1)
            lat = wps[0]["lat"] + frac * (wps[-1]["lat"] - wps[0]["lat"])
            lon = wps[0]["lon"] + frac * (wps[-1]["lon"] - wps[0]["lon"])
            
            # Saw-tooth depth oscillation
            dive_phase = (seg % 4) / 4.0
            z_depth = 50.0 + 900.0 * math.sin(dive_phase * math.pi)
            
            # Compute physical parameters
            temp = round(2.8 + (28.5 - 2.8) / (1.0 + math.exp((z_depth - 80.0) / 25.0)) * math.exp(-z_depth / 400.0), 2)
            salt = round(32.8 + 2.2 * math.exp(-z_depth / 200.0) if "Bay of Bengal" in g["mission"] else 36.2 - 1.2 * math.exp(-z_depth / 300.0), 2)
            chla = round(max(0.02, 1.8 * math.exp(-((z_depth - 40)**2)/400.0)), 3)

            dives.append({
                "dive_id": f"DIVE-{seg+1:03d}",
                "latitude": round(lat, 4),
                "longitude": round(lon, 4),
                "depth_m": round(z_depth, 1),
                "temperature": temp,
                "salinity": salt,
                "chlorophyll": chla,
                "timestamp": (datetime(2026, 8, 27, 0, 0) - timedelta(hours=(n_segments - seg) * 4)).isoformat()
            })
        g["dive_profile"] = dives

    with open(GLIDER_JSON_PATH, "w") as fp:
        json.dump(gliders, fp, indent=2)
    print(f"[DataEngine] Saved {len(gliders)} glider missions to {GLIDER_JSON_PATH}")


def generate_buoy_dataset(times):
    """Generates INCOIS Moored OMNI Buoy telemetry (BD & AD series)."""
    buoys = [
        {"id": "BD08", "name": "OMNI Buoy BD08 (Bay of Bengal)", "lat": 18.2, "lon": 89.7, "sst": 29.4, "sss": 31.8, "wind_speed": 14.5, "wave_height": 2.4, "current_speed": 0.42},
        {"id": "BD09", "name": "OMNI Buoy BD09 (Bay of Bengal)", "lat": 17.5, "lon": 89.2, "sst": 29.1, "sss": 32.2, "wind_speed": 16.0, "wave_height": 2.6, "current_speed": 0.48},
        {"id": "BD10", "name": "OMNI Buoy BD10 (Bay of Bengal)", "lat": 14.0, "lon": 87.0, "sst": 28.8, "sss": 33.5, "wind_speed": 15.2, "wave_height": 2.2, "current_speed": 0.38},
        {"id": "BD11", "name": "OMNI Buoy BD11 (Bay of Bengal)", "lat": 13.5, "lon": 84.0, "sst": 28.9, "sss": 33.8, "wind_speed": 13.8, "wave_height": 2.0, "current_speed": 0.35},
        {"id": "AD06", "name": "OMNI Buoy AD06 (Arabian Sea)", "lat": 18.5, "lon": 67.4, "sst": 27.6, "sss": 36.4, "wind_speed": 18.2, "wave_height": 3.1, "current_speed": 0.55},
        {"id": "AD07", "name": "OMNI Buoy AD07 (Arabian Sea)", "lat": 15.0, "lon": 69.0, "sst": 27.2, "sss": 36.6, "wind_speed": 21.0, "wave_height": 3.4, "current_speed": 0.62},
        {"id": "AD08", "name": "OMNI Buoy AD08 (Arabian Sea)", "lat": 12.0, "lon": 68.5, "sst": 26.8, "sss": 36.2, "wind_speed": 19.5, "wave_height": 3.0, "current_speed": 0.58},
        {"id": "AD09", "name": "OMNI Buoy AD09 (Arabian Sea)", "lat": 8.3, "lon": 73.3, "sst": 26.4, "sss": 35.8, "wind_speed": 17.0, "wave_height": 2.8, "current_speed": 0.50},
    ]

    with open(BUOY_JSON_PATH, "w") as fp:
        json.dump(buoys, fp, indent=2)
    print(f"[DataEngine] Saved {len(buoys)} moored OMNI buoys to {BUOY_JSON_PATH}")


class OceanDataEngine:
    """Core data management engine for querying multidimensional ocean models and in-situ observations."""

    def __init__(self):
        generate_synthetic_ocean_datasets()
        self.nc_path = MODEL_NC_PATH
        self._load_dataset()

    def _load_dataset(self):
        try:
            self.ds = xr.open_dataset(self.nc_path)
            print(f"[DataEngine] Loaded NetCDF dataset: {self.ds.attrs.get('title', 'Unknown')}")
        except Exception as e:
            print(f"[DataEngine] Error opening NetCDF: {e}")
            self.ds = None

    def get_datasets_list(self) -> List[Dict[str, Any]]:
        """Returns catalog of registered model and observation datasets."""
        return [
            {
                "id": "incois_roms_io",
                "name": "INCOIS Indian Ocean ROMS Model (0.5°)",
                "type": "Numerical Ocean Model",
                "format": "NetCDF-4 / CF-1.8",
                "region": "Tropical Indian Ocean (55°E - 100°E, 10°S - 25°N)",
                "variables": ["temperature", "salinity", "u_velocity", "v_velocity", "current_speed", "chlorophyll"],
                "depth_range": "0 - 2000 m (14 vertical levels)",
                "time_range": "2026-08-27 00:00 to 2026-08-28 00:00 UTC",
                "active": True
            },
            {
                "id": "incois_argo_insitu",
                "name": "INCOIS In-Situ Argo Float Profiler Network",
                "type": "In-Situ Autonomous Profilers",
                "format": "JSON / NetCDF",
                "region": "Indian Ocean & Marginal Seas",
                "variables": ["temperature", "salinity", "dissolved_oxygen", "chlorophyll"],
                "depth_range": "0 - 2000 m (Continuous CTD Cast)",
                "active": True
            },
            {
                "id": "incois_gliders",
                "name": "INCOIS Autonomous Ocean Glider Missions",
                "type": "Autonomous Underwater Vehicles (AUVs)",
                "format": "JSON / NetCDF",
                "region": "Bay of Bengal & Arabian Sea",
                "variables": ["temperature", "salinity", "chlorophyll"],
                "depth_range": "0 - 1000 m (Saw-tooth transect)",
                "active": True
            },
            {
                "id": "incois_omni_buoys",
                "name": "INCOIS Moored OMNI Buoy Array",
                "type": "Moored Ocean Observatory",
                "format": "JSON / Real-time Telemetry",
                "region": "Arabian Sea & Bay of Bengal",
                "variables": ["sst", "sss", "wind_speed", "wave_height", "current_speed"],
                "depth_range": "Surface Telemetry",
                "active": True
            }
        ]

    def get_dataset_metadata(self, dataset_id: str = "incois_roms_io") -> Dict[str, Any]:
        """Returns detailed metadata, coordinates, depth levels, and variables."""
        if not self.ds:
            return {"error": "Dataset not loaded"}

        depths = [float(z) for z in self.ds.coords["depth"].values]
        times = [str(t) for t in self.ds.coords["time"].values]
        lats = [float(y) for y in self.ds.coords["latitude"].values]
        lons = [float(x) for x in self.ds.coords["longitude"].values]

        var_meta = {}
        for v in ["temperature", "salinity", "u_velocity", "v_velocity", "chlorophyll"]:
            if v in self.ds.variables:
                attrs = self.ds[v].attrs
                var_meta[v] = {
                    "name": v,
                    "long_name": attrs.get("long_name", v),
                    "units": attrs.get("units", ""),
                    "min": float(attrs.get("valid_min", np.nanmin(self.ds[v].values))),
                    "max": float(attrs.get("valid_max", np.nanmax(self.ds[v].values))),
                }

        # Add derived variable current speed
        var_meta["current_speed"] = {
            "name": "current_speed",
            "long_name": "Ocean Current Magnitude",
            "units": "m/s",
            "min": 0.0,
            "max": 1.8,
        }

        return {
            "id": dataset_id,
            "title": self.ds.attrs.get("title", "INCOIS Ocean Model"),
            "institution": self.ds.attrs.get("institution", "INCOIS"),
            "bbox": {
                "min_lat": min(lats),
                "max_lat": max(lats),
                "min_lon": min(lons),
                "max_lon": max(lons),
            },
            "latitudes": lats,
            "longitudes": lons,
            "depths": depths,
            "times": times,
            "variables": var_meta,
        }

    def get_grid_slice(self, variable: str = "temperature", depth: float = 0.0, time_idx: int = 0) -> Dict[str, Any]:
        """
        Extracts a 2D spatial grid slice at a specific depth and time step.
        Supports temperature, salinity, chlorophyll, u_velocity, v_velocity, and current_speed.
        """
        if not self.ds:
            return {"error": "Dataset not loaded"}

        time_idx = max(0, min(time_idx, len(self.ds.coords["time"]) - 1))
        
        # Find closest depth
        depth_values = self.ds.coords["depth"].values
        closest_depth_idx = int(np.argmin(np.abs(depth_values - depth)))
        actual_depth = float(depth_values[closest_depth_idx])

        lats = [float(y) for y in self.ds.coords["latitude"].values]
        lons = [float(x) for x in self.ds.coords["longitude"].values]

        if variable == "current_speed":
            u = self.ds["u_velocity"].isel(time=time_idx, depth=closest_depth_idx).values
            v = self.ds["v_velocity"].isel(time=time_idx, depth=closest_depth_idx).values
            data_2d = np.sqrt(u**2 + v**2)
            u_field = np.where(np.isnan(u), None, np.round(u, 3)).tolist()
            v_field = np.where(np.isnan(v), None, np.round(v, 3)).tolist()
        else:
            if variable not in self.ds.variables:
                variable = "temperature"
            data_2d = self.ds[variable].isel(time=time_idx, depth=closest_depth_idx).values
            u = self.ds["u_velocity"].isel(time=time_idx, depth=closest_depth_idx).values
            v = self.ds["v_velocity"].isel(time=time_idx, depth=closest_depth_idx).values
            u_field = np.where(np.isnan(u), None, np.round(u, 3)).tolist()
            v_field = np.where(np.isnan(v), None, np.round(v, 3)).tolist()

        # Clean NaNs to None for JSON serialization
        cleaned_grid = np.where(np.isnan(data_2d), None, np.round(data_2d, 3)).tolist()

        return {
            "variable": variable,
            "requested_depth": depth,
            "actual_depth": actual_depth,
            "time_idx": time_idx,
            "timestamp": str(self.ds.coords["time"].values[time_idx]),
            "latitudes": lats,
            "longitudes": lons,
            "shape": [len(lats), len(lons)],
            "grid": cleaned_grid,
            "u_field": u_field,
            "v_field": v_field,
        }

    def get_transect(self, transect_type: str = "latitudinal", fix_val: float = 15.0, time_idx: int = 0) -> Dict[str, Any]:
        """
        Extracts a vertical curtain cross section (e.g. depth vs longitude along 15°N, or depth vs latitude along 75°E).
        """
        if not self.ds:
            return {"error": "Dataset not loaded"}

        time_idx = max(0, min(time_idx, len(self.ds.coords["time"]) - 1))
        depths = [float(z) for z in self.ds.coords["depth"].values]

        if transect_type == "latitudinal":
            # Fix latitude, slice along longitude
            lats = self.ds.coords["latitude"].values
            lat_idx = int(np.argmin(np.abs(lats - fix_val)))
            actual_fix = float(lats[lat_idx])
            axis_coords = [float(x) for x in self.ds.coords["longitude"].values]
            axis_name = "Longitude (°E)"

            temp_slice = self.ds["temperature"].isel(time=time_idx, latitude=lat_idx).values
            salt_slice = self.ds["salinity"].isel(time=time_idx, latitude=lat_idx).values
        else:
            # Fix longitude, slice along latitude
            lons = self.ds.coords["longitude"].values
            lon_idx = int(np.argmin(np.abs(lons - fix_val)))
            actual_fix = float(lons[lon_idx])
            axis_coords = [float(y) for y in self.ds.coords["latitude"].values]
            axis_name = "Latitude (°N)"

            temp_slice = self.ds["temperature"].isel(time=time_idx, longitude=lon_idx).values
            salt_slice = self.ds["salinity"].isel(time=time_idx, longitude=lon_idx).values

        return {
            "transect_type": transect_type,
            "fixed_coordinate": actual_fix,
            "axis_name": axis_name,
            "axis_coords": axis_coords,
            "depths": depths,
            "temperature_curtain": np.where(np.isnan(temp_slice), None, np.round(temp_slice, 2)).tolist(),
            "salinity_curtain": np.where(np.isnan(salt_slice), None, np.round(salt_slice, 2)).tolist(),
        }

    def get_argo_observations(self) -> List[Dict[str, Any]]:
        """Returns active Argo floats with profile telemetry."""
        if os.path.exists(ARGO_JSON_PATH):
            with open(ARGO_JSON_PATH, "r") as fp:
                return json.load(fp)
        return []

    def get_argo_float_by_id(self, float_id: str) -> Optional[Dict[str, Any]]:
        """Returns single Argo float detail."""
        floats = self.get_argo_observations()
        for f in floats:
            if f["id"] == str(float_id):
                return f
        return None

    def get_glider_missions(self) -> List[Dict[str, Any]]:
        """Returns glider missions with 3D saw-tooth dive trajectories."""
        if os.path.exists(GLIDER_JSON_PATH):
            with open(GLIDER_JSON_PATH, "r") as fp:
                return json.load(fp)
        return []

    def get_buoys(self) -> List[Dict[str, Any]]:
        """Returns moored OMNI buoy telemetry."""
        if os.path.exists(BUOY_JSON_PATH):
            with open(BUOY_JSON_PATH, "r") as fp:
                return json.load(fp)
        return []


# Singleton instance
data_engine = OceanDataEngine()
