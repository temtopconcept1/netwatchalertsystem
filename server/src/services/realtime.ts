import { Server } from "socket.io";

let io: Server | null = null;

export function setIO(instance: Server) {
  io = instance;
}

export function getIO(): Server | null {
  return io;
}

/** Broadcast a generic dashboard-refresh signal to all connected clients. */
export function broadcast(event: string, payload: unknown) {
  io?.emit(event, payload);
}
