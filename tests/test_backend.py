"""
Unit & Integration Tests for INCOIS 3D Ocean Data Visualization Backend
"""

import pytest
from fastapi.testclient import TestClient
from backend.app import app
from backend.data_engine import data_engine
from backend.comparison_service import comparison_service

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["netcdf_loaded"] is True


def test_datasets_list():
    response = client.get("/api/datasets")
    assert response.status_code == 200
    data = response.json()
    assert "datasets" in data
    assert len(data["datasets"]) >= 4


def test_dataset_metadata():
    response = client.get("/api/datasets/incois_roms_io/metadata")
    assert response.status_code == 200
    meta = response.json()
    assert "variables" in meta
    assert "temperature" in meta["variables"]
    assert "salinity" in meta["variables"]
    assert "depths" in meta
    assert len(meta["depths"]) >= 10


def test_slice_data():
    response = client.get("/api/data?variable=temperature&depth=50&time_idx=0")
    assert response.status_code == 200
    slice_data = response.json()
    assert slice_data["variable"] == "temperature"
    assert "grid" in slice_data
    assert "u_field" in slice_data
    assert "v_field" in slice_data
    assert len(slice_data["grid"]) > 0


def test_transect_data():
    response = client.get("/api/transect?transect_type=latitudinal&fix_val=15.0&time_idx=0")
    assert response.status_code == 200
    transect = response.json()
    assert "depths" in transect
    assert "temperature_curtain" in transect
    assert len(transect["temperature_curtain"]) == len(transect["depths"])


def test_argo_observations():
    response = client.get("/api/observations/argo")
    assert response.status_code == 200
    data = response.json()
    assert "floats" in data
    assert len(data["floats"]) >= 8

    float_id = data["floats"][0]["id"]
    detail_res = client.get(f"/api/observations/argo/{float_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == float_id
    assert "profile" in detail
    assert "temperature" in detail["profile"]


def test_glider_missions():
    response = client.get("/api/observations/gliders")
    assert response.status_code == 200
    data = response.json()
    assert "gliders" in data
    assert len(data["gliders"]) >= 2
    assert "dive_profile" in data["gliders"][0]


def test_buoys():
    response = client.get("/api/observations/buoys")
    assert response.status_code == 200
    data = response.json()
    assert "buoys" in data
    assert len(data["buoys"]) >= 8


def test_model_observation_comparison():
    response = client.get("/api/comparison?float_id=2902145&variable=temperature&time_idx=0")
    assert response.status_code == 200
    comp = response.json()
    assert "statistics" in comp
    assert "rmse" in comp["statistics"]
    assert "bias" in comp["statistics"]
    assert "pearson_r" in comp["statistics"]
    assert "depth_profile" in comp
    assert len(comp["depth_profile"]) > 0
    assert comp["statistics"]["rmse"] >= 0
