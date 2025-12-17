# 🛡️ Rekber App - Backend Service

![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)
![Express](https://img.shields.io/badge/Express-v4-blue.svg)
![Prisma](https://img.shields.io/badge/Prisma-ORM-teal.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

Backend service yang kokoh untuk aplikasi **Layanan Rekening Bersama (Escrow Service)**. Sistem ini bertindak sebagai pihak ketiga yang netral untuk mengamankan transaksi jual-beli online, melindungi Pembeli dari penipuan barang, dan melindungi Penjual dari penipuan pembayaran.

Dibangun dengan arsitektur **MVC (Model-View-Controller)** menggunakan Node.js, dengan fokus pada keamanan transaksi (PIN Authorization) dan komunikasi real-time.

---

## 📑 Daftar Isi
- [Fitur Unggulan](#-fitur-unggulan)
- [Teknologi (Tech Stack)](#-teknologi-tech-stack)
- [Struktur Database](#-struktur-database)
- [Prasyarat](#-prasyarat)
- [Instalasi & Setup](#-instalasi--setup)
- [Environment Variables](#-environment-variables)
- [Struktur Folder](#-struktur-folder)
- [Dokumentasi API](#-dokumentasi-api)
- [Lisensi](#-lisensi)

---

## ✨ Fitur Unggulan

### 🔐 Keamanan & Autentikasi
* **JWT Authentication:** Login aman menggunakan JSON Web Token.
* **PIN Protection:** Admin wajib menggunakan **PIN 6 Digit** untuk mengeksekusi tindakan sensitif (Pencairan Dana & Refund).
* **Bcrypt Hashing:** Password dan PIN disimpan dalam bentuk terenkripsi.

### 💰 Manajemen Transaksi Escrow
* **Siklus Lengkap:** *Created* -> *Paid* -> *Verified* -> *Sent* -> *Completed* -> *Disbursed*.
* **Bukti Digital:** Upload bukti transfer dan bukti pengiriman (Resi) terintegrasi dengan Cloudinary.
* **Auto-Status:** Sistem otomatis mendeteksi alur status berdasarkan aksi user.

### ⚖️ Pusat Resolusi (Dispute System)
* **Sengketa:** Pembeli dapat mengajukan komplain jika barang tidak sesuai.
* **Mediasi:** Admin memiliki dashboard khusus untuk menengahi sengketa.
* **Keputusan:** Admin dapat memutuskan *Full Refund* ke Pembeli atau *Lanjut Cair* ke Penjual.

### 💬 Real-time Communication
* **Live Chat:** Room chat privat antara Penjual, Pembeli, dan Admin menggunakan **Socket.io**.
* **Notifikasi:** Pembaruan status transaksi secara real-time.

---

## 🚀 Teknologi (Tech Stack)

| Kategori | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Runtime** | Node.js | JavaScript runtime environment |
| **Framework** | Express.js | Web framework untuk REST API |
| **Database** | PostgreSQL | Relational Database Management System |
| **ORM** | Prisma | Modern ORM untuk manajemen skema & query |
| **Storage** | Cloudinary | Cloud storage untuk manajemen gambar |
| **Real-time** | Socket.io | Bidirectional event-based communication |
| **Validation** | Joi / Zod | (Opsional) Validasi input request |

---

## 🛠 Instalasi & Setup

Ikuti langkah-langkah berikut untuk menjalankan server di lingkungan lokal (Development).

### 1. Clone Repository
```bash
git clone [https://github.com/username-anda/rekber-backend.git](https://github.com/username-anda/rekber-backend.git)
cd rekber-backend
