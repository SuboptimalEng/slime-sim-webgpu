import tgpu, { type TgpuBuffer, type TgpuRoot, type Uniform } from 'typegpu';
import commonUniformsWGSL from './shaders/common-uniforms.wgsl?raw';
import c1UpdateAgentsWGSL from './shaders/compute-01-update-agents.wgsl?raw';
import c2FadeAgentsTrailWGSL from './shaders/compute-02-fade-agents-trail.wgsl?raw';
import c3BlurAgentsTrailWGSL from './shaders/compute-03-blur-agents-trail.wgsl?raw';
import r1DrawAgentsWGSL from './shaders/render-01-draw-agents.wgsl?raw';
import { AgentArray, ColorizationUniformsStruct, SlimeSimUniformsStruct } from './data-types';

const createUpdateAgentsComputePipeline = (
  root: TgpuRoot,
  slimeSimUniformsBufferGPU: TgpuBuffer<typeof SlimeSimUniformsStruct> & Uniform,
  agentsBufferGPU: GPUBuffer,
  gpuTextureForReadView: GPUTextureView,
  gpuTextureForStorageView: GPUTextureView,
) => {
  const device = root.device;
  const updateAgentsWGSL = [commonUniformsWGSL, c1UpdateAgentsWGSL].join('');
  const updateAgentsShaderModule = device.createShaderModule({
    label: 'update agents: create shader module',
    code: updateAgentsWGSL,
  });
  
  const updateAgentsComputeBindGroupLayout = tgpu.bindGroupLayout({
    uSlimeSim: { uniform: SlimeSimUniformsStruct },
    agentsArray: { storage: AgentArray, access: 'mutable' },
    readFromThisTexture: { texture: 'float' },
    writeToThisTexture: { storageTexture: 'rgba8unorm', access: 'writeonly'},
  }).$name('update agents: create compute bind group layout');
  const updateAgentsComputePipelineLayout = device.createPipelineLayout({
    label: 'update agents: create compute pipeline layout',
    bindGroupLayouts: [root.unwrap(updateAgentsComputeBindGroupLayout)],
  });
  const updateAgentsComputePipeline = device.createComputePipeline({
    label: 'update agents: create compute pipeline',
    layout: updateAgentsComputePipelineLayout,
    // todo: this seems to work, what are pros/cons of using auto?
    // layout: 'auto',
    compute: {
      entryPoint: 'updateAgents',
      module: updateAgentsShaderModule,
    },
  });
  const updateAgentsComputeBindGroup = root.createBindGroup(updateAgentsComputeBindGroupLayout, {
    uSlimeSim: slimeSimUniformsBufferGPU,
    agentsArray: agentsBufferGPU,
    readFromThisTexture: gpuTextureForReadView,
    writeToThisTexture: gpuTextureForStorageView,
  });
  return { updateAgentsComputePipeline, updateAgentsComputeBindGroup };
};

const createFadeAgentsTrailComputePipeline = (
  root: TgpuRoot,
  slimeSimUniformsBufferGPU: TgpuBuffer<typeof SlimeSimUniformsStruct> & Uniform,
  gpuTextureForReadView: GPUTextureView,
  gpuTextureForStorageView: GPUTextureView,
) => {
  const device = root.device;
  const fadeAgentsTrailWGSL = [commonUniformsWGSL, c2FadeAgentsTrailWGSL].join(
    '',
  );
  const fadeAgentsTrailShaderModule = device.createShaderModule({
    label: 'fade agents trail: create shader module',
    code: fadeAgentsTrailWGSL,
  });
  const fadeAgentsTrailComputeBindGroupLayout = tgpu.bindGroupLayout({
    uSlimeSim: { uniform: SlimeSimUniformsStruct },
    readFromThisTexture: { texture: 'float' },
    writeToThisTexture: { storageTexture: 'rgba8unorm', access: 'writeonly' },
  }).$name('fade agents trail: create bind group layout');
  const fadeAgentsTrailComputePipelineLayout = device.createPipelineLayout({
    label: 'fade agents trail: create compute pipeline layout',
    bindGroupLayouts: [root.unwrap(fadeAgentsTrailComputeBindGroupLayout)],
  });
  const fadeAgentsTrailComputePipeline = device.createComputePipeline({
    label: 'fade agents trail: create compute pipeline',
    layout: fadeAgentsTrailComputePipelineLayout,
    compute: {
      entryPoint: 'fadeAgentsTrail',
      module: fadeAgentsTrailShaderModule,
    },
  });
  const fadeAgentsTrailBindGroup = root.createBindGroup(fadeAgentsTrailComputeBindGroupLayout, {
    uSlimeSim: slimeSimUniformsBufferGPU,
    readFromThisTexture: gpuTextureForReadView,
    writeToThisTexture: gpuTextureForStorageView,
  });

  return { fadeAgentsTrailComputePipeline, fadeAgentsTrailBindGroup };
};

const createBlurAgentsTrailComputePipeline = (
  root: TgpuRoot,
  slimeSimUniformsBufferGPU: TgpuBuffer<typeof SlimeSimUniformsStruct> & Uniform,
  colorizationUniformsBufferGPU: GPUBuffer,
  gpuTextureForReadView: GPUTextureView,
  gpuTextureForStorageView: GPUTextureView,
) => {
  const device = root.device;
  // prettier-ignore
  const blurAgentsTrailWGSL = [commonUniformsWGSL, c3BlurAgentsTrailWGSL].join('');
  const blurAgentsTrailShaderModule = device.createShaderModule({
    label: 'blur agents trail: create shader module',
    code: blurAgentsTrailWGSL,
  });
  const blurAgentsTrailComputeBindGroupLayout = tgpu.bindGroupLayout({
    uSlimeSim: { uniform: SlimeSimUniformsStruct },
    uColorization: { uniform: ColorizationUniformsStruct },
    readFromThisTexture: { texture: 'float', viewDimension: '2d' },
    writeToThisTexture: { storageTexture: 'rgba8unorm', viewDimension: '2d', access: 'writeonly' },
  }).$name('blur agents trail: create bindgroup layout');
  const blurAgentsTrailPipelineLayout = device.createPipelineLayout({
    label: 'blur agents trail: create pipeline layout',
    bindGroupLayouts: [root.unwrap(blurAgentsTrailComputeBindGroupLayout)],
  });
  const blurAgentsTrailPipeline = device.createComputePipeline({
    label: 'blur agents trail: create compute pipeline',
    layout: blurAgentsTrailPipelineLayout,
    compute: {
      entryPoint: 'blurAgentsTrail',
      module: blurAgentsTrailShaderModule,
    },
  });
  const blurAgentsTrailBindGroup = root.createBindGroup(blurAgentsTrailComputeBindGroupLayout, {
    uSlimeSim: slimeSimUniformsBufferGPU,
    uColorization: colorizationUniformsBufferGPU,
    readFromThisTexture: gpuTextureForReadView,
    writeToThisTexture: gpuTextureForStorageView,
  });
  return { blurAgentsTrailPipeline, blurAgentsTrailBindGroup };
};

const createDrawAgentsRenderPipeline = (
  root: TgpuRoot,
  canvasFormat: GPUTextureFormat,
  slimeSimUniformsBufferGPU: TgpuBuffer<typeof SlimeSimUniformsStruct> & Uniform,
  colorizationUniformsBufferGPU: GPUBuffer,
  gpuTextureForReadView: GPUTextureView,
) => {
  const device = root.device;
  const drawAgentsWGSL = [commonUniformsWGSL, r1DrawAgentsWGSL].join('');
  const drawAgentsShaderModule = device.createShaderModule({
    label: 'draw agents: create shader module',
    code: drawAgentsWGSL,
  });
  const drawAgentsBindGroupLayout = tgpu.bindGroupLayout({
    uSlimeSim: { uniform: SlimeSimUniformsStruct },
    uColorization: { uniform: ColorizationUniformsStruct },
    readFromThisTexture: { texture: 'float', viewDimension: '2d' },
  }).$name('draw agents: create bind group layout');
  const drawAgentsRenderPipeline = device.createRenderPipeline({
    label: 'draw agents: create render pipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [root.unwrap(drawAgentsBindGroupLayout)],
    }),
    vertex: {
      entryPoint: 'vertexShader',
      module: drawAgentsShaderModule,
    },
    fragment: {
      entryPoint: 'fragmentShader',
      module: drawAgentsShaderModule,
      targets: [
        {
          format: canvasFormat,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });
  const drawAgentsBindGroup = root.createBindGroup(drawAgentsBindGroupLayout, {
    uSlimeSim: slimeSimUniformsBufferGPU,
    uColorization: colorizationUniformsBufferGPU,
    readFromThisTexture: gpuTextureForReadView,
  });
  return { drawAgentsRenderPipeline, drawAgentsBindGroup };
};

export {
  createUpdateAgentsComputePipeline,
  createFadeAgentsTrailComputePipeline,
  createBlurAgentsTrailComputePipeline,
  createDrawAgentsRenderPipeline,
};
