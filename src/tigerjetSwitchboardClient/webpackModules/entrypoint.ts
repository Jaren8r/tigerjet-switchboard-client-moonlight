import {
  subscribe,
  getCurrentUser,
  getUser,
  getChannel,
  selectVoiceChannel,
  disconnect,
  getVoiceChannelId,
  getInputDevices,
  getOutputDevices,
  getInputDeviceId,
  getOutputDeviceId,
  setInputDevice,
  setOutputDevice,
  ring
} from "@moonlight-mod/wp/tigerjetSwitchboardClient_discord";

const logger = moonlight.getLogger("tigerjetSwitchboardClient/entrypoint");

const ringing = new Set();
let ws: WebSocket;
let dialing = false;

let lastInputDeviceId = "default";
let lastOutputDeviceId = "default";

interface Device {
  serial: string;
  input: string;
  output: string;
}

function getPhoneAudioDeviceId(type: "input" | "output", device: Device) {
  const devices = type === "input" ? getInputDevices() : getOutputDevices();
  if (device[type] in devices) {
    return device[type];
  }

  for (const id in devices) {
    if (devices[id].name.includes(device.serial)) {
      return id;
    }
  }

  for (const id in devices) {
    if (devices[id].name.includes("Internet Phone")) {
      logger.warn(
        `${type[0].toLowerCase()}${type.substring(1)} device was not able to be found by id/serial. Multiple devices will work incorrectly.`,
        devices[id]
      );
      return id;
    }
  }

  logger.error(`${type[0].toLowerCase()}${type.substring(1)} device could not be found`);

  return "default";
}

function connect() {
  ws = new WebSocket(
    `ws://127.0.0.1:5840/ws?${new URLSearchParams({
      client: "discord",
      secret: moonlight.getConfigOption<string>("tigerjetSwitchboardClient", "secret") ?? ""
    }).toString()}`
  );
  ws.addEventListener("open", () => {
    ringing.clear();
  });
  ws.addEventListener("close", connect);
  ws.addEventListener("message", async (e) => {
    const [typ, data] = JSON.parse(e.data);
    if (typ === "answer") {
      lastInputDeviceId = getInputDeviceId();
      lastOutputDeviceId = getOutputDeviceId();

      setInputDevice(getPhoneAudioDeviceId("input", data.device));
      setOutputDevice(getPhoneAudioDeviceId("output", data.device));
      selectVoiceChannel(data.id);
    }

    if (typ === "end") {
      if (getVoiceChannelId() !== null) {
        disconnect();
        setInputDevice(lastInputDeviceId);
        setOutputDevice(lastOutputDeviceId);
      }
    }

    if (typ === "call") {
      lastInputDeviceId = getInputDeviceId();
      lastOutputDeviceId = getOutputDeviceId();
      setInputDevice(getPhoneAudioDeviceId("input", data.device));
      setOutputDevice(getPhoneAudioDeviceId("output", data.device));
      selectVoiceChannel(data.number);

      const channel = getChannel(data.number);

      if (channel.type === 1) {
        ring(data.number, channel.recipients);
      }
    }
  });
}

function callUpdate(call: any) {
  const channel = getChannel(call.channelId);
  if (call.ringing.includes(getCurrentUser().id)) {
    if (ws && ws.readyState === WebSocket.OPEN && !ringing.has(call.channelId)) {
      let callerId;
      if (channel.recipients.length > 1) {
        callerId = {
          number: channel.id,
          name: channel.name === "" ? undefined : channel.name
        };
      } else {
        const user = getUser(channel.recipients[0]);
        callerId = {
          number: user.id,
          name: user.globalName ?? user.username
        };
      }

      ws.send(
        JSON.stringify([
          "ring",
          {
            id: channel.id,
            callerId
          }
        ])
      );
      ringing.add(channel.id);
    }
  } else {
    if (ws && ws.readyState === WebSocket.OPEN && ringing.delete(call.channelId)) {
      ws.send(JSON.stringify(["stopRinging", call.channelId]));
    }
  }

  const currentChannelId = getVoiceChannelId();
  if (currentChannelId === channel.id || currentChannelId === null) {
    if (call.ringing[0] === channel.recipients[0] && !dialing && currentChannelId !== null) {
      dialing = true;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(["dialing", true]));
      }
    } else if (dialing && ws && ws.readyState === WebSocket.OPEN) {
      dialing = false;
      ws.send(JSON.stringify(["dialing", false]));
    }
  }
}

function callDelete(call: any) {
  if (ringing.delete(call.channelId) && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(["stopRinging", call.channelId]));
  }

  if (dialing && getVoiceChannelId() === null && ws && ws.readyState === WebSocket.OPEN) {
    dialing = false;
    ws.send(JSON.stringify(["dialing", false]));
  }
}

subscribe("CALL_CREATE", callUpdate);
subscribe("CALL_UPDATE", callUpdate);
subscribe("CALL_DELETE", callDelete);
connect();
