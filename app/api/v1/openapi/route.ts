import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return NextResponse.json({
    openapi: "3.1.0",
    info: {
      title: "Athidhi Restaurant API",
      version: "1.0.0",
      description:
        "Versioned APIs for public data, capability-token QR ordering, role-scoped staff operations, payments, administration, and analytics. Browser mutations use double-submit CSRF protection.",
    },
    servers: [{ url: `${origin}/api/v1` }],
    security: [{ bearerAuth: [] }, { staffCookie: [] }],
    tags: [
      { name: "Public" },
      { name: "Guest" },
      { name: "Staff" },
      { name: "Admin" },
    ],
    paths: {
      "/restaurant": {
        get: operation("Public", "Get the restaurant and branch profile", false),
        patch: operation("Admin", "Update restaurant and branch settings"),
      },
      "/menu": {
        get: {
          ...operation("Public", "List menu categories and dishes", false),
          parameters: [query("includeUnavailable", "Include inactive records for authorized staff")],
        },
      },
      "/menu/categories": {
        get: operation("Public", "List menu categories", false),
        post: bodyOperation("Admin", "Create a menu category", "MenuCategoryInput"),
      },
      "/menu/categories/{id}": resourceOperations("Admin", "menu category", "MenuCategoryPatch"),
      "/menu/items": {
        get: operation("Public", "List menu dishes", false),
        post: bodyOperation("Admin", "Create a menu dish", "MenuItemInput"),
      },
      "/menu/items/{id}": resourceOperations("Admin", "menu dish", "MenuItemPatch"),
      "/table-sessions": {
        post: {
          ...bodyOperation("Guest", "Open or resume a QR table session", "TableSessionInput", false),
          parameters: [csrfHeader()],
        },
      },
      "/orders": {
        get: guestOperation("List orders for the validated table session or signed-in staff member"),
        post: {
          ...guestBodyOperation("Place and price an order atomically", "OrderInput"),
          parameters: [csrfHeader()],
        },
      },
      "/orders/{id}": {
        get: guestOperation("Get an authorized order with its line items"),
      },
      "/orders/{id}/status": {
        patch: bodyOperation("Staff", "Advance an order through the kitchen workflow", "OrderStatusInput"),
      },
      "/orders/{id}/payments": {
        get: operation("Staff", "List payments for an order"),
        post: bodyOperation("Staff", "Record a cash, card, or UPI payment", "PaymentInput"),
      },
      "/service-requests": {
        get: guestOperation("List requests for the validated table session or signed-in staff member"),
        post: {
          ...guestBodyOperation("Create a waiter, water, tissue, spoon, or bill request", "ServiceRequestInput"),
          parameters: [csrfHeader()],
        },
      },
      "/service-requests/{id}": {
        patch: bodyOperation("Staff", "Acknowledge or resolve a service request", "ServiceRequestPatch"),
      },
      "/waiter-tasks/{id}/assignment": {
        patch: {
          ...bodyOperation("Staff", "Assign or unassign a ready order or open service request", "WaiterTaskAssignment"),
          parameters: [{ name: "id", in: "path", required: true, schema: uuid() }],
        },
      },
      "/tables": {
        get: operation("Staff", "List branch tables"),
        post: bodyOperation("Admin", "Create a restaurant table", "TableInput"),
      },
      "/tables/{id}": resourceOperations("Admin", "table", "TablePatch"),
      "/analytics": {
        get: {
          ...operation("Staff", "Get revenue, order, dish, table, and service metrics"),
          parameters: [query("from", "ISO start date"), query("to", "ISO end date")],
        },
      },
      "/auth/session": {
        get: operation("Staff", "Get the current authenticated staff identity"),
        post: {
          ...bodyOperation("Staff", "Create a staff password session", "LoginInput", false),
          parameters: [csrfHeader()],
        },
        delete: {
          ...operation("Staff", "End the current staff session"),
          parameters: [csrfHeader()],
        },
      },
      "/operations": {
        get: operation("Staff", "Load a role-scoped branch operations workspace"),
      },
      "/operations/stream": {
        get: operation("Staff", "Subscribe to branch-scoped operations invalidations over server-sent events"),
      },
      "/security/csrf": {
        get: operation("Public", "Issue a same-origin CSRF token for browser mutations", false),
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "Supabase JWT" },
        staffCookie: {
          type: "apiKey",
          in: "cookie",
          name: "Supabase Auth session cookie (name is project-specific)",
          description: "Secure, HttpOnly staff session managed by Supabase SSR.",
        },
        tableSessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "__Host-athidhi_table_session",
          description: "Opaque HttpOnly table-session capability issued by POST /table-sessions.",
        },
      },
      schemas: {
        LoginInput: object({ email: string("email"), password: string() }, ["email", "password"]),
        TableSessionInput: object(
          { qrToken: uuid(), branchId: uuid() },
          ["qrToken"],
          "Use the unguessable token encoded in the physical table QR code.",
        ),
        OrderInput: object(
          {
            tableSessionId: uuid(),
            items: { type: "array", minItems: 1, maxItems: 50, items: object({ menuItemId: uuid(), quantity: integer(1, 50) }, ["menuItemId", "quantity"]) },
            notes: string(500),
            spiceLevel: { enum: ["Mild", "Medium", "Spicy", "Extra spicy"] },
            isParcel: { type: "boolean" },
          },
          ["tableSessionId", "items"],
        ),
        OrderStatusInput: object({ status: { enum: ["ACCEPTED", "PREPARING", "READY", "SERVED", "BILLED"] } }, ["status"]),
        PaymentInput: object(
          { method: { enum: ["UPI", "CASH", "CARD"] }, amount: { type: "number", exclusiveMinimum: 0 }, providerReference: string(120) },
          ["method", "amount"],
        ),
        ServiceRequestInput: object(
          { tableSessionId: uuid(), requestType: { enum: ["BILL", "WAITER", "WATER", "SPOON", "TISSUE"] } },
          ["tableSessionId", "requestType"],
        ),
        ServiceRequestPatch: object({ status: { enum: ["ACKNOWLEDGED", "RESOLVED"] } }, ["status"]),
        WaiterTaskAssignment: object(
          {
            entityType: { enum: ["order", "service_request"] },
            assigned: { type: "boolean", default: true },
          },
          ["entityType"],
        ),
        MenuCategoryInput: object(
          { name: string(100), slug: string(80), parentId: uuid(), sortOrder: integer(), active: { type: "boolean" } },
          ["name"],
        ),
        MenuCategoryPatch: object({ name: string(100), slug: string(80), parentId: uuid(), sortOrder: integer(), active: { type: "boolean" } }),
        MenuItemInput: object(
          {
            categoryId: uuid(), name: string(120), description: string(500), price: { type: "number", minimum: 0 },
            isVeg: { type: "boolean" }, available: { type: "boolean" }, bestseller: { type: "boolean" }, imageUrl: string(1000), sortOrder: integer(),
          },
          ["categoryId", "name", "price", "isVeg"],
        ),
        MenuItemPatch: object({
          categoryId: uuid(), name: string(120), description: string(500), price: { type: "number", minimum: 0 },
          isVeg: { type: "boolean" }, available: { type: "boolean" }, bestseller: { type: "boolean" }, imageUrl: string(1000), sortOrder: integer(),
        }),
        TableInput: object({ number: integer(1), capacity: integer(1, 50), sectionId: uuid() }, ["number"]),
        TablePatch: object({
          number: integer(1), capacity: integer(1, 50), sectionId: uuid(),
          state: { enum: ["AVAILABLE", "BROWSING", "ORDERING", "ORDER_PLACED", "PREPARING", "READY", "DINING", "BILL_REQUESTED", "PAID", "CLEANING"] },
        }),
      },
    },
  });
}

function operation(tag: string, summary: string, secured = true) {
  return {
    tags: [tag],
    summary,
    ...(secured ? {} : { security: [] }),
    responses: {
      "200": { description: "Success" },
      "400": { description: "Invalid request" },
      "401": { description: "Authentication required" },
      "403": { description: "Permission denied" },
    },
  };
}

function bodyOperation(tag: string, summary: string, schema: string, secured = true) {
  return {
    ...operation(tag, summary, secured),
    requestBody: {
      required: true,
      content: { "application/json": { schema: { $ref: `#/components/schemas/${schema}` } } },
    },
  };
}

function guestOperation(summary: string) {
  return {
    ...operation("Guest", summary),
    security: [{ tableSessionCookie: [] }, { bearerAuth: [] }, { staffCookie: [] }],
  };
}

function guestBodyOperation(summary: string, schema: string) {
  return {
    ...bodyOperation("Guest", summary, schema),
    security: [{ tableSessionCookie: [] }, { bearerAuth: [] }, { staffCookie: [] }],
  };
}

function resourceOperations(tag: string, label: string, patchSchema: string) {
  return {
    get: operation(tag, `Get a ${label}`),
    patch: bodyOperation(tag, `Update a ${label}`, patchSchema),
    delete: operation(tag, `Delete a ${label}`),
    parameters: [{ name: "id", in: "path", required: true, schema: uuid() }],
  };
}

function query(name: string, description: string) {
  return { name, in: "query", required: false, description, schema: { type: "string" } };
}

function csrfHeader() {
  return {
    name: "x-csrf-token",
    in: "header",
    required: true,
    description: "Token returned by GET /security/csrf. Not required when using bearerAuth.",
    schema: { type: "string" },
  };
}

function object(properties: Record<string, unknown>, required: string[] = [], description?: string) {
  return { type: "object", additionalProperties: false, properties, ...(required.length ? { required } : {}), ...(description ? { description } : {}) };
}

function string(maxLength?: number | "email") {
  return maxLength === "email"
    ? { type: "string", format: "email" }
    : { type: "string", ...(maxLength ? { maxLength } : {}) };
}

function uuid() {
  return { type: "string", format: "uuid" };
}

function integer(minimum?: number, maximum?: number) {
  return { type: "integer", ...(minimum === undefined ? {} : { minimum }), ...(maximum === undefined ? {} : { maximum }) };
}
