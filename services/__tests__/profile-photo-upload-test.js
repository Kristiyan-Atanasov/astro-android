const mockUploadAsync = jest.fn();
const mockGetItemAsync = jest.fn();

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));
jest.mock('expo-file-system/legacy', () => ({
  FileSystemUploadType: { MULTIPART: 1 },
  uploadAsync: mockUploadAsync,
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: mockGetItemAsync,
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('../sessionEvents', () => ({ notifySessionExpired: jest.fn() }));
jest.mock('../readProgress', () => ({ setReadProgressUser: jest.fn() }));
jest.mock('../i18n', () => ({ getAppLanguageCode: jest.fn(() => 'en') }));

const { uploadProfilePicture } = require('../api');

describe('uploadProfilePicture on Android', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemAsync.mockResolvedValue('access-token');
  });

  it('uses the native multipart uploader with the backend image field', async () => {
    mockUploadAsync.mockResolvedValue({
      status: 200,
      body: JSON.stringify({ profile_picture_url: 'https://example.com/avatar.jpg' }),
      headers: {},
    });

    await expect(
      uploadProfilePicture({
        uri: 'file:///cache/avatar.jpg',
        name: 'avatar.jpg',
        type: 'image/jpeg',
      }),
    ).resolves.toEqual({
      profile_picture_url: 'https://example.com/avatar.jpg',
    });

    expect(mockUploadAsync).toHaveBeenCalledWith(
      expect.stringContaining('/authentication/user_profile/picture/'),
      'file:///cache/avatar.jpg',
      expect.objectContaining({
        httpMethod: 'PUT',
        uploadType: 1,
        fieldName: 'image',
        mimeType: 'image/jpeg',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
          Accept: 'application/json',
        }),
      }),
    );
  });

  it('refreshes an expired token and retries the native upload once', async () => {
    mockGetItemAsync.mockImplementation(async (key) =>
      key === 'refreshToken' ? 'refresh-token' : 'access-token',
    );
    mockUploadAsync
      .mockResolvedValueOnce({ status: 401, body: '', headers: {} })
      .mockResolvedValueOnce({
        status: 200,
        body: JSON.stringify({ profile_picture_url: 'https://example.com/new.jpg' }),
        headers: {},
      });
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({ access: 'refreshed-access-token' }),
      ),
    });

    await expect(
      uploadProfilePicture({
        uri: 'file:///cache/avatar.jpg',
        name: 'avatar.jpg',
        type: 'image/jpeg',
      }),
    ).resolves.toEqual({
      profile_picture_url: 'https://example.com/new.jpg',
    });

    expect(mockUploadAsync).toHaveBeenCalledTimes(2);
    expect(mockUploadAsync.mock.calls[1][2].headers.Authorization).toBe(
      'Bearer refreshed-access-token',
    );
  });
});
