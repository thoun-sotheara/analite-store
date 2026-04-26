"use client";

import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import { isFirestorePermissionError } from "@/lib/firebase/permissions";

export type DashboardOrderStatus = "Completed" | "Pending" | "Refunded" | "Failed";

export type DashboardOrder = {
  id: string;
  buyer: string;
  buyerEmail: string;
  product: string;
  amount: number;
  status: DashboardOrderStatus;
  date: string;
  licenseKey: string;
  downloadUrl?: string;
  createdAtMs: number;
};

const ORDERS_COLLECTION = collection(firestore, "orders");

const seedOrders: DashboardOrder[] = [
  {
    id: "ORD-1001",
    buyer: "Store Buyer",
    buyerEmail: "buyer@analite.store",
    product: "Khmer Shopfront",
    amount: 79,
    status: "Completed",
    date: "2026-04-23",
    licenseKey: "KS-2026-0001",
    downloadUrl: "/downloads/khmer-shopfront.zip",
    createdAtMs: 1763817600000,
  },
  {
    id: "ORD-1002",
    buyer: "Borey Craft",
    buyerEmail: "agency@borey.studio",
    product: "Phnom Villa Pro",
    amount: 49,
    status: "Pending",
    date: "2026-04-22",
    licenseKey: "PV-2026-0002-PENDING",
    createdAtMs: 1763731200000,
  },
];

export function subscribeDashboardOrders(callback: (orders: DashboardOrder[]) => void) {
  const q = query(ORDERS_COLLECTION, orderBy("createdAtMs", "desc"), limit(100));
  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs.map((entry) => {
        const raw = entry.data() as DashboardOrder;
        return {
          ...raw,
          id: raw.id || entry.id,
        };
      });
      callback(orders);
    },
    (error) => {
      if (isFirestorePermissionError(error)) {
        callback([]);
        return;
      }
      console.error("Dashboard orders subscription failed", error);
    },
  );
}

export async function seedDashboardOrdersIfEmpty() {
  try {
    const existing = await getDocs(query(ORDERS_COLLECTION, limit(1)));
    if (!existing.empty) {
      return;
    }

    const batch = writeBatch(firestore);
    for (const item of seedOrders) {
      batch.set(doc(ORDERS_COLLECTION, item.id), item, { merge: true });
    }
    await batch.commit();
  } catch (error) {
    if (!isFirestorePermissionError(error)) {
      throw error;
    }
  }
}

export async function upsertDashboardOrder(order: DashboardOrder) {
  try {
    await setDoc(doc(ORDERS_COLLECTION, order.id), order, { merge: true });
  } catch (error) {
    if (!isFirestorePermissionError(error)) {
      throw error;
    }
  }
}

export async function updateDashboardOrderStatus(orderId: string, status: DashboardOrderStatus) {
  try {
    await updateDoc(doc(ORDERS_COLLECTION, orderId), { status });
  } catch (error) {
    if (!isFirestorePermissionError(error)) {
      throw error;
    }
  }
}
