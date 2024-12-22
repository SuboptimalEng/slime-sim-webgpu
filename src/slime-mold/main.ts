import { Pane } from 'tweakpane';
import commonUniformsWGSL from './shaders/commonUniforms.wgsl?raw';
import c1UpdateAgentsWGSL from './shaders/c1UpdateAgents.comp.wgsl?raw';
import c2FadeAgentsTrailWGSL from './shaders/c2FadeAgentsTrail.comp.wgsl?raw';
import c3BlurAgentsTrailWGSL from './shaders/c3BlurAgentsTrail.comp.wgsl?raw';
import r1DrawAgentsWGSL from './shaders/r1DrawAgents.render.wgsl?raw';
import { UNIFORMS_SLIME_SIM } from './uniforms';
import {
  initializeWebGPU,
  initializeCanvasSizeUniforms,
  initializeColorizationUniforms,
  initializeSlimeSimUniforms,
  initializeAgents,
} from './helpers';

// ===================================
// initialize tweak pane
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
  // create gpu storage texture that can be written to in compute shaders
  // ===================================
  const gpuTextureForStorage = device.createTexture({
    label: 'create texture A on gpu',
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
  const gpuTextureViewForStorage = gpuTextureForStorage.createView();

  // ===================================
  // Storage textures in WebGPU do not support read_write yet. This means
  // that we can write to storage texture in a compute pass, but we cannot
  // read from it in another compute pass. To get around this, we can create
  // a separate texture that copies the data from the storage texture after
  // every compute pass is complete. We can use this second texture to read
  // from in other compute passes.
  // ===================================
  const gpuTextureForRead = device.createTexture({
    label: 'create texture B on gpu',
    format: 'rgba8unorm',
    size: {
      width: canvas.width,
      height: canvas.height,
    },
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
  });
  const gpuTextureViewForRead = gpuTextureForRead.createView();

  // ===================================
  // set up agents buffer
  // ===================================
  const agentsBufferGPU = initializeAgents(
    device,
    canvas,
    initializedPane,
    gpuTextureForStorage,
  );

  // ===================================
  // set up tweakpane and uniforms
  // ===================================
  const slimeSimUniformsBufferGPU = initializeSlimeSimUniforms(
    device,
    canvas,
    initializedPane,
  );

  // ===================================
  // set up uniforms for canvasSize
  // ===================================
  // const canvasSizeUniformsBufferGPU = initializeCanvasSizeUniforms(
  //   device,
  //   canvas,
  // );

  // ===================================
  // set up uniforms for colorization
  // ===================================
  const colorizationUniformsBufferGPU = initializeColorizationUniforms(
    device,
    initializedPane,
  );

  // ===================================
  // create shader modules
  // ===================================
  const wgslShaderCode = [
    commonUniformsWGSL,
    c1UpdateAgentsWGSL,
    c2FadeAgentsTrailWGSL,
    c3BlurAgentsTrailWGSL,
    r1DrawAgentsWGSL,
  ].join('');
  const shaderModule = device.createShaderModule({
    label: 'create shader module',
    code: wgslShaderCode,
  });

  // ===================================
  // set up update agents compute pass
  // ===================================
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
    // layout: 'auto',
    layout: updateAgentsComputePipelineLayout,
    compute: {
      module: shaderModule,
      entryPoint: 'updateAgents',
    },
  });
  const updateAgentsComputeBindGroup = device.createBindGroup({
    label: 'update agents: create compute bind group',
    layout: updateAgentsComputeBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          label: 'uniforms buffer gpu resource',
          buffer: slimeSimUniformsBufferGPU,
        },
      },
      {
        binding: 1,
        resource: {
          label: 'agents buffer gpu resource',
          buffer: agentsBufferGPU,
        },
      },
      {
        binding: 2,
        resource: gpuTextureViewForRead,
      },
      {
        binding: 3,
        resource: gpuTextureViewForStorage,
      },
    ],
  });

  // ===================================
  // fade agents trail compute pass
  // ===================================
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
    // layout: 'auto',
    layout: fadeAgentsTrailComputePipelineLayout,
    compute: {
      entryPoint: 'fadeAgentsTrail',
      module: shaderModule,
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
        resource: gpuTextureViewForRead,
      },
      {
        binding: 2,
        resource: gpuTextureViewForStorage,
      },
    ],
  });

  // ===================================
  // blur agents trail compute pass
  // ===================================
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
      module: shaderModule,
    },
  });
  const blurAgentsTrailBindGroup = device.createBindGroup({
    label: 'blur agents trail: create bind group',
    layout: blurAgentsTrailComputeBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          // buffer: canvasSizeUniformsBufferGPU,
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
        resource: gpuTextureViewForRead,
      },
      {
        binding: 3,
        resource: gpuTextureViewForStorage,
      },
    ],
  });

  const renderBindGroupLayout = device.createBindGroupLayout({
    label: 'create render bind group layout',
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
  const renderPipeline = device.createRenderPipeline({
    label: 'create render pipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [renderBindGroupLayout],
    }),
    vertex: {
      module: shaderModule,
      entryPoint: 'vertexShader',
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fragmentShader',
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
  const renderBindGroup = device.createBindGroup({
    label: 'create render bind group',
    layout: renderBindGroupLayout,
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
        resource: gpuTextureViewForStorage,
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

    // copy fading trail to texture B once again
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

    // 4. render pass -> draw resulting texture to canvas
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
    });
    renderPass.setPipeline(renderPipeline);
    renderPass.setBindGroup(0, renderBindGroup);
    renderPass.draw(6);
    renderPass.end();

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
