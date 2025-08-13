import { utils } from '../utils/helpers.js';
import { APP_CONFIG, MESSAGES } from '../config/constants.js';

export class FileUploader {
    constructor(app) {
        this.app = app;
        this.uploadArea = null;
        this.fileInput = null;
    }

    setupFileUpload() {
        console.log('Настройка загрузки файлов...');

        this.uploadArea = document.querySelector('.upload-area');
        this.fileInput = document.getElementById('fileInput');

        if (!this.uploadArea || !this.fileInput) {
            console.error('Upload elements not found:', {
                uploadArea: !!this.uploadArea,
                fileInput: !!this.fileInput
            });
            return;
        }

        console.log('Upload elements found, setting up handlers...');

        this.setupDragAndDrop();
        this.setupFileInput();
        this.preventDefaultDragDrop();

        console.log('File upload setup completed');
    }

    setupDragAndDrop() {
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });

        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });

        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });
    }

    setupFileInput() {
        this.fileInput.addEventListener('change', (e) => {
            console.log('File input changed, files:', e.target.files.length);
            if (e.target.files.length > 0) {
                console.log('Processing file:', e.target.files[0].name);
                this.handleFile(e.target.files[0]);
            }
        });
    }

    preventDefaultDragDrop() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });
    }

    async handleFile(file) {
        const errorMessage = document.getElementById('errorMessage');
        const processingMessage = document.getElementById('processingMessage');
        const fileInfo = document.getElementById('fileInfo');
        const resetBtn = document.getElementById('resetBtn');

        // Сброс предыдущих сообщений
        this.hideAllMessages();
        processingMessage.style.display = 'flex';

        try {
            if (!this.validateFile(file)) {
                throw new Error('Поддерживаются только ZIP архивы');
            }

            // Показать информацию о файле
            this.displayFileInfo(file);

            // Распаковать ZIP
            const zipContent = await this.unpackZip(file);

            // Проверить версию сборщика диагностических данных и получить версию для отображения
            const collectorVersion = await this.validateCollectorVersion(zipContent);

            // Показать количество файлов
            document.getElementById('fileCount').textContent = Object.keys(zipContent.files).length;
            
            // Показать версию сборщика
            document.getElementById('collectorVersion').textContent = collectorVersion;
            
            fileInfo.style.display = 'block';

            // Обработать файлы через основное приложение
            await this.app.processData(zipContent);

            processingMessage.style.display = 'none';
            resetBtn.style.display = 'inline-block';

        } catch (error) {
            processingMessage.style.display = 'none';
            this.app.showError('Ошибка при обработке файла: ' + error.message);
        }
    }

    validateFile(file) {
        return file.name.toLowerCase().endsWith('.zip');
    }

    displayFileInfo(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = utils.formatFileSize(file.size);
    }

    async unpackZip(file) {
        const zip = new JSZip();
        return await zip.loadAsync(file);
    }

    async validateCollectorVersion(zipContent) {
        console.log('validateCollectorVersion method called');
        // Поиск файла 0_version.txt в любой папке архива
        let versionFile = null;
        
        // Ищем файл по имени в архиве
        for (const [filePath, file] of Object.entries(zipContent.files)) {
            if (filePath.endsWith('0_version.txt') && !file.dir) {
                versionFile = file;
                break;
            }
        }
        
        if (!versionFile) {
            throw new Error('Файл версии не найден. Возможно, диагностические данные собраны устаревшим сборщиком.');
        }
        
        // Читаем содержимое файла версии
        const versionContent = await versionFile.async('text');
        
        // Извлекаем версию из последней строки файла (убираем комментарии и пустые строки)
        const lines = versionContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        if (lines.length === 0) {
            throw new Error('Не удалось определить версию сборщика диагностических данных');
        }
        
        const collectorVersion = parseInt(lines[lines.length - 1].trim());
        const minRequiredVersion = APP_CONFIG.minDiagCollectorVersion;
        
        if (isNaN(collectorVersion)) {
            throw new Error('Некорректный формат версии в файле 0_version.txt');
        }
        
        if (collectorVersion < minRequiredVersion) {
            throw new Error(`${MESSAGES.errors.versionTooOld} ${minRequiredVersion}, обнаружена версия ${collectorVersion}`);
        }
        
        console.log(`Версия сборщика диагностических данных: ${collectorVersion} (требуется: ${minRequiredVersion})`);
        
        // Возвращаем версию для отображения в UI
        return lines[lines.length - 1].trim();
    }

    hideAllMessages() {
        const errorMessage = document.getElementById('errorMessage');
        const fileInfo = document.getElementById('fileInfo');
        const resetBtn = document.getElementById('resetBtn');

        errorMessage.style.display = 'none';
        fileInfo.style.display = 'none';
        resetBtn.style.display = 'none';
    }

    hideUploadElements() {
        this.hideAllMessages();

        // Очистить input
        if (this.fileInput) {
            this.fileInput.value = '';
        }

        // Скрыть сообщение о процессе
        const processingMessage = document.getElementById('processingMessage');
        if (processingMessage) {
            processingMessage.style.display = 'none';
        }
    }
}