import commonUniformsWGSL from './shaders/commonUniforms.wgsl?raw';
import c1UpdateAgentsWGSL from './shaders/c1UpdateAgents.comp.wgsl?raw';
import c2FadeAgentsTrailWGSL from './shaders/c2FadeAgentsTrail.comp.wgsl?raw';
import c3BlurAgentsTrailWGSL from './shaders/c3BlurAgentsTrail.comp.wgsl?raw';
import r1DrawAgentsWGSL from './shaders/r1DrawAgents.render.wgsl?raw';

const createUpdateAgentsComputePipeline = (
  device: GPUDevice,
  slimeSimUniformsBufferGPU: GPUBuffer,
  agentsBufferGPU: GPUBuffer,
  gpuTextureForReadView: GPUTextureView,
  gpuTextureForStorageView: GPUTextureView,
) => {
  const updateAgentsWGSL = [commonUniformsWGSL, c1UpdateAgentsWGSL].join('');
  const updateAgentsShaderModule = device.createShaderModule({
    label: 'update agents: create shader module',
    code: updateAgentsWGSL,
  });
  const updateAgentsComputeBindGroupLayout = device.createBindGroupLayout({
    label: 'update agents: create compute bind group layout',
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'uniform',
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'storage',
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        texture: {
          viewDimension: '2d',
        },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: {
          format: 'rgba8unorm',
          access: 'write-only',
          viewDimension: '2d',
        },
      },
    ],
  });
  const updateAgentsComputePipelineLayout = device.createPipelineLayout({
    label: 'update agents: create compute pipeline layout',
    bindGroupLayouts: [updateAgentsComputeBindGroupLayout],
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
  const updateAgentsComputeBindGroup = device.createBindGroup({
    label: 'update agents: create compute bind group',
    layout: updateAgentsComputeBindGroupLayout,
    // layout: updateAgentsComputePipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: slimeSimUniformsBufferGPU,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: agentsBufferGPU,
        },
      },
      {
        binding: 2,
        resource: gpuTextureForReadView,
      },
      {
        binding: 3,
        resource: gpuTextureForStorageView,
      },
    ],
  });
  return { updateAgentsComputePipeline, updateAgentsComputeBindGroup };
};

const createFadeAgentsTrailComputePipeline = (
  device: GPUDevice,
  slimeSimUniformsBufferGPU: GPUBuffer,
  gpuTextureForReadView: GPUTextureView,
  gpuTextureForStorageView: GPUTextureView,
) => {
  const fadeAgentsTrailWGSL = [commonUniformsWGSL, c2FadeAgentsTrailWGSL].join(
    '',
  );
  const fadeAgentsTrailShaderModule = device.createShaderModule({
    label: 'fade agents trail: create shader module',
    code: fadeAgentsTrailWGSL,
  });
  const fadeAgentsTrailComputeBindGroupLayout = device.createBindGroupLayout({
    label: 'fade agents trail: create bind group layout',
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'uniform',
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        texture: {
          viewDimension: '2d',
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: {
          format: 'rgba8unorm',
          access: 'write-only',
          viewDimension: '2d',
        },
      },
    ],
  });
  const fadeAgentsTrailComputePipelineLayout = device.createPipelineLayout({
    label: 'fade agents trail: create compute pipeline layout',
    bindGroupLayouts: [fadeAgentsTrailComputeBindGroupLayout],
  });
  const fadeAgentsTrailComputePipeline = device.createComputePipeline({
    label: 'fade agents trail: create compute pipeline',
    layout: fadeAgentsTrailComputePipelineLayout,
    compute: {
      entryPoint: 'fadeAgentsTrail',
      module: fadeAgentsTrailShaderModule,
    },
  });
  const fadeAgentsTrailBindGroup = device.createBindGroup({
    label: 'fade agents trail: create bind group',
    // layout: fadeAgentsTrailComputePipeline.getBindGroupLayout(0),
    layout: fadeAgentsTrailComputeBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: slimeSimUniformsBufferGPU,
        },
      },
      {
        binding: 1,
        resource: gpuTextureForReadView,
      },
      {
        binding: 2,
        resource: gpuTextureForStorageView,
      },
    ],
  });

  return { fadeAgentsTrailComputePipeline, fadeAgentsTrailBindGroup };
};

const createBlurAgentsTrailComputePipeline = (
  device: GPUDevice,
  slimeSimUniformsBufferGPU: GPUBuffer,
  colorizationUniformsBufferGPU: GPUBuffer,
  gpuTextureForReadView: GPUTextureView,
  gpuTextureForStorageView: GPUTextureView,
) => {
  // prettier-ignore
  const blurAgentsTrailWGSL = [commonUniformsWGSL, c3BlurAgentsTrailWGSL].join('');
  const blurAgentsTrailShaderModule = device.createShaderModule({
    label: 'blur agents trail: create shader module',
    code: blurAgentsTrailWGSL,
  });
  const blurAgentsTrailComputeBindGroupLayout = device.createBindGroupLayout({
    label: 'blur agents trail: create bindgroup layout',
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'uniform',
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'uniform',
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        texture: {
          viewDimension: '2d',
        },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: {
          format: 'rgba8unorm',
          access: 'write-only',
          viewDimension: '2d',
        },
      },
    ],
  });
  const blurAgentsTrailPipelineLayout = device.createPipelineLayout({
    label: 'blur agents trail: create pipeline layout',
    bindGroupLayouts: [blurAgentsTrailComputeBindGroupLayout],
  });
  const blurAgentsTrailPipeline = device.createComputePipeline({
    label: 'blur agents trail: create compute pipeline',
    layout: blurAgentsTrailPipelineLayout,
    compute: {
      entryPoint: 'blurAgentsTrail',
      module: blurAgentsTrailShaderModule,
    },
  });
  const blurAgentsTrailBindGroup = device.createBindGroup({
    label: 'blur agents trail: create bind group',
    layout: blurAgentsTrailComputeBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: slimeSimUniformsBufferGPU,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: colorizationUniformsBufferGPU,
        },
      },
      {
        binding: 2,
        resource: gpuTextureForReadView,
      },
      {
        binding: 3,
        resource: gpuTextureForStorageView,
      },
    ],
  });
  return { blurAgentsTrailPipeline, blurAgentsTrailBindGroup };
};

const createDrawAgentsRenderPipeline = (
  device: GPUDevice,
  canvasFormat: GPUTextureFormat,
  slimeSimUniformsBufferGPU: GPUBuffer,
  colorizationUniformsBufferGPU: GPUBuffer,
  gpuTextureForReadView: GPUTextureView,
) => {
  const drawAgentsWGSL = [commonUniformsWGSL, r1DrawAgentsWGSL].join('');
  const drawAgentsShaderModule = device.createShaderModule({
    label: 'draw agents: create shader module',
    code: drawAgentsWGSL,
  });
  const drawAgentsBindGroupLayout = device.createBindGroupLayout({
    label: 'draw agents: create bind group layout',
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: 'uniform',
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: 'uniform',
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: 'float',
        },
      },
    ],
  });
  const drawAgentsRenderPipeline = device.createRenderPipeline({
    label: 'draw agents: create render pipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [drawAgentsBindGroupLayout],
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
  const drawAgentsBindGroup = device.createBindGroup({
    label: 'draw agents: create bind group',
    layout: drawAgentsBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: slimeSimUniformsBufferGPU,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: colorizationUniformsBufferGPU,
        },
      },
      {
        binding: 2,
        resource: gpuTextureForReadView,
      },
    ],
  });
  return { drawAgentsRenderPipeline, drawAgentsBindGroup };
};

export {
  createUpdateAgentsComputePipeline,
  createFadeAgentsTrailComputePipeline,
  createBlurAgentsTrailComputePipeline,
  createDrawAgentsRenderPipeline,
};
