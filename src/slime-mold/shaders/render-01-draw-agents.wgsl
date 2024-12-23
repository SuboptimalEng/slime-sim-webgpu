// =============================================================
// Draw agents render pass: vertex shader.
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
// Draw agents render pass: fragment shader.
// =============================================================
@group(0) @binding(0) var<uniform> uSlimeSim: SlimeSimUniformsStruct;
@group(0) @binding(1) var<uniform> uColorization: ColorizationUniformsStruct;
@group(0) @binding(2) var readFromThisTexture: texture_2d<f32>;

fn calculateNormal(uv: vec2f) -> vec3f {
    // Sample neighboring pixels
    let h_x1 = textureLoad(readFromThisTexture, vec2i(uv) + vec2i(1, 0), 0).r;
    let h_x0 = textureLoad(readFromThisTexture, vec2i(uv) - vec2i(1, 0), 0).r;
    let h_y1 = textureLoad(readFromThisTexture, vec2i(uv) + vec2i(0, 1), 0).r;
    let h_y0 = textureLoad(readFromThisTexture, vec2i(uv) - vec2i(0, 1), 0).r;

    // Calculate gradients
    let strength = 2.0;
    let grad_x = (h_x1 - h_x0) * strength;
    let grad_y = (h_y1 - h_y0) * strength;

    // Compute and normalize the normal
    return normalize(vec3f(-grad_x, -grad_y, -1.0));
}

@fragment
fn fragmentShader(
  @builtin(position) fragCoord:vec4f
) -> @location(0) vec4f {
  // =============================================================
  // Create the checkerboard pattern.
  // =============================================================
  let checkerBoardUv = (2.0 * fragCoord.xy - uSlimeSim.resolution.xy) / uSlimeSim.resolution.y;
  let checkerBoardGridUv = vec2(floor(checkerBoardUv * 8.0));
  var checkerBoardColor = vec3(0.0);
  if (floor((checkerBoardGridUv.x + checkerBoardGridUv.y) % 2) == 0) {
    checkerBoardColor = vec3(0.125);
  } else {
    checkerBoardColor = vec3(0.0625);
  }

  // =============================================================
  // Set up uv coords and get texture color at the current coordinate.
  // =============================================================
  let uv = fragCoord.xy / uSlimeSim.resolution;
  let currTextureColor = textureLoad(readFromThisTexture, vec2i(uv * uSlimeSim.resolution), 0);
  let uSlimeColor = uColorization.slimeColor;
  var fragColor = vec3f(0.0);

  // =============================================================
  // Return early if we disabled lighting.
  // =============================================================
  if (uColorization.enableLighting <= 0.0001) {
    // Mix between the checkerboard color, and slime color based on whether or not
    // the texture color is set to white. We can check for this using the r, g, or
    // b channels. Using alpha channel wouldn't make sense because it's always 1.
    fragColor = mix(checkerBoardColor, uSlimeColor, smoothstep(0.0, 1.0, currTextureColor.r));
    return vec4(fragColor, 1.0);
  }

  // =============================================================
  // Calculate lighting and stylize the result.
  //
  // Note that negative values for y moves the light source up. WebGPU has y in
  // reverse. Setting y = -0.25, will make light appear at the top-right!
  // =============================================================
  let lightSource = vec3f(0.25, -0.25, -2.0);
  let viewSource = vec3f(0.0, 0.0, -1.0);
  let lightDir = normalize(lightSource);
  let viewDir = normalize(viewSource);

  // 32 or 64 seem like good numbers especially with lightSource
  // at vec3f(0.25, 0.25. -2.0). Higher value = sharper highlights.
  let shininess = 64.0;
  let surfaceNormal = calculateNormal(fragCoord.xy);
  let reflection = reflect(-lightDir, surfaceNormal);
  let specularIntensity = pow(max(dot(reflection, viewDir), 0.0), shininess);

  // Setting the baseColorIntensity to 0.8, ensures that specular highlights are
  // more easily visible. Setting it to 1.0 would make the specular highlights
  // harder to notice.
  let baseColorIntensity = 0.8;
  let lightColor = vec3f(1.0, 1.0, 1.0);
  let baseColor = uSlimeColor * currTextureColor.rgb * baseColorIntensity;
  let specularColor = lightColor * specularIntensity;

  fragColor = baseColor + specularColor;
  fragColor = pow(fragColor, vec3(2.0));
  fragColor = mix(checkerBoardColor, fragColor, smoothstep(0.0, 1.0, currTextureColor.r));
  return vec4f(fragColor, 1.0);
}
