struct VertexIn {
  @location(0) position: vec2f,
  @location(1) color: vec4f
};

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

// Rotation matrix function for 2D
fn rotate2D(angle: f32) -> mat2x2<f32> {
    let cosTheta = cos(angle);
    let sinTheta = sin(angle);
    return mat2x2<f32>(
        vec2f(cosTheta, -sinTheta),
        vec2f(sinTheta, cosTheta),
    );
}

@vertex
fn main_vertex(vertexData: VertexIn) -> VertexOut {
  let rotation = rotate2D(0.45);
  let rotatedPosition = rotation * vertexData.position; // Apply the rotation

  var output: VertexOut;
  output.position = vec4f(rotatedPosition, 0.0, 1.0);
  output.color = vertexData.color;
  return output;
}

@fragment
fn main_fragment(fragData: VertexOut) -> @location(0) vec4f {
  return fragData.color;
}