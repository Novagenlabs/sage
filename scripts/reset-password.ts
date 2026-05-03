// One-off password reset for local emergencies (forgotten password,
// stuck test account). Use the proper /auth/forgot-password flow in
// production — this script bypasses all the safeguards and is meant
// for the developer running it directly against their own DB.
//
// Usage:
//   npx tsx scripts/reset-password.ts <email> <new-password>

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  const [, , email, newPassword] = process.argv;
  if (!email || !newPassword) {
    console.error(
      "Usage: npx tsx scripts/reset-password.ts <email> <new-password>"
    );
    process.exit(1);
  }
  if (newPassword.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`No user found with email ${email}`);
      process.exit(1);
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });
    console.log(`Password reset for ${email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
