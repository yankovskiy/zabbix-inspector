// Inline scripts extracted from index.html

// Функция копирования в буфер обмена
function copyToClipboard(button, text) {
    navigator.clipboard.writeText(text).then(() => {
        // Сохраняем оригинальный контент
        const originalText = button.querySelector('.copy-text').textContent;
        const originalIcon = button.querySelector('.copy-icon').textContent;
        
        // Меняем на состояние "скопировано"
        button.classList.add('copied');
        button.querySelector('.copy-text').textContent = 'Скопировано';
        button.querySelector('.copy-icon').textContent = '✓';
        
        // Возвращаем обратно через 2 секунды
        setTimeout(() => {
            button.classList.remove('copied');
            button.querySelector('.copy-text').textContent = originalText;
            button.querySelector('.copy-icon').textContent = originalIcon;
        }, 2000);
    }).catch(err => {
        console.error('Ошибка копирования:', err);
        // Fallback для старых браузеров
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            button.querySelector('.copy-text').textContent = 'Скопировано';
            setTimeout(() => {
                button.querySelector('.copy-text').textContent = 'Копировать';
            }, 2000);
        } catch (fallbackErr) {
            console.error('Fallback копирование не удалось:', fallbackErr);
        }
        document.body.removeChild(textArea);
    });
}

// Обновляем футер из constants.js при загрузке
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Загружаем constants.js как модуль
        const module = await import('../config/constants.js');
        const config = module.APP_CONFIG;
        const defaultUrl = module.DEFAULT_ZABBIX_URL;
        
        // Обновляем футер
        const copyrightEl = document.getElementById('copyright');
        const githubLinkEl = document.getElementById('githubLink');
        
        if (copyrightEl) {
            copyrightEl.textContent = `© 2025 ${config.author}`;
        }
        if (githubLinkEl) {
            githubLinkEl.href = config.githubUrl;
        }
        
        // Устанавливаем URL по умолчанию если не заданы
        const urlInput = document.getElementById('zabbixUrl');
        const urlDisplay = document.getElementById('zabbixUrlDisplay');
        if (urlInput && !urlInput.value) {
            urlInput.value = defaultUrl;
        }
        if (urlDisplay && !urlDisplay.textContent) {
            urlDisplay.textContent = defaultUrl;
        }
    } catch (error) {
        console.error('Ошибка загрузки конфигурации:', error);
    }
});

// Make copyToClipboard globally available for onclick handlers
window.copyToClipboard = copyToClipboard;