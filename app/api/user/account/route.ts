// DELETE /api/user/account — permanently delete the signed-in user's account
// and all associated data. Required by App Store Guideline 5.1.1(v).
//
// Most related rows (conversations, insights, payments, sessions,
// recommendations) cascade-delete via the schema's onDelete: Cascade; referral
// links are SetNull. So deleting the User row removes their data.

import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = withAuth(async (_request, authUser) => {
  try {
    await prisma.user.delete({ where: { id: authUser.id } });
    return Response.json({ deleted: true });
  } catch (error) {
    console.error("[account/delete] error", error);
    return Response.json({ error: "Failed to delete account" }, { status: 500 });
  }
});
