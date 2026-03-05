export async function getContext(req: Request) {
    const authHeader = req.headers.get("authorization");
    const tenantId = req.headers.get("x-tenant-id") ?? null;

    let userId = null;

    if (authHeader?.startsWith("Bearer ")) {
        try {
            const jwt = authHeader.replace("Bearer ", "");
            const payload = JSON.parse(atob(jwt.split(".")[1]));
            userId = payload.sub;
        } catch {
            // swallow errors; allow public
        }
    }

    return { tenantId, userId };
}
