// Preset teaching circuits. Every entry MUST pass circuit.validate(). Correctness
// beyond validation is only asserted where meaningful (bell/ghz); teleportation,
// Deutsch–Jozsa and Grover are pedagogically shaped, valid examples.
//
// Little-endian, controlled ops = [...controls, target] (target LAST).

import type { Circuit, Operation } from "./types.ts";

const op = (gate: Operation["gate"], qubits: number[], params?: Operation["params"]): Operation =>
  params ? { gate, qubits, params } : { gate, qubits };

export interface PresetSpec {
  id: string;
  name: string;
  description: string;
  circuit: Circuit;
}

export const ALGORITHMS: PresetSpec[] = [
  {
    id: "superposition",
    name: "Superposition",
    description: "A single Hadamard puts one qubit into an equal |0⟩ + |1⟩ superposition.",
    circuit: { qubits: 1, ops: [op("H", [0])] },
  },
  {
    id: "bell",
    name: "Bell State",
    description: "H on q0 then CNOT(q0→q1) entangles the pair into (|00⟩ + |11⟩)/√2.",
    circuit: { qubits: 2, ops: [op("H", [0]), op("CX", [0, 1])] },
  },
  {
    id: "ghz",
    name: "GHZ State",
    description: "Extends the Bell construction to three qubits: (|000⟩ + |111⟩)/√2.",
    circuit: { qubits: 3, ops: [op("H", [0]), op("CX", [0, 1]), op("CX", [1, 2])] },
  },
  {
    id: "teleportation",
    name: "Quantum Teleportation",
    description:
      "Teleporta el estado de q0 (aquí |1⟩) a q2 usando un par de Bell (q1,q2), medición de Bell y corrección clásica condicional (c_if). q2 acaba en el estado original en toda ejecución.",
    circuit: {
      qubits: 3,
      clbits: 3,
      ops: [
        op("X", [0]), // mensaje a teleportar: |1⟩ (cámbialo por H, RX(θ)… para otro estado)
        op("H", [1]),
        op("CX", [1, 2]), // par de Bell en q1,q2
        op("CX", [0, 1]), // base de medición de Bell en q0,q1
        op("H", [0]),
        { gate: "M", qubits: [0], clbit: 0 },
        { gate: "M", qubits: [1], clbit: 1 },
        { gate: "X", qubits: [2], condition: { clbit: 1, value: 1 } }, // corrección condicional
        { gate: "Z", qubits: [2], condition: { clbit: 0, value: 1 } },
      ],
    },
  },
  {
    id: "deutschJozsa",
    name: "Deutsch–Jozsa",
    description:
      "Two input qubits + one ancilla with a balanced oracle f(x)=x0⊕x1; inputs measure non-zero.",
    circuit: {
      qubits: 3,
      ops: [
        op("X", [2]), // ancilla to |1⟩
        op("H", [0]),
        op("H", [1]),
        op("H", [2]),
        op("CX", [0, 2]), // balanced oracle: f(x) = x0 XOR x1
        op("CX", [1, 2]),
        op("H", [0]),
        op("H", [1]),
        op("M", [0]),
        op("M", [1]),
      ],
    },
  },
  {
    id: "grover",
    name: "Grover Search",
    description: "2-qubit search marking |11⟩: CZ oracle + one diffusion iteration finds it.",
    circuit: {
      qubits: 2,
      ops: [
        op("H", [0]),
        op("H", [1]),
        op("CZ", [0, 1]), // oracle marks |11⟩
        // diffusion
        op("H", [0]),
        op("H", [1]),
        op("X", [0]),
        op("X", [1]),
        op("CZ", [0, 1]),
        op("X", [0]),
        op("X", [1]),
        op("H", [0]),
        op("H", [1]),
      ],
    },
  },
  {
    id: "superdense",
    name: "Codificación superdensa",
    description:
      "Con un par de Bell compartido, Alice envía 2 bits clásicos (aquí '11') manipulando solo su qubit; Bob los recupera. Codifica X·Z en q0 y decodifica con CX+H.",
    circuit: {
      qubits: 2,
      ops: [
        op("H", [0]),
        op("CX", [0, 1]), // par de Bell
        op("Z", [0]), // Alice codifica el mensaje "11" (Z luego X)
        op("X", [0]),
        op("CX", [0, 1]), // Bob decodifica
        op("H", [0]),
        { gate: "M", qubits: [0], clbit: 0 },
        { gate: "M", qubits: [1], clbit: 1 },
      ],
    },
  },
  {
    id: "kickback",
    name: "Phase kickback",
    description:
      "El ancilla en |1⟩ (autoestado de X con autovalor −1) devuelve una fase al qubit de control a través de un CNOT: base del algoritmo de Deutsch y de la estimación de fase.",
    circuit: {
      qubits: 2,
      ops: [op("X", [1]), op("H", [0]), op("H", [1]), op("CX", [0, 1]), op("H", [1])],
    },
  },
  {
    id: "bitflip",
    name: "Código bit-flip (3 qubits)",
    description:
      "Código de repetición: codifica un qubit lógico (aquí |1⟩) en 3 físicos con dos CNOT. Base de la corrección de errores frente a inversiones de bit.",
    circuit: {
      qubits: 3,
      ops: [op("X", [0]), op("CX", [0, 1]), op("CX", [0, 2])],
    },
  },
];

export function getAlgorithm(id: string): PresetSpec | undefined {
  return ALGORITHMS.find((a) => a.id === id);
}
