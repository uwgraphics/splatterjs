uniform sampler2D texture;
uniform vec2 offset;
uniform float sigma;
uniform vec2 delta;

varying vec2 coord;

void main() {
	float sum = 0.0;
	float accum = 0.0;
	for (int i = -64; i <= 64; i++) {
		vec2 thisOffset = offset * vec2(float(i)) * delta;
		vec2 target = coord + thisOffset;
	
		float gW = exp(-float(i*i) / (2.0 * sigma * sigma));
		
		if (target.x >= 0.0 && target.x <= 1.0 && target.y >= 0.0 && target.y <= 1.0) {
			sum += gW;
			accum += texture2D(texture, vec2(target)).r * gW;
		}
	}
	
	accum /= sum;
	gl_FragColor = vec4(accum, 0.0, 0.0, 1.0);
}