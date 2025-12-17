# 🛡️ Rekber App - Backend API

Backend service untuk aplikasi **Layanan Rekening Bersama (Escrow Service)**.
Dibangun menggunakan **Node.js**, **Express**, **Prisma**, dan **PostgreSQL**. Menyediakan API yang aman untuk transaksi jual-beli online dengan fitur keamanan berlapis (PIN Admin & Validasi Bukti Transfer).

## 🚀 Tech Stack

* **Runtime:** Node.js & Express.js
* **Database:** PostgreSQL (via Prisma ORM)
* **Authentication:** JWT (JSON Web Token)
* **Real-time:** Socket.io (Chat & Status Updates)
* **Storage:** Cloudinary (Image Uploads)
* **Security:** BcryptJS (Password & PIN Hashing)

---

## ✨ Fitur Utama

1.  **Manajemen Transaksi Escrow:**
    * Create Transaction, Upload Bukti Bayar, Verifikasi Admin.
    * Input Resi, Konfirmasi Terima Barang, & Komplain (Dispute).
2.  **Keamanan Pencairan Dana (Disbursement):**
    * Admin wajib memasukkan **PIN 6 Digit** untuk mencairkan dana ke Penjual atau Refund ke Pembeli.
    * Validasi bukti transfer admin sebelum status berubah menjadi `DISBURSED` atau `REFUNDED`.
3.  **Sistem Retur & Refund:**
    * Handling komplain barang, upload bukti retur, hingga pengembalian dana.
4.  **Real-time Chat:**
    * Room chat privat antara Penjual, Pembeli, dan Admin per transaksi.

---

## 🛠️ Cara Instalasi (Local Setup)

Ikuti langkah ini untuk menjalankan backend di komputer lokal Anda.

### 1. Clone Repository
```bash
git clone [https://github.com/username-anda/rekber-backend.git](https://github.com/username-anda/rekber-backend.git)
cd rekber-backend
