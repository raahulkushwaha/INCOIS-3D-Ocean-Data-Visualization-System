/**
 * INCOIS 3D Ocean Data Visualization - Depth Profile & Comparison Chart Engine
 * Renders high-precision vertical ocean profile curves, Model-vs-Observation overlays, and difference metrics.
 */

class ProfileChartEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.currentData = null;
  }

  /**
   * Renders Depth Profile or Model vs Observation Comparison Chart
   */
  renderComparisonChart(compData) {
    if (!this.canvas) return;
    this.currentData = compData;

    const ctx = this.ctx;
    const width = this.canvas.width = this.canvas.clientWidth * window.devicePixelRatio || 360;
    const height = this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio || 220;

    ctx.clearRect(0, 0, width, height);

    if (!compData || !compData.depth_profile || compData.depth_profile.length === 0) {
      this.renderEmptyState(ctx, width, height, "No observation selected. Click an Argo float or Glider on the 3D globe.");
      return;
    }

    const profiles = compData.depth_profile;
    const unit = compData.unit || "°C";

    // Margins
    const padLeft = 45 * window.devicePixelRatio;
    const padRight = 20 * window.devicePixelRatio;
    const padTop = 25 * window.devicePixelRatio;
    const padBottom = 30 * window.devicePixelRatio;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Determine X value range (Variable e.g. Temperature 0 to 32°C)
    let minX = Infinity, maxX = -Infinity;
    let maxDepth = 0;

    profiles.forEach(p => {
      if (p.model_value < minX) minX = p.model_value;
      if (p.model_value > maxX) maxX = p.model_value;
      if (p.obs_value < minX) minX = p.obs_value;
      if (p.obs_value > maxX) maxX = p.obs_value;
      if (p.depth_m > maxDepth) maxDepth = p.depth_m;
    });

    // Add 5% padding
    const xSpan = maxX - minX || 1.0;
    minX = Math.floor(minX - xSpan * 0.05);
    maxX = Math.ceil(maxX + xSpan * 0.05);

    // Coordinate mapping functions (Oceanographic depth is inverted: 0m at top, 2000m at bottom)
    const mapX = (v) => padLeft + ((v - minX) / (maxX - minX)) * plotW;
    const mapY = (z) => padTop + (z / maxDepth) * plotH;

    // 1. Background Grid & Axes
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1 * window.devicePixelRatio;

    // Horizontal Depth Grid Lines
    const depthTicks = [0, 200, 500, 1000, 1500, 2000].filter(d => d <= maxDepth);
    ctx.fillStyle = "#64748b";
    ctx.font = `${9 * window.devicePixelRatio}px 'JetBrains Mono', monospace`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    depthTicks.forEach(z => {
      const y = mapY(z);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
      ctx.fillText(`${z}m`, padLeft - 6 * window.devicePixelRatio, y);
    });

    // Vertical Variable Grid Lines
    const nXTicks = 4;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i <= nXTicks; i++) {
      const v = minX + (i / nXTicks) * (maxX - minX);
      const x = mapX(v);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, height - padBottom);
      ctx.stroke();
      ctx.fillText(`${v.toFixed(1)}${unit}`, x, height - padBottom + 6 * window.devicePixelRatio);
    }

    // 2. Draw Delta Difference Shaded Region between Model and Obs
    ctx.beginPath();
    for (let i = 0; i < profiles.length; i++) {
      const x = mapX(profiles[i].model_value);
      const y = mapY(profiles[i].depth_m);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = profiles.length - 1; i >= 0; i--) {
      const x = mapX(profiles[i].obs_value);
      const y = mapY(profiles[i].depth_m);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(0, 242, 255, 0.12)";
    ctx.fill();

    // 3. Draw Model Curve (Solid Cyan line)
    ctx.beginPath();
    ctx.strokeStyle = "#00f2ff";
    ctx.lineWidth = 2.5 * window.devicePixelRatio;
    profiles.forEach((p, idx) => {
      const x = mapX(p.model_value);
      const y = mapY(p.depth_m);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 4. Draw Observation Curve (Emerald dashed line with circular dots)
    ctx.beginPath();
    ctx.setLineDash([4 * window.devicePixelRatio, 3 * window.devicePixelRatio]);
    ctx.strokeStyle = "#00e599";
    ctx.lineWidth = 2.0 * window.devicePixelRatio;
    profiles.forEach((p, idx) => {
      const x = mapX(p.obs_value);
      const y = mapY(p.depth_m);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // Draw observation point markers
    ctx.fillStyle = "#00e599";
    profiles.forEach(p => {
      const x = mapX(p.obs_value);
      const y = mapY(p.depth_m);
      ctx.beginPath();
      ctx.arc(x, y, 3 * window.devicePixelRatio, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Chart Title / Header
    ctx.fillStyle = "#f0f6fc";
    ctx.font = `600 ${11 * window.devicePixelRatio}px 'Outfit', sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`${compData.platform_name || 'Observation'} vs INCOIS Model`, padLeft, 6 * window.devicePixelRatio);
  }

  renderEmptyState(ctx, width, height, message) {
    ctx.fillStyle = "#64748b";
    ctx.font = `${11 * window.devicePixelRatio}px 'Inter', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, width / 2, height / 2);
  }

  exportAsCSV() {
    if (!this.currentData || !this.currentData.depth_profile) {
      alert("No active comparison profile to export.");
      return;
    }

    const rows = [
      ["Platform", this.currentData.platform_name],
      ["ID", this.currentData.platform_id],
      ["Variable", this.currentData.variable],
      ["Unit", this.currentData.unit],
      ["RMSE", this.currentData.statistics?.rmse],
      ["Bias", this.currentData.statistics?.bias],
      ["Pearson_r", this.currentData.statistics?.pearson_r],
      [],
      ["Depth_m", "Model_Value", "Observation_Value", "Delta_Diff"]
    ];

    this.currentData.depth_profile.forEach(p => {
      rows.push([p.depth_m, p.model_value, p.obs_value, p.delta]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `incois_comparison_${this.currentData.platform_id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportAsPNG() {
    if (!this.canvas) return;
    const link = document.createElement("a");
    link.download = `incois_depth_profile_${Date.now()}.png`;
    link.href = this.canvas.toDataURL("image/png");
    link.click();
  }
}

window.ProfileChartEngine = ProfileChartEngine;
