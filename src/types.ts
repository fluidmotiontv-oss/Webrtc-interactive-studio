export type ActiveTab = 
  | 'playground'
  | 'visualizer'
  | 'inspector'
  | 'stats'
  | 'generator'
  | 'ai';

export interface IceCandidateInfo {
  id: string;
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  type: 'host' | 'srflx' | 'prflx' | 'relay' | 'unknown';
  protocol: 'udp' | 'tcp' | 'unknown';
  ip: string;
  port: number;
  priority: number;
  timestamp: string;
}

export interface SdpBreakdown {
  version: string;
  origin: string;
  sessionName: string;
  mediaSections: {
    type: 'audio' | 'video' | 'application';
    port: number;
    protocol: string;
    codecs: string[];
    direction: string;
    iceUfrag?: string;
    icePwd?: string;
    fingerprint?: string;
    raw: string;
  }[];
  raw: string;
}

export interface WebRtcStatsData {
  timestamp: number;
  bytesSent: number;
  bytesReceived: number;
  bitrateOutKbps: number;
  bitrateInKbps: number;
  packetsLost: number;
  rttMs: number;
  videoWidth?: number;
  videoHeight?: number;
  framesPerSecond?: number;
  localCandidate?: {
    ip: string;
    port: number;
    protocol: string;
    candidateType: string;
  };
  remoteCandidate?: {
    ip: string;
    port: number;
    protocol: string;
    candidateType: string;
  };
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
}

export interface ChatMessage {
  id: string;
  sender: 'Peer A' | 'Peer B' | 'System';
  text: string;
  timestamp: string;
  type?: 'text' | 'ping' | 'file';
  fileData?: {
    name: string;
    size: number;
    type: string;
    url: string;
  };
}

export interface ConnectionStep {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  details?: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string | null;
  timestamp: string;
}
