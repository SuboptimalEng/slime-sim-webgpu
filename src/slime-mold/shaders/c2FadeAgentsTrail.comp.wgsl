// =============================================================
// Compute pass 2 -> fade agents trail.
// =============================================================
@group(0) @binding(0) var<uniform> uSlimeSim: SlimeSimUniformsStruct;
@group(0) @binding(1) var readFromThisTexture: texture_2d<f32>;
@group(0) @binding(2) var writeToThisTexture: texture_storage_2d<rgba8unorm, write>;

@compute
@workgroup_size(1)
fn fadeAgentsTrail(
  @builtin(global_invocation_id) id: vec3u,
) {
  let currTextureColor = textureLoad(readFromThisTexture, id.xy, 0).rgb;
  let newTextureColor = currTextureColor - uSlimeSim.decayT;
  textureStore(writeToThisTexture, id.xy, vec4f(newTextureColor, 1.0));
}
