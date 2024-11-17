import { Pane } from 'tweakpane';
import slimeMoldShader from './slimeMoldShader-04.wgsl?raw';

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

  const webGPUContext = canvas.getContext('webgpu');
  if (!webGPUContext) {
    throw new Error('Cannot recieve WebGPU context from canvas.');
  }
  webGPUContext.configure({
    device: device,
    format: format,
  });

  // prettier-ignore
  const agentData = new Float32Array([
    1.0, 1.0,  // Agent 1 position
    1.5, 1.5,  // Agent 1 velocity
    1.0, 1.0,  // Agent 2 position
    1.0, 1.0,  // Agent 2 velocity
  ]);

  // Vertex data for a simple square
  // prettier-ignore
  const squareVertexData = new Float32Array([
    -0.5,  -0.5, // bottom-left
     1.0,   0.0,   0.0,   1.0, // color
    -0.5,   0.5, // top-left
     0.0,   1.0,   0.0,   1.0, // color
     0.5,  -0.5, // bottom-right
     0.0,   0.0,   1.0,   1.0, // color

     0.5, -0.5, // bottom-right
     0.0,   0.0,   1.0,   1.0, // color
    -0.5,  0.5, // top-left
     0.0,   1.0,   0.0,   1.0, // color
     0.5,  0.5, // top-right
     1.0,   0.0,   1.0,   1.0, // color
  ]);

  // create a buffer for the square vertex data
  const squareVertexBuffer = device.createBuffer({
    size: squareVertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(squareVertexBuffer, 0, squareVertexData);

  // Shaders: Vertex and Fragment
  const shaderModule = device.createShaderModule({
    label: 'shader module',
    code: slimeMoldShader,
  });

  // Create the render pipeline
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: shaderModule,
      entryPoint: 'main_vertex',
      buffers: [
        {
          arrayStride: 2 * 4 + 4 * 4, // 2 floats per vertex (4 bytes each)
          attributes: [
            {
              shaderLocation: 0, // @location(0)
              offset: 0,
              format: 'float32x2', // 2 x float32 => vec2<f32>
            },
            {
              shaderLocation: 1, // @location(1)
              offset: 2 * 4,
              format: 'float32x4', // 4 x float32 => vec4<f32>
            },
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'main_fragment',
      targets: [
        {
          format: format,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  const commandEncoder = device.createCommandEncoder();
  const textureView = webGPUContext.getCurrentTexture().createView();

  const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  });
  renderPass.setPipeline(pipeline);
  renderPass.setVertexBuffer(0, squareVertexBuffer);
  renderPass.draw(6);
  renderPass.end();

  device.queue.submit([commandEncoder.finish()]);
};

export { main };
