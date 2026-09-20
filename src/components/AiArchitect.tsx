import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { AiChatMessage } from '../types';
import { Sparkles, Send, Brain, Cpu, RefreshCw, HelpCircle, Terminal } from 'lucide-react';

export const AiArchitect: React.FC = () => {
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '👋 Welcome to the **WebRTC AI Master Architect**! I am powered by **Gemini 3.1 Pro** with **High Thinking Mode**. Ask me anything about NAT traversal, STUN/TURN deployment, SFU vs MCU vs Mesh topologies, SDP anatomy, media codecs, or connection failure debugging!',
      thinking: null,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const presets = [
    'Explain STUN vs TURN vs ICE with ASCII network diagrams',
    'When should I use SFU vs Mesh topology for 50+ users?',
    'How do I handle RTCDataChannel file chunking for large binary files?',
    'Provide a production Coturn turnserver.conf configuration snippet',
  ];

  const handleSend = async (customPrompt?: string) => {
    const query = customPrompt || input;
    if (!query.trim() || loading) return;

    const userMsg: AiChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to communicate with AI Architect');
      }

      const aiMsg: AiChatMessage = {
        id: Math.random().toString(),
        role: 'assistant',
        content: data.reply,
        thinking: data.thinking,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('AI Architect error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'assistant',
          content: `⚠️ Error: ${err.message || 'Unable to connect to Gemini AI model.'}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="ai-architect-container" className="space-y-6">
      {/* Header */}
      <div className="bg-[#0a0a0a] border border-[#222222] rounded-sm p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-[#141414] border border-[#333333] flex items-center justify-center text-[#A38D5B]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif italic text-white flex items-center gap-2" style={{ fontFamily: 'Georgia, serif' }}>
                WebRTC AI Architect & Debugging Expert
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[#141414] text-[#A38D5B] border border-[#333333]">
                  Gemini 3.1 Pro • High Thinking
                </span>
              </h2>
              <p className="text-xs text-[#888888] uppercase tracking-wider font-sans mt-0.5">
                Ask deep technical questions regarding WebRTC networking, Coturn setup, media streams, and SFU architectures.
              </p>
            </div>
          </div>
        </div>

        {/* Question Presets */}
        <div className="mt-4 pt-4 border-t border-[#222222] flex flex-wrap gap-2">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              id={`preset-prompt-${idx}`}
              onClick={() => handleSend(preset)}
              disabled={loading}
              className="px-3 py-1.5 rounded-sm bg-[#050505] hover:bg-[#141414] text-xs text-[#d1d1d1] border border-[#222222] transition-colors disabled:opacity-50 text-left font-sans"
            >
              💡 {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Display & Input */}
      <div className="bg-[#0a0a0a] border border-[#222222] rounded-sm p-5 shadow-xl flex flex-col h-[520px]">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto space-y-4 p-2 scrollbar-thin">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="text-[10px] text-[#888888] mb-1 flex items-center gap-1 font-mono">
                <span>{m.role === 'user' ? 'You' : 'Gemini 3.1 Pro Architect'}</span>
                <span>•</span>
                <span>{m.timestamp}</span>
              </div>

              {/* High Thinking Trace accordion if present */}
              {m.thinking && (
                <details className="mb-2 max-w-2xl bg-[#050505] border border-[#A38D5B]/30 rounded-sm p-3 text-xs text-[#A38D5B]">
                  <summary className="font-bold flex items-center gap-2 cursor-pointer text-[#A38D5B] hover:text-[#ffffff] uppercase tracking-wider text-[11px]">
                    <Brain className="w-4 h-4 text-[#A38D5B]" />
                    High Thinking Process Trace (Gemini 3.1 Pro)
                  </summary>
                  <pre className="mt-2 text-[10px] font-mono text-[#d1d1d1] whitespace-pre-wrap bg-[#000000] p-2.5 rounded-sm border border-[#222222] leading-relaxed">
                    {m.thinking}
                  </pre>
                </details>
              )}

              <div
                className={`max-w-3xl px-4 py-3 rounded-sm text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#141414] text-white border border-[#333333] shadow-md'
                    : 'bg-[#050505] text-[#d1d1d1] border border-[#222222] shadow-lg'
                }`}
              >
                <div className="prose prose-invert prose-xs max-w-none">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3 p-4 bg-[#050505] border border-[#A38D5B]/30 rounded-sm max-w-md animate-pulse">
              <Brain className="w-5 h-5 text-[#A38D5B] animate-spin" />
              <div className="text-xs text-[#A38D5B] font-semibold uppercase tracking-wider">
                Gemini 3.1 Pro is analyzing request with High Thinking Mode...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="pt-3 border-t border-[#222222] flex items-center gap-2">
          <input
            id="ai-prompt-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a WebRTC question (e.g., How to fix ICE disconnects behind corporate firewall?)..."
            disabled={loading}
            className="flex-1 bg-[#050505] border border-[#222222] rounded-sm px-4 py-2.5 text-xs text-[#ffffff] focus:outline-none focus:border-[#A38D5B] disabled:opacity-50"
          />

          <button
            id="send-ai-prompt-button"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 rounded-sm bg-[#A38D5B] hover:bg-[#8e7a4e] text-[#050505] text-xs font-bold uppercase tracking-wider disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-md"
          >
            <Send className="w-3.5 h-3.5" />
            Ask AI
          </button>
        </div>
      </div>
    </div>
  );
};
