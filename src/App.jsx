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


// ─── I18N ─────────────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  de: {
    appTitle: "TRADING JOURNAL", calendar: "Kalender", stats: "Stats",
    propfirm: "Prop Firm", profile: "Profil",
    monthlyPnL: "Monats-PnL", discipline: "Disziplin",
    winDays: "Win-Tage", lossDays: "Loss-Tage", avgDay: "Ø Tag",
    bestDay: "Bester Tag", worstDay: "Schlechtester Tag",
    monthlyTarget: "MONATSZIEL", change: "ÄNDERN", set: "SETZEN",
    targetReached: "🎯 Ziel erreicht!", noTarget: "Kein Ziel gesetzt",
    dailyPnL: "TÄGLICHER PNL", cumulativeGain: "KUMULATIVER GEWINN",
    winRate: "WIN RATE", streakRecord: "STREAK REKORD", days: "Tage",
    statistics: "Statistiken", tradeEntry: "TAGESEINTRAG",
    tradePnL: "TAGES-PNL (€)", planAdherence: "PLAN-ADHERENCE",
    planFollowed: "Plan befolgt ✓", notFollowed: "Nicht befolgt",
    mood: "STIMMUNG", notes: "NOTIZEN",
    notesPlaceholder: "Was lief gut? Was lief schlecht? Welche Fehler?",
    cancel: "Abbrechen", save: "Speichern", saving: "Speichern...", saved: "✓ Gespeichert",
    deleteEntry: "🗑 Eintrag löschen", confirmDelete: "⚠ Nochmal tippen zum Bestätigen",
    trade: "📈 Trade", journal: "📝 Tagebuch",
    account: "KONTO", profileTitle: "Profil", passwordChange: "Passwort ändern",
    logout: "Ausloggen", deleteAccount: "Konto löschen",
    deleteWarning: "⚠ Alle deine Daten werden unwiderruflich gelöscht. Tippe LÖSCHEN zur Bestätigung.",
    deleteConfirmWord: "LÖSCHEN", deleteBtn: "Konto endgültig löschen",
    language: "Sprache", newPassword: "Neues Passwort",
    propFirmTitle: "Prop Firm", accounts: "KONTEN", addAccount: "Konto hinzufügen",
    balance: "Kontostand", drawdown: "Max Drawdown", dailyLimit: "Tages-Limit",
    profitTarget: "Profit Ziel", startBalance: "Startkapital",
    drawdownUsed: "Drawdown genutzt", targetProgress: "Ziel Fortschritt",
    danger: "⚠ Gefährlich nah am Limit!", passed: "✅ Ziel erreicht!",
    active: "Aktiv", inactive: "Inaktiv", noAccounts: "Noch keine Konten. Konto hinzufügen ↓",
    firmName: "Firmenname", accountSize: "Kontogröße (€)", maxDrawdown: "Max Drawdown (€)",
    dailyLossLimit: "Tages-Verlust-Limit (€)", profitTargetField: "Profit Ziel (€)",
    currentBalance: "Aktueller Stand (€)", editAccount: "Konto bearbeiten", deleteAcct: "Konto löschen",
    moodCalm: "Ruhig", moodNervous: "Nervös", moodOverconf: "Overconfident",
    moodFrustrated: "Frustriert", moodFocused: "Fokussiert",
  },
  en: {
    appTitle: "TRADING JOURNAL", calendar: "Calendar", stats: "Stats",
    propfirm: "Prop Firm", profile: "Profile",
    monthlyPnL: "Monthly PnL", discipline: "Discipline",
    winDays: "Win Days", lossDays: "Loss Days", avgDay: "Avg Day",
    bestDay: "Best Day", worstDay: "Worst Day",
    monthlyTarget: "MONTHLY TARGET", change: "CHANGE", set: "SET",
    targetReached: "🎯 Target reached!", noTarget: "No target set",
    dailyPnL: "DAILY PNL", cumulativeGain: "CUMULATIVE GAIN",
    winRate: "WIN RATE", streakRecord: "STREAK RECORD", days: "days",
    statistics: "Statistics", tradeEntry: "DAILY ENTRY",
    tradePnL: "DAILY PNL (€)", planAdherence: "PLAN ADHERENCE",
    planFollowed: "Plan followed ✓", notFollowed: "Not followed",
    mood: "MOOD", notes: "NOTES",
    notesPlaceholder: "What went well? What went wrong? What mistakes?",
    cancel: "Cancel", save: "Save", saving: "Saving...", saved: "✓ Saved",
    deleteEntry: "🗑 Delete entry", confirmDelete: "⚠ Tap again to confirm",
    trade: "📈 Trade", journal: "📝 Journal",
    account: "ACCOUNT", profileTitle: "Profile", passwordChange: "Change password",
    logout: "Logout", deleteAccount: "Delete account",
    deleteWarning: "⚠ All your data will be permanently deleted. Type DELETE to confirm.",
    deleteConfirmWord: "DELETE", deleteBtn: "Permanently delete account",
    language: "Language", newPassword: "New password",
    propFirmTitle: "Prop Firm", accounts: "ACCOUNTS", addAccount: "Add account",
    balance: "Balance", drawdown: "Max Drawdown", dailyLimit: "Daily Limit",
    profitTarget: "Profit Target", startBalance: "Starting Balance",
    drawdownUsed: "Drawdown used", targetProgress: "Target progress",
    danger: "⚠ Dangerously close to limit!", passed: "✅ Target reached!",
    active: "Active", inactive: "Inactive", noAccounts: "No accounts yet. Add one below ↓",
    firmName: "Firm name", accountSize: "Account size (€)", maxDrawdown: "Max drawdown (€)",
    dailyLossLimit: "Daily loss limit (€)", profitTargetField: "Profit target (€)",
    currentBalance: "Current balance (€)", editAccount: "Edit account", deleteAcct: "Delete account",
    moodCalm: "Calm", moodNervous: "Nervous", moodOverconf: "Overconfident",
    moodFrustrated: "Frustrated", moodFocused: "Focused",
  },
  fr: {
    appTitle: "JOURNAL DE TRADING", calendar: "Calendrier", stats: "Stats",
    propfirm: "Prop Firm", profile: "Profil",
    monthlyPnL: "PnL Mensuel", discipline: "Discipline",
    winDays: "Jours Gagnants", lossDays: "Jours Perdants", avgDay: "Moy. Jour",
    bestDay: "Meilleur Jour", worstDay: "Pire Jour",
    monthlyTarget: "OBJECTIF MENSUEL", change: "MODIFIER", set: "DÉFINIR",
    targetReached: "🎯 Objectif atteint!", noTarget: "Aucun objectif",
    dailyPnL: "PNL JOURNALIER", cumulativeGain: "GAIN CUMULATIF",
    winRate: "TAUX DE RÉUSSITE", streakRecord: "RECORD DE SÉRIE", days: "jours",
    statistics: "Statistiques", tradeEntry: "ENTRÉE DU JOUR",
    tradePnL: "PNL DU JOUR (€)", planAdherence: "RESPECT DU PLAN",
    planFollowed: "Plan respecté ✓", notFollowed: "Non respecté",
    mood: "HUMEUR", notes: "NOTES",
    notesPlaceholder: "Qu'est-ce qui s'est bien passé? Mal passé? Erreurs?",
    cancel: "Annuler", save: "Enregistrer", saving: "Enregistrement...", saved: "✓ Enregistré",
    deleteEntry: "🗑 Supprimer l'entrée", confirmDelete: "⚠ Appuyer à nouveau pour confirmer",
    trade: "📈 Trade", journal: "📝 Journal",
    account: "COMPTE", profileTitle: "Profil", passwordChange: "Changer le mot de passe",
    logout: "Déconnexion", deleteAccount: "Supprimer le compte",
    deleteWarning: "⚠ Toutes vos données seront supprimées. Tapez SUPPRIMER pour confirmer.",
    deleteConfirmWord: "SUPPRIMER", deleteBtn: "Supprimer définitivement",
    language: "Langue", newPassword: "Nouveau mot de passe",
    propFirmTitle: "Prop Firm", accounts: "COMPTES", addAccount: "Ajouter un compte",
    balance: "Solde", drawdown: "Drawdown Max", dailyLimit: "Limite Journalière",
    profitTarget: "Objectif Profit", startBalance: "Capital de départ",
    drawdownUsed: "Drawdown utilisé", targetProgress: "Progression objectif",
    danger: "⚠ Dangereusement proche de la limite!", passed: "✅ Objectif atteint!",
    active: "Actif", inactive: "Inactif", noAccounts: "Aucun compte. Ajoutez-en un ↓",
    firmName: "Nom de la firme", accountSize: "Taille du compte (€)", maxDrawdown: "Drawdown max (€)",
    dailyLossLimit: "Limite de perte journalière (€)", profitTargetField: "Objectif de profit (€)",
    currentBalance: "Solde actuel (€)", editAccount: "Modifier", deleteAcct: "Supprimer",
    moodCalm: "Calme", moodNervous: "Nerveux", moodOverconf: "Surconfiant",
    moodFrustrated: "Frustré", moodFocused: "Concentré",
  },
  es: {
    appTitle: "DIARIO DE TRADING", calendar: "Calendario", stats: "Stats",
    propfirm: "Prop Firm", profile: "Perfil",
    monthlyPnL: "PnL Mensual", discipline: "Disciplina",
    winDays: "Días Ganadores", lossDays: "Días Perdedores", avgDay: "Prom. Día",
    bestDay: "Mejor Día", worstDay: "Peor Día",
    monthlyTarget: "META MENSUAL", change: "CAMBIAR", set: "FIJAR",
    targetReached: "🎯 ¡Meta alcanzada!", noTarget: "Sin meta",
    dailyPnL: "PNL DIARIO", cumulativeGain: "GANANCIA ACUMULADA",
    winRate: "TASA DE ÉXITO", streakRecord: "RACHA RÉCORD", days: "días",
    statistics: "Estadísticas", tradeEntry: "ENTRADA DEL DÍA",
    tradePnL: "PNL DEL DÍA (€)", planAdherence: "ADHERENCIA AL PLAN",
    planFollowed: "Plan seguido ✓", notFollowed: "No seguido",
    mood: "ESTADO DE ÁNIMO", notes: "NOTAS",
    notesPlaceholder: "¿Qué salió bien? ¿Qué salió mal? ¿Qué errores?",
    cancel: "Cancelar", save: "Guardar", saving: "Guardando...", saved: "✓ Guardado",
    deleteEntry: "🗑 Eliminar entrada", confirmDelete: "⚠ Toca de nuevo para confirmar",
    trade: "📈 Trade", journal: "📝 Diario",
    account: "CUENTA", profileTitle: "Perfil", passwordChange: "Cambiar contraseña",
    logout: "Cerrar sesión", deleteAccount: "Eliminar cuenta",
    deleteWarning: "⚠ Todos tus datos serán eliminados. Escribe ELIMINAR para confirmar.",
    deleteConfirmWord: "ELIMINAR", deleteBtn: "Eliminar cuenta permanentemente",
    language: "Idioma", newPassword: "Nueva contraseña",
    propFirmTitle: "Prop Firm", accounts: "CUENTAS", addAccount: "Agregar cuenta",
    balance: "Saldo", drawdown: "Drawdown Máx", dailyLimit: "Límite Diario",
    profitTarget: "Meta de Ganancia", startBalance: "Capital inicial",
    drawdownUsed: "Drawdown usado", targetProgress: "Progreso meta",
    danger: "⚠ ¡Peligrosamente cerca del límite!", passed: "✅ ¡Meta alcanzada!",
    active: "Activo", inactive: "Inactivo", noAccounts: "Sin cuentas. Agrega una ↓",
    firmName: "Nombre de la firma", accountSize: "Tamaño de cuenta (€)", maxDrawdown: "Drawdown máx (€)",
    dailyLossLimit: "Límite pérdida diaria (€)", profitTargetField: "Meta de ganancia (€)",
    currentBalance: "Saldo actual (€)", editAccount: "Editar", deleteAcct: "Eliminar",
    moodCalm: "Tranquilo", moodNervous: "Nervioso", moodOverconf: "Sobreconfiado",
    moodFrustrated: "Frustrado", moodFocused: "Concentrado",
  },
  hi: {
    appTitle: "ट्रेडिंग जर्नल", calendar: "कैलेंडर", stats: "आँकड़े",
    propfirm: "प्रॉप फर्म", profile: "प्रोफ़ाइल",
    monthlyPnL: "मासिक PnL", discipline: "अनुशासन",
    winDays: "जीत के दिन", lossDays: "हार के दिन", avgDay: "औसत दिन",
    bestDay: "सबसे अच्छा दिन", worstDay: "सबसे बुरा दिन",
    monthlyTarget: "मासिक लक्ष्य", change: "बदलें", set: "सेट करें",
    targetReached: "🎯 लक्ष्य हासिल!", noTarget: "कोई लक्ष्य नहीं",
    dailyPnL: "दैनिक PNL", cumulativeGain: "संचित लाभ",
    winRate: "जीत दर", streakRecord: "सर्वश्रेष्ठ स्ट्रीक", days: "दिन",
    statistics: "आँकड़े", tradeEntry: "दैनिक प्रविष्टि",
    tradePnL: "दैनिक PNL (€)", planAdherence: "योजना पालन",
    planFollowed: "योजना का पालन ✓", notFollowed: "पालन नहीं किया",
    mood: "मनोदशा", notes: "नोट्स",
    notesPlaceholder: "क्या अच्छा रहा? क्या बुरा? क्या गलतियाँ?",
    cancel: "रद्द करें", save: "सहेजें", saving: "सहेज रहे हैं...", saved: "✓ सहेजा गया",
    deleteEntry: "🗑 प्रविष्टि हटाएं", confirmDelete: "⚠ पुष्टि के लिए फिर से टैप करें",
    trade: "📈 ट्रेड", journal: "📝 जर्नल",
    account: "खाता", profileTitle: "प्रोफ़ाइल", passwordChange: "पासवर्ड बदलें",
    logout: "लॉग आउट", deleteAccount: "खाता हटाएं",
    deleteWarning: "⚠ सभी डेटा स्थायी रूप से हटा दिए जाएंगे। DELETE टाइप करें।",
    deleteConfirmWord: "DELETE", deleteBtn: "खाता स्थायी रूप से हटाएं",
    language: "भाषा", newPassword: "नया पासवर्ड",
    propFirmTitle: "प्रॉप फर्म", accounts: "खाते", addAccount: "खाता जोड़ें",
    balance: "शेष राशि", drawdown: "अधिकतम ड्रॉडाउन", dailyLimit: "दैनिक सीमा",
    profitTarget: "लाभ लक्ष्य", startBalance: "प्रारंभिक पूंजी",
    drawdownUsed: "उपयोग किया ड्रॉडाउन", targetProgress: "लक्ष्य प्रगति",
    danger: "⚠ सीमा के खतरनाक रूप से करीब!", passed: "✅ लक्ष्य हासिल!",
    active: "सक्रिय", inactive: "निष्क्रिय", noAccounts: "कोई खाता नहीं। नीचे जोड़ें ↓",
    firmName: "फर्म का नाम", accountSize: "खाता आकार (€)", maxDrawdown: "अधिकतम ड्रॉडाउन (€)",
    dailyLossLimit: "दैनिक हानि सीमा (€)", profitTargetField: "लाभ लक्ष्य (€)",
    currentBalance: "वर्तमान शेष (€)", editAccount: "संपादित करें", deleteAcct: "हटाएं",
    moodCalm: "शांत", moodNervous: "घबराया हुआ", moodOverconf: "अति आत्मविश्वास",
    moodFrustrated: "निराश", moodFocused: "केंद्रित",
  },
  pt: {
    appTitle: "DIÁRIO DE TRADING", calendar: "Calendário", stats: "Estatísticas",
    propfirm: "Prop Firm", profile: "Perfil",
    monthlyPnL: "PnL Mensal", discipline: "Disciplina",
    winDays: "Dias Vencedores", lossDays: "Dias Perdedores", avgDay: "Média Dia",
    bestDay: "Melhor Dia", worstDay: "Pior Dia",
    monthlyTarget: "META MENSAL", change: "ALTERAR", set: "DEFINIR",
    targetReached: "🎯 Meta atingida!", noTarget: "Sem meta definida",
    dailyPnL: "PNL DIÁRIO", cumulativeGain: "GANHO ACUMULADO",
    winRate: "TAXA DE ACERTO", streakRecord: "RECORDE DE SEQUÊNCIA", days: "dias",
    statistics: "Estatísticas", tradeEntry: "ENTRADA DO DIA",
    tradePnL: "PNL DO DIA (€)", planAdherence: "ADESÃO AO PLANO",
    planFollowed: "Plano seguido ✓", notFollowed: "Não seguido",
    mood: "HUMOR", notes: "NOTAS",
    notesPlaceholder: "O que correu bem? Mal? Quais erros?",
    cancel: "Cancelar", save: "Salvar", saving: "Salvando...", saved: "✓ Salvo",
    deleteEntry: "🗑 Excluir entrada", confirmDelete: "⚠ Toque novamente para confirmar",
    trade: "📈 Trade", journal: "📝 Diário",
    account: "CONTA", profileTitle: "Perfil", passwordChange: "Alterar senha",
    logout: "Sair", deleteAccount: "Excluir conta",
    deleteWarning: "⚠ Todos os seus dados serão excluídos. Digite EXCLUIR para confirmar.",
    deleteConfirmWord: "EXCLUIR", deleteBtn: "Excluir conta permanentemente",
    language: "Idioma", newPassword: "Nova senha",
    propFirmTitle: "Prop Firm", accounts: "CONTAS", addAccount: "Adicionar conta",
    balance: "Saldo", drawdown: "Drawdown Máx", dailyLimit: "Limite Diário",
    profitTarget: "Meta de Lucro", startBalance: "Capital inicial",
    drawdownUsed: "Drawdown usado", targetProgress: "Progresso da meta",
    danger: "⚠ Perigosamente perto do limite!", passed: "✅ Meta atingida!",
    active: "Ativo", inactive: "Inativo", noAccounts: "Sem contas. Adicione uma ↓",
    firmName: "Nome da firma", accountSize: "Tamanho da conta (€)", maxDrawdown: "Drawdown máx (€)",
    dailyLossLimit: "Limite de perda diária (€)", profitTargetField: "Meta de lucro (€)",
    currentBalance: "Saldo atual (€)", editAccount: "Editar", deleteAcct: "Excluir",
    moodCalm: "Calmo", moodNervous: "Nervoso", moodOverconf: "Confiante demais",
    moodFrustrated: "Frustrado", moodFocused: "Focado",
  },
};

const LangContext = createContext(null);
function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("pnl_lang") || "de"; } catch { return "de"; }
  });
  const t = TRANSLATIONS[lang] || TRANSLATIONS.de;
  const changeLang = (l) => {
    setLang(l);
    try { localStorage.setItem("pnl_lang", l); } catch {}
  };
  return <LangContext.Provider value={{ lang, t, changeLang }}>{children}</LangContext.Provider>;
}
function useLang() { return useContext(LangContext); }

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

function InputModal({ day, month, year, onClose }) {
  const { getDay, saveDay } = usePnL();
  const { t } = useLang();
  const dateKey = toKey(year, month, day);
  const existing = getDay(dateKey);
  const [pnl, setPnl] = useState(existing?.pnl ?? "");
  const [adherence, setAdherence] = useState(existing?.adherence ?? false);
  const [note, setNote] = useState(existing?.note ?? "");
  const [mood, setMood] = useState(existing?.mood ?? "");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [modalTab, setModalTab] = useState("trade");
  const hasEntry = existing !== null;

  const handleSave = async () => {
    setSaving(true);
    await saveDay(dateKey, { pnl: pnl === "" ? null : Number(pnl), adherence, note, mood });
    setSaved(true); setSaving(false);
    setTimeout(onClose, 500);
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await saveDay(dateKey, null);
    onClose();
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
          background: "rgba(6,10,30,0.97)", backdropFilter: "blur(40px) saturate(2)",
          WebkitBackdropFilter: "blur(40px) saturate(2)",
          border: "1px solid rgba(255,255,255,0.11)",
          borderRadius: "26px 26px 0 0",
          padding: "16px 20px max(env(safe-area-inset-bottom, 24px), 24px)",
          boxShadow: "0 -12px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)",
          maxHeight: "92vh", overflowY: "scroll",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Drag indicator */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)",
          margin: "0 auto 14px", cursor: "grab" }} />


        {/* Header */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", fontFamily: "monospace", marginBottom: 4 }}>TAGESEINTRAG</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "white", fontFamily: "'Playfair Display', serif" }}>
            {day}. {MONTHS[month]} {year}
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 3, marginBottom: 20, gap: 3 }}>
          {[["trade", t.trade],["journal", t.journal]].map(([id, label]) => (
            <motion.button key={id} onClick={() => setModalTab(id)} whileTap={{ scale: 0.97 }}
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
        {modalTab === "trade" && (
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
        {modalTab === "journal" && (
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
  const { t } = useLang();
  const monthKey = `${yr}-${String(mo+1).padStart(2,"0")}`;
  const daysInMonth = new Date(yr, mo+1, 0).getDate();

  const monthEntries = Object.entries(data)
    .filter(([k]) => k.startsWith(monthKey))
    .sort(([a],[b]) => a.localeCompare(b));

  const totalPnL = monthEntries.reduce((s,[,v]) => s+(v.pnl||0), 0);
  const adherenceDays = monthEntries.filter(([,v]) => v.adherence).length;
  const winDays = monthEntries.filter(([,v]) => (v.pnl||0) > 0).length;
  const lossDays = monthEntries.filter(([,v]) => (v.pnl||0) < 0).length;
  const pnlValues = monthEntries.map(([,v]) => v.pnl||0).filter(p => p !== 0);
  const avgDay = pnlValues.length > 0 ? pnlValues.reduce((a,b) => a+b,0)/pnlValues.length : 0;
  const bestDay = pnlValues.length > 0 ? Math.max(...pnlValues) : 0;
  const worstDay = pnlValues.length > 0 ? Math.min(...pnlValues) : 0;
  const winRate = monthEntries.length > 0 ? Math.round(winDays/monthEntries.length*100) : 0;

  // Streak record
  let maxStreak = 0, curStreak = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${monthKey}-${String(d).padStart(2,"0")}`;
    if (data[key]?.adherence) { curStreak++; maxStreak = Math.max(maxStreak, curStreak); }
    else curStreak = 0;
  }

  const [target, setTarget] = useState(() => {
    try { return Number(localStorage.getItem(`target_${monthKey}`) || 0); } catch { return 0; }
  });
  const [editingTarget, setEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState("");

  useEffect(() => {
    try { setTarget(Number(localStorage.getItem(`target_${monthKey}`) || 0)); } catch {}
    setEditingTarget(false);
  }, [monthKey]);

  const saveTarget = () => {
    const val = Number(tempTarget);
    setTarget(val);
    try { localStorage.setItem(`target_${monthKey}`, val); } catch {}
    setEditingTarget(false);
  };

  const progressPct = target > 0 ? Math.round((totalPnL / target) * 100) : 0;

  // Chart data
  const chartData = useMemo(() => {
    const arr = [];
    let cum = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${monthKey}-${String(d).padStart(2,"0")}`;
      const entry = data[key];
      const pnl = entry?.pnl || 0;
      cum += pnl;
      arr.push({ d, pnl, cumulative: cum, hasData: !!entry, adherence: entry?.adherence });
    }
    return arr;
  }, [data, monthKey, daysInMonth]);

  const filledData = chartData.filter(p => p.hasData);
  const maxAbsPnl = filledData.length > 0 ? Math.max(...filledData.map(p => Math.abs(p.pnl)), 1) : 1;
  const allCum = chartData.map(p => p.cumulative);
  const maxCum = Math.max(...allCum.map(Math.abs), 1);
  const minCum = Math.min(...allCum);
  const maxCumRaw = Math.max(...allCum);

  const navigate = (dir) => {
    if (dir === -1) { if (mo === 0) { setMo(11); setYr(y=>y-1); } else setMo(m=>m-1); }
    else { if (mo === 11) { setMo(0); setYr(y=>y+1); } else setMo(m=>m+1); }
  };

  const fmtShort = (n) => {
    if (n === null || n === undefined || isNaN(n)) return "0";
    const abs = Math.abs(n);
    const sign = n >= 0 ? "+" : "−";
    if (abs >= 1000000) return sign + (abs/1000000).toFixed(1) + "M";
    if (abs >= 1000) return sign + (abs/1000).toFixed(1) + "K";
    return sign + Math.round(abs);
  };

  // SVG cumulative line with smooth bezier
  const W = 300, H = 100;
  const cumPoints = chartData.map((p, i) => {
    const x = (i / (daysInMonth - 1)) * W;
    const range = maxCumRaw - minCum || 1;
    const y = H - 10 - ((p.cumulative - minCum) / range) * (H - 20);
    return { x, y, ...p };
  });

  const smoothPath = (pts) => {
    if (pts.length < 2) return "";
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i-1], cur = pts[i];
      const cpx = (prev.x + cur.x) / 2;
      d += ` C${cpx},${prev.y} ${cpx},${cur.y} ${cur.x},${cur.y}`;
    }
    return d;
  };

  const linePath = smoothPath(cumPoints);
  const areaPath = linePath + ` L${cumPoints[cumPoints.length-1].x},${H} L0,${H} Z`;
  const zeroY = H - 10 - ((0 - minCum) / (maxCumRaw - minCum || 1)) * (H - 20);
  const lineColor = totalPnL >= 0 ? "#34d399" : "#f87171";

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <MeshBackground />
      <div style={{ position: "relative", zIndex: 10, maxWidth: 500, margin: "0 auto", padding: "env(safe-area-inset-top,20px) 14px 100px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.18em", fontFamily: "monospace" }}>{t.statistics.toUpperCase()}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "white", fontFamily: "'Playfair Display', serif" }}>
              {MONTHS[mo]} <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 18 }}>{yr}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <NavBtn onClick={() => navigate(-1)}>‹</NavBtn>
            <NavBtn onClick={() => navigate(1)}>›</NavBtn>
          </div>
        </div>

        {/* 6-tile grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          <GlassTile label={t.monthlyPnL} value={fmtShort(totalPnL)+"€"} color={totalPnL>=0?"#34d399":"#f87171"} sub={null} />
          <GlassTile label={t.discipline} value={monthEntries.length>0?`${Math.round(adherenceDays/monthEntries.length*100)}%`:"—"} color="#a78bfa" sub={null} />
          <GlassTile label={t.winRate} value={monthEntries.length>0?`${winRate}%`:"—"} color="#fbbf24" sub={null} />
          <GlassTile label={t.bestDay} value={bestDay!==0?fmtShort(bestDay)+"€":"—"} color="#34d399" sub={null} />
          <GlassTile label={t.worstDay} value={worstDay!==0?fmtShort(worstDay)+"€":"—"} color="#f87171" sub={null} />
          <GlassTile label={t.streakRecord} value={maxStreak>0?`${maxStreak}`:"—"} color="#a78bfa" sub={maxStreak>0?t.days:null} />
        </div>

        {/* Monthly target */}
        <div style={{ background:"rgba(255,255,255,0.04)", backdropFilter:"blur(20px)",
          border:"1px solid rgba(255,255,255,0.09)", borderRadius:20, padding:"16px 18px", marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", letterSpacing:"0.12em", fontFamily:"monospace" }}>{t.monthlyTarget}</div>
            <motion.button whileTap={{ scale:0.9 }} onClick={() => { setEditingTarget(true); setTempTarget(target||""); }}
              style={{ fontSize:9, color:"#a78bfa", background:"none", border:"none", cursor:"pointer", fontFamily:"monospace" }}>
              {target > 0 ? t.change : t.set}
            </motion.button>
          </div>
          {editingTarget && (
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <input type="number" value={tempTarget} onChange={e=>setTempTarget(e.target.value)} autoFocus
                style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(139,92,246,0.5)",
                  borderRadius:10, padding:"10px 12px", color:"white", fontSize:15, fontFamily:"monospace", outline:"none" }} />
              <motion.button whileTap={{ scale:0.95 }} onClick={saveTarget}
                style={{ padding:"10px 16px", borderRadius:10, border:"none",
                  background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"white", fontSize:12, fontWeight:700, cursor:"pointer" }}>OK</motion.button>
            </div>
          )}
          {target > 0 ? (
            <>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontFamily:"monospace" }}>{fmtShort(totalPnL)}€ / {fmtShort(target)}€</span>
                <span style={{ fontSize:11, fontWeight:700, fontFamily:"monospace",
                  color:progressPct>=100?"#34d399":progressPct>=50?"#fbbf24":"#f87171" }}>{progressPct}%</span>
              </div>
              <div style={{ height:8, background:"rgba(255,255,255,0.07)", borderRadius:99, overflow:"hidden" }}>
                <motion.div initial={{ width:0 }} animate={{ width:`${Math.max(0,Math.min(100,progressPct))}%` }}
                  transition={{ duration:1, ease:"easeOut" }}
                  style={{ height:"100%", borderRadius:99,
                    background:progressPct>=100?"linear-gradient(90deg,#059669,#34d399)":progressPct>=50?"linear-gradient(90deg,#d97706,#fbbf24)":"linear-gradient(90deg,#dc2626,#f87171)",
                    boxShadow:progressPct>=100?"0 0 10px rgba(52,211,153,0.5)":"none" }} />
              </div>
              {progressPct>=100 && <div style={{ textAlign:"center",marginTop:6,fontSize:10,color:"#34d399",fontFamily:"monospace" }}>{t.targetReached}</div>}
            </>
          ) : (
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.18)", fontFamily:"monospace", textAlign:"center", padding:"4px 0" }}>{t.noTarget}</div>
          )}
        </div>

        {/* Bar chart - daily PnL with zero line */}
        <div style={{ background:"rgba(255,255,255,0.04)", backdropFilter:"blur(20px)",
          border:"1px solid rgba(255,255,255,0.09)", borderRadius:20, padding:"16px 14px 12px", marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", letterSpacing:"0.12em", fontFamily:"monospace" }}>{t.dailyPnL}</div>
            <div style={{ display:"flex", gap:12 }}>
              <span style={{ fontSize:8, color:"rgba(52,211,153,0.7)", fontFamily:"monospace" }}>▲ {winDays}</span>
              <span style={{ fontSize:8, color:"rgba(248,113,113,0.7)", fontFamily:"monospace" }}>▼ {lossDays}</span>
            </div>
          </div>
          {/* Two-sided bar chart */}
          <div style={{ display:"flex", alignItems:"center", height:100, gap:1.5, position:"relative" }}>
            {/* Zero line */}
            <div style={{ position:"absolute", left:0, right:0, top:"50%", height:1,
              background:"rgba(255,255,255,0.12)", zIndex:1 }} />
            {chartData.map((p, i) => {
              const half = 46;
              const h = p.hasData ? Math.max(3, (Math.abs(p.pnl)/maxAbsPnl)*half) : 2;
              const isPos = p.pnl >= 0;
              const isAdherence = p.adherence;
              return (
                <div key={i} style={{ flex:1, height:"100%", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                  <motion.div
                    initial={{ scaleY:0 }} animate={{ scaleY:1 }}
                    transition={{ delay:i*0.008, duration:0.35, ease:"easeOut" }}
                    style={{
                      position:"absolute",
                      width:"100%",
                      height: h,
                      [isPos ? "bottom" : "top"]: "50%",
                      background: !p.hasData ? "rgba(255,255,255,0.05)"
                        : isPos ? (isAdherence ? "linear-gradient(180deg,rgba(52,211,153,1),rgba(16,185,129,0.6))" : "linear-gradient(180deg,rgba(52,211,153,0.5),rgba(16,185,129,0.3))")
                        : (isAdherence ? "linear-gradient(0deg,rgba(248,113,113,1),rgba(239,68,68,0.6))" : "linear-gradient(0deg,rgba(248,113,113,0.5),rgba(239,68,68,0.3))"),
                      borderRadius: isPos ? "3px 3px 0 0" : "0 0 3px 3px",
                      boxShadow: p.hasData ? (isPos?"0 0 4px rgba(52,211,153,0.25)":"0 0 4px rgba(248,113,113,0.25)") : "none",
                      transformOrigin: isPos ? "bottom" : "top",
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
            <span style={{ fontSize:7, color:"rgba(255,255,255,0.18)", fontFamily:"monospace" }}>1</span>
            <span style={{ fontSize:7, color:"rgba(255,255,255,0.18)", fontFamily:"monospace" }}>{Math.round(daysInMonth/2)}</span>
            <span style={{ fontSize:7, color:"rgba(255,255,255,0.18)", fontFamily:"monospace" }}>{daysInMonth}</span>
          </div>
        </div>

        {/* Cumulative line chart - smooth bezier */}
        <div style={{ background:"rgba(255,255,255,0.04)", backdropFilter:"blur(20px)",
          border:"1px solid rgba(255,255,255,0.09)", borderRadius:20, padding:"16px 14px 12px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", letterSpacing:"0.12em", fontFamily:"monospace" }}>{t.cumulativeGain}</div>
            <span style={{ fontSize:11, fontWeight:700, fontFamily:"monospace", color:lineColor }}>{fmtShort(totalPnL)}€</span>
          </div>
          <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display:"block", overflow:"visible" }}>
            <defs>
              <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={totalPnL>=0?"rgba(52,211,153,0.3)":"rgba(248,113,113,0.3)"} />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            {/* Grid lines */}
            {[0.25,0.5,0.75].map(f => (
              <line key={f} x1={0} y1={H*f} x2={W} y2={H*f} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            ))}
            {/* Zero line */}
            {minCum < 0 && maxCumRaw > 0 && (
              <line x1={0} y1={zeroY} x2={W} y2={zeroY} stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" strokeDasharray="4,4" />
            )}
            {/* Area */}
            {cumPoints.length > 1 && <path d={areaPath} fill="url(#cumGrad)" />}
            {/* Line */}
            {cumPoints.length > 1 && (
              <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2"
                strokeLinejoin="round" strokeLinecap="round" filter="url(#glow)" />
            )}
            {/* Dots at data points */}
            {cumPoints.filter(p => p.hasData).map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="2"
                fill={p.pnl>=0?"#34d399":"#f87171"}
                style={{ filter:`drop-shadow(0 0 3px ${p.pnl>=0?"#34d399":"#f87171"})` }}
              />
            ))}
            {/* End dot larger */}
            {cumPoints.length > 0 && (() => {
              const last = cumPoints[cumPoints.filter(p=>p.hasData).length > 0
                ? cumPoints.map((p,i)=>({...p,i})).filter(p=>p.hasData).slice(-1)[0]?.i ?? cumPoints.length-1
                : cumPoints.length-1];
              if (!last) return null;
              return <circle cx={last.x} cy={last.y} r="4" fill={lineColor}
                style={{ filter:`drop-shadow(0 0 6px ${lineColor})` }} />;
            })()}
          </svg>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
            <span style={{ fontSize:7, color:"rgba(255,255,255,0.18)", fontFamily:"monospace" }}>1. {MONTHS[mo].slice(0,3)}</span>
            <span style={{ fontSize:7, color:"rgba(255,255,255,0.18)", fontFamily:"monospace" }}>{daysInMonth}. {MONTHS[mo].slice(0,3)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}


function GlassTile({ label, value, color, sub }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16,
      padding: "12px 12px 10px",
    }}>
      <div style={{ fontSize: 7, color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: "'DM Mono', monospace", letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", fontFamily: "monospace", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── PROFILE TAB ──────────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: "de", flag: "🇩🇪", name: "Deutsch" },
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "fr", flag: "🇫🇷", name: "Français" },
  { code: "es", flag: "🇪🇸", name: "Español" },
  { code: "hi", flag: "🇮🇳", name: "हिन्दी" },
  { code: "pt", flag: "🇧🇷", name: "Português" },
];

function ProfileTab({ user, onLogout }) {
  const { t, lang, changeLang } = useLang();
  const [changingPw, setChangingPw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showLang, setShowLang] = useState(false);

  const maskedEmail = user.email
    ? user.email.slice(0,3) + "***@" + user.email.split("@")[1]
    : "—";

  const handleChangePw = async () => {
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) setPwMsg("Fehler: " + error.message);
    else { setPwMsg("✓ " + t.saved); setNewPw(""); setChangingPw(false); }
    setTimeout(() => setPwMsg(""), 3000);
  };

  const handleDelete = async () => {
    if (deleteConfirm !== t.deleteConfirmWord) return;
    await supabase.from("pnl_entries").delete().eq("user_id", user.id);
    await supabase.auth.signOut();
    onLogout();
  };

  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <MeshBackground />
      <div style={{ position: "relative", zIndex: 10, maxWidth: 500, margin: "0 auto", padding: "env(safe-area-inset-top,20px) 14px 100px" }}>

        <div style={{ paddingTop: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.18em", fontFamily: "monospace" }}>{t.account}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "white", fontFamily: "'Playfair Display', serif" }}>{t.profileTitle}</div>
        </div>

        {/* Avatar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, marginBottom: 10, boxShadow: "0 0 24px rgba(99,102,241,0.4)" }}>📈</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>{maskedEmail}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Language selector */}
          <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, overflow: "hidden" }}>
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowLang(v => !v)}
              style={{ width: "100%", padding: "16px 20px", background: "none", border: "none",
                display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 20 }}>🌐</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "white", fontFamily: "monospace" }}>{t.language}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13 }}>{currentLang.flag}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{currentLang.name}</span>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>{showLang ? "▲" : "▶"}</span>
              </div>
            </motion.button>
            <AnimatePresence>
              {showLang && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                  <div style={{ padding: "0 16px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {LANGUAGES.map(l => (
                      <motion.button key={l.code} whileTap={{ scale: 0.95 }} onClick={() => { changeLang(l.code); setShowLang(false); }}
                        style={{
                          padding: "10px 12px", borderRadius: 12, border: "none", cursor: "pointer",
                          background: lang === l.code ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.05)",
                          border: lang === l.code ? "1px solid rgba(139,92,246,0.4)" : "1px solid rgba(255,255,255,0.07)",
                          display: "flex", alignItems: "center", gap: 8,
                        }}>
                        <span style={{ fontSize: 18 }}>{l.flag}</span>
                        <span style={{ fontSize: 11, color: lang === l.code ? "#a78bfa" : "rgba(255,255,255,0.5)", fontFamily: "monospace", fontWeight: 600 }}>{l.name}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Change password */}
          <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, overflow: "hidden" }}>
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => setChangingPw(v => !v)}
              style={{ width: "100%", padding: "16px 20px", background: "none", border: "none",
                display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 20 }}>🔑</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "white", fontFamily: "monospace" }}>{t.passwordChange}</span>
              </div>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>{changingPw ? "▲" : "▶"}</span>
            </motion.button>
            <AnimatePresence>
              {changingPw && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                  <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <input type="password" placeholder={t.newPassword} value={newPw} onChange={e => setNewPw(e.target.value)}
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 10, padding: "12px 14px", color: "white", fontSize: 14, fontFamily: "monospace", outline: "none" }} />
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleChangePw}
                      style={{ padding: "12px", borderRadius: 10, border: "none",
                        background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                        color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "monospace" }}>{t.save}</motion.button>
                    {pwMsg && <div style={{ fontSize: 12, color: pwMsg.startsWith("✓") ? "#34d399" : "#f87171", fontFamily: "monospace", textAlign: "center" }}>{pwMsg}</div>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Logout */}
          <motion.button whileTap={{ scale: 0.97 }} onClick={onLogout}
            style={{ width: "100%", padding: "16px 20px", background: "rgba(255,255,255,0.04)",
              backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20,
              display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <span style={{ fontSize: 20 }}>🚪</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "white", fontFamily: "monospace" }}>{t.logout}</span>
          </motion.button>

          {/* Delete account */}
          <div style={{ background: "rgba(239,68,68,0.05)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(239,68,68,0.15)", borderRadius: 20, overflow: "hidden" }}>
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => setDeleting(v => !v)}
              style={{ width: "100%", padding: "16px 20px", background: "none", border: "none",
                display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 20 }}>🗑️</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#f87171", fontFamily: "monospace" }}>{t.deleteAccount}</span>
              </div>
              <span style={{ color: "rgba(239,68,68,0.4)", fontSize: 14 }}>{deleting ? "▲" : "▶"}</span>
            </motion.button>
            <AnimatePresence>
              {deleting && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                  <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 11, color: "rgba(239,68,68,0.7)", fontFamily: "monospace", lineHeight: 1.6 }}>{t.deleteWarning}</div>
                    <input placeholder={t.deleteConfirmWord} value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
                        borderRadius: 10, padding: "12px 14px", color: "#f87171", fontSize: 14, fontFamily: "monospace", outline: "none" }} />
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleDelete}
                      disabled={deleteConfirm !== t.deleteConfirmWord}
                      style={{ padding: "12px", borderRadius: 10, border: "none",
                        background: deleteConfirm === t.deleteConfirmWord ? "linear-gradient(135deg,#dc2626,#ef4444)" : "rgba(239,68,68,0.15)",
                        color: deleteConfirm === t.deleteConfirmWord ? "white" : "rgba(239,68,68,0.4)",
                        fontSize: 13, fontWeight: 700, cursor: deleteConfirm === t.deleteConfirmWord ? "pointer" : "not-allowed",
                        fontFamily: "monospace" }}>{t.deleteBtn}</motion.button>
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
    { id: "propfirm", icon: "🏦", label: "Prop Firm" },
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


// ─── PROP FIRM TAB ────────────────────────────────────────────────────────────
const PROP_FIRMS_DATA = [
  {
    id: "apex",
    name: "Apex Trader Funding",
    emoji: "🦅",
    tagline: "Biggest. Most flexible. Best for scaling.",
    rating: 4.5,
    trustpilot: "4.5/5 (11K+ reviews)",
    difficulty: "Easy",
    diffColor: "#34d399",
    founded: "2021",
    website: "apextraderfunding.com",
    highlight: "No daily drawdown limit",
    payoutSplit: "100% first $25K, then 90/10",
    payoutSpeed: "7-14 days",
    evalSteps: "1-Step",
    maxFunding: "$1.5M (20 accounts)",
    monthly: "$187 (50K)",
    platforms: ["NinjaTrader","Tradovate","Rithmic","WealthCharts","Bookmap"],
    pros: [
      "No daily loss limit — only trailing drawdown",
      "Up to 20 simultaneous accounts",
      "100% of first $25,000 in profits",
      "Frequent 70-80% discount promos",
      "$598M+ paid out to traders",
    ],
    cons: [
      "Higher monthly fee vs Topstep",
      "Payout can take 7-14 days",
      "Dashboard less polished than Topstep",
    ],
    rules: [
      { label: "Drawdown Type", value: "Trailing (no daily limit)", warn: false },
      { label: "Min Trading Days", value: "7 days to pass eval", warn: false },
      { label: "News Trading", value: "Allowed", warn: false },
      { label: "Overnight Holds", value: "Allowed", warn: false },
      { label: "Consistency Rule", value: "None", warn: false },
      { label: "EA / Bots", value: "Allowed", warn: false },
    ],
    bestFor: "Scalers & multi-account traders",
    color: "#f59e0b",
  },
  {
    id: "topstep",
    name: "Topstep",
    emoji: "🏆",
    tagline: "The OG. Best education & dashboard.",
    rating: 4.4,
    trustpilot: "4.4/5 (8K+ reviews)",
    difficulty: "Medium",
    diffColor: "#fbbf24",
    founded: "2012",
    website: "topstep.com",
    highlight: "Best dashboard & education",
    payoutSplit: "100% first $10K, then 90/10",
    payoutSpeed: "5-7 days (daily withdrawals funded)",
    evalSteps: "1-Step",
    maxFunding: "$300K",
    monthly: "$49 (50K)",
    platforms: ["TopstepX (TradingView-based)"],
    pros: [
      "Most established firm (since 2012)",
      "Excellent education & coaching",
      "Beautiful dashboard with P&L calendar",
      "Daily withdrawals once funded",
      "81K+ funded traders",
    ],
    cons: [
      "Day trading only — no overnight holds",
      "Only TopstepX platform (no NinjaTrader)",
      "Daily drawdown limit on funded accounts",
      "Stricter rules overall",
    ],
    rules: [
      { label: "Drawdown Type", value: "EOD trailing → fixed when funded", warn: false },
      { label: "Daily Loss Limit", value: "Yes — strictly enforced", warn: true },
      { label: "Overnight Holds", value: "Not allowed", warn: true },
      { label: "News Trading", value: "Not allowed on funded (2-min buffer)", warn: true },
      { label: "Consistency Rule", value: "None", warn: false },
      { label: "EA / Bots", value: "Allowed", warn: false },
    ],
    bestFor: "Beginners & education seekers",
    color: "#3b82f6",
  },
  {
    id: "lucid",
    name: "Lucid Trading",
    emoji: "⚡",
    tagline: "Fastest growing. Fastest payouts. 2025's breakout star.",
    rating: 4.8,
    trustpilot: "4.8/5 (1K+ reviews)",
    difficulty: "Easy",
    diffColor: "#34d399",
    founded: "2025",
    website: "lucidtrading.com",
    highlight: "Same-day payouts possible",
    payoutSplit: "90/10 (100% first $10K legacy only)",
    payoutSpeed: "Same day – 3 days",
    evalSteps: "1-Step (can pass in 1 day)",
    maxFunding: "$150K",
    monthly: "One-time fee only",
    platforms: ["NinjaTrader","Tradovate","TradingView","Quantower","Sierra Chart","Bookmap"],
    pros: [
      "Fastest payouts in the industry",
      "One-time fee — no monthly subscription",
      "Can pass evaluation in 1 trading day",
      "Highest Trustpilot score for its age",
      "No overnight holds required",
    ],
    cons: [
      "Founded 2025 — youngest & least tested",
      "40% consistency rule on payouts",
      "No overnight/weekend holds on sim-funded",
      "Rules changed frequently in first year",
    ],
    rules: [
      { label: "Drawdown Type", value: "Trailing (EOD on some plans)", warn: false },
      { label: "Daily Loss Limit", value: "Depends on plan (LucidPro: yes)", warn: true },
      { label: "Overnight Holds", value: "Not on sim-funded (only LucidLive)", warn: true },
      { label: "News Trading", value: "Allowed", warn: false },
      { label: "Consistency Rule", value: "40% — big day cap", warn: true },
      { label: "EA / Bots", value: "Allowed", warn: false },
    ],
    bestFor: "Experienced traders who want speed",
    color: "#8b5cf6",
  },
  {
    id: "bulenox",
    name: "Bulenox",
    emoji: "🐂",
    tagline: "Quiet. Reliable. No BS.",
    rating: 4.7,
    trustpilot: "4.7/5 (1.3K+ reviews)",
    difficulty: "Medium",
    diffColor: "#fbbf24",
    founded: "2022",
    website: "bulenox.com",
    highlight: "Dual drawdown option at signup",
    payoutSplit: "90/10 (first $10K free)",
    payoutSpeed: "Weekly (Wednesdays)",
    evalSteps: "1-Step",
    maxFunding: "$2.75M (11 accounts)",
    monthly: "~$145 (50K)",
    platforms: ["NinjaTrader","Tradovate","Quantower","Sierra Chart"],
    pros: [
      "Choose your drawdown type at signup",
      "No surprise rule changes",
      "Scale up to $2.75M",
      "Free NinjaTrader 8 license",
      "Clean, straightforward rules",
    ],
    cons: [
      "40% consistency rule on Master payouts",
      "Weekly payouts only (Wednesdays)",
      "Smaller community, less social proof",
      "3-step process (Eval → Master → Funded)",
    ],
    rules: [
      { label: "Drawdown Type", value: "Option 1: Trailing | Option 2: EOD", warn: false },
      { label: "Daily Loss Limit", value: "Only on Option 2", warn: false },
      { label: "Overnight Holds", value: "Allowed", warn: false },
      { label: "News Trading", value: "Allowed (unlike Topstep)", warn: false },
      { label: "Consistency Rule", value: "40% on Master payout stage", warn: true },
      { label: "EA / Bots", value: "Allowed", warn: false },
    ],
    bestFor: "Self-sufficient traders wanting reliability",
    color: "#ef4444",
  },
  {
    id: "tradeday",
    name: "TradeDay",
    emoji: "📅",
    tagline: "TradingView native. Clean rules.",
    rating: 4.6,
    trustpilot: "4.6/5",
    difficulty: "Easy",
    diffColor: "#34d399",
    founded: "2022",
    website: "tradeday.com",
    highlight: "Native TradingView support",
    payoutSplit: "80/20 → 90/10",
    payoutSpeed: "3-5 days",
    evalSteps: "1-Step",
    maxFunding: "$150K",
    monthly: "~$150 (50K)",
    platforms: ["Tradovate","NinjaTrader 8","TradingView","Jigsaw"],
    pros: [
      "Native TradingView (no bridge needed)",
      "30% consistency rule (eval only — more forgiving)",
      "No time limit on evaluation",
      "Straightforward 1-step process",
    ],
    cons: [
      "Payout split starts at 80/20",
      "No overnight holds on evaluation",
      "Smaller firm vs Apex/Topstep",
    ],
    rules: [
      { label: "Drawdown Type", value: "Trailing", warn: false },
      { label: "Daily Loss Limit", value: "Yes", warn: true },
      { label: "Overnight Holds", value: "Not on evaluation", warn: true },
      { label: "News Trading", value: "Allowed", warn: false },
      { label: "Consistency Rule", value: "30% (eval only — forgiving)", warn: false },
      { label: "EA / Bots", value: "Allowed", warn: false },
    ],
    bestFor: "TradingView traders",
    color: "#06b6d4",
  },
  {
    id: "earn2trade",
    name: "Earn2Trade",
    emoji: "🎓",
    tagline: "Best for beginners. Education-first.",
    rating: 4.3,
    trustpilot: "4.3/5",
    difficulty: "Medium",
    diffColor: "#fbbf24",
    founded: "2018",
    website: "earn2trade.com",
    highlight: "Best educational content",
    payoutSplit: "80/20",
    payoutSpeed: "Weekly",
    evalSteps: "1-Step (Gauntlet Mini)",
    maxFunding: "$200K",
    monthly: "~$150 (50K)",
    platforms: ["NinjaTrader","Tradovate","Quantower"],
    pros: [
      "Excellent learning resources & courses",
      "Gauntlet Mini: shorter eval period",
      "Good for developing traders",
      "Reliable payouts since 2018",
    ],
    cons: [
      "80/20 split — lower than competitors",
      "Stricter rules than Apex",
      "Less flexible on trading styles",
    ],
    rules: [
      { label: "Drawdown Type", value: "EOD trailing", warn: false },
      { label: "Daily Loss Limit", value: "Yes", warn: true },
      { label: "Overnight Holds", value: "Not allowed", warn: true },
      { label: "News Trading", value: "Restricted", warn: true },
      { label: "Consistency Rule", value: "None", warn: false },
      { label: "EA / Bots", value: "Allowed", warn: false },
    ],
    bestFor: "Beginners who want to learn",
    color: "#10b981",
  },
  {
    id: "mff",
    name: "MyFundedFutures",
    emoji: "💼",
    tagline: "Real capital. Real trades.",
    rating: 4.1,
    trustpilot: "4.1/5",
    difficulty: "Hard",
    diffColor: "#f87171",
    founded: "2023",
    website: "myfundedfutures.com",
    highlight: "Real capital (not simulated)",
    payoutSplit: "80% → 90%",
    payoutSpeed: "3-5 days",
    evalSteps: "1 or 2-Step",
    maxFunding: "$200K",
    monthly: "$149 (50K)",
    platforms: ["NinjaTrader","Tradovate"],
    pros: [
      "Real capital — not simulated accounts",
      "Psychological edge for some traders",
      "1-step or 2-step options",
      "Competitive pricing",
    ],
    cons: [
      "Payout complaints increased in 2024-25",
      "Tighter rules & harder to get funded",
      "40% consistency rule",
      "Less transparent than newer firms",
    ],
    rules: [
      { label: "Drawdown Type", value: "EOD trailing", warn: false },
      { label: "Daily Loss Limit", value: "Yes", warn: true },
      { label: "Overnight Holds", value: "Restricted", warn: true },
      { label: "News Trading", value: "Restricted", warn: true },
      { label: "Consistency Rule", value: "40%", warn: true },
      { label: "EA / Bots", value: "Case by case", warn: true },
    ],
    bestFor: "Traders who want real capital",
    color: "#a78bfa",
  },
  {
    id: "takeprofittrader",
    name: "TakeProfitTrader",
    emoji: "🎯",
    tagline: "Veteran-run. Consistent. Trusted.",
    rating: 4.5,
    trustpilot: "4.5/5",
    difficulty: "Medium",
    diffColor: "#fbbf24",
    founded: "2021",
    website: "takeprofittrader.com",
    highlight: "No consistency rule",
    payoutSplit: "80/20",
    payoutSpeed: "5-7 days",
    evalSteps: "1-Step",
    maxFunding: "$150K",
    monthly: "~$170 (50K)",
    platforms: ["NinjaTrader","Tradovate","Rithmic"],
    pros: [
      "No consistency rule at all",
      "Veteran-owned, very stable",
      "No daily drawdown limit",
      "Simple, clean rules",
    ],
    cons: [
      "80/20 split — lower than top competitors",
      "No overnight holds",
      "Slower payouts than Lucid",
    ],
    rules: [
      { label: "Drawdown Type", value: "Trailing (no daily limit)", warn: false },
      { label: "Daily Loss Limit", value: "None", warn: false },
      { label: "Overnight Holds", value: "Not allowed", warn: true },
      { label: "News Trading", value: "Allowed", warn: false },
      { label: "Consistency Rule", value: "None — biggest advantage", warn: false },
      { label: "EA / Bots", value: "Allowed", warn: false },
    ],
    bestFor: "Traders who hate consistency rules",
    color: "#f59e0b",
  },
  {
    id: "tradeify",
    name: "Tradeify",
    emoji: "🔥",
    tagline: "Rising star. 90/10 on live capital.",
    rating: 4.6,
    trustpilot: "4.6/5",
    difficulty: "Easy",
    diffColor: "#34d399",
    founded: "2024",
    website: "tradeify.com",
    highlight: "90/10 on live funded account",
    payoutSplit: "90/10 on live capital",
    payoutSpeed: "3-5 days",
    evalSteps: "1-Step",
    maxFunding: "$150K",
    monthly: "One-time fee",
    platforms: ["NinjaTrader","Tradovate","Rithmic"],
    pros: [
      "90/10 maintained on live capital (rare)",
      "One-time fee only",
      "Simple, trader-friendly rules",
      "Fast growing, high trust score",
    ],
    cons: [
      "Founded 2024 — still young",
      "Smaller community than Apex/Topstep",
      "No overnight holds on evaluation",
    ],
    rules: [
      { label: "Drawdown Type", value: "EOD trailing", warn: false },
      { label: "Daily Loss Limit", value: "Yes", warn: true },
      { label: "Overnight Holds", value: "Evaluation: No | Funded: Yes", warn: false },
      { label: "News Trading", value: "Allowed", warn: false },
      { label: "Consistency Rule", value: "None on funded", warn: false },
      { label: "EA / Bots", value: "Allowed", warn: false },
    ],
    bestFor: "Traders wanting best live split",
    color: "#ec4899",
  },
  {
    id: "alphafutures",
    name: "Alpha Futures",
    emoji: "🌟",
    tagline: "Highest Trustpilot. Most forgiving drawdown.",
    rating: 4.9,
    trustpilot: "4.9/5 (3.6K+ reviews)",
    difficulty: "Easy",
    diffColor: "#34d399",
    founded: "2023",
    website: "alphafutures.com",
    highlight: "Highest-rated on Trustpilot",
    payoutSplit: "90/10",
    payoutSpeed: "48 business hours",
    evalSteps: "1-Step",
    maxFunding: "$200K",
    monthly: "One-time fee",
    platforms: ["NinjaTrader","Tradovate","TradingView","Rithmic"],
    pros: [
      "4.9/5 Trustpilot — industry's highest",
      "48-hour payouts",
      "Zero consistency rule on qualified accounts",
      "Zero news restrictions on Advanced plan",
      "Most forgiving drawdown structure",
    ],
    cons: [
      "Less well-known than Apex/Topstep",
      "Newer firm (2023)",
      "Smaller community",
    ],
    rules: [
      { label: "Drawdown Type", value: "EOD trailing (very forgiving)", warn: false },
      { label: "Daily Loss Limit", value: "Depends on plan", warn: false },
      { label: "Overnight Holds", value: "Allowed on Advanced plan", warn: false },
      { label: "News Trading", value: "Allowed on Advanced plan", warn: false },
      { label: "Consistency Rule", value: "None on qualified accounts", warn: false },
      { label: "EA / Bots", value: "Allowed", warn: false },
    ],
    bestFor: "Traders wanting maximum flexibility",
    color: "#fbbf24",
  },
];

function StarRating({ rating }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%",
          background: i <= Math.round(rating) ? "#fbbf24" : "rgba(255,255,255,0.12)",
          boxShadow: i <= Math.round(rating) ? "0 0 4px rgba(251,191,36,0.5)" : "none",
        }} />
      ))}
      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontFamily: "monospace", marginLeft: 3 }}>{rating}</span>
    </div>
  );
}

function PropFirmCard({ firm, isExpanded, onToggle }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(20px)",
        border: `1px solid ${isExpanded ? firm.color + "55" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: isExpanded ? `0 0 24px ${firm.color}18` : "none",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}
    >
      {/* Header — always visible */}
      <motion.button whileTap={{ scale: 0.99 }} onClick={onToggle}
        style={{ width: "100%", padding: "16px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: `linear-gradient(135deg, ${firm.color}33, ${firm.color}11)`,
            border: `1px solid ${firm.color}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22,
          }}>{firm.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "white", fontFamily: "'Playfair Display', serif" }}>{firm.name}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", marginTop: 2 }}>{firm.tagline}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
              <StarRating rating={firm.rating} />
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>{firm.trustpilot}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <span style={{
              fontSize: 9, fontFamily: "monospace", fontWeight: 700, padding: "3px 8px", borderRadius: 6,
              background: `${firm.diffColor}22`, color: firm.diffColor,
              border: `1px solid ${firm.diffColor}44`,
            }}>{firm.difficulty}</span>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>{isExpanded ? "▲" : "▶"}</span>
          </div>
        </div>
      </motion.button>

      {/* Expanded detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Key stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "PAYOUT SPLIT", value: firm.payoutSplit },
                  { label: "PAYOUT SPEED", value: firm.payoutSpeed },
                  { label: "EVAL STEPS", value: firm.evalSteps },
                  { label: "MAX FUNDING", value: firm.maxFunding },
                  { label: "MONTHLY FEE", value: firm.monthly },
                  { label: "FOUNDED", value: firm.founded },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "10px 12px",
                    border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 7, color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "white", fontFamily: "monospace", lineHeight: 1.3 }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Highlight badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                background: `${firm.color}15`, borderRadius: 12, border: `1px solid ${firm.color}33` }}>
                <span style={{ fontSize: 16 }}>⭐</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: firm.color, fontFamily: "monospace" }}>{firm.highlight}</span>
              </div>

              {/* Rules table */}
              <div>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.28)", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 8 }}>KEY RULES</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {firm.rules.map((rule, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 12px", borderRadius: 10,
                      background: rule.warn ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${rule.warn ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.05)"}` }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{rule.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "monospace",
                        color: rule.warn ? "#f87171" : "#34d399" }}>{rule.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pros & Cons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 8, color: "#34d399", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>✓ PROS</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {firm.pros.map((p, i) => (
                      <div key={i} style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontFamily: "monospace", lineHeight: 1.4,
                        paddingLeft: 8, borderLeft: "2px solid rgba(52,211,153,0.3)" }}>{p}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 8, color: "#f87171", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>✗ CONS</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {firm.cons.map((c, i) => (
                      <div key={i} style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontFamily: "monospace", lineHeight: 1.4,
                        paddingLeft: 8, borderLeft: "2px solid rgba(248,113,113,0.3)" }}>{c}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Best for */}
              <div style={{ textAlign: "center", padding: "10px", background: `${firm.color}11`,
                borderRadius: 12, border: `1px solid ${firm.color}33` }}>
                <span style={{ fontSize: 10, color: firm.color, fontFamily: "monospace", fontWeight: 700 }}>
                  🎯 Best for: {firm.bestFor}
                </span>
              </div>

              {/* Platforms */}
              <div>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>PLATFORMS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {firm.platforms.map(p => (
                    <span key={p} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 6, fontFamily: "monospace",
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.5)" }}>{p}</span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PropFirmTab() {
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState("all"); // all | easy | medium | hard

  const filtered = filter === "all" ? PROP_FIRMS_DATA
    : PROP_FIRMS_DATA.filter(f => f.difficulty.toLowerCase() === filter);

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <MeshBackground />
      <div style={{ position: "relative", zIndex: 10, maxWidth: 500, margin: "0 auto", padding: "env(safe-area-inset-top,20px) 14px 100px" }}>

        {/* Header */}
        <div style={{ paddingTop: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.18em", fontFamily: "monospace" }}>FUTURES</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "white", fontFamily: "'Playfair Display', serif" }}>Prop Firms</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginTop: 4 }}>
            Top 10 Futures Prop Firms — Rules, Pros & Cons
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[["all","Alle"],["easy","Easy"],["medium","Medium"],["hard","Hard"]].map(([v,l]) => (
            <motion.button key={v} whileTap={{ scale: 0.93 }} onClick={() => setFilter(v)}
              style={{
                padding: "6px 12px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 10, fontFamily: "monospace", fontWeight: 600,
                background: filter === v ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.05)",
                color: filter === v ? "white" : "rgba(255,255,255,0.35)",
                border: filter === v ? "none" : "1px solid rgba(255,255,255,0.08)",
                boxShadow: filter === v ? "0 0 12px rgba(99,102,241,0.3)" : "none",
              }}>{l}</motion.button>
          ))}
        </div>

        {/* Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(firm => (
            <PropFirmCard
              key={firm.id}
              firm={firm}
              isExpanded={expanded === firm.id}
              onToggle={() => setExpanded(expanded === firm.id ? null : firm.id)}
            />
          ))}
        </div>

        {/* Disclaimer */}
        <div style={{ marginTop: 20, padding: "12px 16px", background: "rgba(255,255,255,0.03)",
          borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "monospace", lineHeight: 1.6, textAlign: "center" }}>
            ⚠ Rules & pricing change frequently. Always verify on the firm's official website before signing up. Data based on research as of May 2026.
          </div>
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
        <LangProvider>
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
            {tab === "propfirm" && (
              <motion.div key="propfirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.18 }}>
                <PropFirmTab />
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
        </LangProvider>
      )}
    </>
  );
}
