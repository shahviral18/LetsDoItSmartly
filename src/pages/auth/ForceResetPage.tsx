import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

export default function ForceResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    navigate("/dashboard");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center gradient-bg-mesh">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="w-full max-w-md mx-4">
        <div className="glass rounded-2xl p-8 shadow-card border border-border/50">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-warning/10 border border-warning/20 mb-4">
              <ShieldCheck className="w-6 h-6 text-warning" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Set New Password</h1>
            <p className="text-muted-foreground text-sm mt-1">Your account requires a password reset before continuing.</p>
          </div>
          {error && <div className="mb-4 px-3 py-2 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            {[{ label: "New Password", val: password, set: setPassword }, { label: "Confirm Password", val: confirm, set: setConfirm }].map(({ label, val, set }) => (
              <div key={label} className="space-y-1.5">
                <label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">{label}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type={show ? "text" : "password"} value={val} onChange={e => set(e.target.value)}
                    className="w-full pl-10 pr-10 h-11 rounded-lg bg-surface-2 border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 text-sm text-foreground transition-colors" />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
            <button type="submit" disabled={loading}
              className="w-full h-11 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold text-sm glow-primary transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set Password & Continue"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
