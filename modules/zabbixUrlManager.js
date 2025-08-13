import { DEFAULT_ZABBIX_URL } from '../config/constants.js';

export class ZabbixUrlManager {
    constructor() {
        this.zabbix_url = DEFAULT_ZABBIX_URL;
        this.elements = {};
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;

        this.elements = {
            urlInput: document.getElementById('zabbixUrl'),
            urlDisplay: document.getElementById('zabbixUrlDisplay'),
            toggleBtn: document.getElementById('urlToggleBtn')
        };

        if (!this.elements.urlInput || !this.elements.urlDisplay || !this.elements.toggleBtn) {
            console.warn('Элементы управления URL Zabbix не найдены');
            return;
        }

        this.loadSavedUrl();
        this.setupEventListeners();
        this.setEditMode(true); // Начальное состояние - режим редактирования
        
        this.isInitialized = true;
        console.log('ZabbixUrlManager инициализирован');
    }

    loadSavedUrl() {
        const savedUrl = localStorage.getItem('zabbix_url');
        if (savedUrl) {
            this.zabbix_url = savedUrl;
            this.elements.urlInput.value = savedUrl;
            this.elements.urlDisplay.textContent = savedUrl;
        }
    }

    setupEventListeners() {
        // Обработчик клика по кнопке
        this.elements.toggleBtn.addEventListener('click', () => {
            this.handleToggleClick();
        });

        // Enter для сохранения
        this.elements.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleToggleClick();
            }
        });

        // Escape для отмены редактирования
        this.elements.urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.elements.urlInput.value = this.zabbix_url;
                if (this.zabbix_url !== DEFAULT_ZABBIX_URL) {
                    this.setEditMode(false);
                }
            }
        });
    }

    handleToggleClick() {
        const isEditMode = !this.elements.urlInput.disabled;

        if (isEditMode) {
            this.saveUrl();
        } else {
            this.setEditMode(true);
            this.elements.urlInput.focus();
        }
    }

    saveUrl() {
        const newUrl = this.elements.urlInput.value.trim();
        
        if (!this.validateUrl(newUrl)) {
            this.showValidationError('Пожалуйста, введите корректный URL');
            this.elements.urlInput.focus();
            return false;
        }

        const oldUrl = this.zabbix_url;
        this.zabbix_url = newUrl;
        localStorage.setItem('zabbix_url', newUrl);
        this.elements.urlDisplay.textContent = newUrl;
        this.setEditMode(false);
        
        console.log('URL Zabbix сохранен:', newUrl);
        
        // Уведомляем об изменении URL
        if (oldUrl !== newUrl) {
            this.notifyUrlChange(newUrl, oldUrl);
        }
        
        return true;
    }

    notifyUrlChange(newUrl, oldUrl) {
        // Создаем пользовательское событие для уведомления об изменении URL
        const event = new CustomEvent('zabbixUrlChanged', {
            detail: { newUrl, oldUrl }
        });
        window.dispatchEvent(event);
    }

    setEditMode(isEdit) {
        const { urlInput, urlDisplay, toggleBtn } = this.elements;

        if (isEdit) {
            urlInput.style.display = 'block';
            urlDisplay.style.display = 'none';
            urlInput.disabled = false;
            toggleBtn.textContent = 'Сохранить';
            toggleBtn.classList.remove('edit-mode');
        } else {
            urlInput.style.display = 'none';
            urlDisplay.style.display = 'block';
            urlInput.disabled = true;
            toggleBtn.textContent = 'Изменить';
            toggleBtn.classList.add('edit-mode');
        }
    }

    validateUrl(url) {
        if (!url) return false;
        
        try {
            new URL(url);
            return true;
        } catch {
            // Проверим относительный путь или простой домен
            return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(url) || 
                   /^[a-zA-Z0-9.-]+[a-zA-Z0-9]+(:[0-9]+)?\/?/.test(url);
        }
    }

    showValidationError(message) {
        // Можно использовать более красивое отображение ошибок
        alert(message);
    }

    getUrl() {
        return this.zabbix_url;
    }
}