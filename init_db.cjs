const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'sqlite_v2.db');
const db = new Database(dbPath);

console.log('Initializing database at:', dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    google_id TEXT UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'customer',
    address TEXT,
    points INTEGER NOT NULL DEFAULT 0,
    interests TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price TEXT NOT NULL,
    image_url TEXT,
    category TEXT NOT NULL,
    specs TEXT,
    tags TEXT,
    rating TEXT,
    reviews INTEGER,
    is_top INTEGER DEFAULT 0,
    is_available INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    delivery_address TEXT NOT NULL,
    subtotal TEXT NOT NULL,
    delivery_fee TEXT NOT NULL,
    tax TEXT NOT NULL,
    tip TEXT NOT NULL,
    total TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'card',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    transaction_id TEXT,
    rider_id INTEGER REFERENCES users(id),
    rider_lat REAL,
    rider_lng REAL,
    customer_lat REAL,
    customer_lng REAL,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    menu_item_id INTEGER REFERENCES menu_items(id),
    name TEXT NOT NULL,
    price TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    extras TEXT,
    special_instructions TEXT
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

console.log('Database initialized successfully.');
db.close();
