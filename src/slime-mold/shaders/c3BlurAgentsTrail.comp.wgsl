// =============================================================
// Compute pass 3 -> blur agents trail.
// =============================================================
@group(0) @binding(0) var<uniform> uSlimeSim: SlimeSimUniformsStruct;
@group(0) @binding(1) var<uniform> uColorization: ColorizationUniformsStruct;
@group(0) @binding(2) var readFromThisTexture: texture_2d<f32>;
@group(0) @binding(3) var writeToThisTexture: texture_storage_2d<rgba8unorm, write>;

@compute
@workgroup_size(8, 8)
fn blurAgentsTrail(
  @builtin(global_invocation_id) id: vec3u,
) {
  var newTextureColor = vec4f(0.0);
  let uBlurTrail = uColorization.blurTrail;
  let uCanvasSize = vec2u(uSlimeSim.resolution);

  // Avoid out-of-bounds access.
  if (id.x >= uCanvasSize.x || id.y >= uCanvasSize.y) {
    return;
  }

  // Seems like booleans cannot be passed as uniforms in a gpu buffer.
  // If blurTrail value is equal to 0, do not blur the texture.
  if (uBlurTrail < 1.0) {
    newTextureColor = textureLoad(readFromThisTexture, vec2i(id.xy), 0);
  } else {
    // todo: why does this loop seem slower?
    // var pixelCount = 0.0;
    // for (var x = -1; x <= 1; x++) {
    //   for (var y = -1; y <= 1; y++) {
    //     var currPos = vec2i(id.xy) + vec2i(x, y);
    //     newTextureColor += textureLoad(readFromThisTexture, currPos, 0);
    //     pixelCount += 1;
    //   }
    // }
    // newTextureColor = newTextureColor / pixelCount;

    // this seems faster?
    var currPos = vec2i(id.xy);
    newTextureColor += textureLoad(readFromThisTexture, currPos + vec2i(-1, 1), 0);
    newTextureColor += textureLoad(readFromThisTexture, currPos + vec2i(0, 1), 0);
    newTextureColor += textureLoad(readFromThisTexture, currPos + vec2i(1, 1), 0);
    newTextureColor += textureLoad(readFromThisTexture, currPos + vec2i(-1, 0), 0);
    newTextureColor += textureLoad(readFromThisTexture, currPos + vec2i(0, 0), 0);
    newTextureColor += textureLoad(readFromThisTexture, currPos + vec2i(1, 0), 0);
    newTextureColor += textureLoad(readFromThisTexture, currPos + vec2i(-1, -1), 0);
    newTextureColor += textureLoad(readFromThisTexture, currPos + vec2i(0, -1), 0);
    newTextureColor += textureLoad(readFromThisTexture, currPos + vec2i(1, -1), 0);
    newTextureColor /= 9.0;
  }

  textureStore(writeToThisTexture, id.xy, newTextureColor);
}
