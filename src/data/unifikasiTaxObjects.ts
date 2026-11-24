// Comprehensive Unifikasi Data Sesuai Master Excel Coretax Asli

export interface UnifikasiTaxObject {
  code: string;
  name: string;
  taxType: string;
  nature: 'Final' | 'Tidak Final';
  rate: number;
  kap: string;
}

export const UNIFIKASI_BPPU_OBJECT_CODES: UnifikasiTaxObject[] = [
  {
    "code": "24-101-01",
    "name": "Dividen",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 15,
    "kap": "411124-101"
  },
  {
    "code": "24-104-05",
    "name": "Jasa Aktuaris",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "28-409-25",
    "name": "Pekerjaan Konstruksi Terintegrasi yang Dilakukan oleh Penyedia Jasa yang Memiliki Sertifikat Badan Usaha",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 2.65,
    "kap": "411128-409"
  },
  {
    "code": "28-409-26",
    "name": "Pekerjaan Konstruksi Terintegrasi yang Dilakukan oleh Penyedia Jasa yang Tidak Memiliki Sertifikat Badan Usaha",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 4,
    "kap": "411128-409"
  },
  {
    "code": "28-409-27",
    "name": "Jasa Konsultansi Konstruksi yang Dilakukan oleh Penyedia Jasa yang Memiliki Sertifikat Badan Usaha atau Sertifikat Kompetensi Kerja untuk Usaha Orang Perseorangan",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 3.5,
    "kap": "411128-409"
  },
  {
    "code": "28-409-28",
    "name": "Jasa Konsultansi Konstruksi yang Dilakukan oleh Penyedia Jasa yang Tidak Memiliki Sertifikat Badan Usaha atau Sertifikat Kompetensi Kerja untuk Usaha Orang Perseorangan",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 6,
    "kap": "411128-409"
  },
  {
    "code": "28-409-08",
    "name": "Jasa Konstruksi Berupa Jasa Perencanaan Konstruksi (Dengan Kualifikasi Usaha)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 4,
    "kap": "411128-409"
  },
  {
    "code": "28-409-09",
    "name": "Jasa Konstruksi Berupa Jasa Perencanaan Konstruksi (Tanpa Kualifikasi Usaha)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 6,
    "kap": "411128-409"
  },
  {
    "code": "28-409-10",
    "name": "Jasa Konstruksi Berupa Jasa Pelaksanaan Konstruksi (Kualifikasi Usaha Kecil)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 2,
    "kap": "411128-409"
  },
  {
    "code": "28-409-11",
    "name": "Jasa Konstruksi Berupa Jasa Pelaksanaan Konstruksi (Kualifikasi Usaha Menengah dan Besar)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 3,
    "kap": "411128-409"
  },
  {
    "code": "28-409-12",
    "name": "Jasa Konstruksi Berupa Jasa Pelaksanaan Konstruksi (Tanpa Kualifikasi Usaha)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 4,
    "kap": "411128-409"
  },
  {
    "code": "28-409-13",
    "name": "Jasa Konstruksi Berupa Jasa Pengawasan Konstruksi (Dengan Kualifikasi Usaha)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 4,
    "kap": "411128-409"
  },
  {
    "code": "24-104-06",
    "name": "Jasa Akuntansi, Pembukuan, dan Atestasi Laporan Keuangan",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "28-409-14",
    "name": "Jasa Konstruksi Berupa Jasa Pengawasan Konstruksi (Tanpa Kualifikasi Usaha)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 6,
    "kap": "411128-409"
  },
  {
    "code": "28-417-01",
    "name": "Bunga Simpanan yang Dibayarkan oleh Koperasi kepada Anggota Wajib Pajak Orang Pribadi (bunga sampai dengan Rp240.000,00)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 0,
    "kap": "411128-417"
  },
  {
    "code": "28-417-02",
    "name": "Bunga Simpanan yang Dibayarkan oleh Koperasi kepada Anggota Wajib Pajak Orang Pribadi (bunga di atas Rp240.000,00)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 10,
    "kap": "411128-417"
  },
  {
    "code": "28-419-01",
    "name": "Dividen yang Diterima/Diperoleh Wajib Pajak Orang Pribadi Dalam Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 10,
    "kap": "411128-419"
  },
  {
    "code": "28-423-01",
    "name": "Pemotongan atau pemungutan PPh atas penjualan barang atau penyerahan jasa yang dilakukan oleh Wajib Pajak dengan peredaran bruto tertentu sesuai dengan Peraturan Pemerintah Nomor 23 Tahun 2018 atau Peraturan Pemerintah Nomor 55 Tahun 2022.",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 0.5,
    "kap": "411128-423"
  },
  {
    "code": "28-423-02",
    "name": "Pemotongan atau pemungutan PPh atas transaksi pembelian yang dilakukan oleh Wajib Pajak dengan peredaran bruto tertentu sesuai dengan Peraturan Pemerintah Nomor 55 Tahun 2022.",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 0,
    "kap": "411128-423"
  },
  {
    "code": "28-410-02",
    "name": "Imbalan yang Dibayarkan/Terutang kepada Perusahaan Pelayaran Dalam Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 1.2,
    "kap": "411128-410"
  },
  {
    "code": "28-411-02",
    "name": "Imbalan Charter Kapal Laut dan/atau Pesawat Udara yang Dibayarkan/ Terutang kepada Perusahaan Pelayaran dan/atau Penerbangan Luar Negeri  melalui BUT di Indonesia",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 2.64,
    "kap": "411128-411"
  },
  {
    "code": "29-101-01",
    "name": "Imbalan Charter Pesawat Udara yang Dibayarkan/Terutang kepada Perusahaan Penerbangan Dalam Negeri oleh Pemotong Pajak",
    "taxType": "Pasal 15",
    "nature": "Final",
    "rate": 1.8,
    "kap": "411129-100"
  },
  {
    "code": "28-421-01",
    "name": "Uplift Hulu Migas",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 20,
    "kap": "411128-421"
  },
  {
    "code": "24-104-07",
    "name": "Jasa Hukum",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "28-421-02",
    "name": "Participating Interest Eksplorasi Hulu Migas",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 5,
    "kap": "411128-421"
  },
  {
    "code": "28-421-03",
    "name": "Participating Interest Eksploitasi Hulu Migas",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 7,
    "kap": "411128-421"
  },
  {
    "code": "22-900-01",
    "name": "Pembayaran atas Pembelian Barang dan/atau Bahan untuk Kegiatan Usahanya oleh BUMN/Badan Usaha Tertentu",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 1.5,
    "kap": "411122-900"
  },
  {
    "code": "22-100-07",
    "name": "Penjualan Hasil Produksi Kepada Distributor di Dalam Negeri oleh Badan Usaha/Industri Tertentu (Industri Semen)",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.25,
    "kap": "411122-100"
  },
  {
    "code": "22-100-08",
    "name": "Penjualan Hasil Produksi Kepada Distributor di Dalam Negeri oleh Badan Usaha/Industri Tertentu (Industri Baja)",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.3,
    "kap": "411122-100"
  },
  {
    "code": "24-104-08",
    "name": "Jasa Arsitektur",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "22-100-09",
    "name": "Penjualan Hasil Produksi Kepada Distributor di Dalam Negeri oleh Badan Usaha/Industri Tertentu (Industri Otomotif)",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.45,
    "kap": "411122-100"
  },
  {
    "code": "22-100-10",
    "name": "Penjualan Hasil Produksi Kepada Distributor di Dalam Negeri oleh Badan Usaha/Industri Tertentu (Industri Farmasi)",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.3,
    "kap": "411122-100"
  },
  {
    "code": "22-100-11",
    "name": "Penjualan Hasil Produksi Kepada Distributor di Dalam Negeri oleh Badan Usaha/Industri Tertentu (industri Kertas)",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.1,
    "kap": "411122-100"
  },
  {
    "code": "22-100-12",
    "name": "Penjualan Kendaraan Bermotor di Dalam Negeri oleh ATPM, APM dan Importir Umum Kendaraan Bermotor",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.45,
    "kap": "411122-100"
  },
  {
    "code": "22-100-13",
    "name": "Pembelian oleh Badan Usaha Berupa Komoditas Tambang Batubara, Mineral Logam dan Mineral Bukan Logam dari Badan atau Orang Pribadi Pemegang IUP",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 1.5,
    "kap": "411122-100"
  },
  {
    "code": "22-100-14",
    "name": "Penjualan Emas Batangan di Dalam Negeri oleh Badan Usaha",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.45,
    "kap": "411122-100"
  },
  {
    "code": "22-100-15",
    "name": "Pembelian Bahan Hasil Kehutanan yang Belum Melalui Proses Industri Manufaktur, untuk Keperluan Industrinya/Ekspornya oleh Badan Usaha Industri/Eksportir",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.25,
    "kap": "411122-100"
  },
  {
    "code": "22-100-16",
    "name": "Pembelian Bahan Hasil Perkebunan yang Belum Melalui Proses Industri Manufaktur, untuk Keperluan Industrinya/Ekspornya Oleh Badan Usaha Industri/Eksportir",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.25,
    "kap": "411122-100"
  },
  {
    "code": "22-100-17",
    "name": "Pembelian Bahan Hasil Pertanian yang Belum Melalui Proses Industri Manufaktur, untuk Keperluan Industrinya/Ekspornya Oleh Badan Usaha Industri/Eksportir",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.25,
    "kap": "411122-100"
  },
  {
    "code": "22-100-18",
    "name": "Pembelian Bahan Hasil Peternakan yang Belum Melalui Proses Industri Manufaktur, untuk Keperluan Industrinya/Ekspornya Oleh Badan Usaha Industri/Eksportir",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.25,
    "kap": "411122-100"
  },
  {
    "code": "24-104-09",
    "name": "Jasa Perencanaan Kota dan Arsitektur Landscape;",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "22-100-19",
    "name": "Pembelian Bahan Hasil Perikanan yang Belum Melalui Proses Industri Manufaktur, untuk Keperluan Industrinya/Ekspornya Oleh Badan Usaha Industri/Eksportir",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.25,
    "kap": "411122-100"
  },
  {
    "code": "22-401-01",
    "name": "Penjualan BBM oleh Pertamina atau Anak Perusahaan Pertamina Kepada SPBU (Final)",
    "taxType": "Pasal 22",
    "nature": "Final",
    "rate": 0.25,
    "kap": "411122-400"
  },
  {
    "code": "22-100-20",
    "name": "Penjualan BBM oleh Pertamina atau Anak Perusahaan Pertamina Kepada Selain SPBU/Agen/Penyalur (Tidak Final)",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.3,
    "kap": "411122-100"
  },
  {
    "code": "22-401-02",
    "name": "Penjualan BBM oleh Badan Usaha Selain Pertamina atau Anak Perusahaan Pertamina Kepada SPBU/Agen/Penyalur  (Final)",
    "taxType": "Pasal 22",
    "nature": "Final",
    "rate": 0.3,
    "kap": "411122-400"
  },
  {
    "code": "22-100-21",
    "name": "Penjualan BBM oleh Badan Usaha Selain Pertamina atau Anak Perusahaan Pertamina Kepada Selain SPBU/Agen/Penyalur (Tidak Final)",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.3,
    "kap": "411122-100"
  },
  {
    "code": "22-100-22",
    "name": "Penjualan Pelumas oleh Importir/Produsen",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.3,
    "kap": "411122-100"
  },
  {
    "code": "22-100-23",
    "name": "Penjualan  Pulsa dan Kartu Perdana oleh Penyelenggara Distribusi Tingkat Kedua yang Merupakan Pemungut PPh Pasal 22",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.5,
    "kap": "411122-100"
  },
  {
    "code": "22-100-24",
    "name": "Penjualan BBG oleh Produsen/Importir Kepada Selain SPBU/Agen/Penyalur (Tidak Final)",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.3,
    "kap": "411122-100"
  },
  {
    "code": "22-401-03",
    "name": "Penjualan BBG oleh produsen/importir Kepada SPBU/Agen/Penyalur (Final)",
    "taxType": "Pasal 22",
    "nature": "Final",
    "rate": 0.3,
    "kap": "411122-400"
  },
  {
    "code": "22-401-04",
    "name": "Penjualan BBM oleh Pertamina atau Anak Perusahaan Pertamina kepada Agen/Penyalur selain SPBU (Final)",
    "taxType": "Pasal 22",
    "nature": "Final",
    "rate": 0.3,
    "kap": "411122-400"
  },
  {
    "code": "24-104-10",
    "name": "Jasa Perancang (Design)",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "22-403-01",
    "name": "Penjualan Barang yang Tergolong Sangat Mewah Selain Rumah Beserta Tanahnya, Apartemen, Kondominium dan Sejenisnya",
    "taxType": "Pasal 22",
    "nature": "Final",
    "rate": 5,
    "kap": "411122-400"
  },
  {
    "code": "22-403-02",
    "name": "Penjualan Barang yang Tergolong Sangat Mewah Untuk Rumah Beserta Tanahnya, Apartemen, Kondominium dan Sejenisnya",
    "taxType": "Pasal 22",
    "nature": "Final",
    "rate": 1,
    "kap": "411122-400"
  },
  {
    "code": "22-404-01",
    "name": "Ekspor Komoditas Tambang Batubara, Mineral Logam, dan Mineral Bukan Logam yang Dilakukan Oleh Eksportir, Kecuali WP yang Terikat dalam PKP2B dan KK",
    "taxType": "Pasal 22",
    "nature": "Final",
    "rate": 1.5,
    "kap": "411122-400"
  },
  {
    "code": "22-405-01",
    "name": "Penghasilan Sehubungan dengan Aset Kripto yang dipungut oleh Penyelenggara Perdagangan Melalui Sistem Elektronik yang Merupakan Pedagang Fisik Aset Kripto",
    "taxType": "Pasal 22",
    "nature": "Final",
    "rate": 0.1,
    "kap": "411122-400"
  },
  {
    "code": "22-405-02",
    "name": "Penghasilan Sehubungan dengan Aset Kripto yang dipungut oleh Penyelenggara Perdagangan Melalui Sistem Elektronik yang Bukan Merupakan Pedagang Fisik Aset Kripto",
    "taxType": "Pasal 22",
    "nature": "Final",
    "rate": 0.2,
    "kap": "411122-400"
  },
  {
    "code": "22-101-01",
    "name": "Penghasilan Sehubungan dengan Transaksi Penjualan Barang, Penyerahan Jasa, dan/atau Persewaan serta Penghasilan Lain Sehubungan dengan Penggunaan Harta yang Dilakukan Melalui Pihak Lain dalam Sistem Informasi Pengadaan Pemerintah (Tidak Final)",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.5,
    "kap": "411122-100"
  },
  {
    "code": "22-101-02",
    "name": "Penghasilan Sehubungan dengan Transaksi Penjualan Barang, Penyerahan Jasa, dan/atau Persewaan serta Penghasilan Lain Sehubungan dengan Penggunaan Harta yang Dilakukan Melalui Pihak Lain dalam Sistem Informasi Pengadaan Pemerintah (Final)",
    "taxType": "Pasal 22",
    "nature": "Final",
    "rate": 0.5,
    "kap": "411122-400"
  },
  {
    "code": "22-102-01",
    "name": "Penghasilan yang Diterima atau Diperoleh Pedagang Dalam Negeri Penjualan Barang, Penyerahan Jasa, dan/atau Persewaan serta Penghasilan Lain Sehubungan dengan Penggunaan Harta yang Dilakukan Melalui Perdagangan Melalui Sistem Elektronik (Tidak Final)",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.5,
    "kap": "411122-100"
  },
  {
    "code": "22-102-02",
    "name": "Penghasilan yang Diterima atau Diperoleh Pedagang Dalam Negeri Penjualan Barang, Penyerahan Jasa, dan/atau Persewaan serta Penghasilan Lain Sehubungan dengan Penggunaan Harta yang Dilakukan Melalui Perdagangan Melalui Sistem Elektronik (Final)",
    "taxType": "Pasal 22",
    "nature": "Final",
    "rate": 0.5,
    "kap": "411122-400"
  },
  {
    "code": "22-100-25",
    "name": "Penjualan Emas Batangan di Dalam Negeri oleh Pengusaha Emas Perhiasan dan/atau Emas Batangan",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.25,
    "kap": "411122-100"
  },
  {
    "code": "24-104-11",
    "name": "Jasa Pengeboran (Drilling) di Bidang Penambangan Minyak dan Gas Bumi (Migas) Kecuali yang Dilakukan oleh Badan Usaha Tetap (BUT)",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "22-100-26",
    "name": "Penjualan Emas Perhiasan di Dalam Negeri oleh Pengusaha Emas Perhiasan dan/atau Emas Batangan",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.25,
    "kap": "411122-100"
  },
  {
    "code": "22-100-27",
    "name": "Penjualan Perhiasan Selain dari Emas dan/atau Batu Permata dan/atau Batu Lainnya yang Sejenis oleh Pengusaha Emas Perhiasan dan/atau Emas Batangan",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0.25,
    "kap": "411122-100"
  },
  {
    "code": "28-499-02",
    "name": "Penghasilan yang Diterima atau Diperoleh Sehubungan dengan Kerja Sama dengan Lembaga Pengelola Investasi (LPI)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 7.5,
    "kap": "411128-499"
  },
  {
    "code": "28-402-01",
    "name": "Pengalihan Hak atas Tanah dan/atau Bangunan",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 2.5,
    "kap": "411128-402"
  },
  {
    "code": "28-402-02",
    "name": "Pengalihan Rumah Sederhana dan Rumah Susun Sederhana yang Dilakukan oleh WP yang Usaha Pokoknya Mengalihkan Hak atas Tanah dan/atau Bangunan",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 1,
    "kap": "411128-402"
  },
  {
    "code": "28-402-03",
    "name": "Pengalihan Hak atas Tanah dan/atau Bangunan kepada Pemerintah, BUMN yang Mendapat Penugasan Khusus dari Pemerintah, atau BUMD yang Mendapat Penugasan Khusus dari Kepala Daerah, sesuai UU mengenai Pengadaan Tanah bagi Pembangunan untuk Kepentingan Umum",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 0,
    "kap": "411128-402"
  },
  {
    "code": "28-410-01",
    "name": "Imbalan yang Diterima/Diperoleh Sehubungan dengan Pengangkutan Orang dan/atau Barang Termasuk Penyewaan Kapal Laut Oleh Perusahaan Pelayaran Dalam Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 1.2,
    "kap": "411128-410"
  },
  {
    "code": "28-411-01",
    "name": "Imbalan yang Dibayarkan/Terutang kepada Perusahaan Pelayaran dan/atau Penerbangan Luar Negeri Sehubungan dengan Pengangkutan Orang dan/atau Barang (Selain Berdasarkan Perjanjian Charter)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 2.64,
    "kap": "411128-411"
  },
  {
    "code": "28-413-01",
    "name": "Penghasilan Wajib Pajak Luar Negeri yang Mempunyai Kantor Perwakilan Dagang di Indonesia",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 0.44,
    "kap": "411128-413"
  },
  {
    "code": "28-499-01",
    "name": "Penghasilan Wajib Pajak yang Melakukan Kegiatan Usaha Jasa Maklon (Contract Manufacturing) Internasional di Bidang Produksi Mainan Anak-Anak",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 2.1,
    "kap": "411128-499"
  },
  {
    "code": "24-104-12",
    "name": "Jasa Penunjang di Bidang Usaha Panas Bumi dan Penambangan Minyak dan Gas Bumi (Migas)",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "22-910-01",
    "name": "Pemungutan oleh Bendaharawan",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 1.5,
    "kap": "411122-910"
  },
  {
    "code": "28-423-03",
    "name": "Pemotongan atau Pemungutan PPh atas transaksi penjualan barang atau penyerahan jasa yang dilakukan oleh Wajib Pajak orang pribadi yang memiliki peredaran bruto tertentu sesuai dengan PP 55 Tahun 2022 dengan peredaran usaha s.d Rp500.000.000,00.",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 0.5,
    "kap": "411128-423"
  },
  {
    "code": "28-423-12",
    "name": "Pemotongan atau Pemungutan PPh atas transaksi penjualan barang atau penyerahan jasa yang dilakukan oleh Wajib Pajak yang memenuhi persyaratan tertentu untuk dikenai PPh yang bersifat final dengan tarif 0% di IKN (PPh UMKM di IKN).",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 0,
    "kap": "411128-423"
  },
  {
    "code": "28-423-13",
    "name": "Pemotongan atau pemungutan PPh atas transaksi pembelian yang dilakukan oleh Wajib Pajak yang memanfaatkan fasilitas PPh final dengan tarif 0% di IKN (PPh UMKM di IKN).",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 0,
    "kap": "411128-423"
  },
  {
    "code": "28-404-12",
    "name": "Penghasilan dari Instrumen Moneter dan/atau Instrumen Keuangan Tertentu di Indonesia (Mata Uang VALAS Bersumber dari DHE SDA Tenor Lebih Dari 6 Bulan)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 0,
    "kap": "411128-404"
  },
  {
    "code": "28-404-13",
    "name": "Penghasilan dari Instrumen Moneter dan/atau Instrumen Keuangan Tertentu di Indonesia (Mata Uang VALAS Bersumber dari DHE SDA Tenor 6 Bulan)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 2.5,
    "kap": "411128-404"
  },
  {
    "code": "28-404-14",
    "name": "Penghasilan dari Instrumen Moneter dan/atau Instrumen Keuangan Tertentu di Indonesia (Mata Uang VALAS Bersumber dari DHE SDA Tenor Lebih Dari 3 Bulan sampai dengan Kurang Dari 6 Bulan)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 7.5,
    "kap": "411128-404"
  },
  {
    "code": "28-404-15",
    "name": "Penghasilan dari Instrumen Moneter dan/atau Instrumen Keuangan Tertentu di Indonesia (Mata Uang VALAS Bersumber dari DHE SDA Tenor 1 Bulan sampai dengan Kurang Dari 3 Bulan)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 10,
    "kap": "411128-404"
  },
  {
    "code": "28-404-16",
    "name": "Penghasilan dari Instrumen Moneter dan/atau Instrumen Keuangan Tertentu di Indonesia (Mata Uang IDR Bersumber dari DHE SDA Tenor 6 Bulan atau Lebih Dari 6 Bulan)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 0,
    "kap": "411128-404"
  },
  {
    "code": "28-404-17",
    "name": "Penghasilan dari Instrumen Moneter dan/atau Instrumen Keuangan Tertentu di Indonesia (Mata Uang VALAS Bersumber dari DHE SDA Tenor 3 Bulan sampai dengan Kurang Dari 6 Bulan)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 2.5,
    "kap": "411128-404"
  },
  {
    "code": "24-104-13",
    "name": "Jasa Penambangan dan Jasa Penunjang di Bidang Usaha Panas Bumi dan Penambangan Minyak dan Gas Bumi (Migas)",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "22-406-01",
    "name": "PPh pasal 22 yang terutang atas penghasilan Kontraktor Utama sehubungan pelaksanaan proyek pemerintah yang dibiayai Hibah atau Pinjaman Luar Negeri",
    "taxType": "Pasal 22",
    "nature": "Tidak Final",
    "rate": 0,
    "kap": "411122-100"
  },
  {
    "code": "24-106-01",
    "name": "PPh pasal 23 yang terutang atas penghasilan Kontraktor Utama sehubungan pelaksanaan proyek pemerintah yang dibiayai Hibah atau Pinjaman Luar Negeri",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 0,
    "kap": "411124-100"
  },
  {
    "code": "28-403-04",
    "name": "Persewaan Tanah dan/atau Bangunan sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 10,
    "kap": "411128-403"
  },
  {
    "code": "28-409-43",
    "name": "Pekerjaan Konstruksi yang Dilakukan oleh Penyedia Jasa yang Memiliki Sertifikat Badan Usaha Kualifikasi Kecil atau Sertifikat Kompetensi Kerja untuk Usaha Orang Perseorangan sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 1.75,
    "kap": "411128-409"
  },
  {
    "code": "28-409-44",
    "name": "Pekerjaan Konstruksi yang Dilakukan oleh Penyedia Jasa yang Tidak Memiliki Sertifikat Badan Usaha Atau Sertifikat Kompetensi Kerja untuk Usaha Orang Perseorangan sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 4,
    "kap": "411128-409"
  },
  {
    "code": "28-409-45",
    "name": "Pekerjaan Konstruksi yang Dilakukan oleh Penyedia Jasa yang Memiliki Sertifikat Selain Sertifikat Badan Usaha Kualifikasi Kecil atau Sertifikat Kompetensi Kerja untuk Usaha Orang Perseorangan sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 2.65,
    "kap": "411128-409"
  },
  {
    "code": "28-409-46",
    "name": "Pekerjaan Konstruksi Terintegrasi yang Dilakukan oleh Penyedia Jasa yang Memiliki Sertifikat Badan Usaha sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 2.65,
    "kap": "411128-409"
  },
  {
    "code": "28-409-47",
    "name": "Pekerjaan Konstruksi Terintegrasi yang Dilakukan oleh Penyedia Jasa yang Tidak Memiliki Sertifikat Badan Usaha sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 4,
    "kap": "411128-409"
  },
  {
    "code": "28-409-48",
    "name": "Jasa Konsultansi Konstruksi yang Dilakukan oleh Penyedia Jasa yang Memiliki Sertifikat Badan Usaha atau Sertifikat Kompetensi Kerja untuk Usaha Orang Perseorangan sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 3.5,
    "kap": "411128-409"
  },
  {
    "code": "28-409-49",
    "name": "Jasa Konsultansi Konstruksi yang Dilakukan oleh Penyedia Jasa yang Tidak Memiliki Sertifikat Badan Usaha atau Sertifikat Kompetensi Kerja untuk Usaha Orang Perseorangan sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 6,
    "kap": "411128-409"
  },
  {
    "code": "24-104-14",
    "name": "Jasa Penunjang di Bidang Penerbangan dan Bandar Udara",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "28-409-50",
    "name": "Jasa Konstruksi Berupa Jasa Perencanaan Konstruksi (Dengan Kualifikasi Usaha) sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 4,
    "kap": "411128-409"
  },
  {
    "code": "28-409-51",
    "name": "Jasa Konstruksi Berupa Jasa Perencanaan Konstruksi (Tanpa Kualifikasi Usaha) sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 6,
    "kap": "411128-409"
  },
  {
    "code": "28-409-52",
    "name": "Jasa Konstruksi Berupa Jasa Pelaksanaan Konstruksi (Kualifikasi Usaha Kecil) sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 2,
    "kap": "411128-409"
  },
  {
    "code": "28-409-53",
    "name": "Jasa Konstruksi Berupa Jasa Pelaksanaan Konstruksi (Kualifikasi Usaha Menengah dan Besar) sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 3,
    "kap": "411128-409"
  },
  {
    "code": "28-409-54",
    "name": "Jasa Konstruksi Berupa Jasa Pelaksanaan Konstruksi (Tanpa Kualifikasi Usaha) sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 4,
    "kap": "411128-409"
  },
  {
    "code": "28-409-55",
    "name": "Jasa Konstruksi Berupa Jasa Pengawasan Konstruksi (Dengan Kualifikasi Usaha) sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 4,
    "kap": "411128-409"
  },
  {
    "code": "28-409-56",
    "name": "Jasa Konstruksi Berupa Jasa Pengawasan Konstruksi (Tanpa Kualifikasi Usaha) sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 6,
    "kap": "411128-409"
  },
  {
    "code": "28-402-04",
    "name": "Pengalihan Hak atas Tanah dan/atau Bangunan sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 2.5,
    "kap": "411128-402"
  },
  {
    "code": "28-410-06",
    "name": "Imbalan yang Dibayarkan/Terutang kepada Perusahaan Pelayaran Dalam Negeri sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 1.2,
    "kap": "411128-410"
  },
  {
    "code": "28-411-05",
    "name": "Imbalan Charter Kapal Laut dan/atau Pesawat Udara yang Dibayarkan/ Terutang kepada Perusahaan Pelayaran dan/atau Penerbangan Luar Negeri melalui BUT di Indonesia sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 2.64,
    "kap": "411128-411"
  },
  {
    "code": "24-102-01",
    "name": "Bunga Selain yang Dikenakan PPh Pasal 4 ayat (2)",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 15,
    "kap": "411124-102"
  },
  {
    "code": "24-104-15",
    "name": "Jasa Penebangan Hutan",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "29-101-02",
    "name": "Imbalan Charter Pesawat Udara yang Dibayarkan/Terutang kepada Perusahaan Penerbangan Dalam Negeri oleh Pemotong Pajak sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 15",
    "nature": "Final",
    "rate": 1.8,
    "kap": "411129-100"
  },
  {
    "code": "28-410-05",
    "name": "Imbalan yang Diterima/Diperoleh Sehubungan dengan Pengangkutan Orang dan/atau Barang Termasuk Penyewaan Kapal Laut Oleh Perusahaan Pelayaran Dalam Negeri sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 1.2,
    "kap": "411128-410"
  },
  {
    "code": "28-411-04",
    "name": "Imbalan yang Dibayarkan/Terutang kepada Perusahaan Pelayaran dan/atau Penerbangan Luar Negeri Sehubungan dengan Pengangkutan Orang dan/atau Barang (Selain Berdasarkan Perjanjian Charter) sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 2.64,
    "kap": "411128-411"
  },
  {
    "code": "22-401-05",
    "name": "Penjualan BBM oleh Badan Usaha Selain Pertamina atau Anak Perusahaan Pertamina Kepada SPBU/Agen/Penyalur  (Final) sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri",
    "taxType": "Pasal 22",
    "nature": "Final",
    "rate": 0.3,
    "kap": "411122-400"
  },
  {
    "code": "28-423-14",
    "name": "Pemotongan atau pemungutan PPh atas penjualan barang atau penyerahan jasa yang dilakukan oleh Wajib Pajak dengan peredaran bruto tertentu yang memperoleh penghasilan sehubungan pelaksanaan proyek pemerintah yang dibiayai Hibah atau Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 0.5,
    "kap": "411128-423"
  },
  {
    "code": "28-423-15",
    "name": "Pemotongan atau Pemungutan PPh atas transaksi penjualan barang atau penyerahan jasa yang dilakukan oleh Wajib Pajak yang memenuhi persyaratan tertentu untuk dikenai PPh yang bersifat final dengan tarif 0% di IKN yang memperoleh penghasilan sehubungan pelaksanaan proyek pemerintah yang dibiayai Hibah atau Pinjaman Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 0,
    "kap": "411128-423"
  },
  {
    "code": "24-104-16",
    "name": "Jasa Pengolahan Limbah",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-17",
    "name": "Jasa Penyedia Tenaga Kerja dan/atau Tenaga Ahli (Outsourcing Services)",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-18",
    "name": "Jasa Perantara dan/atau Keagenan",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-19",
    "name": "Jasa Bidang Perdagangan Surat-Surat Berharga, Kecuali yang Dilakukan Bursa Efek, Kustodian Sentral Efek Indonesia (KSEI) dan Kliring Penjaminan Efek Indonesia (KPEI)",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-20",
    "name": "Jasa Kustodian/Penyimpanan/Penitipan, Kecuali yang Dilakukan Oleh KSEI",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-21",
    "name": "Jasa Pengisian Suara (Dubbing) dan/atau Sulih Suara",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-22",
    "name": "Jasa Mixing Film",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-23",
    "name": "Jasa Pembuatan Sarana Promosi Film, Iklan, Poster, Foto, Slide, Klise, Banner, Pamphlet, Baliho dan Folder",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-24",
    "name": "Jasa Sehubungan Dengan Software Atau Hardware Atau Sistem Komputer, Termasuk Perawatan, Pemeliharaan dan Perbaikan.",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-103-01",
    "name": "Royalti",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 15,
    "kap": "411124-103"
  },
  {
    "code": "24-104-25",
    "name": "Jasa Pembuatan dan/atau Pengelolaan Website",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-26",
    "name": "Jasa Internet Termasuk Sambungannya",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-27",
    "name": "Jasa Penyimpanan, Pengolahan dan/atau Penyaluran Data, Informasi, dan/atau Program",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-28",
    "name": "Jasa Instalasi/Pemasangan Mesin, Peralatan, Listrik, Telepon, Air, Gas, Ac dan/atau Tv Kabel, Selain Yang Dilakukan Oleh Wajib Pajak Yang Ruang Lingkupnya Di Bidang Konstruksi dan Mempunyai Izin dan/atau Sertifikasi Sebagai Pengusaha Konstruksi;",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-29",
    "name": "Jasa Perawatan/Perbaikan/Pemeliharaan Mesin, Peralatan, Listrik, Telepon, Air, Gas, Ac dan/atau Tv Kabel, Selain Yang Dilakukan Oleh Wajib Pajak Yang Ruang Lingkupnya di Bidang Konstruksi dan Mempunyai Izin dan/atau Sertifikasi Sebagai Pengusaha Konstruksi",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-30",
    "name": "Jasa Perawatan Kendaraan dan/atau Alat Transportasi Darat, Laut dan Udara",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-31",
    "name": "Jasa Maklon",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-32",
    "name": "Jasa Penyelidikan dan Keamanan",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-33",
    "name": "Jasa Penyelenggara Kegiatan Atau Event Organizer",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-34",
    "name": "Jasa Penyediaan Tempat dan/atau Waktu Dalam Media Massa, Media Luar Ruang Atau Media Lain Untuk Penyampaian Informasi, dan/atau Jasa Periklanan",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-100-01",
    "name": "Hadiah, Penghargaan, Bonus dan Lainnya Selain yang Telah Dipotong PPh Pasal 21 Ayat (1) Huruf E UU PPh",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 15,
    "kap": "411124-100"
  },
  {
    "code": "24-104-35",
    "name": "Jasa Pembasmian Hama",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-36",
    "name": "Jasa Kebersihan Atau Cleaning Service",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-37",
    "name": "Jasa Sedot Septic Tank",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-38",
    "name": "Jasa Pemeliharaan Kolam",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-39",
    "name": "Jasa Katering Atau Tata Boga",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-40",
    "name": "Jasa Freight Forwarding",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-41",
    "name": "Jasa Logistik",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-42",
    "name": "Jasa Pengurusan Dokumen",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-43",
    "name": "Jasa Pengepakan",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-44",
    "name": "Jasa Loading dan Unloading",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-100-02",
    "name": "Sewa dan Penghasilan Lain Sehubungan Dengan Penggunaan Harta Kecuali Sewa Tanah dan/atau Bangunan yang Telah Dikenai PPh Pasal 4 Ayat (2) UU PPh.",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-100"
  },
  {
    "code": "24-104-45",
    "name": "Jasa Laboratorium dan/atau Pengujian Kecuali yang Dilakukan oleh Lembaga atau Institusi Pendidikan Dalam Rangka Penelitian Akademis",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-46",
    "name": "Jasa Pengelolaan Parkir",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-47",
    "name": "Jasa Penyondiran Tanah",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-48",
    "name": "Jasa Penyiapan dan/atau Pengolahan Lahan",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-49",
    "name": "Jasa Pembibitan dan/atau Penanaman Bibit",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-50",
    "name": "Jasa Pemeliharaan Tanaman",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-51",
    "name": "Jasa Pemanenan",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-52",
    "name": "Jasa Pengolahan Hasil Pertanian, Perkebunan, Perikanan, Peternakan dan/atau Perhutanan",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-53",
    "name": "Jasa Dekorasi",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-54",
    "name": "Jasa Pencetakan/Penerbitan",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-01",
    "name": "Jasa Teknik",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-55",
    "name": "Jasa Penerjemahan",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-56",
    "name": "Jasa Pengangkutan/Ekspedisi Kecuali Yang Telah Diatur Dalam Pasal 15 Undang-Undang Pajak Penghasilan",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-57",
    "name": "Jasa Pelayanan Pelabuhan",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-58",
    "name": "Jasa Pengangkutan Melalui Jalur Pipa",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-59",
    "name": "Jasa Pengelolaan Penitipan Anak",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-60",
    "name": "Jasa Pelatihan dan/atau Kursus",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-61",
    "name": "Jasa Pengiriman dan Pengisian Uang Ke Atm",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-62",
    "name": "Jasa Sertifikasi",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-63",
    "name": "Jasa Survey",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-64",
    "name": "Jasa Tester",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-02",
    "name": "Jasa Manajemen",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-65",
    "name": "Jasa Selain Jasa-Jasa Tersebut di Atas yang Pembayarannya Dibebankan pada APBN (Anggaran Pendapatan dan Belanja Negara) Atau APBD (Anggaran Pendapatan dan Belanja Daerah).",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-66",
    "name": "Jasa Penyelenggaraan Layanan Transaksi Pembayaran Terkait dengan Distribusi Token Oleh Penyelenggara Distribusi",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-67",
    "name": "Jasa Pemasaran dengan Media Voucer Oleh Penyelenggara Voucer",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-68",
    "name": "Jasa Penyelenggaraan Layanan Transaksi Pembayaran Terkait dengan Distribusi Voucer Oleh Penyelenggara Voucer dan Penyelenggara  Distribusi",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-104-69",
    "name": "Jasa Penyelenggaraan Program Loyalitas dan Penghargaan Pelanggan (Consumer Loyalty/Reward Program)  Oleh Penyelenggara Voucer",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "24-105-01",
    "name": "Bunga Pinjaman yang Diterima  Wajib Pajak Dalam Negeri dan Bentuk Usaha Tetap Melalui Layanan Pinjam Meminjam Uang Berbasis Teknologi Informasi",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 0,
    "kap": "411124-100"
  },
  {
    "code": "28-404-01",
    "name": "Bunga Tabungan dan Bunga Deposito yang Ditempatkan di Dalam Negeri yang Dananya Bersumber Selain dari Devisa Hasil Ekspor (DHE)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 20,
    "kap": "411128-404"
  },
  {
    "code": "28-404-02",
    "name": "Bunga Deposito yang Ditempatkan di Dalam Negeri (mata uang IDR bersumber dari DHE tenor 1 bulan)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 7.5,
    "kap": "411128-404"
  },
  {
    "code": "28-404-03",
    "name": "Bunga Deposito yang Ditempatkan di Dalam Negeri (mata uang IDR bersumber dari DHE tenor 3 bulan)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 5,
    "kap": "411128-404"
  },
  {
    "code": "28-404-04",
    "name": "Bunga Deposito yang Ditempatkan di Dalam Negeri (mata uang IDR bersumber dari DHE tenor 6 bulan atau lebih)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 0,
    "kap": "411128-404"
  },
  {
    "code": "24-104-03",
    "name": "Jasa Konsultan",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "28-404-05",
    "name": "Bunga Deposito yang Ditempatkan di Dalam Negeri (mata uang USD bersumber dari DHE tenor 1 bulan)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 10,
    "kap": "411128-404"
  },
  {
    "code": "28-404-06",
    "name": "Bunga Deposito yang Ditempatkan di Dalam Negeri (mata uang USD bersumber dari DHE tenor 3 bulan)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 7.5,
    "kap": "411128-404"
  },
  {
    "code": "28-404-07",
    "name": "Bunga Deposito yang Ditempatkan di Dalam Negeri (mata uang USD bersumber dari DHE tenor 6 bulan)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 2.5,
    "kap": "411128-404"
  },
  {
    "code": "28-404-08",
    "name": "Bunga Deposito yang Ditempatkan di Dalam Negeri (mata uang USD bersumber dari DHE tenor lebih 6 bulan)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 0,
    "kap": "411128-404"
  },
  {
    "code": "28-404-09",
    "name": "Bunga Deposito/Tabungan yang Ditempatkan di Luar Negeri Melalui Bank yang Didirikan atau Bertempat Kedudukan di Indonesia atau Cabang Bank Luar Negeri di Indonesia",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 20,
    "kap": "411128-404"
  },
  {
    "code": "28-404-10",
    "name": "Diskonto Sertifikat Bank Indonesia",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 20,
    "kap": "411128-404"
  },
  {
    "code": "28-404-11",
    "name": "Jasa Giro",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 20,
    "kap": "411128-404"
  },
  {
    "code": "28-401-01",
    "name": "Bunga Obligasi, Surat Utang Negara, atau Obligasi Daerah yang Diterima Wajib Pajak Dalam Negeri dan Bentuk Usaha Tetap.",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 15,
    "kap": "411128-401"
  },
  {
    "code": "28-401-06",
    "name": "Bunga Obligasi yang Diterima Wajib Pajak Dalam Negeri dan Bentuk Usaha Tetap",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 10,
    "kap": "411128-401"
  },
  {
    "code": "28-401-03",
    "name": "Bunga Obligasi yang Diterima Wajib Pajak Dalam Negeri dan Bentuk Usaha Tetap yang diadministrasikan oleh BI",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 10,
    "kap": "411128-401"
  },
  {
    "code": "24-104-04",
    "name": "Jasa Penilai (Appraisal)",
    "taxType": "Pasal 23",
    "nature": "Tidak Final",
    "rate": 2,
    "kap": "411124-104"
  },
  {
    "code": "28-401-04",
    "name": "Diskonto Surat Perbendaharaan Negara yang Diterima Wajib Pajak Dalam Negeri dan Bentuk Usaha Tetap",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 20,
    "kap": "411128-401"
  },
  {
    "code": "28-401-05",
    "name": "Diskonto Surat Perbendaharaan Negara yang Diterima Wajib Pajak Penduduk/Berkedudukan di Luar Negeri",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 20,
    "kap": "411128-401"
  },
  {
    "code": "28-407-01",
    "name": "Transaksi Penjualan Saham di Bursa Efek (Saham Pendiri)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 0.5,
    "kap": "411128-407"
  },
  {
    "code": "28-406-01",
    "name": "Transaksi Penjualan Saham di Bursa Efek (Bukan Saham Pendiri)",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 0.1,
    "kap": "411128-406"
  },
  {
    "code": "28-408-01",
    "name": "Transaksi Penjualan Saham Milik Perusahaan Modal Ventura Tidak di Bursa Efek",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 0.1,
    "kap": "411128-408"
  },
  {
    "code": "28-403-02",
    "name": "Persewaan Tanah dan/atau Bangunan",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 10,
    "kap": "411128-403"
  },
  {
    "code": "28-405-01",
    "name": "Hadiah Undian",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 25,
    "kap": "411128-405"
  },
  {
    "code": "28-409-22",
    "name": "Pekerjaan Konstruksi yang Dilakukan oleh Penyedia Jasa yang Memiliki Sertifikat Badan Usaha Kualifikasi Kecil atau Sertifikat Kompetensi Kerja untuk Usaha Orang Perseorangan",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 1.75,
    "kap": "411128-409"
  },
  {
    "code": "28-409-23",
    "name": "Pekerjaan Konstruksi yang Dilakukan oleh Penyedia Jasa yang Tidak Memiliki Sertifikat Badan Usaha Atau Sertifikat Kompetensi Kerja untuk Usaha Orang Perseorangan",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 4,
    "kap": "411128-409"
  },
  {
    "code": "28-409-24",
    "name": "Pekerjaan Konstruksi yang Dilakukan oleh Penyedia Jasa yang Memiliki Sertifikat Selain Sertifikat Badan Usaha Kualifikasi Kecil atau Sertifikat Kompetensi Kerja untuk Usaha Orang Perseorangan",
    "taxType": "Pasal 4(2)",
    "nature": "Final",
    "rate": 2.65,
    "kap": "411128-409"
  }
];

export const UNIFIKASI_FASILITAS_OPTIONS = [
  {
    "code": "N/A",
    "name": "Tanpa Fasilitas"
  },
  {
    "code": "TaxExAr22",
    "name": "Surat Keterangan Bebas (SKB) Pemotongan PPh Pasal 22"
  },
  {
    "code": "TaxExAr23",
    "name": "Surat Keterangan Bebas (SKB) Pemotongan PPh Pasal 23"
  },
  {
    "code": "TaxExIntDep",
    "name": "Surat Keterangan Bebas (SKB) Pemotongan PPh atas Bunga atas Deposito Berjangka dan tabungan"
  },
  {
    "code": "TaxExIntPhtb",
    "name": "Surat Keterangan Bebas (SKB) Pemotongan PPh atas Pengalihan Hak atas Tanah dan Bangunan"
  },
  {
    "code": "DTP",
    "name": "PPh Ditanggung Pemerintah (DTP)"
  },
  {
    "code": "PP23",
    "name": "Surat Keterangan  PP 23/2018"
  },
  {
    "code": "ETC",
    "name": "Fasilitas Lainnya"
  }
];

export const UNIFIKASI_PEMBAYARAN_IP_OPTIONS = [
  {
    "code": "N/A",
    "name": "-"
  },
  {
    "code": "Imprest",
    "name": "Uang Persediaan"
  },
  {
    "code": "Direct",
    "name": "Pembayaran Langsung"
  }
];

export const UNIFIKASI_DOKUMEN_OPTIONS = [
  {
    "code": "Announcement",
    "name": "Pengumuman"
  },
  {
    "code": "CommercialInvoice",
    "name": "Surat Tagihan"
  },
  {
    "code": "Contract",
    "name": "Kontrak"
  },
  {
    "code": "CurrentAccount",
    "name": "Jasa Giro"
  },
  {
    "code": "Decree",
    "name": "Decree"
  },
  {
    "code": "DeedOfEngagement",
    "name": "Akta Perjanjian"
  },
  {
    "code": "DeedOfGeneral",
    "name": "Akta RUPS"
  },
  {
    "code": "Other",
    "name": "Lainnya"
  },
  {
    "code": "OtherFacilityDoc",
    "name": "Dokumen Fasilitas Lainnya"
  },
  {
    "code": "PaymentProof",
    "name": "Bukti Pembayaran"
  },
  {
    "code": "StatementLetter",
    "name": "Surat Pernyataan"
  },
  {
    "code": "TaxInvoice",
    "name": "Faktur Pajak"
  },
  {
    "code": "TaxRegulationDoc",
    "name": "Dokumen Perpajakan"
  },
  {
    "code": "TradeConfirmation",
    "name": "Trade Confirmation"
  }
];
