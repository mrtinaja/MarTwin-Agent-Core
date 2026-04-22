import { NextResponse } from 'next/server';

const CLOCKIFY_URL = 'https://api.clockify.me/api/v1';
const SQUAD_WS_ID = "5bd5bc8cb079871a22a73a6b"; // ID verificado previamente

const getHeaders = () => ({
  'X-Api-Key': process.env.CLOCKIFY_API_KEY!,
  'Content-Type': 'application/json'
});

export async function GET() {
  const headers = getHeaders();
  try {
    const userRes = await fetch(`${CLOCKIFY_URL}/user`, { headers, cache: 'no-store' });
    const user = await userRes.json();
    
    const res = await fetch(
      `${CLOCKIFY_URL}/workspaces/${SQUAD_WS_ID}/user/${user.id}/time-entries?hydrated=true&page-size=8`,
      { headers, cache: 'no-store' }
    );
    
    const data = await res.json();
    
    const cleanData = Array.isArray(data) ? data.map(e => {
      // Lógica de detección LIVE robusta
      const start = e.timeInterval?.start;
      const end = e.timeInterval?.end;
      
      // Si end es null, o es igual a start, o no existe -> Está LIVE
      const isActuallyRunning = !end || end === start;

      return {
        id: e.id,
        description: e.description || "OPERACIÓN_SQUAD",
        projectName: e.project?.name || "SQUAD_PROJ",
        startTime: start,
        endTime: isActuallyRunning ? null : end, // Forzamos null si detectamos que corre
        isLive: isActuallyRunning
      };
    }) : [];

    return NextResponse.json(cleanData);
  } catch (e) {
    return NextResponse.json([]);
  }
}