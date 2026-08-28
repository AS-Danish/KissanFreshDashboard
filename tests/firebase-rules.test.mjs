import { after, before, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getBytes, ref, uploadBytes } from "firebase/storage";

const projectId = "kissanfresh-a72c1";
let environment;

const customerUser = {
  id: "customer-1",
  role: "user",
  name: "Customer",
  phoneNumber: "9999999999",
  onboardingCompleted: true,
  savedAddresses: [],
  createdAt: "2026-08-28T00:00:00.000Z",
};

before(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: { host: "127.0.0.1", port: 8180 },
    storage: { host: "127.0.0.1", port: 9299 },
  });

  await environment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    await Promise.all([
      setDoc(doc(database, "users/admin-1"), {
        role: "ADMIN",
        email: "admin@example.com",
      }),
      setDoc(doc(database, "users/manager-1"), {
        role: "MANAGEMENT",
        email: "manager@example.com",
        permissions: { "Product Management": true },
      }),
      setDoc(doc(database, "products/product-1"), {
        name: "Apple",
        price: 100,
        stockCount: 10,
        inStock: true,
      }),
      setDoc(doc(database, "orders/order-1"), {
        userId: "customer-1",
        status: "ASSIGNED",
        totalAmount: 100,
      }),
      setDoc(doc(database, "orders/order-2"), {
        userId: "customer-2",
        status: "ASSIGNED",
        totalAmount: 100,
      }),
    ]);

    await uploadBytes(
      ref(context.storage(), "products/public.webp"),
      new Uint8Array([1, 2, 3]),
      { contentType: "image/webp" },
    );
  });
});

after(async () => {
  await environment?.cleanup();
});

test("catalogue reads are public while catalogue writes are protected", async () => {
  const publicDb = environment.unauthenticatedContext().firestore();
  const customerDb = environment.authenticatedContext("customer-1").firestore();
  const managerDb = environment.authenticatedContext("manager-1", {
    email: "manager@example.com",
  }).firestore();

  await assertSucceeds(getDoc(doc(publicDb, "products/product-1")));
  await assertFails(setDoc(doc(customerDb, "products/blocked"), { name: "Blocked" }));
  await assertSucceeds(setDoc(doc(managerDb, "products/allowed"), {
    name: "Allowed",
    price: 50,
  }));
});

test("consumers can create and update only their own non-privileged user record", async () => {
  const customerDb = environment.authenticatedContext("customer-1").firestore();
  const attackerDb = environment.authenticatedContext("attacker-1").firestore();

  await assertSucceeds(setDoc(doc(customerDb, "users/customer-1"), customerUser));
  await assertSucceeds(updateDoc(doc(customerDb, "users/customer-1"), {
    wishlist: [{ id: "product-1" }],
  }));
  await assertFails(setDoc(doc(attackerDb, "users/attacker-1"), {
    ...customerUser,
    id: "attacker-1",
    role: "ADMIN",
  }));
  await assertFails(updateDoc(doc(customerDb, "users/customer-1"), { role: "ADMIN" }));
});

test("customers can read only their orders and cannot create orders directly", async () => {
  const customerDb = environment.authenticatedContext("customer-1").firestore();

  await assertSucceeds(getDoc(doc(customerDb, "orders/order-1")));
  await assertFails(getDoc(doc(customerDb, "orders/order-2")));
  await assertFails(setDoc(doc(customerDb, "orders/direct-order"), {
    userId: "customer-1",
    totalAmount: 1,
  }));
  await assertSucceeds(updateDoc(doc(customerDb, "orders/order-1"), {
    userId: "deleted_customer-1",
    isDeletedByConsumer: true,
    deletionReason: "Requested deletion",
  }));
});

test("failed payment records require strict ownership and immutable pending state", async () => {
  const customerDb = environment.authenticatedContext("customer-1").firestore();
  const validFailure = {
    userId: "customer-1",
    paymentId: "pay_test_1",
    status: "paid_but_stock_failed",
    refundStatus: "pending",
    totalAmount: 100,
    currency: "INR",
    timestamp: serverTimestamp(),
    error: "Stock changed",
  };

  await assertSucceeds(addDoc(collection(customerDb, "failed_orders"), validFailure));
  await assertFails(addDoc(collection(customerDb, "failed_orders"), {
    ...validFailure,
    userId: "customer-2",
  }));
});

test("audit logs are append-only and staff identity must match the auth token", async () => {
  const managerDb = environment.authenticatedContext("manager-1", {
    email: "manager@example.com",
  }).firestore();
  const validLog = {
    action: "PRODUCT_UPDATED",
    entityType: "PRODUCT",
    entityId: "product-1",
    details: {},
    userId: "manager-1",
    userEmail: "manager@example.com",
    timestamp: serverTimestamp(),
  };

  await assertSucceeds(addDoc(collection(managerDb, "audit_logs"), validLog));
  await assertFails(addDoc(collection(managerDb, "audit_logs"), {
    ...validLog,
    userEmail: "admin@example.com",
  }));
});

test("Storage permits public image reads and path-scoped owner/staff writes", async () => {
  const publicStorage = environment.unauthenticatedContext().storage();
  const customerStorage = environment.authenticatedContext("customer-1").storage();
  const managerStorage = environment.authenticatedContext("manager-1", {
    email: "manager@example.com",
  }).storage();
  const image = new Uint8Array([1, 2, 3]);
  const metadata = { contentType: "image/webp" };

  await assertSucceeds(getBytes(ref(publicStorage, "products/public.webp")));
  await assertSucceeds(uploadBytes(
    ref(customerStorage, "profile_images/customer-1.jpg"),
    image,
    { contentType: "image/jpeg" },
  ));
  await assertFails(uploadBytes(
    ref(customerStorage, "profile_images/customer-2.jpg"),
    image,
    { contentType: "image/jpeg" },
  ));
  await assertFails(uploadBytes(ref(customerStorage, "products/customer.webp"), image, metadata));
  await assertSucceeds(uploadBytes(ref(managerStorage, "products/manager.webp"), image, metadata));
  await assertFails(uploadBytes(ref(managerStorage, "products/themes/theme.webp"), image, metadata));
});
