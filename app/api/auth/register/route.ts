import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { addCredits } from "@/lib/credits";
import { REFERRAL_CONFIG } from "@/lib/referral-config";

export async function POST(request: Request) {
  try {
    const { email, password, name, referralCode } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        credits: true,
      },
    });

    // Process referral code (non-blocking — never fail signup)
    let referralApplied = false;
    if (referralCode && typeof referralCode === "string") {
      try {
        const referrer = await prisma.user.findFirst({
          where: { referralCode },
          select: { id: true },
        });

        if (referrer && referrer.id !== user.id) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dailyCount = await prisma.referral.count({
            where: { referrerId: referrer.id, createdAt: { gte: today } },
          });
          const totalCount = await prisma.referral.count({
            where: { referrerId: referrer.id },
          });

          if (
            dailyCount < REFERRAL_CONFIG.MAX_REFERRALS_PER_DAY &&
            totalCount < REFERRAL_CONFIG.MAX_REFERRALS_PER_USER
          ) {
            await prisma.referral.create({
              data: {
                referrerId: referrer.id,
                referredUserId: user.id,
                status: "pending",
              },
            });

            await prisma.user.update({
              where: { id: user.id },
              data: { referredById: referrer.id },
            });

            const newCredits = await addCredits(user.id, REFERRAL_CONFIG.REFERRED_USER_BONUS);
            user.credits = newCredits;
            referralApplied = true;
          }
        }
      } catch (e) {
        console.error("Referral processing error (non-blocking):", e);
      }
    }

    return NextResponse.json({
      message: "Account created successfully",
      user,
      referralApplied,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
