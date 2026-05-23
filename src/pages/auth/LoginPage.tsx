import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, EyeOff, Lock, Mail, Loader2, ChevronDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { mockAuthUsers } from "../../mock/data";
import type { Role } from "../../types";
import { cn } from "../../lib/utils";

const roleLabels: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  account_manager: "Account Manager",
  support_admin: "Support Admin",
  backoffice: "Backoffice",
  auditor: "Auditor / Compliance",
  distributor: "Distributor",
  domain_owner: "Domain Owner",
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showRoleHelper, setShowRoleHelper] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const user = Object.values(mockAuthUsers).find(u => u.email === email);
    if (!user) { setError("Invalid email or password."); setLoading(false); return; }
    login(user);
    navigate("/dashboard");
  };

  const quickLogin = (role: Role) => {
    const user = mockAuthUsers[role];
    setEmail(user.email);
    setPassword("demo1234");
    setShowRoleHelper(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden gradient-bg-mesh">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(201 100% 56% / 0.10) 0%, transparent 70%)", top: "-10%", left: "-10%" }}
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(201 100% 56% / 0.06) 0%, transparent 70%)", bottom: "-10%", right: "-10%" }}
          animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass rounded-2xl p-8 shadow-card border border-border/50">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4"
            >
              <span className="text-2xl font-black text-primary">L</span>
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Letsdoitsmartly</h1>
            <p className="text-muted-foreground text-sm mt-1">Email Solution · Sign in to continue</p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="mb-4 px-3 py-2 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm"
              >{error}</motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 h-11 rounded-lg bg-surface-2 border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 text-sm text-foreground transition-colors" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Password</label>
                <button type="button" onClick={() => navigate("/forgot-password")} className="text-xs text-primary hover:text-primary-glow transition-colors">Forgot password?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type={showPassword ? "text" : "password"} placeholder="••••••••••" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 h-11 rounded-lg bg-surface-2 border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 text-sm text-foreground transition-colors" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full h-11 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold text-sm glow-primary transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border/50">
            <button type="button" onClick={() => setShowRoleHelper(!showRoleHelper)}
              className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors">
              <span className="font-semibold uppercase tracking-wider">Demo — Quick Login</span>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showRoleHelper && "rotate-180")} />
            </button>
            <AnimatePresence>
              {showRoleHelper && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="mt-3 grid grid-cols-2 gap-1.5 overflow-hidden">
                  {(Object.keys(mockAuthUsers) as Role[]).map(role => (
                    <button key={role} onClick={() => quickLogin(role)}
                      className="text-left px-3 py-2 rounded-lg bg-surface-2 hover:bg-primary/10 hover:text-primary border border-border/50 hover:border-primary/30 text-xs font-medium text-muted-foreground transition-all">
                      {roleLabels[role]}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="text-center mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3 h-3" />
          <span>Powered by TechnoDoc Solutions · 256-bit AES Encryption</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
