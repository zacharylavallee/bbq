import { Alert, Platform } from 'react-native';
import { confirmAsync } from '../confirm';

let restoreWindow: (() => void) | undefined;

function installWindowConfirm(result: boolean): jest.Mock {
  const hadWindow = 'window' in globalThis;
  const existingWindow = globalThis.window;
  const confirm = jest.fn(() => result);
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { confirm },
    writable: true,
  });
  restoreWindow = () => {
    if (hadWindow) {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: existingWindow,
        writable: true,
      });
    } else {
      Reflect.deleteProperty(globalThis, 'window');
    }
  };
  return confirm;
}

describe('confirmAsync', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    restoreWindow?.();
    restoreWindow = undefined;
  });

  it('uses window.confirm on web', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const confirm = installWindowConfirm(true);
    await expect(confirmAsync('Delete item?', 'This cannot be undone.', 'Delete')).resolves.toBe(
      true,
    );
    expect(confirm).toHaveBeenCalledWith('Delete item?\n\nThis cannot be undone.');
  });

  it('returns false when the web confirmation is declined or unavailable', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    installWindowConfirm(false);
    await expect(confirmAsync('Delete item?', 'Message', 'Delete')).resolves.toBe(false);

    const hadWindow = 'window' in globalThis;
    const existingWindow = globalThis.window;
    Reflect.deleteProperty(globalThis, 'window');
    try {
      await expect(confirmAsync('Delete item?', 'Message', 'Delete')).resolves.toBe(false);
    } finally {
      if (hadWindow) {
        Object.defineProperty(globalThis, 'window', {
          configurable: true,
          value: existingWindow,
          writable: true,
        });
      }
    }
  });

  it('resolves from the native confirm and cancel buttons', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const confirmed = confirmAsync('Delete item?', 'Message', 'Delete');
    alert.mock.calls[0][2]?.[1].onPress?.();
    await expect(confirmed).resolves.toBe(true);

    const cancelled = confirmAsync('Delete item?', 'Message', 'Delete');
    alert.mock.calls[1][2]?.[0].onPress?.();
    await expect(cancelled).resolves.toBe(false);
  });

  it('resolves false when a native alert is dismissed', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const result = confirmAsync('Delete item?', 'Message', 'Delete');
    alert.mock.calls[0][3]?.onDismiss?.();
    await expect(result).resolves.toBe(false);
  });
});
