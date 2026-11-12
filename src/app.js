const express = require('express');
const { connect } = require('./db');
const { Risk, Counter } = require('./models');
const { exampleRisks } = require('./examples');

const app = express();
app.use(express.json({ limit: '100kb' }));

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const FIELDS = ['title', 'desc', 'cat', 'l', 'i', 'mit', 'owner', 'review', 'status'];

function pick(body) {
  const out = {};
  FIELDS.forEach((k) => {
    if (body && body[k] !== undefined) out[k] = typeof body[k] === 'string' ? body[k].trim() : body[k];
  });
  return out;
}

function shape(r) {
  return { id: r.code, title: r.title, desc: r.desc || '', cat: r.cat, l: r.l, i: r.i, mit: r.mit, owner: r.owner, review: r.review, status: r.status, example: !!r.example };
}

function dayString(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : new Date().toISOString().slice(0, 10);
}

async function nextCode() {
  const c = await Counter.findOneAndUpdate({ _id: 'risk' }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return 'R-' + String(c.seq).padStart(2, '0');
}

async function insertExamples(today) {
  const docs = [];
  for (const e of exampleRisks(today)) docs.push({ ...e, code: await nextCode(), example: true });
  await Risk.insertMany(docs);
}

// The first time the app opens on an empty database, load the example risks once.
async function ensureSeeded(today) {
  const previous = await Counter.findOneAndUpdate({ _id: 'seeded' }, { $setOnInsert: { seq: 1 } }, { upsert: true, new: false });
  if (!previous) await insertExamples(today);
}

async function allRisks() {
  const rows = await Risk.find().sort({ _id: 1 });
  return rows.map(shape);
}

app.get('/api/health', wrap(async (req, res) => {
  await connect();
  res.json({ ok: true });
}));

app.get('/api/risks', wrap(async (req, res) => {
  await connect();
  await ensureSeeded(dayString(req.query.today));
  res.json({ risks: await allRisks() });
}));

app.post('/api/risks', wrap(async (req, res) => {
  await connect();
  const risk = await Risk.create({ ...pick(req.body), code: await nextCode() });
  res.status(201).json({ risk: shape(risk) });
}));

app.put('/api/risks/:id', wrap(async (req, res) => {
  await connect();
  const changes = pick(req.body);
  changes.example = false;
  const risk = await Risk.findOneAndUpdate({ code: req.params.id }, { $set: changes }, { new: true, runValidators: true });
  if (!risk) return res.status(404).json({ error: 'Risk not found.' });
  res.json({ risk: shape(risk) });
}));

app.delete('/api/risks', wrap(async (req, res) => {
  await connect();
  if (req.query.examples !== 'true') return res.status(400).json({ error: 'Use DELETE /api/risks/:id to delete one risk.' });
  await Risk.deleteMany({ example: true });
  res.json({ risks: await allRisks() });
}));

app.delete('/api/risks/:id', wrap(async (req, res) => {
  await connect();
  const gone = await Risk.findOneAndDelete({ code: req.params.id });
  if (!gone) return res.status(404).json({ error: 'Risk not found.' });
  res.json({ ok: true });
}));

app.post('/api/seed', wrap(async (req, res) => {
  await connect();
  await insertExamples(dayString(req.body && req.body.today));
  res.json({ risks: await allRisks() });
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: Object.values(err.errors).map((e) => e.message).join(' ') });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
  console.error(err.message);
  res.status(500).json({ error: err.message || 'Server error.' });
});

module.exports = app;
