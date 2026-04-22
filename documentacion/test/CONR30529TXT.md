export default {

  name: "CONR30529TXT",
  effectiveDate: "2026-01-01",
  description: "Reservas de Riesgos en Curso - Exportación",

  params: {
    NU_SECUENCIA: { type: "number", required: true }
  },

  queries: {

    Q_RERR: `
    WITH P AS (
    SELECT 
        TRUNC(CAOS_FE_A) AS FECHA_DESDE,
        LAST_DAY(CAOS_FE_B) AS FECHA_HASTA
    FROM CART_ORDENES_PROCESOS
    WHERE CAOS_NU_SECUENCIA = :NU_SECUENCIA
)

SELECT /*+ INDEX(R RERR_INDEX_1) */
    R.RERR_CACE_CD_RAMO                           AS cd_ramo,
    R.RERR_CACE_CAPO_NU_POLIZA                    AS poliza,
    R.RERR_CACE_NU_CERTIFICADO                    AS certif,
    R.RERR_CAPU_CD_PRODUCTO                       AS prod,
    R.RERR_CAPB_CD_PLAN                           AS plan,
    to_char(R.RERR_CJOD_FE_EFECTIVA)              AS fe_efectiva,
    to_char(R.RERR_CACE_FE_DESDE)                 AS fe_desde,
    to_char(R.RERR_CACE_FE_HASTA)                 AS fe_hasta,
    R.RERR_CARE_MT_PRIMA                          AS prima,
    R.RERR_CARG_ADM + R.RERR_CARG_DEROP           AS adm_der,
    R.RERR_MT_PRIMA_RECARGO                       AS pma_rec,
    R.RERR_MT_PRIMA_CEDIDA                        AS pma_ced,
    R.RERR_CARE_MT_COMISION                       AS comision,
    R.RERR_NU_DIAS_VIGENCIA                       AS dias_vig,
    R.RERR_NU_DIAS_NO_CORRIDOS                    AS dias_no_cor,
    R.RERR_MT_PRIMA_REC_NO_DEVENG                 AS pma_rec_ndv,
    R.RERR_MT_REASEG_NO_DEVENG                    AS reaseg_ndv,
    ROUND(
        R.RERR_CARE_MT_COMISION *
        R.RERR_NU_DIAS_NO_CORRIDOS /
        NULLIF(R.RERR_NU_DIAS_VIGENCIA, 0),
    2)                                            AS comision_ndv,
    R.RERR_MT_RRC_NETA                            AS rrc_neta,
    C.CARP_DE_RAMO                                AS de_ramo

FROM BATB_REASEG_RRC R
JOIN CART_RAMOS_POLIZAS C
    ON C.CARP_CD_RAMO = R.RERR_CACE_CD_RAMO
CROSS JOIN P

WHERE R.RERR_CJOD_FE_EFECTIVA 
      BETWEEN P.FECHA_DESDE AND P.FECHA_HASTA
AND R.RERR_NU_DIAS_NO_CORRIDOS > 0
AND R.RERR_CARE_MT_REC_ADM NOT IN (19,50)

ORDER BY
    R.RERR_CACE_CD_RAMO,
    R.RERR_CACE_CAPO_NU_POLIZA,
    R.RERR_CACE_NU_CERTIFICADO,
    R.RERR_CJOD_FE_EFECTIVA
    `,
    Q_COMPANIA: `
      SELECT
        CJCM_NM_COMPANIA AS "LINEA_1|string",
        CJCM_DI_UBICACION1 || ' - ' || CJCM_ZN_POSTAL || ' - ' || CJCM_DI_UBICACION2 AS "LINEA_2|string"
      FROM CAJT_COMPANIAS
      WHERE CJCM_CD_COMPANIA = 1
    `,
  },

layout: `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>CONR30529TXT</title>

<style>
  body { 
    font-size: 4px; 
    margin: 10px; 
  }
  h3 {
    margin-bottom: 10px;
  }
  table { 
    width: 100%; 
  }
  th, td { 
    padding: 2px 3px; 
    white-space: nowrap;
    width: auto;
  }
  th { 
    background: #eaeaea; 
    font-weight: bold; 
    text-align: center; 
  }
    .hdr {
        width: 100%;
        margin-bottom: 8px;
        padding-bottom: 15px;
      }

      .hdr__tbl {
        width: 100%;
      }

      .hdr__logo {
        height: 42px;
        width: auto;
        display: block;
        margin-left: 20px;
        margin-top: 40px;
      }

      .hdr__title {
        margin: 0;
        text-align: right;
        font-size: 11px;
        color: #000;
        margin-right: 20px;
        margin-top: 30px;
      }
.title { text-align:center; font-weight:bold; margin:10px 0; font-size:12px;}
</style>
</head>
<header class="hdr">
        <table class="hdr__tbl">
          <tr>
            <td>
              <img src="logoZS.svg" alt="Zurich Santander" class="hdr__logo" />
            </td>
            <td class="right">
              <h4 class="hdr__title">CONR30529TXT</h4>
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
REGISTRO DE RESERVAS DE RIESGOS EN CURSO
</div>
<body>
<table>


<tbody>
#[Q_RERR]#
</tbody>

</table>

</body>
</html>
`
}