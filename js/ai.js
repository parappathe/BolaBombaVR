// Adversários controlados pelo computador. Não depende de navegador.
// A IA prevê a trajetória da bola com a mesma física do jogo, escolhe onde bater, anda até
// lá com velocidade limitada e, se chegar a tempo, devolve a bola mirando um ponto da mesa.
import { TABLE, DT, makeBall, copyBall, stepBall, solveShot, spinFor } from './physics.js';

// Ordem do torneio: do mais fraco para o mais forte. Cada um traz a sua bomba (`bomb`, ver
// bomb.js). `lob`: chance de devolver alto e lento quando dá tempo (segura a bomba do outro lado).
export const OPPONENTS = [
  {
    id: 'tonico', name: 'Tonico Pavio', style: 'Pavio longo',
    desc: 'Iniciante e devagar. A bomba dele demora para estourar.',
    shirt: 0x6fbf73, rubber: 0xd23c3c, skin: 0xe8b48a, hat: 0xf2c94c,
    move: 2.0, reaction: 0.3, speed: [4.2, 6.2], smash: 0, top: [0, 25], back: 0, side: 0, lob: 0,
    aim: 0.1, err: 0.17, mistake: 0.11, early: false, late: false, serveSpeed: [4.2, 5], serveSpin: 0,
    bomb: { fuse: [8.5, 9.5], hitBurn: 0.2, speedBurn: 0.08 },
  },
  {
    id: 'balao', name: 'Dona Balão', style: 'Bola alta',
    desc: 'Devolve tudo alto e lento para a bomba estourar do seu lado.',
    shirt: 0x4b6cd8, rubber: 0x222222, skin: 0xc68e62, hat: 0xe0503a,
    move: 3.0, reaction: 0.2, speed: [4.4, 6.2], smash: 0.15, top: [-40, 10], back: 0.5, side: 0, lob: 0.55,
    aim: 0.4, err: 0.1, mistake: 0.05, early: false, late: true, serveSpeed: [4.5, 5.5], serveSpin: 50,
    bomb: { fuse: [7.5, 8.5], hitBurn: 0.2, speedBurn: 0.08 },
  },
  {
    id: 'faisca', name: 'Faísca', style: 'Pavio curto',
    desc: 'Bomba de pavio curto e batidas rápidas. Não dá tempo de pensar.',
    shirt: 0xe0503a, rubber: 0xd23c3c, skin: 0xf0c9a0, hat: 0x222222,
    move: 2.4, reaction: 0.22, speed: [7.5, 10.5], smash: 0.9, top: [50, 110], back: 0, side: 0, lob: 0,
    aim: 0.7, err: 0.11, mistake: 0.08, early: true, late: false, serveSpeed: [6, 7.5], serveSpin: 40,
    bomb: { fuse: [5.8, 6.6], hitBurn: 0.25, speedBurn: 0.1 },
  },
  {
    id: 'blefe', name: 'Mágico Blefe', style: 'Bomba falsa',
    desc: 'A bomba dele pisca como se fosse estourar e não estoura. Ou acelera do nada.',
    shirt: 0x9b59d0, rubber: 0x222222, skin: 0xd9a77c, hat: 0x1d1d1d,
    move: 2.6, reaction: 0.2, speed: [6, 8.5], smash: 0.4, top: [-100, 120], back: 0.3, side: 70, lob: 0.25,
    aim: 0.6, err: 0.09, mistake: 0.06, early: false, late: false, serveSpeed: [5, 6.5], serveSpin: 130,
    bomb: { fuse: [7, 8], hitBurn: 0.2, speedBurn: 0.08, fake: true, surge: true },
  },
  {
    id: 'dinamite', name: 'Rainha Dinamite', style: 'Bomba dupla',
    desc: 'A campeã. A bomba dela dá um estalo, reacende e só aí explode.',
    shirt: 0x1d1d1d, rubber: 0xd23c3c, skin: 0xb07850, hat: 0xf2b632,
    move: 3.4, reaction: 0.15, speed: [8.5, 12], smash: 1, top: [40, 130], back: 0.15, side: 50, lob: 0.3,
    aim: 0.85, err: 0.06, mistake: 0.03, early: true, late: false, serveSpeed: [6, 8], serveSpin: 110,
    bomb: { fuse: [5, 6], hitBurn: 0.22, speedBurn: 0.09, relight: 3 },
  },
];

function gauss(rng) {
  const u = Math.max(1e-9, rng()), v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class AIPlayer {
  // side = -1: joga no lado -Z (adversário). side = +1: lado do jogador (usado nos testes).
  constructor(profile, side = -1, rng = Math.random) {
    this.p = profile;
    this.side = side;
    this.rng = rng;
    this.paddle = { x: 0, y: TABLE.y + 0.25, z: side * 1.9 };
    this.plan = null;
    this.time = 0;
    this.swing = 0; // 0..1 para animar a batida
    this._b = makeBall();
    this._ev = [];
    this.fuseLeft = Infinity; // segundos até a bomba explodir (o GameCore atualiza)
  }

  ready() { return { x: 0, y: TABLE.y + 0.25, z: this.side * 1.9 }; }

  reset() {
    this.plan = null;
    Object.assign(this.paddle, this.ready());
  }

  // Chamado quando o outro lado bate: a bola vem para cá.
  planFor(ball) {
    this.plan = null;
    const s = this.side;
    const b = copyBall(ball, this._b);
    const ev = this._ev;
    const pts = [];
    let bounced = false, tb = 0, stop = false;
    for (let t = DT; t < 2.6 && !stop; t += DT) {
      ev.length = 0;
      stepBall(b, DT, ev);
      for (const e of ev) {
        if (e.type === 'floor') stop = true;
        else if (e.type === 'table') {
          if (bounced) stop = true; // segundo quique: só vale o que veio antes
          else if (e.z * s <= 0) return; // vai quicar no lado de quem bateu: ponto, nem tenta
          else { bounced = true; tb = t; }
        }
      }
      if (stop || !bounced || t < tb + 0.04) continue;
      if (b.pz * s > 3 || b.py > 2.1) break;
      if (b.py - TABLE.y > 0.05) pts.push({ x: b.px, y: b.py, z: b.pz, vy: b.vy, t });
    }
    if (!bounced || !pts.length) return;

    const pd = this.paddle;
    const stretchOf = (q) => {
      const dist = Math.hypot(q.x - pd.x, (q.y - pd.y) * 0.7, (q.z - pd.z) * 0.6);
      return dist / this.p.move / Math.max(0.01, q.t - this.p.reaction);
    };
    const p = this.p;
    const prefer = [
      p.early ? (q) => q.y - TABLE.y > 0.14 && q.t > tb + 0.07 : null,
      p.late ? (q) => (q.vy <= 0 && q.y - TABLE.y < 0.3) || q.z * s > 2.2 : null,
      (q) => (q.vy <= 0 && q.y - TABLE.y > 0.08) || q.z * s > 1.65,
    ].filter(Boolean);
    let hit = null, stretch = Infinity;
    for (const f of prefer) {
      const q = pts.find(f);
      if (q) { const st = stretchOf(q); if (st <= 1) { hit = q; stretch = st; break; } }
    }
    if (!hit) {
      for (const q of pts) { const st = stretchOf(q); if (st < stretch) { stretch = st; hit = q; } }
    }
    const speedIn = Math.hypot(ball.vx, ball.vy, ball.vz);
    const spinIn = Math.hypot(ball.wx, ball.wy, ball.wz);
    const difficulty = clamp((speedIn - 6) / 10, 0, 1) * 0.5 + clamp(spinIn / 160, 0, 1) * 0.3 + clamp(stretch - 0.5, 0, 1) * 0.4;
    this.plan = {
      x: hit.x, y: hit.y, z: hit.z,
      hitTime: this.time + hit.t, startMove: this.time + p.reaction,
      reachable: stretch <= 1.35, desperate: stretch > 1, difficulty,
    };
  }

  // Avança o tempo; se for a hora e a raquete chegou, devolve {vx,vy,vz,wx,wy,wz}.
  tick(dt, ball) {
    this.time += dt;
    this.swing = Math.max(0, this.swing - dt * 4);
    const pd = this.paddle;
    const pl = this.plan;
    let tx, ty, tz, speed = this.p.move;
    if (pl && this.time >= pl.startMove) { tx = pl.x; ty = pl.y; tz = pl.z + this.side * 0.02; }
    else if (pl) { return null; }
    else { const r = this.ready(); tx = r.x; ty = r.y; tz = r.z; speed *= 0.6; }
    // Mesma métrica do planFor: subir/descer e ir para frente/trás custam menos que o lado.
    const dx = tx - pd.x, dy = ty - pd.y, dz = tz - pd.z;
    const d = Math.hypot(dx, dy * 0.7, dz * 0.6);
    const f = d > 0 ? Math.min(1, speed * dt / d) : 1;
    pd.x += dx * f; pd.y += dy * f; pd.z += dz * f;
    if (!pl || this.time < pl.hitTime - 1e-9) return null;
    this.plan = null;
    const gap = Math.hypot(ball.px - pd.x, ball.py - pd.y, ball.pz - pd.z);
    if (!pl.reachable || gap > (pl.desperate ? 0.45 : 0.16)) return null; // não chegou: a bola passa
    this.swing = 1;
    return this.shot(ball, pl.difficulty + (pl.desperate ? 0.5 : 0));
  }

  // Escolhe a jogada de devolução. Leva em conta o pavio: com pouco tempo, devolve rápido e
  // fundo para a bomba sair logo do seu lado; com tempo, joga seguro (mais devagar queima menos).
  shot(ball, difficulty) {
    const p = this.p, rng = this.rng, s = this.side;
    const h = ball.py - TABLE.y;
    const fl = this.fuseLeft;
    const hurry = fl < 2.2;
    let speed = lerp(p.speed[0], p.speed[1], rng());
    let top = lerp(p.top[0], p.top[1], rng());
    let side = (rng() * 2 - 1) * p.side;
    if (p.back > 0 && rng() < p.back) top = -Math.abs(top || 40) - 20 * rng();
    let depth = lerp(0.45, 0.92, rng());
    let errMul = 1;
    let lob = false;
    if (hurry) {
      speed = Math.max(speed, lerp(p.speed[1], p.speed[1] * 1.12, rng()));
      top = Math.max(top, 30);
      depth = lerp(0.78, 0.93, rng());
      difficulty += 0.2; // pressa: erra um pouco mais
    } else if (fl < 6 && rng() < p.lob) {
      lob = true;
      speed = lerp(3.3, 4.1, rng());
      top = lerp(-10, 20, rng()); side *= 0.3;
      depth = lerp(0.72, 0.9, rng());
    } else if (fl > 3.5) {
      speed = lerp(p.speed[0], speed, 0.6);
      errMul = 0.85;
    }
    // Bola alta: chance de cortada.
    if (!lob && h > 0.45 && rng() < p.smash) { speed = p.speed[1] * 1.25; top = Math.max(top, 60); }
    if (!lob && h < 0.12) speed *= 0.8;
    // Mira: lado. Quem mira bem vai mais nos cantos.
    let tx;
    if (rng() < p.aim) tx = (rng() < 0.5 ? -1 : 1) * lerp(0.45, 0.66, rng());
    else tx = (rng() * 2 - 1) * lerp(0.15, 0.5, p.aim);
    const errK = p.err * (1 + difficulty) * errMul;
    tx += gauss(rng) * errK;
    depth += gauss(rng) * errK / TABLE.halfL;
    let netErr = false;
    if (rng() < p.mistake * (1 + 3 * difficulty)) {
      const k = rng();
      if (k < 0.4) netErr = true;
      else if (k < 0.7) depth = 1 + lerp(0.1, 0.4, rng()) / TABLE.halfL;
      else tx = (rng() < 0.5 ? -1 : 1) * (TABLE.halfW + lerp(0.08, 0.35, rng()));
    }
    depth = Math.max(0.12, depth);
    const tz = -s * depth * TABLE.halfL;
    return this._solve(ball, tx, tz, speed, top, side, netErr);
  }

  _solve(ball, tx, tz, speed, top, side, netErr) {
    const dx = tx - ball.px, dz = tz - ball.pz, dl = Math.hypot(dx, dz);
    const w = spinFor(dx / dl, dz / dl, top, side);
    const v = solveShot(ball.px, ball.py, ball.pz, tx, tz, speed, w.wx, w.wy, w.wz);
    if (netErr) v.vy -= lerp(0.8, 1.6, this.rng());
    return { vx: v.vx, vy: v.vy, vz: v.vz, wx: w.wx, wy: w.wy, wz: w.wz };
  }

  // Saque: posição e velocidade do lançamento da bola para cima.
  serveToss(ball) {
    const s = this.side;
    ball.px = lerp(-0.35, 0.35, this.rng());
    ball.py = TABLE.y + 0.22;
    ball.pz = s * (TABLE.halfL + 0.12);
    ball.vx = 0; ball.vy = 2.2; ball.vz = 0; ball.wx = 0; ball.wy = 0; ball.wz = 0;
    this.plan = null;
    Object.assign(this.paddle, { x: ball.px + 0.12, y: ball.py, z: ball.pz + s * 0.05 });
    return ball.py;
  }

  serveShot(ball) {
    const p = this.p, rng = this.rng, s = this.side;
    this.swing = 1;
    Object.assign(this.paddle, { x: ball.px, y: ball.py, z: ball.pz + s * 0.03 });
    const speed = lerp(p.serveSpeed[0], p.serveSpeed[1], rng());
    let top = (rng() * 2 - 1) * p.serveSpin;
    const side = (rng() * 2 - 1) * p.serveSpin * 0.6;
    let tx = (rng() * 2 - 1) * lerp(0.2, 0.6, p.aim);
    let depth = lerp(0.5, 0.9, rng());
    tx += gauss(rng) * p.err * 0.6;
    if (rng() < p.mistake * 0.4) depth = 1.15;
    const tz = -s * depth * TABLE.halfL;
    return this._solve(ball, tx, tz, speed, top, side, false);
  }
}
