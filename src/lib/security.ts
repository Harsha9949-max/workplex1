import CryptoJS from 'crypto-js';

const AES_SECRET = import.meta.env.VITE_AES_SECRET || 'workplex-secure-key-2024';

export const encrypt = (text: string): string => {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, AES_SECRET).toString();
};

export const decrypt = (ciphertext: string): string => {
  if (!ciphertext) return '';
  const bytes = CryptoJS.AES.decrypt(ciphertext, AES_SECRET);
  return bytes.toString(CryptoJS.enc.Utf8);
};

export const getDeviceFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl');
  const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo ? gl?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
  
  const screenRes = `${window.screen.width}x${window.screen.height}`;
  const userAgent = navigator.userAgent;
  const language = navigator.language;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const rawId = `${renderer}-${screenRes}-${userAgent}-${language}-${timeZone}`;
  return CryptoJS.SHA256(rawId).toString();
};
