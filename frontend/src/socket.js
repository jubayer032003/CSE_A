import { io } from "socket.io-client";

const socketServerUrl = import.meta.env.DEV
  ? `http://${window.location.hostname}:5000`
  : undefined;

const socket = io(socketServerUrl, {
  transports: ["websocket", "polling"],
});

export default socket;
