import { Pane } from 'tweakpane';
import slimeMoldShader from './slimeMoldShader-03.wgsl?raw';

const testTweakPane = () => {
  const pane = new Pane();
  const PARAMS = { speed: 5, position: 0 };
  pane.addBinding(PARAMS, 'speed', { min: 0, max: 10, step: 0.5 });
  pane.addBinding(PARAMS, 'position', { min: 0, max: 100, step: 10 });
  pane.on('change', (e) => {
    console.log(e);
    console.log(PARAMS);
  });
};

const main = async () => {
  // testTweakPane();
  // console.log('hello world');

  const canvas = document.querySelector('canvas');
  if (!canvas) {
    throw new Error('No canvas detected in the browser.');
  }

  const webGPUContext = canvas.getContext('webgpu');
  if (!webGPUContext) {
    throw new Error('Cannot recieve WebGPU context from canvas.');
  }

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
  const format = navigator.gpu.getPreferredCanvasFormat();

  console.log(navigator);
  console.log(adapter);
  console.log(device);

  webGPUContext.configure({
    device: device,
    format: format,
    // format: 'rgba8unorm',
    // alphaMode: 'premultiplied',
  });

  // prettier-ignore
  const agentData = new Float32Array([
    1.0, 1.0,  // Agent 1 position
    1.5, 1.5,  // Agent 1 velocity
    1.0, 1.0,  // Agent 2 position
    1.0, 1.0,  // Agent 2 velocity
  ]);

  console.log('Initial agentData:', agentData); // Log initial data

  // Create the agent buffer (input data)
  const agentBuffer = device.createBuffer({
    label: 'work buffer',
    size: agentData.byteLength,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC,
  });

  device.queue.writeBuffer(agentBuffer, 0, agentData);

  // Create the read buffer (output data)
  const readBuffer = device.createBuffer({
    label: 'read buffer',
    size: agentData.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    // usage:
    //   GPUBufferUsage.STORAGE |
    //   GPUBufferUsage.COPY_SRC |
    //   GPUBufferUsage.MAP_READ,
  });

  // Bind group layout setup (corrected)
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'storage',
        },
      },
    ],
  });

  // Create the bind group
  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: agentBuffer,
        },
      },
    ],
  });

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  const shaderModule = device.createShaderModule({
    label: 'slime mold shader module',
    code: slimeMoldShader,
  });

  // Compute pipeline setup
  const computePipeline = device.createComputePipeline({
    layout: pipelineLayout,
    compute: {
      module: shaderModule,
      entryPoint: 'main',
    },
  });

  // Dispatch compute pass
  const commandEncoder = device.createCommandEncoder();
  const computePass = commandEncoder.beginComputePass();
  computePass.setPipeline(computePipeline);
  computePass.setBindGroup(0, bindGroup);
  computePass.dispatchWorkgroups(agentData.length / 2); // One workgroup per agent
  computePass.end();

  commandEncoder.copyBufferToBuffer(
    agentBuffer, // Source buffer
    0, // Source offset
    readBuffer, // Destination buffer
    0, // Destination offset
    agentBuffer.size, // Number of bytes to copy
  );

  // Submit the command
  device.queue.submit([commandEncoder.finish()]);

  // Log the updated data to the console
  console.log('Updated agentData:');

  await readBuffer.mapAsync(GPUMapMode.READ); // Wait for the mapping to complete

  const mappedRange = readBuffer.getMappedRange(); // Get the mapped range
  const resultData = new Float32Array(mappedRange); // Convert it to a typed array

  console.log('Result Data:', resultData);

  readBuffer.unmap(); // Unmap after reading
};

export { main };
