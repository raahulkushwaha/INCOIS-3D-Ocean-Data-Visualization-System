/**
 * INCOIS 3D Ocean Data Visualization - Scientific Colormaps
 * Provides perceptually uniform palettes (Viridis, Plasma, Thermal, Haline, Turbo, Cool-Warm, Jet)
 */

class ColormapEngine {
  constructor() {
    this.palettes = {
      viridis: [
        [68, 1, 84], [72, 35, 116], [64, 67, 135], [52, 94, 141],
        [41, 120, 142], [32, 144, 140], [34, 167, 132], [68, 190, 112],
        [121, 209, 81], [189, 222, 38], [253, 231, 37]
      ],
      plasma: [
        [13, 8, 135], [75, 3, 161], [125, 3, 168], [168, 34, 150],
        [203, 70, 121], [229, 107, 93], [248, 148, 65], [253, 195, 40],
        [240, 249, 33]
      ],
      inferno: [
        [0, 0, 4], [40, 11, 84], [101, 21, 110], [159, 42, 99],
        [212, 72, 66], [245, 125, 21], [250, 193, 39], [252, 255, 164]
      ],
      thermal: [
        [4, 5, 25], [18, 34, 94], [31, 86, 156], [42, 157, 182],
        [80, 200, 120], [210, 220, 50], [240, 160, 20], [230, 40, 20]
      ],
      haline: [
        [17, 24, 39], [30, 58, 138], [29, 116, 186], [14, 165, 233],
        [56, 189, 248], [165, 243, 252], [240, 253, 250], [254, 240, 138]
      ],
      turbo: [
        [48, 18, 59], [70, 134, 251], [27, 229, 181], [164, 252, 60],
        [251, 185, 56], [227, 68, 10], [122, 4, 3]
      ],
      coolwarm: [
        [59, 76, 192], [109, 140, 242], [167, 195, 255], [221, 231, 250],
        [247, 214, 197], [244, 154, 123], [214, 86, 68], [180, 4, 38]
      ],
      jet: [
        [0, 0, 143], [0, 0, 255], [0, 127, 255], [0, 255, 255],
        [127, 255, 127], [255, 255, 0], [255, 127, 0], [255, 0, 0], [127, 0, 0]
      ]
    };
  }

  getColor(normalizedValue, paletteName = 'turbo', reversed = false) {
    let t = Math.max(0.0, Math.min(1.0, normalizedValue));
    if (reversed) t = 1.0 - t;

    const colors = this.palettes[paletteName] || this.palettes.turbo;
    const n = colors.length - 1;
    const idx = t * n;
    const i = Math.floor(idx);
    const f = idx - i;

    if (i >= n) {
      const c = colors[n];
      return { r: c[0], g: c[1], b: c[2], hex: this.rgbToHex(c[0], c[1], c[2]) };
    }

    const c1 = colors[i];
    const c2 = colors[i + 1];

    const r = Math.round(c1[0] + f * (c2[0] - c1[0]));
    const g = Math.round(c1[1] + f * (c2[1] - c1[1]));
    const b = Math.round(c1[2] + f * (c2[2] - c1[2]));

    return {
      r, g, b,
      hex: this.rgbToHex(r, g, b),
      css: `rgb(${r}, ${g}, ${b})`,
      normR: r / 255.0,
      normG: g / 255.0,
      normB: b / 255.0
    };
  }

  rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  renderColorbarToCanvas(canvas, paletteName = 'turbo', reversed = false) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.createImageData(width, height);

    for (let x = 0; x < width; x++) {
      const t = x / (width - 1);
      const color = this.getColor(t, paletteName, reversed);
      for (let y = 0; y < height; y++) {
        const idx = (y * width + x) * 4;
        imgData.data[idx] = color.r;
        imgData.data[idx + 1] = color.g;
        imgData.data[idx + 2] = color.b;
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }
}

window.colormaps = new ColormapEngine();
