export async function GET() {
  return Response.json({
    bun: process.versions?.bun ?? null,
    node: process.versions?.node ?? null,
    bunGlobal: typeof (globalThis as any).Bun !== "undefined",
    release: (process as any).release?.name ?? null,
    execPath: process.execPath, 
    argv0: process.argv0
  });
}
