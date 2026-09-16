<?php
/* ============================================================
   IT Pancaran Kasih — API (api.php)
   ------------------------------------------------------------
   - Backend PHP tanpa database. Data disimpan di file JSON di
     folder yang sama: maintenance.json, users.json,
     photos.json, profiles.json (foto di folder uploads/).
   - Sesi login disimpan di server (PHP session + cookie).
     TIDAK memakai localStorage browser sama sekali.
   - Tinggal letakkan bersama index.html — tanpa konfigurasi
     tambahan. Endpoint: ?ep=nama&act=aksi
   ============================================================ */

// ---------------- Pengaturan ----------------
const NM_SESSION_MAX = 3600;             // sesi login berlaku 1 jam (diperpanjang selama aktif)
const NM_UPLOAD_MAX  = 64 * 1024 * 1024; // batas upload 64MB (foto sudah dikompres di browser)

header('Content-Type: application/json; charset=utf-8');
error_reporting(0);
ini_set('display_errors', '0');

function nm_out($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function nm_err(string $msg, int $code = 400): void {
    nm_out(['error' => $msg], $code);
}

// ---------------- Penyimpanan file JSON ----------------
function nm_path(string $file): string { return __DIR__ . '/' . $file; }

function nm_default(string $file) {
    if ($file === 'activity.json') {
        // Aktivitas user untuk notif admin (siapa yang sedang aktif).
        // 'date' = tanggal terakhir dicatat; berganti hari -> 'users' direset.
        return ['date' => '', 'users' => []];
    }
    if ($file === 'users.json') {
        // Akun awal jika file users.json belum ada
        // (password disimpan TERENKRIPSI bcrypt; password login tetap: 180725)
        return [[
            'id' => 1,
            'username' => 'Yestha',
            'password' => password_hash('180725', PASSWORD_DEFAULT),
            'fullname' => 'Yestha Yunior Wongkar, S.Tr.Kom',
            'phone'    => '08123456789',
            'email'    => 'yestha@netmaintain.com',
            'role'     => 'admin',
            'createdAt'=> date('Y-m-d'),
        ]];
    }
    return []; // maintenance.json, photos.json, profiles.json
}

function nm_read(string $file) {
    $p = nm_path($file);
    if (!file_exists($p)) { nm_write($file, nm_default($file)); return nm_default($file); }
    $j = json_decode((string)file_get_contents($p), true);
    // File rusak/kosong -> pakai default, file asli TIDAK ditimpa
    return is_array($j) ? $j : nm_default($file);
}

function nm_write(string $file, $data): void {
    $p = nm_path($file);
    $bisaTulis = file_exists($p) ? is_writable($p) : is_writable(__DIR__);
    if (!$bisaTulis) {
        nm_err('PHP tidak bisa menulis ' . $file . '. Jalankan di server: chown -R www-data:www-data ' . __DIR__);
    }
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || file_put_contents($p, $json, LOCK_EX) === false) {
        nm_err('Gagal menyimpan ' . $file . ' (cek permission folder).');
    }
}

// ---------------- Password user terenkripsi (bcrypt) ----------------
// Password disimpan terenkripsi SATU ARAH (bcrypt) sehingga file users.json
// aman walau sampai terbaca orang. File lama yang masih plaintext otomatis
// dinaikkan ke bcrypt saat pertama kali dibaca — tanpa setting apa pun.
// Konsekuensi: password lama tidak bisa dilihat lagi, hanya bisa DIGANTI.

function nm_pw_is_hash(string $p): bool {
    return (bool)preg_match('/^\$2y\$/', $p) || (bool)preg_match('/^\$argon2/', $p);
}

function nm_pw_check(string $plain, string $stored): bool {
    if ($plain === '' || $stored === '') return false;
    if (nm_pw_is_hash($stored)) return password_verify($plain, $stored);
    return hash_equals($stored, $plain); // file lama belum termigrasi (folder tak bisa ditulis) -> tetap bisa login
}

function nm_users(): array {
    $users = nm_read('users.json');
    $ubah = false;
    foreach ($users as &$u) {
        $p = (string)($u['password'] ?? '');
        if ($p !== '' && !nm_pw_is_hash($p)) { $u['password'] = password_hash($p, PASSWORD_DEFAULT); $ubah = true; }
    }
    unset($u);
    if ($ubah) {
        // Tulis ulang secara diam-diam. Jika gagal (folder terkunci), login
        // tetap jalan lewat fallback di nm_pw_check(); diagnosa akan melaporkannya.
        @file_put_contents(nm_path('users.json'),
            json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
    }
    return $users;
}

// ---------------- Sesi (cookie server-side, tanpa localStorage) ----------------
// 1) Utama: cookie sesi httponly. Saat HTTPS, pakai SameSite=None+Secure
//    agar tetap berfungsi walau halaman dibuka dalam iframe.
// 2) Fallback: header X-Session-Id (kalau cookie diblokir browser,
//    mis. iframe/preview). Tanpa localStorage sama sekali.
$nmHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
    || (($_SERVER['SERVER_PORT'] ?? '') == '443');

$nmToken = (string)($_SERVER['HTTP_X_SESSION_ID'] ?? '');
if ($nmToken !== '' && !preg_match('/^[a-zA-Z0-9,\-]{10,128}$/', $nmToken)) $nmToken = '';
if ($nmToken !== '' && empty($_COOKIE['NMSID'])) session_id($nmToken);

session_name('NMSID');
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'httponly' => true,
    'secure'   => $nmHttps,
    'samesite' => $nmHttps ? 'None' : 'Lax',
]);
ini_set('session.gc_maxlifetime', (string) NM_SESSION_MAX);
session_start();

// Sesi kedaluwarsa jika tidak aktif > 1 jam (perpanjang otomatis tiap request)
if (!empty($_SESSION['user'])) {
    if (isset($_SESSION['last']) && (time() - (int)$_SESSION['last']) > NM_SESSION_MAX) {
        $_SESSION = [];
        session_destroy();
    } else {
        $_SESSION['last'] = time();
    }
}

function nm_user(): ?array { return empty($_SESSION['user']) ? null : $_SESSION['user']; }
function nm_need_login(): void { if (!nm_user()) nm_err('Belum login / sesi berakhir. Silakan login ulang.', 401); }
function nm_need_admin(): void {
    $u = nm_user();
    if (!$u || ($u['role'] ?? '') !== 'admin') nm_err('Akses ditolak (khusus admin).', 403);
}

function nm_input(): array {
    $j = json_decode((string)file_get_contents('php://input'), true);
    return is_array($j) ? $j : [];
}

// ---------------- Aktivitas user (notif admin: siapa yang sedang aktif) ----------------
// Dicatat otomatis dari heartbeat aplikasi (tiap 1 menit selama web dibuka).
// Berganti hari -> daftar otomatis direset (notif per hari).
function nm_activity_read(): array {
    $d = nm_read('activity.json');
    if (!is_array($d) || !is_array($d['users'] ?? null)) return ['date' => '', 'users' => []];
    return ['date' => (string)($d['date'] ?? ''), 'users' => $d['users']];
}

function nm_activity_set(string $username, array $info, bool $hapus = false): void {
    if ($username === '') return;
    $a       = nm_activity_read();
    $hariIni = date('Y-m-d');
    if ($a['date'] !== $hariIni) $a = ['date' => $hariIni, 'users' => []]; // reset per hari
    if ($hapus) unset($a['users'][$username]);
    else        $a['users'][$username] = $info;
    nm_write('activity.json', $a);
}

function nm_perms(string $role): array {
    if ($role === 'admin') return [
        'menu'    => ['dashboard', 'data', 'tambah', 'foto', 'users'],
        'actions' => ['view', 'add', 'edit', 'delete', 'export'],
    ];
    return [
        'menu'    => ['dashboard', 'data', 'tambah', 'foto'],
        'actions' => ['view', 'add', 'export'],
    ];
}

// ---------------- Diagnosa mandiri server ----------------
// Buka: api.php?ep=diagnosa        -> JSON
// Buka: api.php?ep=diagnosa&html=1 -> halaman rapi untuk dibaca di browser
function nm_diagnosa(): array {
    $d = [
        'app'    => 'IT Pancaran Kasih',
        'php'    => PHP_VERSION,
        'sapi'   => PHP_SAPI,
        'server' => $_SERVER['SERVER_SOFTWARE'] ?? '-',
        'waktu'  => date('c'),
    ];

    // 1) Uji sesi PHP (penyebab gagal login paling sering)
    $acak = 'nm-' . mt_rand();
    $_SESSION['nm_test'] = $acak;
    session_write_close();
    $ok = false;
    try { $ok = @session_start(); } catch (\Throwable $e) { $ok = false; }
    $sesiOk = $ok && (($_SESSION['nm_test'] ?? '') === $acak);
    unset($_SESSION['nm_test']);
    $d['sesi'] = [
        'save_path'      => ini_get('session.save_path') ?: sys_get_temp_dir(),
        'bisa_menyimpan' => $sesiOk,
    ];

    // 2) Folder & file data
    $d['folder'] = ['path' => __DIR__, 'bisa_ditulis' => is_writable(__DIR__)];
    $d['file'] = [];
    foreach (['users.json', 'maintenance.json', 'photos.json', 'profiles.json'] as $f) {
        $p = nm_path($f);
        $d['file'][$f] = [
            'ada'  => file_exists($p),
            'baca' => is_readable($p),
            'tulis' => file_exists($p) ? is_writable($p) : null,
        ];
    }

    // 3) Folder uploads
    $dir = nm_path('uploads');
    $d['uploads'] = [
        'ada'          => is_dir($dir),
        'bisa_ditulis' => is_dir($dir) ? is_writable($dir) : is_writable(__DIR__),
    ];

    // 4) Uji tulis file nyata
    $tf = nm_path('.nm_uji_tulis');
    $d['uji_tulis_file'] = (@file_put_contents($tf, 'ok') !== false);
    if ($d['uji_tulis_file']) @unlink($tf);

    // 5) Ringkasan masalah + solusi
    $masalah = [];
    if (!$sesiOk) {
        $sp = $d['sesi']['save_path'];
        $masalah[] = [
            'judul' => 'Folder sesi PHP tidak bisa menyimpan data login (INI PENYEBAB GAGAL LOGIN)',
            'solusi' => "Jalankan di server:\n  mkdir -p {$sp}\n  chown -R www-data:www-data {$sp}\n  chmod 1733 {$sp}\nlalu restart PHP-FPM / Apache.",
        ];
    }
    foreach (['users.json', 'maintenance.json', 'photos.json', 'profiles.json'] as $f) {
        $info = $d['file'][$f];
        if (!$info['ada'] || !$info['baca']) {
            $masalah[] = ['judul' => "File {$f} tidak ada / tidak terbaca", 'solusi' => "Copy ulang file {$f} ke folder aplikasi (" . __DIR__ . ")."];
        } elseif ($info['tulis'] === false) {
            $masalah[] = ['judul' => "File {$f} tidak bisa ditulis", 'solusi' => 'Jalankan: chown -R www-data:www-data ' . __DIR__];
        }
    }
    if (!$d['folder']['bisa_ditulis']) {
        $masalah[] = ['judul' => 'Folder aplikasi tidak bisa ditulis (data & foto tidak akan tersimpan)', 'solusi' => 'Jalankan: chown -R www-data:www-data ' . __DIR__];
    }
    if (version_compare(PHP_VERSION, '7.3.0', '<')) {
        $masalah[] = ['judul' => 'Versi PHP terlalu lama (' . PHP_VERSION . ', minimal 7.3)', 'solusi' => 'Upgrade PHP di server.'];
    }

    // 6) Password user sudah terenkripsi? (naikkan otomatis + laporkan bila gagal)
    $masihPlaintext = 0;
    foreach (nm_users() as $u) {
        $p = (string)($u['password'] ?? '');
        if ($p !== '' && !nm_pw_is_hash($p)) $masihPlaintext++;
    }
    $d['password_terenkripsi'] = ($masihPlaintext === 0);
    if ($masihPlaintext > 0) {
        $masalah[] = [
            'judul' => "Ada {$masihPlaintext} password user yang belum terenkripsi di users.json (folder tidak bisa ditulis)",
            'solusi' => 'Jalankan: chown -R www-data:www-data ' . __DIR__ . ' lalu buka halaman ini lagi — enkripsi berjalan otomatis.',
        ];
    }

    $d['ok'] = empty($masalah);
    $d['masalah'] = $masalah;
    return $d;
}

function nm_html_diagnosa(array $d): void {
    header('Content-Type: text/html; charset=utf-8');
    $e = function ($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); };
    $item = [
        ['PHP versi ' . $d['php'] . ' (minimal 7.3)', version_compare(PHP_VERSION, '7.3.0', '>=')],
        ['Sesi PHP bisa menyimpan data login', $d['sesi']['bisa_menyimpan']],
        ['Folder aplikasi bisa ditulis (' . $d['folder']['path'] . ')', $d['folder']['bisa_ditulis']],
    ];
    foreach (['users.json', 'maintenance.json', 'photos.json', 'profiles.json'] as $f) {
        $info = $d['file'][$f];
        $ok = $info['ada'] && $info['baca'] && $info['tulis'] !== false;
        $ket = $info['ada'] ? ($info['tulis'] === false ? 'ADA tapi tidak bisa ditulis' : 'ada & terbaca') : 'TIDAK ADA';
        $item[] = ["File {$f}: {$ket}", $ok];
    }
    $item[] = ['Folder uploads siap dipakai', $d['uploads']['bisa_ditulis']];
    $item[] = ['Uji tulis file di folder aplikasi', $d['uji_tulis_file']];

    $baris = '';
    foreach ($item as $it) {
        $icon = $it[1] ? '&#9989;' : '&#10060;';
        $baris .= '<tr><td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:1.05rem">' . $icon . '</td>'
            . '<td style="padding:9px 12px;border-bottom:1px solid #e2e8f0">' . $e($it[0]) . '</td></tr>';
    }

    $masalahHtml = '';
    if (!empty($d['masalah'])) {
        $masalahHtml .= '<h2 style="font-size:1.05rem;margin:26px 0 10px;color:#b91c1c">&#9888; Masalah yang perlu diperbaiki</h2>';
        foreach ($d['masalah'] as $m) {
            $masalahHtml .= '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;margin-bottom:12px">'
                . '<strong>' . $e($m['judul']) . '</strong>'
                . '<pre style="background:#0f172a;color:#e2e8f0;padding:12px;border-radius:8px;margin-top:10px;overflow-x:auto;font-size:.8rem;white-space:pre-wrap">' . $e($m['solusi']) . '</pre>'
                . '</div>';
        }
    } else {
        $masalahHtml .= '<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:14px 16px;margin-top:22px;color:#065f46;font-weight:600">'
            . '&#9989; Server dalam kondisi BAIK — semua syarat aplikasi terpenuhi.</div>';
    }

    echo '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<title>IT Pancaran Kasih — Diagnosa Server</title></head>'
        . '<body style="font-family:system-ui,Segoe UI,Arial,sans-serif;background:#f8fafc;margin:0;padding:24px;color:#0f172a">'
        . '<div style="max-width:760px;margin:0 auto">'
        . '<h1 style="font-size:1.35rem;margin:0">IT Pancaran Kasih &mdash; Diagnosa Server</h1>'
        . '<p style="color:#64748b;font-size:.85rem;margin:6px 0 18px">' . $e($d['server']) . ' &bull; PHP ' . $e($d['php']) . ' &bull; ' . $e($d['waktu']) . '</p>'
        . '<h2 style="font-size:1.1rem;margin:0 0 10px;color:' . ($d['ok'] ? '#065f46' : '#b91c1c') . '">'
        . ($d['ok'] ? 'Semua Pemeriksaan Baik' : 'Ditemukan ' . count($d['masalah']) . ' Masalah') . '</h2>'
        . '<table style="border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;width:100%">' . $baris . '</table>'
        . $masalahHtml
        . '<p style="color:#64748b;font-size:.78rem;margin-top:22px">Jika semua pemeriksaan BAIK tapi tetap gagal login, kirim tangkapan layar halaman ini.</p>'
        . '</div></body></html>';
    exit;
}

// ---------------- Router ----------------
$ep     = isset($_GET['ep'])  ? preg_replace('/[^a-z_]/', '', strtolower($_GET['ep']))  : '';
$act    = isset($_GET['act']) ? preg_replace('/[^a-z_]/', '', strtolower($_GET['act'])) : '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

switch ($ep) {

    // ---- Cek server (tanpa login): buka api.php?ep=ping di browser ----
    case 'ping':
        nm_out(['ok' => true, 'app' => 'IT Pancaran Kasih', 'php' => PHP_VERSION, 'time' => date('c')]);

    // ---- Diagnosa mandiri: buka api.php?ep=diagnosa&html=1 di browser ----
    case 'diagnosa':
        $nmDiag = nm_diagnosa();
        if (isset($_GET['html'])) nm_html_diagnosa($nmDiag);
        nm_out($nmDiag);

    // ---- Login / logout / sesi ----
    case 'login':
        if ($method !== 'POST') nm_err('Gunakan POST.', 405);
        $in = nm_input();
        $username = (string)($in['username'] ?? '');
        $password = (string)($in['password'] ?? '');
        $found = null;
        foreach (nm_users() as $u) {
            if (($u['username'] ?? '') === $username && nm_pw_check($password, (string)($u['password'] ?? ''))) { $found = $u; break; }
        }
        if (!$found) nm_err('Username atau password salah', 401);
        session_regenerate_id(true);
        $_SESSION['user'] = [
            'id'        => $found['id'] ?? 0,
            'username'  => $found['username'],
            'fullname'  => $found['fullname'] ?? $found['username'],
            'role'      => $found['role'] ?? 'user',
            'phone'     => $found['phone'] ?? '',
            'email'     => $found['email'] ?? '',
            'loginTime' => time() * 1000,
        ];
        $_SESSION['last'] = time();

        // Verifikasi sesi benar-benar tersimpan di server
        // (mendeteksi folder sesi PHP yang tidak bisa ditulis)
        $cekUser = $_SESSION['user']['username'];
        session_write_close();
        @session_start();
        if (($_SESSION['user']['username'] ?? '') !== $cekUser) {
            nm_err('Login BENAR, tetapi server gagal menyimpan sesi PHP. Perbaiki permission folder sesi: '
                . (ini_get('session.save_path') ?: sys_get_temp_dir())
                . ' — jalankan: chown -R www-data:www-data <folder-sesi> lalu restart PHP/web server, dan coba lagi.', 500);
        }

        // token = ID sesi, dipakai client via header X-Session-Id
        // (fallback kalau cookie diblokir browser)
        nm_out(['success' => true, 'user' => $_SESSION['user'], 'token' => session_id()]);

    case 'logout':
        // Hapus dari daftar user aktif (notif admin) sebelum sesi dibuang
        $uKeluar = nm_user();
        if ($uKeluar) nm_activity_set((string)$uKeluar['username'], [], true);
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $c = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $c['path'], $c['domain'], $c['secure'], $c['httponly']);
        }
        session_destroy();
        nm_out(['success' => true]);

    case 'session':
        nm_out(['user' => nm_user()]);

    // ---- Permission menu/aksi sesuai role ----
    case 'perms':
        nm_need_login();
        nm_out(nm_perms((string)(nm_user()['role'] ?? 'user')));

    // ---- Data maintenance ----
    // ---- Heartbeat: tandai user sedang aktif (dipanggil aplikasi tiap 1 menit) ----
    // Sekaligus menjaga sesi login tetap hidup selama web dibuka, sehingga
    // pop up / form yang sedang diisi tidak tiba-tiba terputus.
    case 'heartbeat':
        nm_need_login();
        $u = nm_user();
        nm_activity_set((string)$u['username'], [
            'username'   => (string)$u['username'],
            'fullname'   => (string)($u['fullname'] ?? $u['username']),
            'role'       => (string)($u['role'] ?? 'user'),
            'lastActive' => (int)round(microtime(true) * 1000),
        ]);
        nm_out(['success' => true]);

    // ---- User yang sedang aktif (notif admin; aktif = 3 menit terakhir) ----
    case 'activity':
        nm_need_login();
        nm_need_admin();
        $a     = nm_activity_read();
        $batas = (int)round(microtime(true) * 1000) - 180000;
        $aku   = (string)((nm_user()['username'] ?? ''));
        $aktif = [];
        foreach ($a['users'] as $un => $info) {
            if ((int)($info['lastActive'] ?? 0) >= $batas && (string)$un !== $aku) $aktif[] = $info;
        }
        nm_out(['date' => date('Y-m-d'), 'count' => count($aktif), 'users' => $aktif]);

    case 'maintenance':
        nm_need_login();
        if ($act === 'save') {
            if ($method !== 'POST') nm_err('Gunakan POST.', 405);
            $list = nm_input()['maintenance'] ?? null;
            if (!is_array($list)) nm_err('Format data maintenance tidak valid.');

            // ---- HAK AKSES DATA (per user) ----
            // Admin  : bebas mengubah & menghapus semua data.
            // User biasa : boleh MENAMBAH data baru & MENGUBAH data miliknya
            //              sendiri (createdBy). HAPUS data -> hanya admin.
            // Aturan ini ditegakkan DI SERVER: menyembunyikan tombol saja
            // tidak cukup, perintah yang dipaksa dikirim tetap ditolak di sini.
            $aku = nm_user();
            if (($aku['role'] ?? '') !== 'admin') {
                $lama = nm_read('maintenance.json');
                $lamaById = [];
                foreach ($lama as $r) { $lamaById[(string)($r['id'] ?? '')] = $r; }
                $baruIds = [];
                foreach ($list as $k => $r) {
                    $rid = (string)($r['id'] ?? '');
                    $baruIds[$rid] = true;
                    if ($rid !== '' && isset($lamaById[$rid])) {
                        $milikSendiri = (string)($lamaById[$rid]['createdBy'] ?? '') === (string)($aku['username'] ?? '');
                        if ($milikSendiri) {
                            // Kepemilikan tetap pada pembuat aslinya (tidak bisa dipindahkan)
                            $list[$k]['createdBy'] = (string)($lamaById[$rid]['createdBy'] ?? '');
                        } else {
                            // Data milik orang lain: hanya boleh ikut terkirim APA ADANYA.
                            // (form aplikasi selalu mengirim seluruh daftar data, jadi data
                            // milik lain yang tidak disentuh harus tetap diterima apa adanya;
                            // kalau isinya berubah sedikit pun -> ditolak.)
                            if ($r != $lamaById[$rid]) {
                                nm_err('Anda hanya boleh mengubah data milik sendiri.', 403);
                            }
                        }
                    } else {
                        // Data baru: otomatis milik pembuatnya (createdBy tidak bisa dipalsukan)
                        $list[$k]['createdBy'] = (string)($aku['username'] ?? '');
                    }
                }
                // Tidak boleh menghapus data apa pun (hilangnya id lama = hapus)
                foreach ($lama as $r) {
                    if (!isset($baruIds[(string)($r['id'] ?? '')])) {
                        nm_err('Penghapusan data hanya boleh dilakukan admin.', 403);
                    }
                }
            }
            nm_write('maintenance.json', array_values($list));
            nm_out(['success' => true]);
        }
        nm_out(nm_read('maintenance.json'));

    // ---- Users ----
    case 'users':
        nm_need_login();
        if ($act === 'save') {
            nm_need_admin();
            $list = nm_input()['users'] ?? null;
            if (!is_array($list)) nm_err('Format data users tidak valid.');

            // Password tersimpan TERENKRIPSI (bcrypt) dan tidak pernah dikirim
            // ke browser. Jadi dari form: password baru -> dienkripsi di sini;
            // '(terenkripsi)'/kosong -> password tidak diubah (pakai yang lama).
            $lama = [];
            foreach (nm_users() as $u) {
                $pw = (string)($u['password'] ?? '');
                $lama['#' . (string)($u['id'] ?? '')]       = $pw;
                $lama['@' . (string)($u['username'] ?? '')] = $pw;
            }
            $bersih = [];
            foreach (array_values($list) as $u) {
                $pw     = (string)($u['password'] ?? '');
                $pwLama = $lama['#' . (string)($u['id'] ?? '')] ?? $lama['@' . (string)($u['username'] ?? '')] ?? '';
                if ($pw === '' || $pw === '(terenkripsi)') {
                    if ($pwLama === '') nm_err('Password wajib diisi untuk user: ' . (($u['username'] ?? '?') ?: '(tanpa nama)'));
                    $u['password'] = $pwLama;                                  // tidak diubah
                } elseif (nm_pw_is_hash($pw)) {
                    $u['password'] = $pw;                                      // sudah terenkripsi
                } else {
                    $u['password'] = password_hash($pw, PASSWORD_DEFAULT);     // password baru -> enkripsi
                }
                $bersih[] = $u;
            }
            nm_write('users.json', $bersih);
            nm_out(['success' => true]);
        }
        // Data user untuk admin — password TIDAK IKUT dikirim ke browser
        if ((nm_user()['role'] ?? '') === 'admin') {
            nm_out(array_map(function ($u) { $u['password'] = '(terenkripsi)'; return $u; }, nm_users()));
        }
        nm_out([]);

    // ---- Logo aplikasi (diganti admin lewat menu Kelola User) ----
    case 'logo':
        if ($act === 'upload') {
            nm_need_admin();
            $in = nm_input();
            $data = (string)($in['logo'] ?? '');
            if ($data === '') nm_err('Data logo tidak dikirim.');
            if (preg_match('/^data:image\/[a-z+]+;base64,(.+)$/is', $data, $m)) $data = $m[1]; // buang prefiks data-URL
            $bytes = base64_decode($data, true);
            if ($bytes === false || strlen($bytes) < 16) nm_err('Data logo tidak valid (bukan base64 gambar).');
            if (strlen($bytes) > 1024 * 1024) nm_err('Logo terlalu besar — maksimal 1MB setelah dikompres.');
            if (substr($bytes, 0, 8) !== "\x89PNG\r\n\x1a\n") nm_err('Logo harus berformat PNG (aplikasi mengonversi otomatis).');
            if (@getimagesizefromstring($bytes) === false) nm_err('File logo bukan gambar PNG yang valid.');
            if (!@file_put_contents(nm_path('logo.png'), $bytes)) {
                nm_err('Gagal menyimpan logo. Jalankan di server: chown -R www-data:www-data ' . __DIR__);
            }
            nm_out(['success' => true]);
        }
        if ($act === 'hapus') {
            nm_need_admin();
            $p = nm_path('logo.png');
            if (file_exists($p) && !@unlink($p)) nm_err('Gagal menghapus logo (cek permission folder).');
            nm_out(['success' => true]);
        }
        // GET: kirim file logo -> dipakai <img src="api.php?ep=logo"> di halaman
        // login, sidebar, dan ikon tab browser. Kalau belum ada logo, kirim PNG
        // transparan 1x1 (bukan 404) supaya console browser tetap bersih;
        // aplikasi mendeteksi gambar <=1px lalu menampilkan ikon bawaan.
        $p = nm_path('logo.png');
        $kosong = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
        $bytes = (is_readable($p)) ? (string)file_get_contents($p) : '';
        if (strlen($bytes) < 8) $bytes = $kosong;
        header('Content-Type: image/png');
        header('Cache-Control: no-cache');
        header('Content-Length: ' . strlen($bytes));
        echo $bytes;
        exit;

    // ---- Foto dokumentasi ----
    case 'photos':
        nm_need_login();

        if ($act === 'upload') {
            $f = $_FILES['photo'] ?? null;
            if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                $code = (int)($f['error'] ?? -1);
                $hint = in_array($code, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)
                    ? ' Ukuran melebihi batas upload PHP (upload_max_filesize / post_max_size).' : '';
                nm_err('Upload gagal (kode ' . $code . ').' . $hint);
            }
            if ((int)$f['size'] > NM_UPLOAD_MAX) nm_err('Ukuran file terlalu besar (maks 64MB).');

            $info = @getimagesize($f['tmp_name']);
            if ($info === false) nm_err('File yang diupload bukan gambar yang valid.');
            $extMap = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif', 'image/webp' => 'webp'];
            $mime = (string)($info['mime'] ?? '');
            if (!isset($extMap[$mime])) nm_err('Format gambar tidak didukung (' . $mime . ').');
            $ext = $extMap[$mime];

            $dir = nm_path('uploads');
            if (!is_dir($dir) && !@mkdir($dir, 0775, true)) nm_err('Gagal membuat folder uploads. Jalankan di server: chown -R www-data:www-data ' . __DIR__);
            if (!is_writable($dir)) nm_err('Folder uploads tidak bisa ditulis. Jalankan di server: chown -R www-data:www-data ' . __DIR__);

            $name = date('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
            if (!@move_uploaded_file($f['tmp_name'], $dir . '/' . $name)) nm_err('Gagal menyimpan file upload.');

            $entry = [
                'id'         => (int)(microtime(true) * 1000),
                'date'       => $_POST['date']       ?? date('Y-m-d'),
                'location'   => $_POST['location']   ?? '',
                'caption'    => $_POST['caption']    ?? '',
                'uploadedBy' => $_POST['uploadedBy'] ?? (nm_user()['fullname'] ?? ''),
                'photo'      => 'uploads/' . $name,
            ];
            $photos = nm_read('photos.json');
            array_unshift($photos, $entry);
            nm_write('photos.json', array_values($photos));
            nm_out($entry);
        }

        if ($act === 'add') {
            $item = nm_input();
            if (!$item) nm_err('Data foto tidak valid.');
            if (empty($item['id'])) $item['id'] = (int)(microtime(true) * 1000);
            $photos = nm_read('photos.json');
            array_unshift($photos, $item);
            nm_write('photos.json', array_values($photos));
            nm_out($item);
        }

        if ($act === 'delete') {
            $id = nm_input()['id'] ?? null;
            $photos = nm_read('photos.json');
            $keep = []; $removed = null;
            foreach ($photos as $p) {
                if ((string)($p['id'] ?? '') === (string)$id) $removed = $p; else $keep[] = $p;
            }
            if ($removed) {
                if (!empty($removed['photo']) && preg_match('#^uploads/[A-Za-z0-9._-]+$#', (string)$removed['photo'])) {
                    @unlink(nm_path((string)$removed['photo']));
                }
                nm_write('photos.json', array_values($keep));
            }
            nm_out(['success' => true]);
        }

        nm_out(nm_read('photos.json'));

    // ---- Foto profil ----
    case 'profiles':
        nm_need_login();
        if ($method === 'POST') {
            $in = nm_input();
            $u = (string)($in['username'] ?? '');
            if ($u === '') nm_err('Username kosong.');
            $map = nm_read('profiles.json');
            $map[$u] = $in['photo'] ?? '';
            nm_write('profiles.json', (object)$map);
            nm_out(['success' => true]);
        }
        nm_out((object)nm_read('profiles.json'));

    default:
        nm_err('Endpoint tidak dikenal: ' . $ep, 404);
}
