import { IceCandidateInfo, SdpBreakdown, WebRtcStatsData } from '../types';

/**
 * Parses ICE candidate string into structured object
 */
export function parseIceCandidate(candidateStr: string): IceCandidateInfo {
  const parts = candidateStr.split(' ');
  const timestamp = new Date().toLocaleTimeString();

  if (parts.length < 8) {
    return {
      id: Math.random().toString(36).substring(2, 9),
      candidate: candidateStr,
      sdpMid: null,
      sdpMLineIndex: null,
      type: 'unknown',
      protocol: 'unknown',
      ip: 'unknown',
      port: 0,
      priority: 0,
      timestamp,
    };
  }

  // Candidate line format:
  // candidate:foundation component protocol priority ip port typ type [raddr ...] [rport ...]
  const protocol = parts[2]?.toLowerCase() === 'udp' ? 'udp' : parts[2]?.toLowerCase() === 'tcp' ? 'tcp' : 'unknown';
  const priority = parseInt(parts[3] || '0', 10);
  const ip = parts[4] || '127.0.0.1';
  const port = parseInt(parts[5] || '0', 10);

  let type: 'host' | 'srflx' | 'prflx' | 'relay' | 'unknown' = 'unknown';
  const typIndex = parts.indexOf('typ');
  if (typIndex !== -1 && parts[typIndex + 1]) {
    const rawType = parts[typIndex + 1].toLowerCase();
    if (rawType === 'host' || rawType === 'srflx' || rawType === 'prflx' || rawType === 'relay') {
      type = rawType;
    }
  }

  return {
    id: Math.random().toString(36).substring(2, 9),
    candidate: candidateStr,
    sdpMid: null,
    sdpMLineIndex: null,
    type,
    protocol,
    ip,
    port,
    priority,
    timestamp,
  };
}

/**
 * Parses SDP text into structured components
 */
export function parseSdp(sdpText: string): SdpBreakdown {
  if (!sdpText) {
    return {
      version: '0',
      origin: 'N/A',
      sessionName: 'N/A',
      mediaSections: [],
      raw: '',
    };
  }

  const lines = sdpText.split('\n').map((l) => l.trim());
  let version = '0';
  let origin = 'Unknown';
  let sessionName = 'Unknown';
  const mediaSections: SdpBreakdown['mediaSections'] = [];

  let currentMedia: SdpBreakdown['mediaSections'][0] | null = null;

  for (const line of lines) {
    if (line.startsWith('v=')) {
      version = line.substring(2);
    } else if (line.startsWith('o=')) {
      origin = line.substring(2);
    } else if (line.startsWith('s=')) {
      sessionName = line.substring(2);
    } else if (line.startsWith('m=')) {
      if (currentMedia) {
        mediaSections.push(currentMedia);
      }
      const parts = line.substring(2).split(' ');
      const mediaType = parts[0] as 'audio' | 'video' | 'application';
      const port = parseInt(parts[1] || '0', 10);
      const protocol = parts[2] || '';
      
      currentMedia = {
        type: mediaType || 'video',
        port,
        protocol,
        codecs: [],
        direction: 'sendrecv',
        raw: line,
      };
    } else if (currentMedia) {
      currentMedia.raw += '\n' + line;
      if (line.startsWith('a=rtpmap:')) {
        const codecInfo = line.substring(9).split(' ')[1] || line.substring(9);
        currentMedia.codecs.push(codecInfo);
      } else if (line.startsWith('a=sendrecv') || line.startsWith('a=sendonly') || line.startsWith('a=recvonly') || line.startsWith('a=inactive')) {
        currentMedia.direction = line.substring(2);
      } else if (line.startsWith('a=ice-ufrag:')) {
        currentMedia.iceUfrag = line.substring(12);
      } else if (line.startsWith('a=ice-pwd:')) {
        currentMedia.icePwd = line.substring(10);
      } else if (line.startsWith('a=fingerprint:')) {
        currentMedia.fingerprint = line.substring(14);
      }
    }
  }

  if (currentMedia) {
    mediaSections.push(currentMedia);
  }

  return {
    version,
    origin,
    sessionName,
    mediaSections,
    raw: sdpText,
  };
}

/**
 * Creates a synthetic animated video stream using HTML5 Canvas
 * Perfect for test environments without physical cameras or when permissions are pending
 */
export function createSyntheticVideoStream(label = 'Peer Stream', fps = 30): MediaStream {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d')!;

  let x = 100;
  let y = 100;
  let dx = 4;
  let dy = 3;
  let angle = 0;

  const draw = () => {
    // Dark futuristic canvas background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // Bouncing orb
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 36, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(x, y, 5, x, y, 36);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(1, '#6366f1');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.restore();

    // Rotating Radar Ring
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(angle);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 120, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Header Overlay
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`📡 WebRTC Test Stream: ${label}`, 20, 40);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px monospace';
    const timestamp = new Date().toISOString().substring(11, 23);
    ctx.fillText(`Timestamp: ${timestamp} | FPS: ${fps}`, 20, 68);

    // Bouncing movement logic
    x += dx;
    y += dy;
    if (x + 36 > canvas.width || x - 36 < 0) dx = -dx;
    if (y + 36 > canvas.height || y - 36 < 0) dy = -dy;
    angle += 0.02;

    requestAnimationFrame(draw);
  };

  draw();
  return canvas.captureStream(fps);
}

/**
 * Formats bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
