const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data', 'events.json');

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Initialize data file
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ events: {} }, null, 2));
}

// Helper: read/write data
function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return { events: {} };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// API: Create event
app.post('/api/events', (req, res) => {
  const { title, description, dates, timeStart, timeEnd, deadline } = req.body;

  if (!title || !dates || !dates.length) {
    return res.status(400).json({ error: 'タイトルと候補日は必須です' });
  }

  const id = crypto.randomUUID().slice(0, 8);
  const event = {
    id,
    title,
    description: description || '',
    dates: dates.sort(),
    timeStart: timeStart || '09:00',
    timeEnd: timeEnd || '21:00',
    deadline: deadline || null,
    responses: [],
    createdAt: new Date().toISOString()
  };

  const data = readData();
  data.events[id] = event;
  writeData(data);

  res.json({ id, event });
});

// API: Get event
app.get('/api/events/:id', (req, res) => {
  const data = readData();
  const event = data.events[req.params.id];

  if (!event) {
    return res.status(404).json({ error: 'イベントが見つかりません' });
  }

  res.json(event);
});

// API: Submit response
app.post('/api/events/:id/respond', (req, res) => {
  const { name, slots, comment } = req.body;

  if (!name || !slots) {
    return res.status(400).json({ error: '名前と選択スロットは必須です' });
  }

  const data = readData();
  const event = data.events[req.params.id];

  if (!event) {
    return res.status(404).json({ error: 'イベントが見つかりません' });
  }

  if (event.deadline) {
    const d = new Date(event.deadline);
    if (d < new Date()) {
      return res.status(403).json({ error: '回答の締め切りを過ぎています' });
    }
  }

  // Remove existing response from same name
  event.responses = event.responses.filter(r => r.name !== name);

  event.responses.push({
    name,
    slots,
    comment: comment || '',
    respondedAt: new Date().toISOString()
  });

  writeData(data);
  res.json({ success: true, event });
});

// API: Delete a response
app.delete('/api/events/:id/respond/:name', (req, res) => {
  const data = readData();
  const event = data.events[req.params.id];

  if (!event) {
    return res.status(404).json({ error: 'イベントが見つかりません' });
  }

  const name = decodeURIComponent(req.params.name);
  const before = event.responses.length;
  event.responses = event.responses.filter(r => r.name !== name);

  if (event.responses.length === before) {
    return res.status(404).json({ error: '該当する回答が見つかりません' });
  }

  writeData(data);
  res.json({ success: true, event });
});

// API: Get results
app.get('/api/events/:id/results', (req, res) => {
  const data = readData();
  const event = data.events[req.params.id];

  if (!event) {
    return res.status(404).json({ error: 'イベントが見つかりません' });
  }

  // Aggregate slot counts
  const slotCounts = {};
  const slotRespondents = {};

  event.responses.forEach(response => {
    response.slots.forEach(slot => {
      slotCounts[slot] = (slotCounts[slot] || 0) + 1;
      if (!slotRespondents[slot]) slotRespondents[slot] = [];
      slotRespondents[slot].push(response.name);
    });
  });

  res.json({
    event,
    totalResponses: event.responses.length,
    slotCounts,
    slotRespondents
  });
});

// SPA fallback — serve index.html for any non-API GET request not matched by static
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`🗓️  日程調整アプリが起動しました: http://localhost:${PORT}`);
});
