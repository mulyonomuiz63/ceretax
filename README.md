# ceretax

Simulator Coretax KelasBrevet (React + Vite + Express + Socket.io + MySQL).

## Persiapan Database MySQL

1. Buat database MySQL baru, misalnya `kelasbrevet_coretax`.
2. Salin `.env.example` menjadi `.env` dan isi kredensial server MySQL Anda:
   - `MYSQL_HOST`
   - `MYSQL_PORT`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`
   - `MYSQL_SSL`
3. (Opsional) Impor skema tabel secara manual dari `database/mysql-schema.sql`, atau biarkan aplikasi membuat seluruh tabel secara otomatis pada koneksi pertama.

## Menjalankan Aplikasi

```bash
npm install
npm run build
npm start
```
