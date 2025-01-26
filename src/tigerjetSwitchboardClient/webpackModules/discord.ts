import Dispatcher from "@moonlight-mod/wp/discord/Dispatcher";
import spacepack from "@moonlight-mod/wp/spacepack_spacepack";

interface Device {
  id: string;
  index: number;
  name: string;
  disabled: boolean;
}

export const subscribe = (name: string, f: (...args: any[]) => any) => Dispatcher.subscribe(name, f);

const userStore = spacepack.findByCode(/getCurrentUser\(\){/, /getUser\(.\){/)[0].exports.default;

export const getCurrentUser = () => userStore.getCurrentUser();
export const getUser = (id: string) => userStore.getUser(id);

const channelStore = spacepack.findByCode(/getChannel\(.\){/, /getDMFromUserId\(.\){/)[0].exports.Z;

export const getChannel = (id: string) => channelStore.getChannel(id);

const voiceChannelController = spacepack.findByCode(/selectVoiceChannel\(.\){/, /disconnect\(\){/)[0].exports.default;

export const selectVoiceChannel = (id: string) => voiceChannelController.selectVoiceChannel(id);
export const disconnect = () => voiceChannelController.disconnect();

const voiceStore = spacepack.findByCode(/getVoiceChannelId\(\){/)[0].exports.Z;

export const getVoiceChannelId = () => voiceStore.getVoiceChannelId();

const voiceDeviceStore = spacepack.findByCode(
  /getInputDevices\(\){/,
  /getOutputDevices\(\){/,
  /getInputDeviceId\(\){/,
  /getOutputDeviceId\(\){/
)[0].exports.Z;

export const getInputDevices = () => voiceDeviceStore.getInputDevices() as Record<string, Device>;
export const getOutputDevices = () => voiceDeviceStore.getOutputDevices() as Record<string, Device>;
export const getInputDeviceId = () => voiceDeviceStore.getInputDeviceId() as string;
export const getOutputDeviceId = () => voiceDeviceStore.getOutputDeviceId() as string;

const voiceDeviceController = spacepack.findByCode(/setInputDevice\(.\){/, /setOutputDevice\(.\){/)[0].exports.Z;

export const setInputDevice = (id: string) => voiceDeviceController.setInputDevice(id);
export const setOutputDevice = (id: string) => voiceDeviceController.setOutputDevice(id);

const ringer = spacepack.findByCode(/ring\([a-z,]+\){/, /stopRinging:\([a-z,]+\)=>/)[0].exports.Z;

export const ring = (id: string, recipients: string[]) => ringer.ring(id, recipients);
