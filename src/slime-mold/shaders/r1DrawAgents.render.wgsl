// =============================================================
// render pass 1 -> vertex shader
// =============================================================
@vertex
fn vertexShader(
  @builtin(vertex_index) index: u32
) -> @builtin(position) vec4f {
  var positions = array<vec4f, 6>(
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
// render pass 1 -> fragment shader
// =============================================================
@group(0) @binding(0) var<uniform> uSlimeSimSettings: SlimeSimUniformsStruct;
@group(0) @binding(1) var<uniform> uColorizationSettings: ColorizationUniformsStruct;
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
  // Sample the texture
  let uv = fragCoord.xy / uSlimeSimSettings.uResolution;
  let texColor = textureLoad(textureInput, vec2i(uv * uSlimeSimSettings.uResolution), 0);

  var scaledUv = (2.0 * fragCoord.xy - uSlimeSimSettings.uResolution) / uSlimeSimSettings.uResolution.y;
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

  if (uColorizationSettings.enableLighting == 0.0) {
    let myRes = mix(myColor, uColorizationSettings.slimeColor, texColor.g);
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
  let myColorVariable = uColorizationSettings.slimeColor;
  var litColor = myColorVariable * texColor.rgb * ambientLight + lc * specularIntensity;
  // var litColor = vec3f(1.0, 1.0, 1.0) * specularIntensity;

  let color: vec4f = textureLoad(textureInput, vec2i(uv * uSlimeSimSettings.uResolution), 0);

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
