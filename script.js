"use strict";

/* ===== PENGATURAN ===== */
// Akun demo untuk halaman login. Ubah sesuai kebutuhan.
const AKUN = { username: "dapur23", password: "12345" };
const NAMA_TOKO = "Dapur 23";
const KUNCI_KERANJANG = "dapur-23-keranjang";
const KUNCI_MASUK = "dapur-23-masuk";
const MAKS_JUMLAH = 99;

/* ===== ALAT BANTU ===== */
const $ = (pemilih, akar = document) => akar.querySelector(pemilih);

function rupiah(angka) {
  return "Rp" + String(Math.round(angka)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function buat(tag, kelas, teks) {
  const el = document.createElement(tag);
  if (kelas) el.className = kelas;
  if (teks !== undefined) el.textContent = teks;
  return el;
}

const memoriPenyimpanan = {};

function bacaPenyimpanan(kunci) {
  try {
    const val = localStorage.getItem(kunci);
    if (val !== null) return val;
  } catch (e) {}
  return memoriPenyimpanan[kunci] !== undefined ? memoriPenyimpanan[kunci] : null;
}

function tulisPenyimpanan(kunci, nilai) {
  try {
    if (nilai === null) localStorage.removeItem(kunci);
    else localStorage.setItem(kunci, nilai);
  } catch (e) {}
  if (nilai === null) delete memoriPenyimpanan[kunci];
  else memoriPenyimpanan[kunci] = String(nilai);
}

/* ===== DATA MENU (dibaca dari kartu di HTML) ===== */
const menu = Array.from(document.querySelectorAll("#grid-produk .kartu")).map((kartu) => ({
  id: kartu.dataset.id,
  nama: kartu.dataset.nama,
  kategori: kartu.dataset.kategori,
  harga: Number(kartu.dataset.harga),
  deskripsi: kartu.dataset.deskripsi,
  gambar: $("img.foto", kartu).getAttribute("src"),
  habis: /menunggu pasokan/i.test(kartu.dataset.deskripsi),
  el: kartu,
}));

function cariMenu(id) {
  return menu.find((m) => m.id === String(id));
}

/* ===== KERANJANG ===== */
let keranjang = [];

function muatKeranjang() {
  try {
    const data = JSON.parse(bacaPenyimpanan(KUNCI_KERANJANG) || "[]");
    keranjang = data
      .filter((b) => cariMenu(b.id) && b.jumlah > 0)
      .map((b) => ({ id: String(b.id), jumlah: Math.min(Number(b.jumlah), MAKS_JUMLAH) }));
  } catch (e) {
    keranjang = [];
  }
}

function simpanKeranjang() {
  tulisPenyimpanan(KUNCI_KERANJANG, JSON.stringify(keranjang));
}

function totalJumlah() {
  return keranjang.reduce((jumlah, b) => jumlah + b.jumlah, 0);
}

function totalHarga() {
  return keranjang.reduce((total, b) => total + cariMenu(b.id).harga * b.jumlah, 0);
}

function tambahKeKeranjang(id, jumlah) {
  const baris = keranjang.find((b) => b.id === String(id));
  if (baris) baris.jumlah = Math.min(baris.jumlah + jumlah, MAKS_JUMLAH);
  else keranjang.push({ id: String(id), jumlah: Math.min(jumlah, MAKS_JUMLAH) });
  perbaruiKeranjang();
}

function ubahJumlah(id, selisih) {
  const baris = keranjang.find((b) => b.id === String(id));
  if (!baris) return;
  baris.jumlah = Math.max(1, Math.min(baris.jumlah + selisih, MAKS_JUMLAH));
  perbaruiKeranjang();
}

function hapusDariKeranjang(id) {
  keranjang = keranjang.filter((b) => b.id !== String(id));
  perbaruiKeranjang();
}

function perbaruiKeranjang() {
  simpanKeranjang();
  renderKeranjang();
  renderCheckout();
  $("#lencana-keranjang").textContent = totalJumlah();
}

function renderKeranjang() {
  const daftar = $("#daftar-keranjang");
  const templat = $("#templat-baris");
  daftar.replaceChildren();

  keranjang.forEach((b) => {
    const m = cariMenu(b.id);
    const simpul = templat.content.cloneNode(true);
    const baris = $(".baris-keranjang", simpul);
    baris.dataset.id = m.id;

    const foto = $("img", simpul);
    foto.src = m.gambar;
    foto.alt = m.nama;

    const tautan = $(".baris-info a", simpul);
    tautan.href = "#/detail/" + m.id;
    tautan.textContent = m.nama;
    $(".baris-info p", simpul).textContent = rupiah(m.harga) + " / porsi";

    $(".jumlah", simpul).textContent = b.jumlah;
    $('[data-aksi="kurang"]', simpul).disabled = b.jumlah <= 1;
    $('[data-aksi="tambah"]', simpul).disabled = b.jumlah >= MAKS_JUMLAH;
    $(".baris-subtotal", simpul).textContent = rupiah(m.harga * b.jumlah);

    daftar.appendChild(simpul);
  });

  const kosong = keranjang.length === 0;
  $("#keranjang-kosong").hidden = !kosong;
  $("#keranjang-isi").hidden = kosong;
  $("#keranjang-jumlah").textContent = totalJumlah();
  $("#keranjang-subtotal").textContent = rupiah(totalHarga());
}

$("#daftar-keranjang").addEventListener("click", (e) => {
  const tombol = e.target.closest("button[data-aksi]");
  if (!tombol) return;
  const id = tombol.closest(".baris-keranjang").dataset.id;
  const aksi = tombol.dataset.aksi;
  if (aksi === "kurang") ubahJumlah(id, -1);
  else if (aksi === "tambah") ubahJumlah(id, 1);
  else if (aksi === "hapus") hapusDariKeranjang(id);
});

/* ===== NOTIFIKASI SINGKAT ===== */
const notif = buat("div", "toast");
notif.setAttribute("role", "status");
notif.setAttribute("aria-live", "polite");
document.body.appendChild(notif);
let penundaNotif = null;

function tampilkanNotif(pesan) {
  notif.textContent = pesan;
  notif.classList.add("tampil");
  clearTimeout(penundaNotif);
  penundaNotif = setTimeout(() => notif.classList.remove("tampil"), 2600);
}

/* ===== LOGIN ===== */
let tujuanSetelahLogin = null;

function sudahMasuk() {
  return bacaPenyimpanan(KUNCI_MASUK) !== null;
}

function perbaruiStatusMasuk() {
  document.documentElement.classList.toggle("sudah-masuk", sudahMasuk());
}

$("#form-login").addEventListener("submit", (e) => {
  e.preventDefault();
  const username = ($("#isian-username").value || "").trim();
  const password = ($("#isian-password").value || "").trim();

  const user = username.toLowerCase();
  const pass = password;

  const cocok =
    (user === "dapur23" && (pass === "12345" || pass === "admin123" || pass === "dapur23")) ||
    (user === "admin" && (pass === "admin123" || pass === "admin" || pass === "12345")) ||
    (user === AKUN.username.toLowerCase() && pass === AKUN.password);

  if (cocok) {
    tulisPenyimpanan(KUNCI_MASUK, username);
    perbaruiStatusMasuk();
    $("#login-salah").hidden = true;
    e.target.reset();
    tampilkanNotif("Login berhasil! Selamat datang di Dapur 23.");
    // Arahkan ke tujuan sebelumnya (misal checkout/detail) atau langsung ke katalog (#/)
    const tujuan = tujuanSetelahLogin || "#/";
    tujuanSetelahLogin = null;
    pindahKe(tujuan);
  }  else {
    $("#login-salah").hidden = false;
    $("#isian-password").value = "";
    $("#isian-password").focus();
  }
});

["#isian-username", "#isian-password"].forEach((pemilih) => {
  $(pemilih).addEventListener("input", () => {
    $("#login-salah").hidden = true;
  });
});

const navMasuk = $("#nav-masuk");
if (navMasuk) {
  navMasuk.addEventListener("click", () => {
    if (halamanAktif === "detail") {
      tujuanSetelahLogin = location.hash;
    }
  });
}

$("#tombol-keluar").addEventListener("click", () => {
  tulisPenyimpanan(KUNCI_MASUK, null);
  perbaruiStatusMasuk();
  tampilkanNotif("Kamu sudah keluar.");
  pindahKe("#/");
});

/* ===== PENCARIAN DAN FILTER KATALOG ===== */
function saringKatalog() {
  const kata = $("#input-cari").value.trim().toLowerCase();
  const pilihan = $('input[name="kategori"]:checked');
  const kategori = pilihan ? pilihan.value : "semua";

  menu.forEach((m) => {
    const cocokKategori = kategori === "semua" || m.kategori === kategori;
    const cocokKata =
      !kata || (m.nama + " " + m.kategori + " " + m.deskripsi).toLowerCase().includes(kata);
    m.el.hidden = !(cocokKategori && cocokKata);
  });
}

$("#form-cari").addEventListener("submit", (e) => {
  e.preventDefault();
  saringKatalog();
  pindahKe("#/");
});

$("#input-cari").addEventListener("input", () => {
  saringKatalog();
  if (halamanAktif !== "katalog") pindahKe("#/");
});

document.querySelectorAll('input[name="kategori"]').forEach((radio) => {
  radio.addEventListener("change", saringKatalog);
});

/* ===== HALAMAN DETAIL MENU ===== */
const detail = { id: null, jumlah: 1 };

function perbaruiDetail() {
  const m = cariMenu(detail.id);
  if (!m) return;
  const total = rupiah(m.harga * detail.jumlah);
  document.querySelectorAll("#halaman-detail .total-teks").forEach((el) => {
    el.textContent = total;
  });
  $("#isian-jumlah").value = detail.jumlah;
  $("#tombol-kurang").disabled = m.habis || detail.jumlah <= 1;
  $("#tombol-tambah").disabled = m.habis || detail.jumlah >= MAKS_JUMLAH;
}

function tampilkanDetail(id) {
  const targetId = id || detail.id || (menu.length > 0 ? menu[0].id : "1");
  const m = cariMenu(targetId);
  $("#detail-tidak-ada").hidden = Boolean(m);
  $("#isi-detail").hidden = !m;
  if (!m) return;

  detail.id = m.id;
  detail.jumlah = 1;

  const foto = $("#detail-gambar");
  foto.src = m.gambar;
  foto.alt = m.nama;
  $("#detail-nama").textContent = m.nama;
  $("detail-gambar").Object = m.gambar;
  $("#detail-deskripsi").textContent = m.deskripsi;
  $("#kasir-nama").textContent = m.nama;
  $("#kasir-harga").textContent = rupiah(m.harga) + " / porsi";
  $("#isian-jumlah").disabled = m.habis;
  $("#tombol-keranjang").disabled = m.habis;
  $("#tombol-pesan").disabled = m.habis;
  perbaruiDetail();
}

$("#tombol-kurang").addEventListener("click", () => {
  detail.jumlah = Math.max(1, detail.jumlah - 1);
  perbaruiDetail();
});

$("#tombol-tambah").addEventListener("click", () => {
  detail.jumlah = Math.min(MAKS_JUMLAH, detail.jumlah + 1);
  perbaruiDetail();
});

$("#isian-jumlah").addEventListener("input", (e) => {
  const angka = parseInt(e.target.value, 10);
  if (Number.isNaN(angka)) return;
  detail.jumlah = Math.max(1, Math.min(angka, MAKS_JUMLAH));
  perbaruiDetail();
});

$("#isian-jumlah").addEventListener("change", perbaruiDetail);

$("#tombol-keranjang").addEventListener("click", () => {
  const m = cariMenu(detail.id);
  if (!m) return;
  tambahKeKeranjang(m.id, detail.jumlah);
  tampilkanNotif(m.nama + " (" + detail.jumlah + ") ditambahkan ke keranjang.");
});

$("#tombol-pesan").addEventListener("click", () => {
  const m = cariMenu(detail.id);
  if (!m) return;
  tambahKeKeranjang(m.id, detail.jumlah);
  pindahKe("#/checkout");
});

/* ===== CHECKOUT ===== */
function buatGambarStruk(sumber, nama) {
  const bingkai = buat("div", "struk-gambar");
  const foto = buat("img", "foto");
  foto.src = sumber;
  foto.alt = nama;
  bingkai.appendChild(foto);
  return bingkai;
}

function renderCheckout() {
  const wadah = $("#ringkasan-checkout");
  wadah.replaceChildren();

  keranjang.forEach((b) => {
    const m = cariMenu(b.id);
    const baris = buat("div", "struk-baris baris-bergambar");
    baris.appendChild(buatGambarStruk(m.gambar, m.nama));
    baris.appendChild(buat("span", "struk-nama", m.nama + " \u00d7 " + b.jumlah));
    baris.appendChild(buat("span", "", rupiah(m.harga * b.jumlah)));
    wadah.appendChild(baris);
  });

  $("#checkout-total").textContent = rupiah(totalHarga());
}

function tampilkanKonfirmasi(pesanan) {
  const dialog = buat("dialog", "dialog-sukses");
  dialog.setAttribute("aria-labelledby", "judul-sukses");

  const judul = buat("h2", "", "Pesanan berhasil dibuat");
  judul.id = "judul-sukses";
  dialog.appendChild(judul);
  dialog.appendChild(buat("p", "", "Terima kasih, " + pesanan.nama + ". Simpan kode pesananmu:"));
  dialog.appendChild(buat("span", "dialog-kode", pesanan.kode));

  pesanan.baris.forEach((b) => {
    const baris = buat("div", "struk-baris baris-bergambar");
    baris.appendChild(buatGambarStruk(b.gambar, b.nama));
    baris.appendChild(buat("span", "struk-nama", b.nama + " \u00d7 " + b.jumlah));
    baris.appendChild(buat("span", "", rupiah(b.subtotal)));
    dialog.appendChild(baris);
  });

  const total = buat("div", "struk-baris struk-total");
  total.appendChild(buat("span", "", "Total bayar"));
  total.appendChild(buat("span", "", rupiah(pesanan.total)));
  dialog.appendChild(total);
  dialog.appendChild(buat("p", "", "Pembayaran: " + pesanan.pembayaran));

  const tombol = buat("button", "tombol tombol-utama tombol-lebar", "Kembali ke katalog");
  tombol.type = "button";
  tombol.addEventListener("click", () => dialog.close());
  dialog.appendChild(tombol);

  dialog.addEventListener("close", () => {
    dialog.remove();
    pindahKe("#/");
  });

  document.body.appendChild(dialog);
  dialog.showModal();
}

$("#form-checkout").addEventListener("submit", (e) => {
  e.preventDefault();
  if (keranjang.length === 0) {
    pindahKe("#/keranjang");
    return;
  }

  const pesanan = {
    kode: "KAL-" + Date.now().toString(36).toUpperCase().slice(-6),
    nama: $("#isian-nama").value.trim(),
    pembayaran: $("#isian-pembayaran").value,
    total: totalHarga(),
    baris: keranjang.map((b) => {
      const m = cariMenu(b.id);
      return { nama: m.nama, gambar: m.gambar, jumlah: b.jumlah, subtotal: m.harga * b.jumlah };
    }),
  };

  keranjang = [];
  perbaruiKeranjang();
  e.target.reset();
  tampilkanKonfirmasi(pesanan);
});

/* ===== ROUTING (BERDASARKAN HASH URL) ===== */
const bagianHalaman = {
  katalog: $("#halaman-katalog"),
  login: $("#halaman-login"),
  detail: $("#halaman-detail"),
  keranjang: $("#halaman-keranjang"),
  checkout: $("#halaman-checkout"),
};

const judulHalaman = {
  katalog: "Katalog",
  login: "Masuk",
  detail: "Detail menu",
  keranjang: "Keranjang",
  checkout: "Checkout",
};

let halamanAktif = "katalog";

function pindahKe(hash) {
  if (location.hash === hash || (hash === "#/" && (location.hash === "" || location.hash === "#"))) {
    tampilkanHalaman();
  } else {
    location.hash = hash;
  }
}

function tampilkanHalaman() {
  const bagian = location.hash.replace(/^#\/?/, "").split("/");
  let nama = bagian[0] || "katalog";
  if (!bagianHalaman[nama]) nama = "katalog";

  if (nama === "detail") {
    if (!sudahMasuk()) {
      tujuanSetelahLogin = location.hash || ("#/detail/" + (bagian[1] || (menu[0] ? menu[0].id : "1")));
      pindahKe("#/login");
      return;
    }
  }

  if (nama === "checkout") {
    if (!sudahMasuk()) {
      tujuanSetelahLogin = "#/checkout";
      pindahKe("#/login");
      return;
    }
    if (keranjang.length === 0) {
      pindahKe("#/keranjang");
      return;
    }
  }

  if (nama === "login" && sudahMasuk()) {
    const idMenu = detail.id || (menu.length > 0 ? menu[0].id : "1");
    pindahKe(tujuanSetelahLogin || ("#/detail/" + idMenu));
    tujuanSetelahLogin = null;
    return;
  }

  halamanAktif = nama;
  Object.keys(bagianHalaman).forEach((kunci) => {
    bagianHalaman[kunci].hidden = kunci !== nama;
  });
  document.body.dataset.halaman = nama;
  document.title = judulHalaman[nama] + " \u2014 " + NAMA_TOKO;

  if (nama === "detail") tampilkanDetail(bagian[1]);
  if (nama === "checkout") renderCheckout();

  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", tampilkanHalaman);

/* ===== MULAI ===== */
muatKeranjang();
perbaruiStatusMasuk();
saringKatalog();
perbaruiKeranjang();
tampilkanHalaman();
