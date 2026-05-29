/* ===== Dorthes have — 2.5D isometric scene (PixiJS v7) =====
 * Presentation only. Renders GardenLogic state `S.grid` as a cozy isometric garden with
 * raised-bed depth, drop-shadows, y-sorted props, parallax hills, day/night tint and gentle
 * ambient particles. Taps on a tile call back into the host with the grid index.
 * Reuses the project's flower/decor vocabulary; no image assets, no build step.
 * Lifecycle: mount() once on screen open, render() per state change, destroy() on cleanup.
 */
(function (root) {
  'use strict';
  const PIXI = root.PIXI;

  // isometric tile footprint (in CSS px, before fit-scaling)
  const TW = 72, TH = 36, BED = 12; // diamond width/height + raised-bed side height

  // palette (cozy, warm — matches the storybook art direction)
  const C = {
    grassTop: 0x8fcf6e, grassSide: 0x5fa24c, grassEdge: 0x3f7a38,
    soilTop: 0xb07a45, soilSide: 0x7d4f2c, soilEdge: 0x5e3a20,
    ink: 0x3c4a2e, shadow: 0x26321e,
    water: 0x66c2e6, waterHi: 0xcdeeff, bark: 0x86572f,
    leaf: 0x6cbf5e, leaf2: 0x83c96f, leaf3: 0x4f9a48,
    stone: 0xa3a9af, bee: 0xe7b53c,
  };
  const PETAL = { '🌷': 0xec6a8a, '🌻': 0xf6c83c, '🌹': 0xe0413f, '🌼': 0xfbfbf2, '🌸': 0xf4a6c0, '🪻': 0x9b6fc7, '🌺': 0xe8557f, '🏵️': 0xf0902e };
  const CENTER = { '🌻': 0x7a5230, '🌼': 0xf6c83c, '🌸': 0xf6c83c };
  // emoji fallback for decor + structures kept simple (drawn as Text on a shadow)
  const EMOJI = { feeder: '🛁', beehouse: '🐝', stone: '🪨', mushroom: '🍄', hedge: '🌿', path: '🟫', lantern: '🏮', bench: '🪑', birdhouse: '🏠' };

  // day/night wash (never dark — dusk is warm amber)
  const TINT = [
    { c: 0x9fbce0, a: 0.16 }, // dawn — cool blue
    { c: 0xfff4cc, a: 0.05 }, // day — almost clear
    { c: 0xffd98a, a: 0.16 }, // golden
    { c: 0xf0a85a, a: 0.22 }, // dusk — warm amber
  ];
  const SKY = [
    ['#bfe0f5', '#e9f6e6'], // dawn
    ['#aee0ff', '#dff3df'], // day
    ['#ffe6b0', '#e7f3d8'], // golden
    ['#f7c98a', '#dfeccf'], // dusk
  ];

  let app = null, hostEl = null, tapCb = null;
  let bgLayer = null, sceneLayer = null, fxLayer = null, tintG = null;
  let motes = [], t = 0, lastStage = -1;

  function mount(el, opts) {
    if (!PIXI) { console.warn('PIXI not loaded'); return false; }
    hostEl = el; tapCb = (opts && opts.onTap) || null;
    app = new PIXI.Application({
      resizeTo: el, backgroundAlpha: 0, antialias: true,
      autoDensity: true, resolution: Math.min(2, root.devicePixelRatio || 1),
    });
    el.appendChild(app.view);
    bgLayer = new PIXI.Container();
    sceneLayer = new PIXI.Container(); sceneLayer.sortableChildren = true;
    fxLayer = new PIXI.Container();
    tintG = new PIXI.Graphics();
    app.stage.addChild(bgLayer, sceneLayer, fxLayer, tintG);
    app.ticker.add(animate);
    return true;
  }

  function destroy() {
    if (!app) return;
    try { app.ticker.remove(animate); } catch {}
    try { app.destroy(true, { children: true, texture: true, baseTexture: true }); } catch {}
    app = null; bgLayer = sceneLayer = fxLayer = tintG = null; motes = []; t = 0; lastStage = -1;
    if (hostEl) hostEl.innerHTML = '';
  }

  function setSky(timeIdx) {
    if (!hostEl) return;
    const g = SKY[timeIdx] || SKY[1];
    hostEl.style.background = 'linear-gradient(180deg,' + g[0] + ' 0%,' + g[1] + ' 100%)';
  }

  // a soft drop-shadow ellipse under a prop
  function shadow(w, h) {
    const g = new PIXI.Graphics();
    g.beginFill(C.shadow, 0.22).drawEllipse(0, 0, w, h).endFill();
    return g;
  }

  function diamond(g, w, h, color, alpha) {
    g.beginFill(color, alpha == null ? 1 : alpha);
    g.moveTo(0, -h / 2); g.lineTo(w / 2, 0); g.lineTo(0, h / 2); g.lineTo(-w / 2, 0); g.closePath();
    g.endFill();
  }

  // a raised tile (top diamond + two side faces) — gives the 2.5D bed look
  function tileBlock(top, side, edge) {
    const g = new PIXI.Graphics();
    // left + right side faces
    g.beginFill(side, 1);
    g.moveTo(-TW / 2, 0); g.lineTo(0, TH / 2); g.lineTo(0, TH / 2 + BED); g.lineTo(-TW / 2, BED); g.closePath();
    g.moveTo(TW / 2, 0); g.lineTo(0, TH / 2); g.lineTo(0, TH / 2 + BED); g.lineTo(TW / 2, BED); g.closePath();
    g.endFill();
    // top face
    diamond(g, TW, TH, top);
    g.lineStyle(1, edge, 0.5); diamond(g, TW, TH, top); g.lineStyle(0);
    return g;
  }

  /* ---------- props (vector, cozy) ---------- */
  function flowerProp(stage, emoji) {
    const c = new PIXI.Container();
    if (stage <= 1) { // sprout
      const g = new PIXI.Graphics();
      g.lineStyle(3, C.leaf3).moveTo(0, 0).lineTo(0, -10);
      g.beginFill(C.leaf2).drawEllipse(-5, -8, 5, 3).drawEllipse(5, -10, 5, 3).endFill();
      c.addChild(g); return c;
    }
    const stemH = stage === 2 ? 16 : 24;
    const g = new PIXI.Graphics();
    g.lineStyle(3, C.leaf3).moveTo(0, 0).lineTo(0, -stemH);
    g.beginFill(C.leaf).drawEllipse(-6, -stemH * 0.5, 6, 3.2).endFill();
    g.beginFill(C.leaf2).drawEllipse(6, -stemH * 0.66, 6, 3.2).endFill();
    c.addChild(g);
    if (stage === 2) { // bud
      const b = new PIXI.Graphics();
      b.beginFill(0x8fd07a).drawCircle(0, -stemH - 3, 5).endFill();
      c.addChild(b);
    } else { // bloom
      const petal = PETAL[emoji] || 0xec6a8a, ctr = CENTER[emoji] || 0xf6c83c;
      const head = new PIXI.Container(); head.y = -stemH - 4;
      const pg = new PIXI.Graphics();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        pg.beginFill(petal).drawEllipse(Math.cos(a) * 8, Math.sin(a) * 8, 5.2, 3.6).endFill();
      }
      pg.beginFill(ctr).drawCircle(0, 0, 5).endFill();
      pg.beginFill(0xffffff, 0.5).drawCircle(-1.5, -1.5, 1.6).endFill();
      head.addChild(pg); head.__sway = true; c.addChild(head);
    }
    return c;
  }
  function treeProp() {
    const c = new PIXI.Container();
    const g = new PIXI.Graphics();
    g.beginFill(C.bark).drawRoundedRect(-4, -22, 8, 26, 3).endFill();
    g.beginFill(C.leaf3).drawCircle(-10, -30, 13).endFill();
    g.beginFill(C.leaf).drawCircle(9, -32, 13).endFill();
    g.beginFill(C.leaf2).drawCircle(-1, -42, 14).endFill();
    g.beginFill(0xffffff, 0.12).drawCircle(-4, -46, 6).endFill();
    c.addChild(g); c.__sway = true; return c;
  }
  function pondProp() {
    const c = new PIXI.Container();
    const g = new PIXI.Graphics();
    g.beginFill(C.water).drawEllipse(0, 0, TW * 0.34, TH * 0.42).endFill();
    g.beginFill(C.waterHi, 0.7).drawEllipse(-6, -3, 9, 3).endFill();
    g.beginFill(0x66bb55).drawEllipse(10, 2, 5, 3).endFill(); // lily pad
    c.addChild(g); return c;
  }
  function emojiProp(type) {
    const c = new PIXI.Container();
    const txt = new PIXI.Text(EMOJI[type] || '❔', { fontSize: 26, align: 'center' });
    txt.anchor.set(0.5, 0.9); txt.y = -4; c.addChild(txt); return c;
  }
  function propFor(t) {
    if (t.type === 'flower') return flowerProp(t.stage, t.flower);
    if (t.type === 'tree') return treeProp();
    if (t.type === 'pond') return pondProp();
    return emojiProp(t.type);
  }

  /* ---------- parallax hills behind the bed ---------- */
  function drawHills(stageId, w, h) {
    bgLayer.removeChildren();
    const dens = { bed: 2, garden: 4, meadow: 6, forest: 9, wild: 13 }[stageId] || 3;
    const horizon = h * 0.30;
    const far = new PIXI.Graphics();
    far.beginFill(0xbfe0a6).drawEllipse(w * 0.5, horizon + 30, w * 0.75, 90).endFill();
    far.beginFill(0xa6d68f).drawEllipse(w * 0.25, horizon + 60, w * 0.55, 80).endFill();
    far.beginFill(0x9bcf84).drawEllipse(w * 0.8, horizon + 70, w * 0.5, 80).endFill();
    bgLayer.addChild(far);
    for (let k = 0; k < dens; k++) {
      const tx = 20 + (k / Math.max(1, dens - 1)) * (w - 40);
      const ty = horizon + 18 + (k % 3) * 10;
      const s = 0.5 + (k % 3) * 0.14;
      const tr = new PIXI.Graphics();
      tr.beginFill(0x6a4a2a).drawRoundedRect(-3 * s, -2 * s, 6 * s, 16 * s, 2).endFill();
      tr.beginFill(0x5aa24a).drawCircle(0, -14 * s, 13 * s).endFill();
      tr.beginFill(0x6fb85a).drawCircle(-7 * s, -10 * s, 9 * s).endFill();
      tr.x = tx; tr.y = ty; tr.alpha = 0.92; bgLayer.addChild(tr);
    }
  }

  /* ---------- main render ---------- */
  function render(S, opts) {
    if (!app || !S) return;
    opts = opts || {};
    const W = app.screen.width, H = app.screen.height;
    const cols = S.cols, rows = S.rows;
    setSky(S.timeOfDay | 0);

    // fit the iso field to the canvas: bigger gardens scale down → camera pulls back
    const isoW = (cols + rows) * (TW / 2);
    const isoH = (cols + rows) * (TH / 2) + BED + 80;
    const scale = Math.min(1, (W - 24) / isoW, (H - 30) / isoH);
    sceneLayer.scale.set(scale);
    const originX = W / 2;
    const originY = (H - isoH * scale) / 2 + TH; // center vertically with headroom for props

    const stageId = (root.GardenLogic && root.GardenLogic.currentStage(S).id) || 'bed';
    drawHills(stageId, W, H);

    sceneLayer.removeChildren();
    sceneLayer.x = originX; sceneLayer.y = originY;

    const placing = opts.pendingBuild || (opts.pendingMove != null);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const tile = S.grid[i]; if (!tile) continue;
      const cell = new PIXI.Container();
      cell.x = (c - r) * (TW / 2); cell.y = (c + r) * (TH / 2);
      cell.zIndex = (c + r) * 10 + 1;
      const isSoil = tile.type === 'soil';
      // base block — grass for non-soil props, tilled earth for plantable soil
      cell.addChild(tileBlock(isSoil ? C.soilTop : C.grassTop, isSoil ? C.soilSide : C.grassSide, isSoil ? C.soilEdge : C.grassEdge));
      // placeable highlight when in build/move mode
      if (placing && isSoil) {
        const hl = new PIXI.Graphics(); hl.lineStyle(2.5, 0xffe08a, 0.95); diamond(hl, TW - 4, TH - 4, 0xffe08a, 0.18); cell.addChild(hl);
      }
      // prop (with shadow), raised above the tile top
      if (!isSoil) {
        cell.addChild(shadow(TW * 0.28, TH * 0.28));
        const prop = propFor(tile); cell.addChild(prop);
      }
      // interactive hit-area = the top diamond
      const hit = new PIXI.Graphics(); diamond(hit, TW, TH + BED, 0xffffff, 0.001);
      cell.addChild(hit);
      cell.eventMode = 'static'; cell.cursor = 'pointer';
      cell.on('pointertap', () => { if (tapCb) tapCb(i); });
      sceneLayer.addChild(cell);
    }

    // day/night tint over everything
    const tn = TINT[S.timeOfDay | 0] || TINT[1];
    tintG.clear(); tintG.beginFill(tn.c, tn.a).drawRect(0, 0, W, H).endFill();

    // (re)seed ambient particles when the stage changes
    if (S.stage !== lastStage) { lastStage = S.stage; seedMotes(W, H, stageId); }
  }

  function seedMotes(W, H, stageId) {
    fxLayer.removeChildren(); motes = [];
    const n = { bed: 5, garden: 7, meadow: 9, forest: 11, wild: 13 }[stageId] || 6;
    for (let k = 0; k < n; k++) {
      const g = new PIXI.Graphics();
      g.beginFill(0xfff3b0, 0.8).drawCircle(0, 0, 1.6 + Math.random() * 1.6).endFill();
      g.x = Math.random() * W; g.y = Math.random() * H * 0.8;
      fxLayer.addChild(g);
      motes.push({ g, vx: -6 - Math.random() * 10, vy: -4 + Math.random() * 8, ph: Math.random() * 6.28 });
    }
  }

  function animate(dt) {
    if (!app) return;
    t += dt;
    const W = app.screen.width, H = app.screen.height;
    for (const m of motes) {
      m.g.x += m.vx * dt * 0.16; m.g.y += (m.vy + Math.sin(t * 0.04 + m.ph) * 4) * dt * 0.016;
      m.g.alpha = 0.5 + Math.sin(t * 0.05 + m.ph) * 0.35;
      if (m.g.x < -10) { m.g.x = W + 10; m.g.y = Math.random() * H * 0.8; }
      if (m.g.y < -10) m.g.y = H * 0.8;
    }
    // gentle sway on flowers/trees
    if (sceneLayer) for (const cell of sceneLayer.children) for (const child of cell.children)
      if (child.__sway) child.rotation = Math.sin(t * 0.035 + cell.x * 0.05) * 0.05;
  }

  root.GardenIso = { mount, render, destroy, setSky };
})(typeof globalThis !== 'undefined' ? globalThis : window);
