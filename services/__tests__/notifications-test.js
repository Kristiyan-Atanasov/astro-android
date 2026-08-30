import * as Notifications from 'expo-notifications';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
}));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-secure-store', () => ({}));
jest.mock('../api', () => ({ registerDeviceToken: jest.fn() }));

const { routeFromNotificationData } = require('../notifications');

describe('routeFromNotificationData', () => {
  it('marks archetype routes opened from notifications', () => {
    expect(
      routeFromNotificationData({
        screen: 'ArchetypeDetail',
        archetype: 'aries',
        quality_id: '157',
      }),
    ).toBe('/archetype/ARIES?fromNotification=1');
  });

  it('falls back to home when no archetype is supplied', () => {
    expect(routeFromNotificationData({ type: 'backend_test', screen: 'Home' })).toBe(
      '/home',
    );
  });

  it('configures foreground notification handling', () => {
    expect(Notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
  });
});
