uniform sampler2D texture;
uniform vec2 delta;

varying vec2 coord;

void main(void) {
	float curMax = 0.0;
	
	for (int i = 0; i < 8; i++) {
		for (int j = 0; j < 8; j++) {
			vec2 thisPos = coord * 8.0 + vec2(float(i), float(j)) * delta;
			if (thisPos.x >= 0.0 && thisPos.x <= 1.0 && thisPos.y >= 0.0 && thisPos.y <= 1.0) {
				curMax = max(curMax, texture2D(texture, thisPos).r);
			}
		}
	}
	
	gl_FragColor = vec4(curMax, 0.0, 0.0, 1.0);
}