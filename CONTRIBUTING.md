# Contributing to GitHub Organization Insights

Terima kasih sudah tertarik berkontribusi! Proyek ini ingin menjadi platform analytics engine untuk organisasi GitHub, dan kontribusi dari komunitas sangat membantu.

## 📌 Panduan Umum

- Buka issue terlebih dahulu untuk fitur besar atau perubahan arsitektur.
- Jika kamu ingin mengerjakan issue, beri tahu dengan komentar "I want to work on this".
- Gunakan branch dengan nama yang jelas: `feature/<nama-fitur>` atau `fix/<deskripsi-bug>`.

## 🛠️ Setup Lokal

1. Fork repository ini.
2. Clone ke mesin lokal:

```bash
git clone https://github.com/<username>/org-graph.git
cd org-graph
```

3. Salin `.env.example` menjadi `.env` dan isi variabel yang diperlukan.
4. Install dependencies:

```bash
bun install
```

5. Jalankan server:

```bash
bun run dev
```

## ✅ Standar Kontribusi

- Gunakan TypeScript.
- Sertakan dokumentasi singkat jika menambahkan endpoint baru atau mengubah alur API.
- Tambahkan test bila relevan.
- Pastikan `bun run typecheck` berjalan tanpa error.

## 🧹 Style dan Best Practice

- Ikuti struktur folder yang sudah ada.
- Pisahkan logika GitHub API, agregasi, dan renderer.
- Hindari panggilan GitHub API langsung di layer renderer.
- Gunakan cache saat data bisa disimpan sementara.

## 📂 Struktur Branch

- `main` atau `master` untuk rilis stabil.
- `develop` untuk fitur yang sedang dikembangkan (opsional).
- Branch feature menggunakan pola: `feature/<nama-fitur>`.
- Branch fix menggunakan pola: `fix/<deskripsi-bug>`.

## 🧪 Pull Request

Sebelum mengirim PR:

- Pastikan perubahan kecil dan fokus.
- Tulis deskripsi PR yang jelas.
- Sertakan contoh request jika menambahkan endpoint baru.
- Pastikan tidak ada error TypeScript.

## 💬 Komunikasi

- Buat issue untuk bug, fitur, atau peningkatan.
- Beri komentar jika kamu butuh bantuan atau klarifikasi.
- Hormati komunitas dan jaga diskusi tetap konstruktif.

## 📜 License

Dengan mengirim kontribusi, kamu setuju bahwa kontribusimu dapat dilisensikan di bawah lisensi proyek ini.
