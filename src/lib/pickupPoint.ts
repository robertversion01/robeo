import {
  foxpostTerminalAddress,
  foxpostTerminalId,
  foxpostTerminalLabel,
  type FoxpostTerminal,
} from '@/lib/foxpostTerminal';
import {
  packetaPointAddress,
  packetaPointId,
  packetaPointLabel,
  type PacketaPoint,
} from '@/lib/packetaPoint';

/**
 * Egyseges pickup oszlopok (Foxpost + Packeta kozos), valamint a regi
 * foxpost_terminal_* oszlopok (DEPRECATED, backward compat).
 */
export type PickupPointDbFields = {
  pickup_point_id: string | null;
  pickup_point_name: string | null;
  pickup_point_address: string | null;
  pickup_provider: 'foxpost' | 'packeta' | null;
  foxpost_terminal_id: string | null;
  foxpost_terminal_name: string | null;
  foxpost_terminal_address: string | null;
};

export type PickupPointReadFields = {
  pickup_point_id?: string | null;
  pickup_point_name?: string | null;
  pickup_point_address?: string | null;
  pickup_provider?: string | null;
  foxpost_terminal_id?: string | null;
  foxpost_terminal_name?: string | null;
  foxpost_terminal_address?: string | null;
};

export type ResolvedPickupPoint = {
  id: string | null;
  name: string | null;
  address: string | null;
  provider: 'foxpost' | 'packeta' | null;
};

export function isLockerShippingMethod(method: string | undefined | null): boolean {
  return method === 'foxpost' || method === 'packeta';
}

function buildFields(
  provider: 'foxpost' | 'packeta',
  id: string | null,
  name: string | null,
  address: string | null,
): PickupPointDbFields {
  return {
    pickup_point_id: id,
    pickup_point_name: name,
    pickup_point_address: address,
    pickup_provider: provider,
    foxpost_terminal_id: id,
    foxpost_terminal_name: name,
    foxpost_terminal_address: address,
  };
}

export function pickupFieldsFromFoxpost(terminal: FoxpostTerminal): PickupPointDbFields {
  return buildFields(
    'foxpost',
    foxpostTerminalId(terminal) || null,
    foxpostTerminalLabel(terminal),
    foxpostTerminalAddress(terminal) || null,
  );
}

export function pickupFieldsFromPacketa(point: PacketaPoint): PickupPointDbFields {
  return buildFields(
    'packeta',
    packetaPointId(point) || null,
    packetaPointLabel(point),
    packetaPointAddress(point) || null,
  );
}

export function pickupFieldsForCheckout(
  shippingMethod: string | undefined,
  foxpostTerminal: FoxpostTerminal | null | undefined,
  packetaPoint: PacketaPoint | null | undefined,
): PickupPointDbFields | null {
  if (shippingMethod === 'foxpost' && foxpostTerminal) {
    return pickupFieldsFromFoxpost(foxpostTerminal);
  }
  if (shippingMethod === 'packeta' && packetaPoint) {
    return pickupFieldsFromPacketa(packetaPoint);
  }
  return null;
}

/** Tranzakcio sorbol kiolvas: uj pickup_point_* preferalt, fallback foxpost_terminal_* */
export function resolvePickupPoint(row: PickupPointReadFields): ResolvedPickupPoint {
  const id = row.pickup_point_id ?? row.foxpost_terminal_id ?? null;
  const name = row.pickup_point_name ?? row.foxpost_terminal_name ?? null;
  const address = row.pickup_point_address ?? row.foxpost_terminal_address ?? null;
  const providerRaw = row.pickup_provider?.trim().toLowerCase();
  const provider: 'foxpost' | 'packeta' | null =
    providerRaw === 'foxpost' || providerRaw === 'packeta'
      ? providerRaw
      : id
        ? 'foxpost'
        : null;
  return { id, name, address, provider };
}

/** SELECT lista (mindketto: uj + regi) — egyseges read fallbackhez */
export const PICKUP_POINT_SELECT_COLUMNS =
  'pickup_point_id, pickup_point_name, pickup_point_address, pickup_provider, foxpost_terminal_id, foxpost_terminal_name, foxpost_terminal_address';
