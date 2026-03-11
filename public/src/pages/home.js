/**
 * Home Page — Event Creation
 */
window.HomePage = {
  selectedDates: [],
  calendar: null,

  render(container) {
    container.innerHTML = `
      <div class="animate-slide-up">
        <h1 class="page-title">日程調整をはじめる</h1>
        <p class="page-subtitle">候補日を選んでリンクを共有。みんなの空き時間がひと目でわかります。</p>

        <div class="steps">
          <div class="step step--active">
            <div class="step-number">1</div>
            <span>イベント作成</span>
          </div>
          <div class="step-connector"></div>
          <div class="step">
            <div class="step-number">2</div>
            <span>リンク共有</span>
          </div>
          <div class="step-connector"></div>
          <div class="step">
            <div class="step-number">3</div>
            <span>日程決定</span>
          </div>
        </div>

        <div class="card">
          <div class="form-group">
            <label class="form-label" for="event-title">イベント名</label>
            <input type="text" class="form-input" id="event-title" placeholder="例: チームミーティング" maxlength="100">
          </div>

          <div class="form-group">
            <label class="form-label" for="event-desc">説明（任意）</label>
            <textarea class="form-input" id="event-desc" placeholder="例: 来月の定例会議の日程を調整しましょう" rows="2"></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="time-start">開始時刻</label>
              <select class="form-input" id="time-start"></select>
            </div>
            <div class="form-group">
              <label class="form-label" for="time-end">終了時刻</label>
              <select class="form-input" id="time-end"></select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="event-deadline">入力締め切り（任意）</label>
            <div class="input-with-icon">
              <input type="text" class="form-input" id="event-deadline" placeholder="未設定（クリックして日時を選択）">
              <span class="input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">候補日を選択</label>
            <div id="calendar-container"></div>
          </div>

          <div id="selected-dates-display"></div>

          <div class="mt-xl">
            <button class="btn btn-primary btn-lg" id="create-event-btn" style="width: 100%;" disabled>
              イベントを作成する
            </button>
          </div>
        </div>

        <div id="share-result" style="display: none;"></div>
      </div>
    `;

    this.initTimeSelectors();
    this.initCalendar();
    this.initFlatpickr();
    this.attachListeners();
  },

  initTimeSelectors() {
    const startSelect = document.getElementById('time-start');
    const endSelect = document.getElementById('time-end');

    for (let h = 6; h <= 23; h++) {
      for (let m = 0; m < 60; m += 30) {
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        startSelect.innerHTML += `<option value="${time}" ${time === '09:00' ? 'selected' : ''}>${time}</option>`;
        endSelect.innerHTML += `<option value="${time}" ${time === '21:00' ? 'selected' : ''}>${time}</option>`;
      }
    }
  },

  initFlatpickr() {
    if (window.flatpickr) {
      flatpickr("#event-deadline", {
        enableTime: true,
        dateFormat: "Y-m-d\\TH:i",
        altInput: true,
        altFormat: "Y年m月d日 H:i",
        locale: "ja",
        minDate: "today",
        time_24hr: true,
        disableMobile: true,
        onReady: function (selectedDates, dateStr, instance) {
          const limitLength = (e) => {
            if (e.target.value.length > 2) {
              e.target.value = e.target.value.slice(0, 2);
            }
          };
          if (instance.hourElement) {
            instance.hourElement.maxLength = 2;
            instance.hourElement.addEventListener('input', limitLength);
          }
          if (instance.minuteElement) {
            instance.minuteElement.maxLength = 2;
            instance.minuteElement.addEventListener('input', limitLength);
          }
        }
      });
    }
  },

  initCalendar() {
    const calContainer = document.getElementById('calendar-container');
    this.calendar = new Calendar(calContainer, {
      onSelect: (dates) => {
        this.selectedDates = dates;
        this.updateSelectedDatesDisplay();
        this.updateCreateButton();
      }
    });
  },

  updateSelectedDatesDisplay() {
    const display = document.getElementById('selected-dates-display');
    if (this.selectedDates.length === 0) {
      display.innerHTML = '';
      return;
    }

    const chips = this.selectedDates.map(dateStr => {
      const date = new Date(dateStr + 'T00:00:00');
      const m = date.getMonth() + 1;
      const d = date.getDate();
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      const dayName = dayNames[date.getDay()];
      return `
        <span class="date-chip">
          ${m}/${d}(${dayName})
          <button class="date-chip-remove" data-date="${dateStr}" type="button">✕</button>
        </span>
      `;
    }).join('');

    display.innerHTML = `
      <div class="mt-md">
        <span class="form-label" style="display: inline;">選択中: ${this.selectedDates.length}日</span>
        <div class="selected-dates-list">${chips}</div>
      </div>
    `;

    // Remove button listeners
    display.querySelectorAll('.date-chip-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const dateStr = btn.dataset.date;
        this.calendar.toggleDate(dateStr);
      });
    });
  },

  updateCreateButton() {
    const btn = document.getElementById('create-event-btn');
    const title = document.getElementById('event-title').value.trim();
    btn.disabled = !title || this.selectedDates.length === 0;
  },

  attachListeners() {
    document.getElementById('event-title').addEventListener('input', () => this.updateCreateButton());
    document.getElementById('create-event-btn').addEventListener('click', () => this.createEvent());
  },

  async createEvent() {
    const btn = document.getElementById('create-event-btn');
    btn.disabled = true;
    btn.textContent = '作成中...';

    const title = document.getElementById('event-title').value.trim();
    const description = document.getElementById('event-desc').value.trim();
    const timeStart = document.getElementById('time-start').value;
    const timeEnd = document.getElementById('time-end').value;
    const deadline = document.getElementById('event-deadline').value;

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          dates: this.selectedDates,
          timeStart,
          timeEnd,
          deadline
        })
      });

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        throw new Error(`サーバーエラー: ${res.status} (Vercelの環境変数 Supabase URL/KEY が未設定の可能性があります)`);
      }

      if (res.ok) {
        this.showShareLink(data.id, title, deadline);
      } else {
        alert(data.error || 'バックエンドでエラーが発生しました');
      }
    } catch (err) {
      const msg = err.message === 'Failed to fetch' ? '通信エラーが発生しました。ネットワーク接続を確認してください。' : err.message;
      alert(msg);
    } finally {
      if (btn.textContent === '作成中...') {
        btn.disabled = false;
        btn.textContent = 'イベントを作成する';
      }
    }
  },

  showShareLink(eventId, title, deadline) {
    const shareUrl = `${window.location.origin}/#/event/${eventId}`;

    let formattedDeadline = '';
    if (deadline) {
      const [datePart, timePart] = deadline.split('T');
      if (datePart && timePart) {
        const [yyyy, mm, dd] = datePart.split('-');
        formattedDeadline = `${yyyy}年${mm}月${dd}日 ${timePart}`;
      } else {
        formattedDeadline = deadline;
      }
    }

    const messageText = `「${title}」の日程調整をお願いします。
以下のリンクから出欠をご入力ください。

▼ 回答用URL
${shareUrl}${formattedDeadline ? `\n\n▼ 入力締切日\n${formattedDeadline}` : ''}`;

    const shareResult = document.getElementById('share-result');
    shareResult.style.display = 'block';
    shareResult.innerHTML = `
      <div class="card card-glow share-section">
        <h2 class="section-title" style="color: var(--success);">✅ イベントを作成しました！</h2>
        <p style="color: var(--text-secondary);">以下のリンクを参加者に共有してください。</p>

        <div class="mt-lg">
          <label class="form-label">回答用リンク</label>
          <div class="share-link-box">
            <input type="text" class="share-link-input" id="share-url" value="${shareUrl}" readonly>
            <button class="btn btn-primary" id="copy-share-btn" type="button">コピー</button>
          </div>
        </div>

        <div class="mt-lg">
          <label class="form-label">案内文</label>
          <div style="position: relative;">
            <textarea class="form-input" id="share-text" readonly rows="7" style="resize: none;">${messageText}</textarea>
            <button class="btn btn-primary btn-sm" id="copy-text-btn" type="button" style="position: absolute; right: 10px; bottom: 10px;">コピー</button>
          </div>
        </div>

        <div class="mt-lg flex-center gap-md" style="flex-wrap: wrap;">
          <a href="#/event/${eventId}" class="btn btn-secondary">イベントページを開く →</a>
        </div>
      </div>
    `;

    document.getElementById('copy-share-btn').addEventListener('click', () => {
      const input = document.getElementById('share-url');
      input.select();
      navigator.clipboard.writeText(input.value).then(() => {
        const btn = document.getElementById('copy-share-btn');
        btn.textContent = 'コピー済み ✓';
        setTimeout(() => { btn.textContent = 'コピー'; }, 2000);
      });
    });

    document.getElementById('copy-text-btn').addEventListener('click', () => {
      const textarea = document.getElementById('share-text');
      textarea.select();
      navigator.clipboard.writeText(textarea.value).then(() => {
        const btn = document.getElementById('copy-text-btn');
        btn.textContent = 'コピー済み ✓';
        setTimeout(() => { btn.textContent = 'コピー'; }, 2000);
      });
    });

    shareResult.scrollIntoView({ behavior: 'smooth' });
  }
};
