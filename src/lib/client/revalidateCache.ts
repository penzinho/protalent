const REVALIDATE_ENDPOINT = '/api/cache/revalidate';

export async function revalidateCachePaths(paths: string[]): Promise<boolean> {
  if (!Array.isArray(paths) || paths.length === 0) return false;

  try {
    const response = await fetch(REVALIDATE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    });

    return response.ok;
  } catch (error) {
    console.error('Greška pri pozivu revalidate endpointa:', error);
    return false;
  }
}
