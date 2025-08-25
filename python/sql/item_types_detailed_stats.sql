-- Task Name: Детальная статистика по типам элементов данных
-- Description: Анализ элементов данных по типам с подсчетом количества, статусов и процентных соотношений

SELECT
    i.type as type_id,
    CASE i.type
        WHEN 0 THEN 'Zabbix agent'
        WHEN 1 THEN 'SNMPv1 agent'
        WHEN 2 THEN 'Zabbix trapper'
        WHEN 3 THEN 'Simple check'
        WHEN 4 THEN 'SNMPv2 agent'
        WHEN 5 THEN 'Zabbix internal'
        WHEN 6 THEN 'SNMPv3 agent'
        WHEN 7 THEN 'Zabbix agent (active)'
        WHEN 8 THEN 'Zabbix aggregate'
        WHEN 9 THEN 'Web item'
        WHEN 10 THEN 'External check'
        WHEN 11 THEN 'Database monitor'
        WHEN 12 THEN 'IPMI agent'
        WHEN 13 THEN 'SSH agent'
        WHEN 14 THEN 'TELNET agent'
        WHEN 15 THEN 'Calculated'
        WHEN 16 THEN 'JMX agent'
        WHEN 17 THEN 'SNMP trap'
        WHEN 18 THEN 'Dependent item'
        WHEN 19 THEN 'HTTP agent'
        WHEN 20 THEN 'SNMP agent'
        WHEN 21 THEN 'Script'
        ELSE 'Unknown'
    END as type_name,
    COUNT(*) as total,
    COUNT(CASE WHEN i.status = 0 THEN 1 END) as enabled,
    COUNT(CASE WHEN i.status = 1 THEN 1 END) as disabled,
    COUNT(CASE WHEN rt.state = 1 THEN 1 END) as unsupported,
    COUNT(CASE WHEN i.status = 0 AND rt.state = 0 THEN 1 END) as active_working,
    COUNT(CASE WHEN i.status = 0 AND rt.state = 1 THEN 1 END) as enabled_but_unsupported,
    COUNT(CASE WHEN i.flags = 0 THEN 1 END) as normal,
    COUNT(CASE WHEN i.flags = 1 THEN 1 END) as discovery_rules,
    COUNT(CASE WHEN i.flags = 2 THEN 1 END) as prototypes,
    COUNT(CASE WHEN i.flags = 4 THEN 1 END) as discovered,
    COUNT(DISTINCT i.hostid) as unique_hosts,
    -- Процентные показатели
    ROUND(COUNT(CASE WHEN rt.state = 1 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as unsupported_percent,
    ROUND(COUNT(CASE WHEN i.status = 0 AND rt.state = 0 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as working_percent,
    ROUND(COUNT(CASE WHEN i.status = 0 AND rt.state = 1 THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN i.status = 0 THEN 1 END), 0), 1) as unsupported_of_enabled_percent
FROM items i
LEFT JOIN item_rtdata rt ON i.itemid = rt.itemid
GROUP BY i.type
HAVING COUNT(*) > 0
ORDER BY total DESC;