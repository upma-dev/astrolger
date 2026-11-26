import { createHash, randomBytes } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

export const UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');
const MAX_BYTES = 4 * 1024 * 1024;
// SVG is deliberately excluded: it can carry scripts.
const TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

const cloud = () => {
  const { CLOUDINARY_CLOUD_NAME: name, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret, CLOUDINARY_FOLDER: folder = 'astrovani' } = process.env;
  return name && key && secret ? { name, key, secret, folder } : null;
};

// Signed upload to Cloudinary's REST API (no SDK needed). Returns the https URL.
async function uploadToCloudinary(dataUrl, c) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash('sha1').update(`folder=${c.folder}&timestamp=${timestamp}${c.secret}`).digest('hex');
  const body = new FormData();
  body.append('file', dataUrl);
  body.append('api_key', c.key);
  body.append('timestamp', String(timestamp));
  body.append('folder', c.folder);
  body.append('signature', signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(c.name)}/image/upload`, { method: 'POST', body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.secure_url) { const e = new Error(json?.error?.message || 'Image upload failed'); e.status = 502; throw e; }
  return json.secure_url;
}

// Accepts a base64 data URL from the admin panel. Uses Cloudinary when configured, otherwise stores under /uploads.
export async function saveDataUrl(dataUrl) {
  const m = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl || '');
  if (!m || !TYPES[m[1]]) { const e = new Error('Upload a PNG, JPG, WEBP or GIF image'); e.status = 400; throw e; }
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length || buf.length > MAX_BYTES) { const e = new Error('Image must be under 4 MB'); e.status = 400; throw e; }

  const c = cloud();
  if (c) return uploadToCloudinary(dataUrl, c);

  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}.${TYPES[m[1]]}`;
  await writeFile(path.join(UPLOAD_DIR, name), buf);
  return `/uploads/${name}`;
}
