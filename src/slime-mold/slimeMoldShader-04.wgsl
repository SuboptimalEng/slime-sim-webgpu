// struct VertexOutput {
//   @location(0) position: vec2f,
//   @location(1) color: vec4f,
// };

// @vertex
// fn main_vertex(
//   @location(0) position: vec2<f32>
// ) -> @builtin(position) vec4<f32> {
//     return vec4(position, 0.0, 1.0);
// }


@vertex
fn main_vertex(
  @location(0) position: vec2f
  // @location(1) color: vec4f,
) -> @builtin(position) vec4f {
  // var output: VertexOutput;
  // output.position = vec4f(position, 0.0, 1.0);
  // // output.color = color;
  // output.color = vec4f(1.0);
  // return output;
  return vec4(position, 0.0, 1.0);
}

// @fragment
// fn main_fragment(
//   @location(1) color: vec4f
// ) -> @location(0) vec4f {
//   return vec4(1.0, 0.0, 0.0, 1.0);
//   // return color;
//   // return vec4(1.0, 0.0, 0.0, 1.0);
// }

@fragment
fn main_fragment(
) -> @location(0) vec4<f32> {
    return vec4(1.0, 0.0, 0.0, 1.0);
}