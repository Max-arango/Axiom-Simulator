import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useLifeStore } from "../../life/store.ts";

export function PopGraph() {
  const history = useLifeStore((s) => s.history);
  if (history.length < 2) {
    return <p className="px-1 py-2 text-xs text-graphite">Run simulation to see population over time.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={80}>
      <LineChart data={history} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <XAxis dataKey="gen" hide />
        <YAxis hide />
        <Tooltip
          contentStyle={{ background: "#1c1b18", border: "1px solid rgba(240,238,229,0.12)", borderRadius: 6, fontSize: 11 }}
          labelStyle={{ color: "#a5a294" }}
          itemStyle={{ color: "#e0673d" }}
          formatter={(v: number) => [v, "Pop"]}
          labelFormatter={(g: number) => `Gen ${g}`}
        />
        <Line type="monotone" dataKey="pop" stroke="#e0673d" strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
