import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const DETAILS_MARKER = '{detalles_funcionales}';

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildTextRuns(value: string) {
  const parts = value.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

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

function markdownToWordXml(markdown: string) {
  const lines = String(markdown || '')
    .replace(/\r\n/g, '\n')
    .split('\n');
  const paragraphs: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      paragraphs.push(paragraphXml('', { size: 20 }));
      continue;
    }

    if (/^\|?\s*-{3,}\s*\|/.test(line)) {
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);

    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();

      if (level === 1) {
        paragraphs.push(paragraphXml(text, { style: 'Heading1', bold: true, size: 36, color: '1E1248' }));
      } else if (level === 2) {
        paragraphs.push(paragraphXml(text, { style: 'Heading2', bold: true, size: 30, color: '1E1248' }));
      } else {
        paragraphs.push(paragraphXml(text, { style: 'Heading3', bold: true, size: 25, color: 'E50051' }));
      }

      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);

    if (bullet) {
      paragraphs.push(paragraphXml(`- ${bullet[1].trim()}`, { indent: 360 }));
      continue;
    }

    const numbered = line.match(/^\d+[.)]\s+(.+)$/);

    if (numbered) {
      paragraphs.push(paragraphXml(line, { indent: 360 }));
      continue;
    }

    if (line.includes('|')) {
      const cells = line
        .split('|')
        .map((cell) => cell.trim())
        .filter(Boolean);

      if (cells.length > 1) {
        paragraphs.push(paragraphXml(cells.join('  |  '), { size: 20 }));
        continue;
      }
    }

    paragraphs.push(paragraphXml(line));
  }

  return paragraphs.join('');
}

function injectRichDetailsXml(zip: PizZip, details: string) {
  const documentFile = zip.file('word/document.xml');

  if (!documentFile) return;

  const richXml = markdownToWordXml(details);
  const documentXml = documentFile.asText();
  const markerParagraph = new RegExp(
    `<w:p\\b[^>]*>(?:(?!<\\/w:p>)[\\s\\S])*?${DETAILS_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:(?!<\\/w:p>)[\\s\\S])*?<\\/w:p>`,
    'g'
  );

  zip.file('word/document.xml', documentXml.replace(markerParagraph, richXml));
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const templatePath = path.join(process.cwd(), 'templates', 'docxtemplater.docx');
    
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    injectRichDetailsXml(zip, data.detalles_funcionales || '');

    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    doc.render(data);

    const buf = doc.getZip().generate({ type: 'nodebuffer' });

    // FIX: Convertimos el Buffer a Uint8Array para que Response no proteste
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Informe_${data.nombre_reporte || 'Generado'}.docx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
