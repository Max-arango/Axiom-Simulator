// General n-input / m-output ternary functions — the substrate for building
// and enumerating arbitrary ternary logic (beyond the fixed gates in gates.ts).
//
// A function is either pure-fn-backed (fromFunction) or table-backed
// (fromTable, a Map keyed by the input tuple). Either way it can enumerate all
// 3^n input rows, which is what a truth-table UI consumes.

import { System, Trit, assertSystem, tritValues } from "./trit";

export interface TernaryFunction {
  system: System;
  arity: number; // n inputs
  outputs: number; // m outputs
  eval: (inputs: Trit[]) => Trit[];
}

/** All 3^arity input rows for a system, in odometer order (last input fastest). */
export function allInputRows(system: System, arity: number): Trit[][] {
  const vals = tritValues(system);
  let rows: Trit[][] = [[]];
  for (let k = 0; k < arity; k++) {
    const next: Trit[][] = [];
    for (const r of rows) for (const v of vals) next.push([...r, v]);
    rows = next;
  }
  return rows;
}

const key = (inputs: Trit[]): string => inputs.join(",");

/** Wrap a pure function. Inputs/outputs are validated against the system. */
export function fromFunction(
  system: System,
  arity: number,
  outputs: number,
  fn: (inputs: Trit[]) => Trit[],
): TernaryFunction {
  return {
    system,
    arity,
    outputs,
    eval(inputs) {
      if (inputs.length !== arity) {
        throw new RangeError(`expected ${arity} inputs, got ${inputs.length}`);
      }
      assertSystem(inputs, system);
      const out = fn(inputs);
      if (out.length !== outputs) {
        throw new RangeError(`expected ${outputs} outputs, got ${out.length}`);
      }
      assertSystem(out, system);
      return out;
    },
  };
}

/** Build a custom function from a user-provided table. Rows may be partial;
 *  eval throws if asked for an input tuple not present in the table. */
export function fromTable(
  system: System,
  arity: number,
  outputs: number,
  rows: { inputs: Trit[]; outputs: Trit[] }[],
): TernaryFunction {
  const map = new Map<string, Trit[]>();
  for (const { inputs, outputs: out } of rows) {
    if (inputs.length !== arity) {
      throw new RangeError(`row has ${inputs.length} inputs, expected ${arity}`);
    }
    if (out.length !== outputs) {
      throw new RangeError(`row has ${out.length} outputs, expected ${outputs}`);
    }
    assertSystem(inputs, system);
    assertSystem(out, system);
    map.set(key(inputs), out);
  }
  return {
    system,
    arity,
    outputs,
    eval(inputs) {
      const out = map.get(key(inputs));
      if (!out) throw new RangeError(`no table entry for inputs [${key(inputs)}]`);
      return out;
    },
  };
}

/** Full truth table: every input row paired with its output row. */
export function enumerate(
  f: TernaryFunction,
): { inputs: Trit[]; outputs: Trit[] }[] {
  return allInputRows(f.system, f.arity).map((inputs) => ({
    inputs,
    outputs: f.eval(inputs),
  }));
}
