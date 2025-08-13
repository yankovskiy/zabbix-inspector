import { FileUploader } from './modules/fileUploader.js';
import { DataParser } from './modules/dataParser.js';
import { UIUpdater } from './modules/uiUpdater.js';
import { ChartManager } from './modules/chartManager.js';
import { Navigation } from './modules/navigation.js';
import { ProcessTable } from './modules/processTable.js';
import { ZabbixUrlManager } from './modules/zabbixUrlManager.js';
import { ConfigManager } from './modules/configManager.js';
import { utils } from './utils/helpers.js';
import { APP_CONFIG, ANIMATION_DELAYS } from './config/constants.js';

class ZabbixAnalyzer {
    constructor() {
        this.diagnosticData = {};
        this.charts = {};

        // Инициализация модулей
        this.dataParser = new DataParser();
        this.navigation = new Navigation();
        this.uiUpdater = new UIUpdater();
        this.chartManager = new ChartManager();
        this.processTable = new ProcessTable();
        this.urlManager = new ZabbixUrlManager();
        this.configManager = new ConfigManager();
        this.fileUploader = new FileUploader(this);

        this.init();
    }

    init() {
        console.log('Инициализация системы анализа Zabbix...');

        // Обновление заголовка приложения
        this.updateAppHeader();

        // Инициализация управления URL Zabbix
        this.urlManager.init();

        // Настройка навигации
        this.navigation.setupNavigation();

        // Настройка загрузки файлов
        this.fileUploader.setupFileUpload();

        // Создание пустых графиков
        this.chartManager.createCharts();

        // Первоначальная анимация
        setTimeout(() => this.navigation.animateMetrics(), ANIMATION_DELAYS.metrics);

        // Обработчик изменения URL Zabbix
        this.setupUrlChangeHandler();

        console.log('Инициализация завершена');
    }

    updateAppHeader() {
        const titleElement = document.getElementById('appTitle');
        const versionElement = document.getElementById('appVersion');
        
        if (titleElement) {
            titleElement.textContent = APP_CONFIG.name;
        }
        if (versionElement) {
            versionElement.textContent = `v${APP_CONFIG.version}`;
        }
    }

    async processData(zipContent) {
        // Парсинг данных из ZIP
        this.diagnosticData = await this.dataParser.processZipFiles(zipContent);

        // Обновление всех страниц
        this.updateAllPages();

        // Переключение на страницу обзора
        this.navigation.showPage('overview');
    }

    updateAllPages() {
        this.uiUpdater.updateOverviewPage(this.diagnosticData);
        this.uiUpdater.updatePerformancePage(this.diagnosticData);
        this.uiUpdater.updateDiagnosticsPage(this.diagnosticData);
        this.uiUpdater.updateVmstatPage(this.diagnosticData);
        this.processTable.updateTable(this.diagnosticData.processes);
        this.configManager.updateConfigPage(this.diagnosticData);
        this.chartManager.updateCharts(this.diagnosticData);
        this.chartManager.createVmstatCharts(this.diagnosticData);
    }

    resetAnalysis() {
        // Очистить данные
        this.diagnosticData = {};

        // Очистить графики
        this.chartManager.destroyCharts();

        // Скрыть элементы загрузки
        this.fileUploader.hideUploadElements();

        // Сбросить содержимое страниц
        utils.resetPageContent();

        // Вернуться на страницу загрузки
        this.navigation.showPage('upload');
    }

    getZabbixUrl() {
        return this.urlManager.getUrl();
    }

    showError(message) {
        utils.showError(message);
    }

    setupUrlChangeHandler() {
        window.addEventListener('zabbixUrlChanged', (event) => {
            console.log('URL Zabbix изменен:', event.detail);
            
            // Если есть данные диагностики, перерисовываем страницу диагностики
            if (this.diagnosticData && this.diagnosticData.diaginfo) {
                this.uiUpdater.updateDiagnosticsPage(this.diagnosticData);
            }
        });
    }

    openZabbixItem(itemid) {
        const baseUrl = this.getZabbixUrl();
        let url = baseUrl;
        
        if (!url.endsWith('/')) {
            url += '/';
        }
        
        url += `items.php?form=update&itemid=${itemid}&context=host`;
        
        window.open(url, '_blank');
    }

    openZabbixLLD(itemid) {
        const baseUrl = this.getZabbixUrl();
        let url = baseUrl;
        
        if (!url.endsWith('/')) {
            url += '/';
        }
        
        url += `host_discovery.php?form=update&itemid=${itemid}&context=host`;
        
        window.open(url, '_blank');
    }
}

// Глобальная инициализация
document.addEventListener('DOMContentLoaded', function () {
    window.zabbixAnalyzer = new ZabbixAnalyzer();
});