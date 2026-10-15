# Logbook Subspesialis Anestesi Kardiovaskuler

Aplikasi web mobile untuk mencatat logbook trainee Subspesialis Anestesi Kardiovaskuler (KAKV) FK Unpad.

**Buka aplikasi:** https://cardiacoutput.github.io/logbook-kakv/

## Fitur
- Pencatatan kasus per 9 kategori kompetensi (NIVATS, CHD, Perfusi, Aorta, Diagnostik, CABG, Cath, Pace, ICU) dengan target kasus, mengikuti format file *LOGBOOK KAKV 2026.xlsx*.
- **Tempel dari WhatsApp**: salin pesan laporan/jadwal pasien, aplikasi mengisi nama, No RM, tanggal, usia, diagnosis, tindakan operasi & anestesi, kategori, dan DPJP (bila disebut). Mendukung satu pasien berlabel, daftar bernomor beberapa pasien, dan file ekspor chat (.txt). Di Android, pesan bisa langsung dibagikan dari WhatsApp ke aplikasi (Bagikan → Logbook KAKV). Teks hanya diproses di perangkat.
- Unggah laporan anestesi dan foto kasus; level keterlibatan, keterampilan prosedural, refleksi, tanda verifikasi DPJP.
- Kegiatan ilmiah per semester (1–4): tanggal, jam, pembimbing, media Zoom Meeting / offline, foto kegiatan, sertifikat.
- Ekspor ke Excel (format LOGBOOK KAKV + rekap kompetensi + kegiatan ilmiah), impor dari Excel lama, cadangan & pulihkan (.json).

- Masuk dengan akun Google (Gmail). Cukup sekali per perangkat. Nama dan NPM trainee tampil di header dan otomatis terisi di setiap ekspor.

## Cara pasang di HP
- **Android (Chrome):** buka link → menu ⋮ → *Tambahkan ke layar utama* / *Instal aplikasi*.
- **iPhone (Safari):** buka link → tombol Bagikan → *Tambah ke Layar Utama*.

## Privasi data
Semua data (identitas pasien, foto, laporan) **hanya tersimpan di browser perangkat masing-masing trainee**. Tidak ada data yang dikirim ke GitHub atau server lain. Konsekuensinya:
- Lakukan **Cadangkan semua data** secara berkala (menu Ekspor), terutama sebelum ganti HP atau menghapus data browser.
- Data di HP berbeda tidak tersinkron otomatis.
- Jangan unggah file ekspor/cadangan ke repositori ini atau grup chat umum.

## Mengaktifkan login Google (admin)

Login aktif setelah konfigurasi Firebase ditempel ke `index.html` (`const FIREBASE_CONFIG = ...`). Selama masih `null`, aplikasi langsung terbuka tanpa login.

1. Buka https://console.firebase.google.com → **Add project** (Google Analytics boleh dimatikan).
2. **Build → Authentication → Get started → Sign-in method → Google → Enable**, pilih email dukungan, **Save**.
3. **Authentication → Settings → Authorized domains → Add domain**: `cardiacoutput.github.io`.
4. **Project settings (ikon roda gigi) → Your apps → ikon Web `</>`**, beri nama, **Register app**. Salin objek `firebaseConfig` yang ditampilkan.

Nilai `firebaseConfig` (termasuk `apiKey`) memang dirancang untuk berada di kode aplikasi web dan aman dipublikasikan; yang membatasi penggunaannya adalah daftar *Authorized domains*.

Logo Universitas Padjadjaran adalah milik Universitas Padjadjaran.
