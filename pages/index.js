import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { LANGUAGES, DEFAULT_LANGUAGE } from "../lib/languages";
import { supabase, fetchTodayData } from "../lib/supabase";
import Head from "next/head";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(DEFAULT_LANGUAGE);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [intent, setIntent] = useState("");
  const [ripple, setRipple] = useState(false);
  const [activeTab, setActiveTab] = useState("voice");
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ totalSales: 0, totalExpenses: 0, profit: 0 });
  const [history, setHistory] = useState([]);
  const [mounted, setMounted] = useState(false);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const storedToken = localStorage.getItem("mh_token");
    const storedUser = localStorage.getItem("mh_user");
    if (!storedToken) { router.push("/login"); return; }
    setToken(storedToken);
    setUser(JSON.parse(storedUser));
    loadData(storedToken);
  }, [mounted]);

  const loadData = async (tk) => {
    const { data: { user } } = await supabase.auth.getUser(tk);
    if (!user) { router.push("/login"); return; }
    const data = await fetchTodayData(user.id);
    setSales(data.sales);
    setExpenses(data.expenses);
    setSummary({ totalSales: data.totalSales, totalExpenses: data.totalExpenses, profit: data.profit });
  };

  const refreshData = () => loadData(token);

  const logout = () => {
    localStorage.removeItem("mh_token");
    localStorage.removeItem("mh_user");
    router.push("/login");
  };

  const DEFAULT_UI = {
    logout: "Logout",
    selectLang: "Select Language",
    listening: "Listening...",
    processing: "Processing...",
    holdToSpeak: "Hold to Speak",
    youSaid: "You said",
    exampleCommands: "Example Commands",
    todaySales: "Today's Sales",
    refresh: "Refresh",
    noSales: "No sales yet today",
    useVoiceSale: "Use voice to record a sale",
    total: "Total",
    todayExpenses: "Today's Expenses",
    noExpenses: "No expenses yet today",
    useVoiceExpense: "Use voice to record an expense",
    voiceLog: "Voice Interaction Log",
    noHistory: "No interactions yet",
    startSpeaking: "Start speaking to see your log",
  };

  // `LANGUAGES` currently stores only murf voice + delete keywords.
  // Keep UI labels resilient so build/prerender never crashes.
  const ui = LANGUAGES[selectedLanguage]?.ui ?? DEFAULT_UI;

  const DEFAULT_EXAMPLES = [
    { icon: "🛒", text: '"Aaj 3 kg aloo 90 rupees mein becha"' },
    { icon: "💸", text: '"500 rupees ka tel kharida"' },
    { icon: "🗑️", text: '"Aloo wali sale hatao" / "Tel ka expense delete karo"' },
    { icon: "🧹", text: '"Aaj ki saari sales clear karo"' },
    { icon: "📊", text: '"Aaj ka summary batao"' },
    { icon: "📈", text: '"Is hafte ki report do"' },
    { icon: "👤", text: '"Ramesh ka hisaab batao"' },
  ];

  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Please use Chrome browser for voice input."); return; }
    const recognition = new SR();
    recognition.lang = selectedLanguage;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => { setIsRecording(true); setRipple(true); };
    recognition.onresult = async (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setIsRecording(false);
      setRipple(false);
      await processVoice(text);
    };
    recognition.onerror = () => { setIsRecording(false); setRipple(false); };
    recognition.onend = () => { setIsRecording(false); setRipple(false); };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    setRipple(false);
  };

  const processVoice = async (text) => {
    setIsProcessing(true);
    setReply("");
    setIntent("");
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, languageCode: selectedLanguage, token })
      });
      const data = await res.json();
      if (data.success) {
        setReply(data.reply);
        setIntent(data.intent);
        setHistory(prev => [{
          transcript: text,
          reply: data.reply,
          intent: data.intent,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }, ...prev.slice(0, 9)]);
        if (data.audio) {
          const src = `data:audio/mp3;base64,${data.audio}`;
          if (audioRef.current) { audioRef.current.src = src; audioRef.current.play(); }
        }
        await refreshData();
      } else {
        setReply("Something went wrong. Please try again.");
      }
    } catch (e) {
      setReply("Network error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const intentConfig = {
    RECORD_SALE:      { label: "Sale Recorded",     color: "#4ade80", bg: "rgba(74,222,128,0.10)", icon: "🛒" },
    TRACK_EXPENSE:    { label: "Expense Recorded",   color: "#f87171", bg: "rgba(248,113,113,0.10)", icon: "💸" },
    DELETE_SALE:      { label: "Sale Deleted",       color: "#f87171", bg: "rgba(248,113,113,0.10)", icon: "🗑️" },
    DELETE_EXPENSE:   { label: "Expense Deleted",    color: "#f87171", bg: "rgba(248,113,113,0.10)", icon: "🗑️" },
    CLEAR_SALES:      { label: "Sales Cleared",      color: "#f87171", bg: "rgba(248,113,113,0.10)", icon: "🧹" },
    CLEAR_EXPENSES:   { label: "Expenses Cleared",   color: "#f87171", bg: "rgba(248,113,113,0.10)", icon: "🧹" },
    CUSTOMER_HISTORY: { label: "Customer History",   color: "#c084fc", bg: "rgba(192,132,252,0.10)", icon: "👤" },
    DAILY_SUMMARY:    { label: "Daily Summary",      color: "#fbbf24", bg: "rgba(251,191,36,0.10)",  icon: "📊" },
    VOICE_REPORT:     { label: "Weekly Report",      color: "#60a5fa", bg: "rgba(96,165,250,0.10)",  icon: "📈" },
    UNKNOWN:          { label: "Not understood",     color: "#6b7280", bg: "rgba(107,114,128,0.10)", icon: "❓" }
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const profitColor = summary.profit >= 0 ? "#4ade80" : "#f87171";
  const langExamples = LANGUAGES[selectedLanguage]?.examples ?? DEFAULT_EXAMPLES;

  if (!mounted) return null;

  return (
    <>
      <Head>
        <title>Vyapaar Saathi</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:        #08080f;
          --surface:   #111118;
          --surface2:  #1a1a24;
          --border:    #252535;
          --border2:   #32324a;
          --text:      #e8e8f0;
          --muted:     #6b6b88;
          --faint:     #2a2a3c;
          --green:     #4ade80;
          --green-dim: rgba(74,222,128,0.12);
          --red:       #f87171;
          --red-dim:   rgba(248,113,113,0.12);
          --yellow:    #fbbf24;
          --blue:      #60a5fa;
          --purple:    #c084fc;
          --radius:    14px;
          --radius-sm: 8px;
        }

        body {
          background: var(--bg);
          font-family: 'Inter', sans-serif;
          color: var(--text);
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
        }

        /* ── HEADER ── */
        .header {
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(10px);
        }
        .header-left { display: flex; align-items: center; gap: 10px; }
        .logo-mark {
          width: 32px; height: 32px; border-radius: 9px;
          background: var(--green-dim);
          border: 1px solid rgba(74,222,128,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
        }
        .logo-text {
          font-family: 'Sora', sans-serif;
          font-size: 17px; font-weight: 700;
          color: var(--text);
          letter-spacing: -0.3px;
        }
        .logo-text span { color: var(--green); }
        .header-right { display: flex; align-items: center; gap: 10px; }
        .user-chip {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 5px 12px;
          font-size: 12px;
          color: var(--muted);
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .logout-btn {
          background: var(--faint);
          border: 1px solid var(--border);
          color: var(--muted);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .logout-btn:hover { background: var(--border2); color: var(--text); }

        /* ── SUMMARY BAR ── */
        .summary-bar {
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          padding: 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
        }
        .summary-item {
          text-align: center;
          padding: 14px 8px;
          position: relative;
        }
        .summary-item:not(:last-child)::after {
          content: '';
          position: absolute;
          right: 0; top: 20%; height: 60%;
          width: 1px;
          background: var(--border);
        }
        .summary-value {
          font-family: 'Sora', sans-serif;
          font-size: 20px;
          font-weight: 700;
          line-height: 1;
        }
        .summary-label {
          font-size: 10px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 5px;
          font-weight: 500;
        }

        /* ── TABS ── */
        .tabs {
          display: flex;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 61px;
          z-index: 99;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .tabs::-webkit-scrollbar { display: none; }
        .tab {
          flex: 1;
          min-width: 70px;
          padding: 11px 6px;
          text-align: center;
          font-size: 12px;
          font-weight: 500;
          color: var(--muted);
          cursor: pointer;
          border: none;
          border-bottom: 2px solid transparent;
          background: none;
          font-family: 'Inter', sans-serif;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .tab:hover { color: #9898b8; }
        .tab.active { color: var(--green); border-bottom-color: var(--green); }

        /* ── CONTAINER ── */
        .container { max-width: 500px; margin: 0 auto; padding: 18px 14px 80px; }

        /* ── CARDS ── */
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 18px;
          margin-bottom: 12px;
          transition: border-color 0.2s;
        }
        .card-title {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1.2px;
          color: var(--muted);
          text-transform: uppercase;
          margin-bottom: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        /* ── LANGUAGE GRID ── */
        .lang-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
        .lang-btn {
          padding: 10px 4px 9px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: var(--bg);
          cursor: pointer;
          text-align: center;
          transition: all 0.18s;
          font-family: 'Inter', sans-serif;
        }
        .lang-btn:hover { border-color: var(--border2); background: var(--faint); }
        .lang-btn.active {
          border-color: var(--green);
          background: var(--green-dim);
        }
        .lang-native {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          display: block;
          line-height: 1.2;
        }
        .lang-english { font-size: 10px; color: var(--muted); display: block; margin-top: 3px; }
        .lang-btn.active .lang-native { color: var(--green); }
        .lang-btn.active .lang-english { color: rgba(74,222,128,0.7); }

        /* ── MIC CARD ── */
        .mic-card {
          text-align: center;
          padding: 32px 20px 28px;
          position: relative;
          overflow: hidden;
        }
        .mic-card::before {
          content: '';
          position: absolute;
          top: 0; left: 50%;
          transform: translateX(-50%);
          width: 60%;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--green), transparent);
          opacity: 0.6;
        }
        .mic-bg-glow {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -55%);
          width: 220px; height: 220px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(74,222,128,0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .mic-wrapper {
          position: relative;
          display: inline-block;
          margin-bottom: 20px;
        }
        .ripple {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 120px; height: 120px;
          border-radius: 50%;
          border: 1.5px solid var(--green);
          animation: rippleOut 1.6s ease-out infinite;
          pointer-events: none;
        }
        .ripple2 { animation-delay: 0.55s; opacity: 0.5; }
        .ripple3 { animation-delay: 1.1s; opacity: 0.25; }
        @keyframes rippleOut {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
        }

        .mic-btn {
          width: 100px; height: 100px;
          border-radius: 50%;
          border: 1.5px solid var(--green);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
          transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
          background: var(--green-dim);
          box-shadow: 0 0 0 0 rgba(74,222,128,0.2);
        }
        .mic-btn:not(:disabled):hover {
          transform: scale(1.04);
          box-shadow: 0 0 0 8px rgba(74,222,128,0.08);
        }
        .mic-btn:not(:disabled):active { transform: scale(0.97); }
        .mic-btn.recording {
          border-color: var(--red);
          background: var(--red-dim);
          box-shadow: 0 0 0 8px rgba(248,113,113,0.08);
        }
        .mic-btn.processing {
          border-color: var(--border2);
          background: var(--faint);
          cursor: not-allowed;
        }
        .mic-btn:disabled { cursor: not-allowed; }

        .mic-status {
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 6px;
          letter-spacing: -0.2px;
        }
        .mic-sublabel {
          font-size: 12px;
          color: var(--muted);
        }
        .mic-sublabel strong { color: var(--green); font-weight: 600; }

        /* ── RESPONSE CARD ── */
        .response-card { animation: fadeUp 0.25s ease; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .you-said-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1px;
          color: var(--muted);
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .you-said-text {
          font-size: 14px;
          color: var(--muted);
          font-style: italic;
          margin-bottom: 14px;
          padding-left: 10px;
          border-left: 2px solid var(--border2);
          line-height: 1.5;
        }
        .intent-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 11px;
          border-radius: 20px;
          margin-bottom: 12px;
          letter-spacing: 0.2px;
        }
        .reply-text {
          font-size: 15px;
          color: var(--text);
          line-height: 1.65;
        }

        /* ── DATA TABLES ── */
        .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .data-table th {
          text-align: left;
          padding: 8px 10px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1px;
          color: var(--muted);
          text-transform: uppercase;
          border-bottom: 1px solid var(--border);
        }
        .data-table td {
          padding: 11px 10px;
          border-bottom: 1px solid var(--faint);
          color: var(--text);
          vertical-align: middle;
        }
        .data-table tr:last-child td { border-bottom: none; }
        .data-table tbody tr:hover td { background: var(--surface2); }
        .amt-green { color: var(--green); font-weight: 600; }
        .amt-red   { color: var(--red);   font-weight: 600; }
        .time-pill {
          font-size: 11px;
          color: var(--muted);
          background: var(--faint);
          padding: 2px 8px;
          border-radius: 10px;
          white-space: nowrap;
        }
        .item-name { font-weight: 500; color: var(--text); }
        .qty-text  { color: var(--muted); font-size: 12px; }
        .empty {
          text-align: center;
          padding: 36px 20px;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.7;
        }
        .empty-icon { font-size: 28px; display: block; margin-bottom: 8px; opacity: 0.5; }
        .empty-sub { font-size: 12px; color: var(--faint); margin-top: 4px; }
        .total-row {
          display: flex;
          justify-content: flex-end;
          padding: 10px 10px 0;
          border-top: 1px solid var(--border);
          margin-top: 4px;
          font-size: 13px;
          font-weight: 500;
          color: var(--muted);
          gap: 8px;
          align-items: center;
        }

        /* ── EXAMPLES ── */
        .examples-card { background: var(--bg); }
        .example-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid var(--faint);
          font-size: 13px;
          color: var(--muted);
          line-height: 1.4;
        }
        .example-item:last-child { border-bottom: none; }
        .example-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }

        /* ── HISTORY ── */
        .history-item { padding: 12px 0; border-bottom: 1px solid var(--faint); }
        .history-item:last-child { border-bottom: none; padding-bottom: 0; }
        .history-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; gap: 8px; }
        .history-time { font-size: 11px; color: var(--faint); flex-shrink: 0; }
        .history-reply { font-size: 13px; color: var(--muted); line-height: 1.45; }

        /* ── MISC ── */
        .refresh-btn {
          background: var(--faint);
          border: 1px solid var(--border);
          color: var(--muted);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          transition: all 0.2s;
        }
        .refresh-btn:hover { background: var(--border2); color: var(--text); }

        .footer {
          text-align: center;
          font-size: 11px;
          color: var(--faint);
          margin-top: 20px;
          letter-spacing: 0.5px;
        }
        .footer span { color: var(--muted); }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spinner {
          width: 26px; height: 26px;
          border: 2px solid var(--border2);
          border-top-color: var(--muted);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
      `}</style>

      <audio ref={audioRef} style={{ display: "none" }} />

      {/* HEADER */}
      <div className="header">
        <div className="header-left">
          <div className="logo-mark">🏪</div>
          <div className="logo-text">Vyapaar <span>Saathi</span></div>
        </div>
        <div className="header-right">
          {user && <div className="user-chip">{user.email}</div>}
          <button className="logout-btn" onClick={logout}>{ui.logout}</button>
        </div>
      </div>

      {/* SUMMARY BAR */}
      <div className="summary-bar">
        <div className="summary-item">
          <div className="summary-value" style={{ color: "var(--green)" }}>₹{summary.totalSales}</div>
          <div className="summary-label">Sales</div>
        </div>
        <div className="summary-item">
          <div className="summary-value" style={{ color: "var(--red)" }}>₹{summary.totalExpenses}</div>
          <div className="summary-label">Expenses</div>
        </div>
        <div className="summary-item">
          <div className="summary-value" style={{ color: profitColor }}>₹{summary.profit}</div>
          <div className="summary-label">Profit</div>
        </div>
      </div>

      {/* TABS */}
      <div className="tabs">
        <button className={`tab ${activeTab === "voice" ? "active" : ""}`} onClick={() => setActiveTab("voice")}>🎙️ Voice</button>
        <button className={`tab ${activeTab === "sales" ? "active" : ""}`} onClick={() => setActiveTab("sales")}>🛒 Sales ({sales.length})</button>
        <button className={`tab ${activeTab === "expenses" ? "active" : ""}`} onClick={() => setActiveTab("expenses")}>💸 Expenses ({expenses.length})</button>
        <button className={`tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>🕐 Log</button>
      </div>

      <div className="container">

        {/* ── VOICE TAB ── */}
        {activeTab === "voice" && (
          <>
            {/* Language Selector */}
            <div className="card">
              <div className="card-title">{ui.selectLang}</div>
              <div className="lang-grid">
                {Object.entries(LANGUAGES).map(([code, lang]) => (
                  <button
                    key={code}
                    className={`lang-btn ${selectedLanguage === code ? "active" : ""}`}
                    onClick={() => {
                      setSelectedLanguage(code);
                      setReply("");
                      setTranscript("");
                      setIntent("");
                    }}
                  >
                    <span className="lang-native">{lang.label}</span>
                    <span className="lang-english">{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mic Card */}
            <div className="card mic-card">
              <div className="mic-bg-glow" />
              <div className="mic-wrapper">
                {(isRecording || ripple) && (
                  <>
                    <div className="ripple" />
                    <div className="ripple ripple2" />
                    <div className="ripple ripple3" />
                  </>
                )}
                <button
                  className={`mic-btn ${isRecording ? "recording" : ""} ${isProcessing ? "processing" : ""}`}
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <div className="spinner" />
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <rect x="9" y="2" width="6" height="12" rx="3"
                        fill={isRecording ? "var(--red)" : "var(--green)"} />
                      <path d="M5 10a7 7 0 0 0 14 0"
                        stroke={isRecording ? "var(--red)" : "var(--green)"}
                        strokeWidth="1.8" strokeLinecap="round" />
                      <line x1="12" y1="19" x2="12" y2="22"
                        stroke={isRecording ? "var(--red)" : "var(--green)"}
                        strokeWidth="1.8" strokeLinecap="round" />
                      <line x1="8" y1="22" x2="16" y2="22"
                        stroke={isRecording ? "var(--red)" : "var(--green)"}
                        strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="mic-status">
                {isRecording
                  ? ui.listening
                  : isProcessing
                  ? ui.processing
                  : ui.holdToSpeak}
              </div>
              <div className="mic-sublabel">
                <strong>{LANGUAGES[selectedLanguage]?.label}</strong>
                {" · "}{LANGUAGES[selectedLanguage]?.name}
              </div>
            </div>

            {/* Response */}
            {reply && (
              <div className="card response-card">
                {transcript && (
                  <>
                    <div className="you-said-label">{ui.youSaid}</div>
                    <div className="you-said-text">&ldquo;{transcript}&rdquo;</div>
                  </>
                )}
                {intent && intentConfig[intent] && (
                  <div
                    className="intent-badge"
                    style={{ background: intentConfig[intent].bg, color: intentConfig[intent].color }}
                  >
                    <span style={{ fontSize: 13 }}>{intentConfig[intent].icon}</span>
                    <span>{intentConfig[intent].label}</span>
                  </div>
                )}
                <div className="reply-text">{reply}</div>
              </div>
            )}

            {/* Examples */}
            <div className="card examples-card">
              <div className="card-title">{ui.exampleCommands}</div>
              {langExamples.map((ex, i) => (
                <div key={i} className="example-item">
                  <span className="example-icon">{ex.icon}</span>
                  <span>{ex.text}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── SALES TAB ── */}
        {activeTab === "sales" && (
          <div className="card">
            <div className="card-title">
              {ui.todaySales}
              <button className="refresh-btn" onClick={refreshData}>{ui.refresh}</button>
            </div>
            {sales.length === 0 ? (
              <div className="empty">
                <span className="empty-icon">🛒</span>
                {ui.noSales}
                <div className="empty-sub">{ui.useVoiceSale}</div>
              </div>
            ) : (
              <>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Amount</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((s, i) => (
                      <tr key={i}>
                        <td className="item-name">{s.item}</td>
                        <td className="qty-text">{s.quantity ? `${s.quantity} ${s.unit || ""}`.trim() : "—"}</td>
                        <td className="amt-green">₹{s.amount}</td>
                        <td><span className="time-pill">{formatTime(s.created_at)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="total-row">
                  <span style={{ color: "var(--muted)" }}>{ui.total}:</span>
                  <span className="amt-green" style={{ fontSize: 15 }}>₹{summary.totalSales}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── EXPENSES TAB ── */}
        {activeTab === "expenses" && (
          <div className="card">
            <div className="card-title">
              {ui.todayExpenses}
              <button className="refresh-btn" onClick={refreshData}>{ui.refresh}</button>
            </div>
            {expenses.length === 0 ? (
              <div className="empty">
                <span className="empty-icon">💸</span>
                {ui.noExpenses}
                <div className="empty-sub">{ui.useVoiceExpense}</div>
              </div>
            ) : (
              <>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Amount</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e, i) => (
                      <tr key={i}>
                        <td className="item-name">{e.item}</td>
                        <td className="amt-red">₹{e.amount}</td>
                        <td><span className="time-pill">{formatTime(e.created_at)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="total-row">
                  <span style={{ color: "var(--muted)" }}>{ui.total}:</span>
                  <span className="amt-red" style={{ fontSize: 15 }}>₹{summary.totalExpenses}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === "history" && (
          <div className="card">
            <div className="card-title">{ui.voiceLog}</div>
            {history.length === 0 ? (
              <div className="empty">
                <span className="empty-icon">🕐</span>
                {ui.noHistory}
                <div className="empty-sub">{ui.startSpeaking}</div>
              </div>
            ) : (
              history.map((item, i) => (
                <div key={i} className="history-item">
                  <div className="history-row">
                    <div
                      className="intent-badge"
                      style={{
                        background: intentConfig[item.intent]?.bg || "rgba(107,114,128,0.1)",
                        color: intentConfig[item.intent]?.color || "var(--muted)",
                        fontSize: "11px",
                        padding: "3px 10px"
                      }}
                    >
                      {intentConfig[item.intent]?.icon} {intentConfig[item.intent]?.label || item.intent}
                    </div>
                    <span className="history-time">{item.time}</span>
                  </div>
                  <div className="history-reply">{item.reply}</div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="footer">
          Powered by <span>Groq AI</span> · <span>Murf Falcon</span> · <span>Supabase</span>
        </div>
      </div>
    </>
  );
}