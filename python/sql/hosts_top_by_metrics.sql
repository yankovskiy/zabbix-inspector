-- Task Name: Топ-30 хостов по количеству метрик
-- Description: Выборка хостов с наибольшим количеством элементов данных и неподдерживаемых метрик

WITH host_metrics AS (
    SELECT
        h.hostid,
        h.host,
        COUNT(i.itemid) AS total_metrics,
        COUNT(CASE WHEN i.status = 1 THEN 1 END) AS unsupported_metrics
    FROM hosts h
    LEFT JOIN items i ON h.hostid = i.hostid
    WHERE h.status IN (0, 1)  -- Активные и неактивные хосты (исключаем шаблоны)
      AND h.flags = 0         -- Исключаем discovered хосты
    GROUP BY h.hostid, h.host
),
top_total AS (
    SELECT hostid, host, total_metrics, unsupported_metrics, 'total' AS metric_type
    FROM host_metrics
    ORDER BY total_metrics DESC
    LIMIT 30
),
top_unsupported AS (
    SELECT hostid, host, total_metrics, unsupported_metrics, 'unsupported' AS metric_type
    FROM host_metrics
    WHERE unsupported_metrics > 0
    ORDER BY unsupported_metrics DESC
    LIMIT 30
)
SELECT DISTINCT
    hostid,
    host,
    total_metrics,
    unsupported_metrics
FROM (
    SELECT hostid, host, total_metrics, unsupported_metrics FROM top_total
    UNION
    SELECT hostid, host, total_metrics, unsupported_metrics FROM top_unsupported
) combined
ORDER BY total_metrics DESC;