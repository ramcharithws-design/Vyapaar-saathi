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
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("mh_token");
    const storedUser = localStorage.getItem("mh_user");
    if (!storedToken) { router.push("/login"); return; }
    setToken(storedToken);
    setUser(JSON.parse(storedUser));
    loadData(storedToken);
  }, []);

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

  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Please use Chrome browser."); return; }
    const recognition = new SR();
    recognition.lang = selectedLanguage;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => { setIsRecording(true); setRipple(true); };
    recognition.onresult = async (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setIsRecording(false); setRipple(false);
      await processVoice(text);
    };
    recognition.onerror = () => { setIsRecording(false); setRipple(false); };
    recognition.onend = () => { setIsRecording(false); setRipple(false); };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => { recognitionRef.current?.stop(); setIsRecording(false); setRipple(false); };

  const processVoice = async (text) => {
    setIsProcessing(true); setReply(""); setIntent("");
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
        setHistory(prev => [{ transcript: text, reply: data.reply, intent: data.intent, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
        if (data.audio) {
          const src = `data:audio/mp3;base64,${data.audio}`;
          if (audioRef.current) { audioRef.current.src = src; audioRef.current.play(); }
        }
        await refreshData();
      } else { setReply("Kuch galat hua. Dobara try karein."); }
    } catch (e) { setReply("Network error. Please try again."); }
    finally { setIsProcessing(false); }
  };

  const intentConfig = {
    RECORD_SALE: { label: "Sale Recorded", color: "#00ff88", bg: "#00ff8815", icon: "🛒" },
    TRACK_EXPENSE: { label: "Expense Recorded", color: "#ff4466", bg: "#ff446615", icon: "💸" },
    DELETE_SALE: { label: "Sale Deleted", color: "#ff4466", bg: "#ff446615", icon: "🗑️" },
    DELETE_EXPENSE: { label: "Expense Deleted", color: "#ff4466", bg: "#ff446615", icon: "🗑️" },
    CLEAR_SALES: { label: "Sales Cleared", color: "#ff4466", bg: "#ff446615", icon: "🧹" },
    CLEAR_EXPENSES: { label: "Expenses Cleared", color: "#ff4466", bg: "#ff446615", icon: "🧹" },
    CUSTOMER_HISTORY: { label: "Customer History", color: "#aa44ff", bg: "#aa44ff15", icon: "👤" },
    DAILY_SUMMARY: { label: "Daily Summary", color: "#ffcc00", bg: "#ffcc0015", icon: "📊" },
    VOICE_REPORT: { label: "Weekly Report", color: "#4488ff", bg: "#4488ff15", icon: "📈" },
    UNKNOWN: { label: "Unknown", color: "#555570", bg: "#55557015", icon: "❓" }
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <Head>
        <title>Mera Hisaab — आपका व्यापार सहायक</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <audio ref={audioRef} style={{ display: "none" }} />

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0f; font-family: 'DM Sans', sans-serif; color: #f0f0ff; }

        .header {
          background: #16161f;
          border-bottom: 1px solid #2a2a3a;
          padding: 16px 20px;
          display: flex; align-items: center; justify-content: space-between;
          position: sticky; top: 0; z-index: 100;
        }
        .header-left { display: flex; align-items: center; gap: 10px; }
        .logo-dot { width: 8px; height: 8px; border-radius: 50%; background: #00ff88; box-shadow: 0 0 8px #00ff88; }
        .logo-text { font-family: 'Playfair Display', serif; font-size: 20px; }
        .logo-text span { color: #00ff88; }
        .user-info { font-size: 12px; color: #555570; }
        .logout-btn { background: #2a2a3a; border: none; color: #8888aa; padding: 6px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
        .logout-btn:hover { background: #3a3a50; color: #f0f0ff; }

        .summary-bar {
          background: #16161f;
          border-bottom: 1px solid #2a2a3a;
          padding: 12px 20px;
          display: flex; justify-content: space-around;
        }
        .summary-item { text-align: center; }
        .summary-value { font-size: 22px; font-weight: 600; font-family: 'Playfair Display', serif; }
        .summary-value.green { color: #00ff88; text-shadow: 0 0 20px #00ff8840; }
        .summary-value.red { color: #ff4466; text-shadow: 0 0 20px #ff446640; }
        .summary-value.yellow { color: #ffcc00; text-shadow: 0 0 20px #ffcc0040; }
        .summary-label { font-size: 10px; color: #555570; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }

        .tabs {
          display: flex; background: #16161f;
          border-bottom: 1px solid #2a2a3a;
          position: sticky; top: 57px; z-index: 99;
        }
        .tab {
          flex: 1; padding: 12px 8px; text-align: center;
          font-size: 13px; font-weight: 500; color: #555570;
          cursor: pointer; border-bottom: 2px solid transparent;
          background: none; border-top: none; border-left: none; border-right: none;
          font-family: 'DM Sans', sans-serif; transition: all 0.2s;
        }
        .tab:hover { color: #8888aa; }
        .tab.active { color: #00ff88; border-bottom-color: #00ff88; }

        .container { max-width: 500px; margin: 0 auto; padding: 20px 16px 80px; }

        .card {
          background: #16161f; border: 1px solid #2a2a3a;
          border-radius: 16px; padding: 20px; margin-bottom: 14px;
          transition: border-color 0.2s;
        }
        .card:hover { border-color: #3a3a50; }
        .card-title {
          font-size: 10px; font-weight: 600;
          letter-spacing: 1.5px; color: #555570;
          text-transform: uppercase; margin-bottom: 14px;
          display: flex; justify-content: space-between; align-items: center;
        }

        .lang-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .lang-btn {
          padding: 10px 6px; border-radius: 10px;
          border: 1px solid #2a2a3a; background: #0a0a0f;
          cursor: pointer; text-align: center; transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .lang-btn:hover { border-color: #3a3a50; }
        .lang-btn.active { border-color: #00ff88; background: #00ff8810; box-shadow: 0 0 12px #00ff8820; }
        .lang-native { font-size: 14px; font-weight: 600; color: #f0f0ff; display: block; }
        .lang-english { font-size: 11px; color: #555570; display: block; margin-top: 2px; }
        .lang-btn.active .lang-native { color: #00ff88; }

        .mic-card { text-align: center; position: relative; padding: 36px 20px; }
        .mic-glow {
          position: absolute; top: 0; left: 50%; transform: translateX(-50%);
          width: 200px; height: 3px;
          background: linear-gradient(90deg, transparent, #00ff88, transparent);
          border-radius: 0 0 4px 4px;
        }
        .mic-wrapper { position: relative; display: inline-block; margin-bottom: 20px; }
        .ripple {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 130px; height: 130px; border-radius: 50%;
          border: 1px solid #00ff88;
          animation: rippleAnim 1.5s ease-out infinite;
        }
        .ripple2 { animation-delay: 0.6s; border-color: #00ff8860; }
        .ripple3 { animation-delay: 1.2s; border-color: #00ff8830; }
        @keyframes rippleAnim {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
        }
        .mic-btn {
          width: 110px; height: 110px; border-radius: 50%;
          border: 2px solid #00ff88; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          position: relative; z-index: 1; transition: all 0.3s;
          background: radial-gradient(circle, #00ff8820, #0a0a0f);
          box-shadow: 0 0 30px #00ff8830, inset 0 0 30px #00ff8810;
        }
        .mic-btn.recording {
          border-color: #ff4466;
          background: radial-gradient(circle, #ff446620, #0a0a0f);
          box-shadow: 0 0 30px #ff446630, inset 0 0 30px #ff446610;
          transform: scale(1.05);
        }
        .mic-btn.processing { border-color: #555570; background: radial-gradient(circle, #55557020, #0a0a0f); box-shadow: none; }
        .mic-status { font-size: 15px; font-weight: 500; color: #f0f0ff; margin-bottom: 5px; }
        .mic-sublabel { font-size: 12px; color: #555570; }
        .mic-sublabel span { color: #00ff88; }

        .response-card { animation: slideUp 0.3s ease; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .you-said { font-size: 10px; font-weight: 600; letter-spacing: 1.5px; color: #555570; text-transform: uppercase; margin-bottom: 6px; }
        .you-said-text { font-size: 14px; color: #8888aa; font-style: italic; margin-bottom: 14px; padding-left: 8px; border-left: 2px solid #2a2a3a; }
        .intent-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; padding: 5px 12px; border-radius: 20px; margin-bottom: 12px; }
        .reply-text { font-size: 16px; color: #f0f0ff; line-height: 1.6; }

        .history-item { padding: 12px 0; border-bottom: 1px solid #2a2a3a; }
        .history-item:last-child { border-bottom: none; padding-bottom: 0; }
        .history-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
        .history-time { font-size: 11px; color: #333350; }
        .history-reply { font-size: 13px; color: #8888aa; line-height: 1.4; }

        .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .data-table th { text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 600; letter-spacing: 1px; color: #555570; text-transform: uppercase; border-bottom: 1px solid #2a2a3a; }
        .data-table td { padding: 11px 10px; border-bottom: 1px solid #16161f; color: #f0f0ff; vertical-align: middle; }
        .data-table tr:last-child td { border-bottom: none; }
        .data-table tr:hover td { background: #1c1c28; }
        .amt-green { color: #00ff88; font-weight: 600; font-family: 'Playfair Display', serif; }
        .amt-red { color: #ff4466; font-weight: 600; font-family: 'Playfair Display', serif; }
        .time-pill { font-size: 11px; color: #555570; background: #2a2a3a; padding: 2px 8px; border-radius: 8px; }
        .empty { text-align: center; padding: 30px 20px; color: #333350; font-size: 14px; }

        .examples-card { background: #0a0a0f; border: 1px solid #2a2a3a; }
        .example-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #16161f; font-size: 13px; color: #555570; }
        .example-item:last-child { border-bottom: none; }
        .example-item span:first-child { flex-shrink: 0; }

        .footer { text-align: center; font-size: 11px; color: #333350; margin-top: 20px; letter-spacing: 0.5px; }
        .footer span { color: #555570; }

        .refresh-btn { background: #2a2a3a; border: none; color: #8888aa; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .refresh-btn:hover { background: #3a3a50; color: #f0f0ff; }

        .total-row { display: flex; justify-content: flex-end; padding: 10px 10px 0; border-top: 1px solid #2a2a3a; margin-top: 4px; font-size: 13px; font-weight: 500; color: #8888aa; gap: 8px; }
      `}</style>

      <div className="header">
        <div className="header-left">
          <div className="logo-dot" />
          <div className="logo-text">मेरा <span>हिसाब</span></div>
        </div>
        <div style={{ textAlign: "right" }}>
          {user && <div className="user-info" style={{ marginBottom: 4 }}>{user.email}</div>}
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="summary-bar">
        <div className="summary-item">
          <div className="summary-value green">₹{summary.totalSales}</div>
          <div className="summary-label">Sales</div>
        </div>
        <div className="summary-item">
          <div className="summary-value red">₹{summary.totalExpenses}</div>
          <div className="summary-label">Expenses</div>
        </div>
        <div className="summary-item">
          <div className="summary-value yellow">₹{summary.profit}</div>
          <div className="summary-label">Profit</div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === "voice" ? "active" : ""}`} onClick={() => setActiveTab("voice")}>🎙️ Voice</button>
        <button className={`tab ${activeTab === "sales" ? "active" : ""}`} onClick={() => setActiveTab("sales")}>🛒 Sales ({sales.length})</button>
        <button className={`tab ${activeTab === "expenses" ? "active" : ""}`} onClick={() => setActiveTab("expenses")}>💸 Expenses ({expenses.length})</button>
        <button className={`tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>🕐 Log</button>
      </div>

      <div className="container">

        {activeTab === "voice" && (
          <>
            <div className="card">
              <div className="card-title">भाषा चुनें / Select Language</div>
              <div className="lang-grid">
                {Object.entries(LANGUAGES).map(([code, lang]) => (
                  <button key={code} className={`lang-btn ${selectedLanguage === code ? "active" : ""}`} onClick={() => setSelectedLanguage(code)}>
                    <span className="lang-native">{lang.label}</span>
                    <span className="lang-english">{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="card mic-card">
              <div className="mic-glow" />
              <div className="mic-wrapper">
                {(isRecording || ripple) && (<><div className="ripple" /><div className="ripple ripple2" /><div className="ripple ripple3" /></>)}
                <button
                  className={`mic-btn ${isRecording ? "recording" : ""} ${isProcessing ? "processing" : ""}`}
                  onMouseDown={startRecording} onMouseUp={stopRecording}
                  onTouchStart={startRecording} onTouchEnd={stopRecording}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#555570" strokeWidth="2" strokeDasharray="40" strokeDashoffset="10">
                        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                      </circle>
                    </svg>
                  ) : (
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                      <rect x="9" y="2" width="6" height="12" rx="3" fill={isRecording ? "#ff4466" : "#00ff88"}/>
                      <path d="M5 10a7 7 0 0 0 14 0" stroke={isRecording ? "#ff4466" : "#00ff88"} strokeWidth="2" strokeLinecap="round"/>
                      <line x1="12" y1="19" x2="12" y2="22" stroke={isRecording ? "#ff4466" : "#00ff88"} strokeWidth="2" strokeLinecap="round"/>
                      <line x1="8" y1="22" x2="16" y2="22" stroke={isRecording ? "#ff4466" : "#00ff88"} strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>
              </div>
              <div className="mic-status">
                {isRecording ? "🎙️ Sunna raha hoon..." : isProcessing ? "⏳ Samajh raha hoon..." : "Hold to Speak"}
              </div>
              <div className="mic-sublabel"><span>{LANGUAGES[selectedLanguage]?.label}</span> {LANGUAGES[selectedLanguage]?.name}</div>
            </div>

            {reply && (
              <div className="card response-card">
                {transcript && (<><div className="you-said">You said</div><div className="you-said-text">"{transcript}"</div></>)}
                {intent && intentConfig[intent] && (
                  <div className="intent-badge" style={{ background: intentConfig[intent].bg, color: intentConfig[intent].color }}>
                    <span>{intentConfig[intent].icon}</span><span>{intentConfig[intent].label}</span>
                  </div>
                )}
                <div className="reply-text">{reply}</div>
              </div>
            )}

            <div className="card examples-card">
              <div className="card-title">Example Commands</div>
              <div className="example-item"><span>🛒</span><span>"Aaj 3 kg aloo 90 rupees mein becha"</span></div>
              <div className="example-item"><span>💸</span><span>"500 rupees ka tel kharida"</span></div>
              <div className="example-item"><span>🗑️</span><span>"Aloo wali sale hatao" / "Tel ka expense delete karo"</span></div>
              <div className="example-item"><span>🧹</span><span>"Aaj ki saari sales clear karo"</span></div>
              <div className="example-item"><span>📊</span><span>"Aaj ka summary batao"</span></div>
              <div className="example-item"><span>📈</span><span>"Is hafte ki report do"</span></div>
              <div className="example-item"><span>👤</span><span>"Ramesh ka hisaab batao"</span></div>
            </div>
          </>
        )}

        {activeTab === "sales" && (
          <div className="card">
            <div className="card-title">
              Today's Sales
              <button className="refresh-btn" onClick={refreshData}>↻ Refresh</button>
            </div>
            {sales.length === 0 ? (
              <div className="empty">🛒 No sales yet today<br/><span style={{fontSize:12,color:"#333350"}}>Use voice to record a sale</span></div>
            ) : (
              <>
                <table className="data-table">
                  <thead><tr><th>Item</th><th>Qty</th><th>Amount</th><th>Time</th></tr></thead>
                  <tbody>
                    {sales.map((s, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{s.item}</td>
                        <td style={{ color: "#8888aa" }}>{s.quantity ? `${s.quantity} ${s.unit || ""}` : "—"}</td>
                        <td className="amt-green">₹{s.amount}</td>
                        <td><span className="time-pill">{formatTime(s.created_at)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="total-row"><span style={{color:"#555570"}}>Total:</span><span className="amt-green">₹{summary.totalSales}</span></div>
              </>
            )}
          </div>
        )}

        {activeTab === "expenses" && (
          <div className="card">
            <div className="card-title">
              Today's Expenses
              <button className="refresh-btn" onClick={refreshData}>↻ Refresh</button>
            </div>
            {expenses.length === 0 ? (
              <div className="empty">💸 No expenses yet today<br/><span style={{fontSize:12,color:"#333350"}}>Use voice to record an expense</span></div>
            ) : (
              <>
                <table className="data-table">
                  <thead><tr><th>Item</th><th>Amount</th><th>Time</th></tr></thead>
                  <tbody>
                    {expenses.map((e, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{e.item}</td>
                        <td className="amt-red">₹{e.amount}</td>
                        <td><span className="time-pill">{formatTime(e.created_at)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="total-row"><span style={{color:"#555570"}}>Total:</span><span className="amt-red">₹{summary.totalExpenses}</span></div>
              </>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="card">
            <div className="card-title">Voice Interaction Log</div>
            {history.length === 0 ? (
              <div className="empty">🕐 No interactions yet<br/><span style={{fontSize:12,color:"#333350"}}>Start speaking to see your log</span></div>
            ) : (
              history.map((item, i) => (
                <div key={i} className="history-item">
                  <div className="history-row">
                    <div className="intent-badge" style={{ background: intentConfig[item.intent]?.bg || "#55557015", color: intentConfig[item.intent]?.color || "#555570", fontSize: "11px", padding: "3px 10px" }}>
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
          Powered by <span>Groq AI</span> • <span>Murf Falcon</span> • <span>Supabase</span>
        </div>
      </div>
    </>
  );
}
