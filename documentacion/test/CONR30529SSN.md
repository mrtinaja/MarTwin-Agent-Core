export default {

  name: "CONR30529SSN",
  effectiveDate: "2026-01-01",
  description: "Registro de Reservas de Riesgos en Curso - SSN",

  params: {
    NU_SECUENCIA: { type: "number", required: true },
    CD_RAMO_SSN:  { type: "string", required: true }
  },

  queries: {

  Q_COMPANIA: `
      SELECT
        CJCM_NM_COMPANIA AS "LINEA_1|string",
        CJCM_DI_UBICACION1 || ' - ' || CJCM_ZN_POSTAL || ' - ' || CJCM_DI_UBICACION2 AS "LINEA_2|string"
      FROM CAJT_COMPANIAS
      WHERE CJCM_CD_COMPANIA = 1
    `,

    Q_USER: `
  SELECT 
    USER "USUARIO|string",
    CAUS_CAGR_CD_UNIDAD_ADM "UNIDAD|string",
    TO_CHAR(SYSDATE,'DD/MM/YYYY') "FECHA|string",
    TO_CHAR(SYSDATE,'HH24:MI:SS') "HORA|string"
  FROM DUAL, CART_USUARIOS
  WHERE CAUS_CD_USUARIO = USER
`,

Q_RERR: `
WITH P AS (
  SELECT TRUNC(GREATEST(CAOS_FE_A, CAOS_FE_B)) AS FEC_CORTE
  FROM CART_ORDENES_PROCESOS
  WHERE CAOS_NU_SECUENCIA = :NU_SECUENCIA
),
RAMOS_SSN AS (
  SELECT DISTINCT CRRS_CARP_CD_RAMO
  FROM CONT_RELACION_RAMOS_SSN
  WHERE :CD_RAMO_SSN = 'TODOS'
     OR CRRS_CORS_CD_RAMO_SSN = :CD_RAMO_SSN
)

SELECT

  CASE 
    WHEN GROUPING(R.RERR_CACE_CD_RAMO)=1 THEN 'TOTAL GENERAL'
    WHEN GROUPING(R.RERR_CACE_CAPO_NU_POLIZA)=1 THEN 'TOTAL RAMO '||R.RERR_CACE_CD_RAMO
    ELSE C.CARP_DE_RAMO
  END RAMO_DESC,

  R.RERR_CACE_CD_RAMO RAMO,
  R.RERR_CACE_CD_SUCURSAL SUCUR,
  R.RERR_CACE_CAPO_NU_POLIZA POLIZA,
  R.RERR_CACE_NU_CERTIFICADO CERTIF,

  TO_CHAR(R.RERR_CJOD_FE_EFECTIVA,'DD/MM/YYYY') FEC_EMI,
  TO_CHAR(R.RERR_CACE_FE_DESDE,'DD/MM/YYYY') FEC_DES,
  TO_CHAR(R.RERR_CACE_FE_HASTA,'DD/MM/YYYY') FEC_HAS,

  SUM(R.RERR_CARG_ADM + R.RERR_CARG_DEROP) ADM_DER,
  SUM(R.RERR_MT_PRIMA_RECARGO - R.RERR_CARE_MT_COMISION) PRIMA_NET,
  SUM(R.RERR_CARE_MT_COMISION) COMISION,
  SUM(R.RERR_MT_PRIMA_CEDIDA) PRIMA_CED,
  SUM(R.RERR_NU_DIAS_VIGENCIA) DIAS_VIG,
  SUM(R.RERR_NU_DIAS_NO_CORRIDOS) DIAS_NO,
  SUM(R.RERR_MT_PRIMA_REC_NO_DEVENG) PRIMA_ND,
  SUM(R.RERR_MT_REASEG_NO_DEVENG) REASEG_ND,
  SUM(R.RERR_MT_RRC_NETA) RRC_NETA

FROM BATB_REASEG_RRC R
JOIN CART_RAMOS_POLIZAS C
  ON C.CARP_CD_RAMO = R.RERR_CACE_CD_RAMO
JOIN RAMOS_SSN S
  ON S.CRRS_CARP_CD_RAMO = R.RERR_CACE_CD_RAMO
CROSS JOIN P

WHERE R.RERR_CJOD_FE_EFECTIVA >= TRUNC(P.FEC_CORTE,'MM')
  AND R.RERR_CJOD_FE_EFECTIVA < ADD_MONTHS(TRUNC(P.FEC_CORTE,'MM'),1)
  AND R.RERR_CJOD_CD_OPERACION IN (6001,6003,6004,2043,2044)
  AND R.RERR_NU_DIAS_NO_CORRIDOS > 0
  AND R.RERR_CARE_MT_REC_ADM NOT IN (19,50)

GROUP BY GROUPING SETS (

  -- Detalle
  (
    C.CARP_DE_RAMO,
    R.RERR_CACE_CD_RAMO,
    R.RERR_CACE_CD_SUCURSAL,
    R.RERR_CACE_CAPO_NU_POLIZA,
    R.RERR_CACE_NU_CERTIFICADO,
    R.RERR_CJOD_FE_EFECTIVA,
    R.RERR_CACE_FE_DESDE,
    R.RERR_CACE_FE_HASTA
  ),

  -- Total por ramo
  (
    R.RERR_CACE_CD_RAMO
  ),

  -- Total general
  ()
)

ORDER BY
  CASE 
    WHEN GROUPING(R.RERR_CACE_CD_RAMO)=1 THEN 3   -- Total general
    WHEN GROUPING(R.RERR_CACE_CAPO_NU_POLIZA)=1 THEN 2 -- Total ramo
    ELSE 1                                        -- Detalle
  END,
  R.RERR_CACE_CD_RAMO,
  R.RERR_CACE_CAPO_NU_POLIZA
`
  },

 layout: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
body { font-family: Courier New, monospace; font-size: 6px; }
  tbody {
  display: flex;
  flex-direction: column;
}
tbody tr:nth-child(2) {
  order: 99;
}
.header { margin-bottom: 8px; }
.title { text-align:center; font-weight:bold; margin:10px 0; font-size:12px;}

.right { text-align:right; }
.center { text-align:center; }
.total { font-weight:bold; background:#e5e5e5; }

table { width:100%; border-collapse:collapse; }
th,td { padding:3px; }
th { background:#d9d9d9; }
.right{ text-align:right; }
      .center{ text-align:center; }
     .hdr__info {
  text-align:right;
  font-size:9px;
} 
  .hdr__title {
        margin: 0;
        text-align: right;
        font-size: 11px;
        color: #000;
        margin-right: 20px;
        margin-top: 30px;
      }
</style>
</head>
<body>
<header class="hdr">
        <table class="hdr__tbl">
          <tr>
            <td>
              <img src="logoZS.svg" alt="Zurich Santander" class="hdr__logo" />
            </td>
            <td class="right">
              <h2 class="hdr__title">CONR30529SSN</h2>
            </td>
          </tr>
        </table>
      </header>
<div class="header">
#{Q_COMPANIA.LINEA_1}#<br/>
#{Q_COMPANIA.LINEA_2}#<br/>
#{Q_COMPANIA.LINEA_5}#<br/>
#{Q_COMPANIA.LINEA_6}#<br/><br/>

UNIDAD ADMINISTRATIVA: #{Q_USER.UNIDAD}#<br/>
USUARIO: #{Q_USER.USUARIO}#
</div>
<div class="title">
REGISTRO DE RESERVAS DE RIESGOS EN CURSO - SSN
</div>

<tbody>
<table>
#[Q_RERR]#
</table>
</tbody>

</body>
</html>
`
}