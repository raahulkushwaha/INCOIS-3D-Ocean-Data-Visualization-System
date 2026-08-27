"""
INCOIS 3D Ocean Data Visualization Platform - FastAPI Scientific Backend
Provides RESTful APIs for querying multidimensional ocean models (NetCDF/xarray),
in-situ platforms (Argo, Gliders, Moored Buoys), vertical transects, and
model-observation collocation comparison.
"""

import os
import shutil
from fastapi import FastAPI, UploadFile, File, Form, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from typing import Optional

from backend.data_engine import data_engine, DATA_DIR
from backend.comparison_service import comparison_service
from backend.adapters.data_adapters import CSVInSituAdapter

app = FastAPI(
    title="INCOIS 3D Ocean Data Visualization API",
    description="Operational 3D Oceanographic Data & Observation Integration Platform",
    version="1.0.0"
)

# Enable CORS for cross-origin development if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "INCOIS 3D Ocean Data Platform",
        "netcdf_loaded": data_engine.ds is not None,
    }


@app.get("/api/datasets")
def get_datasets():
    """Lists registered ocean model and observation datasets."""
    return {"datasets": data_engine.get_datasets_list()}


@app.get("/api/datasets/{dataset_id}/metadata")
def get_dataset_metadata(dataset_id: str):
    """Returns grid coordinates, depths, times, and variable metadata."""
    meta = data_engine.get_dataset_metadata(dataset_id)
    if "error" in meta:
        raise HTTPException(status_code=404, detail=meta["error"])
    return meta


@app.get("/api/data")
def get_slice_data(
    variable: str = Query("temperature", description="Variable: temperature, salinity, chlorophyll, u_velocity, v_velocity, current_speed"),
    depth: float = Query(0.0, description="Depth level in meters (0 to 2000m)"),
    time_idx: int = Query(0, description="Time step index (0 to 4)")
):
    """
    Returns 2D horizontal slice of requested ocean variable at specific depth & time.
    Includes (u, v) vector field components for current flow rendering.
    """
    slice_data = data_engine.get_grid_slice(variable=variable, depth=depth, time_idx=time_idx)
    if "error" in slice_data:
        raise HTTPException(status_code=500, detail=slice_data["error"])
    return slice_data


@app.get("/api/transect")
def get_transect(
    transect_type: str = Query("latitudinal", description="'latitudinal' (along Lon at fixed Lat) or 'longitudinal' (along Lat at fixed Lon)"),
    fix_val: float = Query(15.0, description="Fixed coordinate value (e.g. 15°N Lat or 75°E Lon)"),
    time_idx: int = Query(0, description="Time index")
):
    """Returns vertical cross-section curtain slice (Depth vs Space)."""
    transect = data_engine.get_transect(transect_type=transect_type, fix_val=fix_val, time_idx=time_idx)
    if "error" in transect:
        raise HTTPException(status_code=500, detail=transect["error"])
    return transect


@app.get("/api/observations/argo")
def get_argo_observations():
    """Returns all active Argo float markers and summaries."""
    return {"floats": data_engine.get_argo_observations()}


@app.get("/api/observations/argo/{float_id}")
def get_argo_float_detail(float_id: str):
    """Returns specific Argo float details, history trajectory, and vertical profile."""
    float_data = data_engine.get_argo_float_by_id(float_id)
    if not float_data:
        raise HTTPException(status_code=404, detail="Argo float not found")
    return float_data


@app.get("/api/observations/gliders")
def get_glider_missions():
    """Returns active underwater glider missions and saw-tooth dive trajectories."""
    return {"gliders": data_engine.get_glider_missions()}


@app.get("/api/observations/buoys")
def get_buoys():
    """Returns moored OMNI buoy telemetry (Bay of Bengal & Arabian Sea)."""
    return {"buoys": data_engine.get_buoys()}


@app.get("/api/comparison")
def compare_model_with_observation(
    float_id: str = Query("2902145", description="Argo float WMO ID"),
    variable: str = Query("temperature", description="Comparison variable"),
    time_idx: int = Query(0, description="Time index")
):
    """
    Collocates 3D model grid with in-situ observation profile and returns:
    - Side-by-side / overlay profiles
    - Difference profile (Delta = Model - Obs)
    - Statistical metrics (RMSE, Bias, MAE, Pearson correlation)
    """
    comparison = comparison_service.compare_model_with_argo(
        float_id=float_id, variable=variable, time_idx=time_idx
    )
    if "error" in comparison:
        raise HTTPException(status_code=404, detail=comparison["error"])
    return comparison


@app.post("/api/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    dataset_name: str = Form("User Uploaded Dataset")
):
    """Handles uploading custom NetCDF or CSV observation files."""
    filename = file.filename or "uploaded_file"
    target_path = os.path.join(DATA_DIR, filename)

    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    if filename.endswith(".csv") or filename.endswith(".txt"):
        with open(target_path, "r") as fp:
            content = fp.read()
        adapter = CSVInSituAdapter(content)
        parsed = adapter.parse_profile()
        return {
            "status": "success",
            "message": f"Parsed observation file {filename}",
            "records": parsed.get("record_count", 0),
            "columns": parsed.get("columns", [])
        }
    elif filename.endswith(".nc") or filename.endswith(".nc4"):
        return {
            "status": "success",
            "message": f"Ingested NetCDF dataset {filename} ({os.path.getsize(target_path)} bytes)",
            "file": filename
        }
    else:
        return {
            "status": "success",
            "message": f"Uploaded file {filename}",
        }


# Mount Frontend static assets
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.api_route("/", methods=["GET", "HEAD"])
    def serve_frontend_root():
        index_path = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"message": "Frontend index.html not found"}
