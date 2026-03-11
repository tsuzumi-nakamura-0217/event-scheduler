let app;
try {
  app = require('../server');
} catch (err) {
  // server.js の初期化に失敗した場合でもレスポンスを返せるようにする
  const express = require('express');
  app = express();
  app.use((req, res) => {
    res.status(500).json({ error: 'サーバー初期化エラー', detail: err.message });
  });
}

module.exports = app;
