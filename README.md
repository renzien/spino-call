# Spinosaurus Calling 3D

Website panggilan interaktif bersama Spinosaurus 3D. Saat panggilan diangkat, Spino akan menyapa, mendengarkan mikrofon, dan menjawab dalam bahasa Indonesia. Jika mikrofon tidak tersedia, percakapan tetap bisa dilakukan lewat kolom ketik.

## Menjalankan di komputer

Cara mudah untuk Windows: pastikan Node.js sudah terpasang, lalu klik dua kali **JALANKAN-WEBSITE.bat**.

Cara melalui Terminal atau Command Prompt:

1. Jalankan `npm install`.
2. Jalankan `npm run dev`.
3. Buka alamat yang muncul, biasanya `http://localhost:5173`.

## Upload ke Vercel

1. Masuk ke Vercel dan pilih **Add New → Project**.
2. Upload folder proyek ini atau masukkan ke repository GitHub.
3. Vercel akan membaca konfigurasi Vite secara otomatis.
4. Klik **Deploy** tanpa mengubah Build Command atau Output Directory.

Mikrofon hanya dapat digunakan dari alamat HTTPS atau `localhost`. Vercel sudah memakai HTTPS.

## Agar suara lebih natural

Website otomatis memilih suara Indonesia terbaik yang tersedia pada perangkat. Saat telepon berlangsung, tekan tombol **Suara** dan pilih suara yang mengandung kata **Natural**, **Online**, **Google**, atau **Microsoft** bila tersedia. Hasil suara bergantung pada browser dan sistem operasi pengguna.

## Percakapan yang dikenali

Spino memiliki respons khusus untuk salam, nama pengguna, makanan, habitat, berenang, ukuran tubuh, zaman hidup, lelucon, auman, cuaca, cerita, dan ucapan perpisahan. Respons lain akan dijawab dengan percakapan umum.
