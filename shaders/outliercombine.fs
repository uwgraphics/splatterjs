uniform sampler2D grid;

uniform float gridSize;
uniform float pointRadius;
uniform vec2 resolution;
uniform vec2 offset;

varying vec2 coord;

float getDist(vec2 lookahead) {
	vec2 gridPos = floor((coord + offset) * resolution / gridSize);
	gridPos = (gridPos + lookahead) / resolution;
	vec4 data = texture2D(grid, gridPos);
	
	if (data.a > 0.0) {
		return distance(data.xy * resolution, coord * resolution);
	} else {
		return 10000.0;
	}
}

void main() {
	float ret = 10000.0;
	for (int i = -1; i <= 1; i++) {
		for (int j = -1; j <= 1; j++) {
			ret = min(ret, getDist(vec2(float(i), float(j))));
		}
	}
	
	if (ret < pointRadius) {
		gl_FragColor = vec4(1.0);
	} else {
		gl_FragColor = vec4(0.0);
	}
}
