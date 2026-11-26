import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { startAgoraCall, startWebRtcCall } from './callDrivers.js';

/**
 * One-to-one audio/video call hook supporting both Agora RTC (when AGORA_APP_ID is configured on the server)
 * and automatic keyless WebRTC fallback (when AGORA_APP_ID is empty).
 */
export function useCall({ socketRef, sessionId, role, video, active }) {
  const [provider, setProvider] = useState(null); // 'agora' | 'webrtc' | null
  const [status, setStatus] = useState('idle'); // idle | media | connecting | connected | reconnecting | failed | error
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [facing, setFacing] = useState('user');
  const [canFlip, setCanFlip] = useState(false);
  const [remoteCamOff, setRemoteCamOff] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState(null);
  const driverRef = useRef(null);

  useEffect(() => {
    if (!active || !sessionId) return undefined;
    let dead = false;
    driverRef.current = null;
    setProvider(null);
    setMuted(false);
    setCamOff(false);
    setFacing('user');
    setCanFlip(false);
    setRemoteCamOff(false);
    setAutoplayBlocked(false);
    setError('');

    const fetchConfig = () => {
      const path = role === 'astrologer'
        ? `/astrologer/sessions/${sessionId}/call-config`
        : `/user/sessions/${sessionId}/call-config`;
      return (role === 'astrologer' ? api.vendor : api.user).post(path);
    };

    const state = {
      setStatus, setError, setMuted, setCamOff, setFacing, setCanFlip,
      setRemoteCamOff, setAutoplayBlocked, setLocalStream, setRemoteStream,
      setLocalVideoTrack, setRemoteVideoTrack,
    };

    (async () => {
      let cfg;
      try {
        setStatus('connecting');
        cfg = await fetchConfig();
      } catch (e) {
        if (!dead) {
          setStatus('error');
          setError(e?.message || 'Could not initialize call');
        }
        return;
      }
      if (dead) return;

      const selected = cfg?.provider === 'agora' ? 'agora' : 'webrtc';
      setProvider(selected);
      const driver = selected === 'agora'
        ? await startAgoraCall({ cfg, fetchConfig, video, isDead: () => dead, state })
        : await startWebRtcCall({ cfg, socketRef, sessionId, role, video, isDead: () => dead, state });

      if (dead) driver?.cleanup?.();
      else driverRef.current = driver;
    })();

    return () => {
      dead = true;
      driverRef.current?.cleanup?.();
      driverRef.current = null;
      setProvider(null);
      setLocalStream(null);
      setRemoteStream(null);
      setLocalVideoTrack(null);
      setRemoteVideoTrack(null);
      setRemoteCamOff(false);
      setCanFlip(false);
      setAutoplayBlocked(false);
      setStatus('idle');
    };
  }, [active, sessionId, role, video, socketRef]);

  const toggleMute = useCallback(() => driverRef.current?.toggleMute?.(), []);
  const toggleCam = useCallback(() => driverRef.current?.toggleCam?.(), []);
  const flip = useCallback(() => driverRef.current?.flip?.(), []);
  const resumeAudio = useCallback(() => driverRef.current?.resumeAudio?.(), []);
  const markAutoplayBlocked = useCallback(() => setAutoplayBlocked(true), []);

  return {
    provider, status, error, muted, camOff, remoteCamOff, facing, canFlip,
    autoplayBlocked, localStream, remoteStream, localVideoTrack, remoteVideoTrack,
    toggleMute, toggleCam, flip, resumeAudio, markAutoplayBlocked,
  };
}
