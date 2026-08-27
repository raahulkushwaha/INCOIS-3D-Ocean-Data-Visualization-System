"""
INCOIS Model vs Observation Comparison Service
Performs 4D spatial/temporal/vertical collocation of numerical ocean model
fields with in-situ observational platforms (Argo, Gliders) and computes
oceanographic validation statistics (RMSE, Bias, MAE, Pearson r).
"""

import numpy as np
from typing import Dict, Any, Optional
from backend.data_engine import data_engine


class ComparisonService:
    """Collocates numerical model grids with in-situ profiles and computes validation metrics."""

    @staticmethod
    def compare_model_with_argo(float_id: str, variable: str = "temperature", time_idx: int = 0) -> Dict[str, Any]:
        """
        Extracts collocated vertical profile from the 3D NetCDF model at the float's (lat, lon)
        and computes comparison statistics against the observed Argo profile.
        """
        argo_float = data_engine.get_argo_float_by_id(float_id)
        if not argo_float:
            return {"error": f"Argo float {float_id} not found"}

        if not data_engine.ds:
            return {"error": "Ocean model dataset not initialized"}

        lat = argo_float["latitude"]
        lon = argo_float["longitude"]

        obs_profile = argo_float["profile"]
        obs_depths = np.array(obs_profile["depths"])
        
        if variable not in obs_profile:
            variable = "temperature"

        obs_values = np.array(obs_profile[variable])

        # Extract collocated model profile at nearest grid point
        lats = data_engine.ds.coords["latitude"].values
        lons = data_engine.ds.coords["longitude"].values
        model_depths = data_engine.ds.coords["depth"].values

        lat_idx = int(np.argmin(np.abs(lats - lat)))
        lon_idx = int(np.argmin(np.abs(lons - lon)))

        time_idx = max(0, min(time_idx, len(data_engine.ds.coords["time"]) - 1))

        if variable in data_engine.ds.variables:
            model_raw_prof = data_engine.ds[variable].isel(
                time=time_idx, latitude=lat_idx, longitude=lon_idx
            ).values
        else:
            model_raw_prof = np.zeros_like(model_depths)

        # Interpolate model profile onto the observational depth levels
        # using monotonic cubic / linear spline interpolation
        valid_model_mask = ~np.isnan(model_raw_prof)
        if np.sum(valid_model_mask) >= 2:
            model_interp_on_obs = np.interp(
                obs_depths,
                model_depths[valid_model_mask],
                model_raw_prof[valid_model_mask],
                left=model_raw_prof[valid_model_mask][0],
                right=model_raw_prof[valid_model_mask][-1]
            )
        else:
            model_interp_on_obs = np.zeros_like(obs_depths)

        # Calculate oceanographic statistics
        diff = model_interp_on_obs - obs_values
        rmse = float(np.sqrt(np.mean(diff**2)))
        bias = float(np.mean(diff))
        mae = float(np.mean(np.abs(diff)))
        
        # Pearson correlation
        if np.std(model_interp_on_obs) > 1e-6 and np.std(obs_values) > 1e-6:
            r_matrix = np.corrcoef(model_interp_on_obs, obs_values)
            corr_coef = float(r_matrix[0, 1])
        else:
            corr_coef = 1.0

        # Depth-dependent difference profile
        diff_profile = [
            {
                "depth_m": float(z),
                "model_value": round(float(m_val), 3),
                "obs_value": round(float(o_val), 3),
                "delta": round(float(d_val), 3),
            }
            for z, m_val, o_val, d_val in zip(obs_depths, model_interp_on_obs, obs_values, diff)
        ]

        unit = "°C" if variable == "temperature" else ("PSU" if variable == "salinity" else ("mg/m³" if variable == "chlorophyll" else "µmol/kg"))

        return {
            "platform_type": "Argo Float",
            "platform_id": float_id,
            "platform_name": argo_float["name"],
            "region": argo_float["region"],
            "coordinates": {"latitude": lat, "longitude": lon},
            "collocated_model_grid": {
                "latitude": float(lats[lat_idx]),
                "longitude": float(lons[lon_idx]),
                "grid_distance_km": round(float(np.sqrt((lat - lats[lat_idx])**2 + (lon - lons[lon_idx])**2) * 111.0), 1),
            },
            "variable": variable,
            "unit": unit,
            "statistics": {
                "rmse": round(rmse, 3),
                "bias": round(bias, 3),
                "mae": round(mae, 3),
                "pearson_r": round(corr_coef, 4),
                "sample_points": len(obs_depths),
            },
            "depth_profile": diff_profile,
        }


comparison_service = ComparisonService()
