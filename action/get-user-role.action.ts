"use server";

import { doc, getDoc } from "firebase/firestore";
import { clientDb } from "@/lib/firebase";
import { auth } from "@clerk/nextjs/server";

export async function checkAdminAccess() {
  const { userId } = await auth();

  if (!userId) return { isAdmin: false };

  try {
    const userRef = doc(clientDb, "USERS", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      return { isAdmin: userData.role === "ADMIN" };
    }

    return { isAdmin: false };
  } catch (error) {
    console.error("Auth Protocol Error:", error);
    return { isAdmin: false };
  }
}
