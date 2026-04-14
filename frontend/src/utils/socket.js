import { io } from "socket.io-client";
import { SOCKET_BASE_URL } from "../config/api";

export function createAuthedSocket() {
  const token = localStorage.getItem("jwt");

  return io(SOCKET_BASE_URL, {
    transports: ["websocket"],
    auth: { token }
  });
}
