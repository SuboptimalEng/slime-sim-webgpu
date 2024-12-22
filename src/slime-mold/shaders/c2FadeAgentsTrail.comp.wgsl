// =============================================================
// compute pass 2 -> fade agents trail
// =============================================================
// @group(0) @binding(0) var<uniform> uSlimeSimSettings: SlimeSimSettingsStruct;
@group(0) @binding(0) var<uniform> uSlimeSim: SlimeSimUniformsStruct;
@group(0) @binding(1) var readTexture: texture_2d<f32>;
@group(0) @binding(2) var writeTexture: texture_storage_2d<rgba8unorm, write>;

@compute
@workgroup_size(1)
fn fadeAgentsTrail(
  @builtin(global_invocation_id) id: vec3u,
) {
  let currTextureColor = textureLoad(readTexture, id.xy, 0).rgb;
  let newTextureColor = currTextureColor - uSlimeSim.decayT;
  textureStore(writeTexture, id.xy, vec4f(newTextureColor, 1.0));
}
