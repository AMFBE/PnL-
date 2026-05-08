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

    // Handle delete (entry === null)
    if (entry === null) {
      setData(prev => {
        const updated = { ...prev };
        delete updated[dateKey];
        try { localStorage.setItem(LS_KEY(user.id), JSON.stringify(updated)); } catch(e) {}
        return updated;
      });
      await supabase.from("pnl_entries").delete()
        .eq("user_id", user.id).eq("date_key", dateKey);
      return;
    }

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
          note: entry.note ?? null,
          mood: entry.mood ?? null,
          chart_url: entry.chart_url ?? null,
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
  const isTouchDevice = typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
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
      onHoverStart={() => { if (!isTouchDevice) setHovered(true); }}
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
          borderRadius: 10, padding: "7px 4px", minHeight: 62,
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
        {hovered && !isTouchDevice && (
          <motion.div style={{
            position: "absolute", inset: 0, borderRadius: 13, pointerEvents: "none", zIndex: 3,
            background: `radial-gradient(circle at calc(${gx} + 50%) calc(${gy} + 50%), rgba(255,255,255,0.08) 0%, transparent 68%)`,
          }} />
        )}

        <div style={{
          fontSize: 9, fontWeight: isToday ? 700 : 500, letterSpacing: "0.04em",
          color: isToday ? "#a78bfa" : "rgba(255,255,255,0.42)",
          fontFamily: "'DM Mono', monospace", alignSelf: "flex-start", paddingLeft: 3,
        }}>{day}</div>

        {hasData && pnl != null ? (
          <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: pnl >= 0 ? "#34d399" : "#f87171", letterSpacing: "-0.02em" }}>
            {(() => {
              const abs = Math.abs(pnl);
              const sign = pnl >= 0 ? "+" : "−";
              if (abs >= 1000000) return sign + (abs / 1000000).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + "M";
              if (abs >= 1000) return sign + (abs / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + "K";
              return sign + abs.toLocaleString("de-DE");
            })()}
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
        {hovered && !isTouchDevice && (
          <HoverCard entry={entry} dateStr={`${String(day).padStart(2,"0")}.${String(month+1).padStart(2,"0")}.${year}`} />
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// ─── INPUT MODAL ──────────────────────────────────────────────────────────────
const MOODS = [
  { id: "calm",        emoji: "😌", label: "Ruhig" },
  { id: "nervous",     emoji: "😰", label: "Nervös" },
  { id: "overconf",    emoji: "🤑", label: "Overconfident" },
  { id: "frustrated",  emoji: "😤", label: "Frustriert" },
  { id: "focused",     emoji: "🎯", label: "Fokussiert" },
];

function InputModal({ day, month, year, onClose, user }) {
  const { getDay, saveDay } = usePnL();
  const dateKey = toKey(year, month, day);
  const existing = getDay(dateKey);
  const [pnl, setPnl] = useState(existing?.pnl ?? "");
  const [adherence, setAdherence] = useState(existing?.adherence ?? false);
  const [note, setNote] = useState(existing?.note ?? "");
  const [mood, setMood] = useState(existing?.mood ?? "");
  const [chartUrl, setChartUrl] = useState(existing?.chart_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState("trade"); // trade | journal
  const hasEntry = existing !== null;
  const fileRef = useRef(null);

  const handleSave = async () => {
    setSaving(true);
    await saveDay(dateKey, {
      pnl: pnl === "" ? null : Number(pnl),
      adherence,
      note,
      mood,
      chart_url: chartUrl,
    });
    setSaved(true); setSaving(false);
    setTimeout(onClose, 500);
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await saveDay(dateKey, null);
    onClose();
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${dateKey}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("chart-images")
      .upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("chart-images").getPublicUrl(path);
      setChartUrl(data.publicUrl);
    }
    setUploading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center",
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 500,
          background: "rgba(6,10,30,0.95)", backdropFilter: "blur(40px) saturate(2)",
          WebkitBackdropFilter: "blur(40px) saturate(2)",
          border: "1px solid rgba(255,255,255,0.11)",
          borderRadius: "26px 26px 0 0",
          padding: "20px 22px 32px",
          boxShadow: "0 -12px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)",
          maxHeight: "90vh", overflowY: "auto",
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 18px" }} />

        {/* Header */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", fontFamily: "monospace", marginBottom: 4 }}>TAGESEINTRAG</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "white", fontFamily: "'Playfair Display', serif" }}>
            {day}. {MONTHS[month]} {year}
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 3, marginBottom: 20, gap: 3 }}>
          {[["trade","📈 Trade"],["journal","📝 Tagebuch"]].map(([id, label]) => (
            <motion.button key={id} onClick={() => setTab(id)} whileTap={{ scale: 0.97 }}
              style={{
                flex: 1, padding: "9px 0", borderRadius: 10, border: "none", cursor: "pointer",
                background: tab === id ? "rgba(139,92,246,0.25)" : "transparent",
                color: tab === id ? "#a78bfa" : "rgba(255,255,255,0.35)",
                fontSize: 12, fontWeight: 700, fontFamily: "monospace",
                boxShadow: tab === id ? "inset 0 0 8px rgba(139,92,246,0.15)" : "none",
                transition: "all 0.2s",
              }}>
              {label}
            </motion.button>
          ))}
        </div>

        {/* TRADE TAB */}
        {tab === "trade" && (
          <>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 8 }}>TAGES-PNL (€)</div>
              <input type="number" value={pnl} placeholder="0" onChange={e => setPnl(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 13, padding: "13px 16px",
                  color: pnl === "" ? "rgba(255,255,255,0.25)" : Number(pnl) >= 0 ? "#34d399" : "#f87171",
                  fontSize: 24, fontWeight: 700, fontFamily: "'DM Mono', monospace", outline: "none",
                  transition: "color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.55)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 12 }}>PLAN-ADHERENCE</div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <motion.button onClick={() => setAdherence(v => !v)} whileTap={{ scale: 0.9 }}
                  animate={{ background: adherence ? "linear-gradient(135deg,#059669,#10b981)" : "rgba(255,255,255,0.08)" }}
                  transition={{ type: "spring", stiffness: 500, damping: 24 }}
                  style={{ width: 58, height: 32, borderRadius: 16, border: "none", cursor: "pointer",
                    position: "relative", padding: 0, flexShrink: 0,
                    boxShadow: adherence ? "0 0 18px rgba(16,185,129,0.55)" : "none" }}>
                  <motion.div animate={{ x: adherence ? 28 : 3 }}
                    transition={{ type: "spring", stiffness: 520, damping: 26 }}
                    style={{ position: "absolute", top: 4, width: 24, height: 24, borderRadius: "50%", background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }} />
                </motion.button>
                <motion.span animate={{ color: adherence ? "#10b981" : "rgba(255,255,255,0.3)" }}
                  style={{ fontSize: 14, fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>
                  {adherence ? "Plan befolgt ✓" : "Nicht befolgt"}
                </motion.span>
              </div>
            </div>
          </>
        )}

        {/* JOURNAL TAB */}
        {tab === "journal" && (
          <>
            {/* Mood */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 12 }}>STIMMUNG</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {MOODS.map(m => (
                  <motion.button key={m.id} onClick={() => setMood(v => v === m.id ? "" : m.id)}
                    whileTap={{ scale: 0.9 }}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      padding: "10px 12px", borderRadius: 14, border: "none", cursor: "pointer",
                      background: mood === m.id ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.05)",
                      border: mood === m.id ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.08)",
                      boxShadow: mood === m.id ? "0 0 12px rgba(139,92,246,0.2)" : "none",
                      transition: "all 0.2s",
                    }}>
                    <span style={{ fontSize: 22 }}>{m.emoji}</span>
                    <span style={{ fontSize: 8, color: mood === m.id ? "#a78bfa" : "rgba(255,255,255,0.3)", fontFamily: "monospace", letterSpacing: "0.05em" }}>{m.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 8 }}>NOTIZEN</div>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="Was lief gut? Was lief schlecht? Welche Fehler?"
                rows={4}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 13, padding: "12px 14px",
                  color: "white", fontSize: 13, fontFamily: "monospace",
                  outline: "none", resize: "none", lineHeight: 1.6,
                }}
                onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.5)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.10)"}
              />
            </div>

            {/* Chart photo */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 10 }}>CHART FOTO</div>
              <input type="file" accept="image/*" ref={fileRef} onChange={handlePhotoUpload} style={{ display: "none" }} />
              {chartUrl ? (
                <div style={{ position: "relative" }}>
                  <img src={chartUrl} alt="Chart" style={{ width: "100%", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", maxHeight: 180, objectFit: "cover" }} />
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => setChartUrl("")}
                    style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%",
                      background: "rgba(0,0,0,0.7)", border: "none", color: "white", fontSize: 14, cursor: "pointer" }}>
                    ✕
                  </motion.button>
                </div>
              ) : (
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={{
                    width: "100%", padding: "16px", borderRadius: 14, border: "1px dashed rgba(255,255,255,0.15)",
                    background: "rgba(255,255,255,0.03)", cursor: "pointer",
                    color: "rgba(255,255,255,0.3)", fontSize: 13, fontFamily: "monospace",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}>
                  {uploading ? "⏳ Hochladen..." : "📸 Foto hinzufügen"}
                </motion.button>
              )}
            </div>
          </>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: 13, borderRadius: 13, cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
            color: "rgba(255,255,255,0.45)", fontFamily: "monospace",
          }}>Abbrechen</button>
          <motion.button onClick={handleSave} disabled={saving} whileTap={{ scale: 0.96 }}
            style={{
              flex: 2, padding: 13, borderRadius: 13, border: "none", cursor: saving ? "wait" : "pointer",
              fontSize: 13, fontWeight: 700, fontFamily: "monospace",
              background: saved ? "linear-gradient(135deg,#059669,#10b981)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "white",
              boxShadow: saved ? "0 0 22px rgba(16,185,129,0.45)" : "0 0 16px rgba(99,102,241,0.35)",
              transition: "background 0.4s, box-shadow 0.4s",
            }}>
            {saving ? "Speichern..." : saved ? "✓ Gespeichert" : "Speichern"}
          </motion.button>
        </div>

        {hasEntry && (
          <motion.button onClick={handleDelete} whileTap={{ scale: 0.96 }}
            animate={{ background: confirmDelete ? "rgba(239,68,68,0.2)" : "transparent" }}
            style={{
              width: "100%", marginTop: 8, padding: "11px", borderRadius: 13,
              border: `1px solid ${confirmDelete ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.07)"}`,
              cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "monospace",
              color: confirmDelete ? "#f87171" : "rgba(255,255,255,0.25)",
            }}>
            {confirmDelete ? "⚠ Nochmal tippen zum Bestätigen" : "🗑 Eintrag löschen"}
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── MAIN CALENDAR ─────────────────────────────────────────────────────────────
function Calendar({ yr, mo, setYr, setMo, user }) {
  const { data, loading, saveError } = usePnL();
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
      <div style={{ position: "relative", zIndex: 10, maxWidth: 500, margin: "0 auto", padding: "env(safe-area-inset-top, 20px) 12px 80px" }}>

        {/* Header */}
        <div style={{ paddingTop: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.18em", fontFamily: "monospace" }}>TRADING JOURNAL</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "white", fontFamily: "'Playfair Display', serif", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            {MONTHS[mo]} <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 20 }}>{yr}</span>
          </div>
        </div>

        {/* Header row 2: Stats */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <StatPill label="Monats-PnL" value={fmt(totalPnL) || "—"} color={totalPnL >= 0 ? "#34d399" : "#f87171"} />
          <StatPill label="Disziplin" value={`${adherencePct}%`} color="#a78bfa" />
        </div>

        {/* Month nav with mini target bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <NavBtn onClick={() => navigate(-1)}>‹</NavBtn>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
            {(() => {
              const monthKey = `${yr}-${String(mo+1).padStart(2,"0")}`;
              const savedTarget = Number(localStorage.getItem(`target_${monthKey}`) || 0);
              const pct = savedTarget > 0 ? Math.min(Math.max(totalPnL / savedTarget, 0), 1) : 0;
              const hasPct = savedTarget > 0;
              return (
                <>
                  <div style={{ height: hasPct ? 5 : 1, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                    {hasPct && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct * 100}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        style={{
                          height: "100%", borderRadius: 99,
                          background: pct >= 1
                            ? "linear-gradient(90deg,#059669,#34d399)"
                            : pct >= 0.5
                            ? "linear-gradient(90deg,#d97706,#fbbf24)"
                            : "linear-gradient(90deg,#6366f1,#8b5cf6)",
                          boxShadow: pct >= 1 ? "0 0 6px rgba(52,211,153,0.6)" : "none",
                        }}
                      />
                    )}
                  </div>
                  {hasPct && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>Ziel</span>
                      <span style={{ fontSize: 7, fontFamily: "monospace",
                        color: pct >= 1 ? "#34d399" : pct >= 0.5 ? "#fbbf24" : "#a78bfa" }}>
                        {Math.round(pct * 100)}%
                      </span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          <NavBtn onClick={() => navigate(1)}>›</NavBtn>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 8, color: "rgba(255,255,255,0.22)", fontFamily: "monospace", letterSpacing: "0.05em", padding: "2px 0" }}>{d}</div>
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
              style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}
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
          {[
            { color: "#10b981", label: "Plan befolgt", icon: "dot" },
            { color: "#ef4444", label: "Plan nicht befolgt", icon: "cross" },
            { color: "rgba(255,255,255,0.14)", label: "Keine Daten", icon: "dot" },
          ].map(({ color, label, icon }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {icon === "cross" ? (
                <span style={{ fontSize: 10, color, fontWeight: 700, lineHeight: 1 }}>✕</span>
              ) : (
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: color.startsWith("rgba") ? "none" : `0 0 5px ${color}` }} />
              )}
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", fontFamily: "monospace" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {modalDay !== null && (
          <InputModal day={modalDay} month={mo} year={yr} onClose={() => setModalDay(null)} user={user} />
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
    <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
      padding: "9px 13px", backdropFilter: "blur(14px)", textAlign: "center" }}>
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


// ─── STATS TAB ────────────────────────────────────────────────────────────────
function StatsTab({ yr, mo, setYr, setMo }) {
  const { data } = usePnL();
  const today = new Date();

  // Month entries
  const monthKey = `${yr}-${String(mo+1).padStart(2,"0")}`;
  const monthEntries = Object.entries(data)
    .filter(([k]) => k.startsWith(monthKey))
    .sort(([a],[b]) => a.localeCompare(b));

  const totalPnL = monthEntries.reduce((s,[,v]) => s + (v.pnl||0), 0);
  const adherenceDays = monthEntries.filter(([,v]) => v.adherence).length;
  const winDays = monthEntries.filter(([,v]) => v.pnl > 0).length;
  const lossDays = monthEntries.filter(([,v]) => v.pnl < 0).length;
  const daysInMonth = new Date(yr, mo+1, 0).getDate();
  const [target, setTarget] = useState(() => {
    try { return Number(localStorage.getItem(`target_${monthKey}`) || 0); } catch { return 0; }
  });
  const [editingTarget, setEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState("");

  const saveTarget = () => {
    const val = Number(tempTarget);
    setTarget(val);
    try { localStorage.setItem(`target_${monthKey}`, val); } catch {}
    setEditingTarget(false);
  };

  const progress = target > 0 ? Math.min(totalPnL / target, 1) : 0;
  const progressPct = target > 0 ? Math.round((totalPnL / target) * 100) : 0;

  // Chart data: daily pnl for month
  const chartData = [];
  let cumulative = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${monthKey}-${String(d).padStart(2,"0")}`;
    const entry = data[key];
    const pnl = entry?.pnl || 0;
    cumulative += pnl;
    if (entry) chartData.push({ d, pnl, cumulative, hasData: true });
    else chartData.push({ d, pnl: 0, cumulative, hasData: false });
  }

  const filledData = chartData.filter(p => p.hasData);
  const maxAbs = filledData.length > 0 ? Math.max(...filledData.map(p => Math.abs(p.pnl)), 1) : 1;
  const maxCum = Math.max(...chartData.map(p => Math.abs(p.cumulative)), 1);

  const navigate = (dir) => {
    if (dir === -1) { if (mo === 0) { setMo(11); setYr(y => y-1); } else setMo(m => m-1); }
    else { if (mo === 11) { setMo(0); setYr(y => y+1); } else setMo(m => m+1); }
  };

  const fmtShort = (n) => {
    if (!n) return "0";
    const abs = Math.abs(n);
    const sign = n >= 0 ? "+" : "−";
    if (abs >= 1000000) return sign + (abs/1000000).toFixed(1) + "M";
    if (abs >= 1000) return sign + (abs/1000).toFixed(1) + "K";
    return sign + abs;
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <MeshBackground />
      <div style={{ position: "relative", zIndex: 10, maxWidth: 500, margin: "0 auto", padding: "env(safe-area-inset-top,20px) 14px 100px" }}>

        {/* Header + nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.18em", fontFamily: "monospace" }}>STATISTIKEN</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "white", fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em" }}>
              {MONTHS[mo]} <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 18 }}>{yr}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <NavBtn onClick={() => navigate(-1)}>‹</NavBtn>
            <NavBtn onClick={() => navigate(1)}>›</NavBtn>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          <GlassTile label="Monats-PnL" value={fmtShort(totalPnL) + " €"} color={totalPnL >= 0 ? "#34d399" : "#f87171"} />
          <GlassTile label="Disziplin" value={monthEntries.length > 0 ? `${Math.round(adherenceDays/monthEntries.length*100)}%` : "—"} color="#a78bfa" />
          <GlassTile label="Win-Tage" value={winDays} color="#34d399" />
          <GlassTile label="Loss-Tage" value={lossDays} color="#f87171" />
        </div>

        {/* Monthly Target */}
        <div style={{
          background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20,
          padding: "18px 18px 16px", marginBottom: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", fontFamily: "monospace" }}>MONATSZIEL</div>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setEditingTarget(true); setTempTarget(target || ""); }}
              style={{ fontSize: 10, color: "#a78bfa", background: "none", border: "none", cursor: "pointer", fontFamily: "monospace" }}>
              {target > 0 ? "ÄNDERN" : "SETZEN"}
            </motion.button>
          </div>

          {editingTarget ? (
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input type="number" value={tempTarget} onChange={e => setTempTarget(e.target.value)}
                placeholder="Ziel in €" autoFocus
                style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(139,92,246,0.5)",
                  borderRadius: 10, padding: "10px 12px", color: "white", fontSize: 16,
                  fontFamily: "monospace", outline: "none" }}
              />
              <motion.button whileTap={{ scale: 0.95 }} onClick={saveTarget}
                style={{ padding: "10px 16px", borderRadius: 10, border: "none",
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "monospace" }}>
                OK
              </motion.button>
            </div>
          ) : null}

          {target > 0 ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
                  {fmtShort(totalPnL)} € von {fmtShort(target)} €
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace",
                  color: progressPct >= 100 ? "#34d399" : progressPct >= 50 ? "#fbbf24" : "#f87171" }}>
                  {progressPct}%
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ height: 10, background: "rgba(255,255,255,0.07)", borderRadius: 99, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                  style={{
                    height: "100%", borderRadius: 99,
                    background: progressPct >= 100
                      ? "linear-gradient(90deg,#059669,#34d399)"
                      : progressPct >= 50
                      ? "linear-gradient(90deg,#d97706,#fbbf24)"
                      : "linear-gradient(90deg,#dc2626,#f87171)",
                    boxShadow: progressPct >= 100 ? "0 0 10px rgba(52,211,153,0.5)" : "none",
                  }}
                />
              </div>
              {progressPct >= 100 && (
                <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "#34d399", fontFamily: "monospace" }}>
                  🎯 Ziel erreicht!
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "8px 0", fontSize: 12, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
              Kein Ziel gesetzt
            </div>
          )}
        </div>

        {/* Bar Chart - Daily PnL */}
        <div style={{
          background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20,
          padding: "18px 14px 14px", marginBottom: 16,
        }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 16 }}>TÄGLICHER PNL</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80 }}>
            {Array.from({ length: daysInMonth }, (_, i) => {
              const entry = chartData[i];
              const hasData = entry?.hasData;
              const pnl = entry?.pnl || 0;
              const h = hasData ? Math.max(4, (Math.abs(pnl) / maxAbs) * 72) : 3;
              const isPos = pnl >= 0;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: i * 0.01, duration: 0.4, ease: "easeOut" }}
                    style={{
                      width: "100%", height: h,
                      background: !hasData ? "rgba(255,255,255,0.06)"
                        : isPos ? "linear-gradient(180deg,rgba(52,211,153,0.9),rgba(16,185,129,0.5))"
                        : "linear-gradient(180deg,rgba(248,113,113,0.9),rgba(239,68,68,0.5))",
                      borderRadius: "3px 3px 2px 2px",
                      boxShadow: hasData ? (isPos ? "0 0 4px rgba(52,211,153,0.3)" : "0 0 4px rgba(248,113,113,0.3)") : "none",
                      transformOrigin: "bottom",
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>1</span>
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>{Math.round(daysInMonth/2)}</span>
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>{daysInMonth}</span>
          </div>
        </div>

        {/* Cumulative line chart */}
        <div style={{
          background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20,
          padding: "18px 14px 14px",
        }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 16 }}>KUMULATIVER GEWINN</div>
          <svg width="100%" height="90" viewBox={`0 0 ${daysInMonth} 90`} preserveAspectRatio="none"
            style={{ display: "block", overflow: "visible" }}>
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={totalPnL >= 0 ? "rgba(52,211,153,0.35)" : "rgba(248,113,113,0.35)"} />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </linearGradient>
            </defs>
            {/* Zero line */}
            <line x1={0} y1={45} x2={daysInMonth} y2={45} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
            {/* Area fill */}
            {chartData.length > 1 && (() => {
              const pts = chartData.map((p,i) => {
                const y = 45 - (p.cumulative / maxCum) * 40;
                return `${i},${y}`;
              });
              const area = `M${pts.join("L")}L${daysInMonth-1},45L0,45Z`;
              return <path d={area} fill="url(#lineGrad)" />;
            })()}
            {/* Line */}
            {chartData.length > 1 && (() => {
              const pts = chartData.map((p,i) => {
                const y = 45 - (p.cumulative / maxCum) * 40;
                return `${i},${y}`;
              });
              return <polyline
                points={pts.join(" ")}
                fill="none"
                stroke={totalPnL >= 0 ? "#34d399" : "#f87171"}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />;
            })()}
            {/* End dot */}
            {chartData.length > 0 && (() => {
              const last = chartData[chartData.length - 1];
              const y = 45 - (last.cumulative / maxCum) * 40;
              return <circle cx={daysInMonth-1} cy={y} r="2.5"
                fill={totalPnL >= 0 ? "#34d399" : "#f87171"}
                style={{ filter: `drop-shadow(0 0 4px ${totalPnL >= 0 ? "#34d399" : "#f87171"})` }}
              />;
            })()}
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>0</span>
            <span style={{ fontSize: 9, fontFamily: "monospace", fontWeight: 700,
              color: totalPnL >= 0 ? "#34d399" : "#f87171" }}>{fmtShort(totalPnL)} €</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlassTile({ label, value, color }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16,
      padding: "14px 14px 12px",
    }}>
      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.28)", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: "'DM Mono', monospace", letterSpacing: "-0.02em" }}>{value}</div>
    </div>
  );
}

// ─── PROFILE TAB ──────────────────────────────────────────────────────────────
function ProfileTab({ user, onLogout }) {
  const [changingPw, setChangingPw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const maskedEmail = user.email
    ? user.email.slice(0,3) + "***@" + user.email.split("@")[1]
    : "—";

  const handleChangePw = async () => {
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) setPwMsg("Fehler: " + error.message);
    else { setPwMsg("✓ Passwort geändert!"); setNewPw(""); setChangingPw(false); }
    setTimeout(() => setPwMsg(""), 3000);
  };

  const handleDelete = async () => {
    if (deleteConfirm !== "LÖSCHEN") return;
    await supabase.from("pnl_entries").delete().eq("user_id", user.id);
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <MeshBackground />
      <div style={{ position: "relative", zIndex: 10, maxWidth: 500, margin: "0 auto", padding: "env(safe-area-inset-top,20px) 14px 100px" }}>

        <div style={{ paddingTop: 16, marginBottom: 28 }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.18em", fontFamily: "monospace" }}>KONTO</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "white", fontFamily: "'Playfair Display', serif" }}>Profil</div>
        </div>

        {/* Avatar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, marginBottom: 12,
            boxShadow: "0 0 24px rgba(99,102,241,0.4)",
          }}>📈</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{maskedEmail}</div>
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Change password */}
          <div style={{
            background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, overflow: "hidden",
          }}>
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => setChangingPw(v => !v)}
              style={{
                width: "100%", padding: "18px 20px", background: "none", border: "none",
                display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18 }}>🔑</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "white", fontFamily: "monospace" }}>Passwort ändern</span>
              </div>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 16 }}>{changingPw ? "▲" : "▶"}</span>
            </motion.button>
            <AnimatePresence>
              {changingPw && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ padding: "0 20px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <input type="password" placeholder="Neues Passwort" value={newPw}
                      onChange={e => setNewPw(e.target.value)}
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 10, padding: "12px 14px", color: "white", fontSize: 14,
                        fontFamily: "monospace", outline: "none" }}
                    />
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleChangePw}
                      style={{ padding: "12px", borderRadius: 10, border: "none",
                        background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                        color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "monospace" }}>
                      Speichern
                    </motion.button>
                    {pwMsg && <div style={{ fontSize: 12, color: pwMsg.startsWith("✓") ? "#34d399" : "#f87171", fontFamily: "monospace", textAlign: "center" }}>{pwMsg}</div>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Logout */}
          <motion.button whileTap={{ scale: 0.97 }} onClick={onLogout}
            style={{
              width: "100%", padding: "18px 20px",
              background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20,
              display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
            }}>
            <span style={{ fontSize: 18 }}>🚪</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "white", fontFamily: "monospace" }}>Ausloggen</span>
          </motion.button>

          {/* Delete account */}
          <div style={{
            background: "rgba(239,68,68,0.05)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(239,68,68,0.15)", borderRadius: 20, overflow: "hidden",
          }}>
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => setDeleting(v => !v)}
              style={{
                width: "100%", padding: "18px 20px", background: "none", border: "none",
                display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18 }}>🗑️</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#f87171", fontFamily: "monospace" }}>Konto löschen</span>
              </div>
              <span style={{ color: "rgba(239,68,68,0.4)", fontSize: 16 }}>{deleting ? "▲" : "▶"}</span>
            </motion.button>
            <AnimatePresence>
              {deleting && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ padding: "0 20px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 11, color: "rgba(239,68,68,0.7)", fontFamily: "monospace", lineHeight: 1.6 }}>
                      ⚠ Alle deine Daten werden unwiderruflich gelöscht. Tippe LÖSCHEN zur Bestätigung.
                    </div>
                    <input placeholder="LÖSCHEN" value={deleteConfirm}
                      onChange={e => setDeleteConfirm(e.target.value)}
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
                        borderRadius: 10, padding: "12px 14px", color: "#f87171", fontSize: 14,
                        fontFamily: "monospace", outline: "none" }}
                    />
                    <motion.button whileTap={{ scale: 0.97 }}
                      onClick={handleDelete}
                      disabled={deleteConfirm !== "LÖSCHEN"}
                      style={{ padding: "12px", borderRadius: 10, border: "none",
                        background: deleteConfirm === "LÖSCHEN" ? "linear-gradient(135deg,#dc2626,#ef4444)" : "rgba(239,68,68,0.15)",
                        color: deleteConfirm === "LÖSCHEN" ? "white" : "rgba(239,68,68,0.4)",
                        fontSize: 13, fontWeight: 700, cursor: deleteConfirm === "LÖSCHEN" ? "pointer" : "not-allowed",
                        fontFamily: "monospace" }}>
                      Konto endgültig löschen
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BOTTOM NAV ────────────────────────────────────────────────────────────────
function BottomNav({ tab, setTab }) {
  const tabs = [
    { id: "calendar", icon: "📅", label: "Kalender" },
    { id: "stats",    icon: "📊", label: "Stats" },
    { id: "regeln",   icon: "📋", label: "Regeln" },
    { id: "profile",  icon: "👤", label: "Profil" },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
      padding: "0 16px",
      paddingBottom: "env(safe-area-inset-bottom, 16px)",
    }}>
      <div style={{
        maxWidth: 500, margin: "0 auto 12px",
        background: "rgba(8,12,35,0.85)",
        backdropFilter: "blur(32px) saturate(1.8)",
        WebkitBackdropFilter: "blur(32px) saturate(1.8)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 24,
        display: "flex",
        padding: "8px 8px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)",
      }}>
        {tabs.map(t => (
          <motion.button
            key={t.id}
            onClick={() => setTab(t.id)}
            whileTap={{ scale: 0.9 }}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3, padding: "8px 4px", borderRadius: 16, border: "none", cursor: "pointer",
              background: tab === t.id ? "rgba(139,92,246,0.18)" : "transparent",
              transition: "background 0.2s",
              position: "relative",
            }}
          >
            {tab === t.id && (
              <motion.div
                layoutId="tabIndicator"
                style={{
                  position: "absolute", inset: 0, borderRadius: 16,
                  background: "rgba(139,92,246,0.15)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  boxShadow: "inset 0 0 12px rgba(139,92,246,0.1)",
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <span style={{ fontSize: 20, position: "relative", zIndex: 1 }}>{t.icon}</span>
            <span style={{
              fontSize: 9, fontFamily: "monospace", fontWeight: 600,
              letterSpacing: "0.05em", position: "relative", zIndex: 1,
              color: tab === t.id ? "#a78bfa" : "rgba(255,255,255,0.3)",
              transition: "color 0.2s",
            }}>{t.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}


// ─── REGELWERK TAB ────────────────────────────────────────────────────────────
function RegelnTab({ user }) {
  const today = new Date();
  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());

  const [rules, setRules] = useState([]);
  const [checklist, setChecklist] = useState({});
  const [loading, setLoading] = useState(true);
  const [newRuleTitle, setNewRuleTitle] = useState("");
  const [newRuleDesc, setNewRuleDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // Load rules + today checklist
  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("trading_rules").select("*").eq("user_id", user.id).eq("is_active", true).order("created_at"),
      supabase.from("daily_checklist").select("*").eq("user_id", user.id).eq("date_key", todayKey),
    ]).then(([{ data: rulesData }, { data: checkData }]) => {
      setRules(rulesData || []);
      const map = {};
      (checkData || []).forEach(c => { map[c.rule_id] = c.checked; });
      setChecklist(map);
      setLoading(false);
    });
  }, [user]);

  // Weekly score: last 7 days
  const [weekScore, setWeekScore] = useState(null);
  useEffect(() => {
    if (!user || rules.length === 0) return;
    const keys = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      keys.push(toKey(d.getFullYear(), d.getMonth(), d.getDate()));
    }
    supabase.from("daily_checklist")
      .select("*")
      .eq("user_id", user.id)
      .in("date_key", keys)
      .then(({ data }) => {
        if (!data || data.length === 0) { setWeekScore(0); return; }
        const checked = data.filter(c => c.checked).length;
        const total = rules.length * 7;
        setWeekScore(total > 0 ? Math.round((checked / total) * 100) : 0);
      });
  }, [user, rules]);

  const toggleCheck = async (ruleId) => {
    const newVal = !checklist[ruleId];
    setChecklist(prev => ({ ...prev, [ruleId]: newVal }));
    await supabase.from("daily_checklist").upsert({
      user_id: user.id,
      date_key: todayKey,
      rule_id: ruleId,
      checked: newVal,
    }, { onConflict: "user_id,date_key,rule_id" });
  };

  const addRule = async () => {
    if (!newRuleTitle.trim()) return;
    setAdding(true);
    const { data, error } = await supabase.from("trading_rules").insert({
      user_id: user.id,
      title: newRuleTitle.trim(),
      description: newRuleDesc.trim() || null,
    }).select().single();
    if (!error && data) {
      setRules(prev => [...prev, data]);
      setNewRuleTitle(""); setNewRuleDesc(""); setShowAdd(false);
    }
    setAdding(false);
  };

  const deleteRule = async (id) => {
    await supabase.from("trading_rules").update({ is_active: false }).eq("id", id);
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const checkedToday = rules.filter(r => checklist[r.id]).length;
  const totalRules = rules.length;
  const todayPct = totalRules > 0 ? Math.round((checkedToday / totalRules) * 100) : 0;

  const dayNames = ["So","Mo","Di","Mi","Do","Fr","Sa"];

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <MeshBackground />
      <div style={{ position: "relative", zIndex: 10, maxWidth: 500, margin: "0 auto", padding: "env(safe-area-inset-top,20px) 14px 100px" }}>

        {/* Header */}
        <div style={{ paddingTop: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.18em", fontFamily: "monospace" }}>DISZIPLIN</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "white", fontFamily: "'Playfair Display', serif" }}>Regelwerk</div>
        </div>

        {/* Weekly score */}
        <div style={{
          background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20,
          padding: "18px 18px 16px", marginBottom: 14,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", fontFamily: "monospace" }}>7-TAGE DISZIPLIN-SCORE</div>
            <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace",
              color: weekScore >= 80 ? "#34d399" : weekScore >= 50 ? "#fbbf24" : "#f87171" }}>
              {weekScore !== null ? `${weekScore}%` : "—"}
            </span>
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.07)", borderRadius: 99, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${weekScore || 0}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
              style={{
                height: "100%", borderRadius: 99,
                background: weekScore >= 80
                  ? "linear-gradient(90deg,#059669,#34d399)"
                  : weekScore >= 50
                  ? "linear-gradient(90deg,#d97706,#fbbf24)"
                  : "linear-gradient(90deg,#dc2626,#f87171)",
                boxShadow: weekScore >= 80 ? "0 0 8px rgba(52,211,153,0.5)" : "none",
              }}
            />
          </div>
          {/* Day dots */}
          <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "space-between" }}>
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date(); d.setDate(d.getDate() - (6 - i));
              const isToday = i === 6;
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%",
                    background: isToday ? "#a78bfa" : "rgba(255,255,255,0.12)",
                    boxShadow: isToday ? "0 0 6px rgba(167,139,250,0.6)" : "none" }} />
                  <span style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
                    {dayNames[d.getDay()]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Today checklist */}
        <div style={{
          background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20,
          padding: "18px 18px 14px", marginBottom: 14,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", fontFamily: "monospace" }}>HEUTE CHECKLISTE</div>
            <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700,
              color: todayPct === 100 ? "#34d399" : "rgba(255,255,255,0.4)" }}>
              {checkedToday}/{totalRules}
              {todayPct === 100 && " 🎯"}
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "rgba(255,255,255,0.2)", fontFamily: "monospace", fontSize: 12 }}>Laden...</div>
          ) : rules.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "rgba(255,255,255,0.2)", fontFamily: "monospace", fontSize: 12 }}>
              Noch keine Regeln. Füge deine erste Regel hinzu ↓
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rules.map((rule, i) => {
                const isChecked = !!checklist[rule.id];
                return (
                  <motion.div key={rule.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{ display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px", borderRadius: 14,
                      background: isChecked ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isChecked ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.07)"}`,
                      transition: "all 0.25s",
                    }}>
                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => toggleCheck(rule.id)}
                      style={{
                        width: 26, height: 26, borderRadius: 8, border: "none", cursor: "pointer", flexShrink: 0,
                        background: isChecked ? "linear-gradient(135deg,#059669,#10b981)" : "rgba(255,255,255,0.08)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: isChecked ? "0 0 10px rgba(16,185,129,0.4)" : "none",
                        fontSize: 13, transition: "all 0.2s",
                      }}>
                      {isChecked ? "✓" : ""}
                    </motion.button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isChecked ? "rgba(255,255,255,0.7)" : "white",
                        fontFamily: "monospace", textDecoration: isChecked ? "line-through" : "none",
                        transition: "all 0.2s" }}>{rule.title}</div>
                      {rule.description && (
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2, fontFamily: "monospace" }}>{rule.description}</div>
                      )}
                    </div>
                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => deleteRule(rule.id)}
                      style={{ background: "none", border: "none", cursor: "pointer",
                        color: "rgba(255,255,255,0.15)", fontSize: 14, padding: "4px" }}>
                      ✕
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add rule */}
        <div style={{
          background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20,
          overflow: "hidden",
        }}>
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowAdd(v => !v)}
            style={{
              width: "100%", padding: "16px 18px", background: "none", border: "none",
              display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
            }}>
            <span style={{ fontSize: 18 }}>➕</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "white", fontFamily: "monospace" }}>Neue Regel hinzufügen</span>
            <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>{showAdd ? "▲" : "▶"}</span>
          </motion.button>
          <AnimatePresence>
            {showAdd && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}
              >
                <div style={{ padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    placeholder="Regelname (z.B. Max 2 Trades pro Tag)"
                    value={newRuleTitle} onChange={e => setNewRuleTitle(e.target.value)}
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10, padding: "12px 14px", color: "white", fontSize: 13,
                      fontFamily: "monospace", outline: "none", boxSizing: "border-box", width: "100%" }}
                    onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.5)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                  />
                  <input
                    placeholder="Beschreibung (optional)"
                    value={newRuleDesc} onChange={e => setNewRuleDesc(e.target.value)}
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10, padding: "11px 14px", color: "white", fontSize: 12,
                      fontFamily: "monospace", outline: "none", boxSizing: "border-box", width: "100%" }}
                    onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.5)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                  />
                  <motion.button whileTap={{ scale: 0.97 }} onClick={addRule} disabled={adding || !newRuleTitle.trim()}
                    style={{
                      padding: "12px", borderRadius: 10, border: "none",
                      background: newRuleTitle.trim() ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.05)",
                      color: newRuleTitle.trim() ? "white" : "rgba(255,255,255,0.2)",
                      fontSize: 13, fontWeight: 700, cursor: newRuleTitle.trim() ? "pointer" : "not-allowed",
                      fontFamily: "monospace", transition: "all 0.2s",
                    }}>
                    {adding ? "Speichern..." : "Regel speichern"}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
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

  const [tab, setTab] = useState("calendar");
  const today = new Date();
  const [yr, setYr] = useState(today.getFullYear());
  const [mo, setMo] = useState(today.getMonth());
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
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        html, body { background: #020414; height: 100%; overflow-x: hidden; }
        body { -webkit-font-smoothing: antialiased; overscroll-behavior: none; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        ::placeholder { color: rgba(255,255,255,0.22) !important; }
        @media (max-width: 480px) { #root { padding: 0; } }
      `}</style>
      {!user ? (
        <AuthScreen onAuth={setUser} />
      ) : (
        <PnLProvider user={user}>
          <AnimatePresence mode="wait">
            {tab === "calendar" && (
              <motion.div key="cal" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                <Calendar yr={yr} mo={mo} setYr={setYr} setMo={setMo} user={user} />
              </motion.div>
            )}
            {tab === "stats" && (
              <motion.div key="stats" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.18 }}>
                <StatsTab yr={yr} mo={mo} setYr={setYr} setMo={setMo} />
              </motion.div>
            )}
            {tab === "regeln" && (
              <motion.div key="regeln" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.18 }}>
                <RegelnTab user={user} />
              </motion.div>
            )}
            {tab === "profile" && (
              <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.18 }}>
                <ProfileTab user={user} onLogout={logout} />
              </motion.div>
            )}
          </AnimatePresence>
          <BottomNav tab={tab} setTab={setTab} />
        </PnLProvider>
      )}
    </>
  );
}
