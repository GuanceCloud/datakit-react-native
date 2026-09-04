import * as React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const DEFAULT_WEB_SOCKET_URL = 'wss://ws.postman-echo.com/raw';

type SocketStatus =
  | 'Disconnected'
  | 'Connecting'
  | 'Connected'
  | 'Closing'
  | 'Failed';

interface State {
  url: string;
  message: string;
  status: SocketStatus;
  events: string[];
}

class WebSocketScreen extends React.Component<{}, State> {
  private socket: WebSocket | null = null;

  static options() {
    return {
      topBar: {
        title: {
          text: 'WebSocket',
        },
      },
    };
  }

  constructor(props: {}) {
    super(props);
    this.state = {
      url: DEFAULT_WEB_SOCKET_URL,
      message: 'Hello from the React Native WebSocket example',
      status: 'Disconnected',
      events: [],
    };
  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
  }

  appendEvent = (event: string) => {
    const timestamp = new Date().toLocaleTimeString();
    this.setState(previousState => ({
      events: [`${timestamp}  ${event}`, ...previousState.events].slice(0, 30),
    }));
  };

  connect = () => {
    const url = this.state.url.trim();
    if (!/^wss?:\/\//i.test(url)) {
      this.appendEvent('ERROR: URL must start with ws:// or wss://');
      return;
    }

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.CONNECTING ||
        this.socket.readyState === WebSocket.OPEN)
    ) {
      this.appendEvent('Connect ignored: a socket is already active');
      return;
    }

    this.setState({status: 'Connecting'});
    this.appendEvent(`CONNECT ${url}`);

    const socket = new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket) {
        return;
      }
      this.setState({status: 'Connected'});
      this.appendEvent('OPEN');
    };

    socket.onmessage = event => {
      if (this.socket !== socket) {
        return;
      }
      const data =
        typeof event.data === 'string'
          ? event.data
          : `[binary message: ${event.data?.byteLength ?? 'unknown'} bytes]`;
      this.appendEvent(`RECEIVE ${data}`);
    };

    socket.onerror = event => {
      if (this.socket !== socket) {
        return;
      }
      this.setState({status: 'Failed'});
      this.appendEvent(`ERROR: ${event.message || 'WebSocket request failed'}`);
    };

    socket.onclose = event => {
      if (this.socket !== socket) {
        return;
      }
      this.socket = null;
      this.setState({status: 'Disconnected'});
      this.appendEvent(
        `CLOSE code=${event.code} reason=${event.reason || '(none)'}`,
      );
    };
  };

  send = () => {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.appendEvent('Send ignored: connect the socket first');
      return;
    }

    const payload = JSON.stringify({
      message: this.state.message,
      platform: Platform.OS,
      sentAt: new Date().toISOString(),
      source: 'ft-sdk-react-native-example',
    });
    this.socket.send(payload);
    this.appendEvent(`SEND ${payload}`);
  };

  disconnect = () => {
    if (!this.socket) {
      this.appendEvent('Disconnect ignored: no active socket');
      return;
    }

    this.setState({status: 'Closing'});
    this.appendEvent('CLOSE requested');
    this.socket.close(1000, 'Closed from example');
  };

  renderButton = (title: string, onPress: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        pageStyles.button,
        disabled && pageStyles.buttonDisabled,
        pressed && !disabled && pageStyles.buttonPressed,
      ]}>
      <Text style={pageStyles.buttonText}>{title}</Text>
    </Pressable>
  );

  render() {
    const {events, message, status, url} = this.state;
    const isConnected = status === 'Connected';
    const isConnecting = status === 'Connecting';

    return (
      <ScrollView
        style={pageStyles.container}
        contentContainerStyle={pageStyles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={pageStyles.description}>
          This page calls the React Native WebSocket API directly and does not
          manually report a RUM Resource. Compare SDK debug logs and uploaded
          Resource data on Android and iOS after running the same steps.
        </Text>

        <Text style={pageStyles.label}>Server URL</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isConnecting && !isConnected}
          onChangeText={value => this.setState({url: value})}
          style={pageStyles.input}
          value={url}
        />

        <Text style={pageStyles.label}>Message</Text>
        <TextInput
          onChangeText={value => this.setState({message: value})}
          style={pageStyles.input}
          value={message}
        />

        <View style={pageStyles.statusRow}>
          <Text style={pageStyles.label}>Status</Text>
          <Text
            style={[
              pageStyles.status,
              isConnected ? pageStyles.connected : pageStyles.notConnected,
            ]}>
            {status}
          </Text>
        </View>

        <View style={pageStyles.actions}>
          {this.renderButton(
            'Connect',
            this.connect,
            isConnecting || isConnected,
          )}
          {this.renderButton('Send', this.send, !isConnected)}
          {this.renderButton(
            'Disconnect',
            this.disconnect,
            status === 'Disconnected',
          )}
        </View>

        <View style={pageStyles.eventHeader}>
          <Text style={pageStyles.eventTitle}>Events</Text>
          <Pressable onPress={() => this.setState({events: []})}>
            <Text style={pageStyles.clearText}>Clear</Text>
          </Pressable>
        </View>

        <View style={pageStyles.eventPanel}>
          {events.length === 0 ? (
            <Text style={pageStyles.emptyText}>No WebSocket events yet.</Text>
          ) : (
            events.map((event, index) => (
              <Text key={`${event}-${index}`} style={pageStyles.eventText}>
                {event}
              </Text>
            ))
          )}
        </View>
      </ScrollView>
    );
  }
}

const pageStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  description: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  label: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    minHeight: 44,
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'white',
    color: '#0f172a',
    fontSize: 14,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  status: {
    fontSize: 14,
    fontWeight: '700',
  },
  connected: {
    color: '#15803d',
  },
  notConnected: {
    color: '#b45309',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 8,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  buttonPressed: {
    opacity: 0.72,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  eventHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '700',
  },
  clearText: {
    color: '#0f766e',
    fontSize: 14,
    fontWeight: '600',
  },
  eventPanel: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    minHeight: 160,
    padding: 12,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  eventText: {
    color: '#d1fae5',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
});

export default WebSocketScreen;
