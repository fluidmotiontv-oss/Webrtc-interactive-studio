import React, { useState } from 'react';
import { IceCandidateInfo } from '../types';
import { parseSdp } from '../utils/webrtcHelpers';
import { Radio, Copy, Check, Filter, Search, Globe, Shield, Terminal, Code2 } from 'lucide-react';

interface SdpIceInspectorProps {
  sdpOffer: string;
  sdpAnswer: string;
  iceCandidates: IceCandidateInfo[];
}

export const SdpIceInspector: React.FC<SdpIceInspectorProps> = ({
  sdpOffer,
  sdpAnswer,
  iceCandidates,
}) => {
  const [activeTab, setActiveTab] = useState<'offer' | 'answer' | 'ice'>('offer');
  const [filterCandidateType, setFilterCandidateType] = useState<string>('all');
  const [copiedText, setCopiedText] = useState(false);

  const activeSdpText = activeTab === 'offer' ? sdpOffer : sdpAnswer;
  const parsedSdp = parseSdp(activeSdpText);

  const handleCopySdp = () => {
    if (activeSdpText) {
      navigator.clipboard.writeText(activeSdpText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const filteredCandidates = iceCandidates.filter((c) => {
    if (filterCandidateType === 'all') return true;
    return c.type === filterCandidateType;
  });

  return (
    <div id="sdp-ice-inspector-container" className="space-y-6">
      {/* Inspector Header */}
      <div className="bg-[#0a0a0a] border border-[#222222] rounded-sm p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-[#141414] border border-[#333333] flex items-center justify-center text-[#A38D5B]">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif italic text-white" style={{ fontFamily: 'Georgia, serif' }}>
                SDP & ICE Candidate Inspector
              </h2>
              <p className="text-xs text-[#888888] uppercase tracking-wider font-sans mt-0.5">
                Examine Session Description Protocol (SDP) line attributes, media capabilities, audio/video codecs, and ICE candidate traversal types.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#050505] p-1 rounded-sm border border-[#222222]">
            <button
              id="inspector-tab-offer"
              onClick={() => setActiveTab('offer')}
              className={`px-3.5 py-1.5 rounded-sm text-xs uppercase tracking-wider font-semibold transition-all ${
                activeTab === 'offer'
                  ? 'bg-[#A38D5B] text-[#050505] font-bold shadow'
                  : 'text-[#888888] hover:text-[#ffffff]'
              }`}
            >
              SDP Offer
            </button>
            <button
              id="inspector-tab-answer"
              onClick={() => setActiveTab('answer')}
              className={`px-3.5 py-1.5 rounded-sm text-xs uppercase tracking-wider font-semibold transition-all ${
                activeTab === 'answer'
                  ? 'bg-[#A38D5B] text-[#050505] font-bold shadow'
                  : 'text-[#888888] hover:text-[#ffffff]'
              }`}
            >
              SDP Answer
            </button>
            <button
              id="inspector-tab-ice"
              onClick={() => setActiveTab('ice')}
              className={`px-3.5 py-1.5 rounded-sm text-xs uppercase tracking-wider font-semibold transition-all ${
                activeTab === 'ice'
                  ? 'bg-[#A38D5B] text-[#050505] font-bold shadow'
                  : 'text-[#888888] hover:text-[#ffffff]'
              }`}
            >
              ICE Candidates ({iceCandidates.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab !== 'ice' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Parsed SDP Anatomy */}
          <div className="bg-[#0a0a0a] border border-[#222222] rounded-sm p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-[#222222] pb-3 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[#A38D5B]" />
              Parsed SDP Attributes
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-[#1a1a1a]">
                <span className="text-[#888888]">SDP Version (v=):</span>
                <span className="font-mono text-[#ffffff]">{parsedSdp.version}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-[#1a1a1a]">
                <span className="text-[#888888]">Session Name (s=):</span>
                <span className="font-mono text-[#ffffff]">{parsedSdp.sessionName}</span>
              </div>

              <div className="py-2 border-b border-[#1a1a1a]">
                <span className="text-[#888888] block mb-1">Origin (o=):</span>
                <div className="font-mono text-[10px] bg-[#050505] p-2 rounded-sm text-[#A38D5B] border border-[#222222] break-all">
                  {parsedSdp.origin}
                </div>
              </div>

              <div>
                <span className="text-[#888888] block mb-2 font-semibold uppercase tracking-wider text-[10px]">Media Sections Found:</span>
                {parsedSdp.mediaSections.length === 0 ? (
                  <p className="text-[#555555] italic text-[11px]">No media sections parsed yet. Initiate a WebRTC connection first.</p>
                ) : (
                  parsedSdp.mediaSections.map((m, idx) => (
                    <div key={idx} className="bg-[#050505] p-3 rounded-sm border border-[#222222] space-y-1.5 mb-2">
                      <div className="flex justify-between font-bold text-[#ffffff] uppercase text-[11px]">
                        <span>Media: {m.type}</span>
                        <span className="text-[#A38D5B]">Port: {m.port}</span>
                      </div>
                      <div className="text-[10px] text-[#888888] font-mono">Protocol: {m.protocol}</div>
                      {m.codecs.length > 0 && (
                        <div className="text-[10px] text-emerald-400 font-mono">
                          Codecs: {m.codecs.join(', ')}
                        </div>
                      )}
                      {m.iceUfrag && (
                        <div className="text-[10px] text-[#888888] font-mono truncate">
                          ICE Ufrag: <span className="text-[#A38D5B]">{m.iceUfrag}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Raw SDP Code View */}
          <div className="lg:col-span-2 bg-[#0a0a0a] border border-[#222222] rounded-sm p-5 shadow-xl flex flex-col h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#A38D5B]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Raw SDP Text Blob ({activeTab === 'offer' ? 'Offer' : 'Answer'})
                </h3>
              </div>

              <button
                id="copy-sdp-button"
                onClick={handleCopySdp}
                disabled={!activeSdpText}
                className="px-3 py-1.5 rounded-sm bg-[#141414] hover:bg-[#222222] text-xs text-[#ffffff] border border-[#333333] flex items-center gap-1.5 transition-colors disabled:opacity-40 uppercase tracking-wider font-semibold"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedText ? 'Copied!' : 'Copy SDP Text'}
              </button>
            </div>

            <div className="flex-1 mt-3 bg-[#050505] p-4 rounded-sm border border-[#222222] overflow-y-auto font-mono text-[11px] text-[#d1d1d1] leading-relaxed scrollbar-thin">
              {activeSdpText ? (
                <pre className="whitespace-pre-wrap">{activeSdpText}</pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[#555555] text-xs">
                  No {activeTab} SDP generated yet. Initialize a WebRTC peer connection to generate an offer or answer.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ICE Candidate Table View */
        <div className="bg-[#0a0a0a] border border-[#222222] rounded-sm p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222222] pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#A38D5B]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Discovered ICE Candidates ({filteredCandidates.length})
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#888888]" />
              <select
                id="filter-candidate-type-select"
                value={filterCandidateType}
                onChange={(e) => setFilterCandidateType(e.target.value)}
                className="bg-[#050505] border border-[#222222] rounded-sm px-3 py-1.5 text-xs text-[#ffffff] focus:outline-none focus:border-[#A38D5B]"
              >
                <option value="all">All Candidate Types</option>
                <option value="host">Host (LAN / Local IP)</option>
                <option value="srflx">Server Reflexive (STUN / Public IP)</option>
                <option value="relay">Relay (TURN Server)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#888888] uppercase text-[10px] font-mono">
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3">Port</th>
                  <th className="py-2.5 px-3">Protocol</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Discovered At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a] font-mono">
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#555555] italic">
                      No ICE candidates gathered yet.
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((cand) => (
                    <tr key={cand.id} className="hover:bg-[#050505] transition-colors">
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase ${
                            cand.type === 'host'
                              ? 'bg-[#141414] text-[#A38D5B] border border-[#333333]'
                              : cand.type === 'srflx'
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                              : cand.type === 'relay'
                              ? 'bg-purple-950/40 text-purple-400 border border-purple-800/40'
                              : 'bg-[#141414] text-[#888888]'
                          }`}
                        >
                          {cand.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#ffffff]">{cand.ip}</td>
                      <td className="py-3 px-3 text-[#d1d1d1]">{cand.port}</td>
                      <td className="py-3 px-3 text-[#888888] uppercase">{cand.protocol}</td>
                      <td className="py-3 px-3 text-[#888888]">{cand.priority}</td>
                      <td className="py-3 px-3 text-[#666666]">{cand.timestamp}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
