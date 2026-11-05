// Progresso do torneio e opções, salvos no navegador.
import { OPPONENTS } from './ai.js';

const KEY = 'bolabombavr.v1';
const DEFAULTS = {
  beaten: 0,          // quantos adversários já venceu (em ordem)
  hand: 'right',      // 'right' | 'left'
  assist: 'media',    // 'alta' | 'media' | 'baixa' | 'off'
  angle: 0,           // ângulo da raquete na mão, em graus
  bestOf: 1,          // 1 set ou melhor de 3
  fps: false,
  music: true,       // musiquinha de fundo
};

export const ASSIST = { alta: 0.85, media: 0.6, baixa: 0.3, off: 0 };
export const ASSIST_LABEL = { alta: 'Alta', media: 'Média', baixa: 'Baixa', off: 'Desligada' };

export function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...DEFAULTS, ...s };
  } catch { return { ...DEFAULTS }; }
}

export function saveState(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* sem armazenamento: segue sem salvar */ }
}

export function statusOf(state, i) {
  if (i < state.beaten) return 'beaten';
  if (i === state.beaten) return 'next';
  return 'locked';
}

export function nextOpponent(state) { return Math.min(state.beaten, OPPONENTS.length - 1); }
export function isChampion(state) { return state.beaten >= OPPONENTS.length; }
