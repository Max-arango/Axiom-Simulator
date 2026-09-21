// Q-sphere renderer for the Quantum Lab (IBM Composer's multi-amplitude view).
// Self-contained WebGL: a faint wireframe unit sphere, plus one stem (center →
// node) and one point per computational basis state. Point size scales with
// probability, colour encodes phase (phaseColor hue wheel). Nodes with prob < 1e-6
// are skipped. GL boilerplate mirrors ../bloch/BlochSphere.tsx (shaders, orbit
// drag, wheel zoom, dpr, ResizeObserver, 2D label overlay) but is pasted here —
// no import from BlochSphere.
//
// Absolute-positioned canvases fill the parent, which MUST be position:relative
// with a set height.

import { useEffect, useRef } from "react";
import { perspective, multiply, orbitView, project, type Mat4 } from "../graph/mat4.ts";
import { qsphereNodes, phaseColor, type QNode } from "../../quantum/qsphere.ts";

// Vertex layout: [x,y,z, r,g,b, size]  → stride 28 bytes. Lines ignore size.
const VS = `
attribute vec3 aPos; attribute vec3 aColor; attribute float aSize;
uniform mat4 uMVP; varying vec3 vColor;
void main() { vColor = aColor; gl_Position = uMVP * vec4(aPos, 1.0); gl_PointSize = aSize; }
`;
const FS = `precision highp float; varying vec3 vColor; void main() { gl_FragColor = vec4(vColor, 1.0); }`;

const MESH = [0.22, 0.27, 0.4];
const SEG = 48;

function shader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

/** Faint wireframe unit sphere (meridians + parallels). Interleaved [x,y,z,r,g,b,size]. */
function buildSphereWire(): Float32Array {
  const v: number[] = [];
  const sph = (theta: number, phi: number): number[] => [
    Math.sin(theta) * Math.cos(phi),
    Math.sin(theta) * Math.sin(phi),
    Math.cos(theta),
  ];
  const seg = (a: number[], b: number[]) =>
    v.push(a[0], a[1], a[2], MESH[0], MESH[1], MESH[2], 0, b[0], b[1], b[2], MESH[0], MESH[1], MESH[2], 0);
  for (let m = 0; m < 12; m++) {
    const phi = (m * Math.PI) / 6;
    for (let i = 0; i < SEG; i++) {
      const t0 = (i * 2 * Math.PI) / SEG, t1 = ((i + 1) * 2 * Math.PI) / SEG;
      seg(sph(t0, phi), sph(t1, phi));
    }
  }
  for (let p = 1; p < 12; p++) {
    const theta = (p * Math.PI) / 12;
    for (let i = 0; i < SEG; i++) {
      const a0 = (i * 2 * Math.PI) / SEG, a1 = ((i + 1) * 2 * Math.PI) / SEG;
      seg(sph(theta, a0), sph(theta, a1));
    }
  }
  return new Float32Array(v);
}

/** Stems (center→node lines, dimmed) + points (node markers, sized by prob). */
function buildNodesGeo(nodes: QNode[]): { stems: Float32Array; pts: Float32Array } {
  const stems: number[] = [];
  const pts: number[] = [];
  for (const nd of nodes) {
    if (nd.prob < 1e-6) continue;
    const [r, g, b] = phaseColor(nd.phase);
    stems.push(0, 0, 0, r * 0.5, g * 0.5, b * 0.5, 0, nd.x, nd.y, nd.z, r * 0.55, g * 0.55, b * 0.55, 0);
    const size = 4 + 22 * Math.sqrt(nd.prob);
    pts.push(nd.x, nd.y, nd.z, r, g, b, size);
  }
  return { stems: new Float32Array(stems), pts: new Float32Array(pts) };
}

export function QSphere({ state, n }: { state: { re: number; im: number }[]; n: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLCanvasElement>(null);
  const cam = useRef({ yaw: -0.7, pitch: 0.3, dist: 3.6 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const glRef = useRef<{
    gl: WebGLRenderingContext; prog: WebGLProgram; uMVP: WebGLUniformLocation;
    wire: WebGLBuffer; wireCount: number; stem: WebGLBuffer; pt: WebGLBuffer;
  } | null>(null);

  // Latest geometry for the imperative renderer. Recompute per component render;
  // the effect below re-uploads + redraws whenever the state signature changes.
  const nn = Math.max(1, Math.min(6, n));
  const nodes = qsphereNodes(state, nn);
  const geoRef = useRef(buildNodesGeo(nodes));
  geoRef.current = buildNodesGeo(nodes);
  const sig = state.map((z) => `${z.re.toFixed(4)},${z.im.toFixed(4)}`).join("|") + `#${nn}`;

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
    const wireData = buildSphereWire();
    const wire = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, wire); gl.bufferData(gl.ARRAY_BUFFER, wireData, gl.STATIC_DRAW);
    glRef.current = {
      gl, prog, uMVP: gl.getUniformLocation(prog, "uMVP")!,
      wire, wireCount: wireData.length / 7, stem: gl.createBuffer()!, pt: gl.createBuffer()!,
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

    const aPos = gl.getAttribLocation(prog, "aPos");
    const aCol = gl.getAttribLocation(prog, "aColor");
    const aSize = gl.getAttribLocation(prog, "aSize");
    const bind = (buf: WebGLBuffer) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 28, 0);
      gl.enableVertexAttribArray(aCol); gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 28, 12);
      gl.enableVertexAttribArray(aSize); gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, 28, 24);
    };

    // Faint wireframe sphere.
    bind(g.wire);
    gl.drawArrays(gl.LINES, 0, g.wireCount);

    const geo = geoRef.current;

    // Stems (center → node).
    gl.bindBuffer(gl.ARRAY_BUFFER, g.stem); gl.bufferData(gl.ARRAY_BUFFER, geo.stems, gl.DYNAMIC_DRAW);
    bind(g.stem);
    gl.drawArrays(gl.LINES, 0, geo.stems.length / 7);

    // Node points (size ∝ prob, colour = phase).
    gl.bindBuffer(gl.ARRAY_BUFFER, g.pt); gl.bufferData(gl.ARRAY_BUFFER, geo.pts, gl.DYNAMIC_DRAW);
    bind(g.pt);
    gl.drawArrays(gl.POINTS, 0, geo.pts.length / 7);

    drawLabels(mvp, canvas.clientWidth, canvas.clientHeight, dpr);
  }

  function drawLabels(mvp: Mat4, w: number, h: number, dpr: number) {
    const lc = labelRef.current;
    if (!lc) return;
    const ctx = lc.getContext("2d")!;
    if (lc.width !== w * dpr || lc.height !== h * dpr) { lc.width = w * dpr; lc.height = h * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px ui-monospace, monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#cfe0ff";
    const north = project(mvp, 0, 0, 1.28, w, h);
    if (north) ctx.fillText("|0…0⟩", north.x, north.y);
    const south = project(mvp, 0, 0, -1.28, w, h);
    if (south) ctx.fillText("|1…1⟩", south.x, south.y);
  }

  // Re-upload node buffers + redraw whenever the incoming state changes.
  useEffect(() => { render(); }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

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
