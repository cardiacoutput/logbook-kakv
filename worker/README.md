# Server OTP WhatsApp (Cloudflare Worker)

Server kecil yang membuat kode OTP, mengirimnya ke WhatsApp trainee, lalu memeriksanya. Aplikasi di GitHub Pages tidak bisa melakukannya sendiri: kode OTP dan kunci API WhatsApp harus berada di server, bukan di kode yang bisa dibaca publik.

Paket gratis Cloudflare Workers sudah cukup untuk satu prodi.

## Yang perlu disiapkan

1. **Akun Cloudflare** (gratis): https://dash.cloudflare.com/sign-up
2. **Pengirim WhatsApp**, pilih salah satu:
   - **Fonnte** (paling cepat, berbayar ringan): daftar di https://fonnte.com, hubungkan nomor WhatsApp khusus prodi (scan QR), salin *token* perangkat. Fonnte memakai WhatsApp biasa, bukan API resmi Meta, jadi ada risiko nomor pengirim diblokir WhatsApp bila mengirim terlalu banyak. Pakai nomor khusus, jangan nomor pribadi.
   - **Meta WhatsApp Cloud API** (resmi): perlu akun Meta Business terverifikasi, nomor khusus, dan template pesan kategori *Authentication* yang sudah disetujui. Prosesnya lebih lama, tapi lebih stabil.
3. **Node.js** di komputer (https://nodejs.org) untuk menjalankan perintah `npx wrangler`.

## Langkah pemasangan

Jalankan di folder `worker/` ini:

```bash
npx wrangler login
npx wrangler kv namespace create OTP_KV
```

Salin `id` yang muncul ke `wrangler.toml` (ganti `ISI_DENGAN_ID_KV`). Lalu pasang secret:

```bash
# string acak panjang, misalnya hasil: openssl rand -hex 32
npx wrangler secret put OTP_SECRET
# token Fonnte (atau META_TOKEN bila memakai Meta)
npx wrangler secret put FONNTE_TOKEN
```

**Daftar trainee yang boleh masuk (sangat disarankan).** Tanpa daftar ini, siapa pun yang tahu link aplikasi bisa meminta OTP, dan kuota WhatsApp Anda ikut terpakai.

```bash
npx wrangler secret put ALLOWLIST
# isi dengan JSON satu baris, contoh:
# [{"npm":"130821260001","phone":"081234567890"},{"npm":"130821260002","phone":"081298765432"}]
```

Terbitkan:

```bash
npx wrangler deploy
```

Wrangler akan menampilkan alamat seperti `https://logbook-kakv-otp.<akun>.workers.dev`.

## Menyambungkan ke aplikasi

Di `index.html`, isi baris berikut dengan alamat tadi:

```js
const AUTH = { api: 'https://logbook-kakv-otp.<akun>.workers.dev' };
```

Selama `api` kosong, halaman login tidak aktif dan aplikasi langsung terbuka.

## Aturan keamanan yang sudah diterapkan

- Kode 6 angka, berlaku 5 menit, sekali pakai. Yang disimpan hanya hash-nya.
- Salah input maksimal 5 kali per kode.
- Maksimal 3 permintaan kode per nomor dalam 15 menit.
- Hanya menerima permintaan dari `ALLOWED_ORIGINS` (alamat GitHub Pages aplikasi).
- Setelah berhasil, aplikasi menyimpan token sesi di perangkat. Trainee tidak perlu login lagi sampai menekan **Keluar**, menghapus data browser, atau menghapus aplikasi.
