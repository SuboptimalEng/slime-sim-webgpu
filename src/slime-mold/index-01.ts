import { Pane } from 'tweakpane';

import slimeMoldShader from './slimeMoldShader-01.wgsl?raw';

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
  const triangleVertexData = new Float32Array([
      0.0,  0.5, // Top vertex
      -0.5, -0.5, // Bottom-left vertex
      0.5, -0.5,  // Bottom-right vertex
  ]);

  // Vertex data for a simple square
  // prettier-ignore
  const squareVertexData = new Float32Array([
      -0.5,  -0.5, // bottom-left
      -0.5, 0.5, // top-left
      0.5, -0.5, // bottom-right

      0.5, -0.5, // bottom-right
      -0.5, 0.5, // top-left
      0.5, 0.5, // top-right
  ]);

  // Create a buffer for the triangle vertex data
  const triangleVertexBuffer = device.createBuffer({
    size: triangleVertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(triangleVertexBuffer, 0, triangleVertexData);

  // create a buffer for the square vertex data
  const squareVertexBuffer = device.createBuffer({
    size: squareVertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(squareVertexBuffer, 0, squareVertexData);

  // Shaders: Vertex and Fragment
  const shaderModule = device.createShaderModule({
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

  let renderTriangle = true;
  window.addEventListener('keydown', (event) => {
    console.log('event listener!!!');
    if (event.key === 't') {
      // Press 't' to toggle
      renderTriangle = !renderTriangle;
      render();
    }
  });

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

    if (renderTriangle) {
      renderPass.setVertexBuffer(0, triangleVertexBuffer);
      renderPass.draw(3); // Draw 3 vertices (triangle)
    } else {
      renderPass.setVertexBuffer(0, squareVertexBuffer);
      renderPass.draw(6); // Draw 6 vertices (square)
    }

    renderPass.end();
    device.queue.submit([commandEncoder.finish()]);
  }

  render();
};

export { main };
