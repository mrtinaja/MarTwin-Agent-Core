export default {
  name: "SINR30063SSN",
  effectiveDate: "2025-01-01",
  description: "Pendientes de siniestros (Empleados / No Empleados) acotado por NU_SECUENCIA",

  params: {
    NU_SECUENCIA: { type: "number", required: true },
    RAMOSSN: { type: "string", required: false }, // si no viene => 'TODOS' (vía NVL en SQL)
  },

  queries: {
    /* ---------- MAIN (orden/proceso) ---------- */
    MAIN: `
      SELECT 75 AS "ORDEN"
      FROM cart_ordenes_procesos
      WHERE caos_nu_secuencia = :NU_SECUENCIA
    `,

    /* ---------- CABECERA (usuario + unidad + periodo) ---------- */
CABECERA: `
SELECT
  USER AS "USUARIO|string|start",

  (SELECT u.caus_cagr_cd_compania
     FROM cart_usuarios u
    WHERE u.caus_cd_usuario = USER
      AND ROWNUM = 1) AS "CD_COMPANIA|string|start",

  (SELECT u.caus_cagr_cd_unidad_adm
     FROM cart_usuarios u
    WHERE u.caus_cd_usuario = USER
      AND ROWNUM = 1) AS "CD_UNIDAD_ADM|string|start",

  (SELECT g.cagr_nm_unidad_adm
     FROM cart_usuarios u
     JOIN cart_gerencias g
       ON g.cagr_cd_compania = u.caus_cagr_cd_compania
      AND g.cagr_cd_unidad_adm = u.caus_cagr_cd_unidad_adm
    WHERE u.caus_cd_usuario = USER
      AND ROWNUM = 1) AS "NM_UNIDAD_ADM|string|start",

  TO_CHAR(SYSDATE,'DD/MM/YYYY') AS "FECHA_REP|string|center",
  TO_CHAR(SYSDATE,'HH24:MI') AS "HORA_REP|string|center",

  (SELECT TO_CHAR(TRUNC(LEAST(p.caos_fe_a,p.caos_fe_b)),'DD/MM/YYYY')
     FROM cart_ordenes_procesos p
    WHERE p.caos_nu_secuencia = :NU_SECUENCIA) AS "FECHA_DESDE|string|center",

  (SELECT TO_CHAR(TRUNC(GREATEST(p.caos_fe_a,p.caos_fe_b)),'DD/MM/YYYY')
     FROM cart_ordenes_procesos p
    WHERE p.caos_nu_secuencia = :NU_SECUENCIA) AS "FECHA_HASTA|string|center",

  NVL(:RAMOSSN,'TODOS') AS "RAMOSSN|string|center",
  :NU_SECUENCIA AS "NU_SECUENCIA|int|center"
FROM dual
`,

Q_DATOS: `
SELECT
  p.caos_nu_secuencia       AS "NoEgreso|int|center",
  TO_CHAR(p.caos_fe_a,'DD/MM/YYYY') AS "FechaElaboracion|string|center",
  TO_CHAR(p.caos_fe_b,'DD/MM/YYYY') AS "MesPago|string|center"
FROM cart_ordenes_procesos p
WHERE p.caos_nu_secuencia = :NU_SECUENCIA
`,

    /* ---------- Q_COMPANIA ---------- */
    Q_COMPANIA: `
      SELECT
        cjcm_nm_compania AS "LINEA_1|string|start",
        cjcm_di_ubicacion1 || ' - ' || cjcm_zn_postal || ' - ' || cjcm_di_ubicacion2 AS "LINEA_2|string|start",
        'I.V.A. RESPONSABLE INSCRIPTO - A.G. PERCEPCION R.G. 3125' AS "LINEA_5|string|start",
        'ING. BRUTOS: ' ||
          RTRIM(
            SUBSTR(LTRIM(TO_CHAR(cjcm_nu_inscripcion_ib)),1,3) || '-' ||
            SUBSTR(LTRIM(TO_CHAR(cjcm_nu_inscripcion_ib)),4,5) || '-' ||
            SUBSTR(LTRIM(TO_CHAR(cjcm_nu_inscripcion_ib)),9,1)
          ) ||
          '      ' ||
        'C.U.I.T.: ' ||
          RTRIM(
            SUBSTR(LTRIM(TO_CHAR(cjcm_nu_cuit)),1,2) || '-' ||
            SUBSTR(LTRIM(TO_CHAR(cjcm_nu_cuit)),3,8) || '-' ||
            SUBSTR(LTRIM(TO_CHAR(cjcm_nu_cuit)),11,1)
          ) AS "LINEA_6|string|start"
      FROM cajt_companias
      WHERE cjcm_cd_compania = 1
    `,

    /* ---------- Q_USER (opcional) ---------- */
    Q_USER: `
      SELECT
        caus_cagr_cd_compania AS "CD_COMPANIA|string|start",
        USER AS "USUARIO|string|start",
        caus_cagr_cd_unidad_adm AS "CD_UNIDAD_ADM|string|start",
        cagr_nm_unidad_adm AS "NM_UNIDAD_ADM|string|start"
      FROM
        dual,
        cart_usuarios,
        cart_gerencias
      WHERE
        caus_cd_usuario = USER
        AND cagr_cd_compania = caus_cagr_cd_compania
        AND cagr_cd_unidad_adm = caus_cagr_cd_unidad_adm
    `,

    /* =========================================================
       Q_EMPLEADOS (clase producto = 'EM')  -- SIN HAVING
       * Aliases ajustados para matchear el HTML
       ========================================================= */
Q_EMPLEADOS: `
WITH P AS (
  SELECT
    TRUNC(GREATEST(caos_fe_a,caos_fe_b))+1 AS H,
    ADD_MONTHS(TRUNC(GREATEST(caos_fe_a,caos_fe_b))+1, -12) AS DESDE
  FROM cart_ordenes_procesos
  WHERE caos_nu_secuencia = :NU_SECUENCIA
),

/* 1) Movimientos ya filtrados y resumidos */
MOV AS (
  SELECT
    sims.sims_sisi_casu_cd_sucursal AS suc,
    sims.sims_sisi_nu_siniestro     AS siniestro,
    SUM(NVL(sims.sims_mt_movimiento,0)) AS importe
  FROM sint_movimiento_siniestros sims
  CROSS JOIN P
  WHERE sims.sims_tp_movimiento NOT IN ('NI','NE')
    AND sims.sims_fe_movimiento >= P.DESDE
AND sims.sims_fe_movimiento <  P.H
    AND ROWNUM < 20000
  GROUP BY
    sims.sims_sisi_casu_cd_sucursal,
    sims.sims_sisi_nu_siniestro
  HAVING SUM(NVL(sims.sims_mt_movimiento,0)) > 0
)

SELECT
  s.sisi_nu_siniestro         AS "SINIESTRO|int|center",
  cace.cace_capo_nu_poliza    AS "POLIZA|int|center",
  cace.cace_nu_certificado    AS "CERTIFICADO|int|center",
  cacn.cacn_nm_apellido_razon AS "CLIENTE|string|start",

  MIN(sics.sics_de_causa)     AS "CAUSA|string|start",
  MIN(SUBSTR(rv.rv_meaning,1,15)) AS "STATUS|string|center",

  MIN(s.sisi_fe_ocurrencia)   AS "OCURRIDO|date|center",
   TRUNC(NVL(MIN(s.sisi_fe_notificacion), MIN(s.sisi_fe_declaracion))) AS "NOTIFICADO|date|center",
  MIN(s.sisi_fe_declaracion)  AS "DECLARADO|date|center",
ROUND(NVL(SUM(mov.importe),0) * 0.30, 2)     AS "IMP_CEDIDO|money|end",


  MAX(
    CASE 
      WHEN capu.capu_cacy_cd_clase = 'EM' THEN 1
      ELSE 0
    END
  ) AS ES_EM,
ROUND(NVL(SUM(mov.importe),0) * 0.70, 2)     AS "IMP_NETO|money|end",
  SUM(mov.importe)            AS "MT_PENDIENTE|money|end"
FROM MOV mov

JOIN sint_siniestros s
  ON s.sisi_casu_cd_sucursal = mov.suc
 AND s.sisi_nu_siniestro     = mov.siniestro

JOIN sint_certificados_siniestros sice
  ON sice.sice_sisi_casu_cd_sucursal = s.sisi_casu_cd_sucursal
 AND sice.sice_sisi_nu_siniestro     = s.sisi_nu_siniestro

JOIN cart_certificados cace
  ON cace.cace_casu_cd_sucursal = sice.sice_cace_casu_cd_sucursal
 AND cace.cace_capo_nu_poliza   = sice.sice_cace_capo_nu_poliza
 AND cace.cace_nu_certificado  = sice.sice_cace_nu_certificado

LEFT JOIN cart_productos capu
  ON capu.capu_carp_cd_ramo = cace.cace_carp_cd_ramo
 AND capu.capu_cd_producto = cace.cace_capu_cd_producto

JOIN cart_clientes cacn
  ON cacn.cacn_cd_nacionalidad = cace.cace_cacn_cd_nacionalidad
 AND cacn.cacn_nu_cedula_rif   = cace.cace_cacn_nu_cedula_rif

JOIN sint_causa_siniestros sics
  ON sics.sics_carp_cd_ramo       = s.sisi_carp_cd_ramo
 AND sics.sics_cd_causa_siniestro = s.sisi_sics_cd_causa_siniestro

JOIN cg_ref_codes rv
  ON rv.rv_domain = 'SINT_SINIESTROS.SISI_ST_SINIESTRO'
 AND SUBSTR(rv.rv_low_value,1,2) = s.sisi_st_siniestro

CROSS JOIN P

WHERE s.sisi_fe_declaracion <= P.H
GROUP BY
  s.sisi_nu_siniestro,
  cace.cace_capo_nu_poliza,
  cace.cace_nu_certificado,
  cacn.cacn_nm_apellido_razon
`,

    /* =========================================================
       Q_PENDIENTES (clase producto != 'EM') -- SIN HAVING
       * Aliases ajustados para matchear el HTML
       ========================================================= */
    Q_PENDIENTES: `
      SELECT
        s.sisi_nu_siniestro                     AS "SINIESTRO|int|center",
        MIN(cace.cace_capo_nu_poliza)           AS "POLIZA|int|center",
        MIN(sice.sice_cace_nu_certificado)      AS "CERTIFICADO|int|center",
        MIN(cacn.cacn_nm_apellido_razon)        AS "CLIENTE|string|start",
        MIN(sics.sics_de_causa)                 AS "CAUSA|string|start",
        MIN(SUBSTR(rv.rv_meaning,1,15))         AS "STATUS|string|center",
        MIN(s.sisi_fe_ocurrencia)               AS "OCURRIDO|date|center",
       TRUNC(NVL(MIN(s.sisi_fe_notificacion), MIN(s.sisi_fe_declaracion))) AS "NOTIFICADO|date|center",
        MIN(s.sisi_fe_declaracion)              AS "DECLARADO|date|center",
        SUM(NVL(sims.sims_mt_movimiento,0))     AS "MT_PENDIENTE|money|end",
        SUM(NVL(sims.sims_mt_movimiento,0))*0.30 AS "IMP_CEDIDO|money|end",
        SUM(NVL(sims.sims_mt_movimiento,0))*0.70 AS "IMP_NETO|money|end"
      FROM
        cart_ordenes_procesos p,
        sint_siniestros s,
        sint_certificados_siniestros sice,
        sint_movimiento_siniestros sims,
        sint_causa_siniestros sics,
        cart_certificados cace,
        cart_productos capu,
        cart_clientes cacn,
        cart_ramos_polizas carp,
        cg_ref_codes rv
      WHERE
            p.caos_nu_secuencia = :NU_SECUENCIA
        AND sims.sims_fe_movimiento BETWEEN TRUNC(LEAST(p.caos_fe_a, p.caos_fe_b))
                                        AND TRUNC(GREATEST(p.caos_fe_a, p.caos_fe_b))
        AND sims.sims_tp_movimiento NOT IN ('NI','NE')

        AND s.sisi_casu_cd_sucursal = sims.sims_sisi_casu_cd_sucursal
        AND s.sisi_nu_siniestro     = sims.sims_sisi_nu_siniestro
        AND s.sisi_fe_declaracion  <= TRUNC(GREATEST(p.caos_fe_a, p.caos_fe_b))

        AND sice.sice_sisi_casu_cd_sucursal = s.sisi_casu_cd_sucursal
        AND sice.sice_sisi_nu_siniestro     = s.sisi_nu_siniestro

        AND cace.cace_casu_cd_sucursal = sice.sice_cace_casu_cd_sucursal
        AND cace.cace_carp_cd_ramo     = sice.sice_cace_carp_cd_ramo
        AND cace.cace_capo_nu_poliza   = sice.sice_cace_capo_nu_poliza
        AND cace.cace_nu_certificado   = sice.sice_cace_nu_certificado

        AND capu.capu_carp_cd_ramo = cace.cace_carp_cd_ramo
        AND capu.capu_cd_producto = cace.cace_capu_cd_producto
        AND capu.capu_cacy_cd_clase <> 'EM'

        AND cacn.cacn_cd_nacionalidad = cace.cace_cacn_cd_nacionalidad
        AND cacn.cacn_nu_cedula_rif   = cace.cace_cacn_nu_cedula_rif

        AND carp.carp_cd_ramo = cace.cace_carp_cd_ramo

        AND sics.sics_carp_cd_ramo       = s.sisi_carp_cd_ramo
        AND sics.sics_cd_causa_siniestro = s.sisi_sics_cd_causa_siniestro

        AND rv.rv_domain = 'SINT_SINIESTROS.SISI_ST_SINIESTRO'
        AND SUBSTR(rv.rv_low_value,1,2) = s.sisi_st_siniestro

        AND (
             (NVL(:RAMOSSN,'TODOS') = 'TODOS' AND EXISTS (
                SELECT 1
                FROM cont_relacion_ramos_ssn r
                WHERE r.crrs_carp_cd_ramo = carp.carp_cd_ramo
             ))
          OR (NVL(:RAMOSSN,'TODOS') <> 'TODOS' AND EXISTS (
                SELECT 1
                FROM cont_relacion_ramos_ssn r
                WHERE r.crrs_carp_cd_ramo = carp.carp_cd_ramo
                  AND r.crrs_cors_cd_ramo_ssn = NVL(:RAMOSSN,'TODOS')
             ))
        )
      GROUP BY
        s.sisi_nu_siniestro
    `,

    /* =========================================================
       TOTALES (necesarios para que el HTML no quede vacío)
       ========================================================= */

    Q_TOT_RAMO_EM: `
WITH P AS (
  SELECT TRUNC(GREATEST(caos_fe_a,caos_fe_b))+1 H
  FROM cart_ordenes_procesos
  WHERE caos_nu_secuencia = :NU_SECUENCIA
),
MOV AS (
  SELECT
    sims.sims_sisi_casu_cd_sucursal AS suc,
    sims.sims_sisi_nu_siniestro     AS siniestro,
    SUM(NVL(sims.sims_mt_movimiento,0)) AS importe
  FROM sint_movimiento_siniestros sims
  CROSS JOIN P
  WHERE sims.sims_tp_movimiento NOT IN ('NI','NE')
    AND sims.sims_fe_movimiento < P.H
  GROUP BY
    sims.sims_sisi_casu_cd_sucursal,
    sims.sims_sisi_nu_siniestro
  HAVING SUM(NVL(sims.sims_mt_movimiento,0)) > 0
)
SELECT
  NVL(SUM(mov.importe),0) AS "MT_PENDIENTE|money|end",
  NVL(SUM(mov.importe),0)*0.30 AS "IMP_CEDIDO|money|end",
  NVL(SUM(mov.importe),0)*0.70 AS "IMP_NETO|money|end"
FROM MOV mov
JOIN sint_siniestros s
  ON s.sisi_casu_cd_sucursal = mov.suc
 AND s.sisi_nu_siniestro     = mov.siniestro
JOIN sint_certificados_siniestros sice
  ON sice.sice_sisi_casu_cd_sucursal = s.sisi_casu_cd_sucursal
 AND sice.sice_sisi_nu_siniestro     = s.sisi_nu_siniestro
JOIN cart_certificados cace
  ON cace.cace_casu_cd_sucursal = sice.sice_cace_casu_cd_sucursal
 AND cace.cace_capo_nu_poliza   = sice.sice_cace_capo_nu_poliza
 AND cace.cace_nu_certificado  = sice.sice_cace_nu_certificado
JOIN cart_productos capu
  ON capu.capu_carp_cd_ramo = cace.cace_carp_cd_ramo
 AND capu.capu_cd_producto  = cace.cace_capu_cd_producto
WHERE capu.capu_cacy_cd_clase = 'EM'
`,

    Q_TOT_RAMO_FAC: `
      WITH D AS (
        SELECT
          s.sisi_nu_siniestro AS siniestro,
          SUM(NVL(sims.sims_mt_movimiento,0)) AS mt_pendiente
        FROM
          cart_ordenes_procesos p,
          sint_siniestros s,
          sint_certificados_siniestros sice,
          sint_movimiento_siniestros sims,
          sint_causa_siniestros sics,
          cart_certificados cace,
          cart_productos capu,
          cart_ramos_polizas carp,
          cg_ref_codes rv
        WHERE
              p.caos_nu_secuencia = :NU_SECUENCIA
          AND sims.sims_fe_movimiento BETWEEN TRUNC(LEAST(p.caos_fe_a, p.caos_fe_b))
                                          AND TRUNC(GREATEST(p.caos_fe_a, p.caos_fe_b))
          AND sims.sims_tp_movimiento NOT IN ('NI','NE')

          AND s.sisi_casu_cd_sucursal = sims.sims_sisi_casu_cd_sucursal
          AND s.sisi_nu_siniestro     = sims.sims_sisi_nu_siniestro
          AND s.sisi_fe_declaracion  <= TRUNC(GREATEST(p.caos_fe_a, p.caos_fe_b))

          AND sice.sice_sisi_casu_cd_sucursal = s.sisi_casu_cd_sucursal
          AND sice.sice_sisi_nu_siniestro     = s.sisi_nu_siniestro

          AND cace.cace_casu_cd_sucursal = sice.sice_cace_casu_cd_sucursal
          AND cace.cace_carp_cd_ramo     = sice.sice_cace_carp_cd_ramo
          AND cace.cace_capo_nu_poliza   = sice.sice_cace_capo_nu_poliza
          AND cace.cace_nu_certificado   = sice.sice_cace_nu_certificado

          AND capu.capu_carp_cd_ramo = cace.cace_carp_cd_ramo
          AND capu.capu_cd_producto = cace.cace_capu_cd_producto
          AND capu.capu_cacy_cd_clase <> 'EM'

          AND carp.carp_cd_ramo = cace.cace_carp_cd_ramo

          AND sics.sics_carp_cd_ramo       = s.sisi_carp_cd_ramo
          AND sics.sics_cd_causa_siniestro = s.sisi_sics_cd_causa_siniestro

          AND rv.rv_domain = 'SINT_SINIESTROS.SISI_ST_SINIESTRO'
          AND SUBSTR(rv.rv_low_value,1,2) = s.sisi_st_siniestro

          AND (
               (NVL(:RAMOSSN,'TODOS') = 'TODOS' AND EXISTS (
                  SELECT 1 FROM cont_relacion_ramos_ssn r
                  WHERE r.crrs_carp_cd_ramo = carp.carp_cd_ramo
               ))
            OR (NVL(:RAMOSSN,'TODOS') <> 'TODOS' AND EXISTS (
                  SELECT 1 FROM cont_relacion_ramos_ssn r
                  WHERE r.crrs_carp_cd_ramo = carp.carp_cd_ramo
                    AND r.crrs_cors_cd_ramo_ssn = NVL(:RAMOSSN,'TODOS')
               ))
          )
        GROUP BY s.sisi_nu_siniestro
      )
      SELECT
        SUM(mt_pendiente) AS "MT_PENDIENTE|money|end",
        SUM(mt_pendiente)*0.30 AS "IMP_CEDIDO|money|end",
        SUM(mt_pendiente)*0.70 AS "IMP_NETO|money|end"
      FROM D
    `,

    Q_TOT_GENERAL: `
      WITH U AS (
        SELECT
          s.sisi_nu_siniestro AS siniestro,
          SUM(NVL(sims.sims_mt_movimiento,0)) AS mt_pendiente
        FROM
          cart_ordenes_procesos p,
          sint_siniestros s,
          sint_certificados_siniestros sice,
          sint_movimiento_siniestros sims,
          sint_causa_siniestros sics,
          cart_certificados cace,
          cart_productos capu,
          cart_ramos_polizas carp,
          cg_ref_codes rv
        WHERE
              p.caos_nu_secuencia = :NU_SECUENCIA
          AND sims.sims_fe_movimiento BETWEEN TRUNC(LEAST(p.caos_fe_a, p.caos_fe_b))
                                          AND TRUNC(GREATEST(p.caos_fe_a, p.caos_fe_b))
          AND sims.sims_tp_movimiento NOT IN ('NI','NE')

          AND s.sisi_casu_cd_sucursal = sims.sims_sisi_casu_cd_sucursal
          AND s.sisi_nu_siniestro     = sims.sims_sisi_nu_siniestro
          AND s.sisi_fe_declaracion  <= TRUNC(GREATEST(p.caos_fe_a, p.caos_fe_b))

          AND sice.sice_sisi_casu_cd_sucursal = s.sisi_casu_cd_sucursal
          AND sice.sice_sisi_nu_siniestro     = s.sisi_nu_siniestro

          AND cace.cace_casu_cd_sucursal = sice.sice_cace_casu_cd_sucursal
          AND cace.cace_carp_cd_ramo     = sice.sice_cace_carp_cd_ramo
          AND cace.cace_capo_nu_poliza   = sice.sice_cace_capo_nu_poliza
          AND cace.cace_nu_certificado   = sice.sice_cace_nu_certificado

          AND capu.capu_carp_cd_ramo = cace.cace_carp_cd_ramo
          AND capu.capu_cd_producto = cace.cace_capu_cd_producto
          AND carp.carp_cd_ramo = cace.cace_carp_cd_ramo

          AND sics.sics_carp_cd_ramo       = s.sisi_carp_cd_ramo
          AND sics.sics_cd_causa_siniestro = s.sisi_sics_cd_causa_siniestro

          AND rv.rv_domain = 'SINT_SINIESTROS.SISI_ST_SINIESTRO'
          AND SUBSTR(rv.rv_low_value,1,2) = s.sisi_st_siniestro

          AND (
               (NVL(:RAMOSSN,'TODOS') = 'TODOS' AND EXISTS (
                  SELECT 1 FROM cont_relacion_ramos_ssn r
                  WHERE r.crrs_carp_cd_ramo = carp.carp_cd_ramo
               ))
            OR (NVL(:RAMOSSN,'TODOS') <> 'TODOS' AND EXISTS (
                  SELECT 1 FROM cont_relacion_ramos_ssn r
                  WHERE r.crrs_carp_cd_ramo = carp.carp_cd_ramo
                    AND r.crrs_cors_cd_ramo_ssn = NVL(:RAMOSSN,'TODOS')
               ))
          )
        GROUP BY s.sisi_nu_siniestro
      )
      SELECT
        SUM(mt_pendiente) AS "MT_PENDIENTE|money|end",
        SUM(mt_pendiente)*0.30 AS "IMP_CEDIDO|money|end",
        SUM(mt_pendiente)*0.70 AS "IMP_NETO|money|end",
        COUNT(DISTINCT siniestro) AS "CANTIDAD|int|center"
      FROM U
    `,
     /* HASH */
    Q_HASH: `
      SELECT
        NVL(CAOS_NM_COLUMNA,' ') AS "HASH|string"
      FROM CART_ORDENES_PROCESOS
      WHERE CAOS_NU_SECUENCIA = :NU_SECUENCIA
    `,
  },

layout: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>SINR30063SSN</title>

  <style>
    @page { margin: 12mm 12mm 20mm 12mm; }

    html, body {
      margin: 0;
      padding: 0;
      font-family: "Courier New", Courier, monospace;
      font-size: 6.5px; /* base */
      color: #000;
      background: #fff;
    }

    /* Wrapper */
    .wrap { padding: 10px; }

    /* ---------- HEADER (sin table) ---------- */
    .hdr {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }

    .hdr-left {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      flex: 1 1 auto;
      min-width: 0;
    }

    .logo-box {
      width: 130px;          /* ancho similar a Reports */
      flex: 0 0 130px;
      padding-top: 2px;
    }

    .logo-box img {
      height: 36px;
      width: auto;
      display: block;
    }

    .hdr-left-text {
      flex: 1 1 auto;
      min-width: 0;
      line-height: 1.2;
      white-space: nowrap;
    }

    .hdr-left-text .company {
      font-weight: bold;
    }

    .hdr-right {
      flex: 0 0 165px;       /* bloque derecho angosto */
      text-align: right;      /* en Reports suele quedar alineado “a columna” */
      line-height: 1.2;
      white-space: nowrap;
    }

    .row {
      display: flex;
      gap: 6px;
    }

    .lbl { width: 46px; }    /* “FECHA:”, “PAG.:”, “REF.:” */
    .val { flex: 1; }

    /* ---------- Título / vigencia ---------- */
    .title {
      font-weight: bold;
      margin-top:25px;
      white-space: nowrap;
      text-align: center;
      font-size:14px;
    }
    .title2 {
      font-weight: bold;
      margin-top:25px;
      white-space: nowrap;
      text-align: center;
      font-size:11px;
    }
    .vigencia {
      margin: 0 0 2px 0;
      white-space: nowrap;
    }

    /* líneas tipo Reports */
    .sep {
      border-top: 1px solid #000;
      margin: 4px 0;
    }

    /* ---------- Tabla principal ---------- */
    .tbl-wrap { margin-top: 4px; }

    table.tbl-big {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 6px;          /* pedido: que entren columnas */
    }

    table.tbl-big th,
    table.tbl-big td {
      border: none !important;
      padding: 1px 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: clip;
      font-weight: normal;
    }

    table.tbl-big th { text-align: left; }

    .right { text-align: right; }
    .center { text-align: center; }

    /* ---------- Bloque totales ---------- */
    .tot-block {
      margin-top: 6px;
      line-height: 1.6;
      font-size: 9px;
    }

    .dots { letter-spacing: 1px; }

    .stars {
      letter-spacing: 2px;
      text-align: right;
      font-weight: bold;
      white-space: nowrap;
    }

  </style>
</head>

<body>
  <div class="wrap">

   <!-- HEADER -->
<table width="100%" style="font-family:'Courier New', monospace; font-size:9px; border-collapse:collapse;">
  <tr>
    <!-- IZQUIERDA -->
    <td width="75%" valign="top">
      <table>
      <tr>
       <td width="140" valign="top" >
            <img src="logoZS.svg" height="36" style="margin-bottom:25px;"/>
          </td>
      </tr>
      </table>
      <table width="100%" style="border-collapse:collapse;" >
        <tr>
          <td valign="top">
            <div><b>Zurich Santander Seguros Argentina S.A.</b></div>
            <div>Ing. Enrique Butty 240, 9° - 1001 - C.A.B.A.</div>
            <div style="height:4px;"></div>
            <div>Usuario:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;#{CABECERA.USUARIO}#</div>
            <div>Unidad Adm:&nbsp;&nbsp;#{CABECERA.NM_UNIDAD_ADM}#</div>
            <div>Hash:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;#{Q_HASH.HASH}#</div>
          </td>
        </tr>
      </table>

    </td>

    <!-- DERECHA -->
    <td width="25%" valign="top">
      <table width="100%" style="border-collapse:collapse;">
        <tr>
          <td width="50">FECHA:</td>
          <td>#{CABECERA.FECHA_REP}#</td>
        </tr>
        <tr>
          <td>PAG.:</td>
          <td>1</td>
        </tr>
        <tr>
          <td>REF.:</td>
          <td>SINR30063SSN</td>
        </tr>
      </table>
    </td>

  </tr>
</table>
    <div ="title">
      <div class="title">Registro de Siniestros Pendientes al #{Q_DATOS.FechaElaboracion}#</div>
      <div class="title2">Vigencia Contrato Reaseguro:&nbsp;&nbsp;#{CABECERA.FECHA_DESDE}#&nbsp;&nbsp;-&nbsp;&nbsp;#{CABECERA.FECHA_HASTA}#</div>
    </div>
    <div class="sep"></div>

    <!-- TABLA -->
    <div class="tbl-wrap">
      <table class="tbl-big">
        <tbody>
          #[Q_EMPLEADOS]#
        </tbody>
      </table>
    </div>

    <div class="sep"></div>

    <!-- TOTALES -->
    <div class="tot-block">
      <div>
        TOTAL RAMO <span class="dots">..............................</span>
        CD RAMO <span class="dots">................</span>
        DE RAMO
      </div>

      <div class="right" style="margin-top:2px;">
        #{Q_TOT_RAMO_EM.MT_PENDIENTE}#<br>
        #{Q_TOT_RAMO_EM.IMP_CEDIDO}#<br>
        #{Q_TOT_RAMO_EM.IMP_NETO}#
      </div>

      <br>

      <div>
        Cantidad Siniestros <span class="dots">.........................</span>
        #{Q_TOT_GENERAL.CANTIDAD}#
      </div>

      <br>

      <div>
        CONTRATO: <span class="dots">.........................</span>
        NU CONTRATO: <span class="dots">....................</span>
        TP TRATADO: <span class="dots">...................</span>
      </div>

      <div>
        NM CONTRATO: <span class="dots">.....................</span>
        NU SERIE: <span class="dots">......................</span>
        CD MONEDA:
      </div>

      <br>

      <div>
        TOTAL CONTRATO <span class="dots">.........................</span>
      </div>

      <div class="stars">
        ***************<br>
        #{Q_TOT_GENERAL.MT_PENDIENTE}#<br>
        ***************
      </div>

      <br>

      <div>
        Cantidad Siniestros <span class="dots">.........................</span>
        #{Q_TOT_GENERAL.CANTIDAD}#
      </div>

      <br>

      <div>
        TOTAL GENERAL <span class="dots">.........................</span>
      </div>

      <div class="stars">
        ***************<br>
        #{Q_TOT_GENERAL.MT_PENDIENTE}#<br>
        ***************
      </div>

      <br>

      <div>
        Cantidad Siniestros <span class="dots">.........................</span>
        #{Q_TOT_GENERAL.CANTIDAD}#
      </div>
    </div>

  </div>
</body>
</html>
`,
};