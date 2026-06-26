# Proyek Akhir: Belajar Penerapan AI di Aplikasi Web

## Penilaian Proyek
Proyek ini berhasil mendapatkan bintang 5/5 pada submission dicoding course Belajar Penerapan AI di Aplikasi Web.

![Penilaian Proyek](README/penilaian_proyek.png)

RootFacts adalah aplikasi web berbasis AI yang mendeteksi sayuran melalui kamera, lalu menghasilkan fun fact secara lokal di browser. Proyek ini dibangun untuk submission Dicoding "Belajar Penerapan AI di Aplikasi Web" dengan pendekatan MVP, TensorFlow.js, Transformers.js, dan dukungan PWA.

---

## Deskripsi Proyek

RootFacts menggabungkan dua kemampuan AI utama dalam satu alur:

- Computer Vision untuk mengenali jenis sayuran dari kamera.
- Generative AI untuk membuat fakta menarik berdasarkan hasil deteksi.

Seluruh alur utama berjalan di browser pengguna, sehingga aplikasi terasa interaktif dan tetap relevan dengan materi penerapan AI pada platform web.

---

## Fitur Utama

### 1. Deteksi Sayuran

- Mengakses kamera menggunakan MediaDevices API.
- Memuat model TensorFlow.js lokal dari folder `src/model/`.
- Menampilkan label hasil prediksi dan confidence score.
- Mendukung FPS limit yang dapat diatur dari UI.
- Menggunakan backend adaptif: `WebGPU` dengan fallback ke `WebGL`.
- Menjaga penggunaan memori prediksi dengan `tf.tidy()`.

### 2. Fun Fact Generatif

- Menggunakan `@huggingface/transformers` untuk membuat fakta unik dari label deteksi.
- Prompt dibentuk secara dinamis berdasarkan sayuran yang dikenali.
- Menyediakan persona/tone yang dapat dipilih pengguna:
  - `Normal`
  - `Lucu`
  - `Profesional`
  - `Santai`
- Mendukung copy to clipboard untuk hasil fun fact.
- Menerapkan sanitasi input untuk mengurangi risiko prompt injection.

### 3. PWA dan Offline Support

- Memiliki Web App Manifest agar aplikasi dapat diinstal.
- Menggunakan Service Worker berbasis Workbox.
- Menyimpan aset inti dan model deteksi ke precache agar tetap bisa digunakan saat offline.
- Menyediakan screenshot manifest untuk preview saat instalasi PWA.

---

## Teknologi yang Digunakan

- `JavaScript (ES Modules)`
- `Webpack`
- `TensorFlow.js`
- `@tensorflow/tfjs-backend-webgpu`
- `@huggingface/transformers`
- `Workbox`
- `ESLint`
- `Prettier`

---

## Arsitektur Proyek

Proyek ini memakai pola MVP:

- `View`
  - `src/scripts/pages/home/home-page.js`
  - `src/scripts/templates.js`
- `Presenter`
  - `src/scripts/pages/home/home-presenter.js`
- `Model / Service`
  - `src/scripts/services/camera.service.js`
  - `src/scripts/services/detection.service.js`
  - `src/scripts/services/rootfacts.service.js`

Struktur ini dipakai agar logika UI, alur aplikasi, dan service AI tetap terpisah dengan jelas.

---

## Struktur Folder

```text
src/
├── index.html
├── model/
│   ├── metadata.json
│   ├── model.json
│   └── weights.bin
├── public/
│   ├── favicon.ico
│   ├── manifest.json
│   ├── sw.js
│   ├── icons/
│   └── screenshots/
├── scripts/
│   ├── config.js
│   ├── index.js
│   ├── templates.js
│   ├── pages/
│   │   ├── app.js
│   │   └── home/
│   │       ├── home-page.js
│   │       └── home-presenter.js
│   ├── services/
│   │   ├── camera.service.js
│   │   ├── detection.service.js
│   │   └── rootfacts.service.js
│   └── utils/
│       └── index.js
└── styles/
    └── styles.css
```

---

## Cara Menjalankan Proyek

### Development

```bash
npm install
npm run start-dev
```

Lalu buka:

```text
http://localhost:8080
```

### Production Build

```bash
npm run build
npm run serve
```

Build production diperlukan untuk menguji manifest, service worker, dan cache offline.

---

## Menjalankan Linter

```bash
npm run lint
```

Format code dapat dicek dengan:

```bash
npm run prettier
```

---

## Catatan Pengujian

- Gunakan pencahayaan yang cukup saat mencoba deteksi kamera.
- Jika service worker atau cache terasa tidak sinkron setelah update build:
  - `Unregister` service worker lama dari DevTools.
  - lakukan `Clear site data`.
  - reload aplikasi.
- Untuk memenuhi submission, isi `STUDENT.txt` dengan URL deployment production yang valid.

---

## Deployment

Target deployment proyek ini adalah Netlify. Setelah build berhasil:

1. Deploy folder `dist/` ke Netlify.
2. Pastikan `manifest.json`, `sw.js`, `icons`, `screenshots`, dan `model/` ikut terakses di URL production.
3. Isi `STUDENT.txt` dengan format:

```text
APP_URL=https://your-app.netlify.app
```

---

## Penutup

Proyek ini menunjukkan penerapan AI di aplikasi web secara end-to-end:

- deteksi objek dengan TensorFlow.js,
- generasi konten dengan Transformers.js,
- dan dukungan offline melalui PWA.

Fokus utamanya adalah membuat aplikasi yang interaktif, ringan, dan tetap dapat digunakan pada kondisi jaringan terbatas.
