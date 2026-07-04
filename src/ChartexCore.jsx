import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const BOTS = [
  { key: "bumble", name: "BUMBLE", role: "Market Scanner", color: "#F5C542", glow: "rgba(245,197,66,0.55)", pos: { top: "10%", left: "8%" }, status: "Scanning 9 pairs" },
  { key: "oracle", name: "ORACLE", role: "Probability Engine", color: "#34D399", glow: "rgba(52,211,153,0.55)", pos: { top: "10%", right: "8%" }, status: "Learning" },
  { key: "sentinel", name: "SENTINEL", role: "Risk Intelligence", color: "#A78BFA", glow: "rgba(167,139,250,0.55)", pos: { bottom: "10%", left: "8%" }, status: "Calculating risk" },
  { key: "guardian", name: "GUARDIAN", role: "Trade Protection", color: "#F87171", glow: "rgba(248,113,113,0.55)", pos: { bottom: "10%", right: "8%" }, status: "Standing guard" },
  { key: "titan", name: "TITAN", role: "Swing Specialist", color: "#38BDF8", glow: "rgba(56,189,248,0.55)", pos: { top: "42%", left: "3%" }, status: "Reading 4H structure" },
  { key: "viper", name: "VIPER", role: "Scalp Specialist", color: "#E879F9", glow: "rgba(232,121,249,0.55)", pos: { top: "42%", right: "3%" }, status: "Awaiting alignment" },
];

export default function ChartexCore() {
  const mountRef = useRef(null);
  const stateRef = useRef({ activity: 0.4, pulseRequests: [] });
  const [log, setLog] = useState([
    { id: 1, text: "System initialized — 6 agents online" },
  ]);
  const [clock, setClock] = useState(new Date());
  const [pulseKey, setPulseKey] = useState(0);
  const [activeBeam, setActiveBeam] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── THREE.JS SCENE ────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 7.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Core group
    const core = new THREE.Group();
    scene.add(core);

    // Layer 1 — outer wireframe shell, cyan
    const outerGeo = new THREE.IcosahedronGeometry(1.9, 0);
    const outerMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.35 });
    const outerShell = new THREE.Mesh(outerGeo, outerMat);
    core.add(outerShell);

    // Layer 2 — middle wireframe shell, blue, counter-rotating
    const midGeo = new THREE.IcosahedronGeometry(1.35, 0);
    const midMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, wireframe: true, transparent: true, opacity: 0.5 });
    const midShell = new THREE.Mesh(midGeo, midMat);
    core.add(midShell);

    // Layer 3 — inner solid glowing crystal
    const innerGeo = new THREE.IcosahedronGeometry(0.75, 1);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9, emissive: 0x22d3ee, emissiveIntensity: 1.1,
      metalness: 0.3, roughness: 0.25, flatShading: true,
    });
    const innerCrystal = new THREE.Mesh(innerGeo, innerMat);
    core.add(innerCrystal);

    // Point light inside the core so the crystal actually glows
    const coreLight = new THREE.PointLight(0x22d3ee, 3.5, 8);
    core.add(coreLight);
    const rimLight = new THREE.PointLight(0x3b82f6, 1.5, 12);
    rimLight.position.set(3, 2, 3);
    scene.add(rimLight);

    // Orbiting particle shell
    const particleCount = 260;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 2.6 + Math.random() * 0.9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0x67e8f9, size: 0.028, transparent: true, opacity: 0.75 });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Deep background starfield
    const starCount = 900;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 40;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 5;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x64748b, size: 0.02, transparent: true, opacity: 0.5 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Pulse rings — created on demand when a "trade signal" fires
    const pulseRings = [];
    function spawnPulseRing() {
      const geo = new THREE.RingGeometry(0.9, 1.0, 64);
      const mat = new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = Math.PI / 2.4;
      scene.add(ring);
      pulseRings.push({ mesh: ring, life: 0 });
    }
    stateRef.current.spawnPulseRing = spawnPulseRing;

    let frameId;
    const clockObj = new THREE.Clock();

    function animate() {
      frameId = requestAnimationFrame(animate);
      const dt = clockObj.getDelta();
      const t = clockObj.getElapsedTime();
      const activity = stateRef.current.activity;

      outerShell.rotation.y += dt * 0.12;
      outerShell.rotation.x += dt * 0.04;
      midShell.rotation.y -= dt * 0.22;
      midShell.rotation.z += dt * 0.05;
      innerCrystal.rotation.y += dt * 0.35;
      innerCrystal.rotation.x += dt * 0.15;

      // breathing — scale + emissive tied to "activity"
      const breathe = 1 + Math.sin(t * 1.4) * 0.04 * (0.5 + activity);
      innerCrystal.scale.setScalar(breathe);
      innerMat.emissiveIntensity = 0.8 + activity * 1.4 + Math.sin(t * 2.2) * 0.15;
      coreLight.intensity = 2.5 + activity * 3;

      particles.rotation.y += dt * (0.05 + activity * 0.08);
      particles.rotation.x += dt * 0.01;
      stars.rotation.y += dt * 0.003;

      for (let i = pulseRings.length - 1; i >= 0; i--) {
        const p = pulseRings[i];
        p.life += dt;
        const s = 1 + p.life * 3.2;
        p.mesh.scale.set(s, s, s);
        p.mesh.material.opacity = Math.max(0, 0.8 - p.life * 0.9);
        if (p.life > 1.1) {
          scene.remove(p.mesh);
          pulseRings.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
    }
    animate();

    function handleResize() {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      mount.removeChild(renderer.domElement);
      outerGeo.dispose(); outerMat.dispose();
      midGeo.dispose(); midMat.dispose();
      innerGeo.dispose(); innerMat.dispose();
      particleGeo.dispose(); particleMat.dispose();
      starGeo.dispose(); starMat.dispose();
    };
  }, []);

  // Simulate ambient activity drifting, occasionally spiking
  useEffect(() => {
    const t = setInterval(() => {
      stateRef.current.activity = Math.max(0.15, Math.min(1, stateRef.current.activity + (Math.random() - 0.5) * 0.15));
    }, 900);
    return () => clearInterval(t);
  }, []);

  function fireSignal() {
    const bot = BOTS[Math.floor(Math.random() * BOTS.length)];
    stateRef.current.spawnPulseRing?.();
    stateRef.current.activity = 1;
    setActiveBeam(bot.key);
    setPulseKey((k) => k + 1);
    setLog((prev) => [
      { id: Date.now(), text: `${bot.name} → Core: signal transmitted (${bot.status})` },
      ...prev,
    ].slice(0, 6));
    setTimeout(() => setActiveBeam(null), 1400);
  }

  const timeStr = clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", background: "#03050A", overflow: "hidden", fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}>
      <style>{`
        @keyframes floatCard { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
        @keyframes beamFlow { 0% { background-position: 0% 0%; } 100% { background-position: 200% 0%; } }
        @keyframes dotPulse { 0%,100% { opacity: 1; box-shadow: 0 0 6px currentColor; } 50% { opacity: 0.4; box-shadow: 0 0 2px currentColor; } }
        @keyframes fadeSlide { from { opacity: 0; transform: translateY(-4px);} to { opacity:1; transform: translateY(0);} }

        .topbar { display: flex; flex-wrap: wrap; row-gap: 8px; justify-content: space-between; align-items: center; }
        .topbar-brand { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .topbar-stats { display: flex; gap: 22px; flex-wrap: wrap; justify-content: flex-end; }
        @media (max-width: 640px) {
          .topbar-stats { gap: 12px; justify-content: flex-start; width: 100%; }
          .topbar-brand .mission-status { display: none; }
        }
        @media (max-width: 420px) {
          .topbar-stats .stat-label { font-size: 8px !important; }
          .topbar-stats .stat-value { font-size: 10.5px !important; }
        }
      `}</style>

      {/* Deep vignette + fog overlay */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(10,20,35,0) 0%, rgba(2,4,9,0.9) 78%)", pointerEvents: "none", zIndex: 2 }} />

      {/* Three.js mount */}
      <div ref={mountRef} style={{ position: "absolute", inset: 0, zIndex: 1 }} />

      {/* Top bar */}
      <div className="topbar" style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 5,
        padding: "12px 18px", background: "rgba(6,10,20,0.55)", backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(103,232,249,0.15)",
      }}>
        <div className="topbar-brand">
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34D399", animation: "dotPulse 2s infinite", color: "#34D399", flexShrink: 0 }} />
          <span style={{ color: "#e2e8f0", fontSize: 13, letterSpacing: 3, fontWeight: 600, whiteSpace: "nowrap" }}>CHARTEX <span style={{ color: "#22D3EE" }}>OS</span></span>
          <span className="mission-status" style={{ color: "#64748b", fontSize: 11, marginLeft: 4, whiteSpace: "nowrap" }}>MISSION STATUS: <span style={{ color: "#34D399" }}>NOMINAL</span></span>
        </div>
        <div className="topbar-stats">
          <Stat label="BALANCE" value="$103.51" color="#e2e8f0" />
          <Stat label="DAILY P&L" value="+3.39" color="#34D399" />
          <Stat label="RISK" value="1.4%" color="#F5C542" />
          <Stat label="LATENCY" value="42ms" color="#22D3EE" />
          <Stat label="TIME" value={timeStr} color="#e2e8f0" />
        </div>
      </div>

      {/* Bot modules + beams */}
      {BOTS.map((bot) => (
        <BotModule key={bot.key} bot={bot} active={activeBeam === bot.key} />
      ))}

      {/* Center label under core */}
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, 118px)",
        textAlign: "center", zIndex: 4, pointerEvents: "none",
      }}>
        <div style={{ color: "#67e8f9", fontSize: 11, letterSpacing: 4, opacity: 0.85 }}>MARKET INTELLIGENCE CORE</div>
        <div style={{ color: "#475569", fontSize: 10, letterSpacing: 2, marginTop: 2 }}>6 AGENTS SYNCHRONIZED</div>
      </div>

      {/* Trigger button */}
      <button
        onClick={fireSignal}
        style={{
          position: "absolute", left: "50%", bottom: 108, transform: "translateX(-50%)", zIndex: 6,
          padding: "9px 22px", borderRadius: 999, border: "1px solid rgba(103,232,249,0.4)",
          background: "rgba(34,211,238,0.08)", color: "#67e8f9", fontSize: 11, letterSpacing: 2,
          cursor: "pointer", backdropFilter: "blur(6px)", transition: "all 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34,211,238,0.18)"; e.currentTarget.style.boxShadow = "0 0 24px rgba(34,211,238,0.35)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(34,211,238,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
      >
        ⚡ SIMULATE TRADE SIGNAL
      </button>

      {/* Fleet timeline strip */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 5,
        background: "rgba(6,10,20,0.6)", backdropFilter: "blur(10px)",
        borderTop: "1px solid rgba(103,232,249,0.12)", padding: "10px 20px",
        display: "flex", flexDirection: "column", gap: 3, maxHeight: 92, overflow: "hidden",
      }}>
        {log.map((l, i) => (
          <div key={l.id} style={{
            fontSize: 10.5, color: i === 0 ? "#67e8f9" : "#475569", letterSpacing: 0.5,
            animation: i === 0 ? "fadeSlide 0.4s ease-out" : "none",
          }}>
            <span style={{ opacity: 0.5 }}>▸</span> {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div className="stat-label" style={{ fontSize: 9, color: "#475569", letterSpacing: 1, whiteSpace: "nowrap" }}>{label}</div>
      <div className="stat-value" style={{ fontSize: 12, color, fontWeight: 600, whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

function BotModule({ bot, active }) {
  const isRight = "right" in bot.pos;
  const isTop = "top" in bot.pos;
  return (
    <div style={{ position: "absolute", zIndex: 4, ...bot.pos, animation: "floatCard 5.5s ease-in-out infinite" }}>
      {/* Beam toward center */}
      <div style={{
        position: "absolute", top: "50%", [isRight ? "right" : "left"]: "100%",
        width: 140, height: 2, transformOrigin: isRight ? "right center" : "left center",
        transform: `translateY(-50%) rotate(${isTop ? (isRight ? 32 : -32) : (isRight ? -32 : 32)}deg) ${isTop ? "" : "scaleY(1)"}`,
        background: `linear-gradient(90deg, ${bot.color}00, ${bot.color}${active ? "ff" : "55"} 40%, ${bot.color}00)`,
        backgroundSize: "200% 100%",
        animation: active ? "beamFlow 0.6s linear infinite" : "beamFlow 3s linear infinite",
        opacity: active ? 1 : 0.35,
        transition: "opacity 0.3s",
      }} />
      <div style={{
        width: 148, padding: "10px 12px", borderRadius: 10,
        background: "rgba(8,12,22,0.65)", backdropFilter: "blur(8px)",
        border: `1px solid ${bot.color}${active ? "cc" : "33"}`,
        boxShadow: active ? `0 0 26px ${bot.glow}` : `0 0 14px ${bot.glow}`,
        transition: "box-shadow 0.3s, border-color 0.3s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: bot.color, animation: "dotPulse 1.8s infinite", color: bot.color }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: bot.color, letterSpacing: 1.5 }}>{bot.name}</span>
        </div>
        <div style={{ fontSize: 9, color: "#94a3b8", marginBottom: 5 }}>{bot.role}</div>
        <div style={{ fontSize: 9.5, color: "#cbd5e1" }}>{active ? "Signal transmitted →" : bot.status}</div>
      </div>
    </div>
  );
}
