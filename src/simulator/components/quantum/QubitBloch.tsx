// Self-contained Bloch sphere driven by a `vec` prop — one qubit's Bloch vector.
// GL boilerplate mirrors ../bloch/BlochSphere.tsx (shaders, orbit camera, drag,
// wheel zoom, ResizeObserver, dpr) but takes NO store: the vector comes in as a
// prop and the sphere redraws whenever it changes. |vec| < 1 (a mixed/entangled
// qubit) naturally yields a shorter arrow — that is correct and desirable.
//
// Absolute-positioned canvases fill the parent, which MUST be position:relative
// with a set height.

import { useEffect, useRef } from "react";
import { perspective, multiply, orbitView, project, type Mat4 } from "../graph/mat4.ts";
import { buildBlochGeo, buildDynamic } from "../bloch/blochGeo.ts";

type V3 = [number, number, number];

const VS = `
attribute vec3 aPos; attribute vec3 aColor;
uniform mat4 uMVP; varying vec3 vColor;
void main() { vColor = aColor; gl_Position = uMVP * vec4(aPos, 1.0); gl_PointSize = 7.0; }
`;
const FS = `precision highp float; varying vec3 vColor; void main() { gl_FragColor = vec4(vColor, 1.0); }`;

const LABELS: { p: V3; t: string; c: string }[] = [
  { p: [0, 0, 1.3], t: "|0⟩", c: "#cfe0ff" },
  { p: [0, 0, -1.3], t: "|1⟩", c: "#cfe0ff" },
  { p: [1.32, 0, 0], t: "|+⟩", c: "#f2a6a6" },
  { p: [-1.34, 0, 0], t: "|−⟩", c: "#f2a6a6" },
  { p: [0, 1.32, 0], t: "|i⟩", c: "#a6e8b8" },
  { p: [0, -1.4, 0], t: "|−i⟩", c: "#a6e8b8" },
];

function shader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

export function QubitBloch({ vec }: { vec: V3 }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLCanvasElement>(null);
  const cam = useRef({ yaw: -0.7, pitch: 0.45, dist: 3.4 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const glRef = useRef<{
    gl: WebGLRenderingContext; prog: WebGLProgram; uMVP: WebGLUniformLocation;
    geo: WebGLBuffer; geoCount: number; dyn: WebGLBuffer; pt: WebGLBuffer;
  } | null>(null);

  // The vector currently drawn (animated toward the incoming `vec` prop).
  const drawnRef = useRef<V3>(vec);
  const animRef = useRef(0);

  // Init GL once.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    gl.enable(gl.DEPTH_TEST);
    const geoData = buildBlochGeo();
    const geo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, geo); gl.bufferData(gl.ARRAY_BUFFER, geoData, gl.STATIC_DRAW);
    glRef.current = {
      gl, prog, uMVP: gl.getUniformLocation(prog, "uMVP")!,
      geo, geoCount: geoData.length / 6, dyn: gl.createBuffer()!, pt: gl.createBuffer()!,
    };
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function render() {
    const g = glRef.current;
    if (!g) return;
    const { gl, prog } = g;
    const canvas = canvasRef.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.clearColor(0.02, 0.03, 0.05, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(prog);

    const proj = perspective(Math.PI / 4, w / h || 1, 0.1, 100);
    const mvp = multiply(proj, orbitView(cam.current.yaw, cam.current.pitch, cam.current.dist));
    gl.uniformMatrix4fv(g.uMVP, false, mvp);

    const aPos = gl.getAttribLocation(prog, "aPos"), aCol = gl.getAttribLocation(prog, "aColor");
    const bind = (buf: WebGLBuffer) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(aCol); gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 24, 12);
    };

    // Static wireframe.
    bind(g.geo);
    gl.drawArrays(gl.LINES, 0, g.geoCount);

    // State vector arrow (shorter when the qubit is mixed/entangled).
    const vec = drawnRef.current;
    const dyn = buildDynamic(vec, [], false);
    gl.bindBuffer(gl.ARRAY_BUFFER, g.dyn); gl.bufferData(gl.ARRAY_BUFFER, dyn, gl.DYNAMIC_DRAW);
    bind(g.dyn);
    gl.drawArrays(gl.LINES, 0, dyn.length / 6);

    // Bright tip marker.
    const pt = new Float32Array([vec[0], vec[1], vec[2], 1.0, 0.9, 0.35]);
    gl.bindBuffer(gl.ARRAY_BUFFER, g.pt); gl.bufferData(gl.ARRAY_BUFFER, pt, gl.DYNAMIC_DRAW);
    bind(g.pt);
    gl.drawArrays(gl.POINTS, 0, 1);

    drawLabels(mvp, canvas.clientWidth, canvas.clientHeight, dpr);
  }

  function drawLabels(mvp: Mat4, w: number, h: number, dpr: number) {
    const lc = labelRef.current;
    if (!lc) return;
    const ctx = lc.getContext("2d")!;
    if (lc.width !== w * dpr || lc.height !== h * dpr) { lc.width = w * dpr; lc.height = h * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.font = "13px ui-monospace, monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const l of LABELS) {
      const p = project(mvp, l.p[0], l.p[1], l.p[2], w, h);
      if (!p) continue;
      ctx.fillStyle = l.c;
      ctx.fillText(l.t, p.x, p.y);
    }
  }

  // Animate the drawn vector from its current value to the new `vec` over ~400ms
  // (great-circle-ish: interpolate direction, lerp magnitude). Snaps if GL not ready.
  useEffect(() => {
    cancelAnimationFrame(animRef.current);
    const from = drawnRef.current;
    const to = vec;
    const mag = (v: V3) => Math.hypot(v[0], v[1], v[2]);
    const mf = mag(from), mt = mag(to);
    const at = (t: number): V3 => {
      if (mf < 1e-6 || mt < 1e-6) {
        return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t];
      }
      const d: V3 = [
        from[0] / mf + (to[0] / mt - from[0] / mf) * t,
        from[1] / mf + (to[1] / mt - from[1] / mf) * t,
        from[2] / mf + (to[2] / mt - from[2] / mf) * t,
      ];
      const dl = Math.hypot(d[0], d[1], d[2]) || 1;
      const m = mf + (mt - mf) * t;
      return [(d[0] / dl) * m, (d[1] / dl) * m, (d[2] / dl) * m];
    };
    const start = performance.now();
    const dur = 400;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      drawnRef.current = at(t);
      render();
      if (t < 1) animRef.current = requestAnimationFrame(step);
      else { drawnRef.current = to; render(); }
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vec[0], vec[1], vec[2]]);

  useEffect(() => {
    const ro = new ResizeObserver(() => render());
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY }; canvasRef.current!.setPointerCapture(e.pointerId); };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    cam.current.yaw -= dx * 0.01;
    cam.current.pitch = Math.max(-1.5, Math.min(1.5, cam.current.pitch + dy * 0.01));
    render();
  };
  const onUp = () => { drag.current = null; };
  const onWheel = (e: React.WheelEvent) => {
    cam.current.dist = Math.max(2, Math.min(8, cam.current.dist * (e.deltaY > 0 ? 1.1 : 1 / 1.1)));
    render();
  };

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" style={{ display: "block", cursor: "grab" }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onWheel={onWheel} />
      <canvas ref={labelRef} className="pointer-events-none absolute inset-0 h-full w-full" />
    </>
  );
}
