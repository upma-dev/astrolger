import dns from 'dns';
import mongoose from 'mongoose';
import { readdir, rm, stat } from 'fs/promises';
import os from 'os';
import path from 'path';
import { config } from './index.js';

// Each in-memory MongoDB run writes a "mongo-mem-*" folder to the OS temp dir. When the dev server is killed
// abruptly (node --watch restarts on Windows can't run exit handlers) those folders stay behind and can fill
// the disk. On startup we delete stale ones; folders of a still-running mongod are locked and simply skipped.
async function pruneStaleMemoryDbs() {
  const tmp = os.tmpdir();
  let freed = 0;
  for (const name of await readdir(tmp).catch(() => [])) {
    if (!name.startsWith('mongo-mem-')) continue;
    const dir = path.join(tmp, name);
    try {
      const s = await stat(dir);
      if (!s.isDirectory() || Date.now() - s.mtimeMs < 2 * 60e3) continue;
      await rm(dir, { recursive: true, force: true, maxRetries: 0 });
      freed++;
    } catch { /* in use by another instance - leave it */ }
  }
  if (freed) console.log(`[db] removed ${freed} stale in-memory MongoDB folder(s) from ${tmp}`);
}

export async function connectDB() {
  let uri = config.mongoUri;
  if (!uri) {
    await pruneStaleMemoryDbs();
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mem = await MongoMemoryServer.create();
    uri = mem.getUri();
    const stop = async () => { try { await mem.stop({ doCleanup: true, force: true }); } finally { process.exit(0); } };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    console.log('[db] Using in-memory MongoDB (data resets on restart). Set MONGODB_URI for persistence.');
  }
  // Atlas "mongodb+srv" URIs need an SRV DNS lookup, which Node's resolver often fails on Windows
  // (querySrv ECONNREFUSED). Public resolvers make it reliable; this only affects dns.resolve* calls.
  if (uri.startsWith('mongodb+srv://')) dns.setServers(['8.8.8.8', '1.1.1.1', ...dns.getServers()]);
  await mongoose.connect(uri, { dbName: config.dbName, serverSelectionTimeoutMS: 20000 });
  console.log('[db] connected');
}
