import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { getStoreSettings, setSetting, DEFAULT_STORE_SETTINGS } from "@/lib/services/settings";
import { logAudit } from "@/lib/services/audit";

export async function GET() {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const settings = await getStoreSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  if (guard.user.role !== "admin") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const current = await getStoreSettings();
  const merged = {
    ...current,
    storeName: String(body.storeName ?? current.storeName),
    storeDescription: String(body.storeDescription ?? current.storeDescription),
    logo: String(body.logo ?? current.logo),
    contactEmail: String(body.contactEmail ?? current.contactEmail),
    supportEmail: String(body.supportEmail ?? current.supportEmail),
    phone: String(body.phone ?? current.phone),
    social: { ...current.social, ...(body.social ?? {}) },
    guestCheckout: body.guestCheckout != null ? !!body.guestCheckout : current.guestCheckout,
    maintenanceMode: body.maintenanceMode != null ? !!body.maintenanceMode : current.maintenanceMode,
    minOrderMinor: body.minOrderMinor != null ? Number(body.minOrderMinor) : current.minOrderMinor,
    taxRatePercent: body.taxRatePercent != null ? Number(body.taxRatePercent) : current.taxRatePercent,
  };
  // paymentProviders is always derived from server env credentials — never persisted from admin input.
  delete (merged as Record<string, unknown>).paymentProviders;

  await setSetting("store", merged);
  await logAudit({ userId: guard.user.id, action: "admin.settings.updated", entityType: "settings" });
  const fresh = await getStoreSettings();
  return NextResponse.json({ settings: fresh, defaults: DEFAULT_STORE_SETTINGS });
}
