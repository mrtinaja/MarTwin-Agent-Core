[
  {
    "id": "trm_1775427704413_0",
    "title": "CAJR30450",
    "category": "MIGRACION",
    "priority": "CRITICA",
    "completed": false,
    "metadata": {
      "log_version": "1.0",
      "agent": "ChatGPT",
      "consumer": "MarTwin",
      "operation_type": "report_quotation",
      "project": {
        "client": "Zurich",
        "vendor": "Squad Alpha",
        "phase": "Fase 2",
        "source_technology": "Oracle Reports RDF",
        "target_technology": "HTML/JS report engine"
      },
      "report": {
        "name": "CAJR30450",
        "file_name": "CAJR30450.rdf",
        "module": "Caja/Egresos",
        "category": "report"
      },
      "quotation": {
        "complexity": "Alta",
        "hours": {
          "development": 24,
          "qa": 28,
          "buffer": 5,
          "total": 57
        },
        "confidence": "media_alta"
      },
      "analysis": {
        "context": "Reporte de listado de órdenes de pago emitidas, filtrado por NU_SECUENCIA, con derivación de rango de fechas y clasificación de egresos según tipo. Muestra detalle de egresos, beneficiario, motivo, cheque, importe, estado de egreso, siniestro y estado del siniestro, e incluye acumulados monetarios por estado operativo del egreso.",
        "technical_findings": {
          "user_parameters": [
            "NU_SECUENCIA"
          ],
          "queries": [
            "Q_EGRESOS",
            "Q_SIN"
          ],
          "groups": [
            "G_EGRESOS",
            "G_SIN"
          ],
          "data_links": [
            {
              "from": "G_EGRESOS.EGRESO",
              "to": "Q_SIN.NU_EGRESO"
            }
          ],
          "formula_columns": [
            "EGR_PROVEED",
            "EGR_SINIESTROS",
            "FECHA_DESDE",
            "FECHA_HASTA",
            "ANULADOS",
            "APROBADOS",
            "AUTORIZADOS",
            "CONFORMADOS",
            "ELABORADOS",
            "ENTREGADOS",
            "VIGENTES"
          ],
          "summary_columns": [
            "CS_ANUL",
            "CS_APROB",
            "CS_AUTORIZ",
            "CS_CONFORM",
            "CS_ELABOR",
            "CS_EMITIDOS",
            "CS_ENTREG"
          ],
          "report_triggers": [
            "BEFORE PARAMETER FORM",
            "AFTER PARAMETER FORM",
            "BEFORE REPORT",
            "BETWEEN PAGES",
            "AFTER REPORT"
          ],
          "program_units": [
            "ANULADOSFORMULA",
            "APROBADOSFORMULA",
            "AUTORIZADOSFORMULA",
            "BEFOREREPORT",
            "CONFORMADOSFORMULA",
            "EGR_PROVEEDFORMULA",
            "EGR_SINIESTROSFORMULA",
            "ELABORADOSFORMULA",
            "ENTREGADOSFORMULA",
            "FECHA_DESDEFORMULA",
            "FECHA_HASTAFORMULA",
            "VIGENTESFORMULA"
          ],
          "layout_complexity": "low_visual_high_functional",
          "layout_notes": "Layout tabular simple con cabecera de período, detalle de egresos y siniestros asociados, y bloque final de acumulados por estado. La complejidad principal no está en la maquetación visual sino en la lógica funcional y en la validación de totales."
        },
        "qa_impact": "Riesgo alto de descuadre en totales por estado, diferencias en la resolución de fórmulas respecto de Oracle Reports, problemas de cardinalidad entre egresos y siniestros asociados, y posibles inconsistencias en filtros derivados por fórmulas de contexto.",
        "recommended_action": [
          "Separar el contexto de ejecución por NU_SECUENCIA en una capa previa que resuelva fecha_desde, fecha_hasta, EGR_PROVEED y EGR_SINIESTROS.",
          "Reescribir Q_EGRESOS con joins ANSI y lógica de filtros explícita.",
          "Validar el enlace con Q_SIN para evitar duplicación o cambio de cardinalidad respecto del reporte original.",
          "Migrar los acumulados por estado fuera del layout, de forma controlada y testeable.",
          "Ejecutar QA por detalle"
        ]
      }
    }
  },
  {
    "id": "trm_1775427777888_0",
    "title": "CAJR30436",
    "category": "MIGRACION",
    "priority": "ALTA",
    "completed": false,
    "metadata": {
      "log_version": "1.0",
      "agent": "ChatGPT",
      "consumer": "MarTwin",
      "operation_type": "report_analysis",
      "project": {
        "client": "Zurich",
        "vendor": "Squad Alpha",
        "phase": "Fase 2",
        "source_technology": "Oracle Reports RDF",
        "target_technology": "HTML/JS report engine"
      },
      "report": {
        "name": "CAJR30436",
        "module": "Desconocido",
        "description": "Reporte de detalle de carreras 30436",
        "complexity": "MEDIA",
        "reason": "Variedad de consultas con joins moderados, performance delicada",
        "risk": "Performance delicada, validación intermedia",
        "priority": "MEDIA"
      }
    }
  },
  {
    "id": "trm_1775427777888_1",
    "title": "CARR30490",
    "category": "MIGRACION",
    "priority": "MEDIA",
    "completed": false,
    "metadata": {
      "log_version": "1.0",
      "agent": "ChatGPT",
      "consumer": "MarTwin",
      "operation_type": "report_analysis",
      "project": {
        "client": "Zurich",
        "vendor": "Squad Alpha",
        "phase": "Fase 2",
        "source_technology": "Oracle Reports RDF",
        "target_technology": "HTML/JS report engine"
      },
      "report": {
        "name": "CARR30490",
        "module": "Desconocido",
        "description": "Reporte de seguimiento de carreras 30490",
        "complexity": "MEDIA",
        "reason": "Consultas con agrupaciones y totales, salida TXT",
        "risk": "Layout con secciones, validación funcional intermedia",
        "priority": "MEDIA"
      }
    }
  },
  {
    "id": "trm_1775427777888_2",
    "title": "CONR30522",
    "category": "MIGRACION",
    "priority": "ALTA",
    "completed": false,
    "metadata": {
      "log_version": "1.0",
      "agent": "ChatGPT",
      "consumer": "MarTwin",
      "operation_type": "report_analysis",
      "project": {
        "client": "Zurich",
        "vendor": "Squad Alpha",
        "phase": "Fase 2",
        "source_technology": "Oracle Reports RDF",
        "target_technology": "HTML/JS report engine"
      },
      "report": {
        "name": "CONR30522",
        "module": "Emisiones",
        "description": "Reporte de emisiones 30522",
        "complexity": "ALTA",
        "reason": "Lógica compleja de emisiones / invalidaciones, totales por ramo, validación contra Oracle Reports",
        "risk": "Dificultad de replicar fórmulas heredadas",
        "priority": "ALTA"
      }
    }
  },
  // Resto de reportes analizados...
]
``` 

Si necesitas más fichas para los reportes restantes, no dudes en pedírmelas.
agregar a tarear de testeo en /tasks
Aquí tienes la tarea agregada al documento JSON en formato de tareas:

```json
{
  "id": "trm_1775427777888_3",
  "title": "CONR30522",
  "category": "MIGRACION",
  "priority": "ALTA",
  "completed": false,
  "metadata": {
    "log_version": "1.0",
    "agent": "ChatGPT",
    "consumer": "MarTwin",
    "operation_type": "report_analysis",
    "project": {
      "client": "Zurich",
      "vendor": "Squad Alpha",
      "phase": "Fase 2",
      "source_technology": "Oracle Reports RDF",
      "target_technology": "HTML/JS report engine"
    },
    "report": {
      "name": "CONR30522",
      "module": "Emisiones",
      "description": "Reporte de emisiones 30522",
      "complexity": "ALTA",
      "reason": "Lógica compleja de emisiones / invalidaciones, totales por ramo, validación contra Oracle Reports",
      "risk": "Dificultad de replicar fórmulas heredadas",
      "priority": "ALTA"
    }
  }
}