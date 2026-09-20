import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, IceCandidateInfo } from '../types';
import { createSyntheticVideoStream, formatBytes, parseIceCandidate } from '../utils/webrtcHelpers';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Send,
  Upload,
  Zap,
  Copy,
  Check,
  RefreshCw,
  Tv,
  ArrowRight,
  Shield,
  FileText,
  MessageSquare,
  Activity,
  Play
} from 'lucide-react';

interface WebRTCPlaygroundProps {
  roomId: string;
  signalingWs: WebSocket | null;
  onIceCandidateDiscovered: (cand: IceCandidateInfo) => void;
  onSdpGenerated: (sdp: string, type: 'offer' | 'answer') => void;
  onStatsUpdate: (stats: any) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
}

export const WebRTCPlayground: React.FC<WebRTCPlaygroundProps> = ({
  roomId,
  signalingWs,
  onIceCandidateDiscovered,
  onSdpGenerated,
  onStatsUpdate,
  onConnectionStateChange,
}) => {
  // Mode selection: Dual-Peer (In-Page) vs WebSocket Remote Peer vs Manual SDP
  const [connectionMode, setConnectionMode] = useState<'dual' | 'remote' | 'manual'>('dual');

  // Media Controls
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [useSyntheticVideo, setUseSyntheticVideo] = useState(false);

  // States
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [dataChannelState, setDataChannelState] = useState<string>('closed');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Chat & File Transfer
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [fileProgress, setFileProgress] = useState<number | null>(null);

  // Manual Handshake State
  const [localSdp, setLocalSdp] = useState('');
  const [remoteSdpInput, setRemoteSdpInput] = useState('');
  const [manualCandidates, setManualCandidates] = useState<string[]>([]);
  const [manualCandidateInput, setManualCandidateInput] = useState('');
  const [copiedSdp, setCopiedSdp] = useState(false);

  // Video Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // WebRTC Instance Refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // For Dual-Peer Mode (Peer B)
  const peerB_pcRef = useRef<RTCPeerConnection | null>(null);
  const peerB_dataChannelRef = useRef<RTCDataChannel | null>(null);
  const peerB_videoRef = useRef<HTMLVideoElement>(null);

  // Initialize Media Stream
  useEffect(() => {
    let active = true;

    async function initMedia() {
      try {
        let stream: MediaStream;
        if (useSyntheticVideo) {
          stream = createSyntheticVideoStream('Local Test Stream');
        } else {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: 640, height: 480 },
              audio: true,
            });
          } catch (err) {
            console.warn('Real camera not available or permitted, falling back to synthetic stream:', err);
            stream = createSyntheticVideoStream('Local Test Stream');
            if (active) setUseSyntheticVideo(true);
          }
        }

        if (active) {
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
      } catch (e) {
        console.error('Error initializing media stream:', e);
      }
    }

    initMedia();

    return () => {
      active = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [useSyntheticVideo]);

  // Handle RTC Peer Connection setup
  const createPeerConnection = (isCaller = true) => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(config);
    pcRef.current = pc;

    // Attach tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming stream
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candInfo = parseIceCandidate(event.candidate.candidate);
        onIceCandidateDiscovered(candInfo);

        if (connectionMode === 'remote' && signalingWs && signalingWs.readyState === WebSocket.OPEN) {
          signalingWs.send(
            JSON.stringify({
              type: 'ice_candidate',
              roomId,
              payload: event.candidate,
            })
          );
        } else if (connectionMode === 'manual') {
          setManualCandidates((prev) => [...prev, JSON.stringify(event.candidate)]);
        }
      }
    };

    // Connection State Changes
    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      onConnectionStateChange(pc.connectionState);
    };

    // Setup Data Channel
    if (isCaller) {
      const dc = pc.createDataChannel('studioDataChannel');
      setupDataChannel(dc);
      dataChannelRef.current = dc;
    } else {
      pc.ondatachannel = (event) => {
        const dc = event.channel;
        setupDataChannel(dc);
        dataChannelRef.current = dc;
      };
    }

    return pc;
  };

  const setupDataChannel = (dc: RTCDataChannel) => {
    dc.onopen = () => setDataChannelState('open');
    dc.onclose = () => setDataChannelState('closed');
    dc.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat') {
          setMessages((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              sender: 'Peer B',
              text: data.text,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        } else if (data.type === 'ping') {
          // Respond to ping with pong
          dc.send(JSON.stringify({ type: 'pong', sentAt: data.sentAt }));
        } else if (data.type === 'pong') {
          const rtt = Date.now() - data.sentAt;
          setLatencyMs(rtt);
        } else if (data.type === 'file') {
          // Received direct P2P file
          setMessages((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              sender: 'Peer B',
              text: `Shared file: ${data.name} (${formatBytes(data.size)})`,
              timestamp: new Date().toLocaleTimeString(),
              type: 'file',
              fileData: {
                name: data.name,
                size: data.size,
                type: data.fileType,
                url: data.url,
              },
            },
          ]);
        }
      } catch {
        // Raw text message
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'Peer B',
            text: event.data,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    };
  };

  // Start Dual-Peer Connection (Automated side-by-side)
  const startDualPeerConnection = async () => {
    try {
      // Create Peer A (Caller)
      const pcA = createPeerConnection(true);

      // Create Peer B (Receiver)
      const configB: RTCConfiguration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      };
      const pcB = new RTCPeerConnection(configB);
      peerB_pcRef.current = pcB;

      // Add synthetic stream to Peer B so Peer A receives video
      const peerBStream = createSyntheticVideoStream('Peer B Stream');
      peerBStream.getTracks().forEach((track) => pcB.addTrack(track, peerBStream));

      // Peer B track receiver
      pcB.ontrack = (event) => {
        if (peerB_videoRef.current && event.streams[0]) {
          peerB_videoRef.current.srcObject = event.streams[0];
        }
      };

      // Cross ICE Candidate exchange
      pcA.onicecandidate = (e) => {
        if (e.candidate) {
          pcB.addIceCandidate(e.candidate);
          onIceCandidateDiscovered(parseIceCandidate(e.candidate.candidate));
        }
      };
      pcB.onicecandidate = (e) => {
        if (e.candidate) {
          pcA.addIceCandidate(e.candidate);
        }
      };

      // Peer B data channel receiver
      pcB.ondatachannel = (e) => {
        const dcB = e.channel;
        peerB_dataChannelRef.current = dcB;
        dcB.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            if (data.type === 'ping') {
              dcB.send(JSON.stringify({ type: 'pong', sentAt: data.sentAt }));
            }
          } catch {
            // raw message
          }
        };
      };

      // Handshake: Offer & Answer
      const offer = await pcA.createOffer();
      await pcA.setLocalDescription(offer);
      onSdpGenerated(offer.sdp || '', 'offer');

      await pcB.setRemoteDescription(offer);
      const answer = await pcB.createAnswer();
      await pcB.setLocalDescription(answer);
      onSdpGenerated(answer.sdp || '', 'answer');

      await pcA.setRemoteDescription(answer);
    } catch (err) {
      console.error('Failed dual-peer setup:', err);
    }
  };

  // Start Remote Peer Connection over WebSocket
  const startRemoteOffer = async () => {
    try {
      const pc = createPeerConnection(true);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      onSdpGenerated(offer.sdp || '', 'offer');

      if (signalingWs && signalingWs.readyState === WebSocket.OPEN) {
        signalingWs.send(
          JSON.stringify({
            type: 'offer',
            roomId,
            payload: offer,
          })
        );
      }
    } catch (err) {
      console.error('Remote offer error:', err);
    }
  };

  // Process incoming signaling messages
  useEffect(() => {
    if (!signalingWs) return;

    const handleMessage = async (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (connectionMode !== 'remote') return;

        if (data.type === 'offer') {
          const pc = createPeerConnection(false);
          await pc.setRemoteDescription(new RTCSessionDescription(data.payload));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          onSdpGenerated(answer.sdp || '', 'answer');

          signalingWs.send(
            JSON.stringify({
              type: 'answer',
              roomId,
              payload: answer,
            })
          );
        } else if (data.type === 'answer') {
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.payload));
          }
        } else if (data.type === 'ice_candidate') {
          if (pcRef.current) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(data.payload));
          }
        }
      } catch (e) {
        console.error('Error handling signaling message:', e);
      }
    };

    signalingWs.addEventListener('message', handleMessage);
    return () => signalingWs.removeEventListener('message', handleMessage);
  }, [signalingWs, connectionMode, roomId]);

  // Periodic Stats Polling
  useEffect(() => {
    const interval = setInterval(async () => {
      if (pcRef.current && pcRef.current.connectionState === 'connected') {
        try {
          const statsReport = await pcRef.current.getStats();
          onStatsUpdate(statsReport);
        } catch (e) {
          console.error('Error fetching stats:', e);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Send Chat Message
  const handleSendMessage = () => {
    if (!chatInput.trim() || !dataChannelRef.current) return;

    const msgObj = { type: 'chat', text: chatInput };
    dataChannelRef.current.send(JSON.stringify(msgObj));

    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        sender: 'Peer A',
        text: chatInput,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    setChatInput('');
  };

  // Send Latency Ping over DataChannel
  const handlePing = () => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify({ type: 'ping', sentAt: Date.now() }));
    }
  };

  // Direct File Transfer over RTCDataChannel
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !dataChannelRef.current) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const fileData = {
        type: 'file',
        name: file.name,
        size: file.size,
        fileType: file.type,
        url,
      };

      dataChannelRef.current?.send(JSON.stringify(fileData));

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'Peer A',
          text: `Sent file: ${file.name} (${formatBytes(file.size)})`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'file',
          fileData: {
            name: file.name,
            size: file.size,
            type: file.type,
            url,
          },
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  // Toggle Track Audio / Video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  return (
    <div id="webrtc-playground-container" className="space-y-6">
      {/* Top Banner: Connection Mode Selector & Connection Action */}
      <div className="bg-[#0a0a0a] border border-[#222222] rounded-sm p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-serif italic text-white flex items-center gap-2" style={{ fontFamily: 'Georgia, serif' }}>
              <Zap className="w-5 h-5 text-[#A38D5B]" />
              Interactive WebRTC Connection Studio
            </h2>
            <p className="text-xs text-[#888888] mt-1 uppercase tracking-wider font-sans">
              Select connection topology, establish real-time audio/video streams, test latency, and exchange P2P data channels.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Switcher */}
            <div className="bg-[#050505] p-1 rounded-sm border border-[#222222] flex items-center gap-1">
              <button
                id="mode-button-dual"
                onClick={() => setConnectionMode('dual')}
                className={`px-3 py-1.5 rounded-sm text-xs uppercase tracking-wider font-semibold transition-all ${
                  connectionMode === 'dual'
                    ? 'bg-[#A38D5B] text-[#050505] font-bold shadow'
                    : 'text-[#888888] hover:text-[#ffffff]'
                }`}
              >
                Dual Sandbox
              </button>
              <button
                id="mode-button-remote"
                onClick={() => setConnectionMode('remote')}
                className={`px-3 py-1.5 rounded-sm text-xs uppercase tracking-wider font-semibold transition-all ${
                  connectionMode === 'remote'
                    ? 'bg-[#A38D5B] text-[#050505] font-bold shadow'
                    : 'text-[#888888] hover:text-[#ffffff]'
                }`}
              >
                WebSocket Signaling
              </button>
              <button
                id="mode-button-manual"
                onClick={() => setConnectionMode('manual')}
                className={`px-3 py-1.5 rounded-sm text-xs uppercase tracking-wider font-semibold transition-all ${
                  connectionMode === 'manual'
                    ? 'bg-[#A38D5B] text-[#050505] font-bold shadow'
                    : 'text-[#888888] hover:text-[#ffffff]'
                }`}
              >
                Manual SDP Handshake
              </button>
            </div>

            {/* Connection Trigger Button */}
            {connectionMode === 'dual' && (
              <button
                id="start-dual-p2p-button"
                onClick={startDualPeerConnection}
                className="px-4 py-2 rounded-sm bg-[#A38D5B] hover:bg-[#b8a069] text-[#050505] text-xs uppercase tracking-wider font-bold shadow-md flex items-center gap-2 transition-all active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                Initialize Dual P2P Pipe
              </button>
            )}

            {connectionMode === 'remote' && (
              <button
                id="start-remote-offer-button"
                onClick={startRemoteOffer}
                className="px-4 py-2 rounded-sm bg-[#A38D5B] hover:bg-[#b8a069] text-[#050505] text-xs uppercase tracking-wider font-bold shadow-md flex items-center gap-2 transition-all active:scale-95"
              >
                <Send className="w-4 h-4" />
                Send SDP Offer over WS
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Video Stream Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Local Stream Card (Peer A) */}
        <div className="bg-[#0a0a0a] border border-[#222222] rounded-sm overflow-hidden shadow-xl flex flex-col">
          <div className="bg-[#050505] px-4 py-3 border-b border-[#222222] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#A38D5B] animate-pulse" />
              <h3 className="text-xs font-bold text-[#ffffff] tracking-widest uppercase">
                Peer A (Local Caller)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#888888] uppercase">
              {useSyntheticVideo ? 'Synthetic Test Stream' : 'Webcam / Mic'}
            </span>
          </div>

          <div className="relative bg-[#000000] aspect-video flex items-center justify-center overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {!videoEnabled && (
              <div className="absolute inset-0 bg-[#050505]/90 flex flex-col items-center justify-center text-[#888888]">
                <VideoOff className="w-10 h-10 mb-2 text-[#444444]" />
                <span className="text-xs uppercase tracking-wider font-medium">Video Track Muted</span>
              </div>
            )}

            {/* Floating Controls Bar */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#0a0a0a]/90 backdrop-blur-md px-3 py-1.5 rounded-sm border border-[#222222] shadow-lg">
              <button
                id="toggle-mic-button"
                onClick={toggleAudio}
                className={`p-2 rounded-sm transition-colors ${
                  audioEnabled ? 'bg-[#141414] text-[#ffffff] hover:bg-[#222222]' : 'bg-rose-950/40 text-rose-400 border border-rose-800/40'
                }`}
                title={audioEnabled ? 'Mute Audio' : 'Unmute Audio'}
              >
                {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              <button
                id="toggle-video-button"
                onClick={toggleVideo}
                className={`p-2 rounded-sm transition-colors ${
                  videoEnabled ? 'bg-[#141414] text-[#ffffff] hover:bg-[#222222]' : 'bg-rose-950/40 text-rose-400 border border-rose-800/40'
                }`}
                title={videoEnabled ? 'Disable Video' : 'Enable Video'}
              >
                {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </button>

              <button
                id="toggle-synthetic-stream-button"
                onClick={() => setUseSyntheticVideo(!useSyntheticVideo)}
                className={`p-2 rounded-sm transition-colors ${
                  useSyntheticVideo ? 'bg-[#A38D5B] text-[#050505] font-bold' : 'bg-[#141414] text-[#ffffff] hover:bg-[#222222]'
                }`}
                title="Toggle Radar Synthetic Pattern"
              >
                <Tv className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Remote Stream Card (Peer B) */}
        <div className="bg-[#0a0a0a] border border-[#222222] rounded-sm overflow-hidden shadow-xl flex flex-col">
          <div className="bg-[#050505] px-4 py-3 border-b border-[#222222] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionState === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <h3 className="text-xs font-bold text-[#ffffff] tracking-widest uppercase">
                Peer B (Remote Receiver)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#888888] uppercase">
              State: {connectionState}
            </span>
          </div>

          <div className="relative bg-[#000000] aspect-video flex items-center justify-center overflow-hidden">
            <video
              ref={connectionMode === 'dual' ? peerB_videoRef : remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {connectionState !== 'connected' && (
              <div className="absolute inset-0 bg-[#050505]/95 flex flex-col items-center justify-center text-center p-6 text-[#888888]">
                <VideoOff className="w-10 h-10 mb-3 text-[#333333] animate-pulse" />
                <p className="text-xs font-semibold text-[#ffffff] uppercase tracking-wider">Waiting for WebRTC Peer Connection...</p>
                <p className="text-[11px] text-[#666666] mt-1 max-w-xs font-sans">
                  {connectionMode === 'dual'
                    ? 'Click "Initialize Dual P2P Pipe" above to connect in-page.'
                    : 'Open this app in a second browser tab with the same Room ID.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RTCDataChannel & Media Interaction Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live P2P Chat & File Transfer */}
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-[#222222] rounded-sm p-5 shadow-xl flex flex-col h-[400px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#A38D5B]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#ffffff]">
                RTCDataChannel P2P Messaging & File Exchange
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[#888888]">
                DC State:{' '}
                <strong className={dataChannelState === 'open' ? 'text-emerald-400' : 'text-amber-400'}>
                  {dataChannelState}
                </strong>
              </span>

              <button
                id="ping-button"
                onClick={handlePing}
                disabled={dataChannelState !== 'open'}
                className="px-2.5 py-1 rounded-sm bg-[#141414] hover:bg-[#222222] text-xs font-mono text-[#A38D5B] border border-[#333333] disabled:opacity-40 flex items-center gap-1"
                title="Send timestamp packet over DataChannel to measure round-trip latency"
              >
                <Activity className="w-3 h-3" />
                Ping {latencyMs !== null && `(${latencyMs}ms)`}
              </button>
            </div>
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 my-2 scrollbar-thin">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#555555] text-xs text-center">
                <FileText className="w-8 h-8 mb-2 opacity-30" />
                No messages yet. Open RTCDataChannel and start chatting or transferring files directly peer-to-peer!
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'Peer A' ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[10px] text-[#666666] mb-1 flex items-center gap-1 font-mono">
                    <span>{m.sender}</span>
                    <span>•</span>
                    <span>{m.timestamp}</span>
                  </div>

                  <div
                    className={`max-w-md px-3.5 py-2 rounded-sm text-xs ${
                      m.sender === 'Peer A'
                        ? 'bg-[#A38D5B] text-[#050505] font-medium shadow-md'
                        : 'bg-[#141414] text-[#d1d1d1] border border-[#222222]'
                    }`}
                  >
                    {m.type === 'file' && m.fileData ? (
                      <div className="space-y-2">
                        <div className="font-semibold flex items-center gap-2">
                          <Upload className="w-4 h-4 text-[#050505]" />
                          {m.fileData.name}
                        </div>
                        <a
                          href={m.fileData.url}
                          download={m.fileData.name}
                          className="inline-block px-3 py-1 rounded-sm bg-[#050505] text-[11px] font-bold text-[#A38D5B] border border-[#A38D5B]/30 transition-colors"
                        >
                          Download Received File
                        </a>
                      </div>
                    ) : (
                      m.text
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input Box */}
          <div className="pt-3 border-t border-[#222222] flex items-center gap-2">
            <input
              id="chat-message-input"
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={dataChannelState === 'open' ? 'Type message over RTCDataChannel...' : 'Data channel closed...'}
              disabled={dataChannelState !== 'open'}
              className="flex-1 bg-[#050505] border border-[#222222] rounded-sm px-3.5 py-2 text-xs text-[#ffffff] focus:outline-none focus:border-[#A38D5B] disabled:opacity-50"
            />

            <label
              id="file-upload-label"
              className={`p-2 rounded-sm border border-[#222222] bg-[#050505] hover:bg-[#141414] text-[#d1d1d1] cursor-pointer transition-colors ${
                dataChannelState !== 'open' ? 'opacity-40 pointer-events-none' : ''
              }`}
              title="Send File P2P"
            >
              <Upload className="w-4 h-4" />
              <input type="file" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              id="send-message-button"
              onClick={handleSendMessage}
              disabled={dataChannelState !== 'open' || !chatInput.trim()}
              className="px-4 py-2 rounded-sm bg-[#A38D5B] hover:bg-[#b8a069] text-[#050505] text-xs uppercase tracking-wider font-bold disabled:opacity-40 transition-all flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </div>
        </div>

        {/* Right Col: Connection Diagnostics Summary */}
        <div className="bg-[#0a0a0a] border border-[#222222] rounded-sm p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#ffffff] border-b border-[#222222] pb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#A38D5B]" />
            WebRTC Engine State
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-[#1a1a1a]">
              <span className="text-[#888888]">ICE Connection:</span>
              <span className="font-mono font-semibold text-[#ffffff] uppercase">
                {pcRef.current?.iceConnectionState || 'new'}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-[#1a1a1a]">
              <span className="text-[#888888]">Signaling State:</span>
              <span className="font-mono font-semibold text-[#ffffff] uppercase">
                {pcRef.current?.signalingState || 'stable'}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-[#1a1a1a]">
              <span className="text-[#888888]">DataChannel Status:</span>
              <span className="font-mono font-semibold text-emerald-400 uppercase">
                {dataChannelState}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-[#1a1a1a]">
              <span className="text-[#888888]">Latency (RTT):</span>
              <span className="font-mono font-semibold text-[#A38D5B]">
                {latencyMs !== null ? `${latencyMs} ms` : 'N/A'}
              </span>
            </div>

            <div className="pt-2">
              <span className="text-[#888888] block mb-1 uppercase tracking-wider text-[10px]">STUN Servers Configured:</span>
              <div className="bg-[#050505] p-2.5 rounded-sm font-mono text-[11px] text-[#d1d1d1] border border-[#222222] space-y-1">
                <div>stun:stun.l.google.com:19302</div>
                <div>stun:stun1.l.google.com:19302</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
