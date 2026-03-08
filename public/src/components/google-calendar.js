/**
 * GoogleCalendarConnect Component — Google Calendar 連携 UI
 */
class GoogleCalendarConnect {
    constructor(container, options = {}) {
        this.container = container;
        this.onBusySlotsChange = options.onBusySlotsChange || (() => { });
        this.onBusyDatesChange = options.onBusyDatesChange || (() => { });
        this.dates = options.dates || [];
        this.timeStart = options.timeStart || '09:00';
        this.timeEnd = options.timeEnd || '21:00';

        this.connected = false;
        this.calendars = [];
        this.selectedCalendarIds = new Set();
        this.loading = false;

        this.checkStatus();
    }

    async checkStatus() {
        try {
            const res = await fetch('/api/google/status', { credentials: 'include' });
            const data = await res.json();
            this.connected = data.connected;
            if (this.connected) {
                await this.fetchCalendars();
            }
        } catch {
            this.connected = false;
        }
        this.render();
    }

    async fetchCalendars() {
        try {
            const res = await fetch('/api/google/calendars', { credentials: 'include' });
            if (res.status === 401) {
                this.connected = false;
                this.calendars = [];
                return;
            }
            const data = await res.json();
            this.calendars = data.calendars || [];
        } catch {
            this.calendars = [];
        }
    }

    async fetchBusySlots() {
        if (this.selectedCalendarIds.size === 0 || this.dates.length === 0) {
            this.onBusySlotsChange([]);
            return;
        }

        this.loading = true;
        this.renderCalendarList();

        try {
            const res = await fetch('/api/google/busy-slots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    calendarIds: Array.from(this.selectedCalendarIds),
                    dates: this.dates,
                    timeStart: this.timeStart,
                    timeEnd: this.timeEnd
                })
            });

            if (res.status === 401) {
                this.connected = false;
                this.render();
                return;
            }

            const data = await res.json();
            this.onBusySlotsChange(data.busySlots || []);
        } catch {
            this.onBusySlotsChange([]);
        }

        this.loading = false;
        this.renderCalendarList();
    }

    async fetchBusyDates() {
        if (this.selectedCalendarIds.size === 0) {
            this.onBusyDatesChange({});
            return;
        }

        this.loading = true;
        this.renderCalendarList();

        try {
            const res = await fetch('/api/google/busy-slots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    calendarIds: Array.from(this.selectedCalendarIds),
                    dates: this.dates,
                    timeStart: this.timeStart,
                    timeEnd: this.timeEnd
                })
            });

            if (res.status === 401) {
                this.connected = false;
                this.render();
                return;
            }

            const data = await res.json();
            // 日付ごとのスロット数を集計
            const busyDates = {};
            for (const slot of data.busySlots || []) {
                const dateStr = slot.split('_')[0];
                busyDates[dateStr] = (busyDates[dateStr] || 0) + 1;
            }
            this.onBusyDatesChange(busyDates);
        } catch {
            this.onBusyDatesChange({});
        }

        this.loading = false;
        this.renderCalendarList();
    }

    startOAuth() {
        const returnTo = window.location.hash.slice(1) || '/';
        window.location.href = `/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
    }

    async disconnect() {
        try {
            await fetch('/api/google/disconnect', {
                method: 'POST',
                credentials: 'include'
            });
        } catch {
            // 切断失敗は無視
        }
        this.connected = false;
        this.calendars = [];
        this.selectedCalendarIds.clear();
        this.onBusySlotsChange([]);
        this.onBusyDatesChange({});
        this.render();
    }

    toggleCalendar(calId) {
        if (this.selectedCalendarIds.has(calId)) {
            this.selectedCalendarIds.delete(calId);
        } else {
            this.selectedCalendarIds.add(calId);
        }
        this.renderCalendarList();
        // 選択変更時にコールバック
        if (this.dates.length > 0) {
            this.fetchBusySlots();
            this.fetchBusyDates();
        }
    }

    updateDates(dates, timeStart, timeEnd) {
        this.dates = dates;
        if (timeStart) this.timeStart = timeStart;
        if (timeEnd) this.timeEnd = timeEnd;
        if (this.connected && this.selectedCalendarIds.size > 0 && dates.length > 0) {
            this.fetchBusySlots();
            this.fetchBusyDates();
        }
    }

    render() {
        if (!this.connected) {
            this.container.innerHTML = `
                <div class="gcal-connect-section">
                    <button class="btn gcal-connect-btn" id="gcal-connect-btn" type="button">
                        <svg class="gcal-icon" viewBox="0 0 24 24" width="20" height="20">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Googleカレンダーと連携
                    </button>
                    <p class="gcal-hint">連携すると、既存の予定を確認しながら回答できます</p>
                </div>
            `;
            this.container.querySelector('#gcal-connect-btn').addEventListener('click', () => this.startOAuth());
        } else {
            this.container.innerHTML = `
                <div class="gcal-connect-section gcal-connected">
                    <div class="gcal-header">
                        <span class="gcal-status">
                            <span class="gcal-status-dot"></span>
                            Googleカレンダー連携中
                        </span>
                        <button class="btn btn-sm gcal-disconnect-btn" id="gcal-disconnect-btn" type="button">連携解除</button>
                    </div>
                    <div id="gcal-calendar-list"></div>
                </div>
            `;
            this.container.querySelector('#gcal-disconnect-btn').addEventListener('click', () => this.disconnect());
            this.renderCalendarList();
        }
    }

    renderCalendarList() {
        const listEl = this.container.querySelector('#gcal-calendar-list');
        if (!listEl) return;

        if (this.calendars.length === 0) {
            listEl.innerHTML = '<p class="gcal-hint">カレンダーを読み込み中...</p>';
            return;
        }

        let html = '<div class="gcal-calendars">';
        html += '<p class="gcal-label">表示するカレンダーを選択:</p>';

        this.calendars.forEach(cal => {
            const checked = this.selectedCalendarIds.has(cal.id) ? 'checked' : '';
            const colorDot = `background-color: ${cal.backgroundColor || '#7c3aed'}`;
            html += `
                <label class="gcal-calendar-item">
                    <input type="checkbox" class="gcal-calendar-checkbox" data-cal-id="${cal.id}" ${checked}>
                    <span class="gcal-calendar-dot" style="${colorDot}"></span>
                    <span class="gcal-calendar-name">${this.escapeHtml(cal.summary)}</span>
                    ${cal.primary ? '<span class="gcal-primary-badge">メイン</span>' : ''}
                </label>
            `;
        });

        if (this.loading) {
            html += '<p class="gcal-loading">予定を取得中...</p>';
        }

        html += '</div>';
        listEl.innerHTML = html;

        // チェックボックスイベント
        listEl.querySelectorAll('.gcal-calendar-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                this.toggleCalendar(cb.dataset.calId);
            });
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

window.GoogleCalendarConnect = GoogleCalendarConnect;
