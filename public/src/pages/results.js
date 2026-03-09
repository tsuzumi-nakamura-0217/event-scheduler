/**
 * Results Page — Display aggregated availability as heatmap
 */
window.ResultsPage = {
  async render(container, eventId) {
    container.innerHTML = `<div class="loading"><div class="loading-spinner"></div></div>`;

    try {
      const res = await fetch(`/api/events/${eventId}/results`);
      if (!res.ok) {
        container.innerHTML = `
          <div class="empty-state animate-fade-in">
            <div class="empty-state-icon">🔍</div>
            <h2>イベントが見つかりません</h2>
            <a href="/" class="btn btn-primary mt-xl">トップページへ</a>
          </div>
        `;
        return;
      }

      const data = await res.json();
      this.renderResults(container, data, eventId);
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

  renderResults(container, data, eventId) {
    const { event, totalResponses, slotCounts, slotRespondents } = data;

    // Find best slot(s)
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

    let deadlineMessage = '';
    let isPastDeadline = false;

    if (event.deadline) {
      const d = new Date(event.deadline);
      isPastDeadline = d < new Date();
      deadlineMessage = `<p class="deadline-message" style="color: ${isPastDeadline ? 'var(--danger)' : 'var(--warning)'}; font-weight: bold; margin-bottom: var(--space-md);">入力締め切り: ${d.toLocaleString()}</p>`;
    }

    container.innerHTML = `
      <div class="animate-slide-up">
        <h1 class="page-title">${this.escapeHtml(event.title)}</h1>
        ${event.description ? `<p class="page-subtitle">${this.escapeHtml(event.description)}</p>` : ''}
        ${deadlineMessage}

        <div class="steps">
          <div class="step step--completed">
            <div class="step-number">✓</div>
            <span>イベント作成</span>
          </div>
          <div class="step-connector"></div>
          <div class="step step--completed">
            <div class="step-number">✓</div>
            <span>回答入力</span>
          </div>
          <div class="step-connector"></div>
          <div class="step step--active">
            <div class="step-number">3</div>
            <span>日程決定</span>
          </div>
        </div>

        <div class="results-stats">
          <div class="stat-card">
            <div class="stat-value">${totalResponses}</div>
            <div class="stat-label">回答数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${event.dates.length}</div>
            <div class="stat-label">候補日数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${maxCount}</div>
            <div class="stat-label">最大一致人数</div>
          </div>
        </div>

        ${totalResponses > 0 ? `
          <div class="card mb-lg">
            <h2 class="section-title">回答者</h2>
            <div class="respondent-list">
              ${event.responses.map(r => `<span class="respondent-chip">${this.escapeHtml(r.name)}</span>`).join('')}
            </div>
          </div>

          ${bestSlots.length > 0 && maxCount > 0 ? `
            <div class="card mb-lg">
              <h2 class="section-title">🎯 おすすめの日時</h2>
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
                    ${month}/${day}(${dayName}) ${time}〜 — ${maxCount}人参加可能 (${respondents.join(', ')})
                  </div>
                `;
    }).join('')}
              ${bestSlots.length > 5 ? `<p class="mt-md" style="color: var(--text-muted); font-size: var(--font-size-sm);">他 ${bestSlots.length - 5} スロット</p>` : ''}
            </div>
          ` : ''}

          <div class="card mb-lg">
            <h2 class="section-title">📊 空き状況ヒートマップ</h2>
            <p style="color: var(--text-muted); font-size: var(--font-size-sm); margin-bottom: var(--space-md);">
              色が濃いほど参加可能な人が多い時間帯です。スロットにカーソルを合わせると詳細を確認できます。
            </p>
            <div id="results-heatmap"></div>
          </div>
        ` : `
          <div class="card mb-lg">
            <div class="no-response-message">
              <p style="font-size: var(--font-size-lg);">まだ回答がありません</p>
              <p style="color: var(--text-muted); margin-top: var(--space-sm);">回答用リンクを参加者に共有してください。</p>
            </div>
          </div>
        `}

        <div class="flex-center gap-md mt-xl" style="flex-wrap: wrap;">
          ${!isPastDeadline ? `<a href="#/event/${eventId}" class="btn btn-primary">回答する</a>` : ''}
          <button class="btn btn-secondary" id="copy-results-link" type="button">リンクをコピー</button>
          <button class="btn btn-secondary" id="refresh-results" type="button">🔄 結果を更新</button>
        </div>
      </div>
    `;

    // Render heatmap
    if (totalResponses > 0) {
      const heatmapContainer = document.getElementById('results-heatmap');
      new Heatmap(heatmapContainer, {
        dates: event.dates,
        timeStart: event.timeStart,
        timeEnd: event.timeEnd,
        slotCounts,
        slotRespondents,
        totalResponses
      });
    }

    // Copy link
    document.getElementById('copy-results-link').addEventListener('click', () => {
      const url = `${window.location.origin}/#/event/${eventId}`;
      navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('copy-results-link');
        btn.textContent = 'コピー済み ✓';
        setTimeout(() => { btn.textContent = 'リンクをコピー'; }, 2000);
      });
    });

    // Refresh
    document.getElementById('refresh-results').addEventListener('click', () => {
      this.render(container, eventId);
    });
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
