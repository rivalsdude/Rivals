/**
 * Multiplayer transport for BEATHIM.
 *
 * The game is a static site, so there is no server: tabs of the same browser
 * talk to each other directly. BroadcastChannel handles that natively and the
 * localStorage event is used as a fallback for older browsers.
 *
 * Messages are plain objects with a `t` (type) field and a `from` client id:
 *   hello  { skin, name }                                  "I exist, tell me about you"
 *   state  { skin, name, p:[x,y,z], yaw, hp, mode }        ~10x per second
 *   hit    { to, damage, name }                            "I shot you"
 *   bye    {}                                              tab is closing
 */
const CHANNEL = 'beathim-multiplayer';

export function createNet(onMessage) {
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

  let channel = null;
  if (typeof BroadcastChannel === 'function') {
    try {
      channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = (event) => deliver(event.data);
    } catch (error) {
      channel = null;
    }
  }

  function deliver(message) {
    if (!message || message.from === id) return;
    try {
      onMessage(message);
    } catch (error) {
      console.error('multiplayer handler failed', error);
    }
  }

  if (!channel) {
    addEventListener('storage', (event) => {
      if (event.key !== CHANNEL || !event.newValue) return;
      try {
        deliver(JSON.parse(event.newValue));
      } catch (error) {
        /* ignore malformed messages */
      }
    });
  }

  function send(message) {
    message.from = id;
    if (channel) {
      try {
        channel.postMessage(message);
      } catch (error) {
        /* channel closed */
      }
      return;
    }
    try {
      localStorage.setItem(CHANNEL, JSON.stringify(message));
    } catch (error) {
      /* storage blocked */
    }
  }

  return { id, send, usingFallback: !channel };
}
