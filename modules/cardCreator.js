/**
 * Модуль для создания карточек с метриками
 * Устраняет дублирование HTML кода в создании карточек
 */

export class CardCreator {
    /**
     * Создает карточку с массивом метрик
     * @param {string} icon - Иконка карточки (emoji)
     * @param {string} title - Заголовок карточки
     * @param {Array} metrics - Массив метрик [{label, value, status}]
     * @returns {HTMLElement} - DOM элемент карточки
     */
    static createMetricCard(icon, title, metrics = []) {
        const card = document.createElement('div');
        card.className = 'card';

        const metricsHtml = this.generateMetricsHtml(metrics);

        card.innerHTML = `
            <div class="card-header">
                <div class="card-icon">${icon}</div>
                <div class="card-title">${title}</div>
            </div>
            ${metricsHtml}
        `;

        return card;
    }

    /**
     * Генерирует HTML для метрик - устраняет дублирование
     * @param {Array} metrics - Массив метрик [{label, value, status}]
     * @returns {string} - HTML строка с метриками
     */
    static generateMetricsHtml(metrics = []) {
        if (!metrics || metrics.length === 0) {
            return '<div id="metrics"></div>';
        }

        return metrics.map(metric => {
            const statusClass = metric.status ? metric.status : '';
            return `
                <div class="metric">
                    <span class="metric-label">${metric.label}</span>
                    <span class="metric-value ${statusClass}">${metric.value}</span>
                </div>
            `;
        }).join('');
    }

}