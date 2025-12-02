// JavaScript
/**
 * Inventory Mock API Server
 * - GET /api/inventory/search
 * - GET /api/inventory/availability/peak
 *
 * How to run (Windows):
 * 1) Ensure Node.js is installed (https://nodejs.org/)
 * 2) In this folder, run: npm install
 * 3) Start the server: npm start
 * 4) Default URL: http://localhost:3001/api
 *
 * Environment variables (optional, via .env or system env):
 * - PORT=3001
 * - API_BASE=/api
 * - SIMULATED_DELAY_MS=300        // artificial latency per request
 * - FAILURE_RATE=0                // 0..1 probability to return isFailed=true
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const API_BASE = process.env.API_BASE || '/api';
const SIMULATED_DELAY_MS = parseInt(process.env.SIMULATED_DELAY_MS || '300', 10);
const FAILURE_RATE = Math.min(Math.max(parseFloat(process.env.FAILURE_RATE || '0'), 0), 1);

const app = express();
app.use(cors());
app.use(express.json());

// Utility: sleep
const sleep = ms => new Promise(res => setTimeout(res, ms));

// --- Seed data generation ---
const BRANCHES = ['SEA', 'PDX', 'SFO', 'LAX', 'DEN', 'PHX', 'DAL', 'ORD', 'ATL', 'JFK'];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomPick(arr) {
  return arr[randomInt(0, arr.length - 1)];
}
function randFrom(list) {
  return list[randomInt(0, list.length - 1)];
}

// Some sample nouns and adjectives to build descriptions
const ADJECTIVES = ['Premium', 'Standard', 'Heavy-Duty', 'Lightweight', 'Compact', 'Industrial', 'Economy'];
const NOUNS = ['Bearing', 'Valve', 'Coupling', 'Gasket', 'Clamp', 'Fitting', 'Seal', 'Adapter', 'Pump', 'Filter'];
const UOMS = ['EA', 'BX', 'PK', 'RL', 'FT', 'LB'];

function makePartNumber(i) {
  const prefix = ['AB', 'ZX', 'LM', 'QP', 'RT'][i % 5];
  return `${prefix}-${String(1000 + i)}`;
}
function makeSupplierSKU(i) {
  const s = ['SUP', 'VND', 'OEM'][i % 3];
  return `${s}${String(50000 + i)}`;
}
function makeDescription(i) {
  return `${randFrom(ADJECTIVES)} ${randFrom(NOUNS)} ${i}`;
}

function maybeLots(total) {
  // 40% chance of lot details
  if (Math.random() < 0.6) return undefined;
  const lotCount = randomInt(1, 3);
  const lots = [];
  let remaining = total;
  for (let i = 0; i < lotCount; i++) {
    const qty = i === lotCount - 1 ? remaining : randomInt(1, Math.max(1, remaining - (lotCount - i - 1)));
    remaining -= qty;
    const exp = Math.random() < 0.5 ? null : new Date(Date.now() + randomInt(10, 400) * 24 * 60 * 60 * 1000).toISOString();
    lots.push({
      lotNumber: `LOT-${randomInt(10000, 99999)}`,
      qty,
      expirationDate: exp
    });
    if (remaining <= 0) break;
  }
  return lots;
}

function seedData(count = 400) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const branch = randomPick(BRANCHES);
    const availableQty = randomInt(0, 500);
    const leadTimeDays = Math.random() < 0.2 ? null : randomInt(1, 42);
    const lastPurchaseDate = Math.random() < 0.3 ? null : new Date(Date.now() - randomInt(10, 1000) * 24 * 60 * 60 * 1000).toISOString();
    items.push({
      partNumber: makePartNumber(i),
      supplierSku: makeSupplierSKU(i),
      description: makeDescription(i),
      branch,
      availableQty,
      uom: randFrom(UOMS),
      leadTimeDays,
      lastPurchaseDate,
      lots: maybeLots(availableQty)
    });
  }
  return items;
}

const DATA = seedData();

// --- Helpers for API ---
const allowedSortFields = new Set([
  'partNumber',
  'supplierSku',
  'description',
  'branch',
  'availableQty',
  'uom',
  'leadTimeDays',
  'lastPurchaseDate'
]);

function applyCriteriaFilter(rows, criteria, by) {
  if (!criteria || !by) return rows;
  const c = String(criteria).toLowerCase();
  switch (by) {
    case 'PartNumber':
      return rows.filter(r => r.partNumber.toLowerCase().includes(c));
    case 'Description':
      return rows.filter(r => r.description.toLowerCase().includes(c));
    case 'SupplierSKU':
      return rows.filter(r => String(r.supplierSku || '').toLowerCase().includes(c));
    default:
      return rows;
  }
}

function applyBranchesFilter(rows, branchesCsv) {
  if (!branchesCsv) return rows;
  const set = new Set(
    String(branchesCsv)
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
  );
  if (!set.size) return rows;
  return rows.filter(r => set.has(String(r.branch || '').toUpperCase()));
}

function applyOnlyAvailableFilter(rows, onlyAvailable) {
  if (!onlyAvailable) return rows;
  return rows.filter(r => Number(r.availableQty) > 0);
}

function applySort(rows, sortParam) {
  if (!sortParam) return rows;
  const [field, dirRaw] = String(sortParam).split(':');
  const fieldName = field && allowedSortFields.has(field) ? field : null;
  const dir = String(dirRaw || 'asc').toLowerCase() === 'desc' ? -1 : 1;
  if (!fieldName) return rows;

  const sorted = [...rows].sort((a, b) => {
    const av = a[fieldName];
    const bv = b[fieldName];
    // Handle null/undefined consistently
    if (av == null && bv == null) return 0;
    if (av == null) return -1 * dir;
    if (bv == null) return 1 * dir;
    // Dates are strings here; compare as strings (ISO-safe)
    if (typeof av === 'string' && typeof bv === 'string') {
      return av.localeCompare(bv) * dir;
    }
    if (typeof av === 'number' && typeof bv === 'number') {
      return (av - bv) * dir;
    }
    // Fallback to string compare
    return String(av).localeCompare(String(bv)) * dir;
  });

  return sorted;
}

function paginate(rows, page, size) {
  const p = Math.max(0, parseInt(page || '0', 10));
  const s = Math.max(1, Math.min(500, parseInt(size || '20', 10)));
  const start = p * s;
  const end = start + s;
  return { page: p, size: s, total: rows.length, slice: rows.slice(start, end) };
}

function envelopeOk(data) {
  return { isFailed: false, data };
}
function envelopeFail(message) {
  return { isFailed: true, message: message || 'Request failed' };
}

// --- Routes ---
// Health check
app.get(`${API_BASE}/health`, (_req, res) => {
  res.json({ ok: true, items: DATA.length });
});

// Inventory search
app.get(`${API_BASE}/inventory/search`, async (req, res) => {
  // Simulate latency
  if (SIMULATED_DELAY_MS > 0) await sleep(SIMULATED_DELAY_MS);

  // Optional: forced failure
  if (String(req.query.fail || '').toLowerCase() === 'true') {
    return res.json(envelopeFail('Forced failure by query parameter.'));
  }

  // Random failure by probability
  if (FAILURE_RATE > 0 && Math.random() < FAILURE_RATE) {
    return res.json(envelopeFail('Simulated intermittent error.'));
  }

  const {
    criteria = '',
    by = 'PartNumber',
    branches = '',
    onlyAvailable = 'false',
    page = '0',
    size = '20',
    sort = ''
  } = req.query;

  let rows = DATA;

  rows = applyCriteriaFilter(rows, criteria, by);
  rows = applyBranchesFilter(rows, branches);
  rows = applyOnlyAvailableFilter(rows, String(onlyAvailable).toLowerCase() === 'true');
  rows = applySort(rows, sort);

  // Shape response items to match contract (do not expose supplierSku)
  const shaped = rows.map(r => ({
    partNumber: r.partNumber,
	supplierSku: r.supplierSku,
    description: r.description,
    branch: r.branch,
    availableQty: r.availableQty,
    uom: r.uom,
    leadTimeDays: r.leadTimeDays,
    lastPurchaseDate: r.lastPurchaseDate,
    lots: r.lots
  }));

  const { total, slice } = paginate(shaped, page, size);

  res.json(
    envelopeOk({
      total,
      items: slice
    })
  );
});

// Peak availability
app.get(`${API_BASE}/inventory/availability/peak`, async (req, res) => {
  if (SIMULATED_DELAY_MS > 0) await sleep(SIMULATED_DELAY_MS);

  const partNumber = String(req.query.partNumber || '').trim();
  if (!partNumber) {
    return res.json(envelopeFail('partNumber is required'));
  }

  const rows = DATA.filter(r => r.partNumber.toLowerCase() === partNumber.toLowerCase());
  if (rows.length === 0) {
    // For convenience, treat not found as zero availability rather than a failure
    return res.json(
      envelopeOk({
        partNumber,
        totalAvailable: 0,
        branches: []
      })
    );
  }

  const byBranch = new Map();
  for (const r of rows) {
    const qty = Number(r.availableQty) || 0;
    byBranch.set(r.branch, (byBranch.get(r.branch) || 0) + qty);
  }

  const branches = Array.from(byBranch.entries()).map(([branch, qty]) => ({ branch, qty }));
  const totalAvailable = branches.reduce((sum, b) => sum + b.qty, 0);

  res.json(
    envelopeOk({
      partNumber,
      totalAvailable,
      branches
    })
  );
});

// Start server
app.listen(PORT, () => {
  console.log(`Inventory mock API running on http://localhost:${PORT}${API_BASE}`);
  console.log(`Health: http://localhost:${PORT}${API_BASE}/health`);
});
