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
import { env } from "process";

const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

const ws = new WebSocket(process.env.SERVER_URL);

//const ws = new WebSocket(`${protocol}//${window.location.host}`);

// Handle WebSocket events =======================
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
//================================================

function handleServerResponse(serverMsg) {

  console.log(serverMsg);

  const { ACTION, CONTENT } = serverMsg;

  switch (ACTION) {

    case ACTION_SEND_MAZE_DATA:
      console.log("Getting the map data");
      break;

    case ACTION_MSG:
      console.log(CONTENT);
      break;

    case ACTION_EXIT:
      console.log("Deleting a player");
      deleteEnemy(CONTENT);
      break;

    case ACTION_NEW_POS:
      console.log("Updating enemy position");
      const { id, position, rotation } = CONTENT;
      updateEnemyPosition(id, position, rotation);
      break;

    case ACTION_LOST:
      console.log("You LOST");
      const playerWhoWin = CONTENT;
      console.log(playerWhoWin);
      lost();
      break;

    //Notifies to the players in the map the new player
    case ACTION_NEW_PLAYER:
      console.log("New Player connected");
      addEnemy(CONTENT);
      break;

    //Gets the player already in map
    case ACTION_MAP_INFO:
      const allPlayersId = CONTENT;
      allPlayersId.forEach(id => {
        if (p.id != id) {
          addEnemy(id);
        }
      })
      break;

    case ACTION_MAX_PLAYERS:
      spectate();
      break;

    default:
      console.log("No action specified");
      break;
  }
}

//On Open connection
function registerPlayer() {
  const msg = new Msg(ACTION_REGISTER, p.id);
  sendMessage(msg);
}

function sendPosition(position) {
  const msg = new Msg(ACTION_NEW_POS, position);
  sendMessage(msg);
}

function endGame(text) {
  // Show the "YOU WIN" message
  const endMsg = document.getElementById("endMsg");
  endMsg.innerHTML = text;
  endMsg.style.display = "block";

  // Fade the screen to black
  const blackOverlay = document.getElementById("blackOverlay");
  blackOverlay.style.opacity = "1";

  // Optionally, add a delay before transitioning to the next screen or resetting the game
  setTimeout(() => {
    window.location = "index.html";
  }, 3000); // Adjust the delay time as needed
}

function win(player) {
  const { id } = player;
  console.log(id);
  endGame("WIN");
  const winMsg = new Msg(ACTION_WIN, player.id);
  sendMessage(winMsg);
}

function lost() {
  endGame("LOST");
  loossingSound.play();
}

function sendMessage(msg) {
  if (ws.readyState === ws.OPEN) {
    ws.send(msg.pack());
  }
}

function updateEnemyPosition(id, position, rotation) {
  enemies.forEach(e => {
    if (e.id == id) {
      e.move(position.x, position.y, position.z);
      e.rotate(rotation);
      return;
    }
  });

  updateEnemies(enemies);
}


export { sendPosition, win, lost };
