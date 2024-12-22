// =============================================================
// compute pass 3 -> blur agents trail
// =============================================================
// @group(0) @binding(0) var<uniform> canvasSize: vec2u;
// @group(0) @binding(0) var<uniform> : vec2u;
@group(0) @binding(0) var<uniform> uSlimeSim: SlimeSimUniformsStruct;
@group(0) @binding(1) var<uniform> uColorization: ColorizationUniformsStruct;
@group(0) @binding(2) var readFromThisTexture: texture_2d<f32>;
@group(0) @binding(3) var writeToThisTexture: texture_storage_2d<rgba8unorm, write>;

@compute
// @workgroup_size(1)
@workgroup_size(8, 8)
// @workgroup_size(16, 16)
fn blurAgentsTrail(
  @builtin(global_invocation_id) id: vec3u,
) {
  var magenta = vec4f(1.0, 0.0, 1.0, 1.0);
  var cumulativeColor = vec4f(0.0);
  var pixelCount = 0.0;
  // setting diffuseKernel to 0 means it's essentially not running
  // todo: see if using this is useful for gradient colors
  var uBlurTrail = i32(uColorization.blurTrail);

  let canvasSize = uSlimeSim.resolution;
  if (id.x >= u32(canvasSize.x) || id.y >= u32(canvasSize.y)) {
    // if (id.x >= 300 || id.y >= 300) {
    return; // Avoid out-of-bounds access
  }

  if (uBlurTrail > 0) {
    // why is this for loop slow?
    // for (var x = -1; x <= 1; x++) {
    //   for (var y = -1; y <= 1; y++) {
    //     var currPos = vec2i(id.xy) + vec2i(x, y);
    //     cumulativeColor += textureLoad(readFromThisTexture, currPos, 0);
    //     pixelCount += 1;
    //   }
    // }
    // cumulativeColor = cumulativeColor / pixelCount;

    // this seems faster?
    var currPos = vec2i(id.xy);
    cumulativeColor += textureLoad(readFromThisTexture, currPos + vec2i(-1, 1), 0);
    cumulativeColor += textureLoad(readFromThisTexture, currPos + vec2i(0, 1), 0);
    cumulativeColor += textureLoad(readFromThisTexture, currPos + vec2i(1, 1), 0);
    cumulativeColor += textureLoad(readFromThisTexture, currPos + vec2i(-1, 0), 0);
    cumulativeColor += textureLoad(readFromThisTexture, currPos + vec2i(0, 0), 0);
    cumulativeColor += textureLoad(readFromThisTexture, currPos + vec2i(1, 0), 0);
    cumulativeColor += textureLoad(readFromThisTexture, currPos + vec2i(-1, -1), 0);
    cumulativeColor += textureLoad(readFromThisTexture, currPos + vec2i(0, -1), 0);
    cumulativeColor += textureLoad(readFromThisTexture, currPos + vec2i(1, -1), 0);
    cumulativeColor /= 9.0;
  } else {
    cumulativeColor += textureLoad(readFromThisTexture, vec2i(id.xy), 0);
  }

  textureStore(writeToThisTexture, id.xy, cumulativeColor);
}
