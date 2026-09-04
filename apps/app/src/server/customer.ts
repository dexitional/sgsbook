import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@sgs/db";
import { auth } from "#/lib/auth";
import { computeRequestInvoice, type PackageInput } from "@sgs/ui";

async function getSession() {
  return auth.api.getSession({ headers: getRequestHeaders() as unknown as Headers });
}

async function requireCustomerClient() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");

  const client = await prisma.ubsClient.findUnique({
    where: { authUserId: session.user.id },
  });
  if (!client) throw new Error("ONBOARDING_INCOMPLETE");

  return { session, client };
}

export const getCurrentCustomer = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getSession();
  if (!session) return { authenticated: false as const, client: null };

  const client = await prisma.ubsClient.findUnique({
    where: { authUserId: session.user.id },
    include: { contacts: { where: { status: true } } },
  });

  return {
    authenticated: true as const,
    user: { name: session.user.name, email: session.user.email, image: session.user.image },
    client,
  };
});

const contactInput = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  designation: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

const onboardingSchema = z.object({
  organisation: z.string().optional(),
  phone: z.string().optional(),
  contacts: z.array(contactInput).min(1),
});

export const completeOnboarding = createServerFn({ method: "POST" })
  .inputValidator(onboardingSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session) throw new Error("UNAUTHENTICATED");

    const existing = await prisma.ubsClient.findUnique({ where: { authUserId: session.user.id } });

    const client = existing
      ? await prisma.ubsClient.update({
          where: { id: existing.id },
          data: { organisation: data.organisation, phone: data.phone },
        })
      : await prisma.ubsClient.create({
          data: {
            authUserId: session.user.id,
            name: session.user.name,
            email: session.user.email,
            // Defaults to the customer's Google avatar — admins can override
            // it later from the admin portal; no separate upload UI needed
            // on the customer side for this.
            imageUrl: session.user.image,
            organisation: data.organisation,
            phone: data.phone,
            type: "EXTERNAL",
          },
        });

    // Replace contacts wholesale — simplest correct behavior for a form that
    // submits the full desired contact list each time.
    await prisma.ubsContactPerson.deleteMany({ where: { clientId: client.id } });
    await prisma.ubsContactPerson.createMany({
      data: data.contacts.map((c) => ({ ...c, clientId: client.id })),
    });

    return { client };
  });

export const getCustomerRequests = createServerFn({ method: "GET" }).handler(async () => {
  const { client } = await requireCustomerClient();
  return prisma.ubsRequest.findMany({
    where: { clientId: client.id },
    include: { packages: { include: { bookItem: true, UbsAddon: { include: { item: true } } } }, payment: true },
    orderBy: { createdAt: "desc" },
  });
});

export const getCustomerPayments = createServerFn({ method: "GET" }).handler(async () => {
  const { client } = await requireCustomerClient();
  return prisma.ubsPayment.findMany({
    where: { request: { clientId: client.id } },
    include: {
      request: { include: { packages: { include: { bookItem: true, UbsAddon: { include: { item: true } } } } } },
    },
    orderBy: { paidAt: "desc" },
  });
});

const requestIdSchema = z.object({ requestId: z.string().min(1) });

export const getRequestInvoice = createServerFn({ method: "GET" })
  .inputValidator(requestIdSchema)
  .handler(async ({ data }) => {
    const { client } = await requireCustomerClient();

    const request = await prisma.ubsRequest.findUnique({
      where: { id: data.requestId },
      include: {
        client: true,
        packages: { include: { bookItem: true, UbsAddon: { include: { item: true } } } },
      },
    });

    if (!request || request.clientId !== client.id) throw new Error("NOT_FOUND");
    return request;
  });

const paymentIdSchema = z.object({ paymentId: z.string().min(1) });

export const getPaymentInvoice = createServerFn({ method: "GET" })
  .inputValidator(paymentIdSchema)
  .handler(async ({ data }) => {
    const { client } = await requireCustomerClient();

    const payment = await prisma.ubsPayment.findUnique({
      where: { id: data.paymentId },
      include: {
        request: {
          include: { client: true, packages: { include: { bookItem: true, UbsAddon: { include: { item: true } } } } },
        },
      },
    });

    if (!payment || payment.request?.clientId !== client.id) throw new Error("NOT_FOUND");
    return payment;
  });

const bookingPackageSchema = z.object({
  itemId: z.string().min(1),
  bookStart: z.coerce.date(),
  bookEnd: z.coerce.date(),
  addonItemIds: z.array(z.string()).optional(),
});

const createBookingRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  packages: z.array(bookingPackageSchema).min(1),
});

export const createBookingRequest = createServerFn({ method: "POST" })
  .inputValidator(createBookingRequestSchema)
  .handler(async ({ data }) => {
    const { client } = await requireCustomerClient();

    const itemIds = Array.from(new Set(data.packages.flatMap((pkg) => [pkg.itemId, ...(pkg.addonItemIds ?? [])])));
    const items = await prisma.ubsItem.findMany({ where: { id: { in: itemIds } } });
    const itemById = new Map(items.map((item) => [item.id, item]));

    const pricingPackages: PackageInput[] = data.packages.map((pkg) => {
      const facility = itemById.get(pkg.itemId);
      if (!facility) throw new Error("ITEM_NOT_FOUND");
      return {
        bookStart: pkg.bookStart,
        bookEnd: pkg.bookEnd,
        facility: { id: facility.id, title: facility.title, amount: facility.amount },
        addons: (pkg.addonItemIds ?? []).map((addonItemId) => {
          const addon = itemById.get(addonItemId);
          if (!addon) throw new Error("ITEM_NOT_FOUND");
          return { id: addon.id, title: addon.title, amount: addon.amount };
        }),
      };
    });

    const invoice = computeRequestInvoice(pricingPackages);

    return prisma.$transaction(async (tx) => {
      const request = await tx.ubsRequest.create({
        data: { clientId: client.id, title: data.title, description: data.description, chargeAmount: invoice.total },
      });

      for (const pkg of data.packages) {
        const created = await tx.ubsPackage.create({
          data: { itemId: pkg.itemId, requestId: request.id, bookStart: pkg.bookStart, bookEnd: pkg.bookEnd },
        });
        if (pkg.addonItemIds?.length) {
          await tx.ubsAddon.createMany({
            data: pkg.addonItemIds.map((addonItemId) => ({ itemId: addonItemId, packageId: created.id })),
          });
        }
      }

      return tx.ubsRequest.findUniqueOrThrow({
        where: { id: request.id },
        include: { packages: { include: { bookItem: true, UbsAddon: { include: { item: true } } } } },
      });
    });
  });
