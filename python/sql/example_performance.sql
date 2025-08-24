-- Task Name: Анализ производительности триггеров
-- Description: Получение статистики выполнения триггеров за последние 24 часа

SELECT 
    t.triggerid, 
    t.description,
    COUNT(e.eventid) as execution_count,
    AVG(CASE WHEN e.value = 1 THEN 1 ELSE 0 END) as problem_ratio
FROM triggers t
LEFT JOIN events e ON t.triggerid = e.objectid AND e.source = 0
WHERE e.clock >= EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours')
GROUP BY t.triggerid, t.description
HAVING COUNT(e.eventid) > 0
ORDER BY execution_count DESC
LIMIT 50;