/**
 * Heatmap Component — Visualize availability overlap with color intensity
 */
class Heatmap {
    constructor(container, options = {}) {
        this.container = container;
        this.dates = options.dates || [];
        this.timeStart = options.timeStart || '09:00';
        this.timeEnd = options.timeEnd || '21:00';
        this.slotCounts = options.slotCounts || {};
        this.slotRespondents = options.slotRespondents || {};
        this.totalResponses = options.totalResponses || 0;

        this.render();
    }

    generateTimeSlots() {
        const slots = [];
        const [startH, startM] = this.timeStart.split(':').map(Number);
        const [endH, endM] = this.timeEnd.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        for (let m = startMinutes; m < endMinutes; m += 30) {
            const h = Math.floor(m / 60);
            const min = m % 60;
            slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
        }
        return slots;
    }

    formatDateLabel(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        const dayName = dayNames[date.getDay()];
        return `${month}/${day}(${dayName})`;
    }

    getHeatLevel(count) {
        if (count === 0 || this.totalResponses === 0) return 0;
        const ratio = count / this.totalResponses;
        if (ratio <= 0.2) return 1;
        if (ratio <= 0.4) return 2;
        if (ratio <= 0.6) return 3;
        if (ratio <= 0.8) return 4;
        return 5;
    }

    render() {
        if (!this.dates.length) {
            this.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <p>データがありません</p>
        </div>
      `;
            return;
        }

        const timeSlots = this.generateTimeSlots();

        let html = `<div class="heatmap-container"><div class="heatmap" style="grid-template-columns: 60px repeat(${this.dates.length}, 1fr);">`;

        // Header row
        html += `<div class="timegrid-date-label"></div>`;
        this.dates.forEach(date => {
            html += `<div class="timegrid-date-label">${this.formatDateLabel(date)}</div>`;
        });

        // Data rows
        timeSlots.forEach(time => {
            html += `<div class="timegrid-time-label">${time}</div>`;
            this.dates.forEach(date => {
                const key = `${date}_${time}`;
                const count = this.slotCounts[key] || 0;
                const level = this.getHeatLevel(count);
                const respondents = this.slotRespondents[key] || [];

                let tooltipText = count === 0
                    ? '回答なし'
                    : `${count}/${this.totalResponses}人: ${respondents.join(', ')}`;

                html += `
          <div class="heatmap-slot heatmap-slot--level-${level}" data-slot="${key}">
            ${count > 0 ? count : ''}
            <div class="heatmap-tooltip">${tooltipText}</div>
          </div>
        `;
            });
        });

        html += `</div></div>`;

        // Legend
        html += `
      <div class="heatmap-legend">
        <span>少ない</span>
        <div class="legend-block" style="background: var(--heat-0);"></div>
        <div class="legend-block" style="background: var(--heat-1);"></div>
        <div class="legend-block" style="background: var(--heat-2);"></div>
        <div class="legend-block" style="background: var(--heat-3);"></div>
        <div class="legend-block" style="background: var(--heat-4);"></div>
        <div class="legend-block" style="background: var(--heat-5);"></div>
        <span>多い</span>
      </div>
    `;

        this.container.innerHTML = html;
    }
}

window.Heatmap = Heatmap;
