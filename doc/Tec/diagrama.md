# Diagrama de Clases del Servidor

Para crear diagramas de clases basados en el código proporcionado, puedes usar una herramienta de generación de diagramas como PlantUML. Aquí tienes el código PlantUML para generar el diagrama de clases del servidor:

```plaintext
@startuml

class Msg {
  - action: String
  - content: Any
  + Msg(action, content)
  + pack(): String
}

class WebSocketServer {
}

class Server {
  - wss: WebSocketServer
  - playerIds: Set
  - mazeData: Array
  + listenConnections(): void
  + handleClientMsg(message, ws): void
  + handlePlayerVictory(playerId, ws): void
  + handleNewPlayer(playerId, ws): void
  + handleNewPosition(content): void
  + handleClientExit(ws): void
  + broadcast(content): void
  + broadcastExcept(excludedClient, message): void
  + sendMsgToClient(ws, msg): void
  + generateMazeData(width, height): Array
  + getNumTotalPlayers(): Number
  + sendMazeData(mazeData, ws): void
}

Server --> "1" WebSocketServer
Server --> "1..*" Msg

@enduml
