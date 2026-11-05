// Núcleo de uma partida: bola-bomba, regras, saque e adversário(s). Não depende de navegador:
// o main.js liga isto à tela e aos controles, e os testes rodam IA contra IA com ele.
// A bomba (bomb.js) acende no saque; se explodir, perde o ponto quem está com ela do seu lado.
import { TABLE, DT, makeBall, copyBall, stepBall } from './physics.js';
import { Rally, Match } from './match.js';
import { AIPlayer } from './ai.js';
import { Bomb } from './bomb.js';

export class GameCore {
  // sides[0] = jogador (lado +Z), sides[1] = adversário (lado -Z).
  // playerAI: AIPlayer no lado do jogador (só nos testes); null = humano.
  constructor({ opponent, playerAI = null, rng = Math.random, bestOf = 1, pointsToWin = 7, bomb = null, firstServer = null, onEvent = null }) {
    this.rng = rng;
    this.ai = [playerAI, new AIPlayer(opponent, -1, rng)];
    this.match = new Match({ bestOf, pointsToWin, firstServer: firstServer ?? (rng() < 0.5 ? 0 : 1) });
    this.ball = makeBall();
    this.prev = makeBall();
    this._pre = makeBall();
    this._tmp = makeBall();
    this.events = [];
    this.onEvent = onEvent;
    this.rally = null;
    this.lastPoint = null;
    this.time = 0;
    this.bomb = new Bomb(bomb ?? opponent.bomb, rng);
    this.doomed = false; // a última batida ia cair fora (ou na rede)
    this.startServe();
  }

  emit(type, data = {}) { this.onEvent?.(type, data); }

  get server() { return this.match.server; }
  isHuman(i) { return !this.ai[i]; }

  startServe() {
    this.state = 'serveWait';
    this.timer = 0;
    this.rally = null;
    this.bomb.reset();
    this.doomed = false;
    for (const a of this.ai) { if (a) { a.reset(); a.fuseLeft = this.bomb.timeLeft(); } }
    const b = this.ball;
    b.vx = b.vy = b.vz = b.wx = b.wy = b.wz = 0;
    b.px = 0; b.py = TABLE.y + 0.25; b.pz = (this.server === 0 ? 1 : -1) * (TABLE.halfL + 0.2);
    this.emit('serveWait', { server: this.server });
  }

  // Jogador humano segura a bola na mão antes de sacar.
  holdBall(x, y, z) {
    if (this.state !== 'serveWait' || !this.isHuman(this.server)) return;
    const b = this.ball;
    b.px = x; b.py = y; b.pz = z; b.vx = b.vy = b.vz = 0; b.wx = b.wy = b.wz = 0;
  }

  humanToss(vx = 0, vy = 2.3, vz = 0) {
    if (this.state !== 'serveWait' || !this.isHuman(this.server)) return false;
    const b = this.ball;
    b.vx = vx; b.vy = vy; b.vz = vz;
    this.tossY = b.py;
    this.state = 'toss';
    this.emit('toss', { server: this.server });
    return true;
  }

  // Um passo fixo de simulação (DT). humanHit(ball, prev, core) testa e aplica a batida do
  // jogador humano; devolve true se bateu.
  step(humanHit = null) {
    this.time += DT;
    const b = this.ball;
    if (this.state === 'serveWait') {
      this.timer += DT;
      const srv = this.server;
      for (const a of this.ai) if (a && a !== this.ai[srv]) a.tick(DT, b);
      if (!this.isHuman(srv) && this.timer > 0.9) {
        this.tossY = this.ai[srv].serveToss(b);
        this.state = 'toss';
        this.emit('toss', { server: srv });
      }
      return;
    }
    if (this.state === 'matchOver') return;

    copyBall(b, this.prev);
    this.events.length = 0;
    stepBall(b, DT, this.events);
    const out = Math.abs(b.px) > 7 || Math.abs(b.pz) > 9;
    if (out) this.events.push({ type: 'floor' });

    for (const e of this.events) {
      this.emit(e.type, e);
      if (this.state === 'toss') {
        if (e.type === 'table' || e.type === 'floor') { this.startServe(); return; }
      } else if (this.state === 'rally') {
        let r = null;
        if (e.type === 'table') r = this.rally.onTable(e.side);
        else if (e.type === 'net') this.rally.onNet();
        else if (e.type === 'floor') r = this.rally.onFloor();
        if (r) { this._resolve(r); break; }
      }
    }
    if (out) { b.vx = b.vy = b.vz = 0; b.py = 0.02; }

    if (this.state === 'pointOver') {
      this.timer += DT;
      for (const a of this.ai) a?.tick(DT, b);
      if (this.timer > 1.7) {
        if (this.match.over) { this.state = 'matchOver'; this.emit('matchOver', { winner: this.match.winner }); }
        else this.startServe();
      }
      return;
    }

    if (this.state === 'toss') {
      const srv = this.server;
      if (!this.isHuman(srv)) {
        this.ai[srv].tick(DT, b);
        if (b.vy < 0 && b.py <= this.tossY) {
          copyBall(b, this._pre);
          this._apply(this.ai[srv].serveShot(b));
          this._hit(srv);
        }
      } else if (humanHit && humanHit(b, this.prev, this)) {
        this._hit(0);
      } else if (b.py < TABLE.y - 0.3) {
        this.startServe();
      }
      for (const a of this.ai) if (a && a !== this.ai[srv]) a.tick(DT, b);
      return;
    }

    // Rally
    const r = this.rally.tick(DT);
    if (r) { this._resolve(r); return; }
    const be = this.bomb.tick(DT);
    if (be === 'boom') { this._explode(); return; }
    if (be) this.emit(be, { x: b.px, y: b.py, z: b.pz });
    const left = this.bomb.timeLeft();
    for (const a of this.ai) if (a) a.fuseLeft = left;
    for (let i = 0; i < 2; i++) {
      if (this.state !== 'rally') break;
      if (this.ai[i]) {
        copyBall(b, this._pre);
        const shot = this.ai[i].tick(DT, b);
        if (shot) { this._apply(shot); this._hit(i); }
      } else if (humanHit) {
        copyBall(b, this._pre);
        if (humanHit(b, this.prev, this)) this._hit(i);
      }
    }
  }

  _apply(v) {
    const b = this.ball;
    b.vx = v.vx; b.vy = v.vy; b.vz = v.vz; b.wx = v.wx; b.wy = v.wy; b.wz = v.wz;
  }

  _hit(i) {
    if (this.state === 'toss') {
      this.rally = new Rally(this.server);
      this.rally.onHit(i);
      this.state = 'rally';
      this.bomb.light();
      this.emit('light', {});
    } else {
      const out = this.rally.bounces === 0 ? !this._wouldLandOn(this._pre, i) : false;
      const r = this.rally.onHit(i, out);
      if (r) { this.emit('hit', { who: i }); this._resolve(r); return; }
    }
    const speed = Math.hypot(this.ball.vx, this.ball.vy, this.ball.vz);
    const burn = this.bomb.onHit(speed);
    this.doomed = !this._wouldLandOn(this.ball, 1 - i);
    this.emit('hit', { who: i, speed, burn });
    if (this.ai[i]) this.ai[i].plan = null;
    this.ai[1 - i]?.planFor(this.ball);
  }

  // A bola (antes da batida) cairia na metade do lado `side`?
  _wouldLandOn(ball, side) {
    const b = copyBall(ball, this._tmp);
    const ev = [];
    for (let t = 0; t < 2; t += DT) {
      ev.length = 0;
      stepBall(b, DT, ev);
      for (const e of ev) {
        if (e.type === 'table') return e.side === side;
        if (e.type === 'floor') return false;
      }
    }
    return false;
  }

  // A bomba explodiu: perde quem está com ela do seu lado. Se a última batida já ia cair
  // fora e a bola ainda não quicou, vale o erro (ponto de quem ia receber).
  _explode() {
    const b = this.ball;
    const side = b.pz > 0 ? 0 : 1;
    let winner = 1 - side;
    if (this.doomed && this.rally.bounces === 0) winner = 1 - this.rally.lastHitter;
    this.emit('explode', { x: b.px, y: b.py, z: b.pz, side });
    this._resolve({ winner, reason: 'bomba explodiu', explode: true, side });
  }

  _resolve(r) {
    if (!r.explode && !r.let && this.bomb.lit) { this.bomb.defuse(); this.emit('fizzle', {}); }
    if (r.let) {
      this.bomb.defuse();
      this.emit('let', {});
      this.state = 'pointOver';
      this.timer = 0.6;
      this.lastPoint = null;
      return;
    }
    const res = this.match.addPoint(r.winner);
    this.lastPoint = { ...r, ...res };
    this.state = 'pointOver';
    this.timer = 0;
    for (const a of this.ai) if (a) a.plan = null;
    this.emit('point', this.lastPoint);
  }
}
