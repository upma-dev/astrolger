/* Call transport drivers: Agora RTC (when backend has AGORA_APP_ID) and keyless WebRTC fallback. */

export function mediaErrorMessage(err, video) {
  const code = String(err?.code || err?.name || err?.message || '');
  if (/NotAllowedError|PERMISSION_DENIED/i.test(code)) {
    return video
      ? 'Camera / microphone permission was denied. Allow it in the browser settings and reload.'
      : 'Microphone permission was denied. Allow it in the browser settings and reload.';
  }
  if (/NotFoundError|DEVICE_NOT_FOUND/i.test(code)) {
    return video ? 'No camera or microphone found on this device.' : 'No microphone found on this device.';
  }
  return window.isSecureContext
    ? `Could not start ${video ? 'camera' : 'microphone'}: ${err?.message || code}`
    : 'Calls need a secure (https) connection.';
}

const emitAck = (socket, ev, payload, ms = 5000) => new Promise((resolve) => {
  const t = setTimeout(() => resolve(null), ms);
  socket.emit(ev, payload, (r) => { clearTimeout(t); resolve(r); });
});

export async function startAgoraCall({ cfg, fetchConfig, video, isDead, state }) {
  const { default: AgoraRTC } = await import('agora-rtc-sdk-ng');
  if (isDead()) return null;
  AgoraRTC.setLogLevel(2);

  state.setStatus('media');
  let audioTrack = null;
  let videoTrack = null;
  try {
    if (video) {
      [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        { AEC: true, ANS: true, AGC: true },
        { facingMode: 'user', encoderConfig: '720p_1' },
      );
    } else {
      audioTrack = await AgoraRTC.createMicrophoneAudioTrack({ AEC: true, ANS: true, AGC: true });
    }
  } catch (e) {
    if (!isDead()) {
      state.setStatus('error');
      state.setError(mediaErrorMessage(e, video));
    }
    return null;
  }

  if (isDead()) {
    try { audioTrack?.stop(); audioTrack?.close(); } catch { /* ignore */ }
    try { videoTrack?.stop(); videoTrack?.close(); } catch { /* ignore */ }
    return null;
  }

  state.setLocalVideoTrack(videoTrack);
  if (video) {
    AgoraRTC.getCameras(true).then((cams) => { if (!isDead()) state.setCanFlip(cams.length > 1); }).catch(() => {});
  }

  const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  let remoteAudio = null;
  let muted = false;
  let camOff = false;
  let facing = 'user';

  const syncConnection = () => {
    if (isDead()) return;
    const cs = client.connectionState;
    if (cs === 'RECONNECTING' || cs === 'DISCONNECTED') state.setStatus('reconnecting');
    else if (cs === 'CONNECTED') state.setStatus(client.remoteUsers.length > 0 ? 'connected' : 'connecting');
  };

  AgoraRTC.onAutoplayFailed = () => { if (!isDead()) state.setAutoplayBlocked(true); };
  client.on('connection-state-change', syncConnection);
  client.on('user-joined', () => { if (!isDead() && client.connectionState === 'CONNECTED') state.setStatus('connected'); });
  client.on('user-left', () => {
    if (isDead()) return;
    try { remoteAudio?.stop(); } catch { /* ignore */ }
    remoteAudio = null;
    state.setRemoteVideoTrack(null);
    state.setRemoteCamOff(false);
    if (client.remoteUsers.length === 0 && client.connectionState === 'CONNECTED') state.setStatus('reconnecting');
  });
  client.on('user-published', async (remoteUser, mediaType) => {
    if (isDead()) return;
    try {
      await client.subscribe(remoteUser, mediaType);
      if (isDead()) return;
      state.setStatus('connected');
      if (mediaType === 'audio' && remoteUser.audioTrack) {
        try { remoteAudio?.stop(); } catch { /* ignore */ }
        remoteAudio = remoteUser.audioTrack;
        remoteUser.audioTrack.play();
      }
      if (mediaType === 'video' && remoteUser.videoTrack) {
        state.setRemoteVideoTrack(remoteUser.videoTrack);
        state.setRemoteCamOff(false);
      }
    } catch (e) { console.warn('[agora] subscribe', e?.message || e); }
  });
  client.on('user-unpublished', (_remoteUser, mediaType) => {
    if (isDead()) return;
    if (mediaType === 'audio') {
      try { remoteAudio?.stop(); } catch { /* ignore */ }
      remoteAudio = null;
    }
    if (mediaType === 'video') {
      state.setRemoteVideoTrack(null);
      state.setRemoteCamOff(true);
    }
  });
  client.on('token-privilege-will-expire', async () => {
    try {
      const fresh = await fetchConfig();
      if (!isDead() && fresh?.token) await client.renewToken(fresh.token);
    } catch (e) { console.warn('[agora] token renew', e?.message || e); }
  });

  const cleanup = () => {
    AgoraRTC.onAutoplayFailed = null;
    try { audioTrack?.stop(); audioTrack?.close(); } catch { /* ignore */ }
    try { videoTrack?.stop(); videoTrack?.close(); } catch { /* ignore */ }
    try { remoteAudio?.stop(); } catch { /* ignore */ }
    try { client.removeAllListeners(); } catch { /* ignore */ }
    client.leave().catch(() => {});
  };

  try {
    state.setStatus('connecting');
    await client.join(cfg.appId, cfg.channel, cfg.token || null, cfg.uid);
    if (isDead()) { cleanup(); return null; }
    await client.publish(videoTrack ? [audioTrack, videoTrack] : [audioTrack]);
    if (isDead()) { cleanup(); return null; }
    syncConnection();
  } catch (e) {
    cleanup();
    if (!isDead()) {
      state.setStatus('error');
      state.setError(e?.message || 'Could not connect to Agora call');
    }
    return null;
  }

  return {
    toggleMute: async () => {
      const next = !muted;
      try { await audioTrack.setMuted(next); muted = next; state.setMuted(next); } catch (e) { console.warn('[agora] mute', e?.message || e); }
    },
    toggleCam: async () => {
      if (!videoTrack) return;
      const next = !camOff;
      try { await videoTrack.setEnabled(!next); camOff = next; state.setCamOff(next); } catch (e) { console.warn('[agora] cam', e?.message || e); }
    },
    flip: async () => {
      if (!videoTrack) return;
      const next = facing === 'user' ? 'environment' : 'user';
      try {
        await videoTrack.setDevice({ facingMode: next });
        facing = next;
        state.setFacing(next);
      } catch (e) {
        try {
          const cams = await AgoraRTC.getCameras(true);
          const other = cams.find((c) => c.label !== videoTrack.getTrackLabel?.()) || cams[1];
          if (other?.deviceId) { await videoTrack.setDevice(other.deviceId); facing = next; state.setFacing(next); return; }
        } catch { /* fallback failed */ }
        console.warn('[agora] flip', e?.message || e);
      }
    },
    resumeAudio: () => {
      try { remoteAudio?.play(); state.setAutoplayBlocked(false); } catch (e) { console.warn('[agora] resumeAudio', e?.message || e); }
    },
    cleanup,
  };
}

export async function startWebRtcCall({ cfg, socketRef, sessionId, role, video, isDead, state }) {
  state.setStatus('media');
  let local = null;
  try {
    local = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: video ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    });
  } catch (e) {
    if (!isDead()) {
      state.setStatus('error');
      state.setError(mediaErrorMessage(e, video));
    }
    return null;
  }

  if (isDead()) {
    local.getTracks().forEach((t) => t.stop());
    return null;
  }

  state.setLocalStream(local);
  if (video) {
    navigator.mediaDevices.enumerateDevices()
      .then((d) => { if (!isDead()) state.setCanFlip(d.filter((x) => x.kind === 'videoinput').length > 1); })
      .catch(() => {});
  }

  let ice = cfg?.iceServers;
  if (!ice?.length && socketRef?.current) {
    const res = await emitAck(socketRef.current, 'rtc:ice');
    ice = res?.iceServers;
  }
  if (isDead()) {
    local.getTracks().forEach((t) => t.stop());
    return null;
  }
  const iceServers = ice?.length ? ice : [{ urls: 'stun:stun.l.google.com:19302' }];

  const st = { pc: null, pending: [], peer: Math.random().toString(36).slice(2), lastPeer: '', gotOffer: false, facing: 'user' };
  let retry = null;
  const signal = (data) => socketRef?.current?.emit('rtc:signal', { sessionId, data });
  const closePc = () => { try { st.pc?.close(); } catch { /* closed */ } st.pc = null; st.pending = []; };

  const makePc = () => {
    closePc();
    const pc = new RTCPeerConnection({ iceServers });
    st.pc = pc;
    local.getTracks().forEach((t) => pc.addTrack(t, local));
    pc.ontrack = (e) => {
      if (!isDead()) state.setRemoteStream(new MediaStream((e.streams[0] || new MediaStream([e.track])).getTracks()));
    };
    pc.onicecandidate = (e) => { if (e.candidate) signal({ candidate: e.candidate.toJSON() }); };
    pc.onconnectionstatechange = () => {
      if (isDead() || st.pc !== pc) return;
      const cs = pc.connectionState;
      if (cs === 'connected') {
        state.setStatus('connected');
        const vt = local.getVideoTracks()[0];
        if (vt) signal({ type: 'cam', off: !vt.enabled });
      } else if (cs === 'disconnected') {
        state.setStatus('reconnecting');
      } else if (cs === 'failed') {
        state.setStatus('reconnecting');
        if (role === 'astrologer') setTimeout(() => !isDead() && offer(), 500);
        else { st.gotOffer = false; startRetry(); }
      }
    };
    return pc;
  };

  const flush = async () => {
    const list = st.pending;
    st.pending = [];
    for (const c of list) { try { await st.pc?.addIceCandidate(c); } catch { /* stale */ } }
  };

  const offer = async () => {
    const pc = makePc();
    const o = await pc.createOffer();
    await pc.setLocalDescription(o);
    signal({ sdp: pc.localDescription.toJSON() });
    state.setStatus((prev) => (prev === 'connected' ? 'reconnecting' : 'connecting'));
  };

  const startRetry = () => {
    clearInterval(retry);
    signal({ type: 'ready', peer: st.peer });
    retry = setInterval(() => {
      if (!st.gotOffer) signal({ type: 'ready', peer: st.peer });
      else clearInterval(retry);
    }, 3000);
  };

  const onSignal = async ({ from, data } = {}) => {
    if (isDead() || !data || from === role) return;
    try {
      if (data.type === 'ready' && role === 'astrologer') {
        const healthy = st.pc && ['connected', 'connecting', 'new'].includes(st.pc.connectionState);
        if (data.peer === st.lastPeer && healthy && st.pc.signalingState !== 'closed') return;
        st.lastPeer = data.peer;
        await offer();
      } else if (data.type === 'hello' && role === 'user') {
        st.gotOffer = false;
        startRetry();
      } else if (data.sdp?.type === 'offer' && role === 'user') {
        st.gotOffer = true;
        clearInterval(retry);
        const pc = makePc();
        await pc.setRemoteDescription(data.sdp);
        await flush();
        const a = await pc.createAnswer();
        await pc.setLocalDescription(a);
        signal({ sdp: pc.localDescription.toJSON() });
        state.setStatus((prev) => (prev === 'connected' ? prev : 'connecting'));
      } else if (data.sdp?.type === 'answer' && role === 'astrologer') {
        if (st.pc?.signalingState === 'have-local-offer') { await st.pc.setRemoteDescription(data.sdp); await flush(); }
      } else if (data.type === 'cam') {
        state.setRemoteCamOff(!!data.off);
      } else if (data.candidate) {
        if (st.pc?.remoteDescription) await st.pc.addIceCandidate(data.candidate);
        else st.pending.push(data.candidate);
      }
    } catch (e) { console.warn('[call]', e.message); }
  };

  const announce = () => { if (role === 'astrologer') signal({ type: 'hello' }); else startRetry(); };
  state.setStatus('connecting');
  socketRef?.current?.on('rtc:signal', onSignal);
  socketRef?.current?.on('connect', announce);
  announce();

  return {
    toggleMute: () => {
      const t = local.getAudioTracks()[0];
      if (!t) return;
      t.enabled = !t.enabled;
      state.setMuted(!t.enabled);
    },
    toggleCam: () => {
      const t = local.getVideoTracks()[0];
      if (!t) return;
      t.enabled = !t.enabled;
      state.setCamOff(!t.enabled);
      signal({ type: 'cam', off: !t.enabled });
    },
    flip: async () => {
      const next = st.facing === 'user' ? 'environment' : 'user';
      try {
        let s;
        try {
          s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: next } } });
        } catch {
          const cams = (await navigator.mediaDevices.enumerateDevices()).filter((x) => x.kind === 'videoinput');
          const old = local.getVideoTracks()[0];
          const other = cams.find((c) => c.label !== old?.label) || cams[1];
          if (!other?.deviceId) throw new Error('No alternate camera');
          s = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: other.deviceId } } });
        }
        const track = s.getVideoTracks()[0];
        const old = local.getVideoTracks()[0];
        track.enabled = old ? old.enabled : true;
        await st.pc?.getSenders().find((x) => x.track?.kind === 'video')?.replaceTrack(track);
        if (old) { local.removeTrack(old); old.stop(); }
        local.addTrack(track);
        state.setLocalStream(new MediaStream(local.getTracks()));
        st.facing = next;
        state.setFacing(next);
      } catch (e) { console.warn('[call] flip', e.message); }
    },
    resumeAudio: () => { state.setAutoplayBlocked(false); },
    cleanup: () => {
      clearInterval(retry);
      socketRef?.current?.off('rtc:signal', onSignal);
      socketRef?.current?.off('connect', announce);
      closePc();
      local.getTracks().forEach((t) => t.stop());
    },
  };
}
