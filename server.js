require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const { google } = require('googleapis');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data', 'events.json');

// Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `http://localhost:${PORT}/auth/google/callback`
);

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || crypto.randomUUID(),
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false, // 本番では true に変更
        maxAge: 24 * 60 * 60 * 1000 // 24時間
    }
}));
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
  const { title, description, dates, timeStart, timeEnd } = req.body;

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
  const { name, slots } = req.body;

  if (!name || !slots) {
    return res.status(400).json({ error: '名前と選択スロットは必須です' });
  }

  const data = readData();
  const event = data.events[req.params.id];

  if (!event) {
    return res.status(404).json({ error: 'イベントが見つかりません' });
  }

  // Remove existing response from same name
  event.responses = event.responses.filter(r => r.name !== name);

  event.responses.push({
    name,
    slots,
    respondedAt: new Date().toISOString()
  });

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

// ─── Google OAuth2 認証 ───

// OAuth開始: Google同意画面へリダイレクト
app.get('/auth/google', (req, res) => {
  const csrfToken = crypto.randomUUID();
  const returnTo = req.query.returnTo || '/';
  req.session.oauthState = csrfToken;
  req.session.oauthReturnTo = returnTo;

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: csrfToken,
    prompt: 'consent'
  });

  res.redirect(authUrl);
});

// OAuthコールバック
app.get('/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;

  // CSRF検証
  if (!state || state !== req.session.oauthState) {
    return res.status(403).send('Invalid state parameter');
  }
  delete req.session.oauthState;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    req.session.googleTokens = tokens;

    const returnTo = req.session.oauthReturnTo || '/';
    delete req.session.oauthReturnTo;

    // フロントエンドのハッシュルートにリダイレクト
    res.redirect(`/#${returnTo}`);
  } catch (err) {
    console.error('OAuth token exchange error:', err.message);
    res.status(500).send('認証に失敗しました');
  }
});

// 連携状態を確認
app.get('/api/google/status', (req, res) => {
  res.json({ connected: !!req.session.googleTokens });
});

// 連携解除
app.post('/api/google/disconnect', async (req, res) => {
  if (req.session.googleTokens) {
    try {
      await oauth2Client.revokeToken(req.session.googleTokens.access_token);
    } catch {
      // トークン無効化失敗は無視（期限切れ等）
    }
    delete req.session.googleTokens;
  }
  res.json({ success: true });
});

// セッションからOAuth2クライアントを生成するヘルパー
function getAuthenticatedClient(session) {
  if (!session.googleTokens) return null;
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `http://localhost:${PORT}/auth/google/callback`
  );
  client.setCredentials(session.googleTokens);
  return client;
}

// カレンダー一覧を取得
app.get('/api/google/calendars', async (req, res) => {
  const authClient = getAuthenticatedClient(req.session);
  if (!authClient) {
    return res.status(401).json({ error: '未認証です。Googleカレンダーと連携してください。' });
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth: authClient });
    const response = await calendar.calendarList.list();

    const calendars = response.data.items.map(cal => ({
      id: cal.id,
      summary: cal.summary,
      backgroundColor: cal.backgroundColor,
      primary: cal.primary || false
    }));

    res.json({ calendars });
  } catch (err) {
    console.error('Calendar list error:', err.message);
    if (err.code === 401) {
      delete req.session.googleTokens;
      return res.status(401).json({ error: 'トークンが期限切れです。再度連携してください。' });
    }
    res.status(500).json({ error: 'カレンダー一覧の取得に失敗しました' });
  }
});

// 選択カレンダーの予定スロットを取得
app.post('/api/google/busy-slots', async (req, res) => {
  const authClient = getAuthenticatedClient(req.session);
  if (!authClient) {
    return res.status(401).json({ error: '未認証です' });
  }

  const { calendarIds, dates, timeStart, timeEnd } = req.body;
  if (!calendarIds || !calendarIds.length || !dates || !dates.length) {
    return res.status(400).json({ error: 'calendarIds と dates は必須です' });
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth: authClient });
    const busySlotsSet = new Set();
    const start = timeStart || '09:00';
    const end = timeEnd || '21:00';

    // 各カレンダーの各日付のイベントを取得
    for (const calId of calendarIds) {
      for (const dateStr of dates) {
        const timeMin = new Date(`${dateStr}T${start}:00`).toISOString();
        const timeMax = new Date(`${dateStr}T${end}:00`).toISOString();

        const eventsRes = await calendar.events.list({
          calendarId: calId,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: 'startTime'
        });

        for (const event of eventsRes.data.items || []) {
          // 終日イベントは dateStr 全体をブロック
          if (event.start.date) {
            const [startH, startM] = start.split(':').map(Number);
            const [endH, endM] = end.split(':').map(Number);
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            for (let m = startMinutes; m < endMinutes; m += 30) {
              const h = Math.floor(m / 60);
              const min = m % 60;
              const slotTime = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
              busySlotsSet.add(`${dateStr}_${slotTime}`);
            }
            continue;
          }

          // 時刻指定イベント: イベント時間とスロットの重なりを判定
          const eventStart = new Date(event.start.dateTime);
          const eventEnd = new Date(event.end.dateTime);

          const [startH, startM] = start.split(':').map(Number);
          const [endH, endM] = end.split(':').map(Number);
          const rangeStart = startH * 60 + startM;
          const rangeEnd = endH * 60 + endM;

          for (let m = rangeStart; m < rangeEnd; m += 30) {
            const slotStart = new Date(`${dateStr}T${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`);
            const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

            // スロットとイベントが重なるか判定
            if (slotStart < eventEnd && slotEnd > eventStart) {
              const h = Math.floor(m / 60);
              const min = m % 60;
              const slotTime = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
              busySlotsSet.add(`${dateStr}_${slotTime}`);
            }
          }
        }
      }
    }

    res.json({ busySlots: Array.from(busySlotsSet) });
  } catch (err) {
    console.error('Busy slots error:', err.message);
    if (err.code === 401) {
      delete req.session.googleTokens;
      return res.status(401).json({ error: 'トークンが期限切れです。再度連携してください。' });
    }
    res.status(500).json({ error: '予定の取得に失敗しました' });
  }
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
