Criterio de respuesta
Compatible con protocolos Squad
Orientada a lectura por MarTwin
Resumida
Directa
Operativa
Sin relleno
Formato que voy a priorizar
Contexto
Hallazgo
Impacto
Acción recomendada
Salida final o entregable
Estilo
Frases cortas
Prioridad a decisión y ejecución
Menos explicación teórica
Más síntesis útil
Cuando haga falta, marco riesgo, bloqueo y próximo paso
Ejemplo de tono esperado

Contexto: reporte CONR30522SSNE con diferencias en totales por ramo.
Hallazgo: el render ya replica estructura, pero los acumulados siguen inconsistentes respecto al original.
Impacto: el reporte no está validado funcionalmente.
Acción recomendada: revisar lógica de agrupación y cálculo de subtotales por ramo antes de cerrar QA.
Salida final: avance visual OK, validación numérica pendiente.

Ya tomo ese marco para las próximas respuestas.

dame un informe general bien detallado de la migracion de los 32 reportes para alimentar a marTwin

Voy a consolidar todo en formato útil para MarTwin: panorama general, arquitectura, flujo, estado, problemas recurrentes, riesgos y patrón de trabajo. Luego te lo dejo en bloque listo para copiar.

Thought for 13s

Informe general de migración de los 32 reportes

Destino: MarTwin Pro
Compatibilidad: Protocolo Squad
Objetivo: dejar consolidado el contexto funcional, técnico y operativo de la migración para reutilización, asistencia automatizada, documentación y aceleración de futuras conversiones.

1. Resumen ejecutivo

La migración consiste en convertir un conjunto de 32 reportes legados de Oracle Reports (RDF) a un motor propio basado en Node.js + HTML + PDF, utilizado en el ecosistema Zurich Santander.

El trabajo no es una simple traducción de tecnología. En la práctica implica:

reconstruir la lógica de negocio
reinterpretar queries complejas
reproducir layouts históricos
preservar totales, agrupaciones, fórmulas y cortes de página
comparar contra el comportamiento del reporte original
adaptar todo al contrato del nuevo motor

El desafío principal no está sólo en “hacer que renderice”, sino en lograr que el resultado migrado sea funcionalmente equivalente al original en:

datos
orden
subtotales
totales generales
reglas de visualización
estética documental
paginación
tolerancia a nulos
performance aceptable
2. Objetivo real de la migración
Contexto

El legado está construido en Oracle Reports, con dependencias en:

RDF
fórmulas PL/SQL
triggers de formato
agrupaciones implícitas
ruptura por grupos
lógica embebida en paquetes Oracle
convenciones de render propias del viejo entorno
Hallazgo

El objetivo de la migración no es “reescribir reportes”, sino desacoplar la generación documental hacia una arquitectura moderna basada en API, HTML y PDF.

Impacto

Cada reporte migrado pasa a depender de un pipeline más mantenible, versionable y desplegable, pero a cambio exige reconstrucción explícita de reglas que antes estaban “ocultas” dentro del RDF.

Acción recomendada

MarTwin debe asumir desde el inicio que una migración de Oracle Reports implica estas 5 capas:

lectura del legado
reconstrucción del modelo de datos
adaptación SQL
replicación visual
validación contra original
3. Stack técnico de destino
Backend / motor
Node.js 18+
generación de HTML y PDF
despliegue en entorno corporativo con restricciones operativas
consumo de base Oracle
Base de datos
Oracle
queries complejas sobre tablas operativas, contables, siniestros, reaseguros, certificados, egresos, órdenes y procesos
Repositorio / motor de reportes
repo identificado como zs-core-html
enfoque basado en “modelo de reporte” versionado
Contrato del modelo

Cada reporte se define como un objeto JS con esta estructura:

export default {
  name,
  effectiveDate,
  description,
  params,
  queries,
  layout
}
Endpoints principales del motor
POST /sources → subir modelo
GET /sources/:name → obtener última versión
GET /sources/:name/:current_date → obtener versión vigente a una fecha
GET /api/v2/html/:name → render HTML
GET /api/v2/pdf/:name → render PDF
Modo debug

Uso frecuente de parámetros tipo:

mode=dev
debug=true

Esto permite inspeccionar comportamiento del motor, depuración de consultas y validación del render.

4. Naturaleza del trabajo de migración
Lo que se recibe del legado

Por lo general se parte de:

nombre del reporte
RDF original
screenshots o salida PDF previa
conocimiento parcial de queries
fórmulas PL/SQL
triggers de formato
nombres de parámetros
tablas y paquetes relacionados
Lo que se construye en destino

Se genera:

definición params
bloque queries
layout HTML completo
formateo tipado por alias
lógica de loops
lógica de agrupación y totales
condiciones de visualización
estructura compatible con PDF final
Dificultad real

El RDF suele tener comportamiento implícito.
Cuando se migra, eso deja de existir y hay que volverlo explícito.

Ejemplos:

una fórmula que en Oracle resolvía horario vacío
un trigger de formato que reemplazaba 00:00 por puntos
agrupaciones por ramo
subtotales por provincia
filtros invisibles aplicados por el motor anterior
cortes de página que dependían de grupos del RDF
5. Convenciones del motor nuevo
Alias tipados

Las columnas SQL se devuelven con formato enriquecido, por ejemplo:

"Campo|string|start"
"Importe|money|end"
"Cantidad|int|center"
"Fecha|date|center"
"Porcentaje|percent-2|end"
Beneficio

Esto permite que el motor aplique:

formato numérico
alineación
representación de fechas
presentación consistente en HTML/PDF
Placeholders

Se usan referencias de layout como:

#{query.campo}# para primer registro o acceso directo
#[query]# ... #[/query]# para iterar
Riesgo

El motor es sensible al uso incorrecto de loops o wrappers.
Algunos bloques que en teoría deberían iterar, en la práctica rompen el render o generan comportamientos frágiles.

Regla operativa útil

Cuando un bloque representa un único valor o cabecera, conviene preferir:

#{Q_X.CAMPO}#

Cuando representa filas, usar el iterador con mucho control.

6. Flujo operativo de una migración típica
Paso 1. Identificación del reporte

Se ubica el programa legado y su contexto:

código de reporte
orden / suborden
secuencia
parámetros esperados

Tablas usadas frecuentemente:

CART_PRELACIONES
CART_ORDENES_EJECUTADAS
CART_ORDENES_PROCESOS
Paso 2. Comprensión del rango temporal

Muchos reportes dependen de NU_SECUENCIA, que suele resolverse contra:

CAOS_FE_A
CAOS_FE_B

Esto determina:

fecha_desde
fecha_hasta

A veces con:

LEAST(CAOS_FE_A, CAOS_FE_B)
GREATEST(CAOS_FE_A, CAOS_FE_B)
y en ciertos casos LAST_DAY(...)
Paso 3. Reconstrucción SQL

Se rehacen queries para:

cabecera
detalle
subtotales
totales
bloques complementarios
tablas auxiliares
Paso 4. Replicación visual

Se arma HTML para parecerse al Oracle original:

tamaños
columnas
orden
títulos
bloques documentales
fondos
líneas
espaciados
cortes de página
Paso 5. Validación

Se compara contra original usando:

salida previa
RecNet
pruebas directas
conteos
montos
estructura visual
Paso 6. Corrección

Ajustes típicos:

null safety
filtros
joins
duplicados
subtotales
orden
paginado
performance
7. Estado general del frente de trabajo
Panorama

El proyecto abarca 32 reportes.
En distintos momentos del proceso hubo un avance muy alto sobre el universo total, con la mayoría ya migrados o encaminados.

Hallazgo operativo

La complejidad no está distribuida de forma pareja.
Hay reportes “rápidos” y otros que concentran gran parte del esfuerzo total.

Regla práctica

Un grupo reducido de reportes suele consumir desproporcionadamente:

análisis
pruebas
tuning
iteraciones con negocio
comparación con original
Conclusión para MarTwin

No debe estimar por cantidad de reportes solamente.
Debe ponderar:

complejidad SQL
dependencia de paquetes
peso visual
volumen de datos
sensibilidad contable
paginación histórica
8. Tipología de reportes migrados

Dentro del universo trabajado aparecen al menos estas familias:

8.1 Reportes de caja / egresos / pagos

Ejemplo: CAJR30400, CAJR30401, otros del frente CAJR.

Características:

datos financieros
cuentas bancarias
cheques / transferencias
recibos indemnizatorios
retenciones
montos sensibles
necesidad de precisión alta
8.2 Reportes contables / reaseguro / SSN

Ejemplos:

CONR30522SSNE
CONR30529
CONR30529TXT
CONR30540B
CONR30527

Características:

alto volumen
agrupación por ramo
consolidaciones
relaciones con SSN
lógica por secuencia
performance delicada
8.3 Reportes de siniestros

Ejemplos:

SINR30500SSN
SINR30490
otros SINR

Características:

datos descriptivos
fórmulas de presentación
hashes / CUIS / CUIP
bloques documentales complejos
sensibilidad visual importante
9. Reportes especialmente sensibles o complejos
9.1 CONR30522SSNE
Contexto

Reporte vinculado a emisiones e invalidaciones con fuerte componente de reaseguro y desglose por ramo.

Problemas observados
diferencias entre totales por ramo
subtotales inconsistentes
complejidad en joins con RRC
necesidad de agrupar correctamente
validación contra lógica original no siempre evidente
performance sensible
Particularidad

Se trabajó sobre integración entre:

BATB_REASEG_RRC
CART_OPERACIONES_DIARIAS
relaciones de ramo SSN
Riesgo

Puede renderizar “bien” visualmente y aun así estar mal funcionalmente si:

duplica filas
pierde filtros
infla montos
reduce total general
Lección para MarTwin

Nunca cerrar este tipo de reporte sólo por validación visual.

9.2 CONR30540B
Contexto

Declaración jurada de impuestos sellados.

Problemas observados
divergencias por parámetros
diferencias entre nombres de parámetros esperados
ejecuciones largas
alto volumen de filas
líneas de totales difíciles de replicar
Hallazgo concreto

Hubo diferencias por naming de parámetros tipo:

fecha_desde / fecha_hasta
vs
fe_desde / fe_hasta
Impacto

Un reporte puede parecer roto cuando en realidad recibe parámetros distintos a los originales.

Lección

MarTwin debe detectar enseguida:

desalineación de nombres
tipos incorrectos
defaults faltantes
filtros mal conectados
9.3 CONR30529 / CONR30529TXT
Contexto

Reportes de análisis / exportación RRC.

Problemas observados
queries muy pesadas
dependencia temporal por NU_SECUENCIA
necesidad de evaluar índice
demora extrema en ejecución
ajuste de fecha hasta usando LAST_DAY
Riesgo

Timeouts y bloqueo operativo.

Lección

No asumir que más optimización SQL resuelve todo; a veces el cuello está en:

volumen bruto
falta de índices
estrategia de joins
cardinalidad
topología del entorno
9.4 CAJR30401
Contexto

Resumen de pago.

Problemas observados
montos que no coincidían
títulos de retenciones
posibles confusiones semánticas entre campos
diferencias funcionales con original
Lección

En reportes financieros, un label mal interpretado o una columna tomada de otra fuente puede arruinar la validación.

9.5 SINR30500SSN
Contexto

Registro de denuncias de siniestros.

Problemas observados
layout frágil
loops delicados
integración con funciones tipo hash/CUIS
sensibilidad del motor ante estructuras iterativas
Lección

Cuando el layout empieza a fallar por estructura, conviene simplificar bloques y desacoplar.

9.6 SINR30490
Contexto

Carátula de siniestro.

Problemas observados
reorganización de secciones
necesidad de tipado correcto por alias
bloques de datos con estructura tipo ficha
Lección

No todo reporte es tabular. Algunos son documentales y exigen diseño más manual.

10. Fuentes de datos y tablas relevantes

A lo largo de las migraciones aparecen de forma recurrente tablas como:

CART_ORDENES_PROCESOS
CART_ORDENES_EJECUTADAS
CART_PRELACIONES
CART_OPERACIONES_DIARIAS
CART_CERTIFICADOS
CART_RAMOS_POLIZAS
CONT_RELACION_RAMOS_SSN
BATB_REASEG_RRC
tablas de caja / egresos / cuentas bancarias
tablas de siniestros y estados
Patrones frecuentes
filtros por secuencia
joins por sucursal / ramo / póliza / certificado / endoso
derivación de fechas por orden de proceso
mapping entre ramos internos y ramos SSN
uso de catálogos de estados y significados
11. Dependencias del legado Oracle
Paquetes y funciones

En varios casos hubo que investigar o considerar dependencias como:

RECTOR.OBTENER_CUIP
DESL10000.FUNC_DESC_COBERTURA
OBTENER_CUIS
procedimientos del esquema original
lectura vía ALL_SOURCE para entender lógica
Problema real

Muchas reglas no estaban documentadas.
La única fuente era:

el RDF
el package
la salida final observada
Acción recomendada

MarTwin debe registrar cada dependencia en una matriz:

Dependencia	Tipo	Uso	Sustitución	Riesgo
Package Oracle	consulta/formato	alto	query o función equivalente	medio/alto
Fórmula RDF	visual o semántica	medio	CASE/DECODE/HTML	medio
Trigger de formato	visual	medio	SQL o layout	bajo/medio
12. Problemas recurrentes detectados
12.1 Performance
Síntomas
tiempos de respuesta largos
timeouts
consultas de minutos
reporte que a veces sale y a veces no
Causas frecuentes
tablas enormes
joins pesados
filtros poco selectivos
rangos temporales amplios
ausencia de índices
motor corriendo en infraestructura con timeout
12.2 Duplicación o inflación de datos
Síntomas
subtotal por ramo mayor al esperado
total general menor o mayor
filas repetidas
diferencias con Oracle
Causas frecuentes
join mal armado
cardinalidad 1:N no contemplada
relación incompleta por certificado/endoso/póliza
falta de agrupación intermedia
12.3 Parámetros inconsistentes
Síntomas
query no devuelve nada
reporte parece vacío
el original sí trae datos
Causas frecuentes
nombre distinto del parámetro
formato de fecha
secuencia inválida
orden/suborden incorrectos
ambiente de BD distinto
12.4 Lógica de presentación oculta
Síntomas
el dato aparece distinto al original
el original mostraba puntos, espacios o texto fijo
horarios o campos vacíos se muestran feo
Causas frecuentes
fórmulas del RDF no migradas
triggers visuales olvidados
defaults implícitos no documentados
12.5 Fragilidad del layout
Síntomas
bloques que desaparecen
loops que rompen estructura
tablas que no cierran
saltos de página erráticos
Causas
motor sensible a wrappers
mezcla de bloques iterativos y no iterativos
HTML excesivamente dinámico
condiciones de render poco robustas
13. Restricciones del entorno
OpenShift / infraestructura

Se observó un timeout operativo de alrededor de 30 segundos en ciertos contextos del entorno.

Impacto

Reportes pesados pueden fallar aunque la lógica sea correcta.

Conclusión

La performance final depende de:

SQL
base
red
infraestructura
motor
timeout de plataforma

MarTwin no debe atribuir todo a “query mala”.

14. Estrategia de validación usada
Validación funcional

Se contrasta:

cantidad de registros
sumatorias
subtotales
orden
campos visibles
datos nulos
títulos
agrupaciones
Validación visual

Se contrasta:

cabeceras
anchos
alineación
tablas
colores
cortes
espaciados
estructura general de documento
Validación contra original

Herramientas y fuentes:

Oracle Reports original
RecNet
PDFs históricos
salidas reales del negocio
Criterio correcto

“Se parece” no alcanza.
Tiene que:

renderizar
cuadrar
y respetar la lógica original
15. Criterio de estimación aplicado

Se manejó una escala aproximada:

Baja complejidad: 17 horas
Media complejidad: 24 horas
Alta complejidad: 32 horas
Factores que suben complejidad
varias queries
fórmulas RDF complejas
tablas pesadas
agregaciones por grupo
layout documental
paginación específica
dependencias de paquetes
necesidad de tuning
validación numérica difícil
16. Aprendizajes clave del proyecto
16.1 El mayor costo está en entender

Muchas horas no se van en codificar, sino en:

descubrir lógica oculta
seguir trazas
deducir filtros
encontrar la tabla correcta
validar contra original
16.2 Oracle Reports encapsulaba mucho comportamiento

Al migrar, todo eso hay que volverlo explícito:

formato
grupo
total
orden
visibilidad
default
16.3 El HTML final importa mucho

No alcanza con traer datos.
El valor del trabajo está también en:

representar correctamente
sostener identidad del documento
generar PDF usable
16.4 La secuencia es crítica

NU_SECUENCIA no es un simple parámetro: suele ser la llave para reconstruir el período y el contexto de ejecución.

16.5 Algunos bugs no son de código

A veces la causa raíz es:

base diferente
secuencia sin datos
ambiente inconsistente
timeout de plataforma
información fuente incompleta
17. Riesgos que MarTwin debe contemplar
Riesgo 1. Dar por cerrado un reporte sólo porque renderiza

Error grave.
Siempre validar totales y agrupaciones.

Riesgo 2. Subestimar la lógica implícita del RDF

Muchos comportamientos no están visibles a primera lectura.

Riesgo 3. Perseguir performance sin revisar semántica

Una query puede ser rápida y estar mal.

Riesgo 4. Intentar una solución genérica total

No todos los reportes admiten el mismo patrón.
Hay que equilibrar reutilización con tratamiento específico.

Riesgo 5. Confiar ciegamente en parámetros heredados

Puede haber nombres o formatos divergentes.

18. Patrón recomendado para alimentar a MarTwin

MarTwin debería procesar cada reporte con esta estructura:

Ficha mínima por reporte
código
nombre funcional
objetivo
parámetros
origen temporal
queries principales
dependencias Oracle
bloques visuales
lógica de grupos
subtotales/totales
riesgos
estado de validación
Pipeline sugerido
leer metadata del reporte
detectar parámetros y secuencia
identificar tablas base
reconstruir período
separar cabecera/detalle/totales
detectar fórmulas y triggers
traducir a SQL/HTML
validar contra original
registrar diferencias
clasificar complejidad y riesgo
19. Recomendaciones concretas para MarTwin
Recomendación 1

Mantener una base de conocimiento por reporte, no sólo snippets sueltos.

Recomendación 2

Separar siempre:

lógica de datos
lógica visual
lógica de validación
Recomendación 3

Registrar cada inconsistencia con este formato:

esperado
obtenido
hipótesis
tabla afectada
join sospechoso
próximo paso
Recomendación 4

Tener plantillas de reporte por familia:

financiero
siniestro
SSN/reaseguro
documental/ficha
Recomendación 5

Incorporar un módulo de diagnóstico que pregunte:

¿depende de NU_SECUENCIA?
¿requiere LAST_DAY?
¿tiene agrupación por ramo/provincia?
¿usa package Oracle?
¿el total sale de detalle o de query aparte?
¿el layout es tabular o documental?
20. Conclusión general

La migración de los 32 reportes no es un trabajo de conversión mecánica.
Es un proceso de ingeniería inversa + reconstrucción funcional + replicación documental.

Síntesis final para MarTwin
el legado Oracle Reports contiene lógica implícita
la secuencia y las fechas derivadas son críticas
los reportes complejos combinan SQL pesada + layout delicado
validar visualmente no alcanza
el nuevo motor trabaja con params + queries + layout
el principal valor está en lograr equivalencia funcional con salida moderna
los mayores riesgos son performance, duplicados, totales incorrectos y reglas ocultas del RDF