struct VertexIn {
  @location(0) position: vec2f,
  @location(1) color: vec4f
};

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

@vertex
fn main_vertex(vertexData: VertexIn) -> VertexOut {
  var output: VertexOut;
  output.position = vec4f(vertexData.position, 0.0, 1.0);
  output.color = vertexData.color;
  return output;
}

@fragment
fn main_fragment(fragData: VertexOut) -> @location(0) vec4f {
  return fragData.color;
}