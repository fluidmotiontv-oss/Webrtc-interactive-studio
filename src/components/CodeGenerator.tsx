import React, { useState } from 'react';
import { FileCode, Copy, Check, Terminal } from 'lucide-react';

export const CodeGenerator: React.FC = () => {
  const [selectedLang, setSelectedLang] = useState<'vanilla' | 'react' | 'peerjs' | 'node'>('vanilla');
  const [copied, setCopied] = useState(false);

  const snippets = {
    vanilla: `// 1. Configuration with STUN Server
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

const pc = new RTCPeerConnection(config);

// 2. Attach Microphone & Camera Stream
const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
stream.getTracks().forEach(track => pc.addTrack(track, stream));

// 3. Create Data Channel for P2P Text & File Sharing
const dataChannel = pc.createDataChannel("meshData");
dataChannel.onmessage = (event) => console.log("Received:", event.data);

// 4. Handle ICE Candidate Discovery
pc.onicecandidate = (event) => {
  if (event.candidate) {
    signalingServer.send(JSON.stringify({ candidate: event.candidate }));
  }
};

// 5. Create SDP Offer (Caller)
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
signalingServer.send(JSON.stringify({ offer }));`,

    react: `import React, { useEffect, useRef, useState } from 'react';

export function WebRTCPlayer() {
  const localVideoRef = useRef(null);
  const pcRef = useRef(null);

  useEffect(() => {
    async function setupWebRTC() {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pcRef.current = pc;

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate) console.log('New ICE Candidate:', e.candidate);
      };
    }

    setupWebRTC();
  }, []);

  return <video ref={localVideoRef} autoPlay playsInline muted className="w-full rounded-xl" />;
}`,

    peerjs: `// Easy PeerJS Wrapper Example
import { Peer } from 'peerjs';

// Create Peer instance (handles signaling automatically)
const peer = new Peer();

peer.on('open', (id) => {
  console.log('My Peer ID is:', id);
});

// Connect to remote peer for Data Channel
const conn = peer.connect('remote-peer-id');
conn.on('open', () => {
  conn.send('Hello over PeerJS P2P!');
});

// Receive incoming call
peer.on('call', async (call) => {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  call.answer(stream);
  call.on('stream', (remoteStream) => {
    // Attach to video element
  });
});`,

    node: `// Lightweight Node.js + WebSocket Signaling Server
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    // Broadcast SDP offer/answer & ICE candidate to room peers
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === 1) {
        client.send(message.toString());
      }
    });
  });
});

server.listen(3000, () => console.log('Signaling Server running on port 3000'));`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[selectedLang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="code-generator-container" className="space-y-6">
      {/* Header */}
      <div className="bg-[#0a0a0a] border border-[#222222] rounded-sm p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-[#141414] border border-[#333333] flex items-center justify-center text-[#A38D5B]">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif italic text-white" style={{ fontFamily: 'Georgia, serif' }}>
                WebRTC Implementation Snippets
              </h2>
              <p className="text-xs text-[#888888] uppercase tracking-wider font-sans mt-0.5">
                Ready-to-use production boilerplate for Vanilla JS, React, PeerJS, and WebSocket Signaling backends.
              </p>
            </div>
          </div>

          {/* Snippet Selector */}
          <div className="flex items-center gap-1 bg-[#050505] p-1 rounded-sm border border-[#222222]">
            <button
              id="snippet-tab-vanilla"
              onClick={() => setSelectedLang('vanilla')}
              className={`px-3 py-1.5 rounded-sm text-xs uppercase tracking-wider font-semibold transition-all ${
                selectedLang === 'vanilla' ? 'bg-[#A38D5B] text-[#050505] font-bold' : 'text-[#888888] hover:text-[#ffffff]'
              }`}
            >
              Vanilla JS
            </button>
            <button
              id="snippet-tab-react"
              onClick={() => setSelectedLang('react')}
              className={`px-3 py-1.5 rounded-sm text-xs uppercase tracking-wider font-semibold transition-all ${
                selectedLang === 'react' ? 'bg-[#A38D5B] text-[#050505] font-bold' : 'text-[#888888] hover:text-[#ffffff]'
              }`}
            >
              React Hook
            </button>
            <button
              id="snippet-tab-peerjs"
              onClick={() => setSelectedLang('peerjs')}
              className={`px-3 py-1.5 rounded-sm text-xs uppercase tracking-wider font-semibold transition-all ${
                selectedLang === 'peerjs' ? 'bg-[#A38D5B] text-[#050505] font-bold' : 'text-[#888888] hover:text-[#ffffff]'
              }`}
            >
              PeerJS
            </button>
            <button
              id="snippet-tab-node"
              onClick={() => setSelectedLang('node')}
              className={`px-3 py-1.5 rounded-sm text-xs uppercase tracking-wider font-semibold transition-all ${
                selectedLang === 'node' ? 'bg-[#A38D5B] text-[#050505] font-bold' : 'text-[#888888] hover:text-[#ffffff]'
              }`}
            >
              Node.js WS Server
            </button>
          </div>
        </div>
      </div>

      {/* Code Viewer */}
      <div className="bg-[#0a0a0a] border border-[#222222] rounded-sm p-5 shadow-xl flex flex-col h-[480px]">
        <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#A38D5B]" />
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              {selectedLang} Code Template
            </span>
          </div>

          <button
            id="copy-code-snippet-button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-sm bg-[#141414] hover:bg-[#222222] text-xs text-[#ffffff] border border-[#333333] flex items-center gap-1.5 transition-colors uppercase tracking-wider font-semibold"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied to Clipboard!' : 'Copy Code'}
          </button>
        </div>

        <div className="flex-1 mt-3 bg-[#050505] p-4 rounded-sm border border-[#222222] overflow-y-auto font-mono text-xs text-[#A38D5B] leading-relaxed scrollbar-thin">
          <pre className="whitespace-pre-wrap">{snippets[selectedLang]}</pre>
        </div>
      </div>
    </div>
  );
};
