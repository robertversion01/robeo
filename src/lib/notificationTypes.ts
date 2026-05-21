export type NotificationEventType =
  | 'favorite'
  | 'price_drop'
  | 'offer'
  | 'message'
  | 'follower'
  | 'saved_search'
  | 'seller_new_item'
  | 'bundle_offer'
  | 'general';

export type DeliveryChannel = 'in_app' | 'push' | 'email';

export type RoutedNotificationPayload = {
  userId: string;
  type: NotificationEventType;
  title: string;
  body?: string | null;
  link?: string | null;
};

export type NotificationOutboxItem = {
  id: string;
  channel: DeliveryChannel;
  payload: RoutedNotificationPayload;
  createdAt: string;
};
