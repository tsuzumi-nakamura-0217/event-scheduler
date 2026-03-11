/**
 * Calendar Component — Interactive month calendar with multi-date selection
 */
class Calendar {
    constructor(container, options = {}) {
        this.container = container;
        this.selectedDates = new Set(options.selectedDates || []);
        this.onSelect = options.onSelect || (() => { });
        this.minDate = options.minDate || new Date();
        this.minDate.setHours(0, 0, 0, 0);

        const today = new Date();
        this.currentMonth = today.getMonth();
        this.currentYear = today.getFullYear();

        this.dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        this.monthNames = [
            '1月', '2月', '3月', '4月', '5月', '6月',
            '7月', '8月', '9月', '10月', '11月', '12月'
        ];

        this.render();
    }

    formatDate(year, month, day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    isToday(year, month, day) {
        const today = new Date();
        return today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;
    }

    isPast(year, month, day) {
        const date = new Date(year, month, day);
        return date < this.minDate;
    }

    prevMonth() {
        this.currentMonth--;
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.render();
    }

    nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        this.render();
    }

    toggleDate(dateStr) {
        if (this.selectedDates.has(dateStr)) {
            this.selectedDates.delete(dateStr);
        } else {
            this.selectedDates.add(dateStr);
        }
        this.render();
        this.onSelect(Array.from(this.selectedDates).sort());
    }

    getSelectedDates() {
        return Array.from(this.selectedDates).sort();
    }

    render() {
        const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();

        let html = `
      <div class="calendar-wrapper">
        <div class="calendar-header">
          <button class="btn btn-icon btn-secondary" id="cal-prev" type="button">◀</button>
          <span class="calendar-month-year">${this.currentYear}年 ${this.monthNames[this.currentMonth]}</span>
          <button class="btn btn-icon btn-secondary" id="cal-next" type="button">▶</button>
        </div>
        <div class="calendar-grid">
    `;

        // Day headers
        this.dayNames.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            html += `<div class="calendar-day calendar-day--empty"></div>`;
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = this.formatDate(this.currentYear, this.currentMonth, day);
            const isSelected = this.selectedDates.has(dateStr);
            const today = this.isToday(this.currentYear, this.currentMonth, day);
            const past = this.isPast(this.currentYear, this.currentMonth, day);

            let classes = 'calendar-day';
            if (isSelected) classes += ' calendar-day--selected';
            if (today) classes += ' calendar-day--today';
            if (past) classes += ' calendar-day--disabled';

            html += `<div class="${classes}" data-date="${dateStr}" ${past ? '' : ''}>${day}</div>`;
        }

        html += `</div></div>`;
        this.container.innerHTML = html;

        // Event listeners
        this.container.querySelector('#cal-prev').addEventListener('click', () => this.prevMonth());
        this.container.querySelector('#cal-next').addEventListener('click', () => this.nextMonth());

        this.container.querySelectorAll('.calendar-day:not(.calendar-day--empty):not(.calendar-day--disabled)').forEach(el => {
            const handleInteract = (e) => {
                e.preventDefault(); // Prevent double-firing on touch devices
                this.toggleDate(el.dataset.date);
            };
            el.addEventListener('click', handleInteract);
            el.addEventListener('touchstart', handleInteract, { passive: false });
        });
    }
}

window.Calendar = Calendar;
