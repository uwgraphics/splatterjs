uniform sampler2D texture;
uniform float maxDist;

varying vec2 coord;

void main() {
	float color = texture2D(texture, coord).r / maxDist;
	gl_FragColor = vec4(vec3(color), 1.0);
}