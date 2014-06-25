attribute vec3 position;

uniform float pointSize;

varying vec4 vColor;

void main() {
	gl_Position = gl_ModelViewProjectionMatrix * vec4(position.xy, 0.0, 1.0);
	gl_PointSize = pointSize;
	vColor = vec4(1.0);
}
