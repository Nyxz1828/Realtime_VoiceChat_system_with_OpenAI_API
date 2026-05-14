export default class VirtualAudioBridge {
  constructor(options = {}) {
    this.inputMatch = options.inputMatch || "CABLE Output";
    this.outputMatch = options.outputMatch || "CABLE-A Input";
    this.stream = null;
    this.inputDevice = null;
    this.outputDevice = null;
    this.audioElement = null;
  }

  async listDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      audioInputs: devices.filter(d => d.kind === "audioinput"),
      audioOutputs: devices.filter(d => d.kind === "audiooutput"),
      all: devices
    };
  }

  async findDeviceByLabel(kind, matchText) {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const found = devices.find(
      d =>
        d.kind === kind &&
        d.label &&
        d.label.toLowerCase().includes(matchText.toLowerCase())
    );

    if (!found) {
      throw new Error(`Device not found: kind=${kind}, match="${matchText}"`);
    }

    return found;
  }

  async openInput(matchText = this.inputMatch) {
    // First permission prompt so labels become available
    await navigator.mediaDevices.getUserMedia({ audio: true });

    this.inputDevice = await this.findDeviceByLabel("audioinput", matchText);

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: { exact: this.inputDevice.deviceId },
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });

    return {
      device: this.inputDevice,
      stream: this.stream
    };
  }

  async attachOutput(audioElement, matchText = this.outputMatch) {
    if (!audioElement) {
      throw new Error("attachOutput(audioElement): audioElement is required");
    }

    this.audioElement = audioElement;

    const hasSetSinkId = typeof audioElement.setSinkId === "function";
    if (!hasSetSinkId) {
      throw new Error("setSinkId is not supported in this browser");
    }

    // Optional modern picker if supported
    if (navigator.mediaDevices?.selectAudioOutput) {
      try {
        const picked = await navigator.mediaDevices.selectAudioOutput();
        if (
          picked?.label &&
          picked.label.toLowerCase().includes(matchText.toLowerCase())
        ) {
          this.outputDevice = picked;
          await audioElement.setSinkId(picked.deviceId);
          return this.outputDevice;
        }
      } catch {
        // fall back to enumerateDevices matching
      }
    }

    this.outputDevice = await this.findDeviceByLabel("audiooutput", matchText);
    await audioElement.setSinkId(this.outputDevice.deviceId);
    return this.outputDevice;
  }

  async openPair({ inputMatch, outputMatch, audioElement } = {}) {
    const inputResult = await this.openInput(inputMatch || this.inputMatch);

    let outputResult = null;
    if (audioElement) {
      outputResult = await this.attachOutput(
        audioElement,
        outputMatch || this.outputMatch
      );
    }

    return {
      input: inputResult.device,
      output: outputResult,
      stream: inputResult.stream
    };
  }

  stopInput() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  getInputStream() {
    return this.stream;
  }

  getSelectedDevices() {
    return {
      input: this.inputDevice,
      output: this.outputDevice
    };
  }
}