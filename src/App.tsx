import React, { useState, useEffect, useRef } from 'react';
import { ActiveTab, IceCandidateInfo } from './types';
import { Header } from './components/Header';
import { WebRTCPlayground } from './components/WebRTCPlayground';
import { ConnectionVisualizer } from './components/ConnectionVisualizer';
import { SdpIceInspector } from './components/SdpIceInspector';
import { StatsDiagnostics } from './components/StatsDiagnostics';
import { CodeGenerator } from './components/CodeGenerator';
import { AiArchitect } from './components/AiArchitect';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('playground');
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [roomId, setRoomId] = useState<string>('studio-room-1');

  // Shared Inspector Data
  const [sdpOffer, setSdpOffer] = useState<string>('');
  const [sdpAnswer, setSdpAnswer] = useState<string>('');
  const [iceCandidates, setIceCandidates] = useState<IceCandidateInfo[]>([]);
  const [statsReport, setStatsReport] = useState<RTCStatsReport | null>(null);

  // WebSocket Signaling Connection
  const [signalingWs, setSignalingWs] = useState<WebSocket | null>(null);

  // Initialize Room ID from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomId(roomParam);
    } else {
      const randomRoom = 'room-' + Math.random().toString(36).substring(2, 7);
      setRoomId(randomRoom);
    }
  }, []);

  // Connect to WebSocket Signaling Server
  useEffect(() => {
    let ws: WebSocket;

    function connectWs() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/signaling`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[App] Connected to WebSocket signaling server');
        ws.send(
          JSON.stringify({
            type: 'join_room',
            roomId,
          })
        );
      };

      ws.onerror = (err) => {
        console.warn('[App] WebSocket connection error:', err);
      };

      setSignalingWs(ws);
    }

    connectWs();

    return () => {
      if (ws) ws.close();
    };
  }, [roomId]);

  const handleIceCandidateDiscovered = (cand: IceCandidateInfo) => {
    setIceCandidates((prev) => {
      if (prev.some((c) => c.candidate === cand.candidate)) return prev;
      return [...prev, cand];
    });
  };

  const handleSdpGenerated = (sdp: string, type: 'offer' | 'answer') => {
    if (type === 'offer') {
      setSdpOffer(sdp);
    } else {
      setSdpAnswer(sdp);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#d1d1d1] flex flex-col font-sans selection:bg-[#A38D5B]/30 selection:text-[#fff]">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        connectionState={connectionState}
        roomId={roomId}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'playground' && (
          <WebRTCPlayground
            roomId={roomId}
            signalingWs={signalingWs}
            onIceCandidateDiscovered={handleIceCandidateDiscovered}
            onSdpGenerated={handleSdpGenerated}
            onStatsUpdate={setStatsReport}
            onConnectionStateChange={setConnectionState}
          />
        )}

        {activeTab === 'visualizer' && (
          <ConnectionVisualizer connectionState={connectionState} />
        )}

        {activeTab === 'inspector' && (
          <SdpIceInspector
            sdpOffer={sdpOffer}
            sdpAnswer={sdpAnswer}
            iceCandidates={iceCandidates}
          />
        )}

        {activeTab === 'stats' && (
          <StatsDiagnostics
            statsReport={statsReport}
            connectionState={connectionState}
          />
        )}

        {activeTab === 'generator' && <CodeGenerator />}

        {activeTab === 'ai' && <AiArchitect />}
      </main>

      {/* Sophisticated Footer */}
      <footer className="border-t border-[#222222] bg-[#0a0a0a] py-5 text-center text-xs text-[#666666]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium tracking-wider uppercase text-[10px] text-[#888888]">
            WebRTC Interactive Studio & Protocol Architecture
          </span>
          <span className="font-mono text-[10px] text-[#A38D5B]/80">
            Browser RTCPeerConnection • WebSocket Signaling • Gemini 3.1 Pro
          </span>
        </div>
      </footer>
    </div>
  );
}
