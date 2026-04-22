import { NextResponse } from 'next/server';

const CLOCKIFY_URL = 'https://api.clockify.me/api/v1';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('pId');
  const workspaceId = searchParams.get('wId');

  if (!projectId || !workspaceId) {
    return NextResponse.json({ error: 'Faltan IDs' }, { status: 400 });
  }

  try {
    // Buscamos el reporte de tiempo del proyecto
    const res = await fetch(
      `${CLOCKIFY_URL}/workspaces/${workspaceId}/projects/${projectId}`,
      {
        headers: {
          'X-Api-Key': process.env.CLOCKIFY_API_KEY!,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      }
    );

    const projectData = await res.json();

    // Clockify devuelve el tiempo en formato ISO 8601 (PT1H30M) 
    // Vamos a convertirlo a horas decimales para el gráfico
    const durationStr = projectData.duration || "PT0H0M";
    const hoursMatch = durationStr.match(/(\d+)H/);
    const minsMatch = durationStr.match(/(\d+)M/);
    
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const mins = minsMatch ? parseInt(minsMatch[1]) : 0;
    const totalHours = hours + (mins / 60);

    return NextResponse.json({ 
      totalHours,
      projectName: projectData.name 
    });
  } catch (e) {
    console.error("ERROR_CLOCKIFY_PROJECT_FETCH", e);
    return NextResponse.json({ totalHours: 0 }, { status: 500 });
  }
}