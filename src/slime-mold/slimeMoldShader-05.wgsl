@group(0) @binding(0) var writeTexture: storage_texture_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let width = 256u;
  let height = 256u;

  // Check bounds
  if (id.x >= width || id.y >= height) {
    return;
  }

  // Alternate between red and black
  let isRed = (id.x / 32u + id.y / 32u) % 2u == 0u;
  var color = vec4<f32>(0.0, 0.0, 0.0, 1.0) // Black

  if isRed {
    color = vec4<f32>(1.0, 0.0, 0.0, 1.0) // Red
  }

  textureStore(writeTexture, vec2<i32>(id.xy), color);
}

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

@group(0) @binding(0) var myTexture: texture_2d<f32>;
@fragment
fn main_fragment(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
  let uv = fragCoord.xy / vec2<f32>(256.0, 256.0);
  return textureLoad(myTexture, vec2<i32>(uv * vec2<f32>(256.0)), 0);
}
