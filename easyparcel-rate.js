// ============================================================================
// Netlify Function — Kadar Penghantaran EasyParcel (Kedai PASTI Al-Haddad)
// ============================================================================
// LOKASI DEPLOY: netlify/functions/easyparcel-rate.js
//
// TUJUAN
// Fungsi ini dipanggil oleh frontend (checkout) untuk dapatkan kadar
// penghantaran SEBENAR daripada EasyParcel, tanpa mendedahkan API key
// kepada pelayar pengguna (API key kekal selamat di server Netlify).
//
// PERSEDIAAN DI NETLIFY
// 1. Letak fail ini di:  netlify/functions/easyparcel-rate.js
// 2. Di Netlify Dashboard → Site settings → Environment variables, tambah:
//      EASYPARCEL_API      = <API key EasyParcel anda>
//      EASYPARCEL_ENV      = production   (atau biar kosong untuk guna demo/sandbox)
// 3. Frontend panggil endpoint ini di:  /.netlify/functions/easyparcel-rate
//
// PENTING — SILA SAHKAN SEBELUM "GO-LIVE"
// Struktur request/response di bawah dibina berdasarkan dokumentasi awam
// EasyParcel (EPRateCheckingBulk) pada masa fail ini disediakan. Pembekal
// API pihak ketiga boleh menukar format dari semasa ke semasa — sila
// sahkan semula endpoint, nama parameter, dan kod negeri di:
//      https://developers.easyparcel.com/
// sebelum menggunakannya untuk transaksi sebenar.
// ============================================================================

const EASYPARCEL_ENDPOINT = (process.env.EASYPARCEL_ENV === 'production')
  ? 'https://connect.easyparcel.my/?ac=EPRateCheckingBulk'
  : 'https://demo.connect.easyparcel.my/?ac=EPRateCheckingBulk';

// Peta kod negeri EasyParcel — SILA SAHKAN kod sebenar di akaun/dokumentasi
// EasyParcel anda. Kod di bawah adalah singkatan 3-huruf lazim yang
// digunakan dalam industri logistik Malaysia, tetapi boleh berbeza.
const STATE_CODE_MAP = {
  'Perlis': 'pls', 'Kedah': 'kdh', 'Pulau Pinang': 'png', 'Perak': 'prk',
  'Selangor': 'sgr', 'Kuala Lumpur': 'kul', 'Putrajaya': 'kul',
  'Negeri Sembilan': 'nsn', 'Melaka': 'mlk', 'Johor': 'jhr',
  'Pahang': 'phg', 'Terengganu': 'trg', 'Kelantan': 'ktn',
  'Sarawak': 'srw', 'Sabah': 'sbh', 'Labuan': 'lbn',
};

// Poskod & negeri pengambilan (lokasi kedai/gudang anda) — tukar mengikut lokasi sebenar.
const DEFAULT_PICKUP_POSTCODE = '93000';
const DEFAULT_PICKUP_STATE = 'srw'; // Kuching, Sarawak

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed. Guna POST.' }) };
  }

  const apiKey = process.env.EASYPARCEL_API;
  if (!apiKey) {
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: 'EASYPARCEL_API belum ditetapkan dalam Netlify Environment Variables.' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body request bukan JSON yang sah.' }) };
  }

  const {
    pickupPostcode = DEFAULT_PICKUP_POSTCODE,
    pickupState = DEFAULT_PICKUP_STATE,
    destPostcode,
    destState,   // nama penuh negeri, cth: "Selangor" — akan ditukar guna STATE_CODE_MAP
    weight,      // dalam kg, cth: 1.8
  } = payload;

  if (!destPostcode || !destState || !weight) {
    return {
      statusCode: 400, headers,
      body: JSON.stringify({ error: 'Medan destPostcode, destState dan weight diperlukan.' }),
    };
  }

  const destStateCode = STATE_CODE_MAP[destState] || destState;

  const form = new URLSearchParams();
  form.append('api', apiKey);
  form.append('bulk[0][pick_code]', pickupPostcode);
  form.append('bulk[0][pick_state]', pickupState);
  form.append('bulk[0][pick_country]', 'MY');
  form.append('bulk[0][send_code]', destPostcode);
  form.append('bulk[0][send_state]', destStateCode);
  form.append('bulk[0][send_country]', 'MY');
  form.append('bulk[0][weight]', String(weight));

  try {
    const res = await fetch(EASYPARCEL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const data = await res.json();

    if (data.api_status !== 'Success' || !Array.isArray(data.result) || !data.result[0]) {
      return {
        statusCode: 502, headers,
        body: JSON.stringify({ error: data.error_remark || 'EasyParcel tidak memulangkan respons yang sah.', raw: data }),
      };
    }

    const bulkResult = data.result[0];
    if (bulkResult.status !== 'Success' || !Array.isArray(bulkResult.rates) || bulkResult.rates.length === 0) {
      return {
        statusCode: 502, headers,
        body: JSON.stringify({ error: bulkResult.remarks || 'Tiada kadar penghantaran tersedia untuk poskod ini.' }),
      };
    }

    const rates = bulkResult.rates.map((r) => ({
      courier: r.courier_name,
      service: r.service_name,
      serviceId: r.service_id,
      price: parseFloat(r.price),
      eta: r.delivery || '-',
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ rates }) };
  } catch (err) {
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: 'Ralat menghubungi EasyParcel: ' + err.message }),
    };
  }
};

// ============================================================================
// CONTOH PANGGILAN DARI FRONTEND (gantikan calculateShippingOptions() simulasi
// dalam kedai-pasti-al-haddad.html dengan panggilan sebenar seperti ini):
//
//   const res = await fetch('/.netlify/functions/easyparcel-rate', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       destPostcode: '43000',
//       destState: 'Selangor',
//       weight: 1.8
//     })
//   });
//   const { rates, error } = await res.json();
// ============================================================================
