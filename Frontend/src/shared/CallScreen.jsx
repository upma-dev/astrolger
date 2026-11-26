import { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, SwitchCamera, MessageCircle, Volume2 } from 'lucide-react';
import { useCall } from './useCall.js';

const STATUS_TEXT = {
  idle: 'Starting…',
  connecting: 'Connecting…',
  connected: '',
  reconnecting: 'Reconnecting… (weak network)',
  failed: 'Connection lost',
  error: '',
};

function Media({ stream, muted, mirror, className, onBlocked }) {
  const ref = useRef(null);
  const blockedCb = useRef(onBlocked);
  blockedCb.current = onBlocked;
  useEffect(() => {
    const el = ref.current;
    if (!el || el.srcObject === stream) return;
    el.srcObject = stream || null;
    if (stream) el.play?.().catch(() => blockedCb.current?.());
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} style={mirror ? { transform: 'scaleX(-1)' } : undefined} />;
}

function TrackView({ track, mirror = false, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return undefined;
    track.play(el, { fit: 'cover', mirror });
    return () => {
      try { track.stop(); } catch { /* stopped */ }
    };
  }, [track, mirror]);
  return <div ref={ref} className={className} />;
}

const initials = (n = '') => n.replace(/^(Pt\.|Dr\.|Acharya|Guru|Swami)\s+/i, '').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase() || '?';

function Btn({ on, danger, label, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className={`flex h-14 w-14 items-center justify-center rounded-full transition active:scale-95 ${danger ? 'bg-rose-600 text-white hover:bg-rose-700' : on ? 'bg-white text-slate-900' : 'bg-white/15 text-white hover:bg-white/25'}`}>
      {children}
    </button>
  );
}

/**
 * Full call view for an active audio/video session (uses Agora when configured, else keyless WebRTC).
 * Keeps running while hidden (`hidden`), so the user can switch to chat without dropping the call.
 */
export default function CallScreen({ socketRef, sessionId, role, type, active, peerName, peerAvatar, timer, onEnd, onShowChat, unread = 0, hidden = false }) {
  const video = type === 'video';
  const call = useCall({ socketRef, sessionId, role, video, active });
  const isAgora = call.provider === 'agora';
  const remoteHasVideo = video && !call.remoteCamOff && (
    isAgora ? !!call.remoteVideoTrack : !!call.remoteStream?.getVideoTracks().some((t) => t.readyState === 'live')
  );
  const statusText = call.status === 'error'
    ? call.error
    : call.status === 'media'
      ? (video ? 'Allow camera & microphone' : 'Allow microphone')
      : STATUS_TEXT[call.status] ?? '';

  return (
    <div className={`relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-[#3b1d12] text-white ${hidden ? 'hidden' : ''}`}>
      {/* Remote video (or avatar for voice calls / camera off) */}
      {remoteHasVideo ? (
        isAgora
          ? <TrackView track={call.remoteVideoTrack} className="absolute inset-0 h-full w-full bg-black" />
          : <Media stream={call.remoteStream} className="absolute inset-0 h-full w-full bg-black object-cover" onBlocked={call.markAutoplayBlocked} />
      ) : (
        <>
          {!isAgora && <Media stream={call.remoteStream} className="hidden" onBlocked={call.markAutoplayBlocked} />}
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className={`relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-white/10 text-4xl font-bold ring-4 ring-white/10 ${call.status === 'connected' ? '' : 'animate-pulse'}`}>
              {peerAvatar ? <img src={peerAvatar} alt="" className="h-full w-full object-cover" /> : initials(peerName)}
            </div>
            <div>
              <p className="text-xl font-bold">{peerName}</p>
              <p className="mt-1 text-sm text-white/70">{call.status === 'connected' ? (video ? 'Camera is off' : timer) : (video ? 'Video call' : 'Voice call')}</p>
            </div>
          </div>
        </>
      )}

      {/* Top bar: timer + status */}
      <div className="relative z-10 flex items-center justify-between gap-2 bg-gradient-to-b from-black/50 to-transparent px-4 pt-3 pb-6">
        <div>
          {remoteHasVideo && <p className="text-sm font-bold drop-shadow">{peerName}</p>}
          <p className="text-xs font-semibold text-white/80 drop-shadow">{timer}</p>
        </div>
        {onShowChat && (
          <button type="button" onClick={onShowChat} className="relative flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur hover:bg-white/25">
            <MessageCircle size={14} /> Chat
            {unread > 0 && <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px]">{unread}</span>}
          </button>
        )}
      </div>

      {statusText && (
        <div className={`relative z-10 mx-auto mt-1 max-w-[90%] rounded-full px-3 py-1.5 text-center text-xs font-semibold backdrop-blur ${call.status === 'error' ? 'bg-rose-600/90' : 'bg-black/40'}`}>{statusText}</div>
      )}
      {call.autoplayBlocked && (
        <button type="button" onClick={() => { document.querySelectorAll('video').forEach((v) => v.play?.().catch(() => {})); call.resumeAudio(); }}
          className="relative z-10 mx-auto mt-2 flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-white">
          <Volume2 size={14} /> Tap to hear the call
        </button>
      )}

      {/* Own camera preview */}
      {video && (call.localVideoTrack || call.localStream) && (
        <div className="absolute top-16 right-3 z-20 h-40 w-28 overflow-hidden rounded-2xl bg-black shadow-xl ring-2 ring-white/20 sm:h-48 sm:w-36">
          {call.camOff ? (
            <div className="flex h-full w-full items-center justify-center text-white/60"><VideoOff size={22} /></div>
          ) : isAgora ? (
            <TrackView track={call.localVideoTrack} mirror={call.facing === 'user'} className="h-full w-full" />
          ) : (
            <Media stream={call.localStream} muted mirror={call.facing === 'user'} className="h-full w-full object-cover" />
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* Controls */}
      <div className="relative z-10 flex items-center justify-center gap-4 bg-gradient-to-t from-black/60 to-transparent px-4 pt-8 pb-6">
        <Btn on={call.muted} label={call.muted ? 'Unmute' : 'Mute'} onClick={call.toggleMute}>{call.muted ? <MicOff size={22} /> : <Mic size={22} />}</Btn>
        {video && <Btn on={call.camOff} label={call.camOff ? 'Turn camera on' : 'Turn camera off'} onClick={call.toggleCam}>{call.camOff ? <VideoOff size={22} /> : <Video size={22} />}</Btn>}
        {video && call.canFlip && <Btn label="Switch camera" onClick={call.flip}><SwitchCamera size={22} /></Btn>}
        <Btn danger label="End call" onClick={onEnd}><PhoneOff size={24} /></Btn>
      </div>
    </div>
  );
}
