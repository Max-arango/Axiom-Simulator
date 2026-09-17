// Per-gate educational docs for the Quantum Lab "Learn" mode and gate inspector.
// Pure data: a lookup keyed by GateId, no behavior beyond getGateDoc().
// User-facing text is Spanish (Axiom UI is Spanish); gate NAMES and math are standard.
// matrixTex holds KaTeX/LaTeX (double-escaped backslashes). Little-endian basis order
// matches types.ts; controlled matrices are written with the standard control-on-top form.

import type { GateId } from "./types.ts";

export interface GateDoc {
  id: GateId;
  name: string; // standard gate name, e.g. "Hadamard"
  symbol: string; // short label shown on the grid, e.g. "H", "S†", "RX"
  matrixTex: string; // KaTeX/LaTeX matrix ("" for measurement, which has no unitary)
  effect0: string; // effect on |0⟩ (words or ket LaTeX in $...$)
  effect1: string; // effect on |1⟩
  geometry: string; // geometric interpretation (Bloch-sphere rotation, etc.)
  summary: string; // 1-2 sentence plain description
  parametric?: boolean; // true for RX/RY/RZ/PHASE
}

export const GATE_DOCS: Record<GateId, GateDoc> = {
  I: {
    id: "I",
    name: "Identity",
    symbol: "I",
    matrixTex: "\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}",
    effect0: "$|0\\rangle \\to |0\\rangle$",
    effect1: "$|1\\rangle \\to |1\\rangle$",
    geometry: "No hace nada: deja el vector de Bloch exactamente donde estaba.",
    summary: "Puerta identidad. No modifica el estado; sirve de marcador o relleno temporal.",
  },
  X: {
    id: "X",
    name: "Pauli-X",
    symbol: "X",
    matrixTex: "\\begin{pmatrix}0&1\\\\1&0\\end{pmatrix}",
    effect0: "$|0\\rangle \\to |1\\rangle$",
    effect1: "$|1\\rangle \\to |0\\rangle$",
    geometry: "Rotación de π radianes alrededor del eje X de la esfera de Bloch.",
    summary: "El 'NOT' cuántico: intercambia las amplitudes de |0⟩ y |1⟩.",
  },
  Y: {
    id: "Y",
    name: "Pauli-Y",
    symbol: "Y",
    matrixTex: "\\begin{pmatrix}0&-i\\\\i&0\\end{pmatrix}",
    effect0: "$|0\\rangle \\to i\\,|1\\rangle$",
    effect1: "$|1\\rangle \\to -i\\,|0\\rangle$",
    geometry: "Rotación de π radianes alrededor del eje Y de la esfera de Bloch.",
    summary: "Combina un intercambio de bits con un cambio de fase; rotación π sobre el eje Y.",
  },
  Z: {
    id: "Z",
    name: "Pauli-Z",
    symbol: "Z",
    matrixTex: "\\begin{pmatrix}1&0\\\\0&-1\\end{pmatrix}",
    effect0: "$|0\\rangle \\to |0\\rangle$",
    effect1: "$|1\\rangle \\to -|1\\rangle$",
    geometry: "Rotación de π radianes alrededor del eje Z de la esfera de Bloch.",
    summary: "Puerta de fase: deja |0⟩ intacto e invierte el signo de |1⟩.",
  },
  H: {
    id: "H",
    name: "Hadamard",
    symbol: "H",
    matrixTex: "\\frac{1}{\\sqrt2}\\begin{pmatrix}1&1\\\\1&-1\\end{pmatrix}",
    effect0: "$|0\\rangle \\to \\tfrac{1}{\\sqrt2}(|0\\rangle+|1\\rangle) = |+\\rangle$",
    effect1: "$|1\\rangle \\to \\tfrac{1}{\\sqrt2}(|0\\rangle-|1\\rangle) = |-\\rangle$",
    geometry: "Rotación de π alrededor del eje diagonal (X+Z)/√2; intercambia los ejes X y Z.",
    summary: "Crea superposición uniforme a partir de un estado base. Es la puerta clave para generar paralelismo cuántico.",
  },
  S: {
    id: "S",
    name: "Phase (S)",
    symbol: "S",
    matrixTex: "\\begin{pmatrix}1&0\\\\0&i\\end{pmatrix}",
    effect0: "$|0\\rangle \\to |0\\rangle$",
    effect1: "$|1\\rangle \\to i\\,|1\\rangle$",
    geometry: "Rotación de +π/2 (90°) alrededor del eje Z de la esfera de Bloch.",
    summary: "Puerta de fase S = √Z: añade una fase de +90° a la componente |1⟩. Aplicada dos veces equivale a Z.",
  },
  Sdg: {
    id: "Sdg",
    name: "S† (S-dagger)",
    symbol: "S†",
    matrixTex: "\\begin{pmatrix}1&0\\\\0&-i\\end{pmatrix}",
    effect0: "$|0\\rangle \\to |0\\rangle$",
    effect1: "$|1\\rangle \\to -i\\,|1\\rangle$",
    geometry: "Rotación de −π/2 (−90°) alrededor del eje Z de la esfera de Bloch.",
    summary: "Adjunta (inversa) de S: añade una fase de −90° a la componente |1⟩.",
  },
  T: {
    id: "T",
    name: "T (π/8)",
    symbol: "T",
    matrixTex: "\\begin{pmatrix}1&0\\\\0&e^{i\\pi/4}\\end{pmatrix}",
    effect0: "$|0\\rangle \\to |0\\rangle$",
    effect1: "$|1\\rangle \\to e^{i\\pi/4}\\,|1\\rangle$",
    geometry: "Rotación de +π/4 (45°) alrededor del eje Z de la esfera de Bloch.",
    summary: "Puerta T = √S: añade una fase de +45° a |1⟩. Junto con H y CNOT forma un conjunto universal de puertas.",
  },
  Tdg: {
    id: "Tdg",
    name: "T† (T-dagger)",
    symbol: "T†",
    matrixTex: "\\begin{pmatrix}1&0\\\\0&e^{-i\\pi/4}\\end{pmatrix}",
    effect0: "$|0\\rangle \\to |0\\rangle$",
    effect1: "$|1\\rangle \\to e^{-i\\pi/4}\\,|1\\rangle$",
    geometry: "Rotación de −π/4 (−45°) alrededor del eje Z de la esfera de Bloch.",
    summary: "Adjunta (inversa) de T: añade una fase de −45° a la componente |1⟩.",
  },
  RX: {
    id: "RX",
    name: "RX",
    symbol: "RX",
    matrixTex:
      "\\begin{pmatrix}\\cos\\tfrac{\\theta}{2}&-i\\sin\\tfrac{\\theta}{2}\\\\-i\\sin\\tfrac{\\theta}{2}&\\cos\\tfrac{\\theta}{2}\\end{pmatrix}",
    effect0: "$|0\\rangle \\to \\cos\\tfrac{\\theta}{2}|0\\rangle - i\\sin\\tfrac{\\theta}{2}|1\\rangle$",
    effect1: "$|1\\rangle \\to -i\\sin\\tfrac{\\theta}{2}|0\\rangle + \\cos\\tfrac{\\theta}{2}|1\\rangle$",
    geometry: "Rotación de un ángulo θ alrededor del eje X de la esfera de Bloch.",
    summary: "Rotación parametrizada por θ alrededor del eje X. Con θ=π equivale (salvo fase global) a la puerta X.",
    parametric: true,
  },
  RY: {
    id: "RY",
    name: "RY",
    symbol: "RY",
    matrixTex:
      "\\begin{pmatrix}\\cos\\tfrac{\\theta}{2}&-\\sin\\tfrac{\\theta}{2}\\\\\\sin\\tfrac{\\theta}{2}&\\cos\\tfrac{\\theta}{2}\\end{pmatrix}",
    effect0: "$|0\\rangle \\to \\cos\\tfrac{\\theta}{2}|0\\rangle + \\sin\\tfrac{\\theta}{2}|1\\rangle$",
    effect1: "$|1\\rangle \\to -\\sin\\tfrac{\\theta}{2}|0\\rangle + \\cos\\tfrac{\\theta}{2}|1\\rangle$",
    geometry: "Rotación de un ángulo θ alrededor del eje Y de la esfera de Bloch.",
    summary: "Rotación parametrizada por θ alrededor del eje Y. Mantiene amplitudes reales, útil para preparar superposiciones ajustables.",
    parametric: true,
  },
  RZ: {
    id: "RZ",
    name: "RZ",
    symbol: "RZ",
    matrixTex:
      "\\begin{pmatrix}e^{-i\\theta/2}&0\\\\0&e^{i\\theta/2}\\end{pmatrix}",
    effect0: "$|0\\rangle \\to e^{-i\\theta/2}|0\\rangle$",
    effect1: "$|1\\rangle \\to e^{i\\theta/2}|1\\rangle$",
    geometry: "Rotación de un ángulo θ alrededor del eje Z de la esfera de Bloch.",
    summary: "Rotación parametrizada por θ alrededor del eje Z: introduce una fase relativa entre |0⟩ y |1⟩.",
    parametric: true,
  },
  PHASE: {
    id: "PHASE",
    name: "Phase (P)",
    symbol: "P",
    matrixTex: "\\begin{pmatrix}1&0\\\\0&e^{i\\varphi}\\end{pmatrix}",
    effect0: "$|0\\rangle \\to |0\\rangle$",
    effect1: "$|1\\rangle \\to e^{i\\varphi}\\,|1\\rangle$",
    geometry: "Rotación de un ángulo φ alrededor del eje Z (sin la fase global de RZ).",
    summary: "Puerta de fase general: añade una fase φ a la componente |1⟩. Casos particulares: φ=π/2→S, φ=π/4→T, φ=π→Z.",
    parametric: true,
  },
  CX: {
    id: "CX",
    name: "CNOT",
    symbol: "CX",
    matrixTex:
      "\\begin{pmatrix}1&0&0&0\\\\0&1&0&0\\\\0&0&0&1\\\\0&0&1&0\\end{pmatrix}",
    effect0: "Control |0⟩: el objetivo no cambia.",
    effect1: "Control |1⟩: aplica X (NOT) al qubit objetivo.",
    geometry: "Puerta de dos qubits: entrelaza control y objetivo, no hay una única rotación de Bloch.",
    summary: "NOT controlada: invierte el qubit objetivo solo si el control está en |1⟩. Puerta base para generar entrelazamiento.",
  },
  CZ: {
    id: "CZ",
    name: "Controlled-Z",
    symbol: "CZ",
    matrixTex:
      "\\begin{pmatrix}1&0&0&0\\\\0&1&0&0\\\\0&0&1&0\\\\0&0&0&-1\\end{pmatrix}",
    effect0: "Control |0⟩: el objetivo no cambia.",
    effect1: "Control |1⟩: aplica Z al objetivo (invierte el signo de |11⟩).",
    geometry: "Puerta de dos qubits, diag(1,1,1,−1); simétrica entre control y objetivo.",
    summary: "Z controlada: cambia el signo únicamente del estado |11⟩. Simétrica, entrelaza los dos qubits.",
  },
  SWAP: {
    id: "SWAP",
    name: "SWAP",
    symbol: "SWAP",
    matrixTex:
      "\\begin{pmatrix}1&0&0&0\\\\0&0&1&0\\\\0&1&0&0\\\\0&0&0&1\\end{pmatrix}",
    effect0: "$|01\\rangle \\to |10\\rangle$",
    effect1: "$|10\\rangle \\to |01\\rangle$",
    geometry: "Puerta de dos qubits: intercambia por completo los estados de ambos qubits.",
    summary: "Intercambia el estado de dos qubits. |00⟩ y |11⟩ quedan igual; |01⟩ y |10⟩ se permutan.",
  },
  CCX: {
    id: "CCX",
    name: "Toffoli",
    symbol: "CCX",
    matrixTex:
      "\\begin{pmatrix}1&0&0&0&0&0&0&0\\\\0&1&0&0&0&0&0&0\\\\0&0&1&0&0&0&0&0\\\\0&0&0&1&0&0&0&0\\\\0&0&0&0&1&0&0&0\\\\0&0&0&0&0&1&0&0\\\\0&0&0&0&0&0&0&1\\\\0&0&0&0&0&0&1&0\\end{pmatrix}",
    effect0: "Si algún control está en |0⟩: el objetivo no cambia.",
    effect1: "Si ambos controles están en |1⟩: aplica X (NOT) al objetivo.",
    geometry: "Puerta de tres qubits (8×8): identidad salvo el intercambio de |110⟩ y |111⟩.",
    summary: "Toffoli o CCNOT: invierte el objetivo solo cuando los dos controles valen |1⟩. Es una puerta reversible universal para la lógica clásica.",
  },
  M: {
    id: "M",
    name: "Measurement",
    symbol: "M",
    matrixTex: "",
    effect0: "Con probabilidad |α|² el resultado es 0 y el estado colapsa a |0⟩.",
    effect1: "Con probabilidad |β|² el resultado es 1 y el estado colapsa a |1⟩.",
    geometry: "Proyecta el vector de Bloch sobre el eje Z (base computacional).",
    summary: "Medición en la base computacional: no es una puerta unitaria. Colapsa el qubit a |0⟩ o |1⟩ con las probabilidades de Born |α|² y |β|².",
  },
};

export function getGateDoc(id: GateId): GateDoc {
  return GATE_DOCS[id];
}
