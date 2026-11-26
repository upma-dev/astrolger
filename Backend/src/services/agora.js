import agoraToken from 'agora-token';
import { config } from '../config/index.js';
import { getIceServers } from './ice.js';

const { RtcTokenBuilder, RtcRole } = agoraToken;

// Fixed numeric UIDs per 1-on-1 participant so reconnecting after a reload replaces the same Agora session slot cleanly.
const ROLE_UID = { user: 1, astrologer: 2 };

export function agoraConfig() {
  const appId = (process.env.AGORA_APP_ID ?? config.agoraAppId ?? '').trim();
  const appCertificate = (process.env.AGORA_APP_CERTIFICATE ?? config.agoraAppCertificate ?? '').trim();
  const rawTtl = Number(process.env.AGORA_TOKEN_TTL_SECONDS);
  const ttl = Number.isFinite(rawTtl) && rawTtl >= 300 ? Math.min(86400, Math.floor(rawTtl)) : 7200;
  return { appId, appCertificate, ttl };
}

export function issueSessionAgoraToken({ sessionId, role }) {
  const { appId, appCertificate, ttl } = agoraConfig();
  if (!appId) return null;
  const channel = `session_${String(sessionId)}`;
  const uid = ROLE_UID[role] || 1;
  // Projects in Agora Testing Mode (no App Certificate) join with token=null; Secured Mode projects require a signed RTC token.
  const token = appCertificate
    ? RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channel, uid, RtcRole.PUBLISHER, ttl, ttl)
    : null;
  return { ok: true, provider: 'agora', appId, channel, uid, token, expiresIn: ttl, mode: appCertificate ? 'token' : 'app-id' };
}

export async function respondCallConfig(res, session, role) {
  if (!session) return res.status(404).json({ message: 'Session not found' });
  if (session.type === 'chat') return res.status(400).json({ message: 'Call config is only issued for audio or video sessions' });
  if (session.status !== 'active') return res.status(409).json({ message: 'Session is not active' });
  const agora = issueSessionAgoraToken({ sessionId: session._id, role });
  if (agora) return res.json(agora);
  // Fall back to zero-config WebRTC (Google STUN / optional TURN + Socket.IO signaling) when Agora is not configured.
  const iceServers = await getIceServers();
  return res.json({ ok: true, provider: 'webrtc', iceServers });
}
