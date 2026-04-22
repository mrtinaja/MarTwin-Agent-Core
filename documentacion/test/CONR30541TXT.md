export default {
  name: "CONR30541TXT",
  effectiveDate: "2025-01-01",
  description: "Emisiones y Anulaciones de Pólizas (CONR3054)",

  params: {
    NU_SECUENCIA: { type: "number", required: true },
    CD_RAMO:      { type: "number", required: false }, // 0 = todos
    MAX_FILAS:    { type: "number", required: false }  // default 1500
  },

  queries: {
    MAIN: `
      SELECT 75 AS "ORDEN"
      FROM CART_ORDENES_PROCESOS
      WHERE CAOS_NU_SECUENCIA = :NU_SECUENCIA
    `,

    Q_DETAILS: `
      WITH P AS (
        SELECT
          TRUNC(LEAST(CAOS_FE_A, CAOS_FE_B))     AS FECHA_DESDE,
          TRUNC(GREATEST(CAOS_FE_A, CAOS_FE_B)) AS FECHA_HASTA
        FROM CART_ORDENES_PROCESOS
        WHERE CAOS_NU_SECUENCIA = :NU_SECUENCIA
      )
      SELECT *
      FROM (
        /* =========================
           Parte 1: BATB_REASEG_RRC
           ========================= */
        SELECT
          DECODE(R.RERR_CJOD_CD_OPERACION,
                 6001,'EMISION',
                 6003,'EMISION',
                 6004,'EMISION',
                 2043,'EMISION',
                 2044,'EMISION',
                 'ANULACION')                       AS "Operacion|string|center",
          R.RERR_CJOD_FE_EFECTIVA                  AS "Fecha emision|date|center",
          R.RERR_CACE_CD_RAMO                      AS "Ramo|int|center",
          R.RERR_CACE_CAPO_NU_POLIZA               AS "Poliza|int|center",
          R.RERR_CACE_NU_CERTIFICADO               AS "Cert|int|center",
          R.RERR_CAPU_CD_PRODUCTO                  AS "Prod|string|center",
          R.RERR_CAPB_CD_PLAN                      AS "Plan|string|center",
          R.RERR_CARE_NU_ENDOSO                    AS "Endoso|int|center",
          R.RERR_CACN_CD_NACIONALIDAD              AS "Tp doc|string|center",
          R.RERR_CACN_NU_CEDULA_RIF                AS "Nu doc|string|center",
          C.CACN_NM_APELLIDO_RAZON                 AS "Cliente|string|start",
          R.RERR_CACE_FE_DESDE                     AS "Desde pol|date|center",
          R.RERR_CACE_FE_HASTA                     AS "Hasta pol|date|center",
          R.RERR_CARE_MT_SUMA_ASEG                 AS "Suma aseg|money|end",
          R.RERR_CARE_MT_PRIMA                     AS "Prima|money|end",
          R.RERR_CARG_ADM                          AS "Adm|money|end",
          R.RERR_CARG_DEROP                        AS "Derop|money|end",
          R.RERR_CARG_FIN                          AS "Fin|money|end",
          R.RERR_CARG_INT                          AS "Int|money|end",
          R.RERR_CARG_ISS                          AS "Iss|money|end",
          R.RERR_CARG_IVA                          AS "Iva|money|end",
          R.RERR_CARG_SLL                          AS "Sll|money|end",
          R.RERR_CARG_SUP                          AS "Sup|money|end",
          R.RERR_CARG_BON                          AS "Bon|money|end",
          R.RERR_CARG_INGBR                        AS "Iibb|money|end",
          R.RERR_CARE_MT_PREMIO                    AS "Premio|money|end",
          R.RERR_CARE_MT_COMISION                  AS "Comision|money|end"
        FROM BATB_REASEG_RRC R
        JOIN CART_CLIENTES C
          ON C.CACN_CD_NACIONALIDAD = R.RERR_CACN_CD_NACIONALIDAD
         AND C.CACN_NU_CEDULA_RIF   = R.RERR_CACN_NU_CEDULA_RIF
        CROSS JOIN P
        WHERE R.RERR_CJOD_FE_EFECTIVA >= P.FECHA_DESDE
          AND R.RERR_CJOD_FE_EFECTIVA <  P.FECHA_HASTA + 1
          AND R.RERR_CJOD_CD_OPERACION NOT IN (2040,2041,7001,7002,7003,7004)
          AND (R.RERR_CACE_CD_RAMO = NVL(:CD_RAMO, 0) OR NVL(:CD_RAMO, 0) = 0)

        UNION ALL

        /* =========================
           Parte 2: Operaciones diarias (anulaciones) no presentes en RRC
           ========================= */
        SELECT
          DECODE(O.CAOD_CAOP_CD_OPERACION,
                 6001,'EMISION',
                 6003,'EMISION',
                 6004,'EMISION',
                 2043,'EMISION',
                 2044,'EMISION',
                 'ANULACION')                       AS "Operacion|string|center",
          O.CAOD_FE_OPERACION                      AS "Fecha emision|date|center",
          O.CAOD_CARP_CD_RAMO                      AS "Ramo|int|center",
          O.CAOD_CAPO_NU_POLIZA                    AS "Poliza|int|center",
          O.CAOD_CACE_NU_CERTIFICADO               AS "Cert|int|center",
          PR.CAPU_CD_PRODUCTO                      AS "Prod|string|center",
          CE.CACE_CAPB_CD_PLAN                     AS "Plan|string|center",
          NVL(O.CAOD_NU_ENDOSO, CE.CACE_NU_ENDOSO)  AS "Endoso|int|center",
          CL.CACN_CD_NACIONALIDAD                  AS "Tp doc|string|center",
          CL.CACN_NU_CEDULA_RIF                    AS "Nu doc|string|center",
          CL.CACN_NM_APELLIDO_RAZON                AS "Cliente|string|start",
          CE.CACE_FE_DESDE                         AS "Desde pol|date|center",
          CE.CACE_FE_HASTA                         AS "Hasta pol|date|center",
          CE.CACE_MT_SUMA_ASEGURADA                AS "Suma aseg|money|end",
          0                                        AS "Prima|money|end",
          0                                        AS "Adm|money|end",
          0                                        AS "Derop|money|end",
          0                                        AS "Fin|money|end",
          0                                        AS "Int|money|end",
          0                                        AS "Iss|money|end",
          0                                        AS "Iva|money|end",
          0                                        AS "Sll|money|end",
          0                                        AS "Sup|money|end",
          0                                        AS "Bon|money|end",
          0                                        AS "Iibb|money|end",
          0                                        AS "Premio|money|end",
          0                                        AS "Comision|money|end"
        FROM CART_OPERACIONES_DIARIAS O
        JOIN CART_CERTIFICADOS CE
          ON CE.CACE_CASU_CD_SUCURSAL = O.CAOD_CASU_CD_SUCURSAL
         AND CE.CACE_CARP_CD_RAMO     = O.CAOD_CARP_CD_RAMO
         AND CE.CACE_CAPO_NU_POLIZA   = O.CAOD_CAPO_NU_POLIZA
         AND CE.CACE_NU_CERTIFICADO   = O.CAOD_CACE_NU_CERTIFICADO
        JOIN CART_PRODUCTOS PR
          ON PR.CAPU_CARP_CD_RAMO = CE.CACE_CARP_CD_RAMO
         AND PR.CAPU_CD_PRODUCTO  = CE.CACE_CAPU_CD_PRODUCTO
        JOIN CART_CLIENTES CL
          ON CL.CACN_CD_NACIONALIDAD = CE.CACE_CACN_CD_NACIONALIDAD
         AND CL.CACN_NU_CEDULA_RIF   = CE.CACE_CACN_NU_CEDULA_RIF
        CROSS JOIN P
        WHERE O.CAOD_CAOP_CD_OPERACION = 1003
          AND O.CAOD_CD_SUB_OPERACION  = 0
          AND O.CAOD_FE_OPERACION >= P.FECHA_DESDE
          AND O.CAOD_FE_OPERACION <  P.FECHA_HASTA + 1
          AND (O.CAOD_CARP_CD_RAMO = NVL(:CD_RAMO, 0) OR NVL(:CD_RAMO, 0) = 0)
          AND NOT EXISTS (
            SELECT 1
            FROM BATB_REASEG_RRC RR
            WHERE RR.RERR_CJOD_CD_OPERACION IN (6002, 2002, 2042)
              AND RR.RERR_CJOD_FE_EFECTIVA >= P.FECHA_DESDE
              AND RR.RERR_CJOD_FE_EFECTIVA <  P.FECHA_HASTA + 1
              AND RR.RERR_CACE_CD_SUCURSAL   = CE.CACE_CASU_CD_SUCURSAL
              AND RR.RERR_CACE_CD_RAMO       = CE.CACE_CARP_CD_RAMO
              AND RR.RERR_CACE_CAPO_NU_POLIZA = CE.CACE_CAPO_NU_POLIZA
              AND RR.RERR_CACE_NU_CERTIFICADO = CE.CACE_NU_CERTIFICADO
          )
        ORDER BY 3, 1 DESC, 2, 4, 5
      )
      WHERE ROWNUM <= NVL(:MAX_FILAS, 1500)
    `
  },

  layout: `
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>CONR3054 - Emisiones y Anulaciones</title>
    <style>
      body {
        gap: 4px;
        padding-top: 100px;
        padding: 15px;
        margin: 0;
      }
      .hdr {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
        width: 100%;
        padding-top: 20px;
        align-items: flex-start;
      }
      .hdr__logo {
        height: 40px;
        width: auto;
        display: block;
        margin-top: 50px;
      }
      .hdr__title {
        margin: 0;
        text-align: right;
        font-size: 18px;
        font-weight: 600;
        margin-top: -37px;
      }
      table {
        font-size: 5.2px;
        margin: 0;
        padding: 0;
      }
    </style>
  </head>

  <body>
    <header class="hdr">
      <img src="logoZS.svg" alt="Zurich Santander" class="hdr__logo" />
      <h2 class="hdr__title">Reporte CONR30541</h2>
    </header>

    <main>
      <h4>Detalle de pólizas</h4>
      <div class="table">
        <div class="table">
          #[Q_DETAILS]#
        </div>
      </div>
    </main>
  </body>
</html>
  `
};