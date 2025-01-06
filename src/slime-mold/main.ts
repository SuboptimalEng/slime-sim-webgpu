import { Pane } from 'tweakpane';
import type { TgpuRoot } from 'typegpu';
import { UNIFORMS_SLIME_SIM } from './uniforms';
import {
  initializeWebGPU,
  initializeGPUTextures,
  initializeAgents,
  initializeColorizationUniforms,
  initializeSlimeSimUniforms,
} from './initialize-fns';
import {
  createUpdateAgentsComputePipeline,
  createFadeAgentsTrailComputePipeline,
  createBlurAgentsTrailComputePipeline,
  createDrawAgentsRenderPipeline,
} from './create-pipeline-fns';

// =============================================================
// These global variables are requied for the cleanUp fn.
// =============================================================
let initializedPane: Pane = new Pane();
let rafId: number = 0;

const main = async () => {
  let canvasWidth = 800;
  let canvasHeight = 600;
  // canvasWidth = 800;
  // canvasHeight = 800;
  // canvasWidth = 1600;
  // canvasHeight = 900;
  // canvasWidth *= 0.75;
  // canvasHeight *= 0.75;

  // =============================================================
  // canvas -> ref to canvas, mainly used width/height info
  // device -> everything related to webgpu requires the device
  // canvasFormat -> needed for render pipeline fragment shader settings
  // context -> needed to create a view in the render pass
  // =============================================================
  let root: TgpuRoot | null = null;
  let device: GPUDevice | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let canvasFormat: GPUTextureFormat | null = null;
  let context: GPUCanvasContext | null = null;
  try {
    const result = await initializeWebGPU(canvasWidth, canvasHeight);
    root = result.root;
    device = result.root.device;
    canvas = result.canvas;
    canvasFormat = result.canvasFormat;
    context = result.context;
  } catch (e: any) {
    throw e;
  }

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
  const {
    gpuTextureForStorage,
    gpuTextureForStorageView,
    gpuTextureForRead,
    gpuTextureForReadView,
  } = initializeGPUTextures(device, canvas);

  // =============================================================
  // Initialize the agents buffer.
  // =============================================================
  const agentsBufferGPU = initializeAgents(
    root,
    canvas,
    initializedPane,
    gpuTextureForStorage,
    gpuTextureForRead,
  );

  // =============================================================
  // Initialize slime sim uniforms and tweakpane.
  // =============================================================
  const slimeSimUniformsBufferGPU = initializeSlimeSimUniforms(
    root,
    canvas,
    initializedPane,
  );

  // =============================================================
  // Initialize colorization uniforms and tweakpane.
  // =============================================================
  const colorizationUniformsBufferGPU = initializeColorizationUniforms(
    root,
    initializedPane,
  );

  // =============================================================
  // 1. Create updateAgents compute pipeline.
  //
  // This pass updates the position + direction of each agent.
  // It also draws the result onto a storage texture.
  // =============================================================
  const { updateAgentsComputePipeline, updateAgentsComputeBindGroup } =
    createUpdateAgentsComputePipeline(
      root,
      slimeSimUniformsBufferGPU,
      agentsBufferGPU,
      gpuTextureForReadView,
      gpuTextureForStorageView,
    );

  // =============================================================
  // 2. Create fadeAgentsTrail compute pipeline.
  // =============================================================
  const { fadeAgentsTrailComputePipeline, fadeAgentsTrailBindGroup } =
    createFadeAgentsTrailComputePipeline(
      root,
      slimeSimUniformsBufferGPU,
      gpuTextureForReadView,
      gpuTextureForStorageView,
    );

  // =============================================================
  // 3. Create blurAgentsTrail compute pipeline.
  // =============================================================
  const { blurAgentsTrailPipeline, blurAgentsTrailBindGroup } =
    createBlurAgentsTrailComputePipeline(
      root,
      slimeSimUniformsBufferGPU,
      colorizationUniformsBufferGPU,
      gpuTextureForReadView,
      gpuTextureForStorageView,
    );

  // =============================================================
  // 4. Create drawAgents render pass.
  // =============================================================
  const { drawAgentsRenderPipeline, drawAgentsBindGroup } =
    createDrawAgentsRenderPipeline(
      root,
      canvasFormat,
      slimeSimUniformsBufferGPU,
      colorizationUniformsBufferGPU,
      // todo: Which one is it? Storage or read? Both seem to work.
      // I'll stick with read view since that's what it's defined to
      // be in pipeline and WGSL shader.
      gpuTextureForReadView,
      // gpuTextureForStorageView,
    );

  // =============================================================
  // Define the render loop.
  // =============================================================
  const render = () => {
    const encoder = device.createCommandEncoder();

    // =============================================================
    // 1. Run the updateAgents compute pass.
    // =============================================================
    const updateAgentsComputePass = encoder.beginComputePass({
      label: 'update agents: begin compute pass',
    });
    updateAgentsComputePass.setPipeline(updateAgentsComputePipeline);
    updateAgentsComputePass.setBindGroup(0, root.unwrap(updateAgentsComputeBindGroup));
    updateAgentsComputePass.dispatchWorkgroups(
      UNIFORMS_SLIME_SIM.numOfAgents.value,
    );
    updateAgentsComputePass.end();

    // =============================================================
    // GPU storage textures do no support read + write (yet), so we need to
    // copy the storage texture data into a read texture so that it can be
    // accessed in the next pass (from the read texture).
    //
    // Copy agent positions from storage -> read texture.
    // =============================================================
    encoder.copyTextureToTexture(
      { texture: gpuTextureForStorage }, // Source
      { texture: gpuTextureForRead }, // Destination
      [canvas.width, canvas.height, 1], // Size (width, height, depthOrArrayLayers)
    );

    // =============================================================
    // 2. Run the fadeAgentsTrail compute pass.
    // =============================================================
    const fadeAgentsTrailComputePass = encoder.beginComputePass({
      label: 'fade agents trail: begin compute pass',
    });
    fadeAgentsTrailComputePass.setPipeline(fadeAgentsTrailComputePipeline);
    fadeAgentsTrailComputePass.setBindGroup(0, root.unwrap(fadeAgentsTrailBindGroup));
    fadeAgentsTrailComputePass.dispatchWorkgroups(canvas.width, canvas.height);
    fadeAgentsTrailComputePass.end();

    // =============================================================
    // Copy fading trail from storage -> read texture.
    // =============================================================
    encoder.copyTextureToTexture(
      { texture: gpuTextureForStorage }, // Source
      { texture: gpuTextureForRead }, // Destination
      [canvas.width, canvas.height, 1], // Size (width, height, depthOrArrayLayers)
    );

    // =============================================================
    // 3. Run the blurAgentsTrail compute pass.
    // =============================================================
    const blurAgentsTrailComputePass = encoder.beginComputePass({
      label: 'blur agents trail: begin compute pass',
    });
    blurAgentsTrailComputePass.setPipeline(blurAgentsTrailPipeline);
    blurAgentsTrailComputePass.setBindGroup(0, root.unwrap(blurAgentsTrailBindGroup));
    blurAgentsTrailComputePass.dispatchWorkgroups(
      // This means we need to create 8x8 workgroups in compute shader.
      canvas.width / 8,
      canvas.height / 8,
    );
    blurAgentsTrailComputePass.end();

    // =============================================================
    // Copy blur agents trail from storage -> read texture.
    // =============================================================
    encoder.copyTextureToTexture(
      { texture: gpuTextureForStorage }, // Source
      { texture: gpuTextureForRead }, // Destination
      [canvas.width, canvas.height, 1], // Size (width, height, depthOrArrayLayers)
    );

    // =============================================================
    // 4. Run the drawAgents (to canvas) render pass.
    // =============================================================
    const drawAgentsRenderPass = encoder.beginRenderPass({
      label: 'draw agents: begin render pass',
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
    drawAgentsRenderPass.setBindGroup(0, root.unwrap(drawAgentsBindGroup));
    drawAgentsRenderPass.draw(6);
    drawAgentsRenderPass.end();

    // =============================================================
    // Final step.
    // =============================================================
    device.queue.submit([encoder.finish()]);

    // =============================================================
    // Keep track of rafId for the cleanUp fn.
    // =============================================================
    rafId = requestAnimationFrame(render);
  };

  // =============================================================
  // Run the render loop.
  // =============================================================
  render();
};

const cleanUp = () => {
  initializedPane.dispose();
  cancelAnimationFrame(rafId);
};

export { main, cleanUp };
