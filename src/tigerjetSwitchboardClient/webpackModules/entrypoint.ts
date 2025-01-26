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

const ringing = new Set();
let ws: WebSocket;
let dialing = false;

let lastInputDeviceId = "default";
let lastOutputDeviceId = "default";

function getPhoneInputDeviceId() {
  return Object.values(getInputDevices()).find((d) => d.name.includes("Internet Phone"))?.id ?? "default";
}

function getPhoneOutputDeviceId() {
  return Object.values(getOutputDevices()).find((d) => d.name.includes("Internet Phone"))?.id ?? "default";
}

function connect() {
  ws = new WebSocket(
    `ws://127.0.0.1:5840/ws?${new URLSearchParams({
      client: "discord",
      secret: moonlight.getConfigOption<string>("tigerjetSwitchboardClient", "secret")!
    }).toString()}`
  );
  ws.addEventListener("close", connect);
  ws.addEventListener("message", async (e) => {
    const [typ, data] = JSON.parse(e.data);
    if (typ === "answer") {
      lastInputDeviceId = getInputDeviceId();
      lastOutputDeviceId = getOutputDeviceId();
      setInputDevice(getPhoneInputDeviceId());
      setOutputDevice(getPhoneOutputDeviceId());
      selectVoiceChannel(data);
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
      setInputDevice(getPhoneInputDeviceId());
      setOutputDevice(getPhoneOutputDeviceId());
      selectVoiceChannel(data);

      const channel = getChannel(data);

      if (channel.type === 1) {
        ring(data, channel.recipients);
      }
    }
  });
}

function callUpdate(call: any) {
  const channel = getChannel(call.channelId);
  if (call.ringing.includes(getCurrentUser().id)) {
    if (!ringing.has(call.channelId)) {
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
    if (ringing.delete(call.channelId)) {
      ws.send(JSON.stringify(["stopRinging", call.channelId]));
    }
  }

  const currentChannelId = getVoiceChannelId();
  if (currentChannelId === channel.id || currentChannelId === null) {
    if (call.ringing[0] === channel.recipients[0] && !dialing && currentChannelId !== null) {
      dialing = true;
      ws.send(JSON.stringify(["dialing", true]));
    } else if (dialing) {
      dialing = false;
      ws.send(JSON.stringify(["dialing", false]));
    }
  }
}

function callDelete(call: any) {
  if (ringing.delete(call.channelId)) {
    ws.send(JSON.stringify(["stopRinging", call.channelId]));
  }

  if (dialing && getVoiceChannelId() === null) {
    dialing = false;
    ws.send(JSON.stringify(["dialing", false]));
  }
}

subscribe("CALL_CREATE", callUpdate);
subscribe("CALL_UPDATE", callUpdate);
subscribe("CALL_DELETE", callDelete);
connect();
