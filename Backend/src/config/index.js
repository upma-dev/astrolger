import 'dotenv/config';
export const config = {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || '',
  dbName: process.env.MONGODB_DB_NAME || 'astrology',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpires: process.env.JWT_EXPIRES || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  devOtp: process.env.DEV_OTP || '123456',
  agoraAppId: (process.env.AGORA_APP_ID || '').trim(),
  agoraAppCertificate: (process.env.AGORA_APP_CERTIFICATE || '').trim(),
};
