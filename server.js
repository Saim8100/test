// server.js
// Express + MySQL CRUD API (with CORS). Also serves the frontend from ./public.

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const STATUSES = ['pending', 'in_progress', 'done'];

// ---------- Middleware ----------
app.use(cors()); // allow requests from any origin (restrict this in production)
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- MySQL connection pool ----------
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'crud_user',
  password: process.env.DB_PASSWORD || 'crud_pass',
  database: process.env.DB_NAME || 'crud_db',
  waitForConnections: true,
  connectionLimit: 10,
});

// Create the table on startup. Retries because MySQL can take a while to boot.
async function initDb(retries = 30) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          status ENUM('pending', 'in_progress', 'done') NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('Database ready.');
      return;
    } catch (err) {
      console.log(`Waiting for database (${attempt}/${retries}): ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  console.error('Could not connect to the database. Exiting.');
  process.exit(1);
}

// ---------- Helpers ----------
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'Invalid task id.' });
    return null;
  }
  return id;
}

function validateTask(body = {}) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const status = body.status || 'pending';

  if (!title) return { error: 'Title is required.' };
  if (title.length > 255) return { error: 'Title must be 255 characters or fewer.' };
  if (!STATUSES.includes(status)) {
    return { error: `Status must be one of: ${STATUSES.join(', ')}.` };
  }
  return { value: { title, description, status } };
}

async function findTask(id) {
  const [rows] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [id]);
  return rows[0] || null;
}

// ---------- Routes (CRUD) ----------

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// READ all
app.get('/api/tasks', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC, id DESC');
  res.json(rows);
}));

// READ one
app.get('/api/tasks/:id', asyncHandler(async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const task = await findTask(id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });
  res.json(task);
}));

// CREATE
app.post('/api/tasks', asyncHandler(async (req, res) => {
  const { error, value } = validateTask(req.body);
  if (error) return res.status(400).json({ error });

  const [result] = await pool.execute(
    'INSERT INTO tasks (title, description, status) VALUES (?, ?, ?)',
    [value.title, value.description, value.status]
  );
  res.status(201).json(await findTask(result.insertId));
}));

// UPDATE
app.put('/api/tasks/:id', asyncHandler(async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  if (!(await findTask(id))) return res.status(404).json({ error: 'Task not found.' });

  const { error, value } = validateTask(req.body);
  if (error) return res.status(400).json({ error });

  await pool.execute(
    'UPDATE tasks SET title = ?, description = ?, status = ? WHERE id = ?',
    [value.title, value.description, value.status, id]
  );
  res.json(await findTask(id));
}));

// DELETE
app.delete('/api/tasks/:id', asyncHandler(async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const [result] = await pool.execute('DELETE FROM tasks WHERE id = ?', [id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found.' });
  res.json({ message: 'Task deleted.', id });
}));

// ---------- Error handling ----------
app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found.' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

// ---------- Start ----------
initDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});
