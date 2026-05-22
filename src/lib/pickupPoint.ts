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

export type PickupPointDbFields = {
  foxpost_terminal_id: string | null;
  foxpost_terminal_name: string | null;
  foxpost_terminal_address: string | null;
};

export function isLockerShippingMethod(method: string | undefined | null): boolean {
  return method === 'foxpost' || method === 'packeta';
}

export function pickupFieldsFromFoxpost(terminal: FoxpostTerminal): PickupPointDbFields {
  return {
    foxpost_terminal_id: foxpostTerminalId(terminal) || null,
    foxpost_terminal_name: foxpostTerminalLabel(terminal),
    foxpost_terminal_address: foxpostTerminalAddress(terminal) || null,
  };
}

export function pickupFieldsFromPacketa(point: PacketaPoint): PickupPointDbFields {
  return {
    foxpost_terminal_id: packetaPointId(point) || null,
    foxpost_terminal_name: packetaPointLabel(point),
    foxpost_terminal_address: packetaPointAddress(point) || null,
  };
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
