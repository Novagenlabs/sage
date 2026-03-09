/**
 * Test script for push notifications.
 *
 * Usage:
 *   npx tsx scripts/test-push.ts <userId>
 *
 * Prerequisites:
 *   - VAPID keys configured in .env
 *   - User has subscribed to push notifications via the profile page
 *   - The PushSubscription table has at least one entry for the user
 *
 * This sends a test notification directly using the web-push library,
 * bypassing the API route (useful for testing without a browser session).
 */

import "dotenv/config";
import webpush from "web-push";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.log("Usage: npx tsx scripts/test-push.ts <userId>");
    console.log("\nTo find user IDs:");
    console.log("  npx tsx -e \"import {PrismaClient} from '@prisma/client'; const p = new PrismaClient(); p.user.findMany({select:{id:true,email:true}}).then(console.log)\"");
    process.exit(1);
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@sage-app.com";

  if (!publicKey || !privateKey) {
    console.error("VAPID keys not configured. Check .env");
    process.exit(1);
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    console.log(`No push subscriptions found for user ${userId}`);
    console.log("Make sure the user has enabled notifications on the profile page.");
    process.exit(1);
  }

  console.log(`Found ${subscriptions.length} subscription(s) for user ${userId}`);

  const payload = JSON.stringify({
    title: "Sage - Test",
    body: "Push notifications are working! Your insights will appear here.",
    url: "/chat",
    tag: "test-" + Date.now(),
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
      console.log(`Sent to ${sub.endpoint.slice(0, 60)}...`);
    } catch (error: unknown) {
      const err = error as { statusCode?: number; body?: string };
      console.error(`Failed: ${err.statusCode} - ${err.body}`);
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.log("  -> Subscription expired, cleaning up...");
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
      }
    }
  }

  console.log("\nDone!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
