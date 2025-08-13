import { ANIMATION_DELAYS } from '../config/constants.js';

export class Navigation {
    constructor() {
        this.currentPage = 'upload';
    }

    setupNavigation() {
        console.log('Настройка навигации...');

        // Обработчики для навигации
        const navItems = document.querySelectorAll('.nav-item');
        console.log(`Найдено навигационных элементов: ${navItems.length}`);

        navItems.forEach((item, index) => {
            const pageId = item.getAttribute('data-page');
            console.log(`Навигационный элемент ${index}: ${pageId}`);

            item.addEventListener('click', (e) => {
                e.preventDefault();
                console.log(`Клик по навигации: ${pageId}`);
                this.showPage(pageId);
            });
        });
    }

    showPage(pageId) {
        console.log(`Переключение на страницу: ${pageId}`);

        // Скрыть все страницы
        const pages = document.querySelectorAll('.page');
        console.log(`Найдено страниц: ${pages.length}`);

        pages.forEach(page => {
            page.classList.remove('active');
        });

        // Убрать активность с навигации
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Показать выбранную страницу
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageId;
            console.log(`Страница ${pageId} активирована`);
        } else {
            console.error(`Страница с ID ${pageId} не найдена`);
        }

        // Активировать соответствующий пункт навигации
        const navItem = document.querySelector(`[data-page="${pageId}"]`);
        if (navItem) {
            navItem.classList.add('active');
            console.log(`Навигационный элемент ${pageId} активирован`);
        } else {
            console.error(`Навигационный элемент для ${pageId} не найден`);
        }

        // Анимировать метрики с задержкой
        setTimeout(() => this.animateMetrics(), ANIMATION_DELAYS.navigation);

        // Закрыть боковую панель на мобильных
        this.closeMobileSidebar();
    }

    animateMetrics() {
        const metrics = document.querySelectorAll('.metric-value, .status-indicator');
        metrics.forEach((metric, index) => {
            metric.style.opacity = '0';
            metric.style.transform = 'translateY(10px)';

            setTimeout(() => {
                metric.style.transition = 'all 0.3s ease';
                metric.style.opacity = '1';
                metric.style.transform = 'translateY(0)';
            }, index * 30);
        });
    }

    closeMobileSidebar() {
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.remove('open');
            }
        }
    }

    getCurrentPage() {
        return this.currentPage;
    }
}