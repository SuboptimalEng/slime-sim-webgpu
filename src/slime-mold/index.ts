import { Pane } from 'tweakpane';
import commonUniformsWGSL from './shaders/commonUniforms.wgsl?raw';
import slimeMoldShaderWGSL from './shaders/slimeMoldShader.wgsl?raw';
import c1UpdateAgentsWGSL from './shaders/c1_updateAgents.comp.wgsl?raw';
import c2FadeAgentsTrailWGSL from './shaders/c2_fadeAgentsTrail.comp.wgsl?raw';
import c3BlurAgentsTrailWGSL from './shaders/c3_blurAgentsTrail.comp.wgsl?raw';
import { UNIFORMS_COLORIZATION, UNIFORMS_SLIME_SIM } from './uniforms';

const createAndBindCanvasSizeUniforms = (
  device: GPUDevice,
  canvas: HTMLCanvasElement,
) => {
  const canvasUniformsCPU = new Uint32Array(4);
  const canvasUniformsBufferGPU = device.createBuffer({
    label: 'create uniforms buffer for gpu',
    size: canvasUniformsCPU.byteLength,
    usage:
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.UNIFORM,
  });
  canvasUniformsCPU[0] = canvas.width;
  canvasUniformsCPU[1] = canvas.height;
  // console.log(canvasUniformsCPU);
  device.queue.writeBuffer(canvasUniformsBufferGPU, 0, canvasUniformsCPU);
  return canvasUniformsBufferGPU;
};

const createAndBindAgentsUniforms = (
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  uniformsCPU: Float32Array,
  uniformsBufferGPU: GPUBuffer,
) => {
  // canvas
  uniformsCPU[0] = canvas.width;
  uniformsCPU[1] = canvas.height;

  // general
  uniformsCPU[2] = UNIFORMS_SLIME_SIM.radius.value;
  uniformsCPU[3] = UNIFORMS_SLIME_SIM.stepSize.value;
  uniformsCPU[4] = UNIFORMS_SLIME_SIM.decayT.value;

  // sensor
  uniformsCPU[5] = UNIFORMS_SLIME_SIM.sensorOffset.value;
  uniformsCPU[6] = UNIFORMS_SLIME_SIM.sensorAngle.value;
  uniformsCPU[7] = UNIFORMS_SLIME_SIM.rotationAngle.value;

  device.queue.writeBuffer(uniformsBufferGPU, 0, uniformsCPU);
  return uniformsBufferGPU;
};

const initializeUniforms = (
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  pane: Pane,
): GPUBuffer => {
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
  randomizeAgentSettingsButton.on('click', (e) => {
    console.log('randomize agent settings!!!');

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

  // const uniformsCPU = new Float32Array(8); // binding of size 8 is too small
  const uniformsCPU = new Float32Array(10);
  const uniformsBufferGPU = device.createBuffer({
    label: 'create uniforms buffer for gpu',
    size: uniformsCPU.byteLength,
    usage:
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.UNIFORM,
  });

  createAndBindAgentsUniforms(device, canvas, uniformsCPU, uniformsBufferGPU);
  pane.on('change', (e) => {
    // todo: uniformsCPU, and uniformsBufferGPU work if I place them before defining them. how?
    createAndBindAgentsUniforms(device, canvas, uniformsCPU, uniformsBufferGPU);
    console.log('pane change!!!');
  });

  return uniformsBufferGPU;
};

const createAndBindColorizationUniforms = (
  device: GPUDevice,
  colorizationUniformsCPU: Float32Array,
  colorizationUniformsBufferGPU: GPUBuffer,
) => {
  // todo: dive a little deeper into struct memory packing
  // todo: for some reason, this needs to be 4th value, can't be the 1st one?
  colorizationUniformsCPU[0] = UNIFORMS_COLORIZATION.blurTrail.value ? 1 : 0;
  colorizationUniformsCPU[1] = UNIFORMS_COLORIZATION.enableLighting.value
    ? 1
    : 0;

  const slimeColor = UNIFORMS_COLORIZATION.slimeColor.value;
  colorizationUniformsCPU[4] = slimeColor.r / 255;
  colorizationUniformsCPU[5] = slimeColor.g / 255;
  colorizationUniformsCPU[6] = slimeColor.b / 255;

  device.queue.writeBuffer(
    colorizationUniformsBufferGPU,
    0,
    colorizationUniformsCPU,
  );
};

const initializeColorizationUniforms = (device: GPUDevice, pane: Pane) => {
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
  // colorizationFolder.addBinding(COLOR_UNIFORMS.backgroundColor, 'value', {
  //   ...COLOR_UNIFORMS.backgroundColor,
  // });

  const colorizationUniformsCPU = new Float32Array(12);
  const colorizationUniformsBufferGPU = device.createBuffer({
    label: 'colorization uniforms buffer',
    size: colorizationUniformsCPU.byteLength,
    usage:
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.UNIFORM,
  });

  createAndBindColorizationUniforms(
    device,
    colorizationUniformsCPU,
    colorizationUniformsBufferGPU,
  );
  colorizationFolder.on('change', (e) => {
    createAndBindColorizationUniforms(
      device,
      colorizationUniformsCPU,
      colorizationUniformsBufferGPU,
    );
  });

  return colorizationUniformsBufferGPU;
};

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
  console.log(canvas.width, canvas.height);

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

const initializeGPUTexture = (
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  gpuTexture: GPUTexture,
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
      texture: gpuTexture,
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

const initializeAgentsBuffer = (
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

const initializeAgents = (
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  pane: Pane,
  gpuTexture: GPUTexture,
) => {
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

  // todo: Currently, bind groups don't change variables so we initialize agentsBufferGPU
  // to be max size so that numOfAgents slider works as expected. More correct approach
  // could be to re-create bindgroups with agentsBufferGPU whenever it changes.
  // this will not incur performance hit because compute pass runs with SLIME_MOLD_UNIFORMS.numOfAgents
  // even if this gpu array is large, we won't use it for most calculations when numOfAgents is small
  // const maxAgentsArraySize = SLIME_MOLD_UNIFORMS.numOfAgents.max * 2;
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

  initializeGPUTexture(device, canvas, gpuTexture);
  initializeAgentsBuffer(device, canvas, agentsBufferGPU);

  simulationFolder.on('change', (e) => {
    initializeGPUTexture(device, canvas, gpuTexture);
    initializeAgentsBuffer(device, canvas, agentsBufferGPU);
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

// ===================================
// initialize tweak pane
// ===================================
let initializedPane: Pane = new Pane();
let rafId: number = 0;

const main = async () => {
  const { canvas, device, canvasFormat, context } = await initializeWebGPU();

  // ===================================
  // create gpu storage texture that can be written to in compute shaders
  // ===================================
  const gpuTextureForStorage = device.createTexture({
    label: 'create texture A on gpu',
    format: 'rgba8unorm',
    // format: canvasFormat,
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
    // format: canvasFormat,
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
  const uniformsBufferGPU = initializeUniforms(device, canvas, initializedPane);

  // ===================================
  // set up uniforms for colorization
  // ===================================
  const colorizationUniformsBufferGPU = initializeColorizationUniforms(
    device,
    initializedPane,
  );

  // ===================================
  // set up uniforms for canvasSize
  // ===================================
  const canvasSizeBufferGPU = createAndBindCanvasSizeUniforms(device, canvas);

  // ===================================
  // create shader modules
  // ===================================
  const wgslShaderCode = [
    commonUniformsWGSL,
    c1UpdateAgentsWGSL,
    c2FadeAgentsTrailWGSL,
    c3BlurAgentsTrailWGSL,
    slimeMoldShaderWGSL,
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
          buffer: uniformsBufferGPU,
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
          buffer: uniformsBufferGPU,
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
          buffer: canvasSizeBufferGPU,
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
          buffer: uniformsBufferGPU,
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
