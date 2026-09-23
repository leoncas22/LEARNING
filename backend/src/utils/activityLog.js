/**
 * Thin wrapper so every call site logs activity the same shape. Never pass
 * password/token values in `metadata` — see docs/authentication.md.
 */
export async function logActivity(prismaClient, { userId = null, companyId = null, action, entity, entityId = null, metadata = null }) {
  await prismaClient.activityLog.create({
    data: { userId, companyId, action, entity, entityId, metadata },
  });
}

export default logActivity;
