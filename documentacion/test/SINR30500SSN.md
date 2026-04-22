export default {
  name: "SINR30500SSN",
  effectiveDate: "2025-01-01",
  description: "Registro de Denuncias de Siniestros (Migrado Oracle Reports)",

  /* =========================
     Parámetros
  ========================= */
  params: {
    NU_SECUENCIA: { type: "number", required: true },

    CD_RAMO_SSN:  { type: "string", required: true },
  },

  /* =========================
     Queries
  ========================= */
  queries: {

    MAIN: `
      SELECT 75 AS "ORDEN" FROM DUAL
    `,

    /* Cabecera */
    CABECERA: `
     SELECT
  OP.CAOS_CD_USUARIO                      AS "USUARIO|string",

  U.CAUS_CAGR_CD_COMPANIA                 AS "CD_COMPANIA|string",

  C.CACM_DE_COMPANIA                      AS "NM_COMPANIA|string",

  U.CAUS_CAGR_CD_UNIDAD_ADM               AS "CD_UNIDAD_ADM|string",

  G.CAGR_NM_UNIDAD_ADM                    AS "NM_UNIDAD_ADM|string",

  TO_CHAR(OP.CAOS_FE_ORDEN,'DD/MM/YYYY')
    AS "FECHA_ORDEN|string",

  TO_CHAR(
    TRUNC(LEAST(OP.CAOS_FE_A, OP.CAOS_FE_B)),
    'DD/MM/YYYY'
  ) AS "FECHA_DESDE|string",

  TO_CHAR(
    TRUNC(GREATEST(OP.CAOS_FE_A, OP.CAOS_FE_B)),
    'DD/MM/YYYY'
  ) AS "FECHA_HASTA|string",

  TO_CHAR(SYSDATE,'HH24:MI')
    AS "HORA_REP|string|center"

FROM CART_ORDENES_PROCESOS OP

JOIN CART_USUARIOS U
  ON U.CAUS_CD_USUARIO = OP.CAOS_CD_USUARIO

JOIN CART_GERENCIAS G
  ON G.CAGR_CD_COMPANIA   = U.CAUS_CAGR_CD_COMPANIA
 AND G.CAGR_CD_UNIDAD_ADM = U.CAUS_CAGR_CD_UNIDAD_ADM

JOIN CART_COMPANIAS C
  ON C.CACM_CD_COMPANIA = U.CAUS_CAGR_CD_COMPANIA

WHERE OP.CAOS_NU_SECUENCIA = :NU_SECUENCIA
    `,

    /* Datos */
 Q_DATOS: `
WITH P AS (
  SELECT
    TRUNC(
      LEAST(
        NVL(CAOS_FE_A,CAOS_FE_B),
        NVL(CAOS_FE_B,CAOS_FE_A)
      )
    ) AS F_DESDE,

    TRUNC(
      GREATEST(
        NVL(CAOS_FE_A,CAOS_FE_B),
        NVL(CAOS_FE_B,CAOS_FE_A)
      )
    ) AS F_HASTA

  FROM CART_ORDENES_PROCESOS

  WHERE CAOS_NU_SECUENCIA = (
    SELECT TO_NUMBER(REGEXP_SUBSTR(:NU_SECUENCIA,'[0-9]+'))
    FROM DUAL
  )
)
SELECT
  S.SISI_NU_SINIESTRO        AS "SINIESTRO|int|center",
  C.SICE_CACE_CAPO_NU_POLIZA AS "POLIZA|int|center",
  C.SICE_CACE_NU_CERTIFICADO AS "CERTIFICADO|int|center",

  CL.CACN_NM_APELLIDO_RAZON  AS "ASEGURADO|string|center",

  CA.SICS_DE_CAUSA          AS "CAUSA|string|start",

  TO_CHAR(S.SISI_FE_OCURRENCIA,'DD/MM/YYYY')
    AS "F_OCURRENCIA|string|center",

  TO_CHAR(S.SISI_FE_DECLARACION,'DD/MM/YYYY')
    AS "F_DECLARACION|string|center",

  RECTOR.OBTENER_CUIS(
    S.SISI_CASU_CD_SUCURSAL,
    S.SISI_NU_SINIESTRO
  ) AS "CUIS|string|center"

FROM SINT_SINIESTROS S
JOIN SINT_CERTIFICADOS_SINIESTROS C
  ON S.SISI_NU_SINIESTRO = C.SICE_SISI_NU_SINIESTRO

JOIN CART_CLIENTES CL
  ON S.SISI_CACN_CD_NACIONALIDAD = CL.CACN_CD_NACIONALIDAD
 AND REGEXP_LIKE(CL.CACN_NU_CEDULA_RIF,'^[0-9]+$')
 AND TO_CHAR(S.SISI_CACN_NU_CEDULA_RIF) = CL.CACN_NU_CEDULA_RIF

JOIN SINT_CAUSA_SINIESTROS CA
  ON S.SISI_SICS_CARP_CD_RAMO = CA.SICS_CARP_CD_RAMO
 AND S.SISI_SICS_CD_CAUSA_SINIESTRO = CA.SICS_CD_CAUSA_SINIESTRO

CROSS JOIN P

WHERE
  S.SISI_FE_DECLARACION >= P.F_DESDE
  AND S.SISI_FE_DECLARACION <  P.F_HASTA + 1

ORDER BY
  S.SISI_CARP_CD_RAMO,
  S.SISI_NU_SINIESTRO
`,

    /* CUIS */
    Q_CUIS: `
      SELECT
        RECTOR.OBTENER_CUIS(
          S.SISI_CASU_CD_SUCURSAL,
          S.SISI_NU_SINIESTRO
        ) AS "CUIS|string"
      FROM SINT_SINIESTROS S
      WHERE S.SISI_NU_SINIESTRO = :SINIESTRO
    `,

    /* HASH */
    Q_HASH: `
      SELECT
        CAOS_NM_COLUMNA AS "HASH|string"
      FROM CART_ORDENES_PROCESOS
      WHERE CAOS_NU_SECUENCIA = :NU_SECUENCIA
    `,
  },

  /* =========================
     Layout
  ========================= */
  layout: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>CAJR30460</title>
<style>

html,body{
    margin:0;
    padding:0;
  }

  body{
      font-size:9px;
      line-height:1.25;   
        padding:4px 12px;
        margin-top:20px;
        gap:4px;
        font-family: Arial, sans-serif;
        font-weight:normal;
        font-style:normal;
        font-size:11px;
    }

.header{
  width:100%;
  display:flex;
  justify-content:space-between;
}

.header .center{
  text-align:center;
  font-weight:bold;
}

.hash{
  margin:6px 0;
  border-top:1px solid #000;
  padding-top:3px;
}

table{
  width:100%;
  border-collapse:collapse;
  font-size:9px;
}

th{
  border-bottom:1px solid #000;
  text-align:left;
  padding:2px;
}

td{
  padding:2px;
}

.num{
  text-align:right;
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
      margin-top:60px; /* mismo “aire” que CAJR30400 */
    }

    .hdr__title{
      margin:0;
      text-align:right;
      font-size:18px;
      font-weight:600;
    }
   .hdr-left{ display:flex; gap:10px; align-items:flex-start; margin-bottom:8px; margin-top:20px; }
  .center{
    text-align:center;
    font-weight:bold;
    margin:12px 0;
  }
   /* Oculta la primera fila generada por el motor */
    tbody tr:first-child {
      display: none;
    }
</style>

</head>
<body>
<header class="header">
      <img class="hdr__logo" src="logoZS.svg" alt="Zurich Santander" />
      <h2 class="hdr__title">Reporte SINR30500SSN</h2>
   </header>
<div>

  <div class="hdr-left">
      <div class="hdr-meta">
        <div><b>Compania:</b> #{CABECERA.NM_COMPANIA}#</div>
        <div><b>Unidad:</b> #{CABECERA.NM_UNIDAD_ADM}#</div>
        <div><b>Usuario:</b> #{CABECERA.USUARIO}#</div>
      </div>
    </div>

  <div class="center">
    REGISTRO DE DENUNCIAS DE SINIESTROS<br>
    DESDE #{Q_DATOS.F_OCURRENCIA}# HASTA #{Q_DATOS.F_DECLARACION}#
  </div>


</div>


<div class="hash">
  <b>HASH:</b>
    #{Q_HASH.HASH}#
</div>
  <div style=" margin-bottom:12px; font-size:11px;">
  Ramo: 21<br>
  </div>

<table>

<thead>
<tr>
  <th style="width:6%">Siniestro</th>
  <th style="width:5%">Poliza</th>
  <th style="width:5%">Cert.</th>
  <th style="width:15%;">Asegurado</th>
  <th style="width:29%; text-align:left;">Causa</th>
  <th style="width:5%; text-align:left;">F.Ocurr.</th>
  <th style="width:9%; text-align:center;">F.Den.</th>
  <th style="width:30%">CUIS</th>
</tr>
</thead>

<tbody>

#[Q_DATOS]#



</tbody>

</table>
</body>
</html>
`
};