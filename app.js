// ==========================================
// 1. DATA STATE & CONSTANTS (LOCAL ONLY)
// ==========================================
let cart = []; 
let ordersData = [];
let currentActiveCategory = 'all';
let currentSizeProductId = null; 

let appCategories = [];
let appProducts = [];
let appAgents = [];
window.tempProductImages = []; 

const defaultCategories = [
    { id: 'raya', name: 'Raya' },
    { id: 'sekolah', name: 'Sekolah' },
    { id: 'buku', name: 'Buku' }
];

const defaultProducts = [
    { id: 1, name: "Sampul Raya PASTI 2026", category: "raya", price: 3.50, weight: 0.1, commissionPct: 10, stock: 100, hasSize: false, canPost: true, image: "sampul_raya.jpg", images: ["sampul_raya.jpg"], desc: "10 keping/paket", icon: "mail", color: "green", sellerName: "Kedai PASTI Sarawak", sellerPhone: "0134636383", sellerEmail: "ekonomipastisarawak@gmail.com", sellerAddr: "Pejabat PASTI Negeri Sarawak", sellerPostcode: "93050", sellerCity: "Kuching", sellerState: "srw" },
    { id: 5, name: "Uniform Lelaki", category: "sekolah", price: 45.00, weight: 0.3, commissionPct: 10, stock: 50, hasSize: true, canPost: true, image: "uniform_l.jpg", images: ["uniform_l.jpg"], desc: "Baju & Seluar", icon: "shirt", color: "green", sellerName: "Kedai PASTI Sarawak", sellerPhone: "0134636383", sellerEmail: "ekonomipastisarawak@gmail.com", sellerAddr: "Pejabat PASTI Negeri Sarawak", sellerPostcode: "93050", sellerCity: "Kuching", sellerState: "srw" }
];

const listKawasan = ["PETRA JAYA", "KOTA SAMARAHAN", "BATANG SADONG", "SRI AMAN", "BETONG", "SIBU", "MIRI"];
const listNegeri = [ {v:'srw', t:'SARAWAK'}, {v:'sbh', t:'SABAH'}, {v:'kul', t:'KUALA LUMPUR'} ];

window.deliveryType = 'pickup';
window.postageRate = 0.00;
window.cartTotalWeight = 0;

// ==========================================
// 2. INISIALISASI APABILA HALAMAN DIBUKA
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Render Dropdown Kawasan
    const kawasanSelect = document.getElementById('kawasan-select');
    if(kawasanSelect) kawasanSelect.innerHTML = '<option value="">-- Pilih Kawasan PASTI --</option>' + listKawasan.map(k => `<option value="${k}">${k}</option>`).join('');
    
    // Render Dropdown Negeri
    const negeriSelect = document.getElementById('negeri-input');
    if(negeriSelect) negeriSelect.innerHTML = listNegeri.map(n => `<option value="${n.v}">${n.t}</option>`).join('');

    window.loadLocalData();
    lucide.createIcons();
});

// ==========================================
// 3. FUNGSI PANGKALAN DATA (LOCAL STORAGE)
// ==========================================
window.loadLocalData = function() {
    try {
        appCategories = JSON.parse(localStorage.getItem('pastiCategories')) || defaultCategories;
        appProducts = JSON.parse(localStorage.getItem('pastiProducts')) || defaultProducts;
        appAgents = JSON.parse(localStorage.getItem('pastiAgents')) || [];
        ordersData = JSON.parse(localStorage.getItem('pastiOrders')) || [];
        
        window.renderCategoryButtons(currentActiveCategory);
        window.filterCategory('all');
    } catch(e) {
        console.error("Gagal muat data:", e);
    }
}

window.saveLocalData = function() {
    localStorage.setItem('pastiOrders', JSON.stringify(ordersData));
    localStorage.setItem('pastiProducts', JSON.stringify(appProducts));
}

// ==========================================
// 4. FUNGSI UI & PAPARAN (VIEWS)
// ==========================================
window.showView = function(id) { 
    ['landing', 'checkout', 'admin', 'portal-guru', 'product-detail'].forEach(v => { 
        const el = document.getElementById('view-'+v); if(el) el.classList.toggle('hidden', id !== v); 
    }); 
    window.scrollTo({top:0, behavior:'smooth'});
};

window.renderCategoryButtons = function(activeCat = 'all') {
    const container = document.getElementById('category-filter-container');
    if(!container) return;
    let html = `<button onclick="window.filterCategory('all')" class="snap-center shrink-0 ${activeCat === 'all' ? 'bg-orange-500 text-white shadow-[0_4px_0_rgb(194,65,12)] border-orange-600' : 'bg-white text-green-700 hover:bg-green-50 border-green-200'} px-6 py-3 rounded-2xl text-sm font-black transition-all border-2 uppercase">SEMUA</button>`;
    appCategories.forEach(cat => {
        html += `<button onclick="window.filterCategory('${cat.id}')" class="snap-center shrink-0 ${activeCat === cat.id ? 'bg-orange-500 text-white shadow-[0_4px_0_rgb(194,65,12)] border-orange-600' : 'bg-white text-green-700 hover:bg-green-50 border-green-200'} px-6 py-3 rounded-2xl text-sm font-bold transition-all border-2 uppercase">${cat.name}</button>`;
    });
    container.innerHTML = html;
}

window.filterCategory = function(catId) {
    currentActiveCategory = catId;
    window.renderCategoryButtons(catId);
    if (catId === 'all') window.renderProducts(appProducts);
    else window.renderProducts(appProducts.filter(p => p.category === catId));
}

window.renderProducts = function(items) {
    const grid = document.getElementById('product-grid');
    if(!grid) return;
    grid.innerHTML = items.map(p => {
        let singleImg = (p.images && p.images.length > 0) ? p.images[0] : p.image;
        let actionBtn = p.hasSize ? `<button onclick="window.promptSize('${p.id}')" class="w-full bg-blue-50 hover:bg-blue-500 hover:text-white text-blue-700 text-xs font-black py-3 rounded-xl transition-all border border-blue-200 shadow-sm">PILIH SAIZ</button>` : `<button onclick="window.addToCart('${p.id}')" class="w-full bg-green-50 hover:bg-orange-500 hover:text-white text-green-700 text-xs font-black py-3 rounded-xl transition-all border border-green-200 shadow-sm">TAMBAH</button>`;
        return `
        <div class="product-card bg-white border-2 border-green-100 rounded-[1.5rem] overflow-hidden flex flex-col shadow-sm">
            <div class="h-48 bg-slate-50 relative flex items-center justify-center p-2">
                <img src="${singleImg}" class="w-full h-full object-contain relative z-10">
                <div class="absolute top-3 right-3 bg-white/90 text-green-700 text-xs font-black px-3 py-1.5 rounded-xl shadow-sm z-30">RM ${parseFloat(p.price).toFixed(2)}</div>
            </div>
            <div class="p-5 flex-grow flex flex-col justify-between">
                <div><h3 class="text-base font-bold text-slate-800 mb-2">${p.name}</h3></div>
                ${actionBtn}
            </div>
        </div>`
    }).join('');
    lucide.createIcons();
}

// ==========================================
// 5. TROLI & PESANAN (CART)
// ==========================================
window.promptSize = function(id) {
    currentSizeProductId = id;
    document.getElementById('modal-size-select').classList.remove('hidden');
}

window.closeSizeModal = function() {
    document.getElementById('modal-size-select').classList.add('hidden');
    currentSizeProductId = null;
}

window.confirmAddToCartSize = function() {
    if(!currentSizeProductId) return;
    const size = document.getElementById('selected-product-size').value;
    window.addToCart(currentSizeProductId, size);
    window.closeSizeModal();
}

window.addToCart = function(id, selectedSize = null) {
    const product = appProducts.find(p => String(p.id) === String(id));
    if(!product) return;
    
    const existing = cart.find(c => String(c.id) === String(id) && c.size === selectedSize);
    let cartItem = { ...product };
    if(selectedSize) cartItem.size = selectedSize;

    if (existing) existing.qty++;
    else cart.push({ ...cartItem, qty: 1 });
    
    window.updateCartUI();
    alert("Produk dimasukkan ke troli!");
}

window.updateCartUI = function() {
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById('cart-badge');
    badge.innerText = totalItems;
    if (totalItems === 0) badge.classList.add('scale-0'); else badge.classList.remove('scale-0');

    const container = document.getElementById('cart-items-container');
    const billing = document.getElementById('billing-section');
    
    if (cart.length === 0) {
        container.innerHTML = `<div class="text-center py-16 text-slate-400">Troli anda kosong.</div>`;
        billing.classList.add('hidden');
        document.getElementById('grand-total').innerText = '0.00';
    } else {
        let subtotalCart = 0;
        container.innerHTML = cart.map((item, idx) => {
            subtotalCart += (item.price * item.qty);
            let sizeLabel = item.size ? `<span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] ml-2">${item.size}</span>` : '';
            return `
                <div class="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                    <div class="flex-grow">
                        <h4 class="text-sm font-bold">${item.name}${sizeLabel}</h4>
                        <p class="text-[10px] text-green-600 font-bold">RM ${item.price.toFixed(2)} x ${item.qty}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-black">RM ${(item.price * item.qty).toFixed(2)}</p>
                    </div>
                </div>`;
        }).join('');

        let finalTotal = subtotalCart;
        document.getElementById('grand-total').innerText = finalTotal.toFixed(2);
        billing.classList.remove('hidden');
    }
}

window.toggleDeliveryMethod = function(type) {
    window.deliveryType = type;
    const alamatSec = document.getElementById('alamat-section');
    if(type === 'postage') { alamatSec.classList.remove('hidden'); } 
    else { alamatSec.classList.add('hidden'); window.postageRate = 0.00; }
    window.updateCartUI();
}

window.processOrder = function() {
    const nama = document.getElementById('nama-input').value;
    const phone = document.getElementById('phone-input').value;
    const total = document.getElementById('grand-total').innerText;
    
    if(!nama || !phone) return alert("Sila isikan Nama dan Nombor Telefon untuk rekod pembelian.");
    
    let msg = `*TEMPAHAN KEDAI PASTI*\n\nNama: ${nama}\nTel: ${phone}\n\n*Barangan:*\n`;
    cart.forEach(i => {
        msg += `- ${i.qty}x ${i.name} ${i.size ? `(${i.size})` : ''} (RM ${(i.price*i.qty).toFixed(2)})\n`;
    });
    msg += `\n*Jumlah Besar: RM ${total}*`;
    
    const orderData = { id: Date.now(), nama, phone, total, cart, tarikh: new Date().toLocaleDateString() };
    ordersData.push(orderData);
    window.saveLocalData();
    
    window.open(`https://wa.me/60134636383?text=${encodeURIComponent(msg)}`, '_blank');
    cart = [];
    window.updateCartUI();
    window.showView('landing');
}