import React, { useState } from 'react';
import { ActiveTab } from '../types';
import {
  Radio,
  Network,
  FileCode,
  Activity,
  Sparkles,
  Copy,
  Check,
  Zap,
  Globe,
  Video
} from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  connectionState: RTCPeerConnectionState;
  roomId: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  connectionState,
  roomId,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyRoom = () => {
    navigator.clipboard.writeText(window.location.origin + '?room=' + roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = () => {
    switch (connectionState) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[10px] uppercase tracking-wider font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            P2P Direct Pipe Active
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[10px] uppercase tracking-wider font-semibold bg-amber-950/40 text-amber-400 border border-amber-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            Signaling / ICE Handshake...
          </span>
        );
      case 'failed':
      case 'disconnected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[10px] uppercase tracking-wider font-semibold bg-rose-950/40 text-rose-400 border border-rose-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Disconnected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[10px] uppercase tracking-wider font-semibold bg-[#111111] text-[#888888] border border-[#333333]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#555555]" />
            Ready to Connect
          </span>
        );
    }
  };

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'playground', label: 'P2P Studio', icon: <Video className="w-3.5 h-3.5" /> },
    { id: 'visualizer', label: 'Pipeline Visualizer', icon: <Network className="w-3.5 h-3.5" /> },
    { id: 'inspector', label: 'SDP & ICE Inspector', icon: <Radio className="w-3.5 h-3.5" /> },
    { id: 'stats', label: 'WebRTC Stats', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'generator', label: 'Code Snippets', icon: <FileCode className="w-3.5 h-3.5" /> },
    { id: 'ai', label: 'AI Architect', icon: <Sparkles className="w-3.5 h-3.5" />, badge: 'Gemini 3.1' },
  ];

  return (
    <header id="main-app-header" className="bg-[#0a0a0a] border-b border-[#222222] sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 border-b border-[#1a1a1a]">
          {/* Brand & Status */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h1 className="text-2xl tracking-tight text-white font-serif italic" style={{ fontFamily: 'Georgia, serif' }}>
                WebRTC Studio
              </h1>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#A38D5B] font-semibold mt-0.5">
                Peer-to-Peer Protocol Architecture
              </p>
            </div>

            <div className="hidden lg:block">{getStatusBadge()}</div>
          </div>

          {/* Room Controls & Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#050505] border border-[#222222] text-xs text-[#d1d1d1]">
              <Globe className="w-3.5 h-3.5 text-[#A38D5B]" />
              <span className="font-mono text-[#888888] text-[10px] uppercase tracking-wider hidden md:inline">Room:</span>
              <span className="font-mono font-semibold text-[#ffffff]">{roomId}</span>
              <button
                id="copy-room-link-button"
                onClick={handleCopyRoom}
                className="ml-1 p-1 hover:bg-[#1a1a1a] rounded transition-colors text-[#888888] hover:text-[#ffffff]"
                title="Copy Room Link for Cross-Tab / Cross-Device test"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 overflow-x-auto no-scrollbar py-3">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-button-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-sm text-xs uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-[#A38D5B]/15 text-[#A38D5B] border border-[#A38D5B]/40 font-bold shadow-sm'
                    : 'text-[#888888] hover:text-[#ffffff] hover:bg-[#141414] border border-transparent'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.5 rounded-xs text-[9px] font-bold bg-[#A38D5B]/20 text-[#A38D5B] border border-[#A38D5B]/30">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
