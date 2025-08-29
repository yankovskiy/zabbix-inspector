-- Task Name: Анализ событий с активными эскалациями за последние 8 часов
-- Description: Поиск и анализ проблемных событий с активными процессами эскалации для быстрого реагирования на критические ситуации. Включает информацию о возрасте событий, времени до следующего шага эскалации и степени серьезности проблем.

WITH recent_escalations AS (
   -- Находим все события с активными эскалациями за последние 8 часов
   SELECT DISTINCT e.eventid
   FROM escalations esc
   JOIN events e ON esc.eventid = e.eventid
   WHERE esc.nextcheck >= EXTRACT(EPOCH FROM NOW()) - 8 * 3600  -- последние 8 часов
),
events_with_escalations AS (
   -- Соединяем события с их эскалациями и берем минимальный nextcheck для каждого события
   SELECT
       e.eventid,
       e.clock as event_clock,
       e.source,
       e.object,
       e.objectid,
       e.name,
       e.severity,
       e.value,
       MIN(esc.nextcheck) as min_escalation_nextcheck
   FROM events e
   JOIN escalations esc ON e.eventid = esc.eventid
   WHERE e.eventid IN (SELECT eventid FROM recent_escalations)
   GROUP BY e.eventid, e.clock, e.source, e.object, e.objectid, e.name, e.severity, e.value
)
SELECT
   eventid,
   event_clock,
   TO_TIMESTAMP(event_clock) as event_time,
   source,
   object,
   objectid,
   name,
   severity,
   value,
   min_escalation_nextcheck,
   TO_TIMESTAMP(min_escalation_nextcheck) as min_escalation_time,
   (EXTRACT(EPOCH FROM NOW()) - event_clock) / 3600 as event_age_hours,
   (min_escalation_nextcheck - EXTRACT(EPOCH FROM NOW())) / 3600 as escalation_next_hours
FROM events_with_escalations
ORDER BY event_clock ASC  -- Самые старые события первыми
LIMIT 50;