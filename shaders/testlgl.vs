attribute vec2 position;

uniform float pointSize;
uniform vec3 color;

varying vec3 vColor;

void main() {
	gl_Position = gl_ModelViewProjectionMatrix * vec4(position, 0.0, 1.0);
	gl_PointSize = pointSize;
	vColor = color;
}