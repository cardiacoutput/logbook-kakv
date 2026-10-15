// Server OTP WhatsApp untuk Logbook Subspesialis Anestesi Kardiovaskuler.
// Berjalan di Cloudflare Workers (paket gratis cukup). Lihat worker/README.md untuk cara pasang.
//
// Endpoint:
//   POST /otp/request  { nama, npm, phone }  -> kirim kode 6 angka ke WhatsApp
//   POST /otp/verify   { phone, code }       -> cek kode, kembalikan token sesi
//
// Variabel (wrangler.toml [vars] / secret):
//   ALLOWED_ORIGINS   asal aplikasi yang boleh memanggil, mis. https://cardiacoutput.github.io
//   OTP_SECRET        (secret) string acak panjang untuk hash kode & tanda tangan token
//   WA_PROVIDER       "fonnte" (default) atau "meta"
//   FONNTE_TOKEN      (secret) token perangkat Fonnte
//   META_TOKEN, META_PHONE_NUMBER_ID, META_TEMPLATE, META_LANG   (jika WA_PROVIDER = "meta")
//   ALLOWLIST         (opsional, secret) JSON daftar trainee yang boleh masuk:
//                     [{"npm":"130821260001","phone":"081234567890"}, ...]
// KV binding: OTP_KV

const OTP_TTL = 300;          // kode berlaku 5 menit
const MAX_TRIES = 5;          // salah input maksimal 5 kali per kode
const MAX_REQUESTS = 3;       // maksimal 3 permintaan kode per nomor
const REQUEST_WINDOW = 900;   // dalam 15 menit

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : (allowed[0] || '*'),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json({ ok: false, error: 'Metode tidak didukung.' }, 405);
    if (allowed.length && !allowed.includes(origin)) return json({ ok: false, error: 'Asal permintaan tidak diizinkan.' }, 403);
    if (!env.OTP_SECRET || !env.OTP_KV) return json({ ok: false, error: 'Server OTP belum dikonfigurasi.' }, 500);

    let body;
    try { body = await req.json(); } catch { return json({ ok: false, error: 'Format permintaan salah.' }, 400); }

    const path = new URL(req.url).pathname.replace(/\/+$/, '');
    try {
      if (path === '/otp/request') return json(await requestOtp(body, env));
      if (path === '/otp/verify') return json(await verifyOtp(body, env));
      return json({ ok: false, error: 'Alamat tidak ditemukan.' }, 404);
    } catch (e) {
      return json({ ok: false, error: e.expose ? e.message : 'Terjadi kesalahan di server. Coba lagi.' }, e.status || 500);
    }
  },
};

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; this.expose = true; }
}

export function normPhone(s) {
  let d = String(s || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return /^628\d{7,12}$/.test(d) ? d : '';
}

async function sha256(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

function randomOtp() {
  // Rejection sampling agar sebaran angka merata.
  const a = new Uint32Array(1);
  do { crypto.getRandomValues(a); } while (a[0] >= 4294000000);
  return String(a[0] % 1000000).padStart(6, '0');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function signToken(payload, secret) {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return body + '.' + b64url(sig);
}

function isAllowed(env, npm, phone) {
  if (!env.ALLOWLIST) return true;
  let list;
  try { list = JSON.parse(env.ALLOWLIST); } catch { return false; }
  return Array.isArray(list) && list.some(x => String(x.npm).trim() === npm && normPhone(x.phone) === phone);
}

async function requestOtp(b, env) {
  const nama = String(b.nama || '').trim().slice(0, 120);
  const npm = String(b.npm || '').trim().slice(0, 30);
  const phone = normPhone(b.phone);
  if (!nama || !npm || !phone) throw new HttpError(400, 'Nama, NPM, dan nomor WhatsApp wajib diisi dengan benar.');
  if (!isAllowed(env, npm, phone)) throw new HttpError(403, 'NPM dan nomor WhatsApp ini belum terdaftar. Hubungi admin prodi.');

  const now = Math.floor(Date.now() / 1000);
  const rlKey = 'rl:' + phone;
  const rl = JSON.parse((await env.OTP_KV.get(rlKey)) || 'null') || { n: 0, until: now + REQUEST_WINDOW };
  if (rl.n >= MAX_REQUESTS) {
    const min = Math.max(1, Math.ceil((rl.until - now) / 60));
    throw new HttpError(429, `Terlalu sering meminta kode. Coba lagi dalam ${min} menit.`);
  }
  rl.n += 1;
  await env.OTP_KV.put(rlKey, JSON.stringify(rl), { expirationTtl: Math.max(60, rl.until - now) });

  const code = randomOtp();
  const rec = { h: await sha256(code + ':' + phone + ':' + env.OTP_SECRET), tries: 0, exp: now + OTP_TTL, nama, npm };
  await env.OTP_KV.put('otp:' + phone, JSON.stringify(rec), { expirationTtl: OTP_TTL });
  await sendWhatsApp(env, phone, code);
  return { ok: true, expiresIn: OTP_TTL };
}

async function verifyOtp(b, env) {
  const phone = normPhone(b.phone);
  const code = String(b.code || '').replace(/\D/g, '');
  if (!phone || code.length !== 6) throw new HttpError(400, 'Kode harus 6 angka.');

  const key = 'otp:' + phone;
  const raw = await env.OTP_KV.get(key);
  const now = Math.floor(Date.now() / 1000);
  if (!raw) throw new HttpError(400, 'Kode sudah kedaluwarsa. Minta kode baru.');
  const rec = JSON.parse(raw);
  if (rec.exp <= now) { await env.OTP_KV.delete(key); throw new HttpError(400, 'Kode sudah kedaluwarsa. Minta kode baru.'); }
  if (rec.tries >= MAX_TRIES) { await env.OTP_KV.delete(key); throw new HttpError(429, 'Terlalu banyak percobaan. Minta kode baru.'); }

  const h = await sha256(code + ':' + phone + ':' + env.OTP_SECRET);
  if (!timingSafeEqual(h, rec.h)) {
    rec.tries += 1;
    if (rec.tries >= MAX_TRIES) { await env.OTP_KV.delete(key); throw new HttpError(429, 'Terlalu banyak percobaan. Minta kode baru.'); }
    await env.OTP_KV.put(key, JSON.stringify(rec), { expirationTtl: Math.max(60, rec.exp - now) });
    throw new HttpError(401, `Kode salah. Sisa ${MAX_TRIES - rec.tries} percobaan.`);
  }

  await env.OTP_KV.delete(key);
  await env.OTP_KV.delete('rl:' + phone);
  const token = await signToken({ sub: phone, npm: rec.npm, nama: rec.nama, iat: now }, env.OTP_SECRET);
  return { ok: true, token, user: { nama: rec.nama, npm: rec.npm, phone } };
}

async function sendWhatsApp(env, phone, code) {
  const provider = (env.WA_PROVIDER || 'fonnte').toLowerCase();

  if (provider === 'fonnte') {
    if (!env.FONNTE_TOKEN) throw new Error('FONNTE_TOKEN belum diisi');
    const text = `*${code}* adalah kode OTP Logbook KAKV Anda.\nBerlaku 5 menit. Jangan berikan kode ini kepada siapa pun, termasuk admin.`;
    const fd = new FormData();
    fd.append('target', phone);
    fd.append('message', text);
    const r = await fetch('https://api.fonnte.com/send', { method: 'POST', headers: { Authorization: env.FONNTE_TOKEN }, body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.status === false) throw new HttpError(502, 'Gagal mengirim WhatsApp. Coba lagi sebentar.');
    return;
  }

  if (provider === 'meta') {
    // Memakai template kategori "Authentication" yang sudah disetujui Meta (dengan tombol salin kode).
    const r = await fetch(`https://graph.facebook.com/v21.0/${env.META_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.META_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: env.META_TEMPLATE || 'otp_logbook_kakv',
          language: { code: env.META_LANG || 'id' },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: code }] },
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
          ],
        },
      }),
    });
    if (!r.ok) throw new HttpError(502, 'Gagal mengirim WhatsApp. Coba lagi sebentar.');
    return;
  }

  throw new Error('WA_PROVIDER tidak dikenal: ' + provider);
}
