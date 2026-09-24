// Themed replacement for React Native's Alert.
//
// The API mirrors `Alert.alert(title, message, buttons, options)` so a screen
// only swaps its import: every existing call site keeps working unchanged.
// Rendering happens in <AppAlertHost />, mounted once in the root layout.

import React, { useEffect, useState } from 'react';
import {
  Alert as RNAlert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export interface AppAlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AppAlertOptions {
  cancelable?: boolean;
}

interface AlertRequest {
  title?: string;
  message?: string;
  buttons: AppAlertButton[];
  cancelable: boolean;
}

type Listener = (request: AlertRequest) => void;

let listener: Listener | null = null;

function alert(
  title?: string,
  message?: string,
  buttons?: AppAlertButton[],
  options?: AppAlertOptions,
) {
  const list = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
  // Without a mounted host there is nothing to draw into, so fall back to the
  // platform dialog rather than swallowing the message.
  if (!listener) {
    RNAlert.alert(title ?? '', message, buttons, options as any);
    return;
  }
  listener({
    title,
    message,
    buttons: list,
    cancelable: options?.cancelable !== false,
  });
}

export const Alert = { alert };

export function AppAlertHost() {
  const [request, setRequest] = useState<AlertRequest | null>(null);

  useEffect(() => {
    listener = (next) => setRequest(next);
    return () => {
      listener = null;
    };
  }, []);

  const close = () => setRequest(null);

  const press = (button: AppAlertButton) => {
    close();
    button.onPress?.();
  };

  // Backdrop and hardware back count as cancelling, so they run the cancel
  // button when the caller provided one.
  const dismiss = () => {
    if (!request?.cancelable) return;
    const cancel = request.buttons.find((b) => b.style === 'cancel');
    close();
    cancel?.onPress?.();
  };

  if (!request) return null;

  // Two short buttons sit side by side; anything longer stacks so the labels
  // stay readable.
  const inline =
    request.buttons.length === 2 &&
    request.buttons.every((b) => (b.text ?? '').length <= 14);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          {request.title ? (
            <Text style={styles.title}>{request.title}</Text>
          ) : null}
          {request.message ? (
            <Text style={styles.message}>{request.message}</Text>
          ) : null}

          <View style={[styles.actions, inline && styles.actionsInline]}>
            {request.buttons.map((button, index) => {
              const key = `${button.text ?? 'button'}-${index}`;
              const label = button.text ?? 'OK';
              if (button.style === 'cancel') {
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.button, styles.ghostButton, inline && styles.buttonInline]}
                    onPress={() => press(button)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.ghostText} numberOfLines={1}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              }
              if (button.style === 'destructive') {
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.button, styles.destructiveButton, inline && styles.buttonInline]}
                    onPress={() => press(button)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.destructiveText} numberOfLines={1}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.button, inline && styles.buttonInline]}
                  onPress={() => press(button)}
                  accessibilityRole="button"
                >
                  <LinearGradient
                    colors={['rgba(87, 124, 251, 1)', 'rgba(178, 131, 237, 1)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradient}
                  >
                    <Text style={styles.primaryText} numberOfLines={1}>
                      {label}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,9,14,0.82)',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    backgroundColor: '#1B1D24',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(178,131,237,0.2)',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'CooperLtBT-Bold',
    textAlign: 'center',
  },
  message: {
    color: '#B8B8C2',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'SFProDisplay-Regular',
    textAlign: 'center',
    marginTop: 10,
  },
  actions: { marginTop: 22, gap: 10 },
  actionsInline: { flexDirection: 'row-reverse' },
  button: { height: 48, borderRadius: 24, overflow: 'hidden' },
  buttonInline: { flex: 1 },
  gradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  primaryText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
    paddingHorizontal: 14,
  },
  ghostButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  ghostText: {
    color: '#D5D6E4',
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
    paddingHorizontal: 14,
  },
  destructiveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(233, 93, 104, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(233, 93, 104, 0.45)',
  },
  destructiveText: {
    color: '#F08A92',
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
    paddingHorizontal: 14,
  },
});
