"use client";

import { useMemo, useState } from "react";

type Mode = "direct" | "broadcast" | "sequential_review";
type Message = {
  id: string;
  sender: string;
  text: string;
  time: string;
  kind: "user" | "system";
  status?: string;
};

const agents = [
  { id: "openai", name: "ChatGPT", role: "Reasoning & analysis", initials: "GPT" },
  { id: "gemini", name: "Gemini", role: "Research & multimodal", initials: "G" },
  { id: "deepseek", name: "DeepSeek", role: "Technical reasoning", initials: "DS" },
  { id: "anthropic", name: "Claude", role: "Document analysis", initials: "C" },
  { id: "microsoft", name: "Microsoft Copilot", role: "Enterprise productivity", initials: "M" },
  { id: "github", name: "GitHub Copilot", role: "Software engineering", initials: "GH" }
];

const initialMessages: Message[] = [
  {
    id: "welcome",
    sender: "FEDERATION SYSTEM",
    text: "Selamat datang di ERAMARINDO AI FEDERATION. Workspace ini adalah fondasi awal. Belum ada provider AI yang dikonfigurasi, sehingga pesan yang dikirim belum diteruskan ke model eksternal.",
    time: "SYSTEM",
    kind: "system"
  },
  {
    id: "guide",
    sender: "FERGUSON · COORDINATION",
    text: "Mulai dengan menulis agenda atau pertanyaan. Pilih mode Direct atau Broadcast. Setelah API provider dan autentikasi backend dikonfigurasi, orchestrator akan meneruskan pesan kepada model yang dipilih.",
    time: "SYSTEM",
    kind: "system"
  }
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<Mode>("direct");
  const [selected, setSelected] = useState<string[]>(["openai", "gemini", "deepseek"]);
  const [busy, setBusy] = useState(false);
  const selectedNames = useMemo(() => agents.filter(a => selected.includes(a.id)).map(a => a.name), [selected]);

  function toggleAgent(id: string) {
    setSelected(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  }

  async function sendMessage() {
    const text = draft.trim();
    if (!text || busy) return;
    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: "YOU",
      text,
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      kind: "user"
    };
    setMessages(current => [...current, userMessage]);
    setDraft("");
    setBusy(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, mode, agentIds: selected })
      });
      const data = await response.json() as { status?: string; message?: string; runId?: string };
      setMessages(current => [...current, {
        id: crypto.randomUUID(),
        sender: "FEDERATION ORCHESTRATOR",
        text: data.message ?? "Orchestrator tidak mengembalikan pesan yang dapat dibaca.",
        time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        kind: "system",
        status: data.status
      }]);
    } catch {
      setMessages(current => [...current, {
        id: crypto.randomUUID(),
        sender: "FEDERATION ORCHESTRATOR",
        text: "Tidak dapat menghubungi API aplikasi. Periksa server dan konfigurasi lokal.",
        time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        kind: "system",
        status: "unavailable"
      }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">E</div>
          <div><div className="brand-name">ERAMARINDO</div><span className="brand-sub">AI FEDERATION</span></div>
        </div>
        <div>
          <div className="nav-label">Workspace</div>
          <button className="nav-item active">◈ &nbsp; Federation General Room</button>
          <button className="nav-item" disabled>▤ &nbsp; Knowledge Base · planned</button>
          <button className="nav-item" disabled>◎ &nbsp; Agent Registry · planned</button>
          <button className="nav-item" disabled>⌁ &nbsp; Runs & Audit · planned</button>
        </div>
        <div>
          <div className="nav-label">Governance</div>
          <button className="nav-item" disabled>⚙ &nbsp; Settings · planned</button>
          <button className="nav-item" disabled>◷ &nbsp; Usage & Budget · planned</button>
        </div>
        <div className="sidebar-bottom">
          <div style={{fontSize:11, marginBottom:7}}><span className="pulse"/><b>Foundation mode</b></div>
          <div className="notice">Provider connections are not configured. No external AI calls are being made.</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div><div className="eyebrow">One Gate · One Standard · One Command</div><div className="top-title">Central Collaboration Workspace</div></div>
          <div className="top-right"><span>Environment: Bootstrap</span><div className="avatar">FM</div></div>
        </header>

        <section className="content">
          <div className="hero">
            <div><div className="eyebrow">Collective intelligence platform</div><h1>AI Federation Command</h1><div className="subtitle">Satu ruang untuk mengatur diskusi, mengarahkan tugas, dan mengembangkan kolaborasi lintas model AI dengan kendali manusia.</div></div>
            <div className="status-pill">● &nbsp; BOOTSTRAP · NOT CONNECTED</div>
          </div>

          <div className="metrics">
            <div className="card"><div className="metric-label">Registered agent candidates</div><div className="metric-value">06</div><div className="metric-note">Registry placeholders</div></div>
            <div className="card"><div className="metric-label">Connected providers</div><div className="metric-value">00</div><div className="metric-note">API setup required</div></div>
            <div className="card"><div className="metric-label">Active orchestration runs</div><div className="metric-value">00</div><div className="metric-note">No live runs</div></div>
            <div className="card"><div className="metric-label">Shared knowledge records</div><div className="metric-value">00</div><div className="metric-note">Knowledge workflow planned</div></div>
          </div>

          <div className="workspace">
            <section className="chat-card">
              <div className="chat-head"><div><div className="chat-title">Federation General Room</div><div className="chat-meta">Internal workspace · {selectedNames.length} selected agent candidates</div></div><span className="status-pill">DEMO SHELL</span></div>
              <div className="messages">
                {messages.map(message => <div className={`message ${message.kind === "user" ? "user" : ""}`} key={message.id}>
                  <div className="msg-avatar">{message.kind === "user" ? "YOU" : "AI"}</div>
                  <div className="bubble"><div className="msg-name">{message.sender}</div><div className="msg-text">{message.text}</div><div className="msg-time">{message.time}{message.status ? ` · ${message.status}` : ""}</div></div>
                </div>)}
                {busy && <div className="message"><div className="msg-avatar">AI</div><div className="bubble"><div className="msg-name">FEDERATION ORCHESTRATOR</div><div className="msg-text">Memproses permintaan aplikasi…</div></div></div>}
              </div>
              <div className="composer">
                <textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder="Tulis instruksi, agenda, atau pertanyaan untuk Federation… (Enter untuk kirim)" />
                <div className="compose-row">
                  <select className="select" value={mode} onChange={e => setMode(e.target.value as Mode)}>
                    <option value="direct">Direct message</option>
                    <option value="broadcast">Broadcast to selected</option>
                    <option value="sequential_review">Sequential review</option>
                  </select>
                  <button className="primary-btn" onClick={() => void sendMessage()} disabled={!draft.trim() || busy}>Send to orchestrator ↗</button>
                </div>
              </div>
            </section>

            <aside className="side-panel">
              <div className="card">
                <div className="chat-title">Agent candidates</div><div className="chat-meta">Pilih tujuan untuk run berikutnya</div>
                <div className="agent-list">{agents.map(agent => <label className="agent-row" key={agent.id} style={{cursor:"pointer"}}>
                  <input type="checkbox" checked={selected.includes(agent.id)} onChange={() => toggleAgent(agent.id)} />
                  <div className="agent-icon">{agent.initials}</div><div><div className="agent-name">{agent.name}</div><div className="agent-role">{agent.role}</div></div>
                  <span className="agent-state">SETUP</span>
                </label>)}</div>
              </div>
              <div className="card">
                <div className="chat-title">Connection readiness</div>
                <div className="field"><label>Provider status</label><input readOnly value="Not configured" /></div>
                <div className="field"><label>Realtime workspace</label><input readOnly value="Not configured" /></div>
                <div className="field"><label>Database</label><input readOnly value="Not configured" /></div>
                <p className="notice">API keys must be added to a secure server-side environment. Do not paste credentials into this chat or commit them to GitHub.</p>
              </div>
            </aside>
          </div>
        </section>
        <footer className="footer">ERAMARINDO AI FEDERATION · HUMAN-GOVERNED MULTI-MODEL COLLABORATION · v0.1 FOUNDATION</footer>
      </main>
    </div>
  );
}