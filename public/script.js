// User data and state
let currentUserData = JSON.parse(localStorage.getItem('user')) || null;
let authToken = localStorage.getItem('authToken') || null;
let currentUser = currentUserData;
let cart = JSON.parse(localStorage.getItem('cart')) || [];
if (authToken === 'null' || authToken === 'undefined' || !authToken) {
    authToken = null;
    localStorage.removeItem('authToken');
}
console.log("Elite Shop Initialized:", { user: !!currentUser, token: !!authToken, cart: cart.length });
let currentFilter = 'all';
let currentSearch = '';
let selectedSize = 'M';
let cartCount = 0;
let paymentTimer;
let timeLeft = 300; // 5 minutes in seconds

// OWNER CONFIGURATION
const OWNER_EMAIL = 'vgvijay2007vsr@gmail.com';

// DOM Elements
const authPage = document.getElementById('authPage');
const verificationPage = document.getElementById('verificationPage');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginTab = document.getElementById('loginTab');
const signupTab = document.getElementById('signupTab');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const userAvatar = document.getElementById('userAvatar');

// Base API URL
const API_URL = '/api';

// Initialize
document.addEventListener('DOMContentLoaded', async function () {
    // Loader Logic
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 2000);

    await loadProducts();
    updateCart();
    checkServerStatus();

    // Check if user is already logged in
    if (currentUser) {
        showMainApp();
    }

    // Set up search input event
    if (document.getElementById('searchBar')) {
        document.getElementById('searchBar').addEventListener('input', searchProducts);
    }

    // Click event for cart button
    if (document.getElementById('cartButton')) {
        document.getElementById('cartButton').addEventListener('click', toggleCart);
    }

    // Click event for overlay to close modal
    if (document.getElementById('overlay')) {
        document.getElementById('overlay').addEventListener('click', function () {
            closeAllModals();
        });
    }

    // Check for showCart parameter to open cart automatically
    const params = new URLSearchParams(window.location.search);
    if (params.get('showCart') === 'true') {
        setTimeout(toggleCart, 500);
    }
});

// Helper to close everything
function closeAllModals() {
    const modals = [
        'paymentModal',
        'profileModal',
        'adminModal',
        'cartSidebar'
    ];

    modals.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });

    document.getElementById('overlay').classList.remove('active');
    if (paymentTimer) clearInterval(paymentTimer);
}

async function checkServerStatus() {
    try {
        const response = await fetch(`${API_URL}/server-info`);
        if (response.ok) {
            console.log("Backend Connection: ACTIVE");
            const badge = document.createElement('div');
            badge.id = 'backend-status-badge';
            badge.style.cssText = 'position: fixed; bottom: 20px; right: 20px; padding: 8px 16px; background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #10b981; border-radius: 50px; font-size: 0.7rem; font-weight: 800; letter-spacing: 1px; z-index: 10000; backdrop-filter: blur(10px);';
            badge.innerHTML = '● BACKEND ONLINE';
            document.body.appendChild(badge);
        }
    } catch (e) {
        console.error("Backend Connection: FAILED");
    }
}

// Load Products from API
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        const products = await response.json();
        renderProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        const grid = document.getElementById('productGrid');
        if (grid) {
            grid.innerHTML = '<p class="no-results">Failed to load products. Please check server connection.</p>';
        }
    }
}

// Render Products to Grid
function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return; // Exit if not on the main shop page

    grid.innerHTML = ''; // Clear existing

    if (products.length === 0) {
        grid.innerHTML = '<p class="no-results">No products found.</p>';
        return;
    }

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = `product-card ${product.category}`;
        card.dataset.id = product.id;
        card.dataset.name = product.name;
        card.dataset.price = product.price;
        card.dataset.image = product.image;

        card.innerHTML = `
      <div class="product-image-container" onclick="openProductDetail('${product.id}')">
        <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/280x200?text=No+Image'">
        <div class="product-overlay">
            <span>View Details</span>
        </div>
      </div>
      <h2>${product.name}</h2>
      <p>₹${product.price}/PIECE</p>
      <div class="rating" style="margin-bottom: 1rem;">⭐⭐⭐⭐⭐</div>
      <div class="product-actions" style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: auto;">
        <button class="add-to-cart-btn" onclick="addToCart(this)">Add to Cart</button>
        <button class="buy-now-btn" onclick="openProductDetail('${product.id}')">Buy Now</button>
      </div>
    `;
        grid.appendChild(card);
    });
}

// Product Detail Logic
function openProductDetail(productId) {
    // Redirect to the dedicated product page for an "Amazon/Flipkart" like experience
    window.location.href = `product.html?id=${productId}`;
}

function selectSize(size) {
    selectedSize = size;
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === size);
    });
}

function addToCartWithDetails(product, size, silent = false) {
    if (!currentUser) {
        alert('Please login to continue');
        return;
    }
    const existingItem = cart.find(item => item.id === product.id && item.size === size);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            size: size,
            quantity: 1
        });
    }
    saveCart();
    updateCart();
    if (!silent) {
        alert(`Added ${product.name} (Size: ${size}) to cart!`);
    }
}



// Order History Logic
let ordersLoaded = false;
async function toggleOrderHistory() {
    const orderList = document.getElementById('orderList');
    const chevron = document.getElementById('orderChevron');

    if (orderList.style.display === 'none') {
        orderList.style.display = 'block';
        chevron.textContent = '▲';
        if (!ordersLoaded) await loadOrders();
    } else {
        orderList.style.display = 'none';
        chevron.textContent = '▼';
    }
}

async function loadOrders() {
    if (!currentUser) return;

    const orderList = document.getElementById('orderList');
    try {
        const response = await fetch(`${API_URL}/orders`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const orders = await response.json();

        if (orders.length === 0) {
            orderList.innerHTML = '<p class="no-orders text-muted">No orders yet.</p>';
        } else {
            orderList.innerHTML = orders.map(order => {
                const date = new Date(order.created_at).toLocaleDateString();
                const items = JSON.parse(order.items);
                const itemNames = items.map(i => `${i.name} (x${i.quantity})`).join(', ');

                return `
                    <div class="order-card">
                        <div class="order-card-header">
                            <span>#ORD-${order.id} | ${date}</span>
                            <span class="order-status">${order.status.toUpperCase()}</span>
                        </div>
                        <div class="order-items-summary">${itemNames}</div>
                        <div class="order-total" style="margin-top: 0.5rem; font-weight: 800;">Total: ₹${order.total.toFixed(2)}</div>
                    </div>
                `;
            }).join('');
            ordersLoaded = true;
        }
    } catch (e) {
        orderList.innerHTML = '<p class="error">Failed to load orders.</p>';
    }
}

// Switch between login and signup tabs
function switchAuthTab(tab) {
    if (tab === 'login') {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
    } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        loginTab.classList.remove('active');
        signupTab.classList.add('active');
    }
}

// Signup function
async function signup() {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;

    if (!name || !email || !password || !confirmPassword) {
        alert('Please fill in all fields');
        return;
    }
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Registration successful! Please login.');
            switchAuthTab('login');
            document.getElementById('loginEmail').value = email;
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Signup error:', error);
        alert('An error occurred. Please try again.');
    }
}

// Login function
async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            authToken = data.token;
            localStorage.setItem('user', JSON.stringify(currentUser));
            localStorage.setItem('authToken', authToken);
            showMainApp();
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred. Please check your connection.');
    }
}

// Email Verification Simulation
function simulateEmailVerification() {
    alert('Email verified successfully!');
    showMainApp();
}

function resendVerificationEmail() {
    alert('A new verification link has been sent to your email.');
}

// Show main application
function showMainApp() {
    if (verificationPage) verificationPage.style.display = 'none';
    if (authPage) authPage.style.display = 'none';
    if (mainApp) mainApp.style.display = 'block';

    // Update user profile in header
    if (currentUser) {
        document.getElementById('profileName').textContent = currentUser.name;
        document.getElementById('profileEmail').textContent = currentUser.email;
        document.getElementById('profileAddress').textContent = currentUser.address || 'Not set';
        document.getElementById('profilePhone').textContent = currentUser.phone || 'Not set';

        // Strictly restrict Dashboard visibility to the Owner Email only
        if (currentUser.email === OWNER_EMAIL) {
            document.getElementById('adminPanelBtn').style.display = 'block';
        } else {
            document.getElementById('adminPanelBtn').style.display = 'none';
        }
    }

    filterCategory('all');
}

// Logout function
function logout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');

    // Optional: Clear cart on logout? 
    // For now keeping cart across login sessions locally or clearing it.
    // Let's clear it to be safe or keep it. Original cleared it.
    cart = [];
    cartCount = 0;
    localStorage.removeItem('cart');

    if (mainApp) mainApp.style.display = 'none';
    if (verificationPage) verificationPage.style.display = 'none';
    if (authPage) authPage.style.display = 'flex';
    hideProfile();

    switchAuthTab('login');
}

// Functions for Profile, Cart, and Payment (Mostly UI logic)
function showProfile() {
    if (!currentUser) return;
    document.getElementById('profileModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');

    // Extra check to show admin button for Owner ONLY
    if (currentUser.email === OWNER_EMAIL) {
        document.getElementById('adminPanelBtn').style.display = 'block';
    } else {
        document.getElementById('adminPanelBtn').style.display = 'none';
    }
}

// Admin Panel Functions
async function showAdminPanel() {
    hideProfile();
    const modal = document.getElementById('adminModal');
    const overlay = document.getElementById('overlay');
    const tableBody = document.getElementById('userTableBody');

    modal.classList.add('active');
    overlay.classList.add('active');

    try {
        const [usersRes, ordersRes] = await Promise.all([
            fetch(`${API_URL}/admin/users`, { headers: { 'Authorization': `Bearer ${authToken}` } }),
            fetch(`${API_URL}/admin/orders`, { headers: { 'Authorization': `Bearer ${authToken}` } })
        ]);

        const users = await usersRes.json();
        const orders = await ordersRes.json();

        document.getElementById('totalUserCount').textContent = users.length;
        document.getElementById('totalOrderCount').textContent = orders.length;

        tableBody.innerHTML = users.map(user => `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 1rem;">${user.name} ${user.role === 'admin' ? '👑' : ''}</td>
                <td style="padding: 1rem;">${user.email}</td>
                <td style="padding: 1rem;">${new Date(user.created_at).toLocaleDateString()}</td>
                <td style="padding: 1rem;">
                    ${user.role !== 'admin' ? `<button onclick="deleteUser(${user.id})" class="admin-btn-small">Remove</button>` : ''}
                </td>
            </tr>
        `).join('');

        const orderTableBody = document.getElementById('orderTableBody');
        orderTableBody.innerHTML = orders.map(order => `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 1rem;">#${order.id}</td>
                <td style="padding: 1rem;">${order.user_name}</td>
                <td style="padding: 1rem;">₹${order.total}</td>
                <td style="padding: 1rem;">
                    <select onchange="updateOrderStatus(${order.id}, this.value)" class="admin-select">
                        <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>Processing</option>
                        <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        tableBody.innerHTML = '<tr><td colspan="4">Error loading data</td></tr>';
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        const res = await fetch(`${API_URL}/admin/orders/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ orderId, status })
        });
        if (res.ok) alert('Order updated!');
    } catch (e) { alert('Failed to update order'); }
}

async function addProduct() {
    const name = document.getElementById('prodName').value;
    const price = document.getElementById('prodPrice').value;
    const category = document.getElementById('prodCategory').value;
    const description = document.getElementById('prodDesc').value;
    const imageFile = document.getElementById('prodImage').files[0];

    if (!name || !price) return alert('Name and price required');

    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('category', category);
    formData.append('description', description);
    if (imageFile) formData.append('image', imageFile);

    try {
        const res = await fetch(`${API_URL}/admin/products`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });
        if (res.ok) {
            alert('Product added!');
            location.reload();
        }
    } catch (e) { alert('Failed to add product'); }
}

function hideAdminPanel() {
    document.getElementById('adminModal').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}

function switchAdminTab(tab) {
    const sections = ['adminUsersSection', 'adminOrdersSection', 'adminAddProductSection'];
    sections.forEach(s => document.getElementById(s).style.display = 'none');

    const target = tab === 'users' ? 'adminUsersSection' : (tab === 'orders' ? 'adminOrdersSection' : 'adminAddProductSection');
    document.getElementById(target).style.display = 'block';

    // Update active tab styling
    document.querySelectorAll('.admin-tabs .auth-tab').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(tab.slice(0, 3)));
    });
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to remove this user?')) return;
    try {
        const res = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) showAdminPanel();
    } catch (e) { alert('Failed to delete'); }
}

function hideProfile() {
    document.getElementById('profileModal').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}

function showAddressForm() {
    document.getElementById('addressForm').classList.add('active');
    if (currentUser.address) {
        // Simple logic since backend stores single string
        document.getElementById('addressLine1').value = currentUser.address;
    }
    if (currentUser.phone) {
        document.getElementById('addressPhone').value = currentUser.phone;
    }
}

function hideAddressForm() {
    document.getElementById('addressForm').classList.remove('active');
}

async function updateAddress() {
    const address = document.getElementById('addressLine1').value; // Simplifying for demo
    const phone = document.getElementById('addressPhone').value;

    if (!address || !phone) {
        alert('Please fill in required fields');
        return;
    }

    currentUser.address = address;
    currentUser.phone = phone;

    try {
        const response = await fetch(`${API_URL}/user/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ address, phone })
        });
        if (response.ok) {
            localStorage.setItem('user', JSON.stringify(currentUser));
            document.getElementById('profileAddress').textContent = currentUser.address;
            document.getElementById('profilePhone').textContent = currentUser.phone;
            hideAddressForm();
            alert('Address updated successfully');
        }
    } catch (e) {
        alert('Failed to update address');
    }
}

function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}

function addToCart(button) {
    if (!currentUser) {
        alert('Please login to add items to cart');
        return;
    }

    const productCard = button.closest('.product-card');
    const productId = parseInt(productCard.dataset.id);
    const productName = productCard.dataset.name;
    const productPrice = parseFloat(productCard.dataset.price);
    const productImage = productCard.dataset.image;

    // Default to size 'M' for items added from the main grid
    const size = 'M';
    const existingItem = cart.find(item => item.id === productId && item.size === size);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: productPrice,
            image: productImage,
            size: size,
            quantity: 1
        });
    }

    saveCart();
    updateCart();

    const cartElement = document.getElementById('cartButton');
    cartElement.style.transform = 'scale(1.1)';
    setTimeout(() => {
        cartElement.style.transform = 'scale(1)';
    }, 300);
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCart() {
    cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    document.getElementById('cartCount').textContent = cartCount;

    const cartItemsContainer = document.getElementById('cartItems');
    if (!cartItemsContainer) return; // Exit if not on page with cart sidebar

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align: center; padding: 2rem;">Your cart is empty</p>';
    } else {
        let cartHTML = '';
        let total = 0;

        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            const size = item.size || 'M';

            cartHTML += `
        <div class="cart-item" data-id="${item.id}">
          <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/80'">
          <div class="cart-item-details">
            <div class="cart-item-title">${item.name}</div>
            <div class="cart-item-size">Size: ${size}</div>
            <div class="cart-item-price">₹${item.price.toFixed()}</div>
            <div class="cart-item-quantity">
              <button class="quantity-btn" onclick="updateQuantityByDetails(${item.id}, '${size}', -1)">-</button>
              <span>${item.quantity}</span>
              <button class="quantity-btn" onclick="updateQuantityByDetails(${item.id}, '${size}', 1)">+</button>
            </div>
          </div>
          <button class="remove-item" onclick="removeItemByDetails(${item.id}, '${size}')">Remove</button>
        </div>
      `;
        });

        cartItemsContainer.innerHTML = cartHTML;
        const totalEl = document.getElementById('cartTotal');
        if (totalEl) totalEl.textContent = `₹${total.toFixed()}`;
    }
}

function updateQuantityByDetails(id, size, change) {
    const item = cart.find(item => item.id == id && (item.size == size || (!item.size && size == 'M')));
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            cart = cart.filter(it => !(it.id == id && (it.size == size || (!it.size && size == 'M'))));
        }
        saveCart();
        updateCart();
    }
}

function removeItemByDetails(id, size) {
    cart = cart.filter(item => !(item.id == id && (item.size == size || (!item.size && size == 'M'))));
    saveCart();
    updateCart();
}

function checkout() {
    if (!currentUser) {
        alert('Please login to checkout');
        return;
    }
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    window.location.href = 'checkout.html';
}

function startPaymentTimer() {
    timeLeft = 300;
    updateTimerDisplay();
    document.getElementById('paymentTimer').style.display = 'inline';
    if (paymentTimer) clearInterval(paymentTimer);
    paymentTimer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(paymentTimer);
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('paymentTimer').textContent =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

window.currentPaymentId = null;
window.statusInterval = null;

async function checkPaymentStatus() {
    if (!currentPaymentId) return;
    try {
        const res = await fetch(`${API_URL}/payments/status/${currentPaymentId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (data.status === 'completed') {
            if (statusInterval) clearInterval(statusInterval);
            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            // 1. Show UI Success
            showPaymentSuccess(total);

            // 2. Create Order in Backend
            const response = await fetch(`${API_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    total: total,
                    items: cart,
                    paymentId: currentPaymentId
                })
            });

            if (response.ok) {
                // Clear cart locally
                cart = [];
                saveCart();
                updateCart();
            }
        }
    } catch (e) {
        console.error('Payment status check failed:', e);
    }
}

async function initiatePayment() {
    if (!currentUser) return null;
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    try {
        const res = await fetch(`${API_URL}/payments/initiate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ amount: total })
        });
        const data = await res.json();
        currentPaymentId = data.paymentId;
        return currentPaymentId;
    } catch (e) {
        console.error('Payment initiation failed', e);
        return null;
    }
}

async function completePayment() {
    if (!currentPaymentId) {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        try {
            const res = await fetch(`${API_URL}/payments/initiate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ amount: total })
            });
            const data = await res.json();
            currentPaymentId = data.paymentId;
        } catch (e) {
            console.error('Failed to initiate payment for modal:', e);
            return;
        }
    }

    // Verify status via manual trigger (User clicked "I've made the payment")
    try {
        // First mark it as success (Simulating the static QR flow)
        await fetch(`${API_URL}/payments/success/${currentPaymentId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        // Then check status to trigger order creation
        await checkPaymentStatus();
    } catch (e) {
        console.error('Payment completion failed:', e);
    }
}

function showPaymentSuccess(total) {
    document.getElementById('paymentProcess').style.display = 'none';
    const paymentSuccess = document.getElementById('paymentSuccess');

    paymentSuccess.innerHTML = `
    <div class="payment-done">
      <h3>Payment Successful!</h3>
      <p>Thank you for your order.</p>
      <div class="order-summary">
        <div class="summary-item">
            <span>Total Paid:</span>
            <strong>₹${total.toFixed()}</strong>
        </div>
        <div class="summary-item">
            <span>Address:</span>
            <strong>${currentUser.address}</strong>
        </div>
      </div>
      <button class="close-payment" onclick="closePayment()">Back to Shopping</button>
    </div>
  `;
    paymentSuccess.style.display = 'block';
}

function closePayment() {
    document.getElementById('paymentModal').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
    clearInterval(paymentTimer);
    if (document.getElementById('paymentSuccess').style.display === 'block') {
        cart = [];
        saveCart();
        updateCart();
        ordersLoaded = false; // Force reload orders next time profile is opened
        toggleCart();
        // Reset modal content for next time
        setTimeout(() => location.reload(), 500); // Reload to reset state nicely
    }
}

// Filter products
function filterCategory(category) {
    currentFilter = category;
    applyFilters();

    const buttons = document.querySelectorAll('.filters button');
    buttons.forEach(button => {
        const onClickAttr = button.getAttribute('onclick');
        if (onClickAttr && onClickAttr.includes(`'${category}'`)) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

function searchProducts() {
    currentSearch = document.getElementById('searchBar').value.toLowerCase();
    applyFilters();
}

function applyFilters() {
    const products = document.querySelectorAll('.product-card');
    let hasResults = false;

    products.forEach(product => {
        const name = product.dataset.name.toLowerCase();
        // Logic: check if classList contains category OR category is all
        // Note: product.category was added as a class in renderProducts
        const categoryMatch = currentFilter === 'all' || product.classList.contains(currentFilter);
        const searchMatch = name.includes(currentSearch);

        if (categoryMatch && searchMatch) {
            product.style.display = 'flex';
            hasResults = true;
        } else {
            product.style.display = 'none';
        }
    });

    const productGrid = document.getElementById('productGrid');
    // Handle no results message manually if needed
}
