import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DETAILS_MARKER = '{detalles_funcionales}';

function escapeXml(value: string) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeFileName(value: string) {
  return String(value || 'Generado')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildTextRuns(value: string) {
  const parts = String(value ?? '').split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return parts
    .map((part) => {
      const isBold = part.startsWith('**') && part.endsWith('**');
      const text = isBold ? part.slice(2, -2) : part;
      const runProps = isBold ? '<w:rPr><w:b/></w:rPr>' : '';

      return `<w:r>${runProps}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
    })
    .join('');
}

function paragraphXml(
  text: string,
  options: {
    style?: string;
    bold?: boolean;
    size?: number;
    color?: string;
    indent?: number;
  } = {}
) {
  const styleXml = options.style ? `<w:pStyle w:val="${options.style}"/>` : '';
  const indentXml = options.indent ? `<w:ind w:left="${options.indent}"/>` : '';
  const spacingXml = '<w:spacing w:after="140" w:line="276" w:lineRule="auto"/>';
  const paragraphProps = `<w:pPr>${styleXml}${spacingXml}${indentXml}</w:pPr>`;

  const runProps = [
    options.bold ? '<w:b/>' : '',
    options.size ? `<w:sz w:val="${options.size}"/>` : '',
    options.color ? `<w:color w:val="${options.color}"/>` : '',
  ].join('');

  const runs =
    options.bold || options.size || options.color
      ? `<w:r><w:rPr>${runProps}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`
      : buildTextRuns(text);

  return `<w:p>${paragraphProps}${runs}</w:p>`;
}

function tableXml(rows: string[][]) {
  if (!rows.length) return '';

  const columnCount = Math.max(...rows.map((row) => row.length));
  const widthPerColumn = Math.floor(9000 / Math.max(columnCount, 1));

  const tableRows = rows
    .map((row, rowIndex) => {
      const cells = Array.from({ length: columnCount }).map((_, index) => {
        const value = row[index] ?? '';
        const isHeader = rowIndex === 0;

        return `
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="${widthPerColumn}" w:type="dxa"/>
              ${isHeader ? '<w:shd w:fill="1E1248"/>' : ''}
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>
              </w:tcBorders>
            </w:tcPr>
            ${paragraphXml(value, {
              bold: isHeader,
              color: isHeader ? 'FFFFFF' : '1E1248',
              size: 20,
            })}
          </w:tc>
        `;
      });

      return `<w:tr>${cells.join('')}</w:tr>`;
    })
    .join('');

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9000" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>
        </w:tblBorders>
      </w:tblPr>
      ${tableRows}
    </w:tbl>
    ${paragraphXml('', { size: 8 })}
  `;
}

function isTableSeparator(line: string) {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function markdownToWordXml(markdown: string) {
  const lines = String(markdown || '')
    .replace(/\r\n/g, '\n')
    .split('\n');

  const blocks: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line) {
      blocks.push(paragraphXml('', { size: 20 }));
      index += 1;
      continue;
    }

    const nextLine = lines[index + 1]?.trim() || '';

    if (line.includes('|') && isTableSeparator(nextLine)) {
      const tableRows: string[][] = [parseTableRow(line)];
      index += 2;

      while (index < lines.length) {
        const current = lines[index].trim();

        if (!current || !current.includes('|')) break;

        tableRows.push(parseTableRow(current));
        index += 1;
      }

      blocks.push(tableXml(tableRows));
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);

    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();

      if (level === 1) {
        blocks.push(paragraphXml(text, { style: 'Heading1', bold: true, size: 36, color: '1E1248' }));
      } else if (level === 2) {
        blocks.push(paragraphXml(text, { style: 'Heading2', bold: true, size: 30, color: '1E1248' }));
      } else {
        blocks.push(paragraphXml(text, { style: 'Heading3', bold: true, size: 25, color: 'E50051' }));
      }

      index += 1;
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);

    if (bullet) {
      blocks.push(paragraphXml(`• ${bullet[1].trim()}`, { indent: 360 }));
      index += 1;
      continue;
    }

    const numbered = line.match(/^(\d+[.)])\s+(.+)$/);

    if (numbered) {
      blocks.push(paragraphXml(`${numbered[1]} ${numbered[2]}`, { indent: 360 }));
      index += 1;
      continue;
    }

    blocks.push(paragraphXml(line));
    index += 1;
  }

  return blocks.join('');
}

function injectRichDetailsXml(zip: PizZip, details: string) {
  const documentFile = zip.file('word/document.xml');

  if (!documentFile) {
    throw new Error('No se encontró word/document.xml dentro del template DOCX.');
  }

  const richXml = markdownToWordXml(details);
  const documentXml = documentFile.asText();

  const markerParagraph = new RegExp(
    `<w:p\\b[^>]*>(?:(?!<\\/w:p>)[\\s\\S])*?${DETAILS_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:(?!<\\/w:p>)[\\s\\S])*?<\\/w:p>`,
    'g'
  );

  const replacedXml = documentXml.replace(markerParagraph, richXml);

  if (replacedXml === documentXml) {
    throw new Error(`No se encontró el marcador ${DETAILS_MARKER} en el template DOCX.`);
  }

  zip.file('word/document.xml', replacedXml);
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const templatePath = path.join(process.cwd(), 'templates', 'docxtemplater.docx');

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: `No existe el template en: ${templatePath}` },
        { status: 404 }
      );
    }

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    injectRichDetailsXml(zip, data.detalles_funcionales || '');

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{',
        end: '}',
      },
    });

    doc.render({
      ...data,
      detalles_funcionales: '',
    });

    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    const reportName = sanitizeFileName(data.nombre_reporte || 'Generado');

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Informe_${reportName}.docx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
  console.error("ERROR:", error);

  const message =
    error instanceof Error
      ? error.message
      : "Error inesperado en la descarga del documento.";

  return NextResponse.json({ error: message }, { status: 500 });
}
}