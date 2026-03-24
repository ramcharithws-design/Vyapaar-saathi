import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function Login() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isLogin ? "login" : "signup",
          email, password, name
        })
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      if (data.session) {
        localStorage.setItem("mh_token", data.session.access_token);
        localStorage.setItem("mh_user", JSON.stringify(data.user));
        router.push("/");
      } else {
        setError("Check your email to confirm your account.");
      }
    } catch (e) {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Vyapaar Saathi — Login</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0f; font-family: 'DM Sans', sans-serif; color: #f0f0ff; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .page { width: 100%; max-width: 420px; padding: 24px 16px; }
        .logo { text-align: center; margin-bottom: 40px; }
        .logo h1 { font-family: 'Playfair Display', serif; font-size: 40px; color: #f0f0ff; }
        .logo h1 span { color: #00ff88; }
        .logo p { color: #555570; font-size: 13px; margin-top: 6px; letter-spacing: 0.5px; }
        .card { background: #16161f; border: 1px solid #2a2a3a; border-radius: 20px; padding: 32px 28px; }
        .card-title { font-size: 20px; font-weight: 600; margin-bottom: 6px; }
        .card-sub { font-size: 13px; color: #555570; margin-bottom: 28px; }
        .field { margin-bottom: 16px; }
        .field label { font-size: 12px; color: #8888aa; font-weight: 500; letter-spacing: 0.5px; display: block; margin-bottom: 6px; text-transform: uppercase; }
        .field input {
          width: 100%; padding: 12px 16px;
          background: #0a0a0f; border: 1px solid #2a2a3a;
          border-radius: 10px; color: #f0f0ff; font-size: 14px;
          font-family: 'DM Sans', sans-serif; outline: none;
          transition: border-color 0.2s;
        }
        .field input:focus { border-color: #00ff88; }
        .field input::placeholder { color: #333350; }
        .btn {
          width: 100%; padding: 14px;
          background: #00ff88; color: #0a0a0f;
          border: none; border-radius: 10px;
          font-size: 15px; font-weight: 600;
          cursor: pointer; margin-top: 8px;
          font-family: 'DM Sans', sans-serif;
          transition: opacity 0.2s;
        }
        .btn:hover { opacity: 0.9; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .error { background: #ff446620; border: 1px solid #ff446640; color: #ff4466; font-size: 13px; padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; }
        .toggle { text-align: center; margin-top: 20px; font-size: 13px; color: #555570; }
        .toggle button { background: none; border: none; color: #00ff88; cursor: pointer; font-size: 13px; font-family: 'DM Sans', sans-serif; font-weight: 500; }
        .divider { width: 40px; height: 2px; background: linear-gradient(90deg, transparent, #00ff88, transparent); margin: 12px auto; }
      `}</style>

      <div className="page">
        <div className="logo">
          <h1>Vyapaar <span>Saathi</span></h1>
          <div className="divider" />
          <p>आपका डिजिटल व्यापार सहायक</p>
        </div>

        <div className="card">
          <div className="card-title">{isLogin ? "Welcome back!" : "Create account"}</div>
          <div className="card-sub">{isLogin ? "Login to manage your business" : "Start managing your business by voice"}</div>

          {error && <div className="error">{error}</div>}

          {!isLogin && (
            <div className="field">
              <label>Your Name</label>
              <input type="text" placeholder="Ram Kumar" value={name} onChange={e => setName(e.target.value)} />
            </div>
          )}

          <div className="field">
            <label>Email</label>
            <input type="email" placeholder="ram@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div className="field">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </div>

          <button className="btn" onClick={handleSubmit} disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Login →" : "Create Account →"}
          </button>

          <div className="toggle">
            {isLogin ? "New here? " : "Already have account? "}
            <button onClick={() => { setIsLogin(!isLogin); setError(""); }}>
              {isLogin ? "Create account" : "Login"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
