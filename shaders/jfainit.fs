uniform sampler2D texture;
uniform sampler2D maxTex;

uniform float upperLimit;

varying vec2 coord;

void main() {
	float val = texture2D(texture, coord).r;
	vec4 color = vec4(0, coord.x, coord.y, 1);
	
	float maxVal = texture2D(maxTex, vec2(0.0)).r;
	val = val/maxVal;
	
	if (val < upperLimit) {
		color.r = 1000.0;
		color.g = 1000.0;
		color.b = 1000.0;
	}
	
	gl_FragColor = color;
}
