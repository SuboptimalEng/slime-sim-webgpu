import { Pane } from 'tweakpane';
import slimeMoldShader from './slimeMoldShader-05.wgsl?raw';

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

  const context = canvas.getContext('webgpu');
  if (!context) {
    throw new Error('Cannot recieve WebGPU context from canvas.');
  }
  context.configure({
    device: device,
    format: format,
  });

  // Compute Shader (WGSL)
  const computeShaderCode = `
// @group(0) @binding(0) var writeTexture: texture_storage_2d<rgba8unorm, storage>;
@group(0) @binding(0) var writeTexture: texture_storage_2d<rgba8unorm, write>;
// @group(0) @binding(3) var writeTexture: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let isRed = (id.x / 32u + id.y / 32u) % 2u == 0u;
  var color = vec4<f32>(0.0, 0.0, 0.0, 1.0); // Black
  if isRed {
    color = vec4<f32>(1.0, 0.0, 0.0, 1.0);
  }
  // let color = vec4f(1.0, 0.0, 0.0, 1.0);
  textureStore(writeTexture, vec2<i32>(id.xy), color);
}
`;

  // Vertex Shader (WGSL)
  const vertexShaderCode = `
@vertex
fn main_vertex(@builtin(vertex_index) index: u32) -> @builtin(position) vec4<f32> {
  var positions = array<vec4<f32>, 6>(
    vec4(-1.0, -1.0, 0.0, 1.0),
    vec4( 1.0, -1.0, 0.0, 1.0),
    vec4(-1.0,  1.0, 0.0, 1.0),
    vec4( 1.0, -1.0, 0.0, 1.0),
    vec4( 1.0,  1.0, 0.0, 1.0),
    vec4(-1.0,  1.0, 0.0, 1.0)
  );
  return positions[index];
}
`;

  // Fragment Shader (WGSL)
  const fragmentShaderCode = `
@group(0) @binding(0) var myTexture: texture_2d<f32>;

@fragment
fn main_fragment(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
  let uv = fragCoord.xy / vec2<f32>(256.0, 256.0);
  // return vec4(1.0, 1.0, 0.0, 1.0);
  return textureLoad(myTexture, vec2<i32>(uv * vec2<f32>(256.0)), i32(0));
}
`;

  // Create Texture
  const texture = device.createTexture({
    size: { width: 256, height: 256, depthOrArrayLayers: 1 },
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.STORAGE_BINDING |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  const textureView = texture.createView();

  // Compute Shader Pipeline
  const computeBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: { access: 'write-only', format: 'rgba8unorm' },
      },
    ],
  });
  const computeBindGroup = device.createBindGroup({
    layout: computeBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: textureView,
      },
    ],
  });
  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [computeBindGroupLayout],
    }),
    compute: {
      module: device.createShaderModule({
        code: computeShaderCode,
      }),
      entryPoint: 'main',
    },
  });

  // Run Compute Pass
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(computePipeline);
  pass.setBindGroup(0, computeBindGroup);
  pass.dispatchWorkgroups(32, 32);
  pass.end();
  device.queue.submit([encoder.finish()]);

  // Render Shader Pipeline
  const renderBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: 'float',
        },
      },
    ],
  });
  const renderBindGroup = device.createBindGroup({
    layout: renderBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: textureView,
      },
    ],
  });
  const renderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [renderBindGroupLayout],
    }),
    vertex: {
      module: device.createShaderModule({ code: vertexShaderCode }),
      entryPoint: 'main_vertex',
    },
    fragment: {
      module: device.createShaderModule({ code: fragmentShaderCode }),
      entryPoint: 'main_fragment',
      targets: [
        {
          format,
        },
      ],
    },
    primitive: { topology: 'triangle-list' },
  });

  // Render Pass
  const renderEncoder = device.createCommandEncoder();
  const renderPass = renderEncoder.beginRenderPass({
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
  device.queue.submit([renderEncoder.finish()]);
};

export { main };
