/**
 * Respond Page — Unified: answer + live results on one page
 */
window.RespondPage = {
  event: null,
  timeGrid: null,
  gcalConnect: null,
  selectedSlots: [],
  editingName: null, // name of respondent being edited, null = new

  async render(container, eventId) {
    container.innerHTML = `<div class="loading"><div class="loading-spinner"></div></div>`;

    try {
      const res = await fetch(`/api/events/${eventId}/results`);
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

      const data = await res.json();
      this.event = data.event;
      this.resultsData = data;
      this.selectedSlots = [];
      this.editingName = null;
      this.renderPage(container, eventId);
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

  renderPage(container, eventId) {
    const ev = this.event;
    const { totalResponses, slotCounts, slotRespondents } = this.resultsData;

    let deadlineMessage = '';
    let isPastDeadline = false;

    if (ev.deadline) {
      const d = new Date(ev.deadline);
      isPastDeadline = d < new Date();
      deadlineMessage = `<p class="deadline-message" style="color: ${isPastDeadline ? 'var(--danger)' : 'var(--warning)'}; font-weight: bold; margin-bottom: var(--space-md);">入力締め切り: ${d.toLocaleString()}</p>`;
    }

    // Best slots
    let maxCount = 0;
    let bestSlots = [];
    Object.entries(slotCounts).forEach(([slot, count]) => {
      if (count > maxCount) {
        maxCount = count;
        bestSlots = [slot];
      } else if (count === maxCount) {
        bestSlots.push(slot);
      }
    });

    container.innerHTML = `
      <div class="animate-slide-up">
        <h1 class="page-title">${this.escapeHtml(ev.title)}</h1>
        ${ev.description ? `<p class="page-subtitle">${this.escapeHtml(ev.description)}</p>` : ''}
        ${deadlineMessage}

        <!-- ── 回答セクション ── -->
        ${!isPastDeadline ? `
        <div class="card mb-lg">
          <h2 class="section-title">回答する</h2>

          ${ev.responses.length > 0 ? `
            <p style="color: var(--text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--space-sm);">
              回答を修正する場合は名前をクリック:
            </p>
            <div class="respondent-selector">
              ${ev.responses.map(r => `
                <button type="button" class="respondent-select-chip" data-name="${this.escapeHtml(r.name)}">
                  ${this.escapeHtml(r.name)}
                  <span class="chip-delete" data-delete-name="${this.escapeHtml(r.name)}" title="回答を削除">×</span>
                </button>
              `).join('')}
              <button type="button" class="respondent-select-chip respondent-select-chip--new" id="new-respondent-btn">
                + 新規回答
              </button>
            </div>
          ` : ''}

          <div class="form-group mt-md" id="name-input-group">
            <label class="form-label" for="respondent-name">あなたの名前</label>
            <input type="text" class="form-input" id="respondent-name" placeholder="例: 田中太郎" maxlength="50">
          </div>

          <div id="timegrid-section">
            <h3 style="font-size: var(--font-size-base); font-weight: 600; margin-bottom: var(--space-sm); margin-top: var(--space-md);">参加できる時間帯を選択</h3>
            <p style="color: var(--text-muted); font-size: var(--font-size-sm); margin-bottom: var(--space-md);">
              ドラッグで複数のスロットを一括選択できます
            </p>
            <div id="gcal-respond-container" class="mb-md"></div>
            <div id="respond-timegrid"></div>
          </div>

          <button class="btn btn-primary btn-lg mt-lg" id="submit-response-btn" style="width: 100%;" disabled>
            回答を保存する
          </button>
        </div>
        ` : ''}

        <!-- ── 結果セクション ── -->
        <div class="results-stats">
          <div class="stat-card">
            <div class="stat-value">${totalResponses}</div>
            <div class="stat-label">回答数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${ev.dates.length}</div>
            <div class="stat-label">候補日数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${maxCount}</div>
            <div class="stat-label">最大一致人数</div>
          </div>
        </div>

        ${totalResponses > 0 ? `
          ${bestSlots.length > 0 && maxCount > 0 ? `
            <div class="card mb-lg">
              <h2 class="section-title"><i data-lucide="target"></i> おすすめの日時</h2>
              <p style="color: var(--text-secondary); font-size: var(--font-size-sm);">
                全員または最も多くの人が参加できる時間帯:
              </p>
              ${bestSlots.slice(0, 5).map(slot => {
                const [date, time] = slot.split('_');
                const d = new Date(date + 'T00:00:00');
                const month = d.getMonth() + 1;
                const day = d.getDate();
                const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
                const dayName = dayNames[d.getDay()];
                const respondents = slotRespondents[slot] || [];
                return `
                  <div class="best-slot-badge">
                    ${month}/${day}(${dayName}) ${time}〜  ${maxCount}人 (${respondents.join(', ')})
                  </div>
                `;
              }).join('')}
              ${bestSlots.length > 5 ? `<p class="mt-md" style="color: var(--text-muted); font-size: var(--font-size-sm);">他 ${bestSlots.length - 5} スロット</p>` : ''}
            </div>
          ` : ''}

          <div class="card mb-lg">
            <h2 class="section-title"><i data-lucide="bar-chart-3"></i> 空き状況ヒートマップ</h2>
            <p style="color: var(--text-muted); font-size: var(--font-size-sm); margin-bottom: var(--space-md);">
              色が濃いほど参加可能な人が多い時間帯です。スロットにカーソルを合わせると詳細を確認できます。
            </p>
            <div id="results-heatmap"></div>
          </div>
        ` : `
          <div class="card mb-lg">
            <div class="no-response-message">
              <p style="font-size: var(--font-size-lg);">まだ回答がありません</p>
              <p style="color: var(--text-muted); margin-top: var(--space-sm);">上のフォームから回答してください。</p>
            </div>
          </div>
        `}

        <div class="flex-center gap-md mt-xl" style="flex-wrap: wrap;">
          <button class="btn btn-secondary" id="copy-link" type="button">リンクをコピー</button>
        </div>
      </div>
    `;

    // Render heatmap
    if (totalResponses > 0) {
      const heatmapContainer = document.getElementById('results-heatmap');
      new Heatmap(heatmapContainer, {
        dates: ev.dates,
        timeStart: ev.timeStart,
        timeEnd: ev.timeEnd,
        slotCounts,
        slotRespondents,
        totalResponses
      });
    }

    // Initialize lucide icons
    if (window.lucide) lucide.createIcons();

    // Initialize time grid (only if not past deadline)
    if (!isPastDeadline) {
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
      if (gcalContainer) {
        this.gcalConnect = new GoogleCalendarConnect(gcalContainer, {
          dates: ev.dates,
          timeStart: ev.timeStart,
          timeEnd: ev.timeEnd,
          onBusySlotsChange: (busySlots) => {
            if (this.timeGrid && this.timeGrid.setBlockedSlots) {
              this.timeGrid.setBlockedSlots(busySlots);
              this.selectedSlots = this.timeGrid.getSelectedSlots();
              this.updateSubmitButton();
            }
          }
        });
      }

      // Name input listener
      document.getElementById('respondent-name').addEventListener('input', () => this.updateSubmitButton());

      // Submit button
      document.getElementById('submit-response-btn').addEventListener('click', () => this.submitResponse(eventId));

      // Respondent chip click — load existing response for editing
      container.querySelectorAll('.respondent-select-chip:not(.respondent-select-chip--new)').forEach(chip => {
        chip.addEventListener('click', (e) => {
          if (e.target.classList.contains('chip-delete')) return;
          const name = chip.dataset.name;
          this.loadResponse(name);
        });
      });

      // Chip delete buttons
      container.querySelectorAll('.chip-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const name = btn.dataset.deleteName;
          this.deleteResponse(eventId, name);
        });
      });

      // New respondent button
      const newBtn = document.getElementById('new-respondent-btn');
      if (newBtn) {
        newBtn.addEventListener('click', () => this.resetToNew());
      }
    }

    // Copy link
    document.getElementById('copy-link').addEventListener('click', () => {
      const url = `${window.location.origin}/#/event/${eventId}`;
      navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('copy-link');
        btn.textContent = 'コピー済み ✓';
        setTimeout(() => { btn.textContent = 'リンクをコピー'; }, 2000);
      });
    });
  },

  loadResponse(name) {
    const response = this.event.responses.find(r => r.name === name);
    if (!response) return;

    this.editingName = name;

    // Set name input
    const nameInput = document.getElementById('respondent-name');
    nameInput.value = name;
    nameInput.readOnly = true;
    nameInput.style.opacity = '0.7';

    // Highlight active chip
    document.querySelectorAll('.respondent-select-chip').forEach(c => c.classList.remove('respondent-select-chip--active'));
    const activeChip = document.querySelector(`.respondent-select-chip[data-name="${CSS.escape(name)}"]`);
    if (activeChip) activeChip.classList.add('respondent-select-chip--active');

    // Restore slots in timegrid
    this.selectedSlots = [...response.slots];
    this.timeGrid.selectedSlots = new Set(response.slots);
    this.timeGrid.updateSlotVisuals();
    this.timeGrid.onSelect(this.selectedSlots);

    // Update button text
    const btn = document.getElementById('submit-response-btn');
    btn.textContent = '回答を更新する';
    this.updateSubmitButton();

    // Scroll to timegrid
    document.getElementById('timegrid-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  resetToNew() {
    this.editingName = null;

    const nameInput = document.getElementById('respondent-name');
    nameInput.value = '';
    nameInput.readOnly = false;
    nameInput.style.opacity = '1';
    nameInput.focus();

    // Clear chip highlights
    document.querySelectorAll('.respondent-select-chip').forEach(c => c.classList.remove('respondent-select-chip--active'));

    // Clear timegrid
    this.selectedSlots = [];
    this.timeGrid.selectedSlots = new Set();
    this.timeGrid.updateSlotVisuals();
    this.timeGrid.onSelect([]);

    // Reset button text
    const btn = document.getElementById('submit-response-btn');
    btn.textContent = '回答を保存する';
    this.updateSubmitButton();
  },

  updateSubmitButton() {
    const btn = document.getElementById('submit-response-btn');
    if (!btn) return;
    const name = document.getElementById('respondent-name').value.trim();
    btn.disabled = !name || this.selectedSlots.length === 0;
  },

  async submitResponse(eventId) {
    const btn = document.getElementById('submit-response-btn');
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = '保存中...';

    const name = document.getElementById('respondent-name').value.trim();

    try {
      const res = await fetch(`/api/events/${eventId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slots: this.selectedSlots })
      });

      const data = await res.json();

      if (res.ok) {
        // Re-render the whole page with fresh data
        this.render(document.getElementById('app'), eventId);
      } else {
        alert(data.error || 'エラーが発生しました');
        btn.disabled = false;
        btn.textContent = originalText;
      }
    } catch (err) {
      alert('通信エラーが発生しました');
      btn.disabled = false;
      btn.textContent = originalText;
    }
  },

  async deleteResponse(eventId, name) {
    if (!confirm(`${name} さんの回答を削除しますか？`)) return;

    try {
      const res = await fetch(`/api/events/${eventId}/respond/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        this.render(document.getElementById('app'), eventId);
      } else {
        const data = await res.json();
        alert(data.error || '削除に失敗しました');
      }
    } catch (err) {
      alert('通信エラーが発生しました');
    }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
