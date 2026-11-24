import * as THREE from 'three';

/**
 * Generador procedural de materiales PBR (Albedo + Bump + Roughness) en Canvas.
 * Evita cualquier superficie plana o geométrica artificial, logrando paredes húmedas,
 * hormigón deteriorado, baldosas manchadas, metal oxidado y madera envejecida
 * que reaccionan de forma realista al haz de la linterna.
 */
export class PBRTextureFactory {
  constructor() {
    this.cache = new Map();
  }

  makeCanvas(size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    return { canvas, ctx: canvas.getContext('2d'), size };
  }

  toTexture(canvas, repeatX = 1, repeatY = 1, isColor = true) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = 8;
    if (isColor) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    return tex;
  }

  addNoise(ctx, size, amount = 18, alpha = 0.14) {
    const img = ctx.getImageData(0, 0, size, size);
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() * 2 - 1) * amount;
      data[i] = Math.max(0, Math.min(255, data[i] + n));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
      if (alpha < 1) {
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  /**
   * Muro de hormigón institucional deteriorado (estilo Silent Hill 2 / RE7).
   */
  getWallMaterial(theme = 'corridor') {
    const key = `wall_${theme}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const palettes = {
      cell: { top: '#47505c', bottom: '#2d333b', trim: '#1d2228', stain: 'rgba(18,14,10,0.45)' },
      corridor: { top: '#4c483f', bottom: '#322e27', trim: '#211e19', stain: 'rgba(42,28,15,0.38)' },
      security: { top: '#394a47', bottom: '#24312f', trim: '#16201e', stain: 'rgba(10,20,18,0.4)' },
      archive: { top: '#4a3d32', bottom: '#30271f', trim: '#1f1812', stain: 'rgba(20,12,6,0.45)' },
      medical: { top: '#544e4d', bottom: '#383333', trim: '#4a2225', stain: 'rgba(78,18,22,0.35)' },
      generator: { top: '#404036', bottom: '#2b2b24', trim: '#3b321d', stain: 'rgba(35,28,12,0.5)' },
      office: { top: '#524033', bottom: '#36281d', trim: '#241810', stain: 'rgba(15,10,6,0.35)' },
      core: { top: '#40262d', bottom: '#29171d', trim: '#4d1720', stain: 'rgba(95,12,20,0.45)' },
    };
    const p = palettes[theme] || palettes.corridor;

    const { canvas: albedo, ctx: aCtx, size } = this.makeCanvas(512);
    const { canvas: bump, ctx: bCtx } = this.makeCanvas(512);
    const { canvas: rough, ctx: rCtx } = this.makeCanvas(512);

    // Base en dos tonos con franja de humedad inferior
    const grad = aCtx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, p.top);
    grad.addColorStop(0.58, p.top);
    grad.addColorStop(0.62, p.bottom);
    grad.addColorStop(1, p.trim);
    aCtx.fillStyle = grad;
    aCtx.fillRect(0, 0, size, size);

    // Zócalo y moldura media
    aCtx.fillStyle = p.trim;
    aCtx.fillRect(0, size * 0.58, size, 10);
    aCtx.fillRect(0, size * 0.9, size, size * 0.1);

    // Bump + Roughness base
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, size, size);
    bCtx.fillStyle = '#c8c8c8';
    bCtx.fillRect(0, size * 0.58, size, 10);
    bCtx.fillRect(0, size * 0.9, size, size * 0.1);

    rCtx.fillStyle = '#d4d4d4';
    rCtx.fillRect(0, 0, size, size);

    // Escurrimientos verticales de humedad (brillan levemente al darles la linterna)
    for (let i = 0; i < 28; i += 1) {
      const x = Math.random() * size;
      const w = 6 + Math.random() * 24;
      const h = 110 + Math.random() * 340;
      const y = Math.random() * (size * 0.45);
      aCtx.fillStyle = p.stain;
      aCtx.fillRect(x, y, w, h);
      rCtx.fillStyle = '#555555'; // Más liso/húmedo donde escurre agua
      rCtx.fillRect(x, y, w, h);
    }

    // Grietas finas en el hormigón
    aCtx.strokeStyle = 'rgba(0,0,0,0.45)';
    bCtx.strokeStyle = '#202020';
    for (let i = 0; i < 9; i += 1) {
      let cx = Math.random() * size;
      let cy = Math.random() * size;
      aCtx.beginPath();
      bCtx.beginPath();
      aCtx.moveTo(cx, cy);
      bCtx.moveTo(cx, cy);
      for (let s = 0; s < 6; s += 1) {
        cx += (Math.random() - 0.5) * 32;
        cy += 14 + Math.random() * 26;
        aCtx.lineTo(cx, cy);
        bCtx.lineTo(cx, cy);
      }
      aCtx.lineWidth = 1.4;
      bCtx.lineWidth = 2;
      aCtx.stroke();
      bCtx.stroke();
    }

    this.addNoise(aCtx, size, 16);
    this.addNoise(bCtx, size, 28);
    this.addNoise(rCtx, size, 14);

    const mat = new THREE.MeshStandardMaterial({
      map: this.toTexture(albedo, 1, 1, true),
      bumpMap: this.toTexture(bump, 1, 1, false),
      bumpScale: 0.045,
      roughnessMap: this.toTexture(rough, 1, 1, false),
      roughness: 0.88,
      metalness: 0.08,
    });
    this.cache.set(key, mat);
    return mat;
  }

  /**
   * Suelos de baldosas desgastadas / hormigón húmedo / rejilla industrial por habitación.
   */
  getFloorMaterial(theme = 'corridor') {
    const key = `floor_${theme}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const palettes = {
      cell: { a: '#353c45', b: '#2a3038', grout: '#121519', tileCount: 4, metal: 0.14 },
      corridor: { a: '#3d3932', b: '#302d27', grout: '#14120f', tileCount: 4, metal: 0.12 },
      security: { a: '#2c3b39', b: '#222e2c', grout: '#0d1413', tileCount: 4, metal: 0.22 },
      archive: { a: '#3e3328', b: '#30271e', grout: '#15100c', tileCount: 6, metal: 0.08 },
      medical: { a: '#474242', b: '#383434', grout: '#1a1617', tileCount: 6, metal: 0.16 },
      generator: { a: '#30322b', b: '#252721', grout: '#11120e', tileCount: 8, metal: 0.45 },
      office: { a: '#423126', b: '#34251c', grout: '#18100a', tileCount: 6, metal: 0.1 },
      core: { a: '#331e24', b: '#26151a', grout: '#10070a', tileCount: 4, metal: 0.4 },
    };
    const p = palettes[theme] || palettes.corridor;

    const { canvas: albedo, ctx: aCtx, size } = this.makeCanvas(512);
    const { canvas: bump, ctx: bCtx } = this.makeCanvas(512);
    const { canvas: rough, ctx: rCtx } = this.makeCanvas(512);

    const step = size / p.tileCount;
    bCtx.fillStyle = '#999999';
    bCtx.fillRect(0, 0, size, size);
    rCtx.fillStyle = '#c8c8c8';
    rCtx.fillRect(0, 0, size, size);

    for (let y = 0; y < p.tileCount; y += 1) {
      for (let x = 0; x < p.tileCount; x += 1) {
        aCtx.fillStyle = (x + y) % 2 === 0 ? p.a : p.b;
        aCtx.fillRect(x * step, y * step, step, step);

        // Variación orgánica por loseta
        aCtx.fillStyle = `rgba(0,0,0,${Math.random() * 0.18})`;
        aCtx.fillRect(x * step + 2, y * step + 2, step - 4, step - 4);

        // Juntas hundidas
        aCtx.strokeStyle = p.grout;
        aCtx.lineWidth = 3;
        aCtx.strokeRect(x * step, y * step, step, step);

        bCtx.strokeStyle = '#242424';
        bCtx.lineWidth = 4;
        bCtx.strokeRect(x * step, y * step, step, step);
      }
    }

    // Charcos sutiles de humedad (reflejan la linterna)
    for (let i = 0; i < 6; i += 1) {
      const px = Math.random() * size;
      const py = Math.random() * size;
      const rad = 24 + Math.random() * 64;
      const rGrad = rCtx.createRadialGradient(px, py, 4, px, py, rad);
      rGrad.addColorStop(0, '#2a2a2a');
      rGrad.addColorStop(1, 'rgba(200,200,200,0)');
      rCtx.fillStyle = rGrad;
      rCtx.beginPath();
      rCtx.arc(px, py, rad, 0, Math.PI * 2);
      rCtx.fill();

      aCtx.fillStyle = theme === 'medical' || theme === 'core'
        ? 'rgba(65, 12, 16, 0.22)'
        : 'rgba(8, 10, 12, 0.25)';
      aCtx.beginPath();
      aCtx.arc(px, py, rad * 0.85, 0, Math.PI * 2);
      aCtx.fill();
    }

    this.addNoise(aCtx, size, 14);
    this.addNoise(bCtx, size, 22);

    const mat = new THREE.MeshStandardMaterial({
      map: this.toTexture(albedo, 1, 1, true),
      bumpMap: this.toTexture(bump, 1, 1, false),
      bumpScale: 0.035,
      roughnessMap: this.toTexture(rough, 1, 1, false),
      roughness: 0.82,
      metalness: p.metal,
    });
    this.cache.set(key, mat);
    return mat;
  }

  getCeilingMaterial() {
    if (this.cache.has('ceiling')) return this.cache.get('ceiling');
    const { canvas, ctx, size } = this.makeCanvas(512);
    ctx.fillStyle = '#14161a';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#090a0d';
    ctx.lineWidth = 4;
    for (let i = 0; i <= 4; i += 1) {
      const p = (i * size) / 4;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
    this.addNoise(ctx, size, 12);

    const mat = new THREE.MeshStandardMaterial({
      map: this.toTexture(canvas, 1, 1, true),
      roughness: 0.94,
      metalness: 0.06,
    });
    this.cache.set('ceiling', mat);
    return mat;
  }

  getMetalMaterial(colorHex = '#384047', rustAmount = 0.35, metalness = 0.65) {
    const key = `metal_${colorHex}_${rustAmount}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const { canvas, ctx, size } = this.makeCanvas(256);
    const { canvas: bump, ctx: bCtx } = this.makeCanvas(256);

    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, size, size);
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, size, size);

    // Rayones horizontales de acero cepillado
    for (let i = 0; i < 65; i += 1) {
      const y = Math.random() * size;
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(0, y, size, 1);
    }

    // Manchas de óxido orgánico
    const spots = Math.round(rustAmount * 28);
    for (let i = 0; i < spots; i += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 8 + Math.random() * 26;
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, 'rgba(92, 42, 18, 0.55)');
      g.addColorStop(1, 'rgba(92, 42, 18, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    this.addNoise(ctx, size, 14);
    this.addNoise(bCtx, size, 24);

    const mat = new THREE.MeshStandardMaterial({
      map: this.toTexture(canvas, 1, 1, true),
      bumpMap: this.toTexture(bump, 1, 1, false),
      bumpScale: 0.025,
      roughness: 0.55 + rustAmount * 0.25,
      metalness,
    });
    this.cache.set(key, mat);
    return mat;
  }

  getWoodMaterial(dark = true) {
    const key = dark ? 'wood_dark' : 'wood_med';
    if (this.cache.has(key)) return this.cache.get(key);

    const { canvas, ctx, size } = this.makeCanvas(256);
    ctx.fillStyle = dark ? '#2e1f16' : '#4a3322';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 90; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.14)' : 'rgba(130,85,48,0.09)';
      ctx.fillRect(0, (i / 90) * size, size, 2 + Math.random() * 3);
    }
    this.addNoise(ctx, size, 10);

    const mat = new THREE.MeshStandardMaterial({
      map: this.toTexture(canvas, 1, 1, true),
      roughness: 0.72,
      metalness: 0.05,
    });
    this.cache.set(key, mat);
    return mat;
  }

  getBookshelfMaterial() {
    if (this.cache.has('bookshelf_files')) return this.cache.get('bookshelf_files');
    const { canvas, ctx, size } = this.makeCanvas(512);
    ctx.fillStyle = '#181410';
    ctx.fillRect(0, 0, size, size);

    const rows = 6;
    const rowH = size / rows;
    const folderColors = ['#6b5d49', '#523b2f', '#3d474f', '#5d5748', '#4d2b2b', '#41473c'];

    for (let r = 0; r < rows; r += 1) {
      // Estante metálico
      ctx.fillStyle = '#2d3138';
      ctx.fillRect(0, r * rowH + rowH - 8, size, 8);
      // Archivadores y expedientes
      let x = 6;
      while (x < size - 18) {
        const w = 12 + Math.floor(Math.random() * 14);
        const h = rowH * (0.62 + Math.random() * 0.22);
        if (Math.random() > 0.14) {
          ctx.fillStyle = folderColors[Math.floor(Math.random() * folderColors.length)];
          ctx.fillRect(x, r * rowH + rowH - 8 - h, w - 2, h);
          // Etiqueta blanca en el lomo
          ctx.fillStyle = '#cfc7b4';
          ctx.fillRect(x + 2, r * rowH + rowH - 8 - h + 10, w - 6, 8);
        }
        x += w;
      }
    }
    this.addNoise(ctx, size, 12);

    const mat = new THREE.MeshStandardMaterial({
      map: this.toTexture(canvas, 1, 1, true),
      roughness: 0.85,
      metalness: 0.15,
    });
    this.cache.set('bookshelf_files', mat);
    return mat;
  }

  getDoorMaterial(isHeavy = false) {
    const key = isHeavy ? 'door_heavy' : 'door_std';
    if (this.cache.has(key)) return this.cache.get(key);

    const { canvas, ctx, size } = this.makeCanvas(256);
    ctx.fillStyle = isHeavy ? '#282c32' : '#32383d';
    ctx.fillRect(0, 0, size, size);

    // Paneles empotrados
    ctx.strokeStyle = '#15181c';
    ctx.lineWidth = 8;
    ctx.strokeRect(18, 18, size - 36, size - 36);
    ctx.fillStyle = isHeavy ? '#1e2228' : '#262b30';
    ctx.fillRect(34, 34, size - 68, 84);
    ctx.fillRect(34, 138, size - 68, 84);

    // Franja de advertencia industrial si es compuerta pesada
    if (isHeavy) {
      ctx.fillStyle = '#a82929';
      ctx.fillRect(24, 118, size - 48, 12);
    }

    this.addNoise(ctx, size, 14);
    const mat = new THREE.MeshStandardMaterial({
      map: this.toTexture(canvas, 1, 1, true),
      roughness: 0.58,
      metalness: isHeavy ? 0.78 : 0.45,
    });
    this.cache.set(key, mat);
    return mat;
  }

  getDocumentTexture() {
    if (this.cache.has('doc_paper')) return this.cache.get('doc_paper');
    const { canvas, ctx, size } = this.makeCanvas(256);
    ctx.fillStyle = '#d9cfba';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#9e2626';
    ctx.fillRect(26, 22, 118, 22);
    ctx.fillStyle = '#332e26';
    for (let i = 0; i < 11; i += 1) {
      ctx.fillRect(26, 62 + i * 14, 140 + Math.random() * 60, 4);
    }
    this.addNoise(ctx, size, 12);
    const mat = new THREE.MeshStandardMaterial({
      map: this.toTexture(canvas, 1, 1, true),
      roughness: 0.9,
      metalness: 0.02,
      emissive: new THREE.Color(0x2e2618),
      emissiveIntensity: 0.3,
    });
    this.cache.set('doc_paper', mat);
    return mat;
  }
}
