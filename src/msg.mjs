export default class Msg {
  constructor(action, content) {
    this.action = action;
    this.content = content;
  }

  pack() {
    return JSON.stringify({
      ACTION: this.action,
      CONTENT: this.content,
    });
  }
}

const ACTION_EXIT = "EXIT";
const ACTION_NEW_PLAYER = "NEW_PLAYER";
const ACTION_REGISTER = "REGISTER";
const ACTION_UPDATE = "UPDATE";
const ACTION_NEW_POS = "NEW_POS";
const ACTION_MESSAGE = "MESSAGE";
const ACTION_MSG = "MSG";
const ACTION_SEND_MAZE_DATA = "SEND_MAZE_DATA";
const ACTION_ASK_MAZE_DATA = "ASK_MAZE_DATA";
const ACTION_WIN = "WIN";
const ACTION_LOST = "LOST";
const ACTION_MAP_INFO = "MAP_INFO";
const ACTION_MAX_PLAYERS = "MAX_PLAYERS";

export {
  ACTION_EXIT,
  ACTION_MESSAGE,
  ACTION_NEW_PLAYER,
  ACTION_NEW_POS,
  ACTION_REGISTER,
  ACTION_UPDATE,
  ACTION_MSG,
  ACTION_SEND_MAZE_DATA,
  ACTION_ASK_MAZE_DATA,
  ACTION_LOST,
  ACTION_WIN,
  ACTION_MAP_INFO,
  ACTION_MAX_PLAYERS
}
