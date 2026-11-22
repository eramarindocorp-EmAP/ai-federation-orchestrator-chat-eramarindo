"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { validatePasswordChange } from "@/lib/auth/password-validation";

type Mode = "direct" | "broadcast" | "sequential_review";
type Message = {
  id: string;
  sender: string;
  text: string;
  time: string;
  kind: "user" | "agent" | "system";
  status?: string;
};
type ProviderState = { configured: boolean; registered: boolean; enabled: boolean; provider: string; name: string };

const agents = [
  { id: "chatgpt-primary", name: "Ferguson · ChatGPT", role: "OpenAI API · Strategic coordination", initials: "F", enabled: true },
  { id: "gemini-primary", name: "Gemini", role: "Google · Research & multimodal", initials: "G", enabled: true },
  { id: "deepseek-primary", name: "DeepSeek", role: "DeepSeek · Technical reasoning", initials: "DS", enabled: true },
  { id: "claude-primary", name: "Claude", role: "Anthropic · Planned adapter", initials: "C", enabled: false },
  { id: "microsoft-copilot", name: "Microsoft Copilot", role: "Microsoft · Product integration review", initials: "M", enabled: false },
  { id: "github-copilot", name: "GitHub Copilot", role: "GitHub · Product integration review", initials: "GH", enabled: false }
] as const;

const agentNames: Record<string, string> = Object.fromEntries(agents.map((agent) => [agent.id, agent.name]));
const STORAGE_KEY = "eramarindo-ai-federation-active-conversation";

function timeLabel(value?: string) {
  if (!value) return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export default function Home() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordResetComplete, setPasswordResetComplete] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "FEDERATION SYSTEM",
      text: "Selamat datang di ERAMARINDO AI FEDERATION. Silakan masuk menggunakan akun Development yang terdaftar. Seluruh komunikasi model dijalankan melalui FM-001 authorization gateway.",
      time: "SYSTEM",
      kind: "system"
    }
  ]);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<Mode>("broadcast");
  const [selected, setSelected] = useState<string[]>(["chatgpt-primary", "gemini-primary", "deepseek-primary"]);
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [providerStates, setProviderStates] = useState<Record<string, ProviderState>>({});
  const [authorizationStatus, setAuthorizationStatus] = useState<"checking" | "ready" | "pending" | "unavailable">("checking");
  const [workspaceStatus, setWorkspaceStatus] = useState("Menunggu autentikasi");

  const selectedNames = useMemo(
    () => agents.filter((agent) => selected.includes(agent.id)).map((agent) => agent.name),
    [selected]
  );
  const selectedReady = selected.length > 0 && selected.every((id) => providerStates[id]?.enabled === true);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setAuthLoading(false);

        const params = new URLSearchParams(window.location.search);
        if (params.get("auth") === "recovery") {
          if (data.session) {
            setAuthMode("reset");
            setEmail(data.session.user.email ?? "");
          } else {
            setAuthError("Tautan pemulihan tidak valid atau sudah kedaluwarsa. Minta tautan pemulihan yang baru.");
          }
        }
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);

      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("reset");
        setPassword("");
        setPasswordConfirmation("");
        setPasswordResetComplete(false);
        setEmail(nextSession?.user.email ?? "");
        setAuthError("");
        setAuthMessage("Tautan pemulihan terverifikasi. Silakan buat password baru.");
        return;
      }

      setAuthError("");
      if (event === "SIGNED_OUT") {
        setAuthMode("login");
        setPasswordResetComplete(false);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) setConversationId(saved);
  }, []);

  const callApi = useCallback(async (body: Record<string, unknown>) => {
    if (!session?.access_token) throw new Error("Session tidak tersedia. Silakan masuk kembali.");
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify(body),
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  }, [session]);

  useEffect(() => {
    if (!session) {
      setAuthorizationStatus("checking");
      setWorkspaceStatus("Menunggu autentikasi");
      setProviderStates({});
      return;
    }
    let active = true;
    setWorkspaceStatus("Memeriksa otorisasi FM-001…");
    callApi({ action: "status" }).then(({ response, data }) => {
      if (!active) return;
      if (response.status === 403 || data.status === "authorization_pending") {
        setAuthorizationStatus("pending");
        setWorkspaceStatus("Akun menunggu provisioning principal");
        return;
      }
      if (!response.ok) {
        setAuthorizationStatus("unavailable");
        setWorkspaceStatus("Layanan belum siap");
        return;
      }
      const next: Record<string, ProviderState> = {};
      for (const item of Array.isArray(data.providers) ? data.providers : []) {
        next[item.agentId] = item as ProviderState;
      }
      setProviderStates(next);
      setAuthorizationStatus("ready");
      setWorkspaceStatus("FM-001 authorized · Development");
    }).catch(() => {
      if (active) {
        setAuthorizationStatus("unavailable");
        setWorkspaceStatus("Gateway tidak dapat dijangkau");
      }
    });
    return () => { active = false; };
  }, [session, callApi]);

  useEffect(() => {
    if (!supabase || !session || !conversationId) return;
    window.localStorage.setItem(STORAGE_KEY, conversationId);
    let active = true;

    callApi({ action: "history", conversationId }).then(({ response, data }) => {
      if (!active || !response.ok || !Array.isArray(data.messages)) return;
      const loaded: Message[] = data.messages.map((item: Record<string, unknown>) => {
        const senderType = String(item.sender_type ?? "system");
        const senderId = String(item.sender_id ?? "");
        return {
          id: String(item.message_id),
          sender: senderType === "human" ? "YOU" : senderType === "agent" ? (agentNames[senderId] ?? senderId) : "FEDERATION SYSTEM",
          text: String(item.content ?? ""),
          time: timeLabel(String(item.created_at ?? "")),
          kind: senderType === "human" ? "user" : senderType === "agent" ? "agent" : "system",
          status: String(item.status ?? "")
        };
      });
      if (loaded.length) setMessages(loaded);
    }).catch(() => undefined);

    return () => { active = false; };
  // The history load is intentionally keyed to the authenticated conversation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, session?.access_token, conversationId, callApi]);

  useEffect(() => {
    if (!supabase || !session || !conversationId) return;
    void supabase.realtime.setAuth(session.access_token);
    const channel = supabase
      .channel(`federation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ai_federation_messages",
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const id = String(row.message_id ?? "");
          if (!id) return;
          const senderType = String(row.sender_type ?? "system");
          const senderId = String(row.sender_id ?? "");
          const nextMessage: Message = {
            id,
            sender: senderType === "human" ? "YOU" : senderType === "agent" ? (agentNames[senderId] ?? senderId) : "FEDERATION SYSTEM",
            text: String(row.content ?? ""),
            time: timeLabel(String(row.created_at ?? "")),
            kind: senderType === "human" ? "user" : senderType === "agent" ? "agent" : "system",
            status: String(row.status ?? "")
          };
          setMessages((current) => current.some((message) => message.id === id) ? current : [...current, nextMessage]);
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, session, conversationId]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setAuthError("");
    setAuthMessage("");
    setBusy(true);
    try {
      if (authMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setAuthMessage("Berhasil masuk. Memeriksa akses Federation…");
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (!data.session) {
          setAuthMessage("Pendaftaran diterima. Periksa email untuk menyelesaikan verifikasi, kemudian masuk.");
        } else {
          setAuthMessage("Akun dibuat. Akses Federation menunggu provisioning administrator.");
        }
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Autentikasi gagal.");
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setAuthError("");
    setAuthMessage("");
    setBusy(true);
    try {
      const redirectUrl = new URL("/", window.location.origin);
      redirectUrl.searchParams.set("auth", "recovery");
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl.toString()
      });
      if (error) throw error;

      // Keep the response generic so the screen does not disclose whether an email exists.
      setAuthMessage("Jika alamat email tersebut terdaftar, tautan pemulihan telah dikirim. Periksa Inbox dan Spam.");
    } catch {
      setAuthError("Permintaan reset belum dapat diproses. Coba kembali beberapa saat lagi atau hubungi administrator.");
    } finally {
      setBusy(false);
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setAuthError("");
    setAuthMessage("");
    setBusy(true);
    try {
      const validationError = validatePasswordChange(password, passwordConfirmation);
      if (validationError) throw new Error(validationError);

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setPassword("");
      setPasswordConfirmation("");
      setPasswordResetComplete(true);
      setAuthMessage("Password berhasil diperbarui. Anda dapat melanjutkan ke Federation.");
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete("auth");
      window.history.replaceState({}, document.title, `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Password belum dapat diperbarui. Periksa tautan pemulihan dan coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setConversationId(null);
    window.localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
  }

  function toggleAgent(id: string) {
    const agent = agents.find((item) => item.id === id);
    if (!agent?.enabled) return;
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function sendMessage() {
    const text = draft.trim();
    if (!text || busy || !session) return;
    if (authorizationStatus !== "ready") {
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        sender: "FERGUSON · ACCESS CONTROL",
        text: authorizationStatus === "pending"
          ? "Akun ini belum mendapat principal dan scope chat:write pada FM-001 Development. Minta administrator memprovision akun Anda sebelum mengirim instruksi."
          : "Otorisasi belum siap. Periksa koneksi Supabase dan FM-001 Gateway.",
        time: timeLabel(),
        kind: "system",
        status: authorizationStatus
      }]);
      return;
    }
    if (!selectedReady) {
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        sender: "FERGUSON · PROVIDER CONTROL",
        text: "Model yang dipilih belum aktif. Lengkapi API key dan model ID, lakukan pengujian, lalu aktifkan agent dan REST connection di FM-001 Development.",
        time: timeLabel(),
        kind: "system",
        status: "agent_not_activated"
      }]);
      return;
    }
    if (mode === "direct" && selected.length !== 1) {
      setMessages((current) => [...current, {
        id: crypto.randomUUID(), sender: "FEDERATION SYSTEM",
        text: "Mode Direct memerlukan tepat satu AI. Pilih satu anggota terlebih dahulu.",
        time: timeLabel(), kind: "system"
      }]);
      return;
    }
    if (mode !== "direct" && selected.length < 2) {
      setMessages((current) => [...current, {
        id: crypto.randomUUID(), sender: "FEDERATION SYSTEM",
        text: "Mode kolaborasi memerlukan minimal dua AI.",
        time: timeLabel(), kind: "system"
      }]);
      return;
    }

    const clientMessageId = crypto.randomUUID();
    setMessages((current) => [...current, {
      id: clientMessageId, sender: "YOU", text, time: timeLabel(), kind: "user"
    }]);
    setDraft("");
    setBusy(true);
    setWorkspaceStatus("Menjalankan orchestration…");

    try {
      const { response, data } = await callApi({
        action: "chat",
        clientMessageId,
        message: text,
        mode,
        agentIds: selected,
        ...(conversationId ? { conversationId } : {})
      });
      if (data.conversationId && typeof data.conversationId === "string") {
        setConversationId(data.conversationId);
      }
      if (response.status === 403 || data.status === "authorization_pending") {
        setAuthorizationStatus("pending");
        setWorkspaceStatus("Menunggu provisioning administrator");
      }
      if (!response.ok) {
        const missing = Array.isArray(data.missingAgents) ? ` Belum dikonfigurasi: ${data.missingAgents.join(", ")}.` : "";
        setMessages((current) => [...current, {
          id: crypto.randomUUID(),
          sender: "FEDERATION ORCHESTRATOR",
          text: String(data.error ?? data.message ?? "Permintaan tidak dapat diproses.") + missing,
          time: timeLabel(),
          kind: "system",
          status: String(data.status ?? response.status)
        }]);
        return;
      }

      const results = Array.isArray(data.results) ? data.results : [];
      const additions: Message[] = results.map((result: Record<string, unknown>) => ({
        id: String(result.messageId ?? crypto.randomUUID()),
        sender: String(result.name ?? result.agentId ?? "AI Agent"),
        text: String(result.content ?? result.error ?? "Tidak ada output."),
        time: timeLabel(),
        kind: result.status === "succeeded" ? "agent" : "system",
        status: String(result.status ?? "")
      }));
      setMessages((current) => {
        const existing = new Set(current.map((item) => item.id));
        return [...current, ...additions.filter((item) => !existing.has(item.id))];
      });
      setWorkspaceStatus(data.status === "succeeded" ? "Run selesai" : `Run selesai · ${data.status}`);
    } catch (error) {
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        sender: "FEDERATION ORCHESTRATOR",
        text: error instanceof Error ? error.message : "Tidak dapat menghubungi layanan Federation.",
        time: timeLabel(),
        kind: "system",
        status: "unavailable"
      }]);
      setWorkspaceStatus("Layanan tidak tersedia");
    } finally {
      setBusy(false);
    }
  }

  if (!supabase) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="brand"><div className="brand-mark">E</div><div><div className="brand-name">ERAMARINDO</div><span className="brand-sub">AI FEDERATION</span></div></div>
          <div className="eyebrow">Environment configuration required</div>
          <h1>Supabase belum dikonfigurasi</h1>
          <p className="subtitle">Tambahkan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY pada environment aplikasi. Jangan menaruh secret key atau provider API key di browser.</p>
        </section>
      </main>
    );
  }

  if (authLoading) {
    return <main className="auth-shell"><section className="auth-card"><div className="eyebrow">ERAMARINDO AI FEDERATION</div><h1>Memeriksa sesi…</h1></section></main>;
  }

  if (session && authMode === "reset") {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="brand"><div className="brand-mark">E</div><div><div className="brand-name">ERAMARINDO</div><span className="brand-sub">AI FEDERATION</span></div></div>
          <div className="eyebrow">Secure account recovery</div>
          <h1>{passwordResetComplete ? "Password berhasil diperbarui" : "Buat password baru"}</h1>
          <p className="subtitle">
            {passwordResetComplete
              ? "Password akun Development Anda sudah diperbarui. Sesi pemulihan tetap aman dan Anda dapat melanjutkan."
              : "Tautan pemulihan telah diverifikasi. Buat password baru yang kuat dan berbeda dari password sebelumnya."}
          </p>
          {!passwordResetComplete ? (
            <form className="auth-form" onSubmit={updatePassword}>
              <label>Password baru</label>
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimal 12 karakter"
              />
              <label>Konfirmasi password baru</label>
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                placeholder="Ulangi password baru"
              />
              {authError && <p className="auth-error">{authError}</p>}
              <button className="primary-btn auth-submit" type="submit" disabled={busy}>
                {busy ? "Memperbarui…" : "Simpan password baru"}
              </button>
            </form>
          ) : (
            <>
              {authMessage && <p className="auth-message">{authMessage}</p>}
              <button
                className="primary-btn auth-submit"
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setPasswordResetComplete(false);
                  setAuthMessage("");
                }}
              >
                Lanjut ke Federation
              </button>
            </>
          )}
          <div className="auth-footnote">ONE GATE — ONE STANDARD — ONE COMMAND</div>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="brand"><div className="brand-mark">E</div><div><div className="brand-name">ERAMARINDO</div><span className="brand-sub">AI FEDERATION</span></div></div>
          <div className="eyebrow">Secure development workspace</div>
          <h1>{authMode === "login" ? "Masuk ke Federation" : authMode === "signup" ? "Daftarkan akun" : "Pulihkan password"}</h1>
          <p className="subtitle">
            {authMode === "forgot"
              ? "Masukkan email akun Development. Jika alamat tersebut terdaftar, Supabase akan mengirim tautan untuk membuat password baru."
              : "Gunakan akun Supabase Auth Eramarindo Development. Akses chat memerlukan provisioning principal dan scope FM-001."}
          </p>
          <form className="auth-form" onSubmit={authMode === "forgot" ? requestPasswordReset : submitAuth}>
            <label>Email</label>
            <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@perusahaan.com" />
            {authMode !== "forgot" && (
              <>
                <label>Password</label>
                <input type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 8 karakter" />
              </>
            )}
            {authError && <p className="auth-error">{authError}</p>}
            {authMessage && <p className="auth-message">{authMessage}</p>}
            <button className="primary-btn auth-submit" type="submit" disabled={busy}>
              {busy ? "Memproses…" : authMode === "login" ? "Masuk" : authMode === "signup" ? "Buat akun" : "Kirim tautan reset"}
            </button>
          </form>
          {authMode === "login" && (
            <button className="link-button" onClick={() => { setAuthMode("forgot"); setAuthError(""); setAuthMessage(""); }}>
              Lupa password?
            </button>
          )}
          <button className="link-button" onClick={() => {
            setAuthMode(authMode === "forgot" ? "login" : authMode === "login" ? "signup" : "login");
            setAuthError("");
            setAuthMessage("");
          }}>
            {authMode === "login" ? "Belum memiliki akun? Daftar" : authMode === "signup" ? "Sudah memiliki akun? Masuk" : "Kembali ke Masuk"}
          </button>
          <div className="auth-footnote">ONE GATE — ONE STANDARD — ONE COMMAND</div>
        </section>
      </main>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">E</div><div><div className="brand-name">ERAMARINDO</div><span className="brand-sub">AI FEDERATION</span></div></div>
        <div>
          <div className="nav-label">Workspace</div>
          <button className="nav-item active">◈ &nbsp; Federation General Room</button>
          <button className="nav-item" disabled>▤ &nbsp; Knowledge Base · next phase</button>
          <button className="nav-item" disabled>◎ &nbsp; Agent Registry · next phase</button>
          <button className="nav-item" disabled>⌁ &nbsp; Runs & Audit · next phase</button>
        </div>
        <div>
          <div className="nav-label">Governance</div>
          <button className="nav-item" disabled>⚙ &nbsp; Settings · next phase</button>
          <button className="nav-item" disabled>◷ &nbsp; Usage & Budget · next phase</button>
        </div>
        <div className="sidebar-bottom">
          <div style={{fontSize:11, marginBottom:7}}><span className="pulse"/><b>{authorizationStatus === "ready" ? "FM-001 authorized" : authorizationStatus === "pending" ? "Provisioning pending" : "Checking access"}</b></div>
          <div className="notice">{workspaceStatus}</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div><div className="eyebrow">One Gate · One Standard · One Command</div><div className="top-title">Central Collaboration Workspace</div></div>
          <div className="top-right"><span>{session.user.email}</span><button className="signout-btn" onClick={() => void signOut()}>Keluar</button><div className="avatar">FM</div></div>
        </header>

        <section className="content">
          <div className="hero">
            <div><div className="eyebrow">Collective intelligence platform</div><h1>AI Federation Command</h1><div className="subtitle">Satu ruang untuk mengarahkan, membandingkan, dan mengembangkan kolaborasi ChatGPT, Gemini, dan DeepSeek melalui FM-001.</div></div>
            <div className="status-pill">{authorizationStatus === "ready" ? "● AUTHORIZED · DEVELOPMENT" : authorizationStatus === "pending" ? "● ACCESS PENDING" : "● CHECKING ACCESS"}</div>
          </div>

          <div className="metrics">
            <div className="card"><div className="metric-label">Initial AI members</div><div className="metric-value">03</div><div className="metric-note">OpenAI · Gemini · DeepSeek</div></div>
            <div className="card"><div className="metric-label">Activated providers</div><div className="metric-value">{Object.values(providerStates).filter((item) => item.enabled).length.toString().padStart(2, "0")}</div><div className="metric-note">Secrets and model IDs required</div></div>
            <div className="card"><div className="metric-label">Active conversation</div><div className="metric-value">{conversationId ? "01" : "00"}</div><div className="metric-note">{conversationId ? "Persisted in Development" : "Belum dimulai"}</div></div>
            <div className="card"><div className="metric-label">Workspace access</div><div className="metric-value" style={{fontSize:18}}>{authorizationStatus === "ready" ? "READY" : authorizationStatus === "pending" ? "PENDING" : "CHECK"}</div><div className="metric-note">FM-001 scope enforcement</div></div>
          </div>

          <div className="workspace">
            <section className="chat-card">
              <div className="chat-head"><div><div className="chat-title">Federation General Room</div><div className="chat-meta">Authenticated room · {selectedNames.length} selected AI agents</div></div><span className="status-pill">{busy ? "RUNNING" : "DEVELOPMENT"}</span></div>
              <div className="messages">
                {messages.map((message) => <div className={`message ${message.kind === "user" ? "user" : ""}`} key={message.id}>
                  <div className="msg-avatar">{message.kind === "user" ? "YOU" : message.kind === "agent" ? "AI" : "SYS"}</div>
                  <div className="bubble"><div className="msg-name">{message.sender}</div><div className="msg-text">{message.text}</div><div className="msg-time">{message.time}{message.status ? ` · ${message.status}` : ""}</div></div>
                </div>)}
                {busy && <div className="message"><div className="msg-avatar">AI</div><div className="bubble"><div className="msg-name">FEDERATION ORCHESTRATOR</div><div className="msg-text">Menghubungi provider dan mengumpulkan respons…</div></div></div>}
              </div>
              <div className="composer">
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Tulis instruksi atau topik untuk rekan AI… (Enter untuk kirim, Shift+Enter untuk baris baru)" />
                <div className="compose-row">
                  <select className="select" value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
                    <option value="direct">Direct · 1 AI</option>
                    <option value="broadcast">Broadcast · paralel</option>
                    <option value="sequential_review">Sequential review · berantai</option>
                  </select>
                  <button className="primary-btn" onClick={() => void sendMessage()} disabled={!draft.trim() || busy || authorizationStatus !== "ready" || !selectedReady}>Kirim ke Federation ↗</button>
                </div>
                {authorizationStatus === "pending" && <p className="notice">Akun sudah masuk, tetapi principal dan scope FM-001 belum diberikan oleh administrator. Chat belum diaktifkan.</p>}
                {authorizationStatus === "ready" && !selectedReady && <p className="notice">Model yang dipilih belum aktif. Lengkapi API key dan model ID, uji koneksi, lalu aktifkan agent serta REST connection di FM-001 Development.</p>}
              </div>
            </section>

            <aside className="side-panel">
              <div className="card">
                <div className="chat-title">AI Federation members</div><div className="chat-meta">Pilih model yang menerima instruksi</div>
                <div className="agent-list">{agents.map((agent) => {
                  const status = providerStates[agent.id];
                  return <label className="agent-row" key={agent.id} style={{cursor: agent.enabled ? "pointer" : "not-allowed", opacity: agent.enabled ? 1 : 0.48}}>
                    <input type="checkbox" disabled={!agent.enabled} checked={selected.includes(agent.id)} onChange={() => toggleAgent(agent.id)} />
                    <div className="agent-icon">{agent.initials}</div><div><div className="agent-name">{agent.name}</div><div className="agent-role">{agent.role}</div></div>
                    <span className="agent-state">{!agent.enabled ? "LATER" : status?.enabled ? "READY" : status?.configured ? "ACTIVATE" : "SETUP"}</span>
                  </label>;
                })}</div>
              </div>
              <div className="card">
                <div className="chat-title">Connection readiness</div>
                <div className="field"><label>FM-001 authorization</label><input readOnly value={authorizationStatus === "ready" ? "Authorized" : authorizationStatus === "pending" ? "Principal pending" : "Checking / unavailable"} /></div>
                <div className="field"><label>Supabase Realtime</label><input readOnly value={conversationId ? "Subscribed to active room" : "Waiting for conversation"} /></div>
                <div className="field"><label>Provider configuration</label><input readOnly value={Object.values(providerStates).filter((item) => item.enabled).length + " / 3 active"} /></div>
                <p className="notice">Provider keys remain in Supabase Edge Function Secrets. Do not paste credentials into the workspace, browser, or GitHub.</p>
              </div>
            </aside>
          </div>
        </section>
        <footer className="footer">ERAMARINDO AI FEDERATION · HUMAN-GOVERNED MULTI-MODEL COLLABORATION · DEVELOPMENT v0.2</footer>
      </main>
    </div>
  );
}