import { prisma } from "../lib/prisma";

async function addCredits() {
  const email = process.argv[2];
  const amount = parseInt(process.argv[3] || "1000", 10);

  if (!email) {
    console.error("Usage: npx tsx scripts/add-credits.ts <email> [amount]");
    console.error("Example: npx tsx scripts/add-credits.ts john@doe.com 1000");
    process.exit(1);
  }

  if (isNaN(amount) || amount <= 0) {
    console.error("Error: Amount must be a positive number");
    process.exit(1);
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { credits: { increment: amount } },
      select: { id: true, email: true, name: true, credits: true },
    });

    console.log(`Added ${amount} credits to ${user.email}`);
    console.log(`New balance: ${user.credits} credits`);
  } catch (error: any) {
    if (error.code === "P2025") {
      console.error(`Error: No user found with email "${email}"`);
    } else {
      console.error("Error:", error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addCredits();
