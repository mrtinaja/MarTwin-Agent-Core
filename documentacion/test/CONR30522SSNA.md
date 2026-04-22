export default {
  name: 'CONR30522SSNA',
  effectiveDate: '2025-01-01',
  description: 'SSN - Invalidaciones y Emisiones (migrado de Oracle Reports)',

  /* =========================
     PARAMS
  ========================= */
  params: {
    NU_SECUENCIA: { type: 'number', required: true }
  },

  /* =========================
     QUERIES
  ========================= */
  queries: {
    /* ---------- MAIN ---------- */
    MAIN: `
      SELECT 75 AS "ORDEN"
      FROM CART_ORDENES_PROCESOS
      WHERE CAOS_NU_SECUENCIA = :NU_SECUENCIA
    `,

    /* ---------- CABECERA ---------- */
    CABECERA: `
      SELECT
        OP.CAOS_CD_USUARIO                      AS "USUARIO|string",
        U.CAUS_CAGR_CD_COMPANIA                 AS "CD_COMPANIA|string",
        U.CAUS_CAGR_CD_UNIDAD_ADM               AS "CD_UNIDAD_ADM|string",
        G.CAGR_NM_UNIDAD_ADM                    AS "NM_UNIDAD_ADM|string",

        TO_CHAR(OP.CAOS_FE_ORDEN,'DD/MM/YYYY')
          AS "FECHA_ORDEN|string",

        TO_CHAR(TRUNC(LEAST(OP.CAOS_FE_A, OP.CAOS_FE_B)),'DD/MM/YYYY')
          AS "FECHA_DESDE|string",

        TO_CHAR(TRUNC(GREATEST(OP.CAOS_FE_A, OP.CAOS_FE_B)),'DD/MM/YYYY')
          AS "FECHA_HASTA|string",
                TO_CHAR(SYSDATE,'DD/MM/YYYY')     AS "FECHA_ACTUAL|string",
        TO_CHAR(SYSDATE,'HH24:MI:SS') AS "HORA_ACTUAL|string"

      FROM CART_ORDENES_PROCESOS OP

      JOIN CART_USUARIOS U
        ON U.CAUS_CD_USUARIO = OP.CAOS_CD_USUARIO

      JOIN CART_GERENCIAS G
        ON G.CAGR_CD_COMPANIA   = U.CAUS_CAGR_CD_COMPANIA
       AND G.CAGR_CD_UNIDAD_ADM = U.CAUS_CAGR_CD_UNIDAD_ADM

      WHERE OP.CAOS_NU_SECUENCIA = :NU_SECUENCIA
    `,

    /* ---------- DATOS_COMPANIA ---------- */
    DATOS_COMPANIA: `
      SELECT
        C.CJCM_NM_COMPANIA AS "NM_COMPANIA|string",

        ('CUIT:' ||
          SUBSTR(LPAD(TRIM(C.CJCM_NU_CUIT),11,'0'),1,2)||'-'||
          SUBSTR(LPAD(TRIM(C.CJCM_NU_CUIT),11,'0'),3,8)||'-'||
          SUBSTR(LPAD(TRIM(C.CJCM_NU_CUIT),11,'0'),11,1)
        ) AS "CUIT|string",

        C.CJCM_DI_UBICACION1 AS "UBICACION1|string",

        ('COD POSTAL:'||
         C.CJCM_ZN_POSTAL||' - '||
         C.CJCM_DI_UBICACION2) AS "UBICACION2|string"

      FROM CART_ORDENES_PROCESOS OP,
           CART_USUARIOS U,
           CAJT_COMPANIAS C

      WHERE OP.CAOS_CD_USUARIO = U.CAUS_CD_USUARIO
        AND C.CJCM_CD_COMPANIA = U.CAUS_CAGR_CD_COMPANIA
        AND OP.CAOS_NU_SECUENCIA = :NU_SECUENCIA
    `,

    /* ---------- EMITIDAS (OPTIMO) ---------- */
Q_EMISION: `

WITH P AS (
  SELECT
    TRUNC(LEAST(CAOS_FE_A, CAOS_FE_B))  AS FECHA_DESDE,
    TRUNC(GREATEST(CAOS_FE_A, CAOS_FE_B)) AS FECHA_HASTA
  FROM CART_ORDENES_PROCESOS
  WHERE CAOS_NU_SECUENCIA = :NU_SECUENCIA
),

BASE_RRC AS (

SELECT

  r.rerr_cace_cd_sucursal,
  r.rerr_cace_cd_ramo,
  r.rerr_cace_capo_nu_poliza,
  r.rerr_cace_nu_certificado,

  MIN(r.rerr_cjod_fe_efectiva) FECHA,

  MAX(r.rerr_care_nu_endoso) ENDOSO,

  MIN(r.rerr_cacn_cd_nacionalidad) rerr_cacn_cd_nacionalidad,
  MIN(r.rerr_cacn_nu_cedula_rif)   rerr_cacn_nu_cedula_rif,

  SUM(r.rerr_care_mt_suma_aseg) SUMA,

  SUM(r.rerr_care_mt_comision) COMISION,
  SUM(r.rerr_care_mt_prima) PRIMA,

  SUM(r.rerr_carg_derop) DEROP,

  SUM(NVL(r.rerr_carg_adm,0)+NVL(r.rerr_carg_fin,0)) REC,

  SUM(
      NVL(r.rerr_carg_iva,0)+
      NVL(r.rerr_carg_iss,0)+
      NVL(r.rerr_carg_otr,0)
  ) IMP,

  SUM(r.rerr_carg_sll) SLL,
  SUM(r.rerr_carg_bon) BONIF,
  SUM(r.rerr_carg_ingbr) IIBB,

  SUM(r.rerr_care_mt_premio) PREMIO,

  MAX(r.rerr_tasa_cambio) TASA,

  MIN(r.rerr_cace_fe_desde) rerr_cace_fe_desde,
  MAX(r.rerr_cace_fe_hasta) rerr_cace_fe_hasta

FROM BATB_REASEG_RRC r
CROSS JOIN P

WHERE r.rerr_cjod_cd_operacion IN (6002,2002,2042)

AND r.rerr_cjod_fe_efectiva BETWEEN
    P.FECHA_DESDE
AND P.FECHA_HASTA

GROUP BY

  r.rerr_cace_cd_sucursal,
  r.rerr_cace_cd_ramo,
  r.rerr_cace_capo_nu_poliza,
  r.rerr_cace_nu_certificado

),

BASE_CART AS (

SELECT

  o.caod_casu_cd_sucursal,
  o.caod_carp_cd_ramo,
  o.caod_capo_nu_poliza,
  o.caod_cace_nu_certificado,

  o.caod_fe_operacion FECHA,

  NVL(o.caod_nu_endoso,c.cace_nu_endoso) ENDOSO,

  c.cace_cacn_cd_nacionalidad rerr_cacn_cd_nacionalidad,
  c.cace_cacn_nu_cedula_rif   rerr_cacn_nu_cedula_rif,

  c.cace_mt_suma_asegurada SUMA,

  0 COMISION,
  0 PRIMA,
  0 DEROP,
  0 REC,
  0 IMP,
  0 SLL,
  0 BONIF,
  0 IIBB,
  0 PREMIO,

  1 TASA,

  c.cace_fe_desde rerr_cace_fe_desde,
  c.cace_fe_hasta rerr_cace_fe_hasta

FROM CART_OPERACIONES_DIARIAS o
JOIN CART_CERTIFICADOS c
  ON c.cace_casu_cd_sucursal = o.caod_casu_cd_sucursal
 AND c.cace_carp_cd_ramo = o.caod_carp_cd_ramo
 AND c.cace_capo_nu_poliza = o.caod_capo_nu_poliza
 AND c.cace_nu_certificado = o.caod_cace_nu_certificado

CROSS JOIN P

WHERE o.caod_caop_cd_operacion = 1003
AND o.caod_cd_sub_operacion = 0

AND o.caod_fe_operacion BETWEEN
    P.FECHA_DESDE
AND P.FECHA_HASTA

AND NOT EXISTS (

SELECT 1
FROM BATB_REASEG_RRC r

WHERE r.rerr_cjod_cd_operacion IN (6002,2002,2042)

AND r.rerr_cace_cd_sucursal = o.caod_casu_cd_sucursal
AND r.rerr_cace_cd_ramo = o.caod_carp_cd_ramo
AND r.rerr_cace_capo_nu_poliza = o.caod_capo_nu_poliza
AND r.rerr_cace_nu_certificado = o.caod_cace_nu_certificado

AND r.rerr_cjod_fe_efectiva = o.caod_fe_operacion

)

),

BASE_TOTAL AS (

SELECT * FROM BASE_RRC
UNION ALL
SELECT * FROM BASE_CART

),

BASE_UNICA AS (

SELECT *
FROM (

SELECT
b.*,

RECTOR.OBTENER_CUIP(
b.rerr_cace_cd_sucursal,
b.rerr_cace_cd_ramo,
b.rerr_cace_capo_nu_poliza,
b.rerr_cace_nu_certificado,
b.endoso
) cuip,

ROW_NUMBER() OVER (

PARTITION BY

RECTOR.OBTENER_CUIP(
b.rerr_cace_cd_sucursal,
b.rerr_cace_cd_ramo,
b.rerr_cace_capo_nu_poliza,
b.rerr_cace_nu_certificado,
b.endoso
)

ORDER BY b.fecha

) rn

FROM BASE_TOTAL b

)

WHERE rn = 1

)

SELECT

'<tr>' ||

'<td>' || TO_CHAR(b.fecha,'DD/MM/YYYY') || '</td>' ||

'<td>' || b.rerr_cace_capo_nu_poliza || '</td>' ||

'<td>' || b.rerr_cace_nu_certificado || '</td>' ||

'<td>' || b.endoso || '</td>' ||

'<td>' || cli.cacn_nm_apellido_razon || '</td>' ||

'<td class="right">' || b.suma || '</td>' ||

'<td>' || TO_CHAR(b.rerr_cace_fe_desde,'DD/MM/YYYY') || '</td>' ||

'<td>' || TO_CHAR(b.rerr_cace_fe_hasta,'DD/MM/YYYY') || '</td>' ||

'<td class="right">' || b.comision || '</td>' ||

'<td class="right">' || b.prima || '</td>' ||

'<td class="right">' || b.derop || '</td>' ||

'<td class="right">' || b.rec || '</td>' ||

'<td class="right">' || b.imp || '</td>' ||

'<td class="right">' || b.sll || '</td>' ||

'<td class="right">' || b.bonif || '</td>' ||

'<td class="right">' || b.iibb || '</td>' ||

'<td class="right">' || b.premio || '</td>' ||

'<td class="right">' || b.tasa || '</td>' ||

'</tr>' ||

'<tr>' ||
'<td colspan="17">CUIP: ' ||

RECTOR.OBTENER_CUIP(
b.rerr_cace_cd_sucursal,
b.rerr_cace_cd_ramo,
b.rerr_cace_capo_nu_poliza,
b.rerr_cace_nu_certificado,
b.endoso
)

|| '</td>' ||
'</tr>'

AS "|string"

FROM BASE_UNICA b

JOIN CART_CLIENTES cli
ON cli.cacn_cd_nacionalidad = b.rerr_cacn_cd_nacionalidad
AND cli.cacn_nu_cedula_rif   = b.rerr_cacn_nu_cedula_rif

ORDER BY
b.rerr_cace_cd_sucursal,
b.rerr_cace_cd_ramo,
b.rerr_cace_capo_nu_poliza,
b.rerr_cace_nu_certificado,
b.fecha

`,

    Q_RAMO: `
SELECT DISTINCT
  RP.CARP_DE_RAMO AS "DE_RAMO|string"
FROM BATB_REASEG_RRC R
JOIN CART_RAMOS_POLIZAS RP
  ON RP.CARP_CD_RAMO = R.RERR_CACE_CD_RAMO
WHERE
  R.RERR_CJOD_FE_EFECTIVA BETWEEN
    TO_DATE('01/01/2024','DD/MM/YYYY')
AND TO_DATE('01/01/2024','DD/MM/YYYY')
FETCH FIRST 1 ROWS ONLY
`,

    /* ---------- TOTALES POR RAMO ---------- */
TOTALES_RAMO: `
WITH P AS (
  SELECT
    TRUNC(LEAST(CAOS_FE_A, CAOS_FE_B)) FECHA_DESDE,
    TRUNC(GREATEST(CAOS_FE_A, CAOS_FE_B)) FECHA_HASTA
  FROM CART_ORDENES_PROCESOS
  WHERE CAOS_NU_SECUENCIA = :NU_SECUENCIA
),

BASE AS (
  SELECT
    r.rerr_cace_cd_ramo RAMO,
    rp.carp_de_ramo DESC_RAMO,
    r.rerr_care_mt_comision COMISION,
    r.rerr_care_mt_prima PRIMA,
    r.rerr_carg_derop DEROP,
    (NVL(r.rerr_carg_adm,0)+NVL(r.rerr_carg_fin,0)) REC,
    (NVL(r.rerr_carg_iva,0)+NVL(r.rerr_carg_iss,0)+NVL(r.rerr_carg_otr,0)) IMP,
    r.rerr_carg_sll SLL,
    r.rerr_carg_bon BONIF,
    r.rerr_carg_ingbr IIBB,
    r.rerr_care_mt_premio PREMIO
  FROM BATB_REASEG_RRC r
  CROSS JOIN P
  LEFT JOIN CART_RAMOS_POLIZAS rp
    ON rp.carp_cd_ramo = r.rerr_cace_cd_ramo
  WHERE r.rerr_cjod_cd_operacion IN (6002,2002,2042)
    AND r.rerr_cjod_fe_efectiva BETWEEN P.FECHA_DESDE AND P.FECHA_HASTA
)

SELECT
  DESC_RAMO AS "RAMO|string|start",
  SUM(COMISION) AS "COMISION|money|end",
  SUM(PRIMA) AS "PRIMA|money|end",
  SUM(DEROP) AS "DEROP|money|end",
  SUM(REC) AS "RECARGO|money|end",
  SUM(IMP) AS "IMPUESTOS|money|end",
  SUM(SLL) AS "SELLADOS|money|end",
  SUM(BONIF) AS "BONIF|money|end",
  SUM(IIBB) AS "IIBB|money|end",
  SUM(PREMIO) AS "PREMIO|money|end"
FROM BASE
GROUP BY RAMO, DESC_RAMO
ORDER BY RAMO
`,

TOTALES_GENERAL: `
WITH P AS (
  SELECT
    TRUNC(LEAST(CAOS_FE_A, CAOS_FE_B)) AS FECHA_DESDE,
    TRUNC(GREATEST(CAOS_FE_A, CAOS_FE_B)) AS FECHA_HASTA,
    NVL(CAOS_SERIAL_CARROCERIA, 'TODOS') AS RAMOSSN
  FROM CART_ORDENES_PROCESOS
  WHERE CAOS_NU_SECUENCIA = :NU_SECUENCIA
),

/* =========================
   BASE PARA IMPORTES
   (dejamos la lógica que ya te da bien los montos)
========================= */
BASE_RRC AS (
  SELECT
    r.rerr_cace_cd_sucursal AS sucursal,
    r.rerr_cace_cd_ramo AS ramo,
    r.rerr_cace_capo_nu_poliza AS poliza,
    r.rerr_cace_nu_certificado AS certificado,
    MIN(r.rerr_cjod_fe_efectiva) AS fecha,
    MAX(r.rerr_care_nu_endoso) AS endoso,
    MIN(r.rerr_cacn_cd_nacionalidad) AS rerr_cacn_cd_nacionalidad,
    MIN(r.rerr_cacn_nu_cedula_rif) AS rerr_cacn_nu_cedula_rif,
    SUM(r.rerr_care_mt_suma_aseg) AS suma,
    SUM(r.rerr_care_mt_comision) AS comision,
    SUM(r.rerr_care_mt_prima) AS prima,
    SUM(r.rerr_carg_derop) AS derop,
    SUM(NVL(r.rerr_carg_adm,0) + NVL(r.rerr_carg_fin,0)) AS rec,
    SUM(NVL(r.rerr_carg_iva,0) + NVL(r.rerr_carg_iss,0) + NVL(r.rerr_carg_otr,0)) AS imp,
    SUM(r.rerr_carg_sll) AS sellados,
    SUM(r.rerr_carg_bon) AS bonif,
    SUM(r.rerr_carg_ingbr) AS iibb,
    SUM(r.rerr_care_mt_premio) AS premio,
    MAX(r.rerr_tasa_cambio) AS tasa,
    MIN(r.rerr_cace_fe_desde) AS fe_desde,
    MAX(r.rerr_cace_fe_hasta) AS fe_hasta
  FROM BATB_REASEG_RRC r
  CROSS JOIN P
  WHERE r.rerr_cjod_cd_operacion IN (6002,2002,2042)
    AND r.rerr_cjod_fe_efectiva BETWEEN P.FECHA_DESDE AND P.FECHA_HASTA
  GROUP BY
    r.rerr_cace_cd_sucursal,
    r.rerr_cace_cd_ramo,
    r.rerr_cace_capo_nu_poliza,
    r.rerr_cace_nu_certificado
),

BASE_CART AS (
  SELECT
    o.caod_casu_cd_sucursal AS sucursal,
    o.caod_carp_cd_ramo AS ramo,
    o.caod_capo_nu_poliza AS poliza,
    o.caod_cace_nu_certificado AS certificado,
    o.caod_fe_operacion AS fecha,
    NVL(o.caod_nu_endoso, c.cace_nu_endoso) AS endoso,
    c.cace_cacn_cd_nacionalidad AS rerr_cacn_cd_nacionalidad,
    c.cace_cacn_nu_cedula_rif AS rerr_cacn_nu_cedula_rif,
    c.cace_mt_suma_asegurada AS suma,
    0 AS comision,
    0 AS prima,
    0 AS derop,
    0 AS rec,
    0 AS imp,
    0 AS sellados,
    0 AS bonif,
    0 AS iibb,
    0 AS premio,
    1 AS tasa,
    c.cace_fe_desde AS fe_desde,
    c.cace_fe_hasta AS fe_hasta
  FROM CART_OPERACIONES_DIARIAS o
  JOIN CART_CERTIFICADOS c
    ON c.cace_casu_cd_sucursal = o.caod_casu_cd_sucursal
   AND c.cace_carp_cd_ramo     = o.caod_carp_cd_ramo
   AND c.cace_capo_nu_poliza   = o.caod_capo_nu_poliza
   AND c.cace_nu_certificado   = o.caod_cace_nu_certificado
  CROSS JOIN P
  WHERE o.caod_caop_cd_operacion = 1003
    AND o.caod_cd_sub_operacion = 0
    AND o.caod_fe_operacion BETWEEN P.FECHA_DESDE AND P.FECHA_HASTA
    AND NOT EXISTS (
      SELECT 1
      FROM BATB_REASEG_RRC r
      WHERE r.rerr_cjod_cd_operacion IN (6002,2002,2042)
        AND r.rerr_cace_cd_sucursal    = o.caod_casu_cd_sucursal
        AND r.rerr_cace_cd_ramo        = o.caod_carp_cd_ramo
        AND r.rerr_cace_capo_nu_poliza = o.caod_capo_nu_poliza
        AND r.rerr_cace_nu_certificado = o.caod_cace_nu_certificado
        AND r.rerr_cjod_fe_efectiva    = o.caod_fe_operacion
    )
),

BASE_TOTAL AS (
  SELECT * FROM BASE_RRC
  UNION ALL
  SELECT * FROM BASE_CART
),

BASE_UNICA AS (
  SELECT *
  FROM (
    SELECT
      b.*,
      ROW_NUMBER() OVER (
        PARTITION BY
          RECTOR.OBTENER_CUIP(
            b.sucursal,
            b.ramo,
            b.poliza,
            b.certificado,
            b.endoso
          )
        ORDER BY b.fecha
      ) AS rn
    FROM BASE_TOTAL b
  )
  WHERE rn = 1
),

SUMAS AS (
  SELECT
    SUM(comision) AS COMISION,
    SUM(prima) AS PRIMA,
    SUM(derop) AS DER_EM,
    SUM(rec) AS RECARGOS,
    SUM(imp) AS IMPUESTOS,
    SUM(sellados) AS SELLADOS,
    SUM(bonif) AS BONIF,
    SUM(iibb) AS IIBB,
    SUM(premio) AS PREMIO
  FROM BASE_UNICA
),

/* =========================
   RAMOS válidos del original
========================= */
G_RAMOS AS (
  SELECT rp.carp_cd_ramo
  FROM cart_ramos_polizas rp
  CROSS JOIN P
  WHERE (P.RAMOSSN = 'TODOS'
         AND rp.carp_cd_ramo IN (
           SELECT DISTINCT CRRS_CARP_CD_RAMO
           FROM CONT_RELACION_RAMOS_SSN
         ))
     OR (P.RAMOSSN <> 'TODOS'
         AND rp.carp_cd_ramo IN (
           SELECT CRRS_CARP_CD_RAMO
           FROM CONT_RELACION_RAMOS_SSN
           WHERE CRRS_CORS_CD_RAMO_SSN = P.RAMOSSN
         ))
),

/* =========================
   Réplica de Q_ANULADAS sin ORDER BY
========================= */
BASE_ANULADAS AS (
  SELECT
    r.rerr_cace_cd_ramo AS ramo_an
  FROM BATB_REASEG_RRC r
  JOIN CART_CLIENTES c
    ON c.cacn_cd_nacionalidad = r.rerr_cacn_cd_nacionalidad
   AND c.cacn_nu_cedula_rif   = r.rerr_cacn_nu_cedula_rif
  CROSS JOIN P
  WHERE r.rerr_cjod_cd_operacion IN (6002,2002,2042)
    AND r.rerr_cjod_fe_efectiva BETWEEN P.FECHA_DESDE AND P.FECHA_HASTA
  GROUP BY
    r.rerr_cace_cd_sucursal,
    r.rerr_cace_cd_ramo,
    r.rerr_camo_cd_moneda,
    r.rerr_cace_capo_nu_poliza,
    r.rerr_cace_nu_certificado,
    r.rerr_cjod_cd_operacion,
    r.rerr_cjod_fe_efectiva,
    r.rerr_tasa_cambio,
    r.rerr_cacn_cd_nacionalidad,
    r.rerr_cacn_nu_cedula_rif,
    c.cacn_nm_apellido_razon

  UNION ALL

  SELECT
    o.caod_carp_cd_ramo AS ramo_an
  FROM CART_OPERACIONES_DIARIAS o
  JOIN CART_CERTIFICADOS c
    ON c.cace_casu_cd_sucursal = o.caod_casu_cd_sucursal
   AND c.cace_carp_cd_ramo     = o.caod_carp_cd_ramo
   AND c.cace_capo_nu_poliza   = o.caod_capo_nu_poliza
   AND c.cace_nu_certificado   = o.caod_cace_nu_certificado
  JOIN CART_PRODUCTOS pdt
    ON pdt.capu_carp_cd_ramo = c.cace_carp_cd_ramo
   AND pdt.capu_cd_producto  = c.cace_capu_cd_producto
  JOIN CART_CLIENTES cli
    ON cli.cacn_cd_nacionalidad = c.cace_cacn_cd_nacionalidad
   AND cli.cacn_nu_cedula_rif   = c.cace_cacn_nu_cedula_rif
  CROSS JOIN P
  WHERE o.caod_caop_cd_operacion = 1003
    AND o.caod_cd_sub_operacion = 0
    AND o.caod_fe_operacion BETWEEN P.FECHA_DESDE AND P.FECHA_HASTA
    AND NOT EXISTS (
      SELECT 1
      FROM BATB_REASEG_RRC r
      WHERE r.rerr_cjod_cd_operacion IN (6002,2002,2042)
        AND r.rerr_cjod_fe_efectiva BETWEEN P.FECHA_DESDE AND P.FECHA_HASTA
        AND r.rerr_cace_cd_sucursal    = c.cace_casu_cd_sucursal
        AND r.rerr_cace_cd_ramo        = c.cace_carp_cd_ramo
        AND r.rerr_cace_capo_nu_poliza = c.cace_capo_nu_poliza
        AND r.rerr_cace_nu_certificado = c.cace_nu_certificado
    )
),

CNT_RAMO AS (
  SELECT
    g.carp_cd_ramo,
    COUNT(a.ramo_an) AS total_anuladas
  FROM G_RAMOS g
  LEFT JOIN BASE_ANULADAS a
    ON a.ramo_an = g.carp_cd_ramo
  GROUP BY g.carp_cd_ramo
),

CNT AS (
  SELECT SUM(total_anuladas) AS TOTAL_REGISTROS
  FROM CNT_RAMO
)

SELECT
  CNT.TOTAL_REGISTROS AS "TOTAL_REGISTROS|int",
  SUMAS.COMISION      AS "COMISION|money",
  SUMAS.PRIMA         AS "PRIMA|money",
  SUMAS.DER_EM        AS "DER_EM|money",
  SUMAS.RECARGOS      AS "RECARGOS|money",
  SUMAS.IMPUESTOS     AS "IMPUESTOS|money",
  SUMAS.SELLADOS      AS "SELLADOS|money",
  SUMAS.BONIF         AS "BONIF|money",
  SUMAS.IIBB          AS "IIBB|money",
  SUMAS.PREMIO        AS "PREMIO|money"
FROM CNT
CROSS JOIN SUMAS
`,
    /* HASH */
    Q_HASH: `
      SELECT
        CAOS_NM_COLUMNA AS "HASH|string"
      FROM CART_ORDENES_PROCESOS
      WHERE CAOS_NU_SECUENCIA = :NU_SECUENCIA
    `,
    Q_INVALIDADAS: `
    SELECT
  COUNT(*) AS "TOTAL|int"
FROM (
  SELECT 1
  FROM cart_operaciones_diarias o,
       cart_certificados c
  WHERE o.caod_caop_cd_operacion = 1014

    AND o.caod_fe_operacion >= :fecha_desde
    AND o.caod_fe_operacion <= :fecha_hasta

    AND c.cace_casu_cd_sucursal   = o.caod_casu_cd_sucursal
    AND c.cace_carp_cd_ramo       = o.caod_carp_cd_ramo
    AND c.cace_capo_nu_poliza     = o.caod_capo_nu_poliza
    AND c.cace_nu_certificado     = o.caod_cace_nu_certificado

  GROUP BY
    o.caod_carp_cd_ramo,
    o.caod_fe_operacion,
    o.caod_casu_cd_sucursal,
    o.caod_capo_nu_poliza,
    o.caod_cace_nu_certificado,
    c.cace_fe_desde,
    c.cace_fe_proxima_facturacion,
    c.cace_nu_endoso,
    c.cace_mt_suma_asegurada
)
`,
    Q_4: `
      SELECT
        CAMO_CD_MONEDA AS "COD_MONEDA|string|center",
        SUBSTR(CAMO_DE_MONEDA,1,20) AS "DE_MONEDA|string|start"
      FROM CART_MONEDAS
      WHERE CAMO_CD_MONEDA = '01'
    `
  },

  /* =========================
     LAYOUT
  ========================= */
  layout: `

<!DOCTYPE html>
<html>
<head>

<style>

body{
  font-size:7px;
  margin:12px;
}

table{
  width:100%;
  border-collapse:collapse;
}

th{
  font-weight:700;
}

td,th{
  padding:2px 3px;
  white-space:nowrap;
}

.right{text-align:right;}
.center{text-align:center;}
.start{text-align:left;}
 /* =========================
         HEADER
         ========================= */
      .hdr {
        width: 100%;
        margin-bottom: 8px;
        padding-bottom: 15px;
      }

      .hdr__tbl {
        width: 100%;
        border-collapse: collapse;
      }

      .hdr__logo {
        height: 42px;
        width: auto;
        display: block;
        margin-left: 20px;
      }

      .hdr__title {
        margin: 0;
        text-align: right;
        font-size: 16px;
        font-weight: 700;
        color: #000;
        margin-right: 20px;
        margin-top: 30px;
      }
      .table-data th, .table-data td {
      font-size: 5px;
      padding: 2px;
      }
</style>

</head>
<!-- ======================= HEADER ======================= -->
      <header class="hdr">
        <table class="hdr__tbl">
          <tr>
            <td>
              <img src="logoZS.svg" alt="Zurich Santander" class="hdr__logo" />
            </td>
            <td class="right">
              <h2 class="hdr__title">Reporte CONR30522SSNA</h2>
            </td>
          </tr>
        </table>
      </header>
<body>
<header class="hdr">
</header>
<div class="compania">

<table>
<tr>
<td>
<div><b> #{DATOS_COMPANIA.NM_COMPANIA}#</b></div>
        <div><b> #{DATOS_COMPANIA.CUIT}#</b></div>
        <div><b> #{DATOS_COMPANIA.UBICACION1}#</b></div>
        <div><b> #{DATOS_COMPANIA.UBICACION2}#</b></div>
</td>

<td style="text-align:right;">
<b>FECHA:</b> #{CABECERA.FECHA_ACTUAL}#<br>
<b>HORA:</b> #{CABECERA.HORA_ACTUAL}#<br>
<b>REF:</b> CONR30522SSNE#
</td>
</tr>
</table>
</div>

<table style="margin-bottom:4px;">
<tr>
<div style="text-align:center;">UNIDAD ADMINISTRATIVA: #{CABECERA.NM_UNIDAD_ADM}#</div>
<div style="text-align:center;">REGISTRO DE EMISION - POLIZAS COMPARTIDAS</div>
<div style="text-align:center;">DESDE EL:</b> #{CABECERA.FECHA_DESDE}# - HASTA EL #{CABECERA.FECHA_HASTA}#</div>
<tr>
</tr>
</table>
 <div style="text-align:left;"><b>HASH:</b> #{Q_HASH HASH}#</div>

<h3 style="margin-bottom:2px;">INVALIDADAS</h3>
<h3 style="margin-bottom:2px;">Total Invalidadas: #{Q_INVALIDADAS.TOTAL}#</h3>


<h3>EMITIDAS</h3>
<h4>Moneda: #{Q_4.DE_MONEDA}#</h4>

<table class="table-data">

<thead>
<tr>
<th style="width:6%; font-size:7px; text-align:left;">Fecha</th>
<th style="width:5%;  font-size:7px;">Poliza</th>
<th style="width:5%;  font-size:7px;  text-align:left;">Certif.</th>
<th style="width:5%;  font-size:7px;">Endoso</th>
<th style="width:10%; font-size:7px; text-align:center;">Asegurado</th>
<th style="width:8%;  font-size:7px; text-align:right;">Suma</th>
<th style="width:8%;  font-size:7px;">Desde</th>
<th style="width:8%;  font-size:7px;">Hasta</th>
<th style="width:10%;  font-size:7px; text-align:center;">Comision</th>
<th style="width:3%;  font-size:7px; text-align:left;">Prima</th>
<th style="width:3%;  font-size:7px;">Der</th>
<th style="width:3%;  font-size:7px;">Rec</th>
<th style="width:3%;  font-size:7px;">Imp</th>
<th style="width:3%;  font-size:7px;">Sell</th>
<th style="width:3%;  font-size:7px;">Bonif</th>
<th style="width:3%;  font-size:7px;">IIBB</th>
<th style="width:3%;  font-size:7px;">Premio</th>
<th style="width:3%;  font-size:7px;">Tasa</th>
</tr>
</thead>

<tbody>
#[Q_EMISION]#
</tbody>

</table>

<h3>TOTALES RAMO</h3>

<table>
<tbody>
#[TOTALES_RAMO]#
</tbody>
</table>


<h3>TOTALES GENERALES</h3>

<table>
<tbody>
<thead>
<tr>
<th style="width:3%;  font-size:7px;"></th>
<th style="width:10%;  font-size:7px; text-align:left;">Comision</th>
<th style="width:3%;  font-size:7px; text-align:left;">Prima</th>
<th style="width:3%;  font-size:7px;  text-align:left;">Der</th>
<th style="width:3%;  font-size:7px;  text-align:left;">Rec</th>
<th style="width:3%;  font-size:7px;  text-align:left;">Imp</th>
<th style="width:3%;  font-size:7px;">Sell</th>
<th style="width:3%;  font-size:7px; text-align:left;">Bonif</th>
<th style="width:3%;  font-size:7px; text-align:left;">IIBB</th>
<th style="width:3%;  font-size:7px;">Premio</th>
</tr>
</thead>
<tr>
<td>TOTAL REGISTROS: #{TOTALES_GENERAL.TOTAL_REGISTROS}#</td>
<td>#{TOTALES_GENERAL.COMISION}#</td>
<td>#{TOTALES_GENERAL.PRIMA}#</td>
<td>#{TOTALES_GENERAL.DER_EM}#</td>
<td>#{TOTALES_GENERAL.RECARGOS}#</td>
<td>#{TOTALES_GENERAL.IMPUESTOS}#</td>
<td>#{TOTALES_GENERAL.SELLADOS}#</td>
<td>#{TOTALES_GENERAL.BONIF}#</td>
<td>#{TOTALES_GENERAL.IIBB}#</td>
<td>#{TOTALES_GENERAL.PREMIO}#</td>
</tr>
</tbody>
</table>


</body>
</html>
`
}