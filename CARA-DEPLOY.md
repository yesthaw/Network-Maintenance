# IT Pancaran Kasih — Cara Deploy ke Proxmox /var/www/html

Web **IT Pancaran Kasih** ini sudah siap jalan. **Tinggal copy semua file ke server, tanpa
settingan tambahan** — asal web server di server itu sudah bisa menjalankan PHP
(sesuai kondisi server Anda).

---

## Isi Folder

| File/Folder | Fungsi |
|---|---|
| `index.html` | Halaman utama aplikasi |
| `api.php` | **Backend** — baca/tulis data & sesi login (jangan dihapus!) |
| `auth.js`, `login-page.js`, dll. | Tampilan & logika aplikasi |
| `maintenance.json`, `users.json`, `photos.json`, `profiles.json` | **Data Anda** (tersimpan di server) |
| `activity.json` | Catatan user yang sedang aktif (untuk notif lonceng admin; dibuat ulang otomatis bila hilang, direset per hari) |
| `uploads/` | Foto dokumentasi (dibuat otomatis) |
| `logo.png` *(opsional)* | Logo aplikasi — dibuat otomatis saat admin mengunggah logo lewat menu *Kelola User* |
| `assets/` | Library (Chart.js, Excel, PDF, ikon) — sudah lokal, **tidak butuh internet** |
| `.htaccess` | Melindungi file JSON agar tidak bisa dibuka langsung dari browser (Apache) |
| `.user.ini` | Menyesuaikan batas upload PHP (nginx/php-fpm) |

> **Penting:** copy **isi folder ini semuanya** (termasuk file tersembunyi `.htaccess`
> dan `.user.ini` jika memakai WinSCP, aktifkan "Show hidden files").

---

## Langkah Deploy

1. Copy **semua isi folder ini** ke `/var/www/html/` di server (pakai WinSCP, FileZilla,
   atau perintah di bawah).
2. Buka di browser: **`http://IP-SERVER/`**
3. Selesai — login dengan user Anda (default: `Yestha` / `180725`).
4. Data awal **dimulai kosong** (0 laporan) — tambahkan laporan pertama lewat menu
   *Tambah*. Isi **Pemeriksaan** (10 kategori: Internet/WAN, MikroTik/Router,
   Switch/HUB, VLAN, Wi-Fi/AP, Server Network, Kabel & Infrastruktur, Monitoring
   & Logging, Backup, Dokumentasi) — daftar **Item Pemeriksaan** otomatis
   menyesuaikan pemeriksaan yang dipilih.

Jika copy lewat terminal/scp dari komputer lain:

```bash
scp -r ./* root@IP-SERVER:/var/www/html/
```

Atau jika ingin dipakai sebagai sub-folder, copy foldernya saja:

```bash
scp -r netmaintain root@IP-SERVER:/var/www/html/
# lalu buka http://IP-SERVER/netmaintain/
```

---

## Cek Cepat (± 10 detik)

Buka `http://IP-SERVER/api.php?ep=ping` — harus muncul:

```json
{"ok":true,"app":"IT Pancaran Kasih","php":"8.x.x", ...}
```

- ✅ Muncul JSON seperti di atas → PHP aktif, aplikasi siap dipakai.
- ❌ Muncul kode mentah PHP / halaman unduhan → PHP belum aktif untuk web server itu.
- ❌ Muncul banner merah **"Server PHP belum merespons"** di halaman login → sama seperti di atas (klik **⟳ Cek Ulang** setelah PHP aktif).

## Kalau Muncul Error "PHP tidak bisa menulis ..."

Web server (biasanya user `www-data`) perlu izin menulis data. Jalankan **sekali saja**
di server:

```bash
chown -R www-data:www-data /var/www/html
```

---

## Cara Kerja Penyimpanan (sesuai permintaan Anda)

- ✅ **TIDAK ADA localStorage** sama sekali — sudah diuji otomatis (0 item tersimpan di browser).
- ✅ Semua data disimpan di **file JSON di server**, jadi laporan dari semua
  komputer/orang masuk ke data yang sama.
- ✅ Sesi login memakai **cookie sesi server (httponly)** — refresh halaman tetap
  login, otomatis keluar setelah ± 1 jam tidak aktif.
- ✅ Foto dokumentasi otomatis **dikompres di browser** sebelum diupload
  (maks sisi 1920px, format JPEG) supaya ringan dan cepat.

## Fitur Keamanan Password (terenkripsi / bcrypt)

Semua password user — admin maupun user biasa — kini disimpan **terenkripsi
satu arah (bcrypt)** di `users.json`, sehingga isinya tidak bisa dibaca manusia
walau file-nya sampai terbuka:

```json
"password": "$2y$12$JqJdNHxmjCrvHSeGfa79du..."
```

Yang perlu diketahui:

- **Login tetap seperti biasa** — tidak ada yang berubah bagi user.
- **Pemakaian pertama setelah update**: file `users.json` lama yang masih
  berupa teks biasa otomatis dinaikkan ke bcrypt saat aplikasi dipakai
  (tidak perlu setting apa pun). Pastikan folder bisa ditulis (`chown` di atas).
- **Password lama tidak bisa dilihat lagi** oleh siapa pun, termasuk admin —
  itu sifat enkripsi satu arah. Di menu *Kelola User*, kolom password hanya
  menampilkan `(terenkripsi)`.
- **Admin tetap bisa memberi/mengganti password** user: tombol edit user →
  isi kolom password baru (kosongkan jika tidak ingin mengganti).
- Status enkripsi ikut diperiksa di halaman **diagnosa**
  (`api.php?ep=diagnosa&html=1`).

## Hak Akses Data Maintenance (per user)

Menu **Kelola User tetap khusus admin**. Yang dibuka per-user adalah **edit DATA**:

| Aksi | Admin | User biasa |
|---|---|---|
| Lihat semua data | ✔ | ✔ |
| Tambah data baru | ✔ | ✔ (otomatis dicatat miliknya) |
| **Edit data milik sendiri** | ✔ | ✔ (tombol pensil hanya muncul di baris miliknya) |
| Edit data milik user lain | ✔ | ✘ (tombol tidak muncul & ditolak) |
| **Hapus data** | ✔ | ✘ (**khusus admin**) |
| Kelola user & logo | ✔ | ✘ |

Kepemilikan data ditentukan otomatis dari **siapa yang membuat data itu**
(field `createdBy`, terisi sendiri setiap kali user menambah laporan — tidak
bisa dipalsukan).

Batasan ini ditegakkan **di server** (`api.php`), bukan sekadar menyembunyikan
tombol: user biasa yang memaksa mengirim perintah hapus data, mengubah data
orang lain, atau memalsukan kepemilikan akan **ditolak otomatis** oleh server.
Data milik orang lain yang tidak disentuh tetap terkirim normal saat user biasa
menyimpan datanya sendiri.

## Notif & Tampilan per Hari

- **Angka di sebelah menu "Data Maintenance"** = jumlah data **hari ini**
  (reset sendiri setiap ganti hari). Sebelumnya angka itu menghitung data
  berstatus Pending/Dalam Proses sehingga sering terlihat 0.
- **Halaman Data Maintenance sekarang per hari**: filter tanggal otomatis
  terisi **hari ini** saat halaman dibuka. Untuk melihat data kemarin / hari
  sebelumnya, cukup **undur tanggalnya** di kolom filter. Kosongkan tanggal
  untuk melihat semua data.
- **Halaman Data Maintenance = daftar pekerjaan belum rampung.** Filter status
  otomatis **"Belum Selesai"** (Pending + Dalam Proses). Saat data diganti
  statusnya menjadi **Selesai**, data itu **langsung hilang dari halaman**
  (tetap tersimpan — lihat kembali lewat filter Status = *Selesai* atau
  *Semua Status*). Data juga **terurut sesuai tanggal/waktu dibuat** (paling
  lama di atas).
- **Pop up tidak menutup sendiri lagi.** Dulu pop up tertutup tiba-tiba saat
  klik / seleksi teks menyentuh area gelap di luar kotak pop up (semua pop up
  kena: tambah data, edit, tambah user). Sekarang pop up hanya tertutup lewat
  tombol **X**, **Batal**, atau setelah **Simpan**.
- Sesi login juga kini **tetap hidup selama web dibuka** (aplikasi mengirim
  tanda "masih aktif" tiap 1 menit), jadi form yang lama diisi tidak lagi
  terputus karena sesi berakhir.

## Notif Lonceng (khusus Admin)

Lonceng di sebelah tombol **Logout** (hanya tampil untuk admin) menampilkan
**user lain yang sedang membuka aplikasi**:

- Angka merah = banyaknya user lain yang sedang aktif (aktif = terdeteksi
  dalam 3 menit terakhir; tab dibiarkan terbuka pun tetap terdeteksi).
- Klik lonceng -> daftar nama user yang sedang aktif.
- User yang logout otomatis hilang dari daftar; daftar **direset setiap hari**.
- Data aktivitas disimpan di `activity.json` (dibuat ulang otomatis bila hilang).

## Ganti Logo Aplikasi

Logo bisa diganti kapan saja **langsung dari aplikasi, tanpa menyentuh file**:

1. Login sebagai **admin** → buka menu **Kelola User**.
2. Di bagian atas ada kartu **Logo Aplikasi** → klik *Pilih & Unggah Logo*.
3. Pilih gambar (PNG dengan latar transparan disarankan) — otomatis dikecilkan
   ke 512×512 px dan dikonversi ke PNG.

Logo langsung dipakai di **halaman login**, **sidebar**, dan **ikon tab browser**
(tanpa perlu muat ulang halaman). Tombol **Hapus Logo** mengembalikan ikon bawaan.

Cara manual (alternatif): copy file gambar ke folder aplikasi dengan nama
`logo.png` — efeknya sama. Ikon tab browser baru berubah setelah tab ditutup &
dibuka ulang.

## Backup Data

Cukup copy 4 file JSON + folder `uploads/`:

```bash
tar -czf backup-netmaintain.tar.gz /var/www/html/*.json /var/www/html/uploads
```

## Kalau Tidak Bisa Login

1. Buka **`http://IP-SERVER/api.php?ep=diagnosa&html=1`** — halaman pemeriksaan
   otomatis akan menunjukkan persis apa yang bermasalah **beserta perintah
   perbaikannya** (penyebab paling sering: folder sesi PHP tidak bisa ditulis).
2. Ingat: **username bersifat kapital-sensitif** — `Yestha` (huruf Y besar),
   bukan `yestha`.
3. Jika diagnosa bilang semua baik tapi tetap gagal login, kirim tangkapan layar
   halaman diagnosa tersebut ke pengembang.

> Catatan: aplikasi memakai **dua lapis sesi** — cookie *dan* token header
> `X-Session-Id` — sehingga tetap bisa login walau browser memblokir cookie
> (mis. saat web dibuka di dalam iframe/preview).

## Troubleshooting

| Gejala | Penyebab & Solusi |
|---|---|
| **Muncul teks kode di bagian bawah halaman** | File `index.html` rusak/versi lama. Copy ulang `index.html` dari `netmaintain.zip` terbaru. Verifikasi: `md5sum /var/www/html/index.html` harus `20e863e3a6da23e6daa1467dfdf628c8` (52.151 byte). |
| Tabel Kelola User kosong / user tidak tampil | Tekan **Ctrl+F5** lalu login ulang — halaman kini otomatis mengambil ulang data user setiap kali dibuka. Catatan: **user biasa memang hanya melihat akunnya sendiri**; daftar lengkap hanya tampil untuk admin. Jika tetap kosong: cek `api.php?ep=diagnosa&html=1`. |
| Banner merah "Server PHP belum merespons" | Bukan error aplikasi — web server sedang tidak menjalankan PHP. Tekan tombol **⟳ Cek Ulang** di banner begitu PHP aktif (banner hilang sendiri). Cek cepat: buka `api.php?ep=ping` — harus muncul JSON `{"ok":true,...}`. Untuk nginx pastikan php-fpm jalan, untuk Apache pastikan `libapache2-mod-php` terpasang. |
| Login selalu gagal | `users.json` tidak terbaca — pastikan ter-copy dan bisa dibaca web server. |
| Password user tidak bisa dilihat di Kelola User | Memang disengaja (terenkripsi satu arah). Untuk memberi password baru: edit user → isi kolom password. |
| Halaman Kelola User tampil aneh / tombol mata password masih ada | Browser memakai `kelola-user-page.js` lama → tekan **Ctrl+F5** (muat ulang paksa). |
| Tambah laporan muncul tapi hilang setelah refresh | Web server tidak bisa menulis `maintenance.json` → jalankan perintah `chown` di atas. |
| Upload foto gagal | Lihat pesan error yang muncul; biasanya permission folder (chown) atau batas upload PHP (sudah disetel `.user.ini`). |

## Catatan Keamanan (singkat)

- File `.htaccess` sudah mencegah `*.json` dibuka langsung dari browser **di Apache**.
  Kalau web server Anda **nginx**, tambahkan blok berikut di server block
  (opsional tapi disarankan):

  ```nginx
  location ~* \.json$ { deny all; }
  ```

- Password user (admin & user biasa) disimpan **terenkripsi satu arah (bcrypt)**
  di `users.json` — aman walau file sampai terbaca orang. Password lama tidak
  bisa dilihat lagi; admin hanya bisa **mengganti** password lewat menu
  *Kelola User*. Detail: lihat bagian *Fitur Keamanan Password* di atas.
- Walaupun password sudah terenkripsi, tetap **jangan buka server ini ke
  internet publik**. Ganti password default `180725` setelah deploy.
