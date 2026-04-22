export default {
  name: "CONR30524SSN",
  effectiveDate: "2025-01-01",
  description: "Registro de Cobranzas por Ramo SSN",

  params: {
    NU_SECUENCIA: { type: "number", required: true },
    RAMOSSN: { type: "string", required: true },
    MAX_FILAS: { type: "number", required: false },
  },

queries: {

MAIN: `SELECT 75 AS "ORDEN" FROM DUAL`,

Q_2: `
SELECT
  TRIM(USER) AS "USUARIO|string|start",
  NVL(TO_CHAR(U.CAUS_CAGR_CD_COMPANIA), '-') AS "CD_COMPANIA|string|start",
  NVL(TO_CHAR(U.CAUS_CAGR_CD_UNIDAD_ADM), '-') AS "CD_UNIDAD_ADM|string|start",
  NVL(G.CAGR_NM_UNIDAD_ADM, 'SIN UNIDAD') AS "NM_UNIDAD_ADM|string|start",
  TO_CHAR(SYSDATE,'DD/MM/YYYY') AS "FECHA_REP|string|center",
  TO_CHAR(SYSDATE,'HH24:MI') AS "HORA_REP|string|center",
  '1' AS "PAGINA|string|center",
  'CONR30524SSN' AS "REF|string|center"
FROM DUAL D
LEFT JOIN CART_USUARIOS U
  ON TRIM(UPPER(U.CAUS_CD_USUARIO)) = TRIM(UPPER(USER))
LEFT JOIN CART_GERENCIAS G
  ON G.CAGR_CD_COMPANIA = U.CAUS_CAGR_CD_COMPANIA
 AND G.CAGR_CD_UNIDAD_ADM = U.CAUS_CAGR_CD_UNIDAD_ADM
FETCH FIRST 1 ROWS ONLY
`,

PARAMS: `
WITH P AS (
  SELECT
    TRUNC(LEAST(CAOS_FE_A, CAOS_FE_B)) F_DESDE,
    TRUNC(GREATEST(CAOS_FE_A, CAOS_FE_B)) F_HASTA
  FROM CART_ORDENES_PROCESOS
  WHERE CAOS_NU_SECUENCIA = :NU_SECUENCIA
)
SELECT
  TO_CHAR(F_DESDE,'DD/MM/YYYY') AS "DESDE|string|center",
  TO_CHAR(F_HASTA,'DD/MM/YYYY') AS "HASTA|string|center"
FROM P
`,

RAMO_INFO: `
SELECT
  CASE WHEN :RAMOSSN='TODOS' THEN 'TODOS' ELSE :RAMOSSN END
  AS "RAMO_TXT|string|start"
FROM DUAL
`,

Q_4: `
SELECT
  CAMO_CD_MONEDA AS "COD_MONEDA|string|center",
  SUBSTR(CAMO_DE_MONEDA,1,20) AS "DE_MONEDA|string|start"
FROM CART_MONEDAS
WHERE CAMO_CD_MONEDA='01'
`,

COBRANZA: `
WITH P AS (
  SELECT
    TRUNC(LEAST(CAOS_FE_A, CAOS_FE_B)) F_DESDE,
    TRUNC(GREATEST(CAOS_FE_A, CAOS_FE_B)) F_HASTA
  FROM CART_ORDENES_PROCESOS
  WHERE CAOS_NU_SECUENCIA = :NU_SECUENCIA
),

RAMOS_OK AS (
  SELECT DISTINCT CRRS_CARP_CD_RAMO CD_RAMO
  FROM CONT_RELACION_RAMOS_SSN
  WHERE (:RAMOSSN='TODOS' OR CRRS_CORS_CD_RAMO_SSN=:RAMOSSN)
),

O_F AS (
SELECT
  O.CJOD_FE_OPERACION,
  O.CJOD_CD_SUCURSAL,
  O.CJOD_NU_POLIZA,
  O.CJOD_CACE_NU_CERTIFICADO,
  O.CJOD_CJTO_CD_OPERACION,
  O.CJOD_NU_RECIBO
FROM CAJT_OPERACIONES_DIARIAS O
CROSS JOIN P
WHERE
  O.CJOD_CJTO_CD_OPERACION IN (2006,2008)
  AND O.CJOD_CJTO_CD_SUB_OPERACION = 0
  AND O.CJOD_FE_OPERACION >= P.F_DESDE
  AND O.CJOD_FE_OPERACION <  P.F_HASTA+1
  AND EXISTS (
      SELECT 1 FROM RAMOS_OK ROK
      WHERE ROK.CD_RAMO = O.CJOD_CD_RAMO
  )
)

SELECT *
FROM(
SELECT
  O.CJOD_FE_OPERACION        AS "FECHA|date|center",
  O.CJOD_NU_POLIZA           AS "POLIZA|int|center",
  O.CJOD_CACE_NU_CERTIFICADO AS "CERTIFICADO|int|center",
  R.CARE_NU_ENDOSO           AS "ENDOSO|int|center",

  SUM(CASE WHEN O.CJOD_CJTO_CD_OPERACION=2006
      THEN NVL(R.CARE_MT_PRIMA,0) ELSE 0 END)
      AS "DEBITO|money|end",

  SUM(CASE WHEN O.CJOD_CJTO_CD_OPERACION=2008
      THEN NVL(R.CARE_MT_PRIMA,0) ELSE 0 END)
      AS "CREDITO|money|end",

  SUM(CASE WHEN O.CJOD_CJTO_CD_OPERACION=2006
      THEN NVL(R.CARE_MT_PRIMA,0) ELSE 0 END)
  -
  SUM(CASE WHEN O.CJOD_CJTO_CD_OPERACION=2008
      THEN NVL(R.CARE_MT_PRIMA,0) ELSE 0 END)
      AS "SALDO|money|end"

FROM O_F O
JOIN CART_RECIBOS R
  ON R.CARE_CASU_CD_SUCURSAL = O.CJOD_CD_SUCURSAL
 AND R.CARE_NU_RECIBO = O.CJOD_NU_RECIBO

GROUP BY
  O.CJOD_FE_OPERACION,
  O.CJOD_NU_POLIZA,
  O.CJOD_CACE_NU_CERTIFICADO,
  R.CARE_NU_ENDOSO

ORDER BY
  O.CJOD_FE_OPERACION,
  O.CJOD_NU_POLIZA,
  O.CJOD_CACE_NU_CERTIFICADO,
  R.CARE_NU_ENDOSO
)
WHERE ROWNUM <= NVL(:MAX_FILAS,1000)
`,

TOTALES_PAGINA_EM: `
SELECT
  CEIL(RN/10) AS "PAG|int",

  SUM(COMISION) AS "COMISION|money",
  SUM(PRIMA) AS "PRIMA|money",
  SUM(DEROP) AS "DEROP|money",
  SUM(RECARGOS) AS "RECARGOS|money",
  SUM(IMPUESTOS) AS "IMPUESTOS|money",
  SUM(SELLADOS) AS "SELLADOS|money",
  SUM(BONIF) AS "BONIF|money",
  SUM(IIBB) AS "IIBB|money",
  SUM(PREMIO) AS "PREMIO|money"

FROM(

WITH P AS (
SELECT
  TRUNC(LEAST(CAOS_FE_A,CAOS_FE_B)) F_DESDE,
  TRUNC(GREATEST(CAOS_FE_A,CAOS_FE_B)) F_HASTA
FROM CART_ORDENES_PROCESOS
WHERE CAOS_NU_SECUENCIA=:NU_SECUENCIA
),

RAMOS_OK AS (
SELECT DISTINCT CRRS_CARP_CD_RAMO CD_RAMO
FROM CONT_RELACION_RAMOS_SSN
WHERE (:RAMOSSN='TODOS' OR CRRS_CORS_CD_RAMO_SSN=:RAMOSSN)
)

SELECT
ROW_NUMBER() OVER(
ORDER BY
r.rerr_cjod_fe_efectiva,
r.rerr_cace_capo_nu_poliza,
r.rerr_cace_nu_certificado
) RN,

NVL(r.rerr_care_mt_comision,0) COMISION,
NVL(r.rerr_care_mt_prima,0) PRIMA,
NVL(r.rerr_carg_derop,0) DEROP,

NVL(r.rerr_carg_fin,0)
+NVL(r.rerr_carg_adm,0)
+NVL(r.rerr_carg_sup,0) RECARGOS,

NVL(r.rerr_carg_iva,0)
+NVL(r.rerr_carg_iss,0)
+NVL(r.rerr_carg_otr,0) IMPUESTOS,

NVL(r.rerr_carg_sll,0) SELLADOS,
NVL(r.rerr_carg_bon,0) BONIF,
NVL(r.rerr_carg_ingbr,0) IIBB,
NVL(r.rerr_care_mt_premio,0) PREMIO

FROM BATB_REASEG_RRC r
CROSS JOIN P

WHERE
r.rerr_cjod_cd_operacion IN (6001,6003,6004,2043,2044)

AND r.rerr_cjod_fe_efectiva >= P.F_DESDE
AND r.rerr_cjod_fe_efectiva <  P.F_HASTA+1

AND EXISTS(
SELECT 1
FROM RAMOS_OK ro
WHERE ro.CD_RAMO=r.rerr_cace_cd_ramo
)

)

GROUP BY CEIL(RN/10)
`,

TOTAL_GENERAL_EM: `
SELECT

SUM(COMISION) AS "COMISION|money",
SUM(PRIMA) AS "PRIMA|money",
SUM(DEROP) AS "DEROP|money",
SUM(RECARGOS) AS "RECARGOS|money",
SUM(IMPUESTOS) AS "IMPUESTOS|money",
SUM(SELLADOS) AS "SELLADOS|money",
SUM(BONIF) AS "BONIF|money",
SUM(IIBB) AS "IIBB|money",
SUM(PREMIO) AS "PREMIO|money"

FROM(

WITH P AS (
SELECT
TRUNC(LEAST(CAOS_FE_A,CAOS_FE_B)) F_DESDE,
TRUNC(GREATEST(CAOS_FE_A,CAOS_FE_B)) F_HASTA
FROM CART_ORDENES_PROCESOS
WHERE CAOS_NU_SECUENCIA=:NU_SECUENCIA
),

RAMOS_OK AS (
SELECT DISTINCT CRRS_CARP_CD_RAMO CD_RAMO
FROM CONT_RELACION_RAMOS_SSN
WHERE (:RAMOSSN='TODOS' OR CRRS_CORS_CD_RAMO_SSN=:RAMOSSN)
)

SELECT

NVL(r.rerr_care_mt_comision,0) COMISION,
NVL(r.rerr_care_mt_prima,0) PRIMA,
NVL(r.rerr_carg_derop,0) DEROP,

NVL(r.rerr_carg_fin,0)
+NVL(r.rerr_carg_adm,0)
+NVL(r.rerr_carg_sup,0) RECARGOS,

NVL(r.rerr_carg_iva,0)
+NVL(r.rerr_carg_iss,0)
+NVL(r.rerr_carg_otr,0) IMPUESTOS,

NVL(r.rerr_carg_sll,0) SELLADOS,
NVL(r.rerr_carg_bon,0) BONIF,
NVL(r.rerr_carg_ingbr,0) IIBB,
NVL(r.rerr_care_mt_premio,0) PREMIO

FROM BATB_REASEG_RRC r
CROSS JOIN P

WHERE
r.rerr_cjod_cd_operacion IN (6001,6003,6004,2043,2044)

AND r.rerr_cjod_fe_efectiva >= P.F_DESDE
AND r.rerr_cjod_fe_efectiva < P.F_HASTA+1

AND EXISTS(
SELECT 1
FROM RAMOS_OK ro
WHERE ro.CD_RAMO=r.rerr_cace_cd_ramo
)

)
`,

TOTAL_REGISTROS_EM: `
SELECT COUNT(*) AS "TOTAL|int"
FROM(

WITH P AS (
SELECT
TRUNC(LEAST(CAOS_FE_A,CAOS_FE_B)) F_DESDE,
TRUNC(GREATEST(CAOS_FE_A,CAOS_FE_B)) F_HASTA
FROM CART_ORDENES_PROCESOS
WHERE CAOS_NU_SECUENCIA=:NU_SECUENCIA
),

RAMOS_OK AS (
SELECT DISTINCT CRRS_CARP_CD_RAMO CD_RAMO
FROM CONT_RELACION_RAMOS_SSN
WHERE (:RAMOSSN='TODOS' OR CRRS_CORS_CD_RAMO_SSN=:RAMOSSN)
)

SELECT 1
FROM BATB_REASEG_RRC r
CROSS JOIN P

WHERE
r.rerr_cjod_cd_operacion IN (6001,6003,6004,2043,2044)

AND r.rerr_cjod_fe_efectiva >= P.F_DESDE
AND r.rerr_cjod_fe_efectiva < P.F_HASTA+1

AND EXISTS(
SELECT 1
FROM RAMOS_OK ro
WHERE ro.CD_RAMO=r.rerr_cace_cd_ramo
)

)
`

},

  
 layout: `
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>CONR30524SSN - Registro de Cobranzas</title>
<style>
   body{
      font-size:9px;
      margin:15px;
      line-height:1.25;   
      gap:4px;
    }

    .hdr{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:4px;
      width:100%;
      margin-bottom:8px;
    }

    .hdr__logo{
      height:40px;
      width:auto;
      display:block;
      margin-top:50px; /* mismo “aire” que CAJR30400 */
    }

    .hdr__title{
      margin:0;
      text-align:right;
      font-size:18px;
      font-weight:600;
    }

   .meta{
      border-collapse: collapse;
      width: 100%;
      font-size: 9px;
    }

    .meta th, .meta td{
      padding: 4px;
      text-align: center;
    }

    .meta th{
      background: #d9d9d9;
      font-weight: 600;
    }

    .title2 {
      font-size: 11px;
      font-weight: bold;
      margin-top: 16px;
      margin-bottom: 6px;
      text-align: center;
    }

    .data, .totbox {
      border-collapse: collapse;
      width: 100%;
      margin-top: 8px;
    }

    .data td, .data th, .totbox td, .totbox th {
      padding: 4px;
      text-align: center;
    }

    .data td, .data th{
      padding: 4px !important;
      text-align: center;
    }

    .tot h4 {
      margin: 10px 0 4px 0;
    }

    .flex-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
      gap: 10px;
    }

    .half {
      width: 50%;
    }

    .center-block {
      text-align: center;
      margin: 0 auto;
      width: fit-content;
    }

  </style>
  </head>

  <body>
    <header class="hdr">
      <img src="logoZS.svg" alt="Zurich Santander" class="hdr__logo" />
      <h2 class="hdr__title">Reporte CONR30524SSN</h2>
   </header>
<table style="width:100%; table-layout:fixed; border-collapse:collapse; margin-top:10px; font-size:9px;">
<tr>

<!-- COLUMNA 1 -->
<td style="width:33%; vertical-align:top;">

<strong>ZURICH SANTANDER SEGUROS ARGENTINA S.A.</strong><br>
CUIT: 30-69898545-9<br>
Ing. Enrique Butty 240, 9°<br>
COD POSTAL: 1001 - C.A.B.A.

</td>

<!-- COLUMNA 2 -->
<td style="width:34%; vertical-align:top;">

<table style="width:100%; border-collapse:collapse;">
<tr>
<td style="width:55%;">UNIDAD ADMINISTRATIVA:</td>
<td>#{Q_2.NM_UNIDAD_ADM}#</td>
</tr>
<tr>
<td>USUARIO:</td>
<td>#{Q_2.USUARIO}#</td>
</tr>
</table>

</td>

<!-- COLUMNA 3 -->
<td style="width:33%; vertical-align:top;">

<table style="width:100%; border-collapse:collapse;">
<tr>
<td style="width:45%;">FECHA</td>
<td>#{Q_2.FECHA_REP}#</td>
</tr>

<tr>
<td>HORA</td>
<td>#{Q_2.HORA_REP}#</td>
</tr>

<tr>
<td>PAGINA</td>
<td>#{Q_2.PAGINA}#</td>
</tr>

<tr>
<td>REF.</td>
<td>#{Q_2.REF}#</td>
</tr>

<tr>
<td>MONEDA</td>
<td>#{Q_4.DE_MONEDA}#</td>
</tr>

</table>

</td>

</tr>
</table>

  <!-- Registro de cobranzas centrado con margen superior equilibrado -->
  <div style="text-align:center; margin:18px auto 0 auto;">
    <div class="title2" style="margin-bottom:8px;">REGISTRO DE COBRANZAS</div>

    <table class="meta" style="width:320px; margin:0 auto;">
      <tr><td class="k">DESDE EL:</td><td class="v">#{PARAMS.DESDE}#</td></tr>
      <tr><td class="k">HASTA EL:</td><td class="v">#{PARAMS.HASTA}#</td></tr>
    </table>
  </div>
<div style="margin-top:14px;">
    <strong>Hash:</strong> 
  </div>
  <div style="margin-top:14px;">
    <strong>RAMO:</strong> <span>#{RAMO_INFO.RAMO_TXT}#</span>
  </div>

  <!-- Tabla principal de cobranzas -->
  <table class="data" style="margin-top:8px;">
    #[COBRANZA]#
  </table>

   <!-- Total por página -->
<h4>Total página #{TOTALES_PAGINA_EM.PAG}#</h4>

<table class="totbox">
  <tr>
    <th>Comisión</th>
    <th>Prima</th>
    <th>Der Em</th>
    <th>Recargos</th>
    <th>Impuestos</th>
    <th>Sellados</th>
    <th>Bonif</th>
    <th>IIBB</th>
    <th>Premio</th>
  </tr>
  <tr>
    <td>#{TOTALES_PAGINA_EM.COMISION}#</td>
    <td>#{TOTALES_PAGINA_EM.PRIMA}#</td>
    <td>#{TOTALES_PAGINA_EM.DEROP}#</td>
    <td>#{TOTALES_PAGINA_EM.RECARGOS}#</td>
    <td>#{TOTALES_PAGINA_EM.IMPUESTOS}#</td>
    <td>#{TOTALES_PAGINA_EM.SELLADOS}#</td>
    <td>#{TOTALES_PAGINA_EM.BONIF}#</td>
    <td>#{TOTALES_PAGINA_EM.IIBB}#</td>
    <td>#{TOTALES_PAGINA_EM.PREMIO}#</td>
  </tr>
</table>

<!-- Total general -->
<h4>Total general</h4>

<table class="totbox">
  <tr>
    <td>#{TOTAL_GENERAL_EM.COMISION}#</td>
    <td>#{TOTAL_GENERAL_EM.PRIMA}#</td>
    <td>#{TOTAL_GENERAL_EM.DEROP}#</td>
    <td>#{TOTAL_GENERAL_EM.RECARGOS}#</td>
    <td>#{TOTAL_GENERAL_EM.IMPUESTOS}#</td>
    <td>#{TOTAL_GENERAL_EM.SELLADOS}#</td>
    <td>#{TOTAL_GENERAL_EM.BONIF}#</td>
    <td>#{TOTAL_GENERAL_EM.IIBB}#</td>
    <td>#{TOTAL_GENERAL_EM.PREMIO}#</td>
  </tr>
</table>

<!-- Total emitidas -->
<h4>Total emitidas: #{TOTAL_REGISTROS_EM.TOTAL}#</h4>
  </body>
</html>
`,
};