uniform vec4 bounds;

varying vec2 coord;

void main() {
	gl_Position = gl_ModelViewProjectionMatrix * vec4(gl_Vertex.xy, 0.0, 1.0);
				 
	coord = (gl_Vertex.xy - bounds.xz) / (bounds.yw - bounds.xz);
}
