// Cenário: pedreira de fogos de artifício ao entardecer, mesa, rede, placar de madeira com o
// marcador do pavio, torcida de operários, a bola-bomba e os efeitos (faíscas, explosão, fogos).
// Tudo gerado por código (sem modelos nem imagens) para carregar rápido no Quest.
import * as THREE from '../vendor/three/three.module.js';
import { TABLE, BALL_R } from './physics.js';

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return { tex: t, canvas: c, ctx: g };
}

// Sorteio fixo, para o cenário sair igual toda vez.
function rand(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

export function buildScene() {
  const R = rand(4242);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x4a2a2a, 18, 40);
  scene.background = new THREE.Color(0x2a1a16);

  // Céu de entardecer: gradiente numa esfera grande (sem luz, não pesa).
  const skyTex = canvasTex(16, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#1c1838'); gr.addColorStop(0.3, '#4a2f5c'); gr.addColorStop(0.44, '#c4583a');
    gr.addColorStop(0.5, '#f29a48'); gr.addColorStop(0.53, '#5a3226'); gr.addColorStop(1, '#2a1a16');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(45, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex.tex, side: THREE.BackSide, fog: false, depthWrite: false }));
  scene.add(sky);

  scene.add(new THREE.HemisphereLight(0xffd2a8, 0x4a2a1e, 1.6));
  const sun = new THREE.DirectionalLight(0xffb070, 1.5);
  sun.position.set(-3, 5, -4);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xfff0d8, 0.7);
  fill.position.set(2, 6, 4);
  scene.add(fill);

  // Chão de terra batida.
  const groundTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#7a5a3e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      g.fillStyle = Math.random() < 0.5 ? `rgba(40,25,15,${Math.random() * 0.18})` : `rgba(220,180,130,${Math.random() * 0.12})`;
      const r = 1 + Math.random() * 4;
      g.fillRect(Math.random() * w, Math.random() * h, r, r);
    }
  });
  groundTex.tex.wrapS = groundTex.tex.wrapT = THREE.RepeatWrapping;
  groundTex.tex.repeat.set(10, 10);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshLambertMaterial({ map: groundTex.tex }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  // Tablado de madeira debaixo da mesa.
  const deckTex = canvasTex(256, 512, (g, w, h) => {
    for (let y = 0; y < h; y += 32) {
      g.fillStyle = `hsl(28, 45%, ${30 + Math.random() * 8}%)`; g.fillRect(0, y, w, 30);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y + 30, w, 2);
    }
  });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(5, 0.08, 8), new THREE.MeshLambertMaterial({ map: deckTex.tex }));
  deck.position.y = -0.035;
  scene.add(deck);

  // Paredões da pedreira em volta (pedras grandes), aberto atrás do jogador.
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x8a4e32, flatShading: true });
  const rockDark = new THREE.MeshLambertMaterial({ color: 0x5e3424, flatShading: true });
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 46; i++) {
    const a = -Math.PI * 0.78 + (i / 45) * Math.PI * 1.56; // da direita, passando pelo fundo, até a esquerda
    const r = 12 + R() * 4;
    const m = new THREE.Mesh(rockGeo, R() < 0.5 ? rockMat : rockDark);
    const sx = 2.5 + R() * 2.5, sy = 3 + R() * 6, sz = 2 + R() * 2;
    m.scale.set(sx, sy, sz);
    m.position.set(Math.sin(a) * r, sy * 0.45, -Math.cos(a) * r);
    m.rotation.set(R() * 0.3, R() * Math.PI, R() * 0.3);
    scene.add(m);
  }

  // Mesa.
  const topTex = canvasTex(512, 920, (g, w, h) => {
    g.fillStyle = '#1f5a4a'; g.fillRect(0, 0, w, h);
    for (const cy of [h * 0.25, h * 0.75]) { // marcas chamuscadas (decoração)
      const gr = g.createRadialGradient(w / 2, cy, 0, w / 2, cy, 90);
      gr.addColorStop(0, 'rgba(10,10,10,0.35)'); gr.addColorStop(1, 'rgba(10,10,10,0)');
      g.fillStyle = gr; g.fillRect(0, cy - 100, w, 200);
    }
    const lw = Math.round(w * 0.02 / 1.525);
    g.fillStyle = '#f4ecd8';
    g.fillRect(0, 0, w, lw * 1.2); g.fillRect(0, h - lw * 1.2, w, lw * 1.2);
    g.fillRect(0, 0, lw, h); g.fillRect(w - lw, 0, lw, h);
    g.fillRect(w / 2 - lw * 0.15, 0, lw * 0.3, h);
  });
  const tableGroup = new THREE.Group();
  const topMat = new THREE.MeshPhongMaterial({ map: topTex.tex, shininess: 20, specular: 0x222222 });
  const sideMat = new THREE.MeshLambertMaterial({ color: 0x173f34 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(TABLE.halfW * 2, 0.03, TABLE.halfL * 2),
    [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
  top.position.y = TABLE.y - 0.015;
  tableGroup.add(top);
  // Pés: caixotes de madeira (mesa improvisada da pedreira).
  const crateTex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#9a6a3a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#5a3a1e'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
    g.beginPath(); g.moveTo(8, 8); g.lineTo(w - 8, h - 8); g.stroke();
  });
  const crateMat = new THREE.MeshLambertMaterial({ map: crateTex.tex });
  for (const sz of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.0, TABLE.y - 0.03, 0.55), crateMat);
    c.position.set(0, (TABLE.y - 0.03) / 2, sz * 0.8);
    tableGroup.add(c);
  }
  // Rede.
  const netW = (TABLE.halfW + TABLE.netOver) * 2;
  const netTex = canvasTex(512, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(20,20,20,0.85)'; g.lineWidth = 1.5;
    for (let x = 0; x <= w; x += 6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = '#f2d24c'; g.fillRect(0, 0, w, 7);
  });
  const net = new THREE.Mesh(new THREE.PlaneGeometry(netW, TABLE.netH),
    new THREE.MeshBasicMaterial({ map: netTex.tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  net.position.y = TABLE.y + TABLE.netH / 2;
  tableGroup.add(net);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2b2420 });
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, TABLE.netH + 0.03, 8), legMat);
    post.position.set(sx * netW / 2, TABLE.y + TABLE.netH / 2, 0);
    tableGroup.add(post);
  }
  scene.add(tableGroup);

  // Pilhas de caixas de fogos e barris em volta.
  const fwTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c0392b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f2c94c';
    for (let i = -h; i < w; i += 48) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 24, 0); g.lineTo(i + 24 + h, h); g.lineTo(i + h, h); g.fill(); }
    g.fillStyle = '#1d1d1d'; g.fillRect(0, h * 0.36, w, h * 0.28);
    g.fillStyle = '#f2c94c'; g.font = 'bold 50px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('FOGOS', w / 2, h / 2);
  });
  const fwMat = new THREE.MeshLambertMaterial({ map: fwTex.tex });
  const barrelMat = new THREE.MeshLambertMaterial({ color: 0xb33a2a });
  const boxGeo = new THREE.BoxGeometry(0.7, 0.55, 0.6);
  const barrelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12);
  const stacks = [[-3.6, -2.5], [3.6, -3.2], [-4, 1.4], [4.1, 0.8], [-2.6, -5.6], [2.2, -6], [-5.5, -4.2], [5.6, -4.6]];
  for (const [x, z] of stacks) {
    const n = 2 + Math.floor(R() * 4);
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(boxGeo, fwMat);
      const lvl = k < 3 ? 0 : 1;
      m.position.set(x + (k % 3 - 1) * 0.72 * (lvl ? 0.5 : 1), 0.275 + lvl * 0.55, z + (R() - 0.5) * 0.2);
      m.rotation.y = (R() - 0.5) * 0.4;
      scene.add(m);
    }
    const b = new THREE.Mesh(barrelGeo, barrelMat);
    b.position.set(x + (x > 0 ? 1.2 : -1.2), 0.45, z + 0.5);
    scene.add(b);
  }
  // Placas de aviso.
  const signTex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#f2c94c'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#1d1d1d'; g.lineWidth = 16; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#1d1d1d'; g.font = 'bold 70px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('PERIGO', w / 2, h * 0.36); g.font = 'bold 44px sans-serif'; g.fillText('BOLA-BOMBA', w / 2, h * 0.7);
  });
  const signMat = new THREE.MeshLambertMaterial({ map: signTex.tex });
  for (const [x, z, ry] of [[-3.2, -4.4, 0.4], [3.4, -4.8, -0.4]]) {
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), signMat);
    sg.position.set(x, 1.5, z); sg.rotation.y = ry;
    scene.add(sg);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), legMat);
    pole.position.set(x, 0.75, z - 0.03);
    scene.add(pole);
  }

  // Varal de lâmpadas acesas (MeshBasic: brilham sem custar luz).
  const bulbGeo = new THREE.SphereGeometry(0.05, 8, 6);
  const bulbMats = [0xffd27a, 0xff8a4c, 0xfff2c0].map(c => new THREE.MeshBasicMaterial({ color: c }));
  const poles = [[-3, -1.5], [3, -1.5], [-3, -5], [3, -5]];
  for (const [x, z] of poles) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.6, 8), legMat);
    pole.position.set(x, 1.8, z);
    scene.add(pole);
  }
  const wireMat = new THREE.LineBasicMaterial({ color: 0x1a1210 });
  const strings = [[poles[0], poles[2]], [poles[1], poles[3]]]; // só nas laterais, para não tapar o placar
  for (const [[x1, z1], [x2, z2]] of strings) {
    const pts = [];
    for (let k = 0; k <= 14; k++) {
      const t = k / 14;
      const p = new THREE.Vector3(x1 + (x2 - x1) * t, 3.55 - Math.sin(t * Math.PI) * 0.5, z1 + (z2 - z1) * t);
      pts.push(p);
      if (k > 0 && k < 14) {
        const b = new THREE.Mesh(bulbGeo, bulbMats[k % 3]);
        b.position.set(p.x, p.y - 0.06, p.z);
        scene.add(b);
      }
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  }

  // Torcida: operários de capacete em patamares de pedra atrás e dos lados.
  const ledgeMat = new THREE.MeshLambertMaterial({ color: 0x6a3e2a, flatShading: true });
  const seats = [];
  const addLedge = (cx, cz, len, rotY) => {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz); g.rotation.y = rotY;
    for (let r = 0; r < 3; r++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(len, 0.5 * (r + 1), 0.9), ledgeMat);
      step.position.set(0, 0.25 * (r + 1), -r * 0.9);
      g.add(step);
      for (let k = 0; k < len / 0.7 - 1; k++) {
        if (R() < 0.35) continue;
        seats.push({ group: g, p: new THREE.Vector3(-len / 2 + 0.5 + k * 0.7 + (R() - 0.5) * 0.15, 0.5 * (r + 1), -r * 0.9) });
      }
    }
    scene.add(g);
    g.updateMatrixWorld(true);
  };
  addLedge(0, -8.4, 10, 0);
  addLedge(-6.4, -2, 9, Math.PI / 2);
  addLedge(6.4, -2, 9, -Math.PI / 2);
  const crowdGeo = new THREE.CapsuleGeometry(0.17, 0.35, 3, 6);
  crowdGeo.translate(0, 0.35, 0);
  const crowd = new THREE.InstancedMesh(crowdGeo, new THREE.MeshLambertMaterial(), seats.length);
  const helmetGeo = new THREE.SphereGeometry(0.16, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  helmetGeo.translate(0, 0.84, 0);
  const helmets = new THREE.InstancedMesh(helmetGeo, new THREE.MeshLambertMaterial(), seats.length);
  const shirtColors = [0xd86a2a, 0x3a6bd8, 0x8a8a8a, 0x5a7a3a, 0xe0e0e0, 0x2a2a2a, 0xc0392b];
  const tmp = new THREE.Object3D(), col = new THREE.Color();
  const crowdBase = [];
  seats.forEach((st, i) => {
    const wp = st.p.clone().applyMatrix4(st.group.matrixWorld);
    crowdBase.push({ wp, phase: R() * Math.PI * 2, jump: 0.5 + R() * 0.5 });
    tmp.position.copy(wp); tmp.updateMatrix();
    crowd.setMatrixAt(i, tmp.matrix); helmets.setMatrixAt(i, tmp.matrix);
    crowd.setColorAt(i, col.setHex(shirtColors[i % shirtColors.length]).multiplyScalar(0.7 + R() * 0.3));
    helmets.setColorAt(i, col.setHex(i % 4 === 0 ? 0xf28c38 : 0xf2c94c));
  });
  scene.add(crowd, helmets);
  let cheerT = 0, cheerAmp = 0;
  const crowdApi = {
    cheer(strength = 1) { cheerT = 1.6; cheerAmp = strength; },
    update(dt, time) {
      if (cheerT <= 0) return;
      cheerT -= dt;
      const k = Math.max(0, cheerT / 1.6) * cheerAmp;
      crowdBase.forEach((c, i) => {
        tmp.position.copy(c.wp);
        tmp.position.y += Math.max(0, Math.sin(time * 9 + c.phase)) * 0.18 * k * c.jump;
        tmp.updateMatrix();
        crowd.setMatrixAt(i, tmp.matrix); helmets.setMatrixAt(i, tmp.matrix);
      });
      crowd.instanceMatrix.needsUpdate = true; helmets.instanceMatrix.needsUpdate = true;
    },
  };

  // Placar de madeira com o marcador do pavio embaixo.
  const board = canvasTex(1024, 512, () => {});
  const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), new THREE.MeshBasicMaterial({ map: board.tex }));
  boardMesh.position.set(0, 3.3, -6.6);
  scene.add(boardMesh);
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1e });
  const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(3.85, 2.6, 0.1), woodMat);
  boardFrame.position.set(0, 3.0, -6.67);
  scene.add(boardFrame);
  for (const sx of [-1.7, 1.7]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.0, 0.14), woodMat);
    post.position.set(sx, 1.0, -6.7);
    scene.add(post);
  }
  const fuseBack = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.42), new THREE.MeshBasicMaterial({ color: 0x1a0f0a }));
  fuseBack.position.set(0, 2.08, -6.6);
  scene.add(fuseBack);
  const fuseBar = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.26), new THREE.MeshBasicMaterial({ color: 0xf2c94c }));
  fuseBar.geometry.translate(0.5, 0, 0);
  fuseBar.position.set(-1.7, 2.08, -6.59);
  scene.add(fuseBar);
  const pipMats = [0, 1].map(() => new THREE.MeshBasicMaterial({ color: 0xff5a2a }));
  const pips = pipMats.map((m, k) => {
    const pip = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), m);
    pip.position.set(1.32 + k * 0.26, 2.08, -6.585);
    scene.add(pip);
    return pip;
  });
  const scoreboard = {
    draw(info) { drawBoard(board.ctx, info); board.tex.needsUpdate = true; },
  };

  // ---------- Partículas (faíscas, explosão, fogos no céu): um único Points ----------
  const N = 700;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(N * 3), pCol = new Float32Array(N * 3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const dotTex = canvasTex(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: 0.07, map: dotTex.tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }));
  points.frustumCulled = false;
  scene.add(points);
  const parts = [];
  for (let i = 0; i < N; i++) { parts.push({ life: 0, max: 1, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, drag: 0, grav: 0 }); pPos[i * 3 + 1] = -100; }
  let nextP = 0;
  const spawn = (x, y, z, vx, vy, vz, life, color, grav = 9.8, drag = 1.5) => {
    const i = nextP; nextP = (nextP + 1) % N;
    const q = parts[i];
    pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
    q.life = life; q.max = life; q.vx = vx; q.vy = vy; q.vz = vz; q.grav = grav; q.drag = drag;
    col.setHex(color); q.r = col.r; q.g = col.g; q.b = col.b;
  };
  const burst = (x, y, z, n, speed, colors, life = 0.9, grav = 6, drag = 2) => {
    for (let k = 0; k < n; k++) {
      const u = R() * 2 - 1, th = R() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      const sp = speed * (0.35 + R() * 0.65);
      spawn(x, y, z, Math.cos(th) * s * sp, u * sp, Math.sin(th) * s * sp, life * (0.6 + R() * 0.6), colors[k % colors.length], grav, drag);
    }
  };
  const updateParts = (dt) => {
    for (let i = 0; i < N; i++) {
      const q = parts[i];
      if (q.life <= 0) continue;
      q.life -= dt;
      if (q.life <= 0) { pPos[i * 3 + 1] = -100; pCol[i * 3] = pCol[i * 3 + 1] = pCol[i * 3 + 2] = 0; continue; }
      const d = Math.max(0, 1 - q.drag * dt);
      q.vx *= d; q.vy = q.vy * d - q.grav * dt; q.vz *= d;
      pPos[i * 3] += q.vx * dt; pPos[i * 3 + 1] += q.vy * dt; pPos[i * 3 + 2] += q.vz * dt;
      const k = Math.min(1, q.life / q.max * 1.5);
      pCol[i * 3] = q.r * k; pCol[i * 3 + 1] = q.g * k; pCol[i * 3 + 2] = q.b * k;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;
  };

  // Clarão da explosão: uma luz pontual que fica sempre na cena (apagada) e uma bola de fogo.
  const flash = new THREE.PointLight(0xffa040, 0, 9, 1.5);
  scene.add(flash);
  const fireball = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  fireball.visible = false;
  scene.add(fireball);
  let flashT = 0;

  // Fogos no céu (comemoração).
  const rockets = [];
  const FW_COLORS = [0xff4a4a, 0xffd24a, 0x4ad2ff, 0x9aff4a, 0xff7ae0];
  const fireworks = (count = 3) => {
    for (let k = 0; k < count; k++) {
      rockets.push({ x: (R() - 0.5) * 14, y: 1, z: -9 - R() * 6, vy: 11 + R() * 4, t: 0.7 + R() * 0.5, delay: k * 0.3,
        color: FW_COLORS[Math.floor(R() * FW_COLORS.length)] });
    }
  };

  const effects = {
    explode(x, y, z) {
      burst(x, y, z, 170, 7, [0xffe080, 0xffa030, 0xff5020, 0xffffff], 0.9, 4, 2.2);
      burst(x, y, z, 60, 2.5, [0x5a4a40, 0x403530], 1.6, -0.8, 1.2); // fumaça subindo
      flashT = 0.5;
      flash.position.set(x, y + 0.1, z);
      fireball.position.set(x, y, z);
    },
    pop(x, y, z) { burst(x, y, z, 50, 3.5, [0xffe080, 0xffffff, 0xff8030], 0.5, 4, 2.5); },
    fizzle(x, y, z) { burst(x, y, z, 14, 1, [0x8a8a8a, 0x5a5a5a], 0.8, -0.5, 1); },
    fireworks,
    update(dt) {
      if (flashT > 0) {
        flashT = Math.max(0, flashT - dt);
        const k = flashT / 0.5;
        flash.intensity = 40 * k * k;
        fireball.visible = k > 0.05;
        fireball.scale.setScalar(0.08 + (1 - k) * 0.55);
        fireball.material.opacity = k * 0.85;
      } else { flash.intensity = 0; fireball.visible = false; }
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        if (r.delay > 0) { r.delay -= dt; continue; }
        r.y += r.vy * dt; r.vy -= 4.9 * dt; r.t -= dt;
        spawn(r.x, r.y, r.z, 0, -1, 0, 0.3, 0xffd8a0, 2, 2);
        if (r.t <= 0) { burst(r.x, r.y, r.z, 70, 6, [r.color, 0xffffff], 1.3, 2.5, 1.6); rockets.splice(i, 1); }
      }
      updateParts(dt);
    },
  };

  // ---------- Bola-bomba: esfera escura que esquenta, pavio e faísca ----------
  const BR = BALL_R * 1.15; // um pouco maior que a bola de verdade, para enxergar melhor
  const ballMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2e, emissive: 0x000000 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(BR, 16, 12), ballMat);
  const fuseStub = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.018, 6), new THREE.MeshLambertMaterial({ color: 0xc8b48a }));
  fuseStub.position.y = BR + 0.006;
  ball.add(fuseStub);
  const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex.tex, color: 0xffd060, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  spark.scale.setScalar(0.05);
  spark.position.y = BR + 0.017;
  ball.add(spark);
  scene.add(ball);
  const shadowTex = canvasTex(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const ballShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07),
    new THREE.MeshBasicMaterial({ map: shadowTex.tex, transparent: true, depthWrite: false }));
  ballShadow.rotation.x = -Math.PI / 2;
  scene.add(ballShadow);
  const updateBall = (b, visible) => {
    ball.visible = visible; ballShadow.visible = visible;
    if (!visible) return;
    ball.position.set(b.px, b.py, b.pz);
    const overTable = Math.abs(b.px) <= TABLE.halfW && Math.abs(b.pz) <= TABLE.halfL && b.py >= TABLE.y;
    const gy = overTable ? TABLE.y + 0.001 : 0.004;
    ballShadow.position.set(b.px, gy, b.pz);
    const s = 1 / (1 + (b.py - gy) * 2);
    ballShadow.scale.setScalar(s);
    ballShadow.material.opacity = s;
  };
  const cold = new THREE.Color(0x2a2a2e), red = new THREE.Color(0xff2a10);
  let blinkPhase = 0, sparkT = 0;
  // sh: bomb.shown() (ou null fora de partida). A cor vai do grafite ao vermelho e pisca mais
  // rápido quanto menos pavio; o marcador do placar mostra a fração que sobra.
  const updateBomb = (sh, b, dt, time, isDouble) => {
    const heat = sh && !sh.exploded ? 1 - Math.min(1, sh.secs / 6) : 0;
    ballMat.color.copy(cold).lerp(red, heat * 0.85);
    let glow = 0;
    if (sh && sh.lit) {
      const hz = 1 + heat * heat * 9; // de 1 a 10 piscadas por segundo
      blinkPhase += dt * hz;
      glow = (Math.sin(blinkPhase * Math.PI * 2) > 0 ? 1 : 0.15) * (0.25 + heat * 0.75);
      spark.visible = true;
      spark.scale.setScalar(0.035 + Math.random() * 0.03);
      sparkT -= dt;
      if (b && sparkT <= 0) {
        sparkT = 0.03;
        spawn(b.px, b.py + 0.04, b.pz, (R() - 0.5) * 0.8, 0.5 + R(), (R() - 0.5) * 0.8, 0.25, 0xffc050, 6, 1);
      }
    } else spark.visible = false;
    ballMat.emissive.setRGB(glow, glow * 0.25, 0);
    const frac = sh ? (sh.exploded ? 0 : sh.frac) : 1;
    fuseBar.scale.x = Math.max(0.001, frac * (isDouble ? 2.9 : 3.4));
    fuseBar.material.color.setHex(frac > 0.5 ? 0xf2c94c : frac > 0.25 ? 0xff8a2a : 0xff3a1a);
    fuseBar.visible = !(sh && sh.lit && heat > 0.7 && Math.sin(time * 20) < 0);
    pips[0].visible = pips[1].visible = !!isDouble;
    pipMats[0].color.setHex(sh && sh.charges < 2 ? 0x3a2a22 : 0xff5a2a);
  };

  return { scene, scoreboard, crowd: crowdApi, ball, updateBall, updateBomb, effects, shadowTex: shadowTex.tex };
}

// Raquete: centro da lâmina na origem, face vermelha virada para +X, cabo para +Z.
export function makePaddle(rubberColor = 0xd23c3c, backColor = 0x1b1b1b) {
  const g = new THREE.Group();
  const r = 0.075;
  const wood = new THREE.MeshLambertMaterial({ color: 0xc9a06a });
  const blade = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.006, 28), wood);
  blade.rotation.z = Math.PI / 2;
  g.add(blade);
  const face = (color, sx) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.002, r - 0.002, 0.003, 28), new THREE.MeshLambertMaterial({ color }));
    m.rotation.z = Math.PI / 2;
    m.position.x = sx * 0.0045;
    g.add(m);
  };
  face(rubberColor, 1);
  face(backColor, -1);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.032, 0.1), wood);
  handle.position.z = r + 0.045;
  g.add(handle);
  return g;
}

// Adversário estilizado: pernas, tronco, cabeça e braço que segura a raquete.
export function makeOpponent() {
  const g = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: 0x888888 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe0b090 });
  const shorts = new THREE.MeshLambertMaterial({ color: 0x1f2430 });
  const body = new THREE.Group();
  g.add(body);
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.62, 3, 8), skin);
    leg.position.set(sx * 0.11, 0.42, 0);
    body.add(leg);
  }
  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.22, 12), shorts);
  hips.position.y = 0.86;
  body.add(hips);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.36, 4, 12), shirt);
  torso.position.y = 1.22;
  body.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), skin);
  head.position.y = 1.62;
  body.add(head);
  // Capacete de operário (cor de cada adversário).
  const hatMat = new THREE.MeshLambertMaterial({ color: 0xf2c94c });
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), hatMat);
  hair.position.y = 1.64;
  body.add(hair);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.015, 16), hatMat);
  brim.position.y = 1.645;
  body.add(brim);
  const otherArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.45, 3, 6), skin);
  otherArm.position.set(0.25, 1.15, 0.05);
  otherArm.rotation.z = 0.25;
  body.add(otherArm);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 1, 8), skin);
  arm.geometry.rotateX(Math.PI / 2);
  g.add(arm);
  const paddle = makePaddle();
  g.add(paddle);

  const shoulder = new THREE.Vector3(), hand = new THREE.Vector3();
  const api = {
    group: g, paddle,
    setLook(p) {
      shirt.color.setHex(p.shirt); skin.color.setHex(p.skin); hatMat.color.setHex(p.hat ?? 0xf2c94c);
      paddle.children[1].material.color.setHex(p.rubber);
    },
    // pd: posição da raquete {x,y,z}; swing: 0..1
    update(pd, swing, time) {
      const bx = pd.x + 0.32;
      const bz = Math.min(pd.z - 0.4, -TABLE.halfL - 0.28);
      body.position.set(bx, Math.sin(time * 4) * 0.008, bz);
      body.rotation.y = Math.sin(swing * Math.PI) * 0.3;
      paddle.position.set(pd.x, pd.y, pd.z);
      paddle.rotation.set(Math.PI / 2, -Math.PI / 2 + swing * 0.6, 0, 'YXZ');
      shoulder.set(bx - 0.22, 1.36, bz);
      hand.set(pd.x, pd.y, pd.z).addScaledVector(new THREE.Vector3(0, -1, 0), 0.1);
      arm.position.copy(shoulder).lerp(hand, 0.5);
      arm.scale.set(1, 1, shoulder.distanceTo(hand));
      arm.lookAt(hand);
    },
  };
  return api;
}

function drawBoard(g, info) {
  const w = 1024, h = 512;
  g.fillStyle = '#1a0f0a'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#6a4424'; g.lineWidth = 4; g.strokeRect(8, 8, w - 16, h - 16);
  g.textBaseline = 'middle';
  g.fillStyle = '#f2b632'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center';
  g.fillText(info.round || 'TORNEIO DA BOLA-BOMBA', w / 2, 46);
  const row = (y, name, score, games, serving, color) => {
    g.fillStyle = color; g.fillRect(30, y - 52, 14, 104);
    g.fillStyle = '#e8ecf5'; g.font = 'bold 56px sans-serif'; g.textAlign = 'left';
    g.fillText(name.toUpperCase(), 64, y);
    if (serving) { g.fillStyle = '#f2b632'; g.beginPath(); g.arc(640, y, 14, 0, Math.PI * 2); g.fill(); }
    if (games != null) { g.fillStyle = '#8b97b3'; g.font = 'bold 56px sans-serif'; g.textAlign = 'center'; g.fillText(String(games), 730, y); }
    g.fillStyle = '#ffdf6e'; g.font = 'bold 110px monospace'; g.textAlign = 'right';
    g.fillText(String(score), 980, y + 4);
  };
  row(150, info.pName || 'Você', info.score?.[0] ?? 0, info.showGames ? info.games?.[0] : null, info.server === 0, '#33c27a');
  row(290, info.oName || '', info.score?.[1] ?? 0, info.showGames ? info.games?.[1] : null, info.server === 1, info.oColor || '#cc4444');
  g.fillStyle = '#2e1a10'; g.fillRect(24, 380, w - 48, 104);
  g.fillStyle = '#ffffff'; g.font = 'bold 48px sans-serif'; g.textAlign = 'center';
  g.fillText(info.msg || '', w / 2, 432);
}
