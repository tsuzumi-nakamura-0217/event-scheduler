/**
 * TimeGrid Component — Date × Time slot grid with drag selection
 */
class TimeGrid {
    constructor(container, options = {}) {
        this.container = container;
        this.dates = options.dates || [];
        this.timeStart = options.timeStart || '09:00';
        this.timeEnd = options.timeEnd || '21:00';
        this.selectedSlots = new Set(options.selectedSlots || []);
        this.onSelect = options.onSelect || (() => { });
        this.readOnly = options.readOnly || false;

        this.isDragging = false;
        this.dragMode = null; // 'select' or 'deselect'

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

    slotKey(date, time) {
        return `${date}_${time}`;
    }

    toggleSlot(key) {
        if (this.readOnly) return;
        if (this.selectedSlots.has(key)) {
            this.selectedSlots.delete(key);
        } else {
            this.selectedSlots.add(key);
        }
        this.updateSlotVisuals();
        this.onSelect(Array.from(this.selectedSlots));
    }

    updateSlotVisuals() {
        this.container.querySelectorAll('.timegrid-slot').forEach(el => {
            const key = el.dataset.slot;
            if (this.selectedSlots.has(key)) {
                el.classList.add('timegrid-slot--selected');
            } else {
                el.classList.remove('timegrid-slot--selected');
            }
        });
    }

    getSelectedSlots() {
        return Array.from(this.selectedSlots);
    }

    render() {
        if (!this.dates.length) {
            this.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📅</div>
          <p>候補日を選択してください</p>
        </div>
      `;
            return;
        }

        const timeSlots = this.generateTimeSlots();
        const cols = this.dates.length + 1; // +1 for time labels

        let html = `<div class="timegrid-container"><div class="timegrid" style="grid-template-columns: 60px repeat(${this.dates.length}, 1fr);">`;

        // Header row
        html += `<div class="timegrid-date-label"></div>`;
        this.dates.forEach(date => {
            html += `<div class="timegrid-date-label">${this.formatDateLabel(date)}</div>`;
        });

        // Time rows
        timeSlots.forEach(time => {
            html += `<div class="timegrid-time-label">${time}</div>`;
            this.dates.forEach(date => {
                const key = this.slotKey(date, time);
                const selected = this.selectedSlots.has(key);
                html += `<div class="timegrid-slot${selected ? ' timegrid-slot--selected' : ''}" data-slot="${key}"></div>`;
            });
        });

        html += `</div></div>`;
        this.container.innerHTML = html;

        if (!this.readOnly) {
            this.attachDragListeners();
        }
    }

    attachDragListeners() {
        const slots = this.container.querySelectorAll('.timegrid-slot');

        const handleStart = (el) => {
            this.isDragging = true;
            const key = el.dataset.slot;
            this.dragMode = this.selectedSlots.has(key) ? 'deselect' : 'select';
            this.handleDrag(el);
        };

        const handleMove = (el) => {
            if (!this.isDragging) return;
            this.handleDrag(el);
        };

        const handleEnd = () => {
            this.isDragging = false;
            this.dragMode = null;
        };

        slots.forEach(el => {
            // Mouse events
            el.addEventListener('mousedown', (e) => {
                e.preventDefault();
                handleStart(el);
            });
            el.addEventListener('mouseenter', () => handleMove(el));

            // Touch events
            el.addEventListener('touchstart', (e) => {
                e.preventDefault();
                handleStart(el);
            });
            el.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                if (target && target.classList.contains('timegrid-slot')) {
                    handleMove(target);
                }
            });
        });

        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchend', handleEnd);
    }

    handleDrag(el) {
        const key = el.dataset.slot;
        if (this.dragMode === 'select') {
            this.selectedSlots.add(key);
        } else {
            this.selectedSlots.delete(key);
        }
        this.updateSlotVisuals();
        this.onSelect(Array.from(this.selectedSlots));
    }
}

window.TimeGrid = TimeGrid;
