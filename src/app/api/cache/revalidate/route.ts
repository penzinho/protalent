import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

const ALLOWED_EXACT_PATHS = new Set(['/klijenti']);
const DETAIL_PATH_REGEX = /^\/klijenti\/[A-Za-z0-9-]+$/;

const isAllowedPath = (path: string): boolean => {
  if (ALLOWED_EXACT_PATHS.has(path)) return true;
  return DETAIL_PATH_REGEX.test(path);
};

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const inputPaths = Array.isArray((body as { paths?: unknown })?.paths)
      ? ((body as { paths: unknown[] }).paths ?? [])
      : [];
    const normalizedPaths = inputPaths
      .filter((value: unknown): value is string => typeof value === 'string')
      .map((path: string) => path.trim())
      .filter((path: string) => path.length > 0);

    if (normalizedPaths.length === 0) {
      return NextResponse.json({ error: 'paths mora sadržavati barem jedan path.' }, { status: 400 });
    }

    const invalidPath = normalizedPaths.find((path: string) => !isAllowedPath(path));
    if (invalidPath) {
      return NextResponse.json({ error: `Path nije dozvoljen za revalidate: ${invalidPath}` }, { status: 400 });
    }

    const uniquePaths = Array.from(new Set(normalizedPaths));
    uniquePaths.forEach((path: string) => revalidatePath(path));

    return NextResponse.json({ revalidated: true, paths: uniquePaths });
  } catch (error) {
    console.error('Greška u /api/cache/revalidate:', error);
    return NextResponse.json({ error: 'Neuspjela invalidacija cachea.' }, { status: 500 });
  }
}
