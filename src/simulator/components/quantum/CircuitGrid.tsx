import { useQuantum, columnCount, placementAt, type PlacedOp } from "../../quantum/quantumStore.ts";
import { getGateDoc } from "../../quantum/gateDocs.ts";
import { cellRole, columnSpan, type CellRole } from "./gridCell.ts";

// ponytail: row height is hardcoded to match Tailwind h-12 (48px) because the
// vertical multi-qubit connector is absolutely positioned and needs pixel math.
// If the cell height class changes, update ROW_H too.
const ROW_H = 48;
const MIN_COLS = 8;

const targetGlyph: Record<string, string> = { CX: "⊕", CCX: "⊕", CZ: "Z" };

export function CircuitGrid() {
  const numQubits = useQuantum((s) => s.numQubits);
  const placements = useQuantum((s) => s.placements);
  const selectedId = useQuantum((s) => s.selectedId);
  const step = useQuantum((s) => s.step);
  const cellClick = useQuantum((s) => s.cellClick);
  const selectPlacement = useQuantum((s) => s.selectPlacement);

  const cols = Math.max(columnCount(placements) + 1, MIN_COLS);
  const rows = Array.from({ length: numQubits }, (_, i) => i);
  const columns = Array.from({ length: cols }, (_, i) => i);

  const onCell = (qubit: number, column: number) => {
    const op = placementAt(placements, qubit, column);
    if (op) selectPlacement(op.id);
    cellClick(qubit, column);
  };

  return (
    <div className="flex select-none font-mono text-sm text-ink">
      {/* qubit labels */}
      <div className="flex flex-col">
        {rows.map((q) => (
          <div key={q} className="flex h-12 w-10 items-center justify-end pr-2 text-[11px] text-graphite">
            q{q}
          </div>
        ))}
      </div>

      {/* scrollable moment columns */}
      <div className="overflow-x-auto scroll-thin">
        <div className="flex">
          {columns.map((col) => (
            <Column
              key={col}
              col={col}
              rows={rows}
              placements={placements}
              executed={col < step}
              playhead={col === step}
              selectedId={selectedId}
              onCell={onCell}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Column({
  col,
  rows,
  placements,
  executed,
  playhead,
  selectedId,
  onCell,
}: {
  col: number;
  rows: number[];
  placements: PlacedOp[];
  executed: boolean;
  playhead: boolean;
  selectedId: string | null;
  onCell: (qubit: number, column: number) => void;
}) {
  // multi-qubit ops in this column → vertical connectors between their extreme qubits
  const connectors = placements
    .filter((p) => p.column === col && p.qubits.length > 1)
    .map((p) => ({ id: p.id, ...columnSpan(p) }));

  return (
    <div
      className={`relative flex flex-col ${executed ? "bg-vermilion-500/[0.06]" : ""} ${
        playhead ? "border-l border-vermilion-400/50" : ""
      }`}
    >
      {connectors.map((c) => (
        <div
          key={c.id}
          className={`pointer-events-none absolute left-1/2 w-px -translate-x-1/2 ${
            c.id === selectedId ? "bg-vermilion-300" : "bg-vermilion-400/60"
          }`}
          style={{ top: c.min * ROW_H + ROW_H / 2, height: (c.max - c.min) * ROW_H }}
        />
      ))}
      {rows.map((q) => (
        <Cell
          key={q}
          role={cellRole(placements, q, col)}
          executed={executed}
          selectedId={selectedId}
          onClick={() => onCell(q, col)}
        />
      ))}
    </div>
  );
}

function Cell({
  role,
  executed,
  selectedId,
  onClick,
}: {
  role: CellRole;
  executed: boolean;
  selectedId: string | null;
  onClick: () => void;
}) {
  const opId = role.kind === "empty" ? null : role.op.id;
  const selected = opId !== null && opId === selectedId;
  const wire = executed ? "bg-vermilion-400/40" : "bg-line";
  const ring = selected ? "ring-2 ring-vermilion-400" : "";

  return (
    <button
      onClick={onClick}
      title={cellTitle(role)}
      aria-label={cellTitle(role)}
      className="group relative flex h-12 w-14 items-center justify-center focusable"
    >
      {/* horizontal wire segment (cells abut → continuous wire) */}
      <span className={`pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 ${wire}`} />
      <span className="relative z-10 flex items-center justify-center">{renderRole(role, ring)}</span>
    </button>
  );
}

function renderRole(role: CellRole, ring: string): React.ReactNode {
  switch (role.kind) {
    case "empty":
      return <span className="text-lg text-graphite/0 transition group-hover:text-graphite/40">+</span>;
    case "single":
      return (
        <span
          className={`flex size-9 items-center justify-center rounded border border-line bg-void-soft text-[13px] text-ink ${ring}`}
        >
          {getGateDoc(role.op.gate).symbol}
        </span>
      );
    case "control":
      return <span className={`size-3 rounded-full bg-vermilion-300 ${ring}`} />;
    case "target":
      return (
        <span
          className={`flex size-7 items-center justify-center rounded-full border border-vermilion-400/70 bg-void-soft text-base text-vermilion-200 ${ring}`}
        >
          {targetGlyph[role.op.gate] ?? "⊕"}
        </span>
      );
    case "swap":
      return <span className={`text-xl font-bold text-vermilion-200 ${ring}`}>×</span>;
    case "measure":
      return (
        <span
          className={`flex size-9 items-center justify-center rounded border border-graphite/60 bg-void-soft text-[13px] text-graphite ${ring}`}
        >
          M↗
        </span>
      );
  }
}

function cellTitle(role: CellRole): string {
  switch (role.kind) {
    case "empty":
      return "Celda vacía — clic para colocar la puerta seleccionada";
    case "control":
      return `${getGateDoc(role.op.gate).name} — control`;
    case "target":
      return `${getGateDoc(role.op.gate).name} — objetivo`;
    case "swap":
      return "SWAP";
    case "measure":
      return "Medición";
    case "single":
      return getGateDoc(role.op.gate).name;
  }
}
