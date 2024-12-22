import { Pane } from 'tweakpane';
import commonUniformsWGSL from './shaders/commonUniforms.wgsl?raw';
import c1UpdateAgentsWGSL from './shaders/c1UpdateAgents.comp.wgsl?raw';
import c2FadeAgentsTrailWGSL from './shaders/c2FadeAgentsTrail.comp.wgsl?raw';
import c3BlurAgentsTrailWGSL from './shaders/c3BlurAgentsTrail.comp.wgsl?raw';
import r1DrawAgentsWGSL from './shaders/r1DrawAgents.render.wgsl?raw';
import { UNIFORMS_SLIME_SIM } from './uniforms';
import {
  initializeWebGPU,
  initializeGPUTextures,
  initializeAgents,
  initializeColorizationUniforms,
  initializeSlimeSimUniforms,
} from './initializeFunctions';

// ===================================
// Initialize tweak pane.
// ===================================
let initializedPane: Pane = new Pane();
let rafId: number = 0;

const main = async () => {
  // ===================================
  // canvas -> ref to canvas, mainly used width/height info
  // device -> everything related to webgpu done from device
  // canvasFormat -> needed for render pipeline fragment shader settings
  // context -> needed for render pass
  // ===================================
  const { canvas, device, canvasFormat, context } = await initializeWebGPU();

  // ===================================
  // Create gpu storage texture that can be written to in compute shaders.
  //
  // Storage textures in WebGPU do not support read_write yet. This means
  // that we can write to storage texture in a compute pass, but we cannot
  // read from it in another compute pass. To get around this, we can create
  // a separate texture that copies the data from the storage texture after
  // every compute pass is complete. We can use this second texture to read
  // from in other compute passes.
  // ===================================
  const { gpuTextureForStorage, gpuTextureForRead } = initializeGPUTextures(
    device,
    canvas,
  );
  const gpuTextureForStorageView = gpuTextureForStorage.createView();
  const gpuTextureForReadView = gpuTextureForRead.createView();

  // ===================================
  // Set up the agents buffer.
  // ===================================
  const agentsBufferGPU = initializeAgents(
    device,
    canvas,
    initializedPane,
    gpuTextureForStorage,
    gpuTextureForRead,
  );

  // ===================================
  // Set up slime sim uniforms and tweakpane.
  // ===================================
  const slimeSimUniformsBufferGPU = initializeSlimeSimUniforms(
    device,
    canvas,
    initializedPane,
  );

  // ===================================
  // Set up colorization uniforms and tweakpane.
  // ===================================
  const colorizationUniformsBufferGPU = initializeColorizationUniforms(
    device,
    initializedPane,
  );

  // ===================================
  // Set up the updateAgents compute pass.
  //
  // This pass updates the position + direction of each agent.
  // It also draws the result onto a texture.
  // ===================================
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
    compute: {
      entryPoint: 'updateAgents',
      module: updateAgentsShaderModule,
    },
  });
  const updateAgentsComputeBindGroup = device.createBindGroup({
    label: 'update agents: create compute bind group',
    layout: updateAgentsComputeBindGroupLayout,
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

  // ===================================
  // Set up fadeAgentsTrail compute pass.
  // ===================================
  // prettier-ignore
  const fadeAgentsTrailWGSL = [commonUniformsWGSL, c2FadeAgentsTrailWGSL].join('');
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

  // ===================================
  // Blur agents trail compute pass.
  // ===================================
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

  // ===================================
  // Draw agents render pass.
  // ===================================
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
        resource: gpuTextureForStorageView,
      },
    ],
  });

  const render = () => {
    const encoder = device.createCommandEncoder();

    // 1. compute pass -> update agents position and direction
    const updateAgentsComputePass = encoder.beginComputePass({
      label: 'update agents compute pass',
    });
    updateAgentsComputePass.setPipeline(updateAgentsComputePipeline);
    updateAgentsComputePass.setBindGroup(0, updateAgentsComputeBindGroup);
    updateAgentsComputePass.dispatchWorkgroups(
      UNIFORMS_SLIME_SIM.numOfAgents.value,
    );
    updateAgentsComputePass.end();

    // gpu storage textures do no support read + write, so we need to copy
    // storage texture data to read texture such that the data can be read
    // in the next one
    encoder.copyTextureToTexture(
      { texture: gpuTextureForStorage }, // Source
      { texture: gpuTextureForRead }, // Destination
      [canvas.width, canvas.height, 1], // Size (width, height, depthOrArrayLayers)
    );

    // 2. compute pass -> fade agents trail
    const fadeAgentsTrailComputePass = encoder.beginComputePass({
      label: 'fade agents trail: compute pass',
    });
    fadeAgentsTrailComputePass.setPipeline(fadeAgentsTrailComputePipeline);
    fadeAgentsTrailComputePass.setBindGroup(0, fadeAgentsTrailBindGroup);
    fadeAgentsTrailComputePass.dispatchWorkgroups(canvas.width, canvas.height);
    fadeAgentsTrailComputePass.end();

    // copy fading trail from storage -> read texture
    encoder.copyTextureToTexture(
      { texture: gpuTextureForStorage }, // Source
      { texture: gpuTextureForRead }, // Destination
      [canvas.width, canvas.height, 1], // Size (width, height, depthOrArrayLayers)
    );

    // 3. compute pass -> blur texture
    const blurAgentsTrailComputePass = encoder.beginComputePass({
      label: 'blur agents trail: compute pass',
    });
    blurAgentsTrailComputePass.setPipeline(blurAgentsTrailPipeline);
    blurAgentsTrailComputePass.setBindGroup(0, blurAgentsTrailBindGroup);
    blurAgentsTrailComputePass.dispatchWorkgroups(
      canvas.width / 8,
      canvas.height / 8,
    );
    blurAgentsTrailComputePass.end();

    // copy blur trail to texture B once again
    encoder.copyTextureToTexture(
      { texture: gpuTextureForStorage }, // Source
      { texture: gpuTextureForRead }, // Destination
      [canvas.width, canvas.height, 1], // Size (width, height, depthOrArrayLayers)
    );

    // 4. render pass -> draw agents on canvas
    const drawAgentsRenderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
    });
    drawAgentsRenderPass.setPipeline(drawAgentsRenderPipeline);
    drawAgentsRenderPass.setBindGroup(0, drawAgentsBindGroup);
    drawAgentsRenderPass.draw(6);
    drawAgentsRenderPass.end();

    device.queue.submit([encoder.finish()]);

    rafId = requestAnimationFrame(render);
  };
  render();
};

const cleanUp = () => {
  // remove Pane when refreshing the page.
  initializedPane.dispose();
  cancelAnimationFrame(rafId);
};

export { main, cleanUp };
