/**
 * Respond Page — Participants select their available time slots
 */
window.RespondPage = {
  event: null,
  timeGrid: null,
  gcalConnect: null,
  selectedSlots: [],

  async render(container, eventId) {
    container.innerHTML = `<div class="loading"><div class="loading-spinner"></div></div>`;

    try {
      const res = await fetch(`/api/events/${eventId}`);
      if (!res.ok) {
        container.innerHTML = `
          <div class="empty-state animate-fade-in">
            <div class="empty-state-icon">🔍</div>
            <h2>イベントが見つかりません</h2>
            <p class="mt-md" style="color: var(--text-muted);">リンクが正しいか確認してください。</p>
            <a href="/" class="btn btn-primary mt-xl">トップページへ</a>
          </div>
        `;
        return;
      }

      this.event = await res.json();
      this.selectedSlots = [];
      this.renderForm(container, eventId);
    } catch (err) {
      container.innerHTML = `
        <div class="empty-state animate-fade-in">
          <div class="empty-state-icon">⚠️</div>
          <h2>通信エラー</h2>
          <p class="mt-md" style="color: var(--text-muted);">サーバーに接続できません。</p>
        </div>
      `;
    }
  },

  renderForm(container, eventId) {
    const ev = this.event;

    let deadlineMessage = '';
    let isPastDeadline = false;

    if (ev.deadline) {
      const d = new Date(ev.deadline);
      isPastDeadline = d < new Date();
      deadlineMessage = `<p class="deadline-message" style="color: ${isPastDeadline ? 'var(--danger)' : 'var(--warning)'}; font-weight: bold; margin-bottom: var(--space-md);">入力締め切り: ${d.toLocaleString()}</p>`;
    }

    if (isPastDeadline) {
      container.innerHTML = `
              <div class="animate-slide-up">
                <h1 class="page-title">${this.escapeHtml(ev.title)}</h1>
                ${ev.description ? `<p class="page-subtitle">${this.escapeHtml(ev.description)}</p>` : ''}
                ${deadlineMessage}
                <div class="alert mt-lg text-center" style="padding: 2rem; border-radius: 8px; background: rgba(255,59,48,0.1); border: 1px solid var(--danger); color: var(--danger);">
                  <p><strong>締め切りを過ぎているため、回答できません。</strong></p>
                  <div class="mt-md">
                    <a href="#/event/${eventId}/results" class="btn btn-secondary">結果を見る →</a>
                  </div>
                </div>
              </div>
            `;
      return;
    }

    container.innerHTML = `
      <div class="animate-slide-up">
        <h1 class="page-title">${this.escapeHtml(ev.title)}</h1>
        ${ev.description ? `<p class="page-subtitle">${this.escapeHtml(ev.description)}</p>` : ''}
        ${deadlineMessage}

        <div class="steps">
          <div class="step step--completed">
            <div class="step-number">✓</div>
            <span>イベント作成</span>
          </div>
          <div class="step-connector"></div>
          <div class="step step--active">
            <div class="step-number">2</div>
            <span>回答入力</span>
          </div>
          <div class="step-connector"></div>
          <div class="step">
            <div class="step-number">3</div>
            <span>日程決定</span>
          </div>
        </div>

        <div class="card mb-lg">
          <div class="form-group">
            <label class="form-label" for="respondent-name">あなたの名前</label>
            <input type="text" class="form-input" id="respondent-name" placeholder="例: 田中太郎" maxlength="50">
          </div>
        </div>

        <div class="card mb-lg">
          <h2 class="section-title">参加できる時間帯を選択</h2>
          <p style="color: var(--text-muted); font-size: var(--font-size-sm); margin-bottom: var(--space-md);">
            ドラッグで複数のスロットを一括選択できます
          </p>
          <div id="gcal-respond-container" class="mb-md"></div>
          <div id="respond-timegrid"></div>
        </div>

        <button class="btn btn-primary btn-lg" id="submit-response-btn" style="width: 100%;" disabled>
          回答を送信する
        </button>

        <div class="mt-lg text-center">
          <a href="#/event/${eventId}/results" style="color: var(--text-muted); text-decoration: underline;">結果を見る →</a>
        </div>
      </div>
    `;

    // Initialize time grid
    const gridContainer = document.getElementById('respond-timegrid');
    this.timeGrid = new TimeGrid(gridContainer, {
      dates: ev.dates,
      timeStart: ev.timeStart,
      timeEnd: ev.timeEnd,
      onSelect: (slots) => {
        this.selectedSlots = slots;
        this.updateSubmitButton();
      }
    });

    // Initialize Google Calendar connect
    const gcalContainer = document.getElementById('gcal-respond-container');
    this.gcalConnect = new GoogleCalendarConnect(gcalContainer, {
      dates: ev.dates,
      timeStart: ev.timeStart,
      timeEnd: ev.timeEnd,
      onBusySlotsChange: (busySlots) => {
        if (this.timeGrid) {
          this.timeGrid.setBlockedSlots(busySlots);
          this.selectedSlots = this.timeGrid.getSelectedSlots();
          this.updateSubmitButton();
        }
      }
    });

    // Listeners
    document.getElementById('respondent-name').addEventListener('input', () => this.updateSubmitButton());
    document.getElementById('submit-response-btn').addEventListener('click', () => this.submitResponse(eventId));
  },

  updateSubmitButton() {
    const btn = document.getElementById('submit-response-btn');
    const name = document.getElementById('respondent-name').value.trim();
    btn.disabled = !name || this.selectedSlots.length === 0;
  },

  async submitResponse(eventId) {
    const btn = document.getElementById('submit-response-btn');
    btn.disabled = true;
    btn.textContent = '送信中...';

    const name = document.getElementById('respondent-name').value.trim();

    try {
      const res = await fetch(`/api/events/${eventId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slots: this.selectedSlots
        })
      });

      const data = await res.json();

      if (res.ok) {
        window.location.hash = `/event/${eventId}/results`;
      } else {
        alert(data.error || 'エラーが発生しました');
        btn.disabled = false;
        btn.textContent = '回答を送信する';
      }
    } catch (err) {
      alert('通信エラーが発生しました');
      btn.disabled = false;
      btn.textContent = '回答を送信する';
    }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
