import { TgpuBuffer } from 'typegpu';
import { vec2f, vec3f } from 'typegpu/data';
import { UNIFORMS_COLORIZATION, UNIFORMS_SLIME_SIM } from './uniforms';
import { ColorizationUniformsStruct, SlimeSimUniformsStruct } from './data-types';

const resetAgentsBuffer = (
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  agentsBufferGPU: GPUBuffer,
) => {
  const numOfAgents = UNIFORMS_SLIME_SIM.numOfAgents.value;
  const agentsArraySize = numOfAgents * 4;
  const agentsArrayCPU = new Float32Array(agentsArraySize);

  // initialize agents data
  for (let i = 0; i < numOfAgents; i++) {
    // agent position
    let x = canvas.width / 2;
    let y = canvas.height / 2;
    let r = Math.random() * 10;
    agentsArrayCPU[i * 4 + 0] =
      x + Math.cos(r) * UNIFORMS_SLIME_SIM.startRadius.value;
    agentsArrayCPU[i * 4 + 1] =
      y + Math.sin(r) * UNIFORMS_SLIME_SIM.startRadius.value;

    // agent direction
    agentsArrayCPU[i * 4 + 2] = Math.random() * 2 - 1;
    agentsArrayCPU[i * 4 + 3] = Math.random() * 2 - 1;
  }

  // write to gpu buffer
  device.queue.writeBuffer(agentsBufferGPU, 0, agentsArrayCPU);

  return agentsBufferGPU;
};

const resetSlimeSimUniformsBuffer = (
  canvas: HTMLCanvasElement,
  uniformsBufferGPU: TgpuBuffer<typeof SlimeSimUniformsStruct>,
) => {
  uniformsBufferGPU.write({
    // canvas
    resolution: vec2f(canvas.width, canvas.height),
    // general
    radius: UNIFORMS_SLIME_SIM.radius.value,
    stepSize: UNIFORMS_SLIME_SIM.stepSize.value,
    decayT: UNIFORMS_SLIME_SIM.decayT.value,
    // sensor
    sensorOffset: UNIFORMS_SLIME_SIM.sensorOffset.value,
    sensorAngle: UNIFORMS_SLIME_SIM.sensorAngle.value,
    rotationAngle: UNIFORMS_SLIME_SIM.rotationAngle.value,
    diffuseKernel: 0,
  });

  return uniformsBufferGPU;
};

const resetColorizationUniformsBuffer = (
  colorizationUniformsBufferGPU: TgpuBuffer<typeof ColorizationUniformsStruct>,
) => {
  const slimeColor = UNIFORMS_COLORIZATION.slimeColor.value;

  colorizationUniformsBufferGPU.write({
    blurTrail: UNIFORMS_COLORIZATION.blurTrail.value ? 1 : 0,
    enableLighting: UNIFORMS_COLORIZATION.enableLighting.value ? 1 : 0,
    slimeColor: vec3f(slimeColor.r / 255, slimeColor.g / 255, slimeColor.b / 255),
  });
};

const resetGPUTextures = (
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  gpuTextureForStorage: GPUTexture,
  gpuTextureForRead: GPUTexture,
) => {
  const size = Math.floor(canvas.width * canvas.height) * 4;
  const textureDataCPU = new Int8Array(size);
  for (let i = 0; i < canvas.width * canvas.height; i++) {
    textureDataCPU[i * 4 + 0] = 0;
    textureDataCPU[i * 4 + 1] = 0;
    textureDataCPU[i * 4 + 2] = 0;
    textureDataCPU[i * 4 + 3] = 255;
  }

  device.queue.writeTexture(
    {
      texture: gpuTextureForStorage,
    },
    textureDataCPU,
    {
      bytesPerRow: canvas.width * 4,
    },
    {
      width: canvas.width,
      height: canvas.height,
    },
  );

  device.queue.writeTexture(
    {
      texture: gpuTextureForRead,
    },
    textureDataCPU,
    {
      bytesPerRow: canvas.width * 4,
    },
    {
      width: canvas.width,
      height: canvas.height,
    },
  );
};

export {
  resetAgentsBuffer,
  resetColorizationUniformsBuffer,
  resetGPUTextures,
  resetSlimeSimUniformsBuffer,
};
