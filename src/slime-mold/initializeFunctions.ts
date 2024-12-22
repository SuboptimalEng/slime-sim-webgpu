import { Pane } from 'tweakpane';
import { UNIFORMS_COLORIZATION, UNIFORMS_SLIME_SIM } from './uniforms';
import {
  resetAgentsBuffer,
  resetColorizationUniforms,
  resetGPUTextures,
  resetSlimeSimUniforms,
} from './initializeHelpers';

const initializeWebGPU = async () => {
  const canvas = document.querySelector('canvas');
  if (!canvas) {
    throw new Error('No canvas detected in the browser.');
  }
  canvas.width = 800;
  canvas.height = 600;
  // canvas.width = 1600;
  // canvas.height = 900;
  // canvas.width /= 2.0;
  // canvas.height /= 2.0;

  if (!navigator.gpu) {
    throw new Error('WebGPU is not supported in this browser.');
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error('No appropriate GPUAdapter found.');
  }

  // https://eliemichel.github.io/LearnWebGPU/getting-started/adapter-and-device/the-device.html
  // device is used to create all other gpu objects
  // once device is created, the adapter should in general no longer be used
  const device = await adapter.requestDevice();

  device.addEventListener('uncapturederror', (event) => {
    console.log(
      `%c ${(event as GPUUncapturedErrorEvent).error.message}`,
      'color: #FF0000; font-weight: bold; font-size: 12px',
    );
  });

  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  const context = canvas.getContext('webgpu');
  if (!context) {
    throw new Error('Cannot recieve WebGPU context from canvas.');
  }

  context.configure({
    device: device,
    format: canvasFormat,
  });

  return { canvas, canvasFormat, context, device };
};

const initializeSlimeSimUniforms = (
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  pane: Pane,
): GPUBuffer => {
  // ===================================
  // Set up tweakpane settings.
  // ===================================
  const generalFolder = pane.addFolder({ title: 'General' });
  generalFolder.addBinding(UNIFORMS_SLIME_SIM.radius, 'value', {
    ...UNIFORMS_SLIME_SIM.radius,
  });
  generalFolder.addBinding(UNIFORMS_SLIME_SIM.stepSize, 'value', {
    ...UNIFORMS_SLIME_SIM.stepSize,
  });
  generalFolder.addBinding(UNIFORMS_SLIME_SIM.decayT, 'value', {
    ...UNIFORMS_SLIME_SIM.decayT,
  });

  const agentFolder = pane.addFolder({ title: 'Agent' });
  agentFolder.addBinding(UNIFORMS_SLIME_SIM.sensorOffset, 'value', {
    ...UNIFORMS_SLIME_SIM.sensorOffset,
  });
  agentFolder.addBinding(UNIFORMS_SLIME_SIM.sensorAngle, 'value', {
    ...UNIFORMS_SLIME_SIM.sensorAngle,
  });
  agentFolder.addBinding(UNIFORMS_SLIME_SIM.rotationAngle, 'value', {
    ...UNIFORMS_SLIME_SIM.rotationAngle,
  });

  const randomizeAgentSettingsButton = agentFolder.addButton({
    title: 'Randomize Agent Settings',
  });

  // ===================================
  // Set up gpu buffer(s).
  // ===================================
  // Array of size 8 is too small.
  const uniformsCPU = new Float32Array(10);
  const uniformsBufferGPU = device.createBuffer({
    label: 'create uniforms buffer for gpu',
    size: uniformsCPU.byteLength,
    usage:
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.UNIFORM,
  });

  resetSlimeSimUniforms(device, canvas, uniformsCPU, uniformsBufferGPU);

  // ===================================
  // Add tweakpane handlers.
  // ===================================
  pane.on('change', (e) => {
    resetSlimeSimUniforms(device, canvas, uniformsCPU, uniformsBufferGPU);
    console.log('pane changed!');
  });
  randomizeAgentSettingsButton.on('click', (e) => {
    console.log('randomize agents clicked!');
    const getRandomValue = (min: number, max: number, step: number) => {
      const range = (max - min) / step;
      const randomStep = Math.floor(Math.random() * (range + 1));
      return min + randomStep * step;
    };

    const sensorOffset = UNIFORMS_SLIME_SIM.sensorOffset;
    const sensorAngle = UNIFORMS_SLIME_SIM.sensorAngle;
    const rotationAngle = UNIFORMS_SLIME_SIM.rotationAngle;

    UNIFORMS_SLIME_SIM.sensorOffset.value = getRandomValue(
      sensorOffset.min,
      sensorOffset.max,
      sensorOffset.step,
    );
    UNIFORMS_SLIME_SIM.sensorAngle.value = getRandomValue(
      sensorAngle.min,
      sensorAngle.max,
      sensorAngle.step,
    );
    UNIFORMS_SLIME_SIM.rotationAngle.value = getRandomValue(
      rotationAngle.min,
      rotationAngle.max,
      rotationAngle.step,
    );

    pane.refresh();
  });

  return uniformsBufferGPU;
};

const initializeColorizationUniforms = (device: GPUDevice, pane: Pane) => {
  // ===================================
  // Set up tweakpane settings.
  // ===================================
  const colorizationFolder = pane.addFolder({ title: 'Colorization' });
  colorizationFolder.addBinding(UNIFORMS_COLORIZATION.blurTrail, 'value', {
    ...UNIFORMS_COLORIZATION.blurTrail,
  });
  colorizationFolder.addBinding(UNIFORMS_COLORIZATION.enableLighting, 'value', {
    ...UNIFORMS_COLORIZATION.enableLighting,
  });
  colorizationFolder.addBinding(UNIFORMS_COLORIZATION.slimeColor, 'value', {
    ...UNIFORMS_COLORIZATION.slimeColor,
  });

  // ===================================
  // Set up gpu buffer(s).
  // ===================================
  const colorizationUniformsArrayCPU = new Float32Array(12);
  const colorizationUniformsBufferGPU = device.createBuffer({
    label: 'colorization uniforms buffer',
    size: colorizationUniformsArrayCPU.byteLength,
    usage:
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.UNIFORM,
  });

  resetColorizationUniforms(
    device,
    colorizationUniformsArrayCPU,
    colorizationUniformsBufferGPU,
  );

  // ===================================
  // Add tweakpane handlers.
  // ===================================
  colorizationFolder.on('change', (e) => {
    resetColorizationUniforms(
      device,
      colorizationUniformsArrayCPU,
      colorizationUniformsBufferGPU,
    );
  });

  return colorizationUniformsBufferGPU;
};

const initializeGPUTextures = (
  device: GPUDevice,
  canvas: HTMLCanvasElement,
) => {
  const gpuTextureForStorage = device.createTexture({
    label: 'create texture A for storage on gpu',
    format: 'rgba8unorm',
    size: {
      width: canvas.width,
      height: canvas.height,
    },
    usage:
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.COPY_SRC |
      GPUTextureUsage.STORAGE_BINDING |
      GPUTextureUsage.TEXTURE_BINDING,
  });

  const gpuTextureForRead = device.createTexture({
    label: 'create texture B for read on gpu',
    format: 'rgba8unorm',
    size: {
      width: canvas.width,
      height: canvas.height,
    },
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
  });

  return { gpuTextureForStorage, gpuTextureForRead };
};

const initializeAgents = (
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  pane: Pane,
  gpuTextureForStorage: GPUTexture,
  gpuTextureForRead: GPUTexture,
) => {
  // ===================================
  // Set up tweakpane settings.
  // ===================================
  const simulationFolder = pane.addFolder({ title: 'Simulation' });
  simulationFolder.addBinding(UNIFORMS_SLIME_SIM.numOfAgents, 'value', {
    ...UNIFORMS_SLIME_SIM.numOfAgents,
  });
  simulationFolder.addBinding(UNIFORMS_SLIME_SIM.startRadius, 'value', {
    ...UNIFORMS_SLIME_SIM.startRadius,
  });
  const downloadImageButton = simulationFolder.addButton({
    title: 'Download Image',
  });

  // ===================================
  // Set up gpu buffer(s).
  // ===================================
  // todo: Currently, bind groups don't change variables so we initialize agentsBufferGPU
  // to be max size so that numOfAgents slider works as expected. More correct approach
  // could be to re-create bindgroups with agentsBufferGPU whenever it changes.
  // this will not incur performance hit because compute pass runs with SLIME_MOLD_UNIFORMS.numOfAgents
  // even if this gpu array is large, we won't use it for most calculations when numOfAgents is small
  const maxAgentsArraySize = UNIFORMS_SLIME_SIM.numOfAgents.max * 4;
  const fakeArrayCPU = new Float32Array(maxAgentsArraySize);
  const agentsBufferGPU = device.createBuffer({
    label: 'create agents buffer',
    size: fakeArrayCPU.byteLength,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  });

  resetAgentsBuffer(device, canvas, agentsBufferGPU);
  resetGPUTextures(device, canvas, gpuTextureForStorage, gpuTextureForRead);

  // ===================================
  // Add tweakpane handlers.
  // ===================================
  simulationFolder.on('change', (e) => {
    resetAgentsBuffer(device, canvas, agentsBufferGPU);
    resetGPUTextures(device, canvas, gpuTextureForStorage, gpuTextureForRead);
  });

  downloadImageButton.on('click', (e) => {
    const canvasImage = canvas.toDataURL('image/png');

    // this can be used to download any image from webpage to local disk
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onload = () => {
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(xhr.response);
      a.download = 'slime-mold.png';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    xhr.open('GET', canvasImage); // This is to download the canvas Image
    xhr.send();
  });

  return agentsBufferGPU;
};

export {
  initializeWebGPU,
  initializeGPUTextures,
  initializeAgents,
  initializeColorizationUniforms,
  initializeSlimeSimUniforms,
};
