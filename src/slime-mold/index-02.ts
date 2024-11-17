import { Pane } from 'tweakpane';
import slimeMoldShader from './slimeMoldShader-02.wgsl?raw';

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

  const module = device.createShaderModule({
    label: 'doubling compute module',
    code: slimeMoldShader,
  });

  const pipeline = device.createComputePipeline({
    label: 'doubling compute pipeline',
    layout: 'auto',
    compute: {
      module,
    },
  });

  const input = new Float32Array([1, 3, 5]);

  // create a buffer on the GPU to hold our computation
  // input and output
  const workBuffer = device.createBuffer({
    label: 'work buffer',
    size: input.byteLength,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  });
  // Copy our input data to that buffer
  device.queue.writeBuffer(workBuffer, 0, input);

  // create a buffer on the GPU to get a copy of the results
  const resultBuffer = device.createBuffer({
    label: 'result buffer',
    size: input.byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  // Setup a bindGroup to tell the shader which
  // buffer to use for the computation
  const bindGroup = device.createBindGroup({
    label: 'bindGroup for work buffer',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: workBuffer,
        },
      },
    ],
  });

  // Encode commands to do the computation
  const encoder = device.createCommandEncoder({
    label: 'doubling encoder',
  });
  const pass = encoder.beginComputePass({
    label: 'doubling compute pass',
  });
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(input.length);
  pass.end();

  // Encode a command to copy the results to a mappable buffer.
  encoder.copyBufferToBuffer(workBuffer, 0, resultBuffer, 0, resultBuffer.size);

  // Finish encoding and submit the commands
  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);

  // Read the results
  await resultBuffer.mapAsync(GPUMapMode.READ);
  const result = new Float32Array(resultBuffer.getMappedRange().slice(0));
  resultBuffer.unmap();

  console.log('input', input);
  console.log('result', result);
};

export { main };
