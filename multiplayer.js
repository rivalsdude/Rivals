/**
 * Multiplayer transport for BEATHIM.
 *
 * The game is a static site, so there is no game server. Two channels are used:
 *
 *   BroadcastChannel / localStorage  - tabs of the same browser (instant, offline)
 *   MQTT over WebSocket              - any browser anywhere, through a public
 *                                      broker, so two computers can play
 *
 * Every message gets a unique `mid`, so a message that arrives over both
 * channels is only handled once.
 *
 * Messages are plain objects with a `t` (type) field and a `from` client id:
 *   hello  { skin, name }                                  "I exist, tell me about you"
 *   state  { skin, name, p:[x,y,z], yaw, hp, mode, score }  ~10x per second
 *   hit    { to, damage, name }                            "I shot you"
 *   bye    {}                                              tab is closing
 *   duel-* { to, ... }                                     1v1 invites / results
 *
 * Add `?room=something` to the URL to play in a private room, and
 * `?nolocal=1` to test the internet channel alone (ignores same-browser tabs).
 */
const CHANNEL = 'beathim-multiplayer';
// Public MQTT brokers. A browser joins every one of them, so two computers
// only need a single broker that both can reach.
const BROKERS = [
  'wss://mqtt.eclipseprojects.io/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://broker.emqx.io:8084/mqtt',
  'wss://test.mosquitto.org:8081/mqtt'
];
const MQTT_LIBRARY = 'https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.esm.js';

export function createNet(onMessage, options = {}) {
  const params = new URLSearchParams(location.search);
  const noLocal = params.has('nolocal');
  const room = (params.get('room') || 'main').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'main';
  const topic = 'beathim/v1/' + room;
  const localChannel = CHANNEL + ':' + room;

  let id = '';
  try {
    id = sessionStorage.getItem('beathim-client-id') || '';
    if (!id) {
      id = 'p' + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem('beathim-client-id', id);
    }
  } catch (error) {
    id = 'p' + Math.random().toString(36).slice(2, 10);
  }

  let sequence = 0;
  let stateTick = 0;
  const seen = new Set();
  const stats = { bc: 0, mqtt: 0, sent: 0 };
  let status = 'local';

  /* ---------------- same browser ---------------- */
  let channel = null;
  if (!noLocal && typeof BroadcastChannel === 'function') {
    try {
      channel = new BroadcastChannel(localChannel);
      channel.onmessage = (event) => deliver(event.data, 'bc');
    } catch (error) {
      channel = null;
    }
  }
  const useStorage = !noLocal && !channel;
  if (useStorage) {
    addEventListener('storage', (event) => {
      if (event.key !== localChannel || !event.newValue) return;
      try {
        deliver(JSON.parse(event.newValue), 'bc');
      } catch (error) {
        /* ignore malformed messages */
      }
    });
  }

  /* ---------------- internet ---------------- */
  // Every browser joins *all* brokers and publishes on each one, so two
  // computers still meet even if one broker is slow or unreachable for one of
  // them. Duplicate copies of a message are dropped by `mid`.
  const clients = [];

  async function startInternet() {
    if (typeof WebSocket !== 'function') return;
    status = 'connecting';
    let library = null;
    try {
      const module = await import(MQTT_LIBRARY);
      library = module.default || module;
    } catch (error) {
      status = 'local';
      return;
    }
    if (!library || typeof library.connect !== 'function') {
      status = 'local';
      return;
    }
    for (const url of BROKERS) connectBroker(library, url);
  }

  function connectBroker(library, url) {
    let client = null;
    try {
      client = library.connect(url, {
        clientId: 'beathim_' + id + '_' + Math.random().toString(36).slice(2, 7),
        clean: true,
        connectTimeout: 9000,
        reconnectPeriod: 8000,
        keepalive: 30
      });
    } catch (error) {
      return;
    }
    clients.push(client);
    let announced = false;
    const giveUp = setTimeout(() => {
      if (announced) return;
      if (!clients.some((entry) => entry.connected)) status = 'local';
    }, 14000);
    client.on('connect', () => {
      announced = true;
      clearTimeout(giveUp);
      status = 'online';
      client.subscribe(topic, { qos: 1 });
      if (typeof options.onReady === 'function' && !options.__ready) {
        options.__ready = true;
        options.onReady();
      }
    });
    client.on('message', (received, payload) => {
      if (received !== topic) return;
      try {
        deliver(JSON.parse(payload.toString()), 'mqtt');
      } catch (error) {
        /* ignore malformed messages */
      }
    });
    client.on('error', () => {
      /* mqtt.js retries on its own */
    });
    client.on('close', () => {
      if (status === 'online' && !clients.some((entry) => entry.connected)) status = 'connecting';
    });
  }

  function deliver(message, transport) {
    if (!message || message.from === id) return;
    if (transport && stats[transport] !== undefined) stats[transport]++;
    if (message.mid) {
      if (seen.has(message.mid)) return;
      seen.add(message.mid);
      if (seen.size > 800) {
        const oldest = seen.values().next().value;
        seen.delete(oldest);
      }
    }
    try {
      onMessage(message);
    } catch (error) {
      console.error('multiplayer handler failed', error);
    }
  }

  function send(message) {
    message.from = id;
    message.mid = id + ':' + (++sequence);
    stats.sent++;
    if (channel) {
      try {
        channel.postMessage(message);
      } catch (error) {
        /* channel closed */
      }
    } else if (useStorage) {
      try {
        localStorage.setItem(localChannel, JSON.stringify(message));
      } catch (error) {
        /* storage blocked */
      }
    }
    // Position updates go out at half rate over the internet (the remote
    // avatar is interpolated anyway) to stay light on the public brokers.
    if (message.t === 'state') {
      stateTick++;
      if (stateTick % 2) return;
    }
    const payload = JSON.stringify(message);
    for (const client of clients) {
      if (!client.connected) continue;
      try {
        client.publish(topic, payload, { qos: 1 });
      } catch (error) {
        /* connection dropped */
      }
    }
  }

  startInternet();

  return {
    id,
    send,
    stats,
    topic,
    room,
    get status() {
      return status;
    },
    get online() {
      return clients.some((client) => client.connected);
    },
    get usingFallback() {
      return useStorage;
    }
  };
}
