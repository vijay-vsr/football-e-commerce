# 🏆 VeePoo19 Elite Jersey Shop

A full-stack football jersey e-commerce website with Node.js backend + SQLite database.

---

## 🚀 HOW TO RUN (Step by Step)

### 1. Install Node.js (if not already installed)
Download from: https://nodejs.org  
Choose the **LTS version** and install it.

### 2. Open your project folder
Open **Command Prompt** (Windows) or **Terminal** (Mac) inside this folder.

### 3. Install dependencies
```
npm install
```

### 4. Start the server
```
npm start
```

### 5. Open your website
Open your browser and go to:
```
http://localhost:3000
```

---

## 👑 ADMIN PANEL (Owner Dashboard)

**The FIRST person who registers on the website becomes the Admin automatically.**

To access the admin dashboard:
1. Register/Login with your email
2. Click your profile icon (top right)
3. Click **"👑 Owner Dashboard"**

From the dashboard you can:
- ✅ View all customers
- ✅ View and manage all orders
- ✅ Update order status (Processing → Shipped → Delivered)
- ✅ Add new jersey products
- ✅ Delete customers

---

## 📁 Project Structure

```
VeePoo19_Complete/
├── server.js          ← Main backend (Node.js + Express)
├── database.js        ← Database setup (SQLite)
├── shop.db            ← Auto-created database file
├── package.json       ← Project dependencies
└── public/            ← All frontend files
    ├── index.html     ← Main shop page
    ├── product.html   ← Product detail page
    ├── checkout.html  ← Checkout page
    ├── script.js      ← Frontend JavaScript
    ├── styles.css     ← All styling
    └── *.jpg/*.png    ← Jersey images
```

---

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/register | Register new user |
| POST | /api/login | Login |
| GET | /api/products | Get all products |
| GET | /api/products/:id | Get single product |
| POST | /api/orders | Place an order |
| GET | /api/orders | Get my orders |
| POST | /api/payments/initiate | Start payment |
| POST | /api/payments/success/:id | Confirm payment |
| POST | /api/user/update | Update address/phone |
| GET | /api/admin/users | [Admin] All users |
| GET | /api/admin/orders | [Admin] All orders |
| POST | /api/admin/products | [Admin] Add product |
| DELETE | /api/admin/products/:id | [Admin] Delete product |

---

## 💡 Payment Flow

This shop uses a **QR code / UPI payment** system:
1. Customer adds items to cart and proceeds to checkout
2. A QR code is shown — customer pays via GPay/PhonePe/Paytm
3. Customer clicks **"I've Made the Payment"**
4. Order is saved with status "Processing"
5. Admin updates status to Shipped/Delivered from the dashboard

---

## 📞 Contact
Phone: +91 9994385640  
Email: vgvijay2007vsr@gmail.com
