const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'shop.db'));

db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    address TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Products table
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    image TEXT,
    category TEXT,
    description TEXT,
    stock INTEGER DEFAULT 50,
    sizes TEXT DEFAULT 'S,M,L,XL,XXL'
  )`);

  // Orders table
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total REAL NOT NULL,
    items TEXT NOT NULL,
    status TEXT DEFAULT 'Processing',
    payment_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Payments table
  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Safe ALTER TABLE (ignore errors if columns already exist)
  db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'", () => {});
  db.run("ALTER TABLE orders ADD COLUMN payment_id TEXT", () => {});
  db.run("ALTER TABLE products ADD COLUMN sizes TEXT DEFAULT 'S,M,L,XL,XXL'", () => {});

  // Trigger: first registered user becomes admin
  db.run(`CREATE TRIGGER IF NOT EXISTS make_first_user_admin
    AFTER INSERT ON users
    WHEN (SELECT COUNT(*) FROM users) = 1
    BEGIN
      UPDATE users SET role = 'admin' WHERE id = NEW.id;
    END;`);

  // Ensure existing first user is admin
  db.run("UPDATE users SET role = 'admin' WHERE id = (SELECT MIN(id) FROM users)");
});

// Seed products only if table is empty
db.get("SELECT count(*) as count FROM products", (err, row) => {
  if (err || !row || row.count > 0) return;

  const products = [
    ['REAL MADRID | THE DECIMA', 500, 'hd_real_madrid.png', 'home', 'The legendary white jersey of the King of Europe. Pure perfection for the ultimate Madridista.'],
    ['MANCHESTER UNITED | GLORY DAYS', 500, 'hd_man_united.png', 'home', 'The iconic #7 Red Devils kit. Relive the explosive dribbles and thunderous long shots of Old Trafford.'],
    ['AL NASSR | DESERT KNIGHT', 500, 'hd_al_nassr.png', 'home', 'The yellow and blue armor of the Knight of Najd. Conquering new frontiers in Riyadh.'],
    ['PORTUGAL | NATIONAL PRIDE', 650, 'hd_portugal.png', 'international', "Wear the heart of Portugal. The captain's choice for international dominance."],
    ['SPORTING CP | THE ORIGIN', 500, 'cp.jpg', 'home', 'Where it all began. A tribute to the 2003 masterpiece that caught the world\'s attention.'],
    ['JUVENTUS | THE BIANCONERI', 500, 'juventes 2019.webp', 'home', 'Italian elegance meets power. The #7 legacy continues in Turin.'],
    ['PORTUGAL | AWAY ARMOR', 600, 'Portugal 2025 away.jpg', 'international', 'Sleek, sharp, and unstoppable. The elite choice for away conquests.'],
    ['AL NASSR | AWAY SHADOW', 550, 'al nassr away.jpg', 'home', 'The dark knight kit of Riyadh. Perfection in every shadow.'],
    ['ALL CLUB | LEGACY PACK', 2500, 'all club jersey.jpg', 'club', "The ultimate collector's bundle. Every piece of history in one elite package."]
  ];

  const stmt = db.prepare("INSERT INTO products (name, price, image, category, description) VALUES (?, ?, ?, ?, ?)");
  products.forEach(p => stmt.run(p));
  stmt.finalize();
  console.log('✅ Products seeded successfully.');
});

module.exports = db;
