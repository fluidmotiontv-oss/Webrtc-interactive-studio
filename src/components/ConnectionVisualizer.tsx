import React, { useState } from 'react';
import { ConnectionStep } from '../types';
import {
  Network,
  Radio,
  Globe,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Zap,
  Layers,
  Cpu,
  Server
} from 'lucide-react';

interface ConnectionVisualizerProps {
  connectionState: RTCPeerConnectionState;
}

export const ConnectionVisualizer: React.FC<ConnectionVisualizerProps> = ({ connectionState }) => {
  const [selectedPhase, setSelectedPhase] = useState<number>(1);

  const phases: ConnectionStep[] = [
    {
      id: 1,
      title: '1. Local Initialization & Media Capture',
      description: 'Acquire microphone/camera MediaStream tracks and instantiate RTCPeerConnection with STUN server configuration.',
      status: 'completed',
      details:
        'Both peers initialize RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }). Local audio/video tracks or synthetic streams are added using addTrack(). An RTCDataChannel is also opened for raw data transmission.',
    },
    {
      id: 2,
      title: '2. Signaling Handshake (Offer / Answer SDP)',
      description: 'Exchange Session Description Protocol (SDP) text blobs containing supported codecs, media types, and crypto keys.',
      status: connectionState === 'connected' || connectionState === 'connecting' ? 'completed' : 'pending',
      details:
        'Peer A calls createOffer() & setLocalDescription(offer), then sends the SDP string over WebSocket signaling. Peer B receives the offer, sets setRemoteDescription(offer), creates createAnswer(), sets setLocalDescription(answer) and responds over signaling. Peer A sets setRemoteDescription(answer).',
    },
    {
      id: 3,
      title: '3. NAT Traversal & ICE Candidate Gathering',
      description: 'Discover public IP addresses/ports using STUN/TURN servers to punch through home routers and firewalls.',
      status: connectionState === 'connected' ? 'completed' : connectionState === 'connecting' ? 'in_progress' : 'pending',
      details:
        'Browsers trigger onicecandidate events as local network paths (Host candidates) and public mapping (Server Reflexive srflx candidates from STUN) are discovered. Peers exchange candidate objects over signaling and invoke addIceCandidate().',
    },
    {
      id: 4,
      title: '4. Direct Peer-to-Peer Encryption Pipe Established',
      description: 'DTLS/SRTP handshake finishes. Media streams and SCTP Data Channels flow directly browser-to-browser.',
      status: connectionState === 'connected' ? 'completed' : 'pending',
      details:
        'Once ICE candidate pairs match, media flows directly over UDP using SRTP (Secure Real-time Transport Protocol). No server sits in between the media stream, achieving sub-100ms real-time latency.',
    },
  ];

  return (
    <div id="connection-visualizer-container" className="space-y-6">
      {/* Top Title Banner */}
      <div className="bg-[#0a0a0a] border border-[#222222] rounded-sm p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-[#141414] border border-[#333333] flex items-center justify-center text-[#A38D5B]">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-serif italic text-white" style={{ fontFamily: 'Georgia, serif' }}>
              WebRTC 4-Step Connection Architecture Pipeline
            </h2>
            <p className="text-xs text-[#888888] uppercase tracking-wider font-sans mt-0.5">
              Visual breakdown of how two web browsers discover each other, traverse NAT routers, exchange SDP offers/answers, and open a direct P2P pipe.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Topology Visual Diagram */}
      <div className="bg-[#0a0a0a] border border-[#222222] rounded-sm p-6 shadow-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-6 flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#A38D5B]" />
          Interactive Network Flow Diagram
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Peer A Box */}
          <div className="bg-[#050505] border border-[#222222] rounded-sm p-5 text-center relative shadow-lg">
            <div className="w-12 h-12 rounded-full bg-[#141414] border border-[#333333] flex items-center justify-center text-[#A38D5B] mx-auto mb-3">
              <Cpu className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Peer A (Caller)</h4>
            <p className="text-[11px] text-[#888888] mt-1">Browser Client 1</p>
            <div className="mt-3 inline-block px-2.5 py-1 rounded-sm bg-[#0a0a0a] border border-[#222222] text-[10px] font-mono text-[#A38D5B]">
              RTCPeerConnection A
            </div>
          </div>

          {/* Central Signaling & STUN Server */}
          <div className="flex flex-col items-center justify-center space-y-4">
            {/* Signaling Server Node */}
            <div className="w-full bg-[#050505] border border-[#A38D5B]/30 rounded-sm p-4 text-center shadow-lg relative">
              <div className="flex items-center justify-center gap-2 text-[#A38D5B] mb-1">
                <Server className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Signaling Server (WebSocket)</span>
              </div>
              <p className="text-[10px] text-[#888888]">Swaps SDP Offer/Answer JSON & ICE Candidates</p>
            </div>

            {/* STUN Server Node */}
            <div className="w-full bg-[#050505] border border-emerald-500/30 rounded-sm p-4 text-center shadow-lg">
              <div className="flex items-center justify-center gap-2 text-emerald-400 mb-1">
                <Globe className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Google STUN Server</span>
              </div>
              <p className="text-[10px] text-[#888888]">stun:stun.l.google.com:19302 (Public IP Lookup)</p>
            </div>
          </div>

          {/* Peer B Box */}
          <div className="bg-[#050505] border border-[#222222] rounded-sm p-5 text-center relative shadow-lg">
            <div className="w-12 h-12 rounded-full bg-[#141414] border border-[#333333] flex items-center justify-center text-[#A38D5B] mx-auto mb-3">
              <Cpu className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Peer B (Receiver)</h4>
            <p className="text-[11px] text-[#888888] mt-1">Browser Client 2</p>
            <div className="mt-3 inline-block px-2.5 py-1 rounded-sm bg-[#0a0a0a] border border-[#222222] text-[10px] font-mono text-[#A38D5B]">
              RTCPeerConnection B
            </div>
          </div>
        </div>

        {/* Direct P2P Pipe Banner below */}
        <div className="mt-8 p-4 rounded-sm bg-[#050505] border border-[#A38D5B]/40 text-center flex items-center justify-center gap-3">
          <Lock className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-semibold text-white uppercase tracking-wider">
            Direct Encrypted P2P Media Pipe (SRTP + SCTP Data Channel) — Bypass Central Server
          </span>
        </div>
      </div>

      {/* Step Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {phases.map((phase) => {
          const isSelected = selectedPhase === phase.id;
          return (
            <div
              key={phase.id}
              onClick={() => setSelectedPhase(phase.id)}
              className={`p-5 rounded-sm border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#0a0a0a] border-[#A38D5B] shadow-xl'
                  : 'bg-[#0a0a0a]/60 border-[#222222] hover:border-[#444444]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {phase.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  {phase.status === 'in_progress' && <Zap className="w-5 h-5 text-[#A38D5B] animate-pulse" />}
                  {phase.status === 'pending' && <HelpCircle className="w-5 h-5 text-[#555555]" />}

                  <h3 className="text-sm font-bold text-white">{phase.title}</h3>
                </div>
              </div>

              <p className="text-xs text-[#888888] mt-2">{phase.description}</p>

              {isSelected && (
                <div className="mt-4 pt-3 border-t border-[#222222] text-xs text-[#d1d1d1] space-y-2 bg-[#050505] p-3 rounded-sm border border-[#222222]">
                  <div className="font-semibold text-[#A38D5B] text-[11px] uppercase tracking-wider">
                    Technical Mechanics
                  </div>
                  <p className="leading-relaxed">{phase.details}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
