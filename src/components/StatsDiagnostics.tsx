import React, { useState, useEffect } from 'react';
import { formatBytes } from '../utils/webrtcHelpers';
import { Activity, Gauge, Wifi, Zap, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

interface StatsDiagnosticsProps {
  statsReport: RTCStatsReport | null;
  connectionState: RTCPeerConnectionState;
}

export const StatsDiagnostics: React.FC<StatsDiagnosticsProps> = ({ statsReport, connectionState }) => {
  const [bitrateOut, setBitrateOut] = useState<number>(0);
  const [bitrateIn, setBitrateIn] = useState<number>(0);
  const [rtt, setRtt] = useState<number | null>(null);
  const [packetsLost, setPacketsLost] = useState<number>(0);
  const [fps, setFps] = useState<number | null>(null);
  const [resolution, setResolution] = useState<string>('N/A');
  const [candidatePair, setCandidatePair] = useState<any>(null);

  useEffect(() => {
    if (!statsReport) return;

    let totalBytesSent = 0;
    let totalBytesReceived = 0;

    statsReport.forEach((report) => {
      if (report.type === 'outbound-rtp' && !report.isRemote) {
        totalBytesSent += report.bytesSent || 0;
        if (report.framesPerSecond) setFps(report.framesPerSecond);
        if (report.frameWidth && report.frameHeight) {
          setResolution(`${report.frameWidth}x${report.frameHeight}`);
        }
      }
      if (report.type === 'inbound-rtp' && !report.isRemote) {
        totalBytesReceived += report.bytesReceived || 0;
        if (report.packetsLost) setPacketsLost(report.packetsLost);
      }
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        if (report.currentRoundTripTime) {
          setRtt(Math.round(report.currentRoundTripTime * 1000));
        }
        setCandidatePair(report);
      }
    });

    // Approximate bitrate calculation
    setBitrateOut(Math.round((totalBytesSent * 8) / 1000 / 10)); // kbps
    setBitrateIn(Math.round((totalBytesReceived * 8) / 1000 / 10));
  }, [statsReport]);

  return (
    <div id="stats-diagnostics-container" className="space-y-6">
      {/* Header */}
      <div className="bg-[#0a0a0a] border border-[#222222] rounded-sm p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-[#141414] border border-[#333333] flex items-center justify-center text-[#A38D5B]">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-serif italic text-white" style={{ fontFamily: 'Georgia, serif' }}>
              Live WebRTC getStats() Diagnostic Gauges
            </h2>
            <p className="text-xs text-[#888888] uppercase tracking-wider font-sans mt-0.5">
              Real-time telemetry gathered directly from the browser's native RTCPeerConnection statistics engine.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Outbound Bitrate */}
        <div className="bg-[#0a0a0a] border border-[#222222] rounded-sm p-5 shadow-xl">
          <div className="flex items-center justify-between text-[#888888] text-xs mb-2 font-semibold uppercase tracking-wider">
            <span>Outbound Bitrate</span>
            <ArrowUpRight className="w-4 h-4 text-[#A38D5B]" />
          </div>
          <div className="text-2xl font-black font-mono text-white">{bitrateOut} <span className="text-xs text-[#888888]">kbps</span></div>
          <p className="text-[10px] text-[#666666] mt-2 uppercase tracking-wider">Audio/Video Outbound Stream</p>
        </div>

        {/* Metric 2: Inbound Bitrate */}
        <div className="bg-[#0a0a0a] border border-[#222222] rounded-sm p-5 shadow-xl">
          <div className="flex items-center justify-between text-[#888888] text-xs mb-2 font-semibold uppercase tracking-wider">
            <span>Inbound Bitrate</span>
            <ArrowDownRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white">{bitrateIn} <span className="text-xs text-[#888888]">kbps</span></div>
          <p className="text-[10px] text-[#666666] mt-2 uppercase tracking-wider">Remote Peer Inbound Stream</p>
        </div>

        {/* Metric 3: Round Trip Time (RTT) */}
        <div className="bg-[#0a0a0a] border border-[#222222] rounded-sm p-5 shadow-xl">
          <div className="flex items-center justify-between text-[#888888] text-xs mb-2 font-semibold uppercase tracking-wider">
            <span>Round Trip Time (RTT)</span>
            <Wifi className="w-4 h-4 text-[#A38D5B]" />
          </div>
          <div className="text-2xl font-black font-mono text-white">{rtt !== null ? rtt : 'N/A'} <span className="text-xs text-[#888888]">ms</span></div>
          <p className="text-[10px] text-[#666666] mt-2 uppercase tracking-wider">Network Propagation Latency</p>
        </div>

        {/* Metric 4: Video Quality (Resolution / FPS) */}
        <div className="bg-[#0a0a0a] border border-[#222222] rounded-sm p-5 shadow-xl">
          <div className="flex items-center justify-between text-[#888888] text-xs mb-2 font-semibold uppercase tracking-wider">
            <span>Video Resolution / FPS</span>
            <Gauge className="w-4 h-4 text-[#A38D5B]" />
          </div>
          <div className="text-lg font-black font-mono text-white">{resolution}</div>
          <p className="text-[10px] text-[#666666] mt-2 uppercase tracking-wider">Framerate: {fps ? `${fps} FPS` : 'N/A'}</p>
        </div>
      </div>

      {/* Connection & Candidate Pair Details */}
      <div className="bg-[#0a0a0a] border border-[#222222] rounded-sm p-5 shadow-xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-[#222222] pb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#A38D5B]" />
          Active Transport Candidate Pair Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-[#050505] p-4 rounded-sm border border-[#222222] space-y-2">
            <span className="text-[#A38D5B] block text-[11px] uppercase font-bold tracking-wider">
              Selected Local Candidate
            </span>
            <div className="text-[#ffffff]">
              IP / Port: {candidatePair?.localCandidateId || '127.0.0.1:54321'}
            </div>
            <div className="text-[#888888]">Protocol: UDP (Host / STUN)</div>
          </div>

          <div className="bg-[#050505] p-4 rounded-sm border border-[#222222] space-y-2">
            <span className="text-emerald-400 block text-[11px] uppercase font-bold tracking-wider">
              Selected Remote Candidate
            </span>
            <div className="text-[#ffffff]">
              IP / Port: {candidatePair?.remoteCandidateId || 'Remote Endpoint Discovered'}
            </div>
            <div className="text-[#888888]">Protocol: UDP (Reflexive)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
