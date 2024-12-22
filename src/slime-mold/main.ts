import { Pane } from 'tweakpane';
import commonUniformsWGSL from './shaders/commonUniforms.wgsl?raw';
import c3BlurAgentsTrailWGSL from './shaders/c3BlurAgentsTrail.comp.wgsl?raw';
import r1DrawAgentsWGSL from './shaders/r1DrawAgents.render.wgsl?raw';
import { UNIFORMS_SLIME_SIM } from './uniforms';
import {
  initializeWebGPU,
  initializeGPUTextures,
  initializeAgents,
  initializeColorizationUniforms,
  initializeSlimeSimUniforms,
} from './initializeFns';
import {
  createUpdateAgentsComputePipeline,
  createFadeAgentsTrailComputePipeline,
  createBlurAgentsTrailComputePipeline,
} from './createPipelineFns';

// =============================================================
// Initialize tweak pane.
// =============================================================
let initializedPane: Pane = new Pane();
let rafId: number = 0;

const main = async () => {
  // =============================================================
  // canvas -> ref to canvas, mainly used width/height info
  // device -> everything related to webgpu done from device
  // canvasFormat -> needed for render pipeline fragment shader settings
  // context -> needed for render pass
  // =============================================================
  const { canvas, device, canvasFormat, context } = await initializeWebGPU();

  // =============================================================
  // Initialize gpu storage texture that can be written to in compute shaders.
  //
  // Storage textures in WebGPU do not support read_write yet. This means
  // that we can write to storage texture in a compute pass, but we cannot
  // read from it in another compute pass. To get around this, we can create
  // a separate texture that copies the data from the storage texture after
  // every compute pass is complete. We can use this second texture to read
  // from in other compute passes.
  // =============================================================
  const { gpuTextureForStorage, gpuTextureForRead } = initializeGPUTextures(
    device,
    canvas,
  );
  const gpuTextureForStorageView = gpuTextureForStorage.createView();
  const gpuTextureForReadView = gpuTextureForRead.createView();

  // =============================================================
  // Initialize the agents buffer.
  // =============================================================
  const agentsBufferGPU = initializeAgents(
    device,
    canvas,
    initializedPane,
    gpuTextureForStorage,
    gpuTextureForRead,
  );

  // =============================================================
  // Initialize slime sim uniforms and tweakpane.
  // =============================================================
  const slimeSimUniformsBufferGPU = initializeSlimeSimUniforms(
    device,
    canvas,
    initializedPane,
  );

  // =============================================================
  // Initialize colorization uniforms and tweakpane.
  // =============================================================
  const colorizationUniformsBufferGPU = initializeColorizationUniforms(
    device,
    initializedPane,
  );

  // =============================================================
  // Create updateAgents compute pipeline.
  //
  // This pass updates the position + direction of each agent.
  // It also draws the result onto a storage texture.
  // =============================================================
  const { updateAgentsComputePipeline, updateAgentsComputeBindGroup } =
    createUpdateAgentsComputePipeline(
      device,
      slimeSimUniformsBufferGPU,
      agentsBufferGPU,
      gpuTextureForReadView,
      gpuTextureForStorageView,
    );

  // =============================================================
  // Create fadeAgentsTrail compute pipeline.
  // =============================================================
  const { fadeAgentsTrailComputePipeline, fadeAgentsTrailBindGroup } =
    createFadeAgentsTrailComputePipeline(
      device,
      slimeSimUniformsBufferGPU,
      gpuTextureForReadView,
      gpuTextureForStorageView,
    );

  // =============================================================
  // Create blurAgentsTrail compute pipeline.
  // =============================================================
  const { blurAgentsTrailPipeline, blurAgentsTrailBindGroup } =
    createBlurAgentsTrailComputePipeline(
      device,
      slimeSimUniformsBufferGPU,
      colorizationUniformsBufferGPU,
      gpuTextureForReadView,
      gpuTextureForStorageView,
    );

  // =============================================================
  // Draw agents render pass.
  // =============================================================
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
  // Remove initializedPane when refreshing the page.
  initializedPane.dispose();
  cancelAnimationFrame(rafId);
};

export { main, cleanUp };
