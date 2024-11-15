import { Pane } from 'tweakpane';

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

  // Vertex data for a simple triangle
  // prettier-ignore
  const vertexData = new Float32Array([
      0.0,  0.5, // Top vertex
      -0.5, -0.5, // Bottom-left vertex
      0.5, -0.5  // Bottom-right vertex
  ]);

  // Create a buffer for the vertex data
  const vertexBuffer = device.createBuffer({
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertexData);

  // Shaders: Vertex and Fragment
  const shaderModule = device.createShaderModule({
    code: `
        @vertex
        fn main_vertex(@location(0) position: vec2<f32>) -> @builtin(position) vec4<f32> {
            return vec4(position, 0.0, 1.0);
        }

        @fragment
        fn main_fragment() -> @location(0) vec4<f32> {
            return vec4(1.0, 0.0, 0.0, 1.0); // Red color
        }
        `,
  });

  // Create the render pipeline
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: shaderModule,
      entryPoint: 'main_vertex',
      buffers: [
        {
          arrayStride: 2 * 4, // 2 floats per vertex (4 bytes each)
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: 'float32x2',
            },
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'main_fragment',
      targets: [{ format: format }],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  // Create a render pass and draw the triangle
  function render() {
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
    renderPass.setVertexBuffer(0, vertexBuffer);
    renderPass.draw(3); // Draw 3 vertices (triangle)
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);
  }

  render();
};

export { main };
