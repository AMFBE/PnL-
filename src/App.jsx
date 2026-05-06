import { useState, useEffect, useCallback, memo, useContext, createContext, useRef, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
// 🔧 Replace these two values after setting up Supabase (see setup guide below)
const SUPABASE_URL = "https://rymrwshgpdwflsvazzan.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5bXJ3c2hncGR3ZmxzdmF6emFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4ODIzMzMsImV4cCI6MjA5MzQ1ODMzM30.5aUbpTrt5YHCismzg5L_ynMqlTDZTnGK3nbEU2IH_24";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storageKey: "trading-journal-auth",
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ─── PNL CONTEXT ──────────────────────────────────────────────────────────────
const PnLContext = createContext(null);

const LS_KEY = (uid) => `pnl_local_${uid}`;

function PnLProvider({ children, user }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(null);

  // Load data: try Supabase first, fall back to localStorage
  useEffect(() => {
    if (!user) { setData({}); setLoading(false); return; }
    setLoading(true);

    // Always load localStorage immediately so UI is fast
    try {
      const local = localStorage.getItem(LS_KEY(user.id));
      if (local) setData(JSON.parse(local));
    } catch(e) {}

    // Then sync from Supabase
    supabase
      .from("pnl_entries")
      .select("date_key, pnl, adherence")
      .eq("user_id", user.id)
      .then(({ data: rows, error }) => {
        if (error) {
          console.error("Supabase load error:", error.message, error.code);
          setLoading(false);
          return;
        }
        if (rows && rows.length > 0) {
          const map = {};
          rows.forEach(r => { map[r.date_key] = { pnl: r.pnl, adherence: r.adherence }; });
          setData(map);
          // Sync to localStorage as backup
          try { localStorage.setItem(LS_KEY(user.id), JSON.stringify(map)); } catch(e) {}
        }
        setLoading(false);
      });
  }, [user?.id]);

  const saveDay = useCallback(async (dateKey, entry) => {
    if (!user) return;

    // 1. Update local state immediately
    const next = (prev) => ({ ...prev, [dateKey]: entry });
    setData(prev => {
      const updated = next(prev);
      // 2. Save to localStorage immediately as backup
      try { localStorage.setItem(LS_KEY(user.id), JSON.stringify(updated)); } catch(e) {}
      return updated;
    });

    // 3. Save to Supabase
    const { error } = await supabase
      .from("pnl_entries")
      .upsert(
        {
          user_id: user.id,
          date_key: dateKey,
          pnl: entry.pnl === "" || entry.pnl === null ? null : Number(entry.pnl),
          adherence: entry.adherence === true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,date_key" }
      );

    if (error) {
      console.error("Supabase save error:", error.message, error.code, error.details);
      setSaveError(error.message);
      setTimeout(() => setSaveError(null), 4000);
    }
  }, [user?.id]);

  const getDay = useCallback((dateKey) => data[dateKey] || null, [data]);

  return (
    <PnLContext.Provider value={{ data, saveDay, getDay, loading, saveError }}>
      {children}
    </PnLContext.Provider>
  );
}

function usePnL() { return useContext(PnLContext); }

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (n) => {
  if (n === null || n === undefined) return null;
  const abs = Math.abs(n).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return (n >= 0 ? "+" : "−") + abs + " €";
};
const toKey = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const DAYS   = ["Mo","Di","Mi","Do","Fr","Sa","So"];

// ─── MESH BACKGROUND ──────────────────────────────────────────────────────────
function MeshBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 80% 60% at 15% 10%, rgba(99,102,241,0.22) 0%, transparent 58%), radial-gradient(ellipse 65% 75% at 85% 85%, rgba(16,185,129,0.14) 0%, transparent 58%), radial-gradient(ellipse 70% 50% at 55% 45%, rgba(139,92,246,0.09) 0%, transparent 65%)",
        animation: "m1 20s ease-in-out infinite alternate",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 55% 65% at 75% 15%, rgba(6,182,212,0.11) 0%, transparent 55%), radial-gradient(ellipse 80% 40% at 10% 85%, rgba(245,158,11,0.07) 0%, transparent 58%)",
        animation: "m2 26s ease-in-out infinite alternate",
      }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(2,4,20,0.97) 0%,rgba(3,8,28,0.98) 100%)" }} />
      <style>{`
        @keyframes m1{0%{transform:scale(1) translate(0,0)}100%{transform:scale(1.1) translate(2%,3%)}}
        @keyframes m2{0%{transform:scale(1.05) translate(0,0)}100%{transform:scale(0.97) translate(-3%,-2%)}}
      `}</style>
    </div>
  );
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handle = async () => {
    setError(""); setLoading(true); setSuccess("");
    try {
      if (mode === "register") {
        const { error: e } = await supabase.auth.signUp({ email, password });
        if (e) throw e;
        setSuccess("Bestätigungs-E-Mail gesendet! Bitte prüfe dein Postfach.");
      } else {
        const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) throw e;
        onAuth(data.user);
      }
    } catch (e) {
      setError(e.message || "Fehler aufgetreten");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <MeshBackground />
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        style={{
          position: "relative", zIndex: 10, width: 380,
          background: "rgba(6,10,30,0.82)",
          backdropFilter: "blur(36px) saturate(1.8)",
          WebkitBackdropFilter: "blur(36px) saturate(1.8)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 28, padding: "40px 36px 36px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.07)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ fontSize: 38, marginBottom: 12 }}
          >📈</motion.div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.18em", fontFamily: "monospace", marginBottom: 6 }}>
            TRADING JOURNAL
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "white", fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em" }}>
            {mode === "login" ? "Willkommen zurück" : "Account erstellen"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          <GlassInput type="email" placeholder="E-Mail Adresse" value={email} onChange={e => setEmail(e.target.value)} />
          <GlassInput type="password" placeholder="Passwort" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handle()} />
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: 12, color: "#f87171", marginBottom: 14, padding: "10px 14px",
              background: "rgba(239,68,68,0.08)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: 12, color: "#34d399", marginBottom: 14, padding: "10px 14px",
              background: "rgba(16,185,129,0.08)", borderRadius: 10, border: "1px solid rgba(16,185,129,0.2)" }}>
            {success}
          </motion.div>
        )}

        <motion.button
          onClick={handle} whileTap={{ scale: 0.97 }} disabled={loading}
          style={{
            width: "100%", padding: "14px", borderRadius: 14, border: "none",
            background: loading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "white", fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer",
            boxShadow: "0 0 24px rgba(99,102,241,0.35)",
            fontFamily: "monospace", letterSpacing: "0.05em",
          }}
        >
          {loading ? "..." : mode === "login" ? "EINLOGGEN" : "REGISTRIEREN"}
        </motion.button>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
            {mode === "login" ? "Noch kein Account? " : "Bereits registriert? "}
          </span>
          <button onClick={() => { setMode(m => m === "login" ? "register" : "login"); setError(""); setSuccess(""); }}
            style={{ background: "none", border: "none", color: "#a78bfa", fontSize: 12, cursor: "pointer", fontFamily: "monospace", fontWeight: 600 }}>
            {mode === "login" ? "Registrieren" : "Einloggen"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function GlassInput({ type, placeholder, value, onChange, onKeyDown }) {
  const [focused, setFocused] = useState(false);
  return (
    <input type={type} placeholder={placeholder} value={value} onChange={onChange} onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width: "100%", boxSizing: "border-box",
        background: "rgba(255,255,255,0.05)",
        border: `1px solid ${focused ? "rgba(139,92,246,0.6)" : "rgba(255,255,255,0.10)"}`,
        borderRadius: 12, padding: "13px 16px",
        color: "white", fontSize: 14, fontFamily: "monospace",
        outline: "none", transition: "border-color 0.2s",
      }}
    />
  );
}

// ─── HOVER CARD ───────────────────────────────────────────────────────────────
function HoverCard({ entry, dateStr }) {
  const score = entry?.adherence === true ? 100 : entry?.adherence === false ? 0 : null;
  const r = 26, circ = 2 * Math.PI * r;
  const dash = score !== null ? (score / 100) * circ : 0;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 8 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      style={{
        position: "absolute", bottom: "112%", left: "50%", transform: "translateX(-50%)",
        zIndex: 200, minWidth: 148, pointerEvents: "none",
        background: "rgba(6,10,30,0.92)", backdropFilter: "blur(28px) saturate(1.7)",
        border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16,
        padding: "14px 16px", boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
      }}
    >
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", marginBottom: 10, fontFamily: "monospace" }}>{dateStr}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <svg width={64} height={64} viewBox="0 0 64 64">
          <circle cx={32} cy={32} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={5} />
          <circle cx={32} cy={32} r={r} fill="none"
            stroke={entry?.adherence ? "#10b981" : entry ? "#ef4444" : "rgba(255,255,255,0.15)"}
            strokeWidth={5} strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            transform="rotate(-90 32 32)"
            style={{ transition: "stroke-dasharray 0.5s cubic-bezier(.4,0,.2,1)" }}
          />
          <text x={32} y={37} textAnchor="middle" fill="white" fontSize={12} fontWeight="700" fontFamily="monospace">
            {score !== null ? `${score}%` : "—"}
          </text>
        </svg>
        <div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 4 }}>RFS SCORE</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: entry?.adherence ? "#10b981" : entry ? "#ef4444" : "rgba(255,255,255,0.3)" }}>
            {entry?.adherence ? "Plan ✓" : entry ? "Kein Plan" : "Leer"}
          </div>
          {entry?.pnl != null && (
            <div style={{ fontSize: 13, marginTop: 4, fontWeight: 700, fontFamily: "monospace", color: entry.pnl >= 0 ? "#34d399" : "#f87171" }}>
              {fmt(entry.pnl)}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── CALENDAR CELL ────────────────────────────────────────────────────────────
const CalendarCell = memo(function CalendarCell({ day, month, year, index, onOpen, streakStart, streakEnd, streakMid }) {
  const { getDay } = usePnL();
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);
  const mx = useMotionValue(0.5), my = useMotionValue(0.5);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      mx.set((e.clientX - r.left) / r.width);
      my.set((e.clientY - r.top) / r.height);
    };
    const onLeave = () => { mx.set(0.5); my.set(0.5); };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => { el.removeEventListener("mousemove", onMove); el.removeEventListener("mouseleave", onLeave); };
  }, [mx, my]);

  const gx = useTransform(mx, [0, 1], ["-10px", "10px"]);
  const gy = useTransform(my, [0, 1], ["-10px", "10px"]);

  const dateKey = toKey(year, month, day);
  const entry = getDay(dateKey);
  const hasData = entry !== null;
  const { adherence, pnl } = entry || {};

  const today = new Date();
  const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  const streakLine = streakStart || streakMid || streakEnd;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20, scale: 0.86 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 340, damping: 26, delay: index * 0.020 }}
      style={{ position: "relative", cursor: "pointer", transform: "translateZ(0)" }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => onOpen(day)}
    >
      {streakLine && (
        <div style={{
          position: "absolute", top: "50%", zIndex: 1, pointerEvents: "none", height: 2,
          left: streakStart ? "50%" : 0,
          right: streakEnd ? "50%" : 0,
          background: "linear-gradient(90deg, rgba(16,185,129,0.6), rgba(52,211,153,0.9))",
          transform: "translateY(-50%)",
          boxShadow: "0 0 6px rgba(16,185,129,0.5)",
        }} />
      )}

      <motion.div
        whileHover={{ scale: 1.07, y: -3 }}
        transition={{ type: "spring", stiffness: 420, damping: 22 }}
        style={{
          position: "relative", zIndex: 2,
          background: adherence === true ? "rgba(16,185,129,0.07)" : adherence === false ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.028)",
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          border: `1px solid ${
            adherence === true ? "rgba(16,185,129,0.38)"
            : adherence === false ? "rgba(239,68,68,0.24)"
            : isToday ? "rgba(139,92,246,0.55)"
            : "rgba(255,255,255,0.08)"
          }`,
          borderRadius: 14, padding: "10px 7px", minHeight: 74,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
          boxShadow: adherence === true
            ? "inset 0 0 20px rgba(16,185,129,0.17), 0 0 14px rgba(16,185,129,0.28)"
            : adherence === false
            ? "inset 0 0 16px rgba(239,68,68,0.10), 0 0 8px rgba(239,68,68,0.15)"
            : "none",
          transform: "translateZ(0)",
          transition: "box-shadow 0.35s, border-color 0.35s",
        }}
      >
        {hovered && (
          <motion.div style={{
            position: "absolute", inset: 0, borderRadius: 13, pointerEvents: "none", zIndex: 3,
            background: `radial-gradient(circle at calc(${gx} + 50%) calc(${gy} + 50%), rgba(255,255,255,0.08) 0%, transparent 68%)`,
          }} />
        )}

        <div style={{
          fontSize: 10, fontWeight: isToday ? 700 : 500, letterSpacing: "0.06em",
          color: isToday ? "#a78bfa" : "rgba(255,255,255,0.42)",
          fontFamily: "'DM Mono', monospace", alignSelf: "flex-start", paddingLeft: 3,
        }}>{day}</div>

        {hasData && pnl != null ? (
          <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: pnl >= 0 ? "#34d399" : "#f87171", letterSpacing: "-0.02em" }}>
            {pnl >= 0 ? "+" : "−"}{Math.abs(pnl).toLocaleString("de-DE")}
          </div>
        ) : (
          <div style={{ width: 18, height: 2, background: "rgba(255,255,255,0.09)", borderRadius: 2 }} />
        )}

        <div style={{ height: 10, display: "flex", alignItems: "center" }}>
          {adherence === true && (
            <motion.div
              animate={{ scale: [1, 1.35, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 7px #10b981, 0 0 14px rgba(16,185,129,0.45)" }}
            />
          )}
          {adherence === false && (
            <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}
              style={{ fontSize: 9, color: "#ef4444", lineHeight: 1 }}>✕</motion.div>
          )}
          {!hasData && <div style={{ width: 5, height: 5, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.11)" }} />}
        </div>
      </motion.div>

      <AnimatePresence>
        {hovered && (
          <HoverCard entry={entry} dateStr={`${String(day).padStart(2,"0")}.${String(month+1).padStart(2,"0")}.${year}`} />
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// ─── INPUT MODAL ──────────────────────────────────────────────────────────────
function InputModal({ day, month, year, onClose }) {
  const { getDay, saveDay } = usePnL();
  const dateKey = toKey(year, month, day);
  const existing = getDay(dateKey);
  const [pnl, setPnl] = useState(existing?.pnl ?? "");
  const [adherence, setAdherence] = useState(existing?.adherence ?? false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await saveDay(dateKey, { pnl: pnl === "" ? null : Number(pnl), adherence });
    setSaved(true); setSaving(false);
    setTimeout(onClose, 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.88, y: 28, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.88, y: 28, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: 350,
          background: "rgba(6,10,30,0.88)", backdropFilter: "blur(36px) saturate(1.9)",
          WebkitBackdropFilter: "blur(36px) saturate(1.9)",
          border: "1px solid rgba(255,255,255,0.11)", borderRadius: 26,
          padding: "30px 28px 26px",
          boxShadow: "0 28px 72px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.07)",
          transform: "translateZ(0)",
        }}
      >
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", fontFamily: "monospace", marginBottom: 5 }}>TAGESEINTRAG</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "white", fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em" }}>
            {day}. {MONTHS[month]} {year}
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 8 }}>TAGES-PNL (€)</div>
          <input
            type="number" value={pnl} placeholder="0"
            onChange={e => setPnl(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)", borderRadius: 13,
              padding: "13px 16px",
              color: pnl === "" ? "rgba(255,255,255,0.25)" : Number(pnl) >= 0 ? "#34d399" : "#f87171",
              fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono', monospace", outline: "none",
              transition: "color 0.2s, border-color 0.2s",
            }}
            onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.55)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
          />
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 12 }}>PLAN-ADHERENCE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <motion.button
              onClick={() => setAdherence(v => !v)} whileTap={{ scale: 0.9 }}
              animate={{ background: adherence ? "linear-gradient(135deg,#059669,#10b981)" : "rgba(255,255,255,0.08)" }}
              transition={{ type: "spring", stiffness: 500, damping: 24 }}
              style={{
                width: 58, height: 32, borderRadius: 16, border: "none", cursor: "pointer",
                position: "relative", padding: 0, flexShrink: 0,
                boxShadow: adherence ? "0 0 18px rgba(16,185,129,0.55), inset 0 1px 0 rgba(255,255,255,0.2)" : "none",
              }}
            >
              <motion.div
                animate={{ x: adherence ? 28 : 3 }}
                transition={{ type: "spring", stiffness: 520, damping: 26 }}
                style={{ position: "absolute", top: 4, width: 24, height: 24, borderRadius: "50%", background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
              />
            </motion.button>
            <motion.span
              animate={{ color: adherence ? "#10b981" : "rgba(255,255,255,0.3)" }}
              style={{ fontSize: 14, fontWeight: 600, fontFamily: "'DM Mono', monospace" }}
            >
              {adherence ? "Plan befolgt ✓" : "Nicht befolgt"}
            </motion.span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: 13, borderRadius: 13, cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
            color: "rgba(255,255,255,0.45)", fontFamily: "monospace",
          }}>Abbrechen</button>
          <motion.button
            onClick={handleSave} disabled={saving} whileTap={{ scale: 0.96 }}
            style={{
              flex: 2, padding: 13, borderRadius: 13, border: "none", cursor: saving ? "wait" : "pointer",
              fontSize: 13, fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.04em",
              background: saved ? "linear-gradient(135deg,#059669,#10b981)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "white",
              boxShadow: saved ? "0 0 22px rgba(16,185,129,0.45)" : "0 0 16px rgba(99,102,241,0.35)",
              transition: "background 0.4s, box-shadow 0.4s",
            }}
          >
            {saving ? "Speichern..." : saved ? "✓ Gespeichert" : "Speichern"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── MAIN CALENDAR ─────────────────────────────────────────────────────────────
function Calendar({ user, onLogout }) {
  const { data, loading, saveError } = usePnL();
  const today = new Date();
  const [yr, setYr] = useState(today.getFullYear());
  const [mo, setMo] = useState(today.getMonth());
  const [modalDay, setModalDay] = useState(null);
  const [navDir, setNavDir] = useState(1);
  const [calKey, setCalKey] = useState(0);

  const navigate = (dir) => {
    setNavDir(dir); setCalKey(k => k + 1);
    if (dir === -1) { if (mo === 0) { setMo(11); setYr(y => y - 1); } else setMo(m => m - 1); }
    else { if (mo === 11) { setMo(0); setYr(y => y + 1); } else setMo(m => m + 1); }
  };

  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const firstDay = new Date(yr, mo, 1).getDay();
  const startOffset = (firstDay + 6) % 7;

  const streakMap = useMemo(() => {
    const map = {};
    for (let d = 1; d <= daysInMonth; d++) map[d] = data[toKey(yr, mo, d)]?.adherence === true;
    return map;
  }, [data, yr, mo, daysInMonth]);

  const getStreak = (d) => {
    if (!streakMap[d]) return {};
    return { streakStart: !streakMap[d - 1], streakEnd: !streakMap[d + 1], streakMid: !!streakMap[d - 1] && !!streakMap[d + 1] };
  };

  const monthEntries = Object.entries(data).filter(([k]) => k.startsWith(`${yr}-${String(mo+1).padStart(2,"0")}`));
  const totalPnL = monthEntries.reduce((s, [, v]) => s + (v.pnl || 0), 0);
  const adherencePct = monthEntries.length > 0
    ? Math.round(monthEntries.filter(([,v]) => v.adherence).length / monthEntries.length * 100) : 0;

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <MeshBackground />
      <div style={{ position: "relative", zIndex: 10, maxWidth: 800, margin: "0 auto", padding: "28px 18px 56px" }}>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", letterSpacing: "0.18em", fontFamily: "monospace", marginBottom: 4 }}>TRADING JOURNAL</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "white", fontFamily: "'Playfair Display', serif", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              {MONTHS[mo]} <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 22 }}>{yr}</span>
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", fontFamily: "monospace", marginTop: 4 }}>{user.email}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <StatPill label="Monats-PnL" value={fmt(totalPnL) || "—"} color={totalPnL >= 0 ? "#34d399" : "#f87171"} />
              <StatPill label="Disziplin" value={`${adherencePct}%`} color="#a78bfa" />
            </div>
            <button onClick={onLogout} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
              color: "rgba(255,255,255,0.35)", fontSize: 10, padding: "6px 12px", borderRadius: 8,
              cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.08em",
            }}>AUSLOGGEN</button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <NavBtn onClick={() => navigate(-1)}>‹</NavBtn>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          <NavBtn onClick={() => navigate(1)}>›</NavBtn>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 9, color: "rgba(255,255,255,0.22)", fontFamily: "monospace", letterSpacing: "0.1em", padding: "3px 0" }}>{d}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              style={{ width: 28, height: 28, border: "2px solid rgba(255,255,255,0.08)", borderTop: "2px solid #a78bfa", borderRadius: "50%" }} />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={calKey}
              initial={{ opacity: 0, x: navDir * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -navDir * 28 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}
            >
              {cells.map((day, i) => day === null ? <div key={`e-${i}`} /> : (
                <CalendarCell key={`${yr}-${mo}-${day}`}
                  day={day} month={mo} year={yr} index={i}
                  onOpen={setModalDay} {...getStreak(day)} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        <div style={{ display: "flex", gap: 20, marginTop: 22, justifyContent: "center" }}>
          {[["#10b981","Plan befolgt"],["#ef4444","Plan nicht befolgt"],["rgba(255,255,255,0.14)","Keine Daten"]].map(([c,l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: c, boxShadow: c.startsWith("rgba") ? "none" : `0 0 5px ${c}` }} />
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", fontFamily: "monospace" }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {modalDay !== null && (
          <InputModal day={modalDay} month={mo} year={yr} onClose={() => setModalDay(null)} />
        )}
      </AnimatePresence>

      {/* Save error toast */}
      <AnimatePresence>
        {saveError && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            style={{
              position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
              zIndex: 999, background: "rgba(239,68,68,0.15)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(239,68,68,0.4)",
              borderRadius: 14, padding: "12px 20px",
              color: "#f87171", fontSize: 12, fontFamily: "monospace",
              boxShadow: "0 8px 32px rgba(239,68,68,0.2)",
            }}
          >
            ⚠ Speicherfehler: {saveError}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
      padding: "9px 13px", backdropFilter: "blur(14px)", textAlign: "right" }}>
      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color, fontFamily: "'DM Mono', monospace" }}>{value}</div>
    </div>
  );
}
function NavBtn({ onClick, children }) {
  return (
    <motion.button onClick={onClick} whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
      style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)",
        color: "rgba(255,255,255,0.55)", fontSize: 20, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
      {children}
    </motion.button>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.error("Session error:", error);
      setUser(session?.user ?? null);
      setChecking(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => { await supabase.auth.signOut(); setUser(null); };

  if (checking) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#020414" }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        style={{ width: 32, height: 32, border: "2px solid rgba(255,255,255,0.06)", borderTop: "2px solid #8b5cf6", borderRadius: "50%" }} />
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #020414; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        ::placeholder { color: rgba(255,255,255,0.22) !important; }
      `}</style>
      {!user ? (
        <AuthScreen onAuth={setUser} />
      ) : (
        <PnLProvider user={user}>
          <Calendar user={user} onLogout={logout} />
        </PnLProvider>
      )}
    </>
  );
}
