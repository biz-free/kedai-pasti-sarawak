# Panduan Deployment — Kedai PASTI Al-Haddad

Panduan ini menerangkan cara jadikan demo `kedai-pasti-al-haddad.html` sebagai
kedai **sebenar** yang live, menerima tempahan dan bayaran sebenar.

## Fail Yang Disertakan

| Fail | Fungsi |
|---|---|
| `kedai-pasti-al-haddad.html` | Demo penuh (frontend) — semua ciri boleh diuji terus tanpa setup |
| `easyparcel-rate.js` | Netlify Function sedia-deploy untuk kadar penghantaran EasyParcel sebenar |
| `PANDUAN-DEPLOYMENT.md` | Fail ini |

## Status Demo Semasa (Penting)

Demo HTML ini **berfungsi penuh di peringkat frontend** — semua modul (katalog,
troli, checkout, portal ejen, dashboard admin, laporan) boleh diuji terus kerana
data disimpan sementara menggunakan storan sesi artifak (menggantikan pangkalan
data sebenar buat masa ini). Kadar penghantaran di checkout juga masih **simulasi**
(dikira ikut zon + berat, bukan API EasyParcel sebenar).

Untuk jadikan ia kedai **sebenar**, empat langkah utama diperlukan:

1. Sediakan Firebase Firestore (pangkalan data kekal)
2. Sambungkan `easyparcel-rate.js` untuk kadar penghantaran sebenar
3. Deploy ke Netlify
4. Tukar semua data placeholder (nombor WhatsApp, kata laluan demo, dll.)

---

## 1. Persediaan Firebase Firestore

1. Pergi ke [console.firebase.google.com](https://console.firebase.google.com) → **Add Project**.
2. Aktifkan **Firestore Database** (mod production) dan **Authentication** (Email/Password — untuk login admin).
3. Cipta tiga koleksi (collections) mengikut struktur di bawah.

### Koleksi `products`

```json
{
  "id": "P01",
  "name": "Tamar Cocoa 900g",
  "category": "minuman",
  "price": 49.90,
  "weight": 0.90,
  "stock": 60,
  "commissionPct": 10,
  "desc": "",
  "sellerName": "Kedai PASTI Al-Haddad",
  "popular": false,
  "createdAt": "2026-07-01T00:00:00.000Z"
}
```

### Koleksi `agents`

```json
{
  "code": "AG001",
  "name": "Siti Fatimah",
  "phone": "0139876543",
  "email": "siti.fatimah@example.com",
  "area": "Kuching",
  "joinedAt": "2026-05-01T00:00:00.000Z"
}
```
> **Nota keselamatan:** Jangan simpan kata laluan ejen sebagai teks biasa dalam
> Firestore. Gunakan **Firebase Authentication** untuk log masuk ejen, dan simpan
> hanya maklumat profil (nama, kod, kawasan) dalam Firestore.

### Koleksi `orders`

```json
{
  "orderId": "ORD-123456",
  "createdAt": "2026-07-05T00:00:00.000Z",
  "customerName": "", "phone": "", "email": "",
  "address": "", "postcode": "", "city": "", "state": "",
  "items": [
    { "productId": "P01", "name": "", "qty": 2, "price": 49.90, "weight": 0.9, "commissionPct": 10 }
  ],
  "subtotal": 99.80, "shippingFee": 9.90,
  "courier": { "name": "J&T Express", "eta": "2-4 hari bekerja" },
  "total": 109.70,
  "agentCode": "AG001", "agentCommission": 9.98,
  "status": "Baru"
}
```

### Gantikan `window.storage` dengan Firestore

Dalam `kedai-pasti-al-haddad.html`, semua fungsi storan (`loadAllData`,
`persistProducts`, `persistAgents`, `persistOrders`) berada dalam satu blok
JS berlabel `STORAGE`. Gantikan setiap panggilan `window.storage.get/set` dengan
panggilan Firestore SDK yang setara, contohnya:

```js
// Sebelum (demo):
const p = await window.storage.get('alhaddad:products', true);

// Selepas (Firestore):
const snap = await getDocs(collection(db, 'products'));
appProducts = snap.docs.map(d => d.data());
```

---

## 2. Sambungkan EasyParcel API Sebenar

1. Deploy `easyparcel-rate.js` ke `netlify/functions/easyparcel-rate.js` dalam repo anda.
2. Di Netlify Dashboard → **Site settings → Environment variables**, tambah:
   - `EASYPARCEL_API` = API key EasyParcel anda
   - `EASYPARCEL_ENV` = `production` (kosongkan untuk guna endpoint demo/sandbox EasyParcel semasa ujian)
3. Dalam `kedai-pasti-al-haddad.html`, cari fungsi `calculateShippingOptions()` (simulasi)
   dan gantikan panggilannya dalam `window.calculateShipping()` dengan panggilan sebenar:

```js
const res = await fetch('/.netlify/functions/easyparcel-rate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ destPostcode: poskod, destState: negeri, weight })
});
const { rates, error } = await res.json();
```

4. **Sahkan semula** format kod negeri dan parameter API di
   [developers.easyparcel.com](https://developers.easyparcel.com/) — API pihak
   ketiga boleh berubah, dan `easyparcel-rate.js` menyertakan nota terperinci
   tentang bahagian mana yang perlu disahkan sebelum guna sebenar.

---

## 3. Deploy ke Netlify

1. Push kod (fail HTML + folder `netlify/functions/`) ke repo GitHub/GitLab.
2. Di [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**.
3. Publish directory: `.` (root) atau folder tempat HTML berada.
4. Functions directory: `netlify/functions`.
5. Tambah environment variables (Firebase config + `EASYPARCEL_API`) di **Site settings → Environment variables**.
6. Deploy. Netlify akan automatik detect dan jalankan Netlify Functions.

---

## 4. Senarai Semak Sebelum "Go-Live"

- [ ] Ganti nombor WhatsApp placeholder `60123456789` (dalam FAB, footer, portal ejen, WhatsApp checkout) dengan nombor perniagaan sebenar.
- [ ] Tukar kata laluan demo admin (`admin@pastialhaddad.my` / `admin123`) kepada Firebase Authentication sebenar.
- [ ] Tukar kata laluan demo ejen (`demo123` untuk semua) — gunakan Firebase Auth per-ejen.
- [ ] Sambungkan Firestore menggantikan `window.storage` (Bahagian 1 di atas).
- [ ] Sambungkan `easyparcel-rate.js` menggantikan kadar simulasi (Bahagian 2 di atas).
- [ ] Semak semula alamat pengambilan (pickup) — kod di dalam `easyparcel-rate.js` andaikan gudang di Kuching, Sarawak (poskod 93000).
- [ ] Tambah gerbang pembayaran sebenar (cth. ToyyibPay, Billplz, Stripe) jika mahu terima bayaran dalam talian automatik — demo ini hanya sahkan pesanan via WhatsApp.
- [ ] Semak dasar privasi & terma perkhidmatan untuk pematuhan PDPA.

---

## Soalan Lazim

**Bolehkah saya terus guna demo ini tanpa Firebase?**
Boleh untuk tujuan pameran/demo — data akan kekal dalam storan sesi artifak.
Untuk kedai produksi dengan trafik sebenar, Firestore (atau pangkalan data lain)
disyorkan supaya data tidak hilang dan boleh diskalakan.

**Kenapa kadar penghantaran checkout tidak sama dengan EasyParcel sebenar?**
Kadar semasa adalah anggaran demo berdasarkan zon (Sarawak/Sabah/Labuan vs
Semenanjung) dan berat troli. Ikut Bahagian 2 di atas untuk sambungkan kadar
sebenar.
