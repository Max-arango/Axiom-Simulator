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
      "q1/q2 share a Bell pair; a Bell measurement on q0/q1 teleports q0's state to q2.",
    circuit: {
      qubits: 3,
      ops: [
        op("H", [1]),
        op("CX", [1, 2]), // Bell pair on q1,q2
        op("CX", [0, 1]), // Bell measurement basis on q0,q1
        op("H", [0]),
        op("M", [0]),
        op("M", [1]),
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
];

export function getAlgorithm(id: string): PresetSpec | undefined {
  return ALGORITHMS.find((a) => a.id === id);
}
