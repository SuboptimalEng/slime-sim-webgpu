import type { TgpuBuffer } from 'typegpu';
import { type TgpuArray, vec2f, vec3f } from 'typegpu/data';
import { UNIFORMS_COLORIZATION, UNIFORMS_SLIME_SIM } from './uniforms';
import { AgentStruct, ColorizationUniformsStruct, SlimeSimUniformsStruct } from './data-types';

const resetAgentsBuffer = (
  canvas: HTMLCanvasElement,
  agentsBufferGPU: TgpuBuffer<TgpuArray<typeof AgentStruct>>,
) => {
  const startRadius = UNIFORMS_SLIME_SIM.startRadius.value;
  const numOfAgents = UNIFORMS_SLIME_SIM.numOfAgents.value;

  // write to gpu buffer
  agentsBufferGPU.write(Array.from({ length: numOfAgents }).map(() => {
    let x = canvas.width / 2;
    let y = canvas.height / 2;
    let r = Math.random() * 10;

    return {
      position: vec2f(x + Math.cos(r) * startRadius, y + Math.sin(r) * startRadius),
      direction: vec2f(Math.random() * 2 - 1, Math.random() * 2 - 1),
    };
  }));

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
