# 📊 MATRIZ DE REPORTES ANALIZADOS (V2.1 - ACTUALIZADO)

| ID REPORTE | CATEGORÍA | COMPLEJIDAD | HORAS | FACTOR DE RIESGO |
| :--- | :--- | :--- | :--- | :--- |
| CONR30019TXT | Contable | **EXTREMA** | **50.0** | **Saldos contables (Riesgo Crítico de Fórmula)** |
| CONR50210 | Contable | ALTA | 32.0 | Relación jerárquica 1:N y auditoría |
| CONR30524 | Cobranzas | ALTA | 30.0 | 4 Queries cruzadas y totales dobles |

**NOTAS DE REVISIÓN (CONR30019TXT):**
- **Desarrollo**: 26.0h | **QA**: 18.5h | **Buffer**: 5.5h.
- **Alerta**: Requiere testing de regresión de 12 meses para validar suma acumulada. No admite errores de redondeo.