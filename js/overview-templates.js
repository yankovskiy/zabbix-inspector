// Overview card templates

// Template function for creating overview cards
function createOverviewCard(config) {
    const { icon, title, defaultValue = 'Нет данных' } = config;
    
    return `
        <div class="card">
            <div class="card-header">
                <div class="card-icon">${icon}</div>
                <div class="card-title">${title}</div>
            </div>
            <div class="metric">
                <span class="metric-label">Статус</span>
                <span class="metric-value">${defaultValue}</span>
            </div>
        </div>
    `;
}

// Initialize overview cards when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const overviewDashboard = document.getElementById('overviewDashboard');
    if (overviewDashboard) {
        // Define card configurations
        const cardConfigs = [
            {
                icon: '🖥️',
                title: 'Информация о сервере',
                defaultValue: 'Загрузите диагностические данные'
            },
            {
                icon: '📊',
                title: 'Информация о Zabbix'
            },
            {
                icon: '⚠️',
                title: 'Проблемные процессы Zabbix'
            },
            {
                icon: '💾',
                title: 'Состояние кэшей Zabbix'
            }
        ];

        // Generate HTML for all cards
        overviewDashboard.innerHTML = cardConfigs
            .map(config => createOverviewCard(config))
            .join('');
    }
});