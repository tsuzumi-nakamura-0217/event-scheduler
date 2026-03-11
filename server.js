if (!process.env.VERCEL) {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const supabase = require('./lib/supabase');

const app = express();
const PORT = 3001;
const IS_VERCEL = !!process.env.VERCEL;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Guard: Supabase が未初期化なら全 API を 503 で返す
app.use('/api', (req, res, next) => {
  if (!supabase) {
    return res.status(503).json({ error: 'データベースに接続できません。環境変数 SUPABASE_URL / SUPABASE_ANON_KEY を確認してください。' });
  }
  next();
});

// Helper: build event object from DB rows (matching original API shape)
function buildEvent(row, responses) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    dates: row.dates,
    timeStart: row.time_start,
    timeEnd: row.time_end,
    deadline: row.deadline,
    responses: (responses || []).map(r => ({
      name: r.name,
      slots: r.slots,
      comment: r.comment || '',
      respondedAt: r.responded_at
    })),
    createdAt: row.created_at
  };
}

// API: Create event
app.post('/api/events', async (req, res) => {
  try {
    const { title, description, dates, timeStart, timeEnd, deadline } = req.body;

    if (!title || !dates || !dates.length) {
      return res.status(400).json({ error: 'タイトルと候補日は必須です' });
    }

    const id = crypto.randomUUID().slice(0, 8);

    const { data, error } = await supabase.from('events').insert({
      id,
      title,
      description: description || '',
      dates: dates.sort(),
      time_start: timeStart || '09:00',
      time_end: timeEnd || '21:00',
      deadline: deadline || null
    }).select().single();

    if (error) throw error;

    const event = buildEvent(data, []);
    res.json({ id, event });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'イベントの作成に失敗しました' });
  }
});

// API: Get event
app.get('/api/events/:id', async (req, res) => {
  try {
    const { data: eventRow, error: eventError } = await supabase
      .from('events').select('*').eq('id', req.params.id).single();

    if (eventError || !eventRow) {
      return res.status(404).json({ error: 'イベントが見つかりません' });
    }

    const { data: responses } = await supabase
      .from('responses').select('*').eq('event_id', req.params.id)
      .order('responded_at', { ascending: true });

    res.json(buildEvent(eventRow, responses || []));
  } catch (err) {
    console.error('Get event error:', err);
    res.status(500).json({ error: 'イベントの取得に失敗しました' });
  }
});

// API: Submit response
app.post('/api/events/:id/respond', async (req, res) => {
  try {
    const { name, slots, comment } = req.body;

    if (!name || !slots) {
      return res.status(400).json({ error: '名前と選択スロットは必須です' });
    }

    // Fetch event to check existence and deadline
    const { data: eventRow, error: eventError } = await supabase
      .from('events').select('*').eq('id', req.params.id).single();

    if (eventError || !eventRow) {
      return res.status(404).json({ error: 'イベントが見つかりません' });
    }

    if (eventRow.deadline) {
      const d = new Date(eventRow.deadline);
      if (d < new Date()) {
        return res.status(403).json({ error: '回答の締め切りを過ぎています' });
      }
    }

    // Upsert response (UNIQUE(event_id, name) constraint handles update)
    const { error: upsertError } = await supabase.from('responses').upsert({
      event_id: req.params.id,
      name,
      slots,
      comment: comment || '',
      responded_at: new Date().toISOString()
    }, { onConflict: 'event_id,name' });

    if (upsertError) throw upsertError;

    // Re-fetch all responses to return updated event
    const { data: responses } = await supabase
      .from('responses').select('*').eq('event_id', req.params.id)
      .order('responded_at', { ascending: true });

    const event = buildEvent(eventRow, responses || []);
    res.json({ success: true, event });
  } catch (err) {
    console.error('Submit response error:', err);
    res.status(500).json({ error: '回答の送信に失敗しました' });
  }
});

// API: Delete a response
app.delete('/api/events/:id/respond/:name', async (req, res) => {
  try {
    const { data: eventRow, error: eventError } = await supabase
      .from('events').select('*').eq('id', req.params.id).single();

    if (eventError || !eventRow) {
      return res.status(404).json({ error: 'イベントが見つかりません' });
    }

    const name = decodeURIComponent(req.params.name);

    const { data: deleted, error: deleteError } = await supabase
      .from('responses').delete()
      .eq('event_id', req.params.id).eq('name', name)
      .select();

    if (deleteError) throw deleteError;

    if (!deleted || deleted.length === 0) {
      return res.status(404).json({ error: '該当する回答が見つかりません' });
    }

    // Re-fetch remaining responses
    const { data: responses } = await supabase
      .from('responses').select('*').eq('event_id', req.params.id)
      .order('responded_at', { ascending: true });

    const event = buildEvent(eventRow, responses || []);
    res.json({ success: true, event });
  } catch (err) {
    console.error('Delete response error:', err);
    res.status(500).json({ error: '回答の削除に失敗しました' });
  }
});

// API: Get results
app.get('/api/events/:id/results', async (req, res) => {
  try {
    const { data: eventRow, error: eventError } = await supabase
      .from('events').select('*').eq('id', req.params.id).single();

    if (eventError || !eventRow) {
      return res.status(404).json({ error: 'イベントが見つかりません' });
    }

    const { data: responses } = await supabase
      .from('responses').select('*').eq('event_id', req.params.id)
      .order('responded_at', { ascending: true });

    const event = buildEvent(eventRow, responses || []);

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
  } catch (err) {
    console.error('Get results error:', err);
    res.status(500).json({ error: '結果の取得に失敗しました' });
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

// Export for Vercel serverless function
module.exports = app;

// Only listen when running locally
if (!IS_VERCEL) {
  app.listen(PORT, () => {
    console.log(`🗓️  日程調整アプリが起動しました: http://localhost:${PORT}`);
  });
}
