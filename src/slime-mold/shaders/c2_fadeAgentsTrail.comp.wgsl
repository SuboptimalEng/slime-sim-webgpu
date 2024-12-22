// =============================================================
// fade agents trail
// =============================================================
@group(0) @binding(0) var<uniform> fadeAgentsTrailUniforms: UniformsStruct;
@group(0) @binding(1) var readTexture: texture_2d<f32>;
@group(0) @binding(2) var writeTexture: texture_storage_2d<rgba8unorm, write>;

@compute
@workgroup_size(1)
fn fadeAgentsTrail(
  @builtin(global_invocation_id) id: vec3u,
) {
  var currTexColor = textureLoad(readTexture, id.xy, 0).rgb;
  currTexColor = currTexColor - fadeAgentsTrailUniforms.uDecayT;
  textureStore(writeTexture, id.xy, vec4f(currTexColor, 1.0));
}
