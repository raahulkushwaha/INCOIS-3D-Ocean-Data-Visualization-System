/**
 * INCOIS 3D Ocean Data Visualization - API Client Module
 * Communicates with the FastAPI backend with caching and progressive subsetting.
 */

class ApiClient {
  constructor() {
    this.baseUrl = window.location.origin;
    this.cache = new Map();
  }

  async get(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    const cacheKey = url.toString();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.cache.set(cacheKey, data);
      return data;
    } catch (err) {
      console.error(`[API] Request failed for ${endpoint}:`, err);
      throw err;
    }
  }

  async getDatasets() {
    return this.get('/api/datasets');
  }

  async getDatasetMetadata(id = 'incois_roms_io') {
    return this.get(`/api/datasets/${id}/metadata`);
  }

  async getSliceData(variable = 'temperature', depth = 0, timeIdx = 0) {
    return this.get('/api/data', { variable, depth, time_idx: timeIdx });
  }

  async getTransect(transectType = 'latitudinal', fixVal = 15.0, timeIdx = 0) {
    return this.get('/api/transect', { transect_type: transectType, fix_val: fixVal, time_idx: timeIdx });
  }

  async getArgoFloats() {
    return this.get('/api/observations/argo');
  }

  async getGliders() {
    return this.get('/api/observations/gliders');
  }

  async getBuoys() {
    return this.get('/api/observations/buoys');
  }

  async getComparison(floatId = '2902145', variable = 'temperature', timeIdx = 0) {
    return this.get('/api/comparison', { float_id: floatId, variable, time_idx: timeIdx });
  }

  async uploadDataset(formData) {
    const response = await fetch(`${this.baseUrl}/api/upload`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error(`Upload failed with status: ${response.status}`);
    return await response.json();
  }
}

window.apiClient = new ApiClient();
