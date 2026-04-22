export default {

  name: "CONR30548TXT",
  effectiveDate: "2025-01-01",
  description: "Reporte Retenciones IIBB (limitado por performance)",

  params: {
    NU_SECUENCIA: { type: "number", required: true },
    CD_RAMO: { type: "number", required: false, default: 0 },
    MAX_FILAS: { type: "number", required: false, default: 1000 },
  },

  queries: {

    /* =============================
       MAIN
    ============================= */
    MAIN: `
      SELECT 75 AS "ORDEN"
      FROM DUAL
    `,


    /* =============================
       CABECERA
    ============================= */
    CABECERA: `
      SELECT
        USER AS "USUARIO|string",
        TO_CHAR(SYSDATE,'DD/MM/YYYY') AS "FECHA|string",
        TO_CHAR(SYSDATE,'HH24:MI') AS "HORA|string",
        :NU_SECUENCIA AS "SECUENCIA|int"
      FROM dual
    `,


    /* =============================
       DATOS (OPTIMIZADO)
    ============================= */
 Q_DATA: `
WITH LIM AS (
  SELECT
    CASE
      WHEN REGEXP_LIKE(NVL(:MAX_FILAS,'1000'), '^\\d+$')
      THEN TO_NUMBER(:MAX_FILAS)
      ELSE 1000
    END AS N
  FROM dual
),
RAMO AS (
  SELECT
    CASE
      WHEN REGEXP_LIKE(NVL(:CD_RAMO,'0'), '^\\d+$')
      THEN TO_NUMBER(:CD_RAMO)
      ELSE 0
    END AS CD_RAMO
  FROM dual
),
P AS (
  SELECT
    TRUNC(LEAST(caos_fe_a, caos_fe_b))     AS FE_DESDE,
    TRUNC(GREATEST(caos_fe_a, caos_fe_b)) AS FE_HASTA
  FROM cart_ordenes_procesos
  WHERE caos_nu_secuencia = :NU_SECUENCIA
),

/* =====================================================
   1) Candidatos rápidos (STOPKEY)
   ===================================================== */
CAND AS (
  SELECT r.ROWID rid
  FROM batb_reaseg_rrc r
  CROSS JOIN P
  CROSS JOIN RAMO
  CROSS JOIN LIM
  WHERE r.rerr_cjod_fe_efectiva BETWEEN P.FE_DESDE AND P.FE_HASTA
    AND r.rerr_cjod_cd_operacion NOT IN (2040,2041,7001,7002,7003,7004)
    AND (RAMO.CD_RAMO = 0 OR r.rerr_cace_cd_ramo = RAMO.CD_RAMO)
    AND ROWNUM <= LIM.N
)

/* =====================================================
   2) Datos finales
   ===================================================== */
SELECT

  /* Operación */
  DECODE(r.rerr_cjod_cd_operacion,
    6001,'EMISION',
    6003,'EMISION',
    6004,'EMISION',
    2043,'EMISION',
    2044,'EMISION',
    'ANULACION'
  ) AS "OPERACION|string|start",

  /* Fechas */
  r.rerr_cjod_fe_efectiva      AS "FE_EMISION|date|center",

  /* Póliza */
  r.rerr_cace_cd_ramo          AS "RAMO|int|center",
  r.rerr_cace_capo_nu_poliza   AS "POLIZA|int|center",
  r.rerr_cace_nu_certificado   AS "CERT|int|center",
  r.rerr_care_nu_endoso        AS "ENDOSO|int|center",

  /* Cliente */
  r.rerr_cacn_cd_nacionalidad  AS "TP_DOC|string|center",
  r.rerr_cacn_nu_cedula_rif    AS "NU_DOC|string|center",
  c.cacn_nm_apellido_razon     AS "NM_CLIENTE|string|start",

  /* Vigencia */
  r.rerr_cace_fe_desde         AS "FE_DESDE_POL|date|center",
  r.rerr_cace_fe_hasta         AS "FE_HASTA_POL|date|center",

  /* Importes */
  r.rerr_care_mt_suma_aseg     AS "SUMA_ASEG|money|end",
  r.rerr_care_mt_prima         AS "PRIMA|money|end",

  r.rerr_carg_adm              AS "ADM|money|end",
  r.rerr_carg_derop            AS "DEROP|money|end",
  r.rerr_carg_fin              AS "FIN|money|end",
  r.rerr_carg_int              AS "INT|money|end",
  r.rerr_carg_iss              AS "ISS|money|end",
  r.rerr_carg_iva              AS "IVA|money|end",
  r.rerr_carg_sll              AS "SLL|money|end",
  r.rerr_carg_sup              AS "SUP|money|end",
  r.rerr_carg_bon              AS "BON|money|end",
  r.rerr_carg_ingbr            AS "IIBB|money|end",

  r.rerr_care_mt_premio        AS "PREMIO|money|end",
  r.rerr_care_mt_comision      AS "COMISION|money|end",

  /* Fecha origen */
  DECODE(r.rerr_cjod_cd_operacion,
    2002, r.rerr_fecha3,
    6002, r.rerr_fecha3,
    2042, r.rerr_fecha3,
    r.rerr_cjod_fe_efectiva
  ) AS "FECHA_ORIGEN|date|center"

FROM CAND
JOIN batb_reaseg_rrc r
  ON r.ROWID = CAND.rid

JOIN cart_clientes c
  ON c.cacn_cd_nacionalidad = r.rerr_cacn_cd_nacionalidad
 AND c.cacn_nu_cedula_rif   = r.rerr_cacn_nu_cedula_rif

ORDER BY
  r.rerr_cace_cd_ramo,
  DECODE(r.rerr_cjod_cd_operacion,
    6001,1,6003,1,6004,1,2043,1,2044,1,0
  ) DESC,
  r.rerr_cjod_fe_efectiva,
  r.rerr_cace_capo_nu_poliza,
  r.rerr_cace_nu_certificado
`
  },


  /* =============================
     LAYOUT
  ============================= */
  layout: `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>

<title>CAJR30480</title>

<style>

body{
  font-family: Courier New, monospace;
  font-size:4px;
  margin:15px;
}

h1{
  font-size:14px;
  text-align:center;
  margin:5px 0;
}

.header{
  display:flex;
  justify-content:space-between;
  margin-bottom:10px;
}

table{
  width:100%;
  border-collapse:collapse;
}

th,td{
  padding:2px 4px;
  white-space:nowrap;
}

th{
  border-bottom:1px solid #000;
}

.right{text-align:right;}
.center{text-align:center;}

.notice{
  font-size:8px;
  margin-top:5px;
  color:#444;
}
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
       padding-top:25px;
      }

      .hdr__title {
        margin: 0;
        text-align: right;
        font-size: 16px;
        color: #000;
        margin-right: 20px;
        margin-top: 30px;
      }
</style>
</head>
<header class="hdr">
        <table class="hdr__tbl">
          <tr>
            <td>
              <img src="logoZS.svg" alt="Zurich Santander" class="hdr__logo" />
            </td>
            <td class="right">
              <h2 class="hdr__title">CONR30548TXT - Retenciones IIBB </h2>
            </td>
          </tr>
        </table>
      </header>
<body>

<!-- CABECERA -->
<div class="header">

  <div>
    <b>Zurich Santander Seguros</b><br>
    Usuario: #{CABECERA.USUARIO}#<br>
    Secuencia: #{CABECERA.SECUENCIA}#
  </div>

  <div class="right">
    Fecha: #{CABECERA.FECHA}#<br>
    Hora: #{CABECERA.HORA}#<br>
    Ref: CAJR30480
  </div>

</div>

<h1>Detalle de Retenciones IIBB</h1>

<!-- TABLA -->
<table>


<tbody>

#[Q_DATA]#

</tbody>

</table>

</body>
</html>
`
};