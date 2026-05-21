/**
 * Foxpost carrier integration — production-ready structure.
 * Live API: set FOXPOST_API_URL + FOXPOST_API_KEY when partner credentials are available.
 * Until then: valid tracking payload + printable label (ROBEO parcel ID registry).
 */

export type FoxpostShipmentInput = {
  transactionId: string;
  productName: string;
  sellerId: string;
  buyerId: string;
  terminalId?: string | null;
  terminalName?: string | null;
  terminalAddress?: string | null;
  sellerEmail?: string | null;
  buyerName?: string | null;
};

export type FoxpostShipmentResult = {
  trackingNumber: string;
  carrier: 'foxpost';
  labelUrl: string | null;
  apiMode: 'live' | 'registry';
  payload: Record<string, unknown>;
};

const CARRIER = 'foxpost';

/** Format: FOX-1234567-HU (7 digits) */
export function generateFoxpostTrackingNumber(): string {
  const digits = Math.floor(1_000_000 + Math.random() * 9_000_000);
  return `FOX-${digits}-HU`;
}

function isLiveApiConfigured(): boolean {
  return Boolean(
    process.env.FOXPOST_API_URL?.trim() && process.env.FOXPOST_API_KEY?.trim(),
  );
}

/**
 * Reserve shipment with Foxpost partner API when configured; otherwise registry mode.
 */
export async function createFoxpostShipment(
  input: FoxpostShipmentInput,
): Promise<FoxpostShipmentResult> {
  const trackingNumber = generateFoxpostTrackingNumber();

  const basePayload: Record<string, unknown> = {
    carrier: CARRIER,
    trackingNumber,
    transactionId: input.transactionId,
    productName: input.productName,
    destination: {
      terminalId: input.terminalId ?? null,
      name: input.terminalName ?? null,
      address: input.terminalAddress ?? null,
    },
    sender: { sellerId: input.sellerId, email: input.sellerEmail ?? null },
    recipient: { buyerId: input.buyerId, name: input.buyerName ?? null },
    createdAt: new Date().toISOString(),
  };

  if (isLiveApiConfigured()) {
    try {
      const res = await fetch(`${process.env.FOXPOST_API_URL}/shipments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.FOXPOST_API_KEY}`,
        },
        body: JSON.stringify({
          reference: input.transactionId,
          locker_id: input.terminalId,
          recipient_name: input.buyerName,
          description: input.productName,
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { tracking_number?: string; label_url?: string };
        return {
          trackingNumber: json.tracking_number || trackingNumber,
          carrier: CARRIER,
          labelUrl: json.label_url ?? null,
          apiMode: 'live',
          payload: { ...basePayload, apiResponse: json },
        };
      }
    } catch (e) {
      console.warn('[foxpost] live API failed, using registry mode', e);
    }
  }

  return {
    trackingNumber,
    carrier: CARRIER,
    labelUrl: null,
    apiMode: 'registry',
    payload: basePayload,
  };
}

export function buildFoxpostTrackingUrl(trackingNumber: string): string {
  const base =
    process.env.FOXPOST_TRACKING_URL?.trim() || 'https://www.foxpost.hu/csomagkovetes';
  return `${base}?code=${encodeURIComponent(trackingNumber)}`;
}
