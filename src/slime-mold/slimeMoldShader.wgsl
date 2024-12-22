struct UniformsStruct {
  uResolution: vec2f,

  // general
  uRadius: f32,
  uStepSize: f32,
  uDecayT: f32,

  // sensor
  uSensorOffset: f32,
  uSensorAngle: f32,
  uRotationAngle: f32,

  // other
  uDiffuseKernel: f32,
};

// =============================================================
// blur agents trail
// =============================================================

struct ColorUniformsStruct {
  // seems like boolean are not supported when being passed in as gpu buffer
  // if blurTrail == 0 disabled
  // else enabled
  blurTrail: f32,
  enableLighting: f32,

  slimeColor: vec3f,
};

@group(0) @binding(0) var<uniform> canvasSize: vec2<u32>;
@group(0) @binding(1) var<uniform> blurAgentsTrailUniforms: ColorUniformsStruct;
@group(0) @binding(2) var readFadeTrailTexture: texture_2d<f32>;
@group(0) @binding(3) var writeFadeTrailTexture: texture_storage_2d<rgba8unorm, write>;

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
  var diffuseKernel = i32(blurAgentsTrailUniforms.blurTrail);

  if (id.x >= canvasSize.x || id.y >= canvasSize.y) {
  // if (id.x >= 300 || id.y >= 300) {
      return; // Avoid out-of-bounds access
  }

  if (diffuseKernel > 0) {
    // why is this for loop slow?
    // for (var x = -1; x <= 1; x++) {
    //   for (var y = -1; y <= 1; y++) {
    //     var currPos = vec2i(id.xy) + vec2i(x, y);
    //     cumulativeColor += textureLoad(readFadeTrailTexture, currPos, 0);
    //     pixelCount += 1;
    //   }
    // }
    // cumulativeColor = cumulativeColor / pixelCount;

    // this seems faster?
    var currPos = vec2i(id.xy);
    cumulativeColor += textureLoad(readFadeTrailTexture, currPos + vec2i(-1, 1), 0);
    cumulativeColor += textureLoad(readFadeTrailTexture, currPos + vec2i(0, 1), 0);
    cumulativeColor += textureLoad(readFadeTrailTexture, currPos + vec2i(1, 1), 0);
    cumulativeColor += textureLoad(readFadeTrailTexture, currPos + vec2i(-1, 0), 0);
    cumulativeColor += textureLoad(readFadeTrailTexture, currPos + vec2i(0, 0), 0);
    cumulativeColor += textureLoad(readFadeTrailTexture, currPos + vec2i(1, 0), 0);
    cumulativeColor += textureLoad(readFadeTrailTexture, currPos + vec2i(-1, -1), 0);
    cumulativeColor += textureLoad(readFadeTrailTexture, currPos + vec2i(0, -1), 0);
    cumulativeColor += textureLoad(readFadeTrailTexture, currPos + vec2i(1, -1), 0);
    cumulativeColor /= 9.0;
  } else {
    cumulativeColor += textureLoad(readFadeTrailTexture, vec2i(id.xy), 0);
  }

  textureStore(writeFadeTrailTexture, id.xy, cumulativeColor);
}


// =============================================================
// draw texture vertex shader
// =============================================================

@vertex
fn vertexShader(
  @builtin(vertex_index) index: u32
) -> @builtin(position) vec4<f32> {
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

// =============================================================
// draw texture fragment shader
// =============================================================

@group(0) @binding(0) var<uniform> fragmentShaderUniforms: UniformsStruct;
@group(0) @binding(1) var<uniform> fragmentShaderColorUniforms: ColorUniformsStruct;
@group(0) @binding(2) var textureInput: texture_2d<f32>;

fn calculateNormal(uv: vec2f) -> vec3f {
    // Sample neighboring pixels
    let h_x1 = textureLoad(textureInput, vec2i(uv) + vec2i(1, 0), 0).r;
    let h_x0 = textureLoad(textureInput, vec2i(uv) - vec2i(1, 0), 0).r;
    let h_y1 = textureLoad(textureInput, vec2i(uv) + vec2i(0, 1), 0).r;
    let h_y0 = textureLoad(textureInput, vec2i(uv) - vec2i(0, 1), 0).r;

    // Calculate gradients
    let strength = 2.0;
    let grad_x = (h_x1 - h_x0) * strength;
    let grad_y = (h_y1 - h_y0) * strength;

    // Compute and normalize the normal
    return normalize(vec3f(-grad_x, -grad_y, -1.0));
}

@fragment
fn fragmentShader(
  @builtin(position) fragCoord: vec4<f32>
) -> @location(0) vec4<f32> {
  // // frag coords are based on canvas size
  // // textureInput also happens to have the same size as canvas size
  // // x -> [0, 400]
  // // y -> [0, 300]
  // let uv = fragCoord.xy;

  // // can't read texture with floating points, need to cast to int
  // return textureLoad(textureInput, vec2i(uv), 0);

  // // frag coords are based on canvas size
  // // textureInput also happens to have the same size as canvas size
  // // x -> [0, 400]
  // // y -> [0, 300]
  // let uv = fragCoord.xy / fragmentShaderUniforms.uResolution;
  // // can't read texture with floating points, need to cast to int
  // return textureLoad(textureInput, vec2i(uv * fragmentShaderUniforms.uResolution), 0);

  // // todo: figure this out
  // // HOW THE HECK DOES THIS WORK? WHAT AM I MISSING?
  // let uv = fragCoord.xy / updateAgentsUniforms.uResolution;
  // return textureLoad(textureInput, vec2i(uv * updateAgentsUniforms.uResolution), 0);

  // // custom lighting
  // // Sample the texture
  let uv = fragCoord.xy / fragmentShaderUniforms.uResolution;
  let texColor = textureLoad(textureInput, vec2i(uv * fragmentShaderUniforms.uResolution), 0);

  var scaledUv = (2.0 * fragCoord.xy - fragmentShaderUniforms.uResolution) / fragmentShaderUniforms.uResolution.y;
  let checker = vec2(floor(scaledUv * 8.0));
  // var gridUv = 2.0 * fract(scaledUv * 2.0) - 1.0;
  // let dist = smoothstep(0.99, 1.0, max(abs(gridUv.x), abs(gridUv.y)));
  var myColor = vec3(0.0);
  if ((checker.x + checker.y) % 2 == 0.0) {
    myColor += vec3(0.125);
  } else {
    myColor += vec3(0.0625);
  }
  // myColor += vec3(dist);

  // myColor = vec3(dist);
  // let checker2 = i32(floor(scaledUv.x * 32.0)) + i32(floor(scaledUv.y * 32.0));
  // if (checker2 % 2 == 0) {
  //   myColor *= vec3(0.1);
  // } else {
  //   myColor *= vec3(0.5);
  // }

  if (fragmentShaderColorUniforms.enableLighting == 0.0) {
    let myRes = mix(myColor, fragmentShaderColorUniforms.slimeColor, texColor.g);
    return vec4(myRes, 1.0);
  }

  // Normalize the light direction
  // todo: note that clip space is y down is positive so need to set light source to be
  // at negative y position to keep it at the top right of the screen
  // hard code this variable for lighting
  let lightSource = vec3f(0.25, -0.25, -2.0);
  // var lightSource = fragmentShaderLightingUniforms.position;
  let viewSource = vec3f(0.0, 0.0, -1.0);
  let lightDir = normalize(lightSource);
  let viewDir = normalize(viewSource);

  // Assume a fixed surface normal facing upwards
  // let surfaceNormal = normalize(vec3<f32>(texColor.rgb));
  let surfaceNormal = calculateNormal(fragCoord.xy);

  // // Calculate diffuse lighting using Lambertian reflectance
  let diffuseIntensity = max(dot(surfaceNormal, lightDir), 0.0);

  let reflection = reflect(-lightDir, surfaceNormal);
  // 32 or 64 seem like good numbers
  // especially with lightSource = 0.25, 0.25. -2.0
  let shininess = 64.0; // Higher value = sharper highlights
  let specularIntensity = pow(max(dot(reflection, viewDir), 0.0), shininess);

  // Combine texture color with lighting
  // let litColor = texColor.rgb * lightIntensity;

  // Combine results
  let ambientLight = 0.75; // Minimum light intensity
  // lc -> light color
  let lc = vec3f(1.0, 1.0, 1.0);
  let myColorVariable = fragmentShaderColorUniforms.slimeColor;
  var litColor = myColorVariable * texColor.rgb * ambientLight + lc * specularIntensity;
  // var litColor = vec3f(1.0, 1.0, 1.0) * specularIntensity;

  let color: vec4f = textureLoad(textureInput, vec2i(uv * fragmentShaderUniforms.uResolution), 0);

  // litColor = mix(surfaceNormal + vec3(0.0, 0.0, 1.0), litColor , smoothstep(0.9, 1.0, color.g));
  // litColor = (surfaceNormal + vec3(0.0, 0.0, 1.0)) + litColor;

  litColor = pow(litColor, vec3(2.0));

  litColor = mix(myColor, litColor, smoothstep(0.0, 1.0, color.g));

  // litColor = litColor * vec4(0.0, 1.0, 0.0, 0.0).g;
  // litColor = mix(litColor, litColor + litColor * 0.25, color.g);
  // litColor *= vec3(0.22, 1.0, 0.08);
  // litColor = pow(litColor, vec3(2.));

  return vec4f(litColor, 1.0);
}
