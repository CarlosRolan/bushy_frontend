import { p, enemies } from "./player.js";
import { updateEnemies, deleteEnemy, addEnemy, spectate } from "./scene.js";
import Msg, {
  ACTION_EXIT,
  ACTION_NEW_PLAYER,
  ACTION_NEW_POS,
  ACTION_REGISTER,
  ACTION_MSG,
  ACTION_ASK_MAZE_DATA,
  ACTION_SEND_MAZE_DATA,
  ACTION_WIN,
  ACTION_LOST,
  ACTION_MAP_INFO,
  ACTION_MAX_PLAYERS
} from "../msg.mjs";
import { loossingSound } from "./audioLoader.js";

const gameMode = localStorage.getItem('gameMode') || 'solo';
const isOnline  = gameMode === 'online';

const protocol     = window.location.protocol === "https:" ? "wss:" : "ws:";
const defaultWsUrl = `${protocol}//${window.location.host}`;

function normalizeWsUrl(url) {
  if (!url)                      return defaultWsUrl;
  if (url.startsWith("https://")) return `wss://${url.slice("https://".length)}`;
  if (url.startsWith("http://"))  return `ws://${url.slice("http://".length)}`;
  return url;
}

// ── WebSocket — only open in online mode ─────────────────────────────────────
let ws = null;

if (isOnline) {
  ws = new WebSocket(normalizeWsUrl(process.env.SERVER_URL));

  ws.onopen = function () {
    console.log("Connection established");
    registerPlayer();
  };

  ws.onmessage = function ({ data }) {
    handleServerResponse(JSON.parse(data));
  };

  ws.onerror = function (error) {
    console.error("WebSocket error:", error);
  };

  ws.onclose = function () {
    console.log("Connection closed");
  };
}

// ── Message handling ─────────────────────────────────────────────────────────
function handleServerResponse(serverMsg) {
  const { ACTION, CONTENT } = serverMsg;

  switch (ACTION) {

    case ACTION_SEND_MAZE_DATA:
      console.log("Getting the map data");
      break;

    case ACTION_MSG:
      console.log(CONTENT);
      break;

    case ACTION_EXIT:
      deleteEnemy(CONTENT);
      break;

    case ACTION_NEW_POS:
      const { id, position, rotation } = CONTENT;
      updateEnemyPosition(id, position, rotation);
      break;

    case ACTION_LOST:
      lost();
      break;

    case ACTION_NEW_PLAYER:
      addEnemy(CONTENT);
      break;

    case ACTION_MAP_INFO:
      CONTENT.forEach(id => {
        if (p.id !== id) addEnemy(id);
      });
      break;

    case ACTION_MAX_PLAYERS:
      spectate();
      break;

    default:
      console.log("No action specified");
      break;
  }
}

function registerPlayer() {
  sendMessage(new Msg(ACTION_REGISTER, p.id));
}

function sendMessage(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(msg.pack());
  }
}

function updateEnemyPosition(id, position, rotation) {
  enemies.forEach(e => {
    if (e.id === id) {
      e.move(position.x, position.y, position.z);
      e.rotate(rotation);
    }
  });
  updateEnemies(enemies);
}

// ── End-game ─────────────────────────────────────────────────────────────────
function endGame(text) {
  const endMsg     = document.getElementById("endMsg");
  const blackOverlay = document.getElementById("blackOverlay");

  endMsg.innerHTML     = text;
  endMsg.style.display = "block";
  blackOverlay.style.opacity = "1";

  setTimeout(() => {
    window.location = "index.html";
  }, 3000);
}

function win(player) {
  endGame("WIN");
  if (isOnline) sendMessage(new Msg(ACTION_WIN, player.id));
}

function lost() {
  endGame("LOST");
  loossingSound.play();
}

function getConnectionStatus() {
  if (!ws) return 'Solo';
  switch (ws.readyState) {
    case WebSocket.CONNECTING: return 'Connecting';
    case WebSocket.OPEN:       return 'Connected';
    case WebSocket.CLOSING:    return 'Closing';
    case WebSocket.CLOSED:     return 'Disconnected';
    default:                   return 'Unknown';
  }
}

export { sendPosition, win, lost, getConnectionStatus };

function sendPosition(position) {
  if (!isOnline) return;
  sendMessage(new Msg(ACTION_NEW_POS, position));
}
